const { query } = require('../config/mysql');

async function ensureTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS app_usage_events (
      id           INT AUTO_INCREMENT PRIMARY KEY,
      user_id      INT NULL,
      rol          ENUM('Cliente','Entrenador','Administrador') NULL,
      session_id   VARCHAR(64) NOT NULL,
      event_type   ENUM('page_view','focus','blur','heartbeat','unload','action') NOT NULL,
      route        VARCHAR(200) NULL,
      duration_ms  INT NULL,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_user_created (user_id, created_at),
      KEY idx_role_created (rol, created_at),
      KEY idx_event (event_type),
      KEY idx_route (route),
      CONSTRAINT fk_app_usage_user FOREIGN KEY (user_id) REFERENCES usuarios(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

exports.trackUsage = async (req, res) => {
  try {
    await ensureTable();

    const {
      sessionId,
      type,
      route = null,
      durationMs = null,
      userId = null,
      rol = null,
    } = req.body || {};

    if (!sessionId || !type) {
      return res.status(400).json({ success: false, message: 'sessionId y type son requeridos' });
    }

    const allowed = new Set(['page_view','focus','blur','heartbeat','unload','action']);
    if (!allowed.has(type)) {
      return res.status(400).json({ success: false, message: 'type inválido' });
    }

    // Si la request está autenticada, sobreescribe userId/rol con lo del token
    const uid = req.user?.id ?? req.user?.usuario_id ?? userId ?? null;
    const role = req.user?.rol ?? req.user?.role ?? rol ?? null;

    await query(
      `INSERT INTO app_usage_events
         (user_id, rol, session_id, event_type, route, duration_ms)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        uid,
        role,
        String(sessionId),
        type,
        route ? String(route).slice(0, 200) : null,
        Number.isFinite(durationMs) ? Math.max(0, Math.floor(durationMs)) : null
      ]
    );

    res.json({ success: true });
  } catch (e) {
    console.error('trackUsage error:', e);
    res.status(500).json({ success: false, message: 'No se pudo registrar uso' });
  }
};

exports.usageSummary = async (req, res) => {
  try {
    await ensureTable();

    const from = (req.query.from || '').slice(0, 10);
    const to   = (req.query.to   || '').slice(0, 10);

    let where, params;
    if (from && to) {
      where = 'DATE(created_at) BETWEEN ? AND ?';
      params = [from, to];
    } else {
      where = 'created_at >= (CURRENT_DATE - INTERVAL 30 DAY)';
      params = [];
    }

    const sess = await query(
      `SELECT COUNT(DISTINCT session_id) AS n
         FROM app_usage_events
        WHERE ${where}`, params
    );

    const active = await query(
      `SELECT COALESCE(SUM(duration_ms),0) AS dur
         FROM app_usage_events
        WHERE ${where}
          AND event_type IN ('heartbeat','blur','unload')`, params
    );

    const pages = await query(
      `SELECT route AS path,
              COUNT(*) AS hits,
              COUNT(DISTINCT user_id) AS users
         FROM app_usage_events
        WHERE ${where}
          AND event_type = 'page_view'
        GROUP BY route
        ORDER BY hits DESC
        LIMIT 50`, params
    );

    res.json({
      sessions: Number(sess[0]?.n || 0),
      minutes_active: +((Number(active[0]?.dur || 0) / 60000).toFixed(1)),
      pages: pages.map(r => ({
        path: r.path || '(sin ruta)',
        hits: Number(r.hits || 0),
        users: Number(r.users || 0),
      })),
    });
  } catch (e) {
    console.error('usageSummary error:', e);
    res.status(500).json({ success: false, message: 'No se pudo obtener el resumen de uso' });
  }
};
