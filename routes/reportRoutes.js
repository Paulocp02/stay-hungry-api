// routes/reportsRoutes.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  usersChurn,
  adherence30d,
  trainingVolume,
  prsInRange,
  trainerClientsCount,
} = require('../controllers/reportsController');

// Todos los reportes son solo para Administrador
router.get('/users/churn',        authenticate, authorize('Administrador'), usersChurn);
router.get('/adherence',          authenticate, authorize('Administrador'), adherence30d);
router.get('/volume',             authenticate, authorize('Administrador'), trainingVolume);
router.get('/prs',                authenticate, authorize('Administrador'), prsInRange);
router.get('/trainers/clients',   authenticate, authorize('Administrador'), trainerClientsCount);

module.exports = router;
