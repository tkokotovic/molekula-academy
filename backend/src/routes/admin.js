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
      u.exam_date,
      MAX(lp.completed_at) AS last_active,
      COUNT(DISTINCT CASE WHEN lp.status = 'completed' THEN lp.lesson_id END) AS lessons_completed,
      COUNT(DISTINCT qa.id) AS quizzes_taken,
      ROUND(AVG(CASE WHEN qa.score IS NOT NULL THEN CAST(qa.score AS REAL) / qa.max_score * 100 END), 1) AS avg_score,
      COUNT(DISTINCT c.id) AS certificates_earned,
      (SELECT co.title FROM enrollments e JOIN courses co ON co.id = e.course_id WHERE e.student_id = u.id ORDER BY e.enrolled_at ASC LIMIT 1) AS enrolled_course,
      (SELECT COUNT(*) FROM enrollments e WHERE e.student_id = u.id) AS enrollment_count,
      (SELECT e.enrolled_at FROM enrollments e WHERE e.student_id = u.id ORDER BY e.enrolled_at ASC LIMIT 1) AS enrolled_since,
      (
        SELECT COUNT(*) FROM messages m
        WHERE m.student_id = u.id AND m.sender_role = 'student' AND m.read_at IS NULL
      ) AS unread_messages
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
    "SELECT id, name, email, subscription_tier, created_at, exam_date, admin_notes FROM users WHERE id = ? AND role = 'student'"
  ).get(req.params.id);
  if (!student) return res.status(404).json({ error: 'Student nije pronađen.' });

  // Course progress (only enrolled courses)
  const courses = db.prepare(`
    SELECT
      co.id, co.title,
      en.enrolled_at,
      COUNT(DISTINCT l.id) AS total_lessons,
      COUNT(DISTINCT CASE WHEN lp.status = 'completed' THEN lp.lesson_id END) AS completed_lessons,
      SUM(COALESCE(lp.time_spent_seconds, 0)) AS time_spent_seconds
    FROM enrollments en
    JOIN courses co ON co.id = en.course_id
    JOIN topics t ON t.course_id = co.id
    JOIN lessons l ON l.topic_id = t.id
    LEFT JOIN lesson_progress lp ON lp.lesson_id = l.id AND lp.student_id = ?
    WHERE en.student_id = ? AND co.status = 'published'
    GROUP BY co.id
    ORDER BY en.enrolled_at ASC
  `).all(req.params.id, req.params.id);

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

// ─── Dashboard summary ────────────────────────────────────────────────────────

// GET /api/admin/dashboard — action strips + quick stats
router.get('/dashboard', requireTeacher, (req, res) => {
  // Quick stats
  const counts = db.prepare(`
    SELECT subscription_tier, COUNT(*) AS count
    FROM users WHERE role = 'student'
    GROUP BY subscription_tier
  `).all();
  const basicCount   = counts.find(r => r.subscription_tier === 'basic')?.count   || 0;
  const premiumCount = counts.find(r => r.subscription_tier === 'premium')?.count || 0;

  // New students this week
  const newStudents = db.prepare(`
    SELECT id, name, email, subscription_tier, created_at, exam_date
    FROM users
    WHERE role = 'student'
      AND created_at >= datetime('now', '-7 days')
    ORDER BY created_at DESC
  `).all();

  // Upcoming exams (next 90 days, has exam_date set)
  const upcomingExams = db.prepare(`
    SELECT id, name, email, subscription_tier, exam_date
    FROM users
    WHERE role = 'student'
      AND exam_date IS NOT NULL
      AND exam_date >= date('now')
      AND exam_date <= date('now', '+90 days')
    ORDER BY exam_date ASC
    LIMIT 20
  `).all();

  // Unread messages (teacher hasn't replied — last message was from student)
  const openMessages = db.prepare(`
    SELECT
      u.id AS student_id, u.name, u.email,
      COUNT(m.id) AS unread_count,
      MAX(m.created_at) AS last_message_at
    FROM messages m
    JOIN users u ON u.id = m.student_id
    WHERE m.sender_role = 'student' AND m.read_at IS NULL
    GROUP BY u.id
    ORDER BY last_message_at DESC
    LIMIT 10
  `).all();

  // Content health
  const draftLessons = db.prepare(
    `SELECT COUNT(*) AS count FROM lessons WHERE status = 'draft'`
  ).get().count;

  const lessonsNoQuiz = db.prepare(`
    SELECT COUNT(*) AS count FROM lessons l
    WHERE l.status = 'published'
      AND NOT EXISTS (
        SELECT 1 FROM quiz_assignments qa WHERE qa.lesson_id = l.id
      )
  `).get().count;

  return res.json({
    stats: {
      total_students: basicCount + premiumCount,
      premium_count: premiumCount,
      basic_count: basicCount,
      mrr_estimate: premiumCount * 39 + basicCount * 19,
    },
    new_students: newStudents,
    upcoming_exams: upcomingExams,
    open_messages: openMessages,
    content_health: {
      draft_lessons: draftLessons,
      lessons_no_quiz: lessonsNoQuiz,
    },
  });
});

// PATCH /api/admin/students/:id/profile — update exam_date and notes
router.patch('/students/:id/profile', requireTeacher, (req, res) => {
  const { exam_date, admin_notes } = req.body;
  const user = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'student'").get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Student nije pronađen.' });

  if (exam_date !== undefined) {
    db.prepare('UPDATE users SET exam_date = ? WHERE id = ?').run(exam_date || null, req.params.id);
  }
  if (admin_notes !== undefined) {
    db.prepare('UPDATE users SET admin_notes = ? WHERE id = ?').run(admin_notes, req.params.id);
  }

  const updated = db.prepare(
    'SELECT id, name, email, subscription_tier, created_at, exam_date, admin_notes FROM users WHERE id = ?'
  ).get(req.params.id);
  return res.json({ user: updated });
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
