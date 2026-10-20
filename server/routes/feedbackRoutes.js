const express = require('express');
const { query } = require('../config/database');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/feedback
 * Obtiene las encuestas de retroalimentación registradas por usuarios reales (sin datos inventados).
 */
router.get('/', async (req, res) => {
  try {
    const listRes = await query('SELECT * FROM feedback ORDER BY id DESC');
    const statsRes = await query(`
      SELECT
        COUNT(*) as total_responses,
        ROUND(AVG(rating), 2) as avg_rating,
        ROUND(AVG(usability_score), 2) as avg_usability,
        ROUND(AVG(speed_score), 2) as avg_speed,
        ROUND(AVG(design_score), 2) as avg_design
      FROM feedback
    `);

    const s = statsRes.rows[0] || {};
    res.json({
      stats: {
        total_responses: Number(s.total_responses || 0),
        avg_rating: s.avg_rating !== null ? Number(s.avg_rating) : null,
        avg_usability: s.avg_usability !== null ? Number(s.avg_usability) : null,
        avg_speed: s.avg_speed !== null ? Number(s.avg_speed) : null,
        avg_design: s.avg_design !== null ? Number(s.avg_design) : null
      },
      feedback: listRes.rows
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener retroalimentación: ' + error.message });
  }
});

/**
 * POST /api/feedback
 * Registra una nueva encuesta real de retroalimentación sobre el sistema.
 */
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      user_name,
      role = 'cliente',
      rating = 5,
      module_evaluated = 'General',
      usability_score = 5,
      speed_score = 5,
      design_score = 5,
      comments = '',
      suggestions = ''
    } = req.body;

    const finalName =
      (user_name && user_name.trim()) ||
      (req.user ? req.user.name : '');

    if (!finalName) {
      return res.status(400).json({ error: 'Por favor indique su nombre para registrar la encuesta.' });
    }

    const r = Number(rating);
    const u = Number(usability_score);
    const sp = Number(speed_score);
    const d = Number(design_score);

    if ([r, u, sp, d].some((val) => isNaN(val) || val < 1 || val > 5)) {
      return res.status(400).json({ error: 'Las calificaciones deben estar entre 1 y 5.' });
    }

    const insertRes = await query(
      `INSERT INTO feedback (user_id, user_name, role, rating, module_evaluated, usability_score, speed_score, design_score, comments, suggestions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user ? req.user.id : null,
        finalName,
        req.user ? req.user.role : role,
        r,
        module_evaluated,
        u,
        sp,
        d,
        comments.trim(),
        suggestions.trim()
      ]
    );

    const created = await query('SELECT * FROM feedback WHERE id = ?', [insertRes.lastInsertRowid]);
    res.status(201).json({
      message: '¡Gracias! Su opinión fue registrada en la base de datos.',
      entry: created.rows[0]
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar retroalimentación: ' + error.message });
  }
});

module.exports = router;
