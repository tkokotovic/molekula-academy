const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_TYPES = [
  'text', 'equation', 'image', 'animation', 'pdf',
  'video', 'molecule3d', 'table', 'link', 'flashcard', 'summary',
];

function parseBlock(row) {
  if (!row) return null;
  return {
    ...row,
    content: JSON.parse(row.content || '{}'),
  };
}

function nextPosition(lessonId) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max_pos FROM lesson_blocks WHERE lesson_id = ?'
  ).get(lessonId);
  return row.max_pos + 1;
}

// ─── POST /api/teacher/lessons/:lessonId/blocks ───────────────────────────────

router.post('/lessons/:lessonId/blocks', requireAuth, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const { type, content } = req.body;

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const contentJson = JSON.stringify(content || {});
  const position = nextPosition(lessonId);

  const result = db.prepare(`
    INSERT INTO lesson_blocks (lesson_id, type, content, position)
    VALUES (?, ?, ?, ?)
  `).run(lessonId, type, contentJson, position);

  const block = parseBlock(db.prepare('SELECT * FROM lesson_blocks WHERE id = ?').get(result.lastInsertRowid));
  return res.status(201).json({ block });
});

// ─── GET /api/teacher/lessons/:lessonId/blocks ───────────────────────────────

router.get('/lessons/:lessonId/blocks', requireAuth, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const rows = db.prepare(`
    SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY position, id
  `).all(lessonId);
  return res.json({ blocks: rows.map(parseBlock) });
});

// ─── PATCH /api/teacher/lessons/:lessonId/blocks/reorder ─────────────────────

router.patch('/lessons/:lessonId/blocks/reorder', requireAuth, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array of block IDs' });
  }

  const update = db.prepare(
    'UPDATE lesson_blocks SET position = ? WHERE id = ? AND lesson_id = ?'
  );

  const reorderAll = db.transaction((orderedIds) => {
    orderedIds.forEach((id, index) => {
      update.run(index, id, lessonId);
    });
  });

  reorderAll(ids);

  const rows = db.prepare(
    'SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY position, id'
  ).all(lessonId);
  return res.json({ blocks: rows.map(parseBlock) });
});

// ─── PATCH /api/teacher/blocks/:id — update content ──────────────────────────

router.patch('/blocks/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  const existing = db.prepare('SELECT * FROM lesson_blocks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Block not found' });

  const newContent = content !== undefined ? JSON.stringify(content) : existing.content;

  db.prepare('UPDATE lesson_blocks SET content = ? WHERE id = ?').run(newContent, id);

  const block = parseBlock(db.prepare('SELECT * FROM lesson_blocks WHERE id = ?').get(id));
  return res.json({ block });
});

// ─── DELETE /api/teacher/blocks/:id ──────────────────────────────────────────

router.delete('/blocks/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM lesson_blocks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Block not found' });

  db.prepare('DELETE FROM lesson_blocks WHERE id = ?').run(id);
  return res.json({ message: 'Block deleted' });
});

module.exports = router;
