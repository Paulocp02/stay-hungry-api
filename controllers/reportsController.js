// controllers/reportsController.js
const { query } = require('../config/mysql');  // <-- SOLO UNA VEZ

/** Normaliza fechas YYYY-MM-DD (front ya las manda así). */
function clampDate(s) {
  if (!s) return null;
  return String(s).slice(0, 10);
}

/**
 * 1) Altas / Bajas por mes (churn)
 * Usa DATE(...) para ignorar hora y no perder registros del día límite.
 */
async function usersChurn(req, res) {
  try {
    const from = clampDate(req.query.from);
    const to   = clampDate(req.query.to);

    const altas = await query(
      `SELECT DATE_FORMAT(DATE(fecha_registro), '%Y-%m') AS periodo,
              COUNT(*) AS altas
         FROM usuarios
        WHERE DATE(fecha_registro) BETWEEN ? AND ?
        GROUP BY 1
        ORDER BY 1`,
      [from, to]
    );

    const bajas = await query(
      `SELECT DATE_FORMAT(DATE(fecha_baja), '%Y-%m') AS periodo,
              COUNT(*) AS bajas
         FROM usuarios
        WHERE fecha_baja IS NOT NULL
          AND DATE(fecha_baja) BETWEEN ? AND ?
        GROUP BY 1
        ORDER BY 1`,
      [from, to]
    );

    const map = new Map();
    altas.forEach(r =>
      map.set(r.periodo, { periodo: r.periodo, altas: Number(r.altas) || 0, bajas: 0 })
    );
    bajas.forEach(r => {
      const prev = map.get(r.periodo) || { periodo: r.periodo, altas: 0, bajas: 0 };
      prev.bajas = Number(r.bajas) || 0;
      map.set(r.periodo, prev);
    });

    const rows = Array.from(map.values())
      .sort((a, b) => a.periodo.localeCompare(b.periodo))
      .map(r => ({ ...r, neto: (r.altas || 0) - (r.bajas || 0) }));

    res.json(rows);
  } catch (e) {
    console.error('usersChurn error', e);
    res.status(500).json({ error: 'Error generando reporte de altas/bajas' });
  }
}

/**
 * 2) Adherencia últimos N días (overall y por entrenador)
 */
async function adherence30d(req, res) {
  try {
    const days = Math.max(1, Number(req.query.days || 30));

    const total = await query(
      `SELECT COUNT(*) AS n
         FROM usuarios
        WHERE rol = 'Cliente'`
    );

    const conSets = await query(
      `SELECT COUNT(DISTINCT s.usuario_id) AS n
         FROM sesiones s
         JOIN ejercicios_sets es ON es.sesion_id = s.id
        WHERE s.fecha_sesion >= (CURRENT_DATE - INTERVAL ? DAY)`,
      [days]
    );

    const byTrainer = await query(
      `SELECT t.id AS entrenador_id,
              COALESCE(t.nombre, CONCAT('Entrenador ',t.id)) AS entrenador,
              COUNT(DISTINCT ec.cliente_id) AS total_clientes,
              COUNT(DISTINCT CASE WHEN s.fecha_sesion >= (CURRENT_DATE - INTERVAL ? DAY)
                                   AND es.sesion_id IS NOT NULL
                                  THEN ec.cliente_id END) AS clientes_con_sets
         FROM usuarios t
         LEFT JOIN entrenadores_clientes ec ON ec.entrenador_id = t.id
         LEFT JOIN sesiones s ON s.usuario_id = ec.cliente_id
         LEFT JOIN ejercicios_sets es ON es.sesion_id = s.id
        WHERE t.rol = 'Entrenador'
        GROUP BY t.id, t.nombre
        ORDER BY 2`,
      [days]
    );

    const overall = {
      clientes_con_sets: Number(conSets[0]?.n || 0),
      total_clientes:     Number(total[0]?.n || 0),
      adherencia_pct:     Number(total[0]?.n || 0) > 0
        ? +((conSets[0]?.n || 0) * 100 / total[0].n).toFixed(1)
        : 0
    };

    const rows = byTrainer.map(r => ({
      entrenador: r.entrenador,
      total_clientes: Number(r.total_clientes || 0),
      clientes_con_sets: Number(r.clientes_con_sets || 0),
      adherencia_pct: (Number(r.total_clientes || 0) > 0)
        ? +((Number(r.clientes_con_sets || 0) * 100 / Number(r.total_clientes))).toFixed(1)
        : 0
    }));

    res.json({ overall, by_trainer: rows });
  } catch (e) {
    console.error('adherence30d error', e);
    res.status(500).json({ error: 'Error generando reporte de adherencia' });
  }
}

/**
 * 3) Volumen (kg·reps) por semana ISO
 */
async function trainingVolume(req, res) {
  try {
    const from = clampDate(req.query.from);
    const to   = clampDate(req.query.to);

    const rows = await query(
      `SELECT CONCAT(YEAR(s.fecha_sesion), '-W', LPAD(WEEK(s.fecha_sesion, 3), 2, '0')) AS iso_week,
              ROUND(SUM(es.peso_kg * es.reps), 2) AS carga_total
         FROM ejercicios_sets es
         JOIN sesiones s ON s.id = es.sesion_id
        WHERE s.fecha_sesion BETWEEN ? AND ?
        GROUP BY 1
        ORDER BY 1`,
      [from, to]
    );

    res.json(rows.map(r => ({
      iso_week: r.iso_week,
      carga_total: Number(r.carga_total || 0)
    })));
  } catch (e) {
    console.error('trainingVolume error', e);
    res.status(500).json({ error: 'Error generando volumen semanal' });
  }
}

/**
 * 4) PRs / 1RM estimado en el rango (Top 100 por defecto)
 */
async function prsInRange(req, res) {
  try {
    const from  = clampDate(req.query.from) || '1900-01-01';
    const to    = clampDate(req.query.to)   || '2100-01-01';
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit ?? '100', 10)));

    // MySQL 8+: usar window functions para evitar JOIN por igualdad de float
    const sql = `
      WITH ranked AS (
        SELECT
          rpe.ejercicio_id,
          s.id                                     AS sesion_id,
          s.usuario_id,
          DATE(s.fecha_sesion)                     AS f,
          es.peso_kg,
          es.reps,
          CAST(es.peso_kg * (1 + es.reps/30.0) AS DECIMAL(10,4)) AS est_1rm,
          ROW_NUMBER() OVER (
            PARTITION BY rpe.ejercicio_id, s.usuario_id, DATE(s.fecha_sesion)
            ORDER BY (es.peso_kg * (1 + es.reps/30.0)) DESC,
                     es.peso_kg DESC,
                     es.reps DESC,
                     es.id DESC
          ) AS rn
        FROM ejercicios_sets es
        JOIN sesiones s  ON s.id = es.sesion_id
        JOIN rutina_plantilla_ejercicios rpe ON rpe.id = es.plantilla_ejercicio_id
        WHERE s.fecha_sesion BETWEEN ? AND ?
      )
      SELECT
        e.nombre                         AS ejercicio,
        r.est_1rm,
        r.peso_kg                        AS max_peso,
        r.reps                           AS max_reps,
        DATE_FORMAT(r.f, '%Y-%m-%d')     AS date,
        u.nombre                         AS usuario
      FROM ranked r
      JOIN ejercicios e ON e.id = r.ejercicio_id
      JOIN usuarios  u ON u.id = r.usuario_id
      WHERE r.rn = 1
      ORDER BY r.est_1rm DESC
      LIMIT ${limit}
    `;

    const rows = await query(sql, [from, to]);

    res.json(
      rows.map(r => ({
        ejercicio: r.ejercicio,
        est_1rm: Number(r.est_1rm != null ? Number(r.est_1rm).toFixed(2) : null),
        max_peso: Number(r.max_peso),
        max_reps: Number(r.max_reps),
        date: r.date,
        usuario: r.usuario
      }))
    );
  } catch (e) {
    console.error('prsInRange error', e);
    res.status(500).json({ error: 'Error generando reporte de PRs' });
  }
}


/**
 * 5) Clientes por entrenador + sin asignar
 */
async function trainerClientsCount(req, res) {
  try {
    const rows = await query(
      `SELECT t.id AS entrenador_id,
              COALESCE(t.nombre, CONCAT('Entrenador ',t.id)) AS entrenador,
              COUNT(ec.cliente_id) AS clientes
         FROM usuarios t
         LEFT JOIN entrenadores_clientes ec ON ec.entrenador_id = t.id
        WHERE t.rol = 'Entrenador'
        GROUP BY t.id, t.nombre
        ORDER BY 3 DESC, 2 ASC`
    );

    const sinAsig = await query(
      `SELECT COUNT(*) AS n
         FROM usuarios c
        WHERE c.rol = 'Cliente'
          AND c.id NOT IN (SELECT cliente_id FROM entrenadores_clientes)`
    );

    res.json({
      rows: rows.map(r => ({ entrenador: r.entrenador, clientes: Number(r.clientes || 0) })),
      sin_asignar: Number(sinAsig[0]?.n || 0)
    });
  } catch (e) {
    console.error('trainerClientsCount error', e);
    res.status(500).json({ error: 'Error generando distribución de clientes' });
  }
}

module.exports = {
  usersChurn,
  adherence30d,
  trainingVolume,
  prsInRange,
  trainerClientsCount,
};
