const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const student = express.Router();
const teacher = express.Router();

// ─── Student: GET own sessions ────────────────────────────────────────────────

student.get('/sessions', requireAuth, (req, res) => {
  const studentId = req.user.id;

  const sessions = db.prepare(`
    SELECT
      s.*,
      m.text AS summary_message_text
    FROM sessions s
    LEFT JOIN messages m ON m.id = s.summary_message_id
    WHERE s.student_id = ?
    ORDER BY s.scheduled_at ASC
  `).all(studentId);

  return res.json({ sessions });
});

// ─── Teacher: GET all sessions ────────────────────────────────────────────────

teacher.get('/sessions', requireAuth, requireTeacher, (req, res) => {
  const sessions = db.prepare(`
    SELECT s.*, u.name AS student_name, u.email AS student_email
    FROM sessions s
    JOIN users u ON u.id = s.student_id
    ORDER BY s.scheduled_at DESC
  `).all();

  return res.json({ sessions });
});

// ─── Teacher: POST create session ─────────────────────────────────────────────

teacher.post('/sessions', requireAuth, requireTeacher, (req, res) => {
  const { student_id, title, scheduled_at, duration_minutes = 60, zoom_url, prep_note } = req.body;

  if (!student_id || !title || !scheduled_at) {
    return res.status(400).json({ error: 'student_id, title, and scheduled_at are required' });
  }

  const studentUser = db.prepare(`SELECT id FROM users WHERE id = ? AND role = 'student'`).get(student_id);
  if (!studentUser) return res.status(404).json({ error: 'Student not found' });

  const result = db.prepare(`
    INSERT INTO sessions (student_id, title, scheduled_at, duration_minutes, zoom_url, prep_note, status)
    VALUES (?, ?, ?, ?, ?, ?, 'upcoming')
  `).run(student_id, title, scheduled_at, duration_minutes, zoom_url || null, prep_note || null);

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(result.lastInsertRowid);
  return res.status(201).json({ session });
});

// ─── Teacher: PATCH update session ───────────────────────────────────────────

teacher.patch('/sessions/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { title, scheduled_at, duration_minutes, zoom_url, prep_note, status, summary_message_id } = req.body;

  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  db.prepare(`
    UPDATE sessions SET
      title = COALESCE(?, title),
      scheduled_at = COALESCE(?, scheduled_at),
      duration_minutes = COALESCE(?, duration_minutes),
      zoom_url = COALESCE(?, zoom_url),
      prep_note = COALESCE(?, prep_note),
      status = COALESCE(?, status),
      summary_message_id = COALESCE(?, summary_message_id)
    WHERE id = ?
  `).run(
    title ?? null, scheduled_at ?? null, duration_minutes ?? null,
    zoom_url ?? null, prep_note ?? null, status ?? null,
    summary_message_id ?? null, id,
  );

  const updated = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
  return res.json({ session: updated });
});

// ─── Teacher: DELETE session ──────────────────────────────────────────────────

teacher.delete('/sessions/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id);
  return res.json({ ok: true });
});

module.exports = { studentRouter: student, teacherRouter: teacher };
