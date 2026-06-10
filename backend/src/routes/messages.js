const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const { notifyTeacherNewMessage, notifyStudentTeacherReplied } = require('../services/email');

const student = express.Router();
const teacher = express.Router();

// ─── Multer for message attachments ──────────────────────────────────────────

const MSG_ALLOWED = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
]);

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

function msgStorage() {
  if (process.env.NODE_ENV === 'test') return multer.memoryStorage();
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

const upload = multer({
  storage: msgStorage(),
  fileFilter: (req, file, cb) => {
    cb(null, MSG_ALLOWED.has(file.mimetype));
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'File too large or unsupported type (images + PDF up to 20 MB)' });
    next();
  });
}

function fileInfoFromReq(req) {
  if (!req.file) return {};
  const filename = req.file.filename || `${randomUUID()}${path.extname(req.file.originalname).toLowerCase()}`;
  return {
    file_url: `/uploads/${filename}`,
    file_name: req.file.originalname,
    file_size: req.file.size || (req.file.buffer ? req.file.buffer.length : 0),
  };
}

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

student.post('/messages', requireAuth, handleUpload, (req, res) => {
  const studentId = req.user.id;
  const text = (req.body.text || '').trim();
  const { file_url, file_name, file_size } = fileInfoFromReq(req);

  if (!text && !file_url) {
    return res.status(400).json({ error: 'text or file is required' });
  }

  const result = db.prepare(`
    INSERT INTO messages (student_id, sender_role, text, file_url, file_name, file_size, message_type)
    VALUES (?, 'student', ?, ?, ?, ?, 'message')
  `).run(studentId, text || null, file_url || null, file_name || null, file_size || null);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  const studentUser = db.prepare('SELECT name, email FROM users WHERE id = ?').get(studentId);
  notifyTeacherNewMessage({ studentName: studentUser.name, studentEmail: studentUser.email, messageText: text || '[prilog]' });

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
      m.file_name     AS last_file_name,
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

teacher.post('/messages/:studentId', requireAuth, requireTeacher, handleUpload, (req, res) => {
  const { studentId } = req.params;
  const text = (req.body.text || '').trim();
  const { file_url, file_name, file_size } = fileInfoFromReq(req);

  const studentUser = db.prepare(
    `SELECT id, name, email FROM users WHERE id = ? AND role = 'student'`
  ).get(studentId);
  if (!studentUser) return res.status(404).json({ error: 'Student not found' });

  if (!text && !file_url) {
    return res.status(400).json({ error: 'text or file is required' });
  }

  const result = db.prepare(`
    INSERT INTO messages (student_id, sender_role, text, file_url, file_name, file_size, message_type)
    VALUES (?, 'teacher', ?, ?, ?, ?, 'message')
  `).run(studentId, text || null, file_url || null, file_name || null, file_size || null);

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  notifyStudentTeacherReplied({ studentName: studentUser.name, studentEmail: studentUser.email, replyText: text || '[prilog]' });

  return res.status(201).json({ message });
});

module.exports = { studentRouter: student, teacherRouter: teacher };
