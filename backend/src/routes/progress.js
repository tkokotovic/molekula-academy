const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

const studentRouter = express.Router();
const teacherRouter = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_STATUSES = ['in_progress', 'completed'];

/**
 * Calculate current streak in days.
 * activityDates: array of ISO datetime strings from DB.
 * A streak is the number of consecutive calendar days (going back from today)
 * that had at least one activity. Streak is 0 if no activity today or yesterday.
 */
function calculateStreak(activityDates) {
  if (!activityDates || activityDates.length === 0) return 0;

  // Normalise to YYYY-MM-DD in UTC
  const uniqueDays = [...new Set(
    activityDates.map(d => d.slice(0, 10))
  )].sort().reverse();

  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

  // Streak must start from today or yesterday
  if (uniqueDays[0] !== today && uniqueDays[0] !== yesterday) return 0;

  let streak = 1;
  for (let i = 1; i < uniqueDays.length; i++) {
    const curr = new Date(uniqueDays[i - 1]);
    const prev = new Date(uniqueDays[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

/**
 * Build per-course completion stats for a given student.
 * Counts only published lessons (status = 'published').
 */
function buildCourseStats(studentId) {
  const courses = db.prepare(`
    SELECT c.* FROM courses c
    JOIN enrollments e ON c.id = e.course_id
    WHERE e.student_id = ? AND c.status = 'published'
    ORDER BY e.enrolled_at ASC
  `).all(studentId);

  return courses.map(course => {
    // All published lessons under this course
    const lessons = db.prepare(`
      SELECT l.id FROM lessons l
        JOIN topics t ON l.topic_id = t.id
       WHERE t.course_id = ? AND l.status = 'published'
    `).all(course.id);

    const totalLessons = lessons.length;

    const completedCount = lessons.filter(l => {
      const prog = db.prepare(
        "SELECT status FROM lesson_progress WHERE student_id = ? AND lesson_id = ?"
      ).get(studentId, l.id);
      return prog && prog.status === 'completed';
    }).length;

    const inProgressCount = lessons.filter(l => {
      const prog = db.prepare(
        "SELECT status FROM lesson_progress WHERE student_id = ? AND lesson_id = ?"
      ).get(studentId, l.id);
      return prog && prog.status === 'in_progress';
    }).length;

    const completionPct = totalLessons > 0
      ? Math.round((completedCount / totalLessons) * 100)
      : 0;

    return {
      course_id: course.id,
      course_title: course.title,
      total_lessons: totalLessons,
      completed_lessons: completedCount,
      in_progress_lessons: inProgressCount,
      completion_pct: completionPct,
    };
  });
}

/**
 * Build quiz attempt history for a given student.
 * Returns submitted + graded attempts with score info.
 */
function buildQuizHistory(studentId) {
  const attempts = db.prepare(`
    SELECT
      qa.id AS attempt_id,
      qa.quiz_id,
      qa.attempt_number,
      qa.status,
      qa.score,
      qa.max_score,
      qa.submitted_at,
      q.title AS quiz_title,
      q.type  AS quiz_type,
      q.topic_id,
      t.title AS topic_title
    FROM quiz_attempts qa
    JOIN quizzes q ON qa.quiz_id = q.id
    LEFT JOIN topics t ON q.topic_id = t.id
    WHERE qa.student_id = ?
      AND qa.status IN ('submitted', 'graded')
    ORDER BY qa.submitted_at DESC
  `).all(studentId);

  return attempts.map(a => {
    const scorePct = (a.max_score && a.max_score > 0)
      ? Math.round((a.score / a.max_score) * 100)
      : null;
    const quiz = db.prepare('SELECT pass_score FROM quizzes WHERE id = ?').get(a.quiz_id);
    const passed = (scorePct !== null && quiz) ? scorePct >= quiz.pass_score : null;
    return { ...a, score_pct: scorePct, passed };
  });
}

// Track record for personalized practice quizzes (#19): every self-generated
// attempt with overall score and a per-topic percentage breakdown. Ordered
// oldest → newest so the client can plot the trend directly.
function buildPracticeHistory(studentId) {
  const attempts = db.prepare(`
    SELECT qa.id AS attempt_id, qa.score, qa.max_score, qa.status,
           qa.started_at, qa.submitted_at
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
     WHERE qa.student_id = ?
       AND q.type = 'self_generated'
       AND qa.status IN ('submitted', 'graded')
     ORDER BY qa.submitted_at ASC
  `).all(studentId);

  return attempts.map(a => {
    const scorePct = (a.max_score && a.max_score > 0)
      ? Math.round((a.score / a.max_score) * 100)
      : null;

    const topicRows = db.prepare(`
      SELECT t.id AS topic_id, t.title,
             COALESCE(SUM(qaa.points_earned), 0) AS earned,
             SUM(COALESCE(qq.points_override, q.max_points)) AS possible,
             COUNT(*) AS question_count
        FROM quiz_attempt_answers qaa
        JOIN questions q ON qaa.question_id = q.id
        JOIN quiz_questions qq ON qq.quiz_id = ? AND qq.question_id = qaa.question_id
        LEFT JOIN topics t ON q.topic_id = t.id
       WHERE qaa.attempt_id = ?
       GROUP BY t.id
    `).all(
      db.prepare('SELECT quiz_id FROM quiz_attempts WHERE id = ?').get(a.attempt_id).quiz_id,
      a.attempt_id,
    );

    const per_topic = topicRows.map(r => ({
      topic_id: r.topic_id,
      title: r.title || 'Bez teme',
      question_count: r.question_count,
      earned: r.earned,
      possible: r.possible,
      pct: r.possible > 0 ? Math.round((r.earned / r.possible) * 100) : null,
    }));

    return {
      ...a,
      score_pct: scorePct,
      question_count: per_topic.reduce((s, r) => s + r.question_count, 0),
      per_topic,
    };
  });
}

// ─── Student — homework list ──────────────────────────────────────────────────

// GET /api/student/homework — all published homework quizzes
// Includes overdue ones (student needs to see history), with is_overdue flag.
studentRouter.get('/homework', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  const rows = db.prepare(
    "SELECT * FROM quizzes WHERE status = 'published' AND type = 'homework' ORDER BY due_date ASC"
  ).all();

  const homework = rows.map(q => ({
    ...q,
    is_overdue: q.due_date ? q.due_date < now : false,
  }));

  return res.json({ homework });
});

// ─── Student — lesson progress ────────────────────────────────────────────────

// POST /api/student/lessons/:id/progress
// Body: { status: 'in_progress' | 'completed', time_spent_seconds?: number }
studentRouter.post('/lessons/:id/progress', requireAuth, (req, res) => {
  const lessonId = Number(req.params.id);
  const studentId = req.user.id;

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const { status, time_spent_seconds = 0 } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }

  const existing = db.prepare(
    'SELECT * FROM lesson_progress WHERE student_id = ? AND lesson_id = ?'
  ).get(studentId, lessonId);

  if (!existing) {
    // Insert new row
    db.prepare(`
      INSERT INTO lesson_progress (student_id, lesson_id, status, time_spent_seconds, completed_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      studentId, lessonId, status,
      time_spent_seconds,
      status === 'completed' ? new Date().toISOString() : null
    );
  } else {
    // Update: status can only advance (in_progress → completed, not backward)
    const newStatus = existing.status === 'completed' ? 'completed' : status;
    const newCompletedAt = newStatus === 'completed' && !existing.completed_at
      ? new Date().toISOString()
      : existing.completed_at;

    db.prepare(`
      UPDATE lesson_progress
         SET status = ?,
             time_spent_seconds = time_spent_seconds + ?,
             completed_at = ?
       WHERE student_id = ? AND lesson_id = ?
    `).run(newStatus, time_spent_seconds, newCompletedAt, studentId, lessonId);
  }

  const updated = db.prepare(
    'SELECT * FROM lesson_progress WHERE student_id = ? AND lesson_id = ?'
  ).get(studentId, lessonId);

  return res.json({ progress: updated });
});

// GET /api/student/lessons/:id/progress
studentRouter.get('/lessons/:id/progress', requireAuth, (req, res) => {
  const lessonId = Number(req.params.id);
  const studentId = req.user.id;

  const progress = db.prepare(
    'SELECT * FROM lesson_progress WHERE student_id = ? AND lesson_id = ?'
  ).get(studentId, lessonId) || null;

  return res.json({ progress });
});

// ─── Student — analytics ──────────────────────────────────────────────────────

// GET /api/student/progress/courses
studentRouter.get('/progress/courses', requireAuth, (req, res) => {
  const courses = buildCourseStats(req.user.id);
  return res.json({ courses });
});

// GET /api/student/progress/quiz-history
studentRouter.get('/progress/quiz-history', requireAuth, (req, res) => {
  const attempts = buildQuizHistory(req.user.id);
  return res.json({ attempts });
});

// GET /api/student/practice/history — personalized-quiz track record (#19)
studentRouter.get('/practice/history', requireAuth, (req, res) => {
  const attempts = buildPracticeHistory(req.user.id);
  return res.json({ attempts });
});

// GET /api/student/progress/stats
studentRouter.get('/progress/stats', requireAuth, (req, res) => {
  const studentId = req.user.id;

  // Total lessons completed
  const completedRow = db.prepare(
    "SELECT COUNT(*) AS cnt FROM lesson_progress WHERE student_id = ? AND status = 'completed'"
  ).get(studentId);

  // Total time spent
  const timeRow = db.prepare(
    'SELECT COALESCE(SUM(time_spent_seconds), 0) AS total FROM lesson_progress WHERE student_id = ?'
  ).get(studentId);

  // Quiz stats
  const quizRows = db.prepare(`
    SELECT qa.score, qa.max_score, qa.submitted_at
      FROM quiz_attempts qa
     WHERE qa.student_id = ?
       AND qa.status IN ('submitted', 'graded')
       AND qa.submitted_at IS NOT NULL
  `).all(studentId);

  // Per-topic quiz averages (for strongest/weakest topic)
  const topicScores = db.prepare(`
    SELECT q.topic_id, t.title,
           AVG(CASE WHEN qa.max_score > 0 THEN (qa.score * 100.0 / qa.max_score) ELSE NULL END) AS avg_pct
      FROM quiz_attempts qa
      JOIN quizzes q ON qa.quiz_id = q.id
      LEFT JOIN topics t ON q.topic_id = t.id
     WHERE qa.student_id = ?
       AND qa.status IN ('submitted', 'graded')
       AND q.topic_id IS NOT NULL
     GROUP BY q.topic_id
  `).all(studentId);

  let strongestTopic = null;
  let weakestTopic = null;
  if (topicScores.length > 0) {
    const sorted = [...topicScores].sort((a, b) => b.avg_pct - a.avg_pct);
    strongestTopic = { topic_id: sorted[0].topic_id, title: sorted[0].title, avg_score_pct: Math.round(sorted[0].avg_pct) };
    weakestTopic = { topic_id: sorted[sorted.length - 1].topic_id, title: sorted[sorted.length - 1].title, avg_score_pct: Math.round(sorted[sorted.length - 1].avg_pct) };
    if (strongestTopic.topic_id === weakestTopic.topic_id) weakestTopic = null;
  }

  // Overall avg score
  const avgScore = quizRows.length > 0
    ? Math.round(quizRows.reduce((acc, r) => acc + (r.max_score > 0 ? (r.score * 100 / r.max_score) : 0), 0) / quizRows.length)
    : null;

  // Streak — combine lesson completions and quiz submissions
  const lessonDates = db.prepare(
    "SELECT completed_at FROM lesson_progress WHERE student_id = ? AND status = 'completed' AND completed_at IS NOT NULL"
  ).all(studentId).map(r => r.completed_at);

  const quizDates = quizRows.map(r => r.submitted_at);
  const streak = calculateStreak([...lessonDates, ...quizDates]);

  return res.json({
    stats: {
      total_lessons_completed: completedRow.cnt,
      total_time_spent_seconds: timeRow.total,
      total_quizzes_taken: quizRows.length,
      avg_score_pct: avgScore,
      current_streak_days: streak,
      strongest_topic: strongestTopic,
      weakest_topic: weakestTopic,
    },
  });
});

// ─── Teacher — student progress views ────────────────────────────────────────

// GET /api/teacher/students/:id/progress/courses
teacherRouter.get('/students/:id/progress/courses', requireTeacher, (req, res) => {
  const studentId = Number(req.params.id);
  const student = db.prepare('SELECT id FROM users WHERE id = ?').get(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const courses = buildCourseStats(studentId);
  return res.json({ courses });
});

// GET /api/teacher/students/:id/progress/quiz-history
teacherRouter.get('/students/:id/progress/quiz-history', requireTeacher, (req, res) => {
  const studentId = Number(req.params.id);
  const student = db.prepare('SELECT id FROM users WHERE id = ?').get(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const attempts = buildQuizHistory(studentId);
  return res.json({ attempts });
});

// GET /api/teacher/students/:id/practice/history — track record visible to TK (#19)
teacherRouter.get('/students/:id/practice/history', requireTeacher, (req, res) => {
  const studentId = Number(req.params.id);
  const student = db.prepare('SELECT id FROM users WHERE id = ?').get(studentId);
  if (!student) return res.status(404).json({ error: 'Student not found' });

  const attempts = buildPracticeHistory(studentId);
  return res.json({ attempts });
});

module.exports = { studentRouter, teacherRouter };
