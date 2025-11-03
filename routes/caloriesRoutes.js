const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { caloriesBySession, caloriesByRangeForUser } = require('../controllers/caloriesController');

router.get('/by-session', authenticate, caloriesBySession);         // por cliente + rango
router.get('/by-user-range', authenticate, caloriesByRangeForUser); // agrega totales por día/semana

module.exports = router;
