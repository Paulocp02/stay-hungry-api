
const { query } = require('../config/mysql');


async function getOrCreateTodaySession(req, res) {
  try {
    const clienteId = Number(req.query.clienteId);
    if (!clienteId) return res.status(400).json({ error: 'clienteId requerido' });

    // 1) Buscar asignación activa más reciente
    const [asig] = await query(
      `SELECT id, plantilla_id
         FROM rutina_asignaciones
        WHERE cliente_id=? AND estado='Activa'
        ORDER BY fecha_inicio DESC
        LIMIT 1`,
      [clienteId]
    );

    const hoy = new Date().toISOString().slice(0, 10);

    // 2) Sin asignación → responde 200 "vacío"
    if (!asig) {
      return res.json({ sesionId: null, date: hoy, items: [] });
    }

    // 3) Buscar/crear sesión de hoy
    const [ses] = await query(
      `SELECT id FROM sesiones WHERE asignacion_id=? AND fecha_sesion=? LIMIT 1`,
      [asig.id, hoy]
    );
    let sesionId = ses?.id;

    if (!sesionId) {
      const result = await query(
        `INSERT INTO sesiones (usuario_id, rutina_id, fecha_sesion, completada, fecha_creacion, asignacion_id)
         VALUES (?, ?, ?, FALSE, NOW(), ?)`,
        [clienteId, asig.plantilla_id, hoy, asig.id]
      );
      sesionId = result.insertId;
    }

    // 4) Items (ejercicios de la plantilla + estado completado si existe)
    const items = await query(
      `SELECT rpe.id AS plantilla_ejercicio_id,
              e.nombre AS ejercicio_nombre,
              rpe.series, rpe.repeticiones,
              COALESCE(se.completado, 0) AS completado
         FROM rutina_plantilla_ejercicios rpe
         JOIN ejercicios e ON e.id = rpe.ejercicio_id
    LEFT JOIN sesiones_ejercicios se
           ON se.sesion_id = ? AND se.plantilla_ejercicio_id = rpe.id
        WHERE rpe.plantilla_id = ?
        ORDER BY rpe.orden`,
      [sesionId, asig.plantilla_id]
    );

    return res.json({ sesionId, date: hoy, items });
  } catch (err) {
    console.error('getOrCreateTodaySession error:', err);
    return res.status(500).json({ error: 'Error obteniendo la sesión de hoy' });
  }
}


async function toggleExercise(req, res) {
  const sesionId = Number(req.params.sesionId);
  const plantillaEjercicioId = Number(req.params.plantillaEjercicioId);
  const { completado } = req.body;
  await query(`UPDATE sesiones_ejercicios SET completado=? WHERE sesion_id=? AND plantilla_ejercicio_id=?`,
              [!!completado, sesionId, plantillaEjercicioId]);
  res.json({ ok: true });
}

async function addSet(req, res) {
  const sesionId = Number(req.params.sesionId);
  const { plantillaEjercicioId, setNum, reps, pesoKg, rpe, esMax } = req.body;
  if (!sesionId || !plantillaEjercicioId || !setNum || !reps || pesoKg == null)
    return res.status(400).json({ error: 'Datos de set incompletos' });

  await query(
    `INSERT INTO ejercicios_sets (sesion_id, plantilla_ejercicio_id, set_num, reps, peso_kg, rpe, es_max)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE reps=VALUES(reps), peso_kg=VALUES(peso_kg), rpe=VALUES(rpe), es_max=VALUES(es_max)`,
    [sesionId, plantillaEjercicioId, setNum, reps, pesoKg, rpe ?? null, !!esMax]
  );
  res.json({ ok: true });
}

async function sessionSummary(req, res) {
  const sesionId = Number(req.params.sesionId);
  const rows = await query(
    `SELECT rpe.id AS plantilla_ejercicio_id, e.nombre AS ejercicio,
            MAX(es.peso_kg) AS max_peso,
            MAX(es.reps)    AS max_reps,
            MAX(ROUND(es.peso_kg * (1 + es.reps/30), 2)) AS est_1rm
     FROM ejercicios_sets es
     JOIN rutina_plantilla_ejercicios rpe ON rpe.id=es.plantilla_ejercicio_id
     JOIN ejercicios e ON e.id=rpe.ejercicio_id
     WHERE es.sesion_id=?
     GROUP BY rpe.id, e.nombre
     ORDER BY MIN(rpe.orden)`,
    [sesionId]
  );
  res.json({ sesionId, resumen: rows });
}

// GET /api/sessions/:sesionId/exercises/:plantillaEjercicioId/sets
async function getSets(req, res) {
  try {
    const sesionId = Number(req.params.sesionId);
    const peId = Number(req.params.plantillaEjercicioId);

    if (!sesionId || !peId) {
      return res.status(400).json({ error: 'sesionId y plantillaEjercicioId requeridos' });
    }

    const rows = await query(
      `SELECT set_num, reps, peso_kg, rpe, es_max, creado_en
         FROM ejercicios_sets
        WHERE sesion_id=? AND plantilla_ejercicio_id=?
        ORDER BY set_num`,
      [sesionId, peId]
    );
    return res.json(rows);
  } catch (err) {
    console.error('getSets error:', err);
    return res.status(500).json({ error: 'Error listando sets' });
  }
}

module.exports = { getOrCreateTodaySession, toggleExercise, addSet, sessionSummary, getSets };
