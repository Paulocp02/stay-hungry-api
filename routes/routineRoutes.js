const express = require('express');
const { createTemplate, addExercisesBulk, assignRoutine } = require('../controllers/routineController');
const router = express.Router();
router.post('/templates', createTemplate);
router.post('/templates/:plantillaId/exercises', addExercisesBulk);
router.post('/assign', assignRoutine);
module.exports = router;