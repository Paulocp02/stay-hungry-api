
const express = require('express');
const router = express.Router();
const { query } = require('../config/mysql');

// GET /api/exercises/search?q=press
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) return res.json([]); // evita querys vacías
    const rows = await query(
      `SELECT id, nombre, grupo_muscular, dificultad
       FROM ejercicios
       WHERE activo = 1 AND nombre LIKE ?
       ORDER BY nombre
       LIMIT 10`,
      [`%${q}%`]
    );
    res.json(rows);
  } catch (e) {
    console.error('exercise search error:', e);
    res.status(500).json({ error: 'Error buscando ejercicios' });
  }
});

module.exports = router;
