const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const { notifyTeacherNewMessage, notifyStudentTeacherReplied } = require('../services/email');

const student = express.Router();
const teacher = express.Router();

// ─── Student: GET own thread ──────────────────────────────────────────────────

student.get('/messages', requireAuth, (req, res) => {
  const studentId = req.user.id;

  // Mark all teacher messages as read when student fetches
  db.prepare(`
    UPDATE messages SET read_at = datetime('now')
    WHERE student_id = ? AND sender_role = 'teacher' AND read_at IS NULL
  `).run(studentId);

  const messages = db.prepare(`
    SELECT * FROM messages WHERE student_id = ? ORDER BY created_at ASC
  `).all(studentId);

  return res.json({ messages });
});

// ─── Student: POST message ────────────────────────────────────────────────────

student.post('/messages', requireAuth, (req, res) => {
  const studentId = req.user.id;
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const result = db.prepare(`
    INSERT INTO messages (student_id, sender_role, text) VALUES (?, 'student', ?)
  `).run(studentId, text.trim());

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  // Step 58: notify teacher
  const student = db.prepare('SELECT name, email FROM users WHERE id = ?').get(studentId);
  notifyTeacherNewMessage({ studentName: student.name, studentEmail: student.email, messageText: text.trim() });

  return res.status(201).json({ message });
});

// ─── Teacher: GET all threads ─────────────────────────────────────────────────

teacher.get('/messages', requireAuth, requireTeacher, (req, res) => {
  const threads = db.prepare(`
    SELECT
      u.id   AS student_id,
      u.name,
      u.email,
      u.subscription_tier,
      m.text          AS last_message,
      m.sender_role   AS last_sender_role,
      m.created_at    AS last_message_at,
      (SELECT COUNT(*) FROM messages
       WHERE student_id = u.id AND sender_role = 'student' AND read_at IS NULL
      ) AS unread_count
    FROM users u
    JOIN messages m ON m.id = (
      SELECT id FROM messages WHERE student_id = u.id ORDER BY created_at DESC LIMIT 1
    )
    WHERE u.role = 'student'
    ORDER BY m.created_at DESC
  `).all();

  return res.json({ threads });
});

// ─── Teacher: GET thread with one student ─────────────────────────────────────

teacher.get('/messages/:studentId', requireAuth, requireTeacher, (req, res) => {
  const { studentId } = req.params;

  const studentUser = db.prepare(
    `SELECT id, name, email, subscription_tier FROM users WHERE id = ? AND role = 'student'`
  ).get(studentId);
  if (!studentUser) return res.status(404).json({ error: 'Student not found' });

  // Mark student messages as read
  db.prepare(`
    UPDATE messages SET read_at = datetime('now')
    WHERE student_id = ? AND sender_role = 'student' AND read_at IS NULL
  `).run(studentId);

  const messages = db.prepare(`
    SELECT * FROM messages WHERE student_id = ? ORDER BY created_at ASC
  `).all(studentId);

  return res.json({ student: studentUser, messages });
});

// ─── Teacher: POST reply ──────────────────────────────────────────────────────

teacher.post('/messages/:studentId', requireAuth, requireTeacher, (req, res) => {
  const { studentId } = req.params;
  const { text } = req.body;

  const studentUser = db.prepare(
    `SELECT id, name, email FROM users WHERE id = ? AND role = 'student'`
  ).get(studentId);
  if (!studentUser) return res.status(404).json({ error: 'Student not found' });

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'text is required' });
  }

  const result = db.prepare(`
    INSERT INTO messages (student_id, sender_role, text) VALUES (?, 'teacher', ?)
  `).run(studentId, text.trim());

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  // Step 59c: notify student of teacher reply
  notifyStudentTeacherReplied({ studentName: studentUser.name, studentEmail: studentUser.email, replyText: text.trim() });

  return res.status(201).json({ message });
});

module.exports = { studentRouter: student, teacherRouter: teacher };
