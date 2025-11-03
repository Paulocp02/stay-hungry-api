// backend/routes/analyticsRoutes.js
const express = require('express');
const router = express.Router();
const { trackUsage, usageSummary } = require('../controllers/analyticsController');
const { authenticate } = require('../middleware/auth');

function requireAdminInline(req, res, next) {
  if (req.user && (req.user.rol === 'Administrador' || req.user.role === 'Administrador')) return next();
  return res.status(403).json({ success: false, message: 'Solo administradores' });
}

router.post('/track', trackUsage);
router.get('/usage-summary', authenticate, requireAdminInline, usageSummary);

module.exports = router;
