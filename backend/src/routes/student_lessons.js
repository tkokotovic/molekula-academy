const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

// Which plans can see a block of a given visibility.
// Mirrors `planSees` in frontend/src/pages/admin/LessonEditorPage.jsx.
//   public  → everyone
//   basic   → basic + premium
//   premium → premium only
function planSees(visibility, tier) {
  if (visibility === 'public') return true;
  if (visibility === 'basic')  return tier === 'basic' || tier === 'premium';
  return tier === 'premium';
}

function parseBlock(row) {
  return { ...row, content: JSON.parse(row.content || '{}') };
}

// Student-safe lesson serializer — never exposes teacher_notes.
function parseStudentLesson(row) {
  if (!row) return null;
  const { teacher_notes, ...safe } = row;
  return {
    ...safe,
    learning_objectives: JSON.parse(row.learning_objectives || '[]'),
    tags:                JSON.parse(row.tags                || '[]'),
    prerequisites:       JSON.parse(row.prerequisites       || '[]'),
    linked_quiz_ids:     JSON.parse(row.linked_quiz_ids     || '[]'),
  };
}

function parseStudentTopic(row) {
  if (!row) return null;
  return {
    ...row,
    syllabus_item_ids: JSON.parse(row.syllabus_item_ids || '[]'),
    linked_quiz_ids:   JSON.parse(row.linked_quiz_ids   || '[]'),
  };
}

function parseStudentCourse(row) {
  if (!row) return null;
  return { ...row, target_audience: JSON.parse(row.target_audience || '[]') };
}

// ─── GET /api/student/courses/:id ─────────────────────────────────────────────
// Single published course (drafts/archived/library courses are hidden).
router.get('/courses/:id', requireAuth, (req, res) => {
  const course = db.prepare(`
    SELECT id, title, description, slug, cover_image_url, target_audience,
           status, position, created_at, updated_at
    FROM courses
    WHERE id = ? AND status = 'published' AND is_library = 0
  `).get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });
  return res.json({ course: parseStudentCourse(course) });
});

// ─── GET /api/student/courses/:id/topics ──────────────────────────────────────
// Published topics of a published course, in order.
router.get('/courses/:id/topics', requireAuth, (req, res) => {
  const course = db.prepare(
    `SELECT id FROM courses WHERE id = ? AND status = 'published' AND is_library = 0`
  ).get(req.params.id);
  if (!course) return res.status(404).json({ error: 'Course not found' });

  const rows = db.prepare(`
    SELECT * FROM topics
    WHERE course_id = ? AND status = 'published'
    ORDER BY position, created_at
  `).all(req.params.id);
  return res.json({ topics: rows.map(parseStudentTopic) });
});

// ─── GET /api/student/topics/:topicId/lessons ─────────────────────────────────
// Published lessons in a topic. teacher_notes never serialized.
router.get('/topics/:topicId/lessons', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM lessons
    WHERE topic_id = ? AND status = 'published'
    ORDER BY position, created_at
  `).all(req.params.topicId);
  return res.json({ lessons: rows.map(parseStudentLesson) });
});

// ─── GET /api/student/lessons/:id ─────────────────────────────────────────────
// Single published lesson. teacher_notes never serialized.
router.get('/lessons/:id', requireAuth, (req, res) => {
  const row = db.prepare(
    `SELECT * FROM lessons WHERE id = ? AND status = 'published'`
  ).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Lesson not found' });
  return res.json({ lesson: parseStudentLesson(row) });
});

// ─── GET /api/student/lessons/:id/blocks ──────────────────────────────────────
// Returns the lesson's blocks filtered by the logged-in user's plan. Blocks the
// user's plan cannot see are dropped entirely (never sent to the client).
router.get('/lessons/:id/blocks', requireAuth, (req, res) => {
  const { id } = req.params;

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(id);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  // Teachers/owners see everything; students are gated by their subscription tier.
  // Look the tier up fresh so a plan change takes effect without re-login.
  let tier = 'premium';
  if (req.user.role !== 'teacher' && req.user.role !== 'owner') {
    const u = db.prepare('SELECT subscription_tier FROM users WHERE id = ?').get(req.user.id);
    tier = (u && u.subscription_tier) || 'basic';
  }

  const rows = db.prepare(
    'SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY position, id'
  ).all(id);

  const visible = rows
    .filter(b => planSees(b.visibility || 'public', tier))
    .map(parseBlock);

  return res.json({ blocks: visible });
});

module.exports = router;
