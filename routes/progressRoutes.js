const express = require('express');
const router = express.Router();
const { 
  getWeightHistory,
  getBmiHistory,
  getStrengthPRs
} = require('../controllers/progressController');

// Si usas auth: /* verifyToken, */
router.get('/weight-history', /* verifyToken, */ getWeightHistory);
router.get('/bmi-history',     /* verifyToken, */ getBmiHistory);
router.get('/strength-prs',    /* verifyToken, */ getStrengthPRs);

module.exports = router;
