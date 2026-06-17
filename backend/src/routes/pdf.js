const express = require('express');
const router  = express.Router();
const db      = require('../db');
const { requireTeacher, requireAuth } = require('../middleware/auth');
const { shell, renderToPDF, buildParentReport, buildProgressReport, buildLesson, fmtDate } = require('../services/pdfExport');

function sendPDF(res, buf, filename) {
  res.set({
    'Content-Type':        'application/pdf',
    'Content-Disposition': `attachment; filename="${filename}"`,
    'Content-Length':      buf.length,
  });
  res.end(buf);
}

function safeName(str) {
  return (str || 'dokument')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 60);
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

// ── POST /api/teacher/students/:id/pdf/parent-report ─────────────────────────
// Body: { effort, goal, probability, additional_effort, mock_results, personal_note }
router.post('/students/:id/pdf/parent-report', requireTeacher, async (req, res) => {
  try {
    const student = db.prepare(
      "SELECT id,name,email,subscription_tier,exam_date FROM users WHERE id=? AND role='student'"
    ).get(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student nije pronađen.' });

    const courses = db.prepare(`
      SELECT co.title,
        COUNT(DISTINCT l.id)   AS total_lessons,
        COUNT(DISTINCT CASE WHEN lp.status='completed' THEN lp.lesson_id END) AS completed_lessons
      FROM enrollments en
      JOIN courses co ON co.id = en.course_id
      JOIN topics t   ON t.course_id = co.id
      JOIN lessons l  ON l.topic_id  = t.id
      LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.student_id=?
      WHERE en.student_id=? AND co.status='published'
      GROUP BY co.id
    `).all(student.id, student.id);

    const quizHistory = db.prepare(`
      SELECT qa.score, qa.max_score, qa.submitted_at, q.title AS quiz_title
      FROM quiz_attempts qa
      JOIN quizzes q ON q.id=qa.quiz_id
      WHERE qa.student_id=? AND qa.submitted_at IS NOT NULL
      ORDER BY qa.submitted_at DESC LIMIT 8
    `).all(student.id);

    const body = buildParentReport(student, courses, quizHistory, req.body || {});
    const html = shell('dark', 'Izvještaj za roditelje', fmtDate(new Date().toISOString()), body);
    const pdf  = await renderToPDF(html);

    sendPDF(res, pdf, `izvjestaj_${safeName(student.name)}_${today()}.pdf`);
  } catch (err) {
    console.error('[pdf] parent-report:', err.message);
    res.status(500).json({ error: 'Greška pri generiranju PDF-a.' });
  }
});

// ── GET /api/teacher/students/:id/pdf/progress ───────────────────────────────
router.get('/students/:id/pdf/progress', requireTeacher, async (req, res) => {
  try {
    const student = db.prepare(
      "SELECT id,name,email,subscription_tier,exam_date FROM users WHERE id=? AND role='student'"
    ).get(req.params.id);
    if (!student) return res.status(404).json({ error: 'Student nije pronađen.' });

    const courses = db.prepare(`
      SELECT co.title,
        COUNT(DISTINCT l.id)   AS total_lessons,
        COUNT(DISTINCT CASE WHEN lp.status='completed' THEN lp.lesson_id END) AS completed_lessons
      FROM enrollments en
      JOIN courses co ON co.id = en.course_id
      JOIN topics t   ON t.course_id = co.id
      JOIN lessons l  ON l.topic_id  = t.id
      LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.student_id=?
      WHERE en.student_id=? AND co.status='published'
      GROUP BY co.id
    `).all(student.id, student.id);

    const quizHistory = db.prepare(`
      SELECT qa.score, qa.max_score, qa.submitted_at, q.title AS quiz_title
      FROM quiz_attempts qa
      JOIN quizzes q ON q.id=qa.quiz_id
      WHERE qa.student_id=? AND qa.submitted_at IS NOT NULL
      ORDER BY qa.submitted_at DESC
    `).all(student.id);

    const homeworks = db.prepare(
      'SELECT status FROM homework_assignments WHERE student_id=?'
    ).all(student.id);

    const body = buildProgressReport(student, courses, quizHistory, homeworks);
    const html = shell('dark', 'Izvještaj o napretku', fmtDate(new Date().toISOString()), body);
    const pdf  = await renderToPDF(html);

    sendPDF(res, pdf, `napredak_${safeName(student.name)}_${today()}.pdf`);
  } catch (err) {
    console.error('[pdf] progress:', err.message);
    res.status(500).json({ error: 'Greška pri generiranju PDF-a.' });
  }
});

// ── GET /api/teacher/lessons/:id/pdf ────────────────────────────────────────
router.get('/lessons/:id/pdf', requireAuth, requireTeacher, async (req, res) => {
  try {
    const lesson = db.prepare('SELECT * FROM lessons WHERE id=?').get(req.params.id);
    if (!lesson) return res.status(404).json({ error: 'Lekcija nije pronađena.' });

    const blocks = db.prepare(
      'SELECT * FROM lesson_blocks WHERE lesson_id=? ORDER BY position,id'
    ).all(lesson.id).map(r => ({ ...r, content: JSON.parse(r.content || '{}') }));

    const meta = lesson.topic_id
      ? db.prepare(`
          SELECT t.title AS topic_title, c.title AS course_title
          FROM topics t JOIN courses c ON c.id=t.course_id WHERE t.id=?
        `).get(lesson.topic_id)
      : null;

    const body = buildLesson(lesson, meta?.topic_title, meta?.course_title, blocks);
    const html = shell('light', 'Lekcija', fmtDate(new Date().toISOString()), body);
    const pdf  = await renderToPDF(html);

    sendPDF(res, pdf, `${safeName(lesson.title || 'lekcija')}.pdf`);
  } catch (err) {
    console.error('[pdf] lesson:', err.message);
    res.status(500).json({ error: 'Greška pri generiranju PDF-a.' });
  }
});

module.exports = router;
