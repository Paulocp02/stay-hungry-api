// controllers/progressController.js
const { query } = require('../config/mysql');

async function getWeightHistory(req, res) {
  try {
    const userId = req.user?.id ?? Number(req.query.usuarioId);
    const days = Number(req.query.days ?? 180);
    if (!userId) return res.status(400).json({ error: 'usuarioId requerido' });

    const rows = await query(
      `SELECT DATE_FORMAT(fecha_medicion, '%Y-%m-%d') AS date,
              peso_kg AS weight
       FROM metricas_corporales
       WHERE usuario_id = ? AND fecha_medicion >= (CURRENT_DATE - INTERVAL ? DAY)
       ORDER BY fecha_medicion`,
      [userId, days]
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo histórico de peso' });
  }
}

/** IMC histórico: usa la estatura actual del usuario para calcular IMC por día */
async function getBmiHistory(req, res) {
  try {
    const userId = req.user?.id ?? Number(req.query.usuarioId);
    const days = Number(req.query.days ?? 180);
    if (!userId) return res.status(400).json({ error: 'usuarioId requerido' });

    const u = await query(`SELECT estatura FROM usuarios WHERE id = ?`, [userId]);
    if (!u.length || !u[0].estatura) return res.json([]); // sin estatura no hay IMC

    const est = Number(u[0].estatura);

    const rows = await query(
      `SELECT DATE_FORMAT(fecha_medicion, '%Y-%m-%d') AS date,
              peso_kg,
              ROUND(peso_kg / (? * ?), 2) AS bmi
       FROM metricas_corporales
       WHERE usuario_id = ?
         AND fecha_medicion >= (CURRENT_DATE - INTERVAL ? DAY)
       ORDER BY fecha_medicion`,
      [est, est, userId, days]
    );

    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo histórico de IMC' });
  }
}

async function getStrengthPRs(req, res) {
  try {
    const userId = req.user?.id ?? Number(req.query.usuarioId);
    const days = Number(req.query.days ?? 180);
    if (!userId) return res.status(400).json({ error: 'usuarioId requerido' });

    // Versión MySQL 8+ con window functions: tomamos el mejor 1RM por ejercicio
    const rows = await query(
      `
      WITH ranked AS (
        SELECT
          rpe.ejercicio_id,
          e.nombre AS ejercicio,
          es.peso_kg,
          es.reps,
          (es.peso_kg * (1 + es.reps/30)) AS est_1rm,
          s.fecha_sesion,
          ROW_NUMBER() OVER (
            PARTITION BY rpe.ejercicio_id
            ORDER BY (es.peso_kg * (1 + es.reps/30)) DESC, es.peso_kg DESC, es.reps DESC, s.fecha_sesion DESC
          ) AS rn
        FROM ejercicios_sets es
        JOIN sesiones s                  ON s.id = es.sesion_id
        JOIN rutina_plantilla_ejercicios rpe ON rpe.id = es.plantilla_ejercicio_id
        JOIN ejercicios e                ON e.id = rpe.ejercicio_id
        WHERE s.usuario_id = ?
          AND s.fecha_sesion >= (CURRENT_DATE - INTERVAL ? DAY)
      )
      SELECT
        ejercicio,
        ROUND(est_1rm, 2)           AS est_1rm,
        ROUND(peso_kg, 2)           AS max_peso,
        reps                        AS max_reps,
        DATE_FORMAT(fecha_sesion, '%Y-%m-%d') AS date
      FROM ranked
      WHERE rn = 1
      ORDER BY est_1rm DESC
      LIMIT 50
      `,
      [userId, days]
    );

    res.json(rows.map(r => ({
      ejercicio: r.ejercicio,
      est_1rm: Number(r.est_1rm),
      max_peso: Number(r.max_peso),
      max_reps: Number(r.max_reps),
      date: r.date
    })));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error obteniendo PRs de fuerza' });
  }
}


module.exports = { 
  getWeightHistory,
  getBmiHistory,
  getStrengthPRs
};