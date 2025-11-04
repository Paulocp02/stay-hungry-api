const express = require('express');
const { body } = require('express-validator');
const {
  register,
  login,
  getProfile,
  updateProfile,
  getAllUsers,
  adminUpdateUser,        
  adminSetUserStatus,
  generatePassword      
} = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Validaciones para registro
const registerValidation = [
  body('nombre')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Debe ser un email válido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('La contraseña debe tener al menos 6 caracteres'),
  body('edad')
    .isInt({ min: 16, max: 100 })
    .withMessage('La edad debe ser un número entre 16 y 100'),
  body('peso')
    .isFloat({ min: 30, max: 300 })
    .withMessage('El peso debe ser un número entre 30 y 300 kg'),
  body('estatura')
    .isFloat({ min: 1.0, max: 2.5 })
    .withMessage('La estatura debe ser un número entre 1.0 y 2.5 metros'),
  
];

// Validaciones para login
const loginValidation = [
  body('email').isEmail().withMessage('Debe ser un email válido').normalizeEmail(),
  body('password').notEmpty().withMessage('La contraseña es requerida')
];

// Validaciones para actualizar perfil
const updateProfileValidation = [
  body('nombre').optional().isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres').trim(),
  body('edad').optional().isInt({ min: 16, max: 100 }).withMessage('La edad debe ser un número entre 16 y 100'),
  body('peso').optional().isFloat({ min: 30, max: 300 }).withMessage('El peso debe ser un número entre 30 y 300 kg'),
  body('estatura').optional().isFloat({ min: 1.0, max: 2.5 }).withMessage('La estatura debe ser un número entre 1.0 y 2.5 metros')
];

// Rutas públicas
router.post('/register', registerValidation, register);
router.post('/login',    loginValidation,    login);
router.post('/generate-password', generatePassword);

// Rutas protegidas
router.get('/profile', authenticate, getProfile);
router.put('/profile', authenticate, updateProfileValidation, updateProfile);

// Admin: listar, editar, activar/desactivar
router.get('/users',                authenticate, authorize('Administrador'), getAllUsers);
router.put('/users/:id',            authenticate, authorize('Administrador'), adminUpdateUser);     // ⬅️ NUEVO
router.put('/users/:id/status',     authenticate, authorize('Administrador'), adminSetUserStatus);  // ⬅️ NUEVO

module.exports = router;
