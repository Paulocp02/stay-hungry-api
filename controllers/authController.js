const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { query } = require('../config/mysql'); 

const generateToken = (userId, rol) =>
  jwt.sign({ userId, rol }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });




// Registro de usuarios
const register = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos de entrada inválidos', errors: errors.array() });
    }

    const { nombre, email, password, edad, peso, estatura, rol } = req.body;

    const userData = {
      nombre,
      email,
      password,
      edad: parseInt(edad),
      peso: parseFloat(peso),
      estatura: parseFloat(estatura),
      rol: 'Cliente',
      activo: 1                     
    };

    const user = new User(userData);
    const userId = await user.save();

    const newUser = await User.findById(userId);
    delete newUser.password;

    const token = generateToken(userId, newUser.rol);

    res.status(201).json({ success: true, message: 'Usuario registrado exitosamente', data: { user: newUser, token } });
  } catch (error) {
    console.error('Error en registro:', error);
    res.status(400).json({ success: false, message: error.message || 'Error interno del servidor' });
  }
};

// Login
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos de entrada inválidos', errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // ⬅️ Bloquear login si el usuario está inactivo
    if (user.activo === 0) {
      return res.status(403).json({ success: false, message: 'Cuenta inactiva. Contacta al administrador.' });
    }

    const isValidPassword = await User.validatePassword(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    delete user.password;

    const token = generateToken(user.id, user.rol);
    res.json({ success: true, message: 'Login exitoso', data: { user, token } });
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Perfil
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    delete user.password;
    res.json({ success: true, data: { user } });
  } catch (error) {
    console.error('Error obteniendo perfil:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Actualizar perfil (propio)
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Datos de entrada inválidos', errors: errors.array() });
    }

    const { nombre, edad, peso, estatura } = req.body;
    const userId = req.user.userId;

    const updateData = {};
    if (nombre)   updateData.nombre   = nombre;
    if (edad)     updateData.edad     = parseInt(edad);
    if (peso)     updateData.peso     = parseFloat(peso);
    if (estatura) updateData.estatura = parseFloat(estatura);

    const updated = await User.updateById(userId, updateData);
    if (!updated) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const user = await User.findById(userId);
    delete user.password;

    res.json({ success: true, message: 'Perfil actualizado exitosamente', data: { user } });
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// Listar usuarios (ADMIN) con filtro include
// include = 'all' | 'active' | 'inactive'
const getAllUsers = async (req, res) => {
  try {
    const include = (req.query.include || 'all').toLowerCase();
    let where = '';
    if (include === 'active')   where = 'WHERE activo = 1';
    if (include === 'inactive') where = 'WHERE activo = 0';

    const users = await query(`
      SELECT id, nombre, email, rol, edad, peso, estatura, fecha_registro, activo
      FROM usuarios
      ${where}
      ORDER BY id DESC
    `);

    res.json({ success: true, data: { users } });
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ADMIN: actualizar cualquier combinación de campos (nombre, rol, edad, peso, estatura)
const adminUpdateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: 'ID inválido' });

    const { nombre, rol, edad, peso, estatura } = req.body;

    const sets = [];
    const vals = [];

    if (nombre !== undefined)   { sets.push('nombre = ?');   vals.push(String(nombre).trim()); }
    if (rol !== undefined) {
      if (!['Cliente','Entrenador','Administrador'].includes(rol)) {
        return res.status(400).json({ success: false, message: 'Rol inválido' });
      }
      sets.push('rol = ?'); vals.push(rol);
    }
    if (edad !== undefined)     { sets.push('edad = ?');     vals.push(Number(edad)); }
    if (peso !== undefined)     { sets.push('peso = ?');     vals.push(Number(peso)); }
    if (estatura !== undefined) { sets.push('estatura = ?'); vals.push(Number(estatura)); }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'Sin cambios para actualizar' });
    }

    vals.push(id);
    await query(`UPDATE usuarios SET ${sets.join(', ')} WHERE id = ?`, vals);

    const user = await User.findById(id);
    if (user) delete user.password;

    res.json({ success: true, message: 'Usuario actualizado', data: { user } });
  } catch (error) {
    console.error('Error actualizando usuario (admin):', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

// ADMIN: activar/desactivar (soft delete) — acepta 1/0, true/false, "true"/"false"
const adminSetUserStatus = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const activo = Number(req.body.activo); // 0 o 1
    if (!id || (activo !== 0 && activo !== 1)) {
      return res.status(400).json({ success: false, message: 'activo debe ser 0 o 1' });
    }
    if (id === req.user.userId) {
      return res.status(400).json({ success: false, message: 'No puedes desactivar tu propia cuenta' });
    }

    // Si desactivo => fecha_baja = NOW(); si reactivo => fecha_baja = NULL
    await query(
      `UPDATE usuarios
          SET activo = ?,
              fecha_baja = CASE WHEN ? = 0 THEN NOW() ELSE NULL END
        WHERE id = ?`,
      [activo, activo, id]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error cambiando estado (admin):', error);
    res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};



module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  adminUpdateUser,     
  adminSetUserStatus   
};
