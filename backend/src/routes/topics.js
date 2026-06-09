const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['draft', 'published', 'archived'];

function parseTopic(row) {
  if (!row) return null;
  return {
    ...row,
    syllabus_item_ids: JSON.parse(row.syllabus_item_ids || '[]'),
    linked_quiz_ids:   JSON.parse(row.linked_quiz_ids   || '[]'),
  };
}

// ─── POST /api/teacher/courses/:courseId/topics ───────────────────────────────

router.post('/courses/:courseId/topics', requireAuth, requireTeacher, (req, res) => {
  const { courseId } = req.params;
  const { title, description, formula_sheet_url, syllabus_item_ids } = req.body;

  const course = db.prepare('SELECT id FROM courses WHERE id = ?').get(courseId);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const syllabusJson = JSON.stringify(Array.isArray(syllabus_item_ids) ? syllabus_item_ids : []);

  const result = db.prepare(`
    INSERT INTO topics (course_id, title, description, formula_sheet_url, syllabus_item_ids)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    courseId,
    title.trim(),
    description || null,
    formula_sheet_url || null,
    syllabusJson,
  );

  const topic = parseTopic(db.prepare('SELECT * FROM topics WHERE id = ?').get(result.lastInsertRowid));
  return res.status(201).json({ topic });
});

// ─── GET /api/teacher/courses/:courseId/topics ────────────────────────────────

router.get('/courses/:courseId/topics', requireAuth, requireTeacher, (req, res) => {
  const { courseId } = req.params;

  const rows = db.prepare(`
    SELECT * FROM topics WHERE course_id = ? ORDER BY position, created_at
  `).all(courseId);

  return res.json({ topics: rows.map(parseTopic) });
});

// ─── GET /api/teacher/topics/:id ─────────────────────────────────────────────

router.get('/topics/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const topic = parseTopic(db.prepare('SELECT * FROM topics WHERE id = ?').get(id));
  if (!topic) return res.status(404).json({ error: 'Topic not found' });
  return res.json({ topic });
});

// ─── PUT /api/teacher/topics/:id ─────────────────────────────────────────────

router.put('/topics/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM topics WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Topic not found' });

  const { title, description, formula_sheet_url, syllabus_item_ids } = req.body;

  const newTitle       = title               !== undefined ? title.trim()         : existing.title;
  const newDesc        = description         !== undefined ? description           : existing.description;
  const newFormula     = formula_sheet_url   !== undefined ? formula_sheet_url     : existing.formula_sheet_url;
  const newSyllabus    = syllabus_item_ids   !== undefined
    ? JSON.stringify(Array.isArray(syllabus_item_ids) ? syllabus_item_ids : [])
    : existing.syllabus_item_ids;

  db.prepare(`
    UPDATE topics
    SET title = ?, description = ?, formula_sheet_url = ?, syllabus_item_ids = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newDesc, newFormula, newSyllabus, id);

  const topic = parseTopic(db.prepare('SELECT * FROM topics WHERE id = ?').get(id));
  return res.json({ topic });
});

// ─── PATCH /api/teacher/topics/:id/status ────────────────────────────────────

router.patch('/topics/:id/status', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const existing = db.prepare('SELECT id FROM topics WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Topic not found' });

  db.prepare(`UPDATE topics SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  const topic = parseTopic(db.prepare('SELECT * FROM topics WHERE id = ?').get(id));
  return res.json({ topic });
});

// ─── DELETE /api/teacher/topics/:id ──────────────────────────────────────────

router.delete('/topics/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM topics WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Topic not found' });

  db.prepare('DELETE FROM topics WHERE id = ?').run(id);
  return res.json({ message: 'Topic deleted' });
});

module.exports = router;
