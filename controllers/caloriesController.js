const { query } = require('../config/mysql');

function clampDate(s) { return s ? String(s).slice(0,10) : null; }
const DEFAULT_MET = 3.5;

async function caloriesBySession(req, res) {
  try {
    const userId = Number(req.query.usuarioId || req.user?.userId);
    const from   = clampDate(req.query.from);
    const to     = clampDate(req.query.to);
    if (!userId || !from || !to) return res.status(400).json({ error: 'usuarioId, from y to requeridos (YYYY-MM-DD)' });

    // peso usuario
    const u = await query(`SELECT peso FROM usuarios WHERE id=?`, [userId]);
    const peso = Number(u[0]?.peso || 0);
    if (!peso) return res.json([]); // sin peso no calculamos

    // sets de la sesión + datos de plantilla para descanso y ejercicio.met
    const rows = await query(
      `
      SELECT s.id AS sesion_id, s.fecha_sesion, s.duracion_minutos,
             rpe.id AS plantilla_ejercicio_id, e.met, rpe.descanso_segundos,
             COUNT(es.id) AS sets, COALESCE(SUM(rpe.descanso_segundos), 0) AS descanso_total
      FROM sesiones s
      LEFT JOIN sesiones_ejercicios se ON se.sesion_id = s.id
      LEFT JOIN rutina_plantilla_ejercicios rpe ON rpe.id = se.plantilla_ejercicio_id
      LEFT JOIN ejercicios e ON e.id = rpe.ejercicio_id
      LEFT JOIN ejercicios_sets es ON es.sesion_id = s.id AND es.plantilla_ejercicio_id = rpe.id
      WHERE s.usuario_id = ?
        AND s.fecha_sesion BETWEEN ? AND ?
      GROUP BY s.id, s.fecha_sesion, s.duracion_minutos, rpe.id, e.met, rpe.descanso_segundos
      ORDER BY s.fecha_sesion, s.id
      `,
      [userId, from, to]
    );

    // agrega un “pack” por sesión
    const bySession = new Map();
    for (const r of rows) {
      const key = r.sesion_id;
      if (!bySession.has(key)) {
        bySession.set(key, {
          sesion_id: r.sesion_id,
          fecha: r.fecha_sesion,
          duracion_minutos: r.duracion_minutos, // podría ser null
          ejercicios: [],
        });
      }
      const met = Number(r.met || DEFAULT_MET);
      const sets = Number(r.sets || 0);
      const descansoTotal = Number(r.descanso_total || 0); // en seg
      // estimación de duración si la sesión no tiene duracion_minutos
      const estSets = sets * 40; // 40s por set de media
      const estTotalSeg = estSets + (descansoTotal || sets * (r.descanso_segundos || 90));
      const estMin = estTotalSeg / 60;

      bySession.get(key).ejercicios.push({
        plantilla_ejercicio_id: r.plantilla_ejercicio_id,
        met,
        sets,
        descanso_segundos: r.descanso_segundos,
        est_min: estMin,
      });
    }

    // calcula kcal por sesión
    const out = [];
    for (const pack of bySession.values()) {
      // minutos efectivos
      let minutos = Number(pack.duracion_minutos || 0);
      if (!minutos) {
        minutos = pack.ejercicios.reduce((acc, it) => acc + it.est_min, 0);
      }
      if (minutos <= 0) minutos = 30; // fallback

      // promedio de MET ponderado por sets (simple)
      const totalSets = pack.ejercicios.reduce((a, it) => a + (it.sets || 0), 0) || 1;
      const metAvg = pack.ejercicios.reduce((a, it) => a + (it.met * (it.sets || 1)), 0) / totalSets;

      const kcal = (metAvg * 3.5 * peso / 200) * minutos;

      out.push({
        sesion_id: pack.sesion_id,
        date: pack.fecha,
        minutos: Math.round(minutos),
        met_prom: +metAvg.toFixed(2),
        peso_kg: peso,
        kcal: Math.round(kcal),
      });
    }

    res.json(out);
  } catch (e) {
    console.error('caloriesBySession error', e);
    res.status(500).json({ error: 'Error calculando calorías por sesión' });
  }
}

async function caloriesByRangeForUser(req, res) {
  try {
    const userId = Number(req.query.usuarioId || req.user?.userId);
    const from   = clampDate(req.query.from);
    const to     = clampDate(req.query.to);
    if (!userId || !from || !to) return res.status(400).json({ error: 'usuarioId, from y to requeridos' });

    // Reutiliza lo anterior:
    req.query.usuarioId = userId;
    const fakeRes = { json: (x)=>x };
    const sessions = await new Promise((resolve, reject) => {
      const _res = { json: resolve, status: () => ({ json: reject }) };
      caloriesBySession({ query: { usuarioId: userId, from, to }, user: req.user }, _res);
    });

    // Agrupa por día (suma kcal)
    const map = new Map();
    sessions.forEach(s => {
      map.set(s.date, (map.get(s.date) || 0) + s.kcal);
    });
    const daily = Array.from(map.entries()).sort((a,b)=>a[0].localeCompare(b[0]))
      .map(([date,kcal]) => ({ date, kcal }));

    res.json({ sessions, daily });
  } catch (e) {
    console.error('caloriesByRangeForUser error', e);
    res.status(500).json({ error: 'Error construyendo reporte de calorías' });
  }
}

module.exports = { caloriesBySession, caloriesByRangeForUser };
