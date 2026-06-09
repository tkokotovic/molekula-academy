const express = require('express');
const db = require('../db');
const { requireTeacher } = require('../middleware/auth');

const router = express.Router();

// All routes require teacher role
router.use(requireTeacher);

// ─── Example mock exam — student management ───────────────────────────────────

// POST /api/teacher/mock-exams/:id/students — add student to example mock
router.post('/:id/students', (req, res) => {
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ? AND type = 'mock_exam'").get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Mock exam not found' });
  if (!quiz.is_example) return res.status(400).json({ error: 'Only example mock exams support student lists.' });

  const { student_id } = req.body;
  if (!student_id) return res.status(400).json({ error: 'student_id is required' });

  const student = db.prepare("SELECT * FROM users WHERE id = ? AND role = 'student'").get(student_id);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  try {
    db.prepare(`
      INSERT INTO mock_exam_students (quiz_id, student_id, granted_by)
      VALUES (?, ?, ?)
    `).run(quiz.id, student_id, req.user.id);
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Student already has access to this mock exam.' });
    }
    return res.status(400).json({ error: err.message });
  }

  return res.status(201).json({ message: 'Student added to mock exam.' });
});

// DELETE /api/teacher/mock-exams/:id/students/:studentId — remove student
router.delete('/:id/students/:studentId', (req, res) => {
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ? AND type = 'mock_exam'").get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Mock exam not found' });

  const result = db.prepare(
    'DELETE FROM mock_exam_students WHERE quiz_id = ? AND student_id = ?'
  ).run(quiz.id, req.params.studentId);

  if (result.changes === 0) return res.status(404).json({ error: 'Student not found on this mock exam.' });

  return res.json({ message: 'Student removed from mock exam.' });
});

// GET /api/teacher/mock-exams/:id/students — list students
router.get('/:id/students', (req, res) => {
  const quiz = db.prepare("SELECT * FROM quizzes WHERE id = ? AND type = 'mock_exam'").get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Mock exam not found' });

  const students = db.prepare(`
    SELECT u.id, u.name, u.email, u.subscription_tier, mes.granted_at
      FROM mock_exam_students mes
      JOIN users u ON mes.student_id = u.id
     WHERE mes.quiz_id = ?
     ORDER BY mes.granted_at
  `).all(quiz.id);

  return res.json({ students });
});

// ─── Teacher overall feedback ─────────────────────────────────────────────────

// PATCH /api/teacher/mock-exams/:examId/attempts/:id/feedback
// (also exposed via /api/teacher/attempts/:id/feedback through grading.js)

module.exports = router;
