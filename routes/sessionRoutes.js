const express = require('express');
const { getOrCreateTodaySession, toggleExercise, addSet, sessionSummary, getSets } = require('../controllers/sessionController');
const router = express.Router();
router.get('/today', getOrCreateTodaySession);
router.post('/:sesionId/exercises/:plantillaEjercicioId/toggle', toggleExercise);
router.post('/:sesionId/sets', addSet);
router.get('/:sesionId/summary', sessionSummary);
router.get('/:sesionId/exercises/:plantillaEjercicioId/sets', getSets);
module.exports = router;