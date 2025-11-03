
const { query } = require('../config/mysql');
const bcrypt = require('bcryptjs');

class User {
  constructor(userData) {
    this.nombre = userData.nombre;
    this.email = userData.email;
    this.password = userData.password;
    this.edad = userData.edad;
    this.peso = userData.peso;
    this.estatura = userData.estatura;
    this.rol = userData.rol || 'Cliente';
  }

  // Crear tabla de usuarios
  static async createTable() {
    const sql = `
      CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        edad INT NOT NULL,
        peso DECIMAL(5,2) NOT NULL,
        estatura DECIMAL(5,2) NOT NULL,
        rol ENUM('Cliente', 'Entrenador', 'Administrador') DEFAULT 'Cliente',
        fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        activo BOOLEAN DEFAULT TRUE
      )
    `;
    
    try {
      await query(sql);
      console.log('✅ Tabla usuarios creada/verificada');
    } catch (error) {
      console.error('Error creando tabla usuarios:', error);
      throw error;
    }
  }

  // Crear nuevo usuario
  async save() {
    try {
      // Verificar si el email ya existe
      const existingUser = await User.findByEmail(this.email);
      if (existingUser) {
        throw new Error('El email ya está registrado');
      }

      // Encriptar contraseña
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(this.password, salt);

      const sql = `
        INSERT INTO usuarios (nombre, email, password, edad, peso, estatura, rol)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      
      const result = await query(sql, [
        this.nombre,
        this.email,
        hashedPassword,
        this.edad,
        this.peso,
        this.estatura,
        this.rol
      ]);

      return result.insertId;
    } catch (error) {
      throw error;
    }
  }

  // Buscar usuario por email
  static async findByEmail(email) {
    try {
      const sql = 'SELECT * FROM usuarios WHERE email = ? AND activo = TRUE';
      const result = await query(sql, [email]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Buscar usuario por ID
  static async findById(id) {
    try {
      const sql = 'SELECT * FROM usuarios WHERE id = ? AND activo = TRUE';
      const result = await query(sql, [id]);
      return result.length > 0 ? result[0] : null;
    } catch (error) {
      throw error;
    }
  }

  // Obtener todos los usuarios
  static async findAll() {
    try {
      const sql = `
        SELECT id, nombre, email, edad, peso, estatura, rol, fecha_registro 
        FROM usuarios 
        WHERE activo = TRUE 
        ORDER BY fecha_registro DESC
      `;
      return await query(sql);
    } catch (error) {
      throw error;
    }
  }

  // Validar contraseña
  static async validatePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  // Actualizar usuario
  static async updateById(id, updateData) {
    try {
      const fields = [];
      const values = [];

      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined && key !== 'id') {
          fields.push(`${key} = ?`);
          values.push(updateData[key]);
        }
      });

      if (fields.length === 0) {
        throw new Error('No hay datos para actualizar');
      }

      values.push(id);
      const sql = `UPDATE usuarios SET ${fields.join(', ')} WHERE id = ?`;
      
      const result = await query(sql, values);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }

  // Eliminar usuario (soft delete)
  static async deleteById(id) {
    try {
      const sql = 'UPDATE usuarios SET activo = FALSE WHERE id = ?';
      const result = await query(sql, [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = User;
