// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ success:false, message:'Token requerido' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user)   return res.status(401).json({ success:false, message:'Usuario no existe' });
    if (user.activo === 0) return res.status(403).json({ success:false, message:'Cuenta inactiva' });

    // pon todo lo que necesites en req.user
    req.user = { userId: user.id, rol: user.rol, nombre: user.nombre };
    next();
  } catch (e) {
    console.error('authenticate:', e);
    return res.status(401).json({ success:false, message:'Token inválido' });
  }
};

const authorize = (...roles) => (req, res, next) => {
  if (!req.user?.rol) return res.status(403).json({ success:false, message:'Sin permisos' });
  if (!roles.includes(req.user.rol)) return res.status(403).json({ success:false, message:'Sin permisos' });
  next();
};



module.exports = { authenticate, authorize };
