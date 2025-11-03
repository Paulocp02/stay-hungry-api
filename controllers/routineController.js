const { query } = require('../config/mysql');

/**
 * POST /api/routines/templates
 * body: { entrenadorId, nombre, descripcion? }
 */
async function createTemplate(req, res) {
  try {
    const { entrenadorId, nombre, descripcion } = req.body;
    if (!entrenadorId || !nombre) {
      return res.status(400).json({ error: 'entrenadorId y nombre requeridos' });
    }
    const r = await query(
      `INSERT INTO rutinas (nombre, descripcion, entrenador_id, cliente_id, activa)
       VALUES (?, ?, ?, NULL, TRUE)`,
      [nombre, descripcion || null, entrenadorId]
    );
    return res.json({ plantillaId: r.insertId });
  } catch (e) {
    console.error('createTemplate error:', e);
    return res.status(500).json({ error: 'Error creando plantilla' });
  }
}

/**
 * POST /api/routines/templates/:plantillaId/exercises
 * Acepta body como:
 *  - { items: [{ ejercicioId, orden, series, repeticiones, pesoObjetivo?, descansoSegundos?, notas? }, ...] }
 *  - O bien un array directo [{...}, ...] (compatibilidad)
 */
async function addExercisesBulk(req, res) {
  try {
    const plantillaId = Number(req.params.plantillaId);
    const body = req.body || {};
    const items = Array.isArray(body) ? body : (Array.isArray(body.items) ? body.items : []);

    if (!plantillaId || !items.length) {
      return res.status(400).json({ error: 'Datos insuficientes' });
    }

    // Normalización + validaciones mínimas
    const usados = new Set();
    const rows = items.map((it, idx) => {
      const ejercicioId  = Number(it.ejercicioId);
      const orden        = Number(it.orden);
      const series       = Number(it.series);
      const repeticiones = Number(it.repeticiones);
      const pesoObjetivo = (it.pesoObjetivo ?? '') !== '' ? Number(it.pesoObjetivo) : null;
      const descansoSeg  = (it.descansoSegundos ?? '') !== '' ? Number(it.descansoSegundos) : null;
      const notas        = it.notas ?? null;

      if (!ejercicioId || !orden || !series || !repeticiones) {
        throw new Error(`Fila ${idx + 1}: campos obligatorios faltantes`);
      }
      if (usados.has(orden)) {
        throw new Error(`Orden duplicado: ${orden}`);
      }
      usados.add(orden);

      return [plantillaId, ejercicioId, orden, series, repeticiones, pesoObjetivo, descansoSeg, notas];
    });

    // Placeholders dinámicos (mysql2 no soporta "VALUES ?")
    const placeholders = rows.map(() => '(?,?,?,?,?,?,?,?)').join(',');
    await query(
      `INSERT INTO rutina_plantilla_ejercicios
         (plantilla_id, ejercicio_id, orden, series, repeticiones, peso_objetivo, descanso_segundos, notas)
       VALUES ${placeholders}`,
      rows.flat()
    );

    return res.json({ ok: true, count: rows.length });
  } catch (e) {
    console.error('addExercisesBulk error:', e);
    // Mensajes claros para errores frecuentes
    if (e.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Orden duplicado (uk_rpe_orden)' });
    }
    if (e.code === 'ER_NO_REFERENCED_ROW_2') {
      return res.status(400).json({ error: 'Ejercicio no existe (FK ejercicios.id)' });
    }
    return res.status(400).json({ error: e.message || 'Error guardando ejercicios' });
  }
}

/**
 * POST /api/routines/assign
 * body: { plantillaId, entrenadorId, clienteId, fechaInicio, notas? }
 */
async function assignRoutine(req, res) {
  try {
    const { plantillaId, entrenadorId, clienteId, fechaInicio, notas } = req.body;
    if (!plantillaId || !entrenadorId || !clienteId || !fechaInicio) {
      return res.status(400).json({ error: 'faltan datos' });
    }

    const r = await query(
      `INSERT INTO rutina_asignaciones (plantilla_id, entrenador_id, cliente_id, fecha_inicio, estado, notas)
       VALUES (?, ?, ?, ?, 'Activa', ?)`,
      [Number(plantillaId), Number(entrenadorId), Number(clienteId), fechaInicio, notas || null]
    );
    return res.json({ ok: true, id: r.insertId });
  } catch (e) {
    console.error('assignRoutine error:', e);
    return res.status(500).json({ error: 'Error asignando rutina' });
  }
}

module.exports = { createTemplate, addExercisesBulk, assignRoutine };
