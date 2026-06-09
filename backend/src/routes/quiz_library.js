/**
 * Quiz Library routes (Step 39b)
 *
 * Teacher:
 *   PATCH  /api/teacher/quizzes/:id/library          — save / unsave as template
 *   GET    /api/teacher/quiz-library                  — list all templates
 *   POST   /api/teacher/quizzes/:id/clone             — duplicate with optional overrides
 *   POST   /api/teacher/quizzes/:id/assignments       — assign to specific students
 *   GET    /api/teacher/quizzes/:id/assignments       — list assigned students
 *   DELETE /api/teacher/quizzes/:id/assignments/:sid  — remove one assignment
 *
 * Student:
 *   GET    /api/student/assigned-quizzes              — quizzes assigned to this student
 */

const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const teacherRouter = express.Router();   // mounted at /api/teacher/quizzes
const libraryRouter = express.Router();   // mounted at /api/teacher
const studentRouter = express.Router();   // mounted at /api/student

// ─── Save / unsave ────────────────────────────────────────────────────────────

// PATCH /api/teacher/quizzes/:id/library
teacherRouter.patch('/:id/library', requireTeacher, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const save = req.body.save ? 1 : 0;
  db.prepare('UPDATE quizzes SET is_library_template = ? WHERE id = ?').run(save, quiz.id);

  const updated = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quiz.id);
  return res.json(updated);
});

// ─── List library ─────────────────────────────────────────────────────────────

// GET /api/teacher/quiz-library  (mounted on libraryRouter at /api/teacher)
libraryRouter.get('/quiz-library', requireTeacher, (req, res) => {
  const templates = db.prepare(`
    SELECT q.*,
           (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS question_count,
           t.title AS topic_title
      FROM quizzes q
      LEFT JOIN topics t ON q.topic_id = t.id
     WHERE q.is_library_template = 1
     ORDER BY q.updated_at DESC
  `).all();
  return res.json(templates);
});

// ─── Clone ────────────────────────────────────────────────────────────────────

// POST /api/teacher/quizzes/:id/clone
teacherRouter.post('/:id/clone', requireTeacher, (req, res) => {
  const original = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!original) return res.status(404).json({ error: 'Quiz not found' });

  const {
    title,
    time_limit_minutes,
    max_attempts,
    due_date,
    pass_score,
  } = req.body;

  const newTitle = title || `${original.title} (kopija)`;

  const { lastInsertRowid: newId } = db.prepare(`
    INSERT INTO quizzes
      (title, description, topic_id, type, status, time_limit_minutes, max_attempts,
       shuffle_questions, pass_score, scheduled_start, scheduled_end, is_example,
       grace_period_seconds, due_date, is_library_template, created_by)
    VALUES (?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
  `).run(
    newTitle,
    original.description,
    original.topic_id,
    original.type,
    time_limit_minutes !== undefined ? time_limit_minutes : original.time_limit_minutes,
    max_attempts !== undefined ? max_attempts : original.max_attempts,
    original.shuffle_questions,
    pass_score !== undefined ? pass_score : original.pass_score,
    original.scheduled_start,
    original.scheduled_end,
    original.is_example,
    original.grace_period_seconds,
    due_date !== undefined ? due_date : original.due_date,
    req.user.id,
  );

  // Copy all quiz questions
  const qs = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY position').all(original.id);
  const insertQ = db.prepare(
    'INSERT INTO quiz_questions (quiz_id, question_id, position, points_override) VALUES (?, ?, ?, ?)'
  );
  for (const q of qs) {
    insertQ.run(newId, q.question_id, q.position, q.points_override);
  }

  const created = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(newId);
  return res.status(201).json(created);
});

// ─── Assign students ──────────────────────────────────────────────────────────

// POST /api/teacher/quizzes/:id/assignments
teacherRouter.post('/:id/assignments', requireTeacher, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const { student_ids } = req.body;
  if (!Array.isArray(student_ids) || student_ids.length === 0) {
    return res.status(400).json({ error: 'student_ids must be a non-empty array' });
  }

  const insert = db.prepare(`
    INSERT OR IGNORE INTO quiz_assignments (quiz_id, student_id, assigned_by)
    VALUES (?, ?, ?)
  `);

  let assigned = 0;
  const insertMany = db.transaction(() => {
    for (const sid of student_ids) {
      const result = insert.run(quiz.id, sid, req.user.id);
      assigned += result.changes;
    }
  });
  insertMany();

  return res.json({ assigned, total: student_ids.length });
});

// GET /api/teacher/quizzes/:id/assignments
teacherRouter.get('/:id/assignments', requireTeacher, (req, res) => {
  const rows = db.prepare(`
    SELECT qa.id, qa.quiz_id, qa.student_id, qa.assigned_at,
           u.name AS student_name, u.email AS student_email
      FROM quiz_assignments qa
      JOIN users u ON qa.student_id = u.id
     WHERE qa.quiz_id = ?
     ORDER BY qa.assigned_at DESC
  `).all(req.params.id);
  return res.json(rows);
});

// DELETE /api/teacher/quizzes/:id/assignments/:studentId
teacherRouter.delete('/:id/assignments/:studentId', requireTeacher, (req, res) => {
  const result = db.prepare(
    'DELETE FROM quiz_assignments WHERE quiz_id = ? AND student_id = ?'
  ).run(req.params.id, req.params.studentId);

  if (result.changes === 0) return res.status(404).json({ error: 'Assignment not found' });
  return res.json({ removed: true });
});

// ─── Student: list assigned quizzes ──────────────────────────────────────────

// GET /api/student/assigned-quizzes
studentRouter.get('/assigned-quizzes', requireAuth, (req, res) => {
  const quizzes = db.prepare(`
    SELECT q.*, qa.assigned_at,
           t.title AS topic_title
      FROM quiz_assignments qa
      JOIN quizzes q ON qa.quiz_id = q.id
      LEFT JOIN topics t ON q.topic_id = t.id
     WHERE qa.student_id = ?
     ORDER BY qa.assigned_at DESC
  `).all(req.user.id);
  return res.json(quizzes);
});

module.exports = { teacherRouter, libraryRouter, studentRouter };
