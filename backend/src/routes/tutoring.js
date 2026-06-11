const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const teacherRouter = express.Router();
const studentRouter = express.Router();

// ─── Teacher: package management ─────────────────────────────────────────────

// GET /api/teacher/tutoring/packages
teacherRouter.get('/tutoring/packages', requireAuth, requireTeacher, (req, res) => {
  res.json({ packages: db.prepare('SELECT * FROM tutoring_packages ORDER BY hours').all() });
});

// POST /api/teacher/tutoring/packages
teacherRouter.post('/tutoring/packages', requireAuth, requireTeacher, (req, res) => {
  const { name, hours, price_eur } = req.body;
  if (!name || !hours || !price_eur)
    return res.status(400).json({ error: 'name, hours and price_eur are required' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO tutoring_packages (name, hours, price_eur) VALUES (?, ?, ?)'
  ).run(name, Number(hours), Number(price_eur));

  res.status(201).json({
    package: db.prepare('SELECT * FROM tutoring_packages WHERE id = ?').get(lastInsertRowid),
  });
});

// PUT /api/teacher/tutoring/packages/:id
teacherRouter.put('/tutoring/packages/:id', requireAuth, requireTeacher, (req, res) => {
  const pkg = db.prepare('SELECT id FROM tutoring_packages WHERE id = ?').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });

  const { name, hours, price_eur, is_active } = req.body;
  db.prepare(`
    UPDATE tutoring_packages SET
      name = COALESCE(?, name),
      hours = COALESCE(?, hours),
      price_eur = COALESCE(?, price_eur),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `).run(name ?? null, hours ? Number(hours) : null, price_eur ? Number(price_eur) : null,
         is_active !== undefined ? (is_active ? 1 : 0) : null, req.params.id);

  res.json({ package: db.prepare('SELECT * FROM tutoring_packages WHERE id = ?').get(req.params.id) });
});

// DELETE /api/teacher/tutoring/packages/:id
teacherRouter.delete('/tutoring/packages/:id', requireAuth, requireTeacher, (req, res) => {
  const pkg = db.prepare('SELECT id FROM tutoring_packages WHERE id = ?').get(req.params.id);
  if (!pkg) return res.status(404).json({ error: 'Package not found' });
  db.prepare('DELETE FROM tutoring_packages WHERE id = ?').run(req.params.id);
  res.json({ message: 'Package deleted' });
});

// ─── Teacher: student hours management ───────────────────────────────────────

// GET /api/teacher/students/:id/hours
teacherRouter.get('/students/:id/hours', requireAuth, requireTeacher, (req, res) => {
  const student = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  let hours = db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(req.params.id);
  if (!hours) {
    db.prepare('INSERT INTO student_hours (student_id) VALUES (?)').run(req.params.id);
    hours = db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(req.params.id);
  }
  res.json({ student, hours });
});

// PATCH /api/teacher/students/:id/hours — manually adjust balance (e.g. grant free hours)
// Body: { hours_remaining, reason? }
teacherRouter.patch('/students/:id/hours', requireAuth, requireTeacher, (req, res) => {
  const { hours_remaining, hours_total } = req.body;
  if (hours_remaining === undefined && hours_total === undefined)
    return res.status(400).json({ error: 'hours_remaining or hours_total is required' });

  // Ensure row exists
  const existing = db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(req.params.id);
  if (!existing) {
    db.prepare('INSERT INTO student_hours (student_id) VALUES (?)').run(req.params.id);
  }

  db.prepare(`
    UPDATE student_hours SET
      hours_remaining = COALESCE(?, hours_remaining),
      hours_total = COALESCE(?, hours_total),
      updated_at = datetime('now')
    WHERE student_id = ?
  `).run(
    hours_remaining !== undefined ? Number(hours_remaining) : null,
    hours_total !== undefined ? Number(hours_total) : null,
    req.params.id
  );

  res.json({ hours: db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(req.params.id) });
});

// POST /api/teacher/tutoring/sessions — create session and deduct 1 hour
// Body: { student_id, title, scheduled_at, duration_minutes?, zoom_url?, prep_note? }
teacherRouter.post('/tutoring/sessions', requireAuth, requireTeacher, (req, res) => {
  const { student_id, title, scheduled_at, duration_minutes = 60, zoom_url, prep_note } = req.body;
  if (!student_id || !title || !scheduled_at)
    return res.status(400).json({ error: 'student_id, title and scheduled_at are required' });

  const student = db.prepare('SELECT id FROM users WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  // Deduct 1 hour if balance available
  let hoursDeducted = 0;
  const hours = db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(student_id);
  if (hours && hours.hours_remaining > 0) {
    db.prepare(`
      UPDATE student_hours SET hours_remaining = hours_remaining - 1, updated_at = datetime('now')
      WHERE student_id = ?
    `).run(student_id);
    hoursDeducted = 1;
  }

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO sessions (student_id, title, scheduled_at, duration_minutes, zoom_url, prep_note, hours_deducted)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(student_id, title, scheduled_at, duration_minutes, zoom_url ?? null, prep_note ?? null, hoursDeducted);

  res.status(201).json({
    session: db.prepare('SELECT * FROM sessions WHERE id = ?').get(lastInsertRowid),
    hours_deducted: hoursDeducted,
  });
});

// ─── Student: view hours and packages ────────────────────────────────────────

// GET /api/student/tutoring/hours
studentRouter.get('/tutoring/hours', requireAuth, (req, res) => {
  let hours = db.prepare('SELECT * FROM student_hours WHERE student_id = ?').get(req.user.id);
  if (!hours) hours = { student_id: req.user.id, hours_remaining: 0, hours_total: 0 };

  const packages = db.prepare('SELECT * FROM tutoring_packages WHERE is_active = 1 ORDER BY hours').all();
  res.json({ hours, packages });
});

module.exports = { teacherRouter, studentRouter };
