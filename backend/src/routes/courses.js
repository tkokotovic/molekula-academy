const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['draft', 'published', 'archived'];

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function uniqueSlug(base) {
  const exists = db.prepare('SELECT id FROM courses WHERE slug = ?').get(base);
  if (!exists) return base;
  return `${base}-${Date.now()}`;
}

function parseCourse(row) {
  if (!row) return null;
  return {
    ...row,
    target_audience: JSON.parse(row.target_audience || '[]'),
  };
}

// ─── Public routes ────────────────────────────────────────────────────────────

// GET /api/courses — published only
router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT id, title, description, slug, cover_image_url, target_audience,
           symbol, status, position, created_at, updated_at
    FROM courses WHERE status = 'published' AND is_library = 0
    ORDER BY position, created_at
  `).all();
  return res.json({ courses: rows.map(parseCourse) });
});

// ─── Teacher-only routes (mounted at /api/teacher/courses) ────────────────────

const teacher = express.Router();

// POST /api/teacher/courses
teacher.post('/', requireAuth, requireTeacher, (req, res) => {
  const { title, description, cover_image_url, target_audience, symbol } = req.body;

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const base = slugify(title);
  const slug = uniqueSlug(base);
  const audienceJson = JSON.stringify(Array.isArray(target_audience) ? target_audience : []);

  const result = db.prepare(`
    INSERT INTO courses (title, description, slug, cover_image_url, target_audience, symbol)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(title.trim(), description || null, slug, cover_image_url || null, audienceJson, symbol || null);

  const course = parseCourse(db.prepare('SELECT * FROM courses WHERE id = ?').get(result.lastInsertRowid));
  return res.status(201).json({ course });
});

// GET /api/teacher/courses — all (draft + published + archived) with counts
teacher.get('/', requireAuth, requireTeacher, (req, res) => {
  const rows = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM topics t WHERE t.course_id = c.id) AS topic_count,
      (SELECT COUNT(*) FROM lessons l JOIN topics t ON l.topic_id = t.id WHERE t.course_id = c.id) AS lesson_count,
      (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id) AS enrolled_count
    FROM courses c
    WHERE c.is_library = 0
    ORDER BY c.position, c.created_at
  `).all();
  return res.json({ courses: rows.map(parseCourse) });
});

// PUT /api/teacher/courses/:id
teacher.put('/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  const { title, description, cover_image_url, target_audience, symbol } = req.body;

  const newTitle    = title           !== undefined ? title.trim()   : existing.title;
  const newDesc     = description     !== undefined ? description     : existing.description;
  const newCover    = cover_image_url !== undefined ? cover_image_url : existing.cover_image_url;
  const newSymbol   = symbol          !== undefined ? symbol          : existing.symbol;
  const newAudience = target_audience !== undefined
    ? JSON.stringify(Array.isArray(target_audience) ? target_audience : [])
    : existing.target_audience;

  db.prepare(`
    UPDATE courses
    SET title = ?, description = ?, cover_image_url = ?, target_audience = ?, symbol = ?,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newDesc, newCover, newAudience, newSymbol, id);

  const course = parseCourse(db.prepare('SELECT * FROM courses WHERE id = ?').get(id));
  return res.json({ course });
});

// PATCH /api/teacher/courses/:id/status
teacher.patch('/:id/status', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  db.prepare(`UPDATE courses SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  const course = parseCourse(db.prepare('SELECT * FROM courses WHERE id = ?').get(id));
  return res.json({ course });
});

// DELETE /api/teacher/courses/:id
teacher.delete('/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM courses WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Course not found' });

  db.prepare('DELETE FROM courses WHERE id = ?').run(id);
  return res.json({ message: 'Course deleted' });
});

module.exports = { publicRouter: router, teacherRouter: teacher };
