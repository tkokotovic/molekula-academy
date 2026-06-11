const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const VALID_COURSE_TYPES = ['ib_sl', 'ib_hl', 'drzavna_matura', 'prijemni', 'medchem_1', 'medchem_2'];

// GET /api/teacher/syllabus-codes?course_type=ib_sl
// Returns all codes for a given course type, ordered by position.
router.get('/syllabus-codes', requireAuth, requireTeacher, (req, res) => {
  const { course_type } = req.query;
  if (course_type && !VALID_COURSE_TYPES.includes(course_type)) {
    return res.status(400).json({ error: `course_type must be one of: ${VALID_COURSE_TYPES.join(', ')}` });
  }
  const rows = course_type
    ? db.prepare('SELECT * FROM syllabus_codes WHERE course_type = ? ORDER BY position').all(course_type)
    : db.prepare('SELECT * FROM syllabus_codes ORDER BY course_type, position').all();
  res.json(rows);
});

// GET /api/teacher/lessons/:lessonId/syllabus-tags
// Returns the syllabus codes currently tagged to a lesson.
router.get('/lessons/:lessonId/syllabus-tags', requireAuth, requireTeacher, (req, res) => {
  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(req.params.lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const rows = db.prepare(`
    SELECT sc.*
    FROM lesson_syllabus_tags lst
    JOIN syllabus_codes sc ON sc.id = lst.syllabus_code_id
    WHERE lst.lesson_id = ?
    ORDER BY sc.course_type, sc.position
  `).all(req.params.lessonId);
  res.json(rows);
});

// PUT /api/teacher/lessons/:lessonId/syllabus-tags
// Replaces all tags for a lesson. Body: { syllabus_code_ids: [1, 2, 3] }
router.put('/lessons/:lessonId/syllabus-tags', requireAuth, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const { syllabus_code_ids } = req.body;
  if (!Array.isArray(syllabus_code_ids)) {
    return res.status(400).json({ error: 'syllabus_code_ids must be an array' });
  }

  const replace = db.transaction((ids) => {
    db.prepare('DELETE FROM lesson_syllabus_tags WHERE lesson_id = ?').run(lessonId);
    const insert = db.prepare(
      'INSERT OR IGNORE INTO lesson_syllabus_tags (lesson_id, syllabus_code_id) VALUES (?, ?)'
    );
    for (const id of ids) insert.run(lessonId, id);
  });

  replace(syllabus_code_ids);

  const updated = db.prepare(`
    SELECT sc.*
    FROM lesson_syllabus_tags lst
    JOIN syllabus_codes sc ON sc.id = lst.syllabus_code_id
    WHERE lst.lesson_id = ?
    ORDER BY sc.course_type, sc.position
  `).all(lessonId);
  res.json(updated);
});

module.exports = router;
