const express = require('express');
const db = require('../db');
const { requireTeacher, requireOwner } = require('../middleware/auth');

const router = express.Router();

// Health check for teacher access
router.get('/ping', requireTeacher, (req, res) => {
  res.json({ status: 'ok', user: req.user });
});

// ─── Student roster ───────────────────────────────────────────────────────────

// GET /api/admin/students — list all students with aggregate stats
router.get('/students', requireTeacher, (req, res) => {
  const students = db.prepare(`
    SELECT
      u.id, u.name, u.email, u.subscription_tier, u.created_at,
      MAX(lp.completed_at) AS last_active,
      COUNT(DISTINCT CASE WHEN lp.status = 'completed' THEN lp.lesson_id END) AS lessons_completed,
      COUNT(DISTINCT qa.id) AS quizzes_taken,
      ROUND(AVG(CASE WHEN qa.score IS NOT NULL THEN CAST(qa.score AS REAL) / qa.max_score * 100 END), 1) AS avg_score,
      COUNT(DISTINCT c.id) AS certificates_earned
    FROM users u
    LEFT JOIN lesson_progress lp ON lp.student_id = u.id
    LEFT JOIN quiz_attempts qa ON qa.student_id = u.id AND qa.submitted_at IS NOT NULL
    LEFT JOIN certificates c ON c.student_id = u.id
    WHERE u.role = 'student'
    GROUP BY u.id
    ORDER BY u.created_at DESC
  `).all();

  return res.json({ students });
});

// GET /api/admin/students/:id — full profile for one student
router.get('/students/:id', requireTeacher, (req, res) => {
  const student = db.prepare(
    "SELECT id, name, email, subscription_tier, created_at FROM users WHERE id = ? AND role = 'student'"
  ).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student nije pronađen.' });

  // Course progress
  const courses = db.prepare(`
    SELECT
      co.id, co.title,
      COUNT(DISTINCT l.id) AS total_lessons,
      COUNT(DISTINCT CASE WHEN lp.status = 'completed' THEN lp.lesson_id END) AS completed_lessons,
      SUM(COALESCE(lp.time_spent_seconds, 0)) AS time_spent_seconds
    FROM courses co
    JOIN topics t ON t.course_id = co.id
    JOIN lessons l ON l.topic_id = t.id
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ?
    WHERE co.status = 'published'
    GROUP BY co.id
  `).all(req.params.id);

  // Quiz history (last 20)
  const quizHistory = db.prepare(`
    SELECT qa.id, qa.score, qa.max_score, qa.submitted_at, q.title AS quiz_title
    FROM quiz_attempts qa
    JOIN quizzes q ON q.id = qa.quiz_id
    WHERE qa.student_id = ? AND qa.submitted_at IS NOT NULL
    ORDER BY qa.submitted_at DESC
    LIMIT 20
  `).all(req.params.id);

  // Certificates
  const certificates = db.prepare(`
    SELECT c.id, c.issued_at, t.title AS topic_title
    FROM certificates c
    JOIN topics t ON t.id = c.topic_id
    WHERE c.student_id = ?
    ORDER BY c.issued_at DESC
  `).all(req.params.id);

  return res.json({ student, courses, quizHistory, certificates });
});

// ─── Revenue snapshot (stub — no Stripe yet) ─────────────────────────────────

// GET /api/admin/revenue — counts by plan (real MRR needs Stripe)
router.get('/revenue', requireTeacher, (req, res) => {
  const counts = db.prepare(`
    SELECT subscription_tier, COUNT(*) AS count
    FROM users WHERE role = 'student'
    GROUP BY subscription_tier
  `).all();

  const basic   = counts.find(r => r.subscription_tier === 'basic')?.count   || 0;
  const premium = counts.find(r => r.subscription_tier === 'premium')?.count || 0;

  return res.json({
    basic_count:   basic,
    premium_count: premium,
    mrr_estimate:  basic * 19 + premium * 39,
    note: 'MRR estimate based on plan prices. Real billing data available after Stripe integration.',
  });
});

// ─── Set subscription tier ────────────────────────────────────────────────────

router.patch('/users/:id/subscription', requireOwner, (req, res) => {
  const { subscription_tier } = req.body;

  if (!['basic', 'premium'].includes(subscription_tier)) {
    return res.status(400).json({ error: "subscription_tier mora biti 'basic' ili 'premium'." });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Korisnik nije pronađen.' });

  db.prepare('UPDATE users SET subscription_tier = ? WHERE id = ?')
    .run(subscription_tier, user.id);

  const updated = db.prepare(
    'SELECT id, name, email, role, subscription_tier, created_at FROM users WHERE id = ?'
  ).get(user.id);

  return res.json({ user: updated });
});

module.exports = router;
