const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_STATUSES   = ['draft', 'published', 'archived'];
const VALID_DIFFICULTY = ['easy', 'medium', 'hard'];

function parseLesson(row) {
  if (!row) return null;
  return {
    ...row,
    learning_objectives: JSON.parse(row.learning_objectives || '[]'),
    tags:                JSON.parse(row.tags                || '[]'),
    prerequisites:       JSON.parse(row.prerequisites       || '[]'),
    linked_quiz_ids:     JSON.parse(row.linked_quiz_ids     || '[]'),
  };
}

// ─── POST /api/teacher/topics/:topicId/lessons ────────────────────────────────

router.post('/topics/:topicId/lessons', requireAuth, requireTeacher, (req, res) => {
  const { topicId } = req.params;
  const {
    title, summary, learning_objectives, difficulty,
    duration_minutes, tags, prerequisites, teacher_notes,
  } = req.body;

  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topicId);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const diff = difficulty || 'medium';
  if (!VALID_DIFFICULTY.includes(diff)) {
    return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTY.join(', ')}` });
  }

  const objectivesJson  = JSON.stringify(Array.isArray(learning_objectives) ? learning_objectives : []);
  const tagsJson        = JSON.stringify(Array.isArray(tags)                ? tags                : []);
  const prereqJson      = JSON.stringify(Array.isArray(prerequisites)       ? prerequisites       : []);

  const result = db.prepare(`
    INSERT INTO lessons
      (topic_id, title, summary, learning_objectives, difficulty, duration_minutes,
       tags, prerequisites, teacher_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    topicId,
    title.trim(),
    summary          || null,
    objectivesJson,
    diff,
    duration_minutes || null,
    tagsJson,
    prereqJson,
    teacher_notes    || null,
  );

  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid));
  return res.status(201).json({ lesson });
});

// ─── GET /api/teacher/topics/:topicId/lessons ────────────────────────────────

router.get('/topics/:topicId/lessons', requireAuth, requireTeacher, (req, res) => {
  const { topicId } = req.params;
  const rows = db.prepare(`
    SELECT * FROM lessons WHERE topic_id = ? ORDER BY position, created_at
  `).all(topicId);
  return res.json({ lessons: rows.map(parseLesson) });
});

// ─── GET /api/teacher/lessons/:id ────────────────────────────────────────────

router.get('/lessons/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(id));
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  return res.json({ lesson });
});

// ─── PUT /api/teacher/lessons/:id ────────────────────────────────────────────

router.put('/lessons/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });

  const {
    title, summary, learning_objectives, difficulty,
    duration_minutes, tags, prerequisites, teacher_notes, publish_at,
  } = req.body;

  if (difficulty !== undefined && !VALID_DIFFICULTY.includes(difficulty)) {
    return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTY.join(', ')}` });
  }

  const newTitle       = title               !== undefined ? title.trim()       : existing.title;
  const newSummary     = summary             !== undefined ? summary             : existing.summary;
  const newObjectives  = learning_objectives !== undefined
    ? JSON.stringify(Array.isArray(learning_objectives) ? learning_objectives : [])
    : existing.learning_objectives;
  const newDifficulty  = difficulty          !== undefined ? difficulty          : existing.difficulty;
  const newDuration    = duration_minutes    !== undefined ? duration_minutes    : existing.duration_minutes;
  const newTags        = tags                !== undefined
    ? JSON.stringify(Array.isArray(tags)   ? tags         : [])
    : existing.tags;
  const newPrereqs     = prerequisites       !== undefined
    ? JSON.stringify(Array.isArray(prerequisites) ? prerequisites : [])
    : existing.prerequisites;
  const newNotes       = teacher_notes       !== undefined ? teacher_notes       : existing.teacher_notes;
  const newPublishAt   = publish_at          !== undefined ? publish_at          : existing.publish_at;

  db.prepare(`
    UPDATE lessons
    SET title = ?, summary = ?, learning_objectives = ?, difficulty = ?,
        duration_minutes = ?, tags = ?, prerequisites = ?, teacher_notes = ?,
        publish_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newSummary, newObjectives, newDifficulty, newDuration,
         newTags, newPrereqs, newNotes, newPublishAt, id);

  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(id));
  return res.json({ lesson });
});

// ─── PATCH /api/teacher/lessons/:id/status ───────────────────────────────────

router.patch('/lessons/:id/status', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });

  db.prepare(`UPDATE lessons SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, id);
  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(id));
  return res.json({ lesson });
});

// ─── DELETE /api/teacher/lessons/:id ─────────────────────────────────────────

router.delete('/lessons/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });

  db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
  return res.json({ message: 'Lesson deleted' });
});

module.exports = router;
