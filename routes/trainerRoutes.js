const express = require('express');
const router = express.Router();
const { query } = require('../config/mysql'); 
const { getMyClients, assignClient, searchClients } = require('../controllers/trainerController');

router.get('/my-clients', getMyClients);
router.post('/assign-client', assignClient);
router.get('/search-clients', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const unassignedOnly = String(req.query.unassignedOnly || '') === '1';

    if (q.length < 2) {
      return res.json([]); // coherente con el front (min 2 chars)
    }

    // Tokeniza por espacios para admitir "nombre apellido"
    const tokens = q.split(/\s+/).filter(Boolean);

    // WHERE de nombre: cada token debe aparecer (AND)
    const nameConds = tokens.map(() => 'u.nombre LIKE ?').join(' AND ');
    const nameParams = tokens.map(t => `%${t}%`);

    // WHERE de email: buscamos el string completo
    const emailCond = 'u.email LIKE ?';
    const emailParam = `%${q}%`;

    let extra = '';
    if (unassignedOnly) {
      // Solo clientes NO asignados a ningún entrenador activo
      extra = `
        AND NOT EXISTS (
          SELECT 1
          FROM entrenadores_clientes ec
          WHERE ec.cliente_id = u.id
            AND ec.activo = 1
        )
      `;
    }

    const sql = `
      SELECT u.id, u.nombre, u.email, u.edad, u.peso, u.estatura
      FROM usuarios u
      WHERE u.rol = 'Cliente'
        AND (
          (${nameConds || 'u.nombre LIKE ?'})  -- fallback si por alguna razón no hay tokens
          OR ${emailCond}
        )
        ${extra}
      ORDER BY u.nombre
      LIMIT 15
    `;

    // Si por algún motivo tokens está vacío, usamos q como fallback para nombre también
    const params = (nameParams.length ? nameParams : [`%${q}%`]).concat(emailParam);

    const rows = await query(sql, params);
    res.json(rows);
  } catch (e) {
    console.error('search-clients error:', e);
    res.status(500).json({ error: 'Error buscando clientes' });
  }
});
module.exports = router;