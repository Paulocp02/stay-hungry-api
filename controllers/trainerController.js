const { query } = require('../config/mysql');

exports.getMyClients = async (req, res) => {
  const { entrenadorId } = req.query;
  if (!entrenadorId) return res.status(400).json({ error: 'entrenadorId requerido' });

  const rows = await query(
    `SELECT u.id, u.nombre, u.email, u.edad, u.peso, u.estatura
       FROM entrenadores_clientes ec
       JOIN usuarios u ON u.id = ec.cliente_id
      WHERE ec.entrenador_id=? AND ec.activo=1
      ORDER BY u.nombre`,
    [entrenadorId]
  );
  res.json(rows);
};

exports.assignClient = async (req, res) => {
  const { entrenadorId, clienteId } = req.body;
  if (!entrenadorId || !clienteId)
    return res.status(400).json({ error: 'entrenadorId y clienteId requeridos' });

  const [ent] = await query(`SELECT id FROM usuarios WHERE id=? AND rol='Entrenador'`, [entrenadorId]);
  const [cli] = await query(`SELECT id FROM usuarios WHERE id=? AND rol='Cliente'`, [clienteId]);
  if (!ent || !cli) return res.status(400).json({ error: 'IDs inválidos o roles incorrectos' });

  await query(
    `INSERT INTO entrenadores_clientes (entrenador_id, cliente_id, activo)
     VALUES (?, ?, 1)
     ON DUPLICATE KEY UPDATE activo=VALUES(activo)`,
    [entrenadorId, clienteId]
  );
  res.json({ ok: true });
};

exports.searchClients = async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    const unassignedOnly = (req.query.unassignedOnly ?? '1') === '1'; // default: solo no asignados

    if (!q) return res.json([]); // sin término => vacío

    const term = `%${q}%`;

    const rows = await query(
      `
      SELECT
        u.id, u.nombre, u.email, u.edad, u.peso, u.estatura,
        ec.entrenador_id,
        CASE WHEN ec.activo = 1 THEN 1 ELSE 0 END AS asignado
      FROM usuarios u
      LEFT JOIN entrenadores_clientes ec
        ON ec.cliente_id = u.id AND ec.activo = 1
      WHERE u.rol = 'Cliente'
        AND (u.nombre LIKE ? OR u.email LIKE ?)
        ${unassignedOnly ? 'AND ec.entrenador_id IS NULL' : ''}
      ORDER BY u.nombre
      LIMIT 20
      `,
      [term, term]
    );

    res.json(rows);
  } catch (e) {
    console.error('searchClients error:', e);
    res.status(500).json({ error: 'Error buscando clientes' });
  }
};