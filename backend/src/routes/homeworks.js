const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const { sendHomeworkGradedEmail } = require('../services/email');

const teacherRouter = express.Router();
const studentRouter = express.Router();
const router = teacherRouter; // alias for teacher-only sections below

// ─── DB bootstrap ─────────────────────────────────────────────────────────────
// Tables are created via migrations in db.js (R17).

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getHomework(id) {
  const hw = db.prepare('SELECT * FROM homeworks WHERE id = ?').get(id);
  if (!hw) return null;
  hw.questions = db.prepare(`
    SELECT hq.position, q.id, q.type, q.stem, q.difficulty, q.max_points
    FROM homework_questions hq
    JOIN questions q ON q.id = hq.question_id
    WHERE hq.homework_id = ?
    ORDER BY hq.position
  `).all(id);
  return hw;
}

function getAssignment(id) {
  const a = db.prepare('SELECT * FROM homework_assignments WHERE id = ?').get(id);
  if (!a) return null;
  a.homework = getHomework(a.homework_id);
  return a;
}

function getSubmission(id) {
  const s = db.prepare('SELECT * FROM homework_submissions WHERE id = ?').get(id);
  if (!s) return null;
  s.answers = db.prepare('SELECT * FROM homework_answers WHERE submission_id = ? ORDER BY id').all(id);
  return s;
}

// ─── Homework CRUD ────────────────────────────────────────────────────────────

// GET /api/teacher/homeworks — list all homeworks
router.get('/homeworks', requireAuth, requireTeacher, (req, res) => {
  const rows = db.prepare('SELECT * FROM homeworks ORDER BY created_at DESC').all();
  const homeworks = rows.map(hw => {
    hw.question_count = db.prepare(
      'SELECT COUNT(*) as n FROM homework_questions WHERE homework_id = ?'
    ).get(hw.id).n;
    return hw;
  });
  res.json({ homeworks });
});

// POST /api/teacher/homeworks — create homework
router.post('/homeworks', requireAuth, requireTeacher, (req, res) => {
  const { title, instruction_html, question_ids = [] } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO homeworks (title, instruction_html, created_by) VALUES (?, ?, ?)'
  ).run(title.trim(), instruction_html ?? null, req.user.id);

  if (question_ids.length) {
    const ins = db.prepare(
      'INSERT INTO homework_questions (homework_id, question_id, position) VALUES (?, ?, ?)'
    );
    const insertAll = db.transaction((ids) => {
      ids.forEach((qid, i) => ins.run(lastInsertRowid, qid, i));
    });
    insertAll(question_ids);
  }

  res.status(201).json({ homework: getHomework(lastInsertRowid) });
});

// GET /api/teacher/homeworks/:id
router.get('/homeworks/:id', requireAuth, requireTeacher, (req, res) => {
  const hw = getHomework(req.params.id);
  if (!hw) return res.status(404).json({ error: 'Homework not found' });
  res.json({ homework: hw });
});

// PUT /api/teacher/homeworks/:id — update title, instruction, question list
router.put('/homeworks/:id', requireAuth, requireTeacher, (req, res) => {
  const existing = db.prepare('SELECT id FROM homeworks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Homework not found' });

  const { title, instruction_html, question_ids } = req.body;

  db.prepare(`
    UPDATE homeworks SET
      title = COALESCE(?, title),
      instruction_html = COALESCE(?, instruction_html),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(title ?? null, instruction_html ?? null, req.params.id);

  if (Array.isArray(question_ids)) {
    db.prepare('DELETE FROM homework_questions WHERE homework_id = ?').run(req.params.id);
    const ins = db.prepare(
      'INSERT INTO homework_questions (homework_id, question_id, position) VALUES (?, ?, ?)'
    );
    const insertAll = db.transaction((ids) => {
      ids.forEach((qid, i) => ins.run(req.params.id, qid, i));
    });
    insertAll(question_ids);
  }

  res.json({ homework: getHomework(req.params.id) });
});

// DELETE /api/teacher/homeworks/:id
router.delete('/homeworks/:id', requireAuth, requireTeacher, (req, res) => {
  const existing = db.prepare('SELECT id FROM homeworks WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Homework not found' });
  db.prepare('DELETE FROM homeworks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Homework deleted' });
});

// ─── Assignments ──────────────────────────────────────────────────────────────

// POST /api/teacher/homeworks/:id/assign
// Body: { student_id?, group_id?, deadline }
router.post('/homeworks/:id/assign', requireAuth, requireTeacher, (req, res) => {
  const hw = db.prepare('SELECT id FROM homeworks WHERE id = ?').get(req.params.id);
  if (!hw) return res.status(404).json({ error: 'Homework not found' });

  const { student_id, group_id, deadline } = req.body;
  if (!student_id && !group_id)
    return res.status(400).json({ error: 'student_id or group_id is required' });

  if (student_id) {
    const student = db.prepare('SELECT id FROM users WHERE id = ? AND role = ?').get(student_id, 'student');
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const { lastInsertRowid } = db.prepare(`
      INSERT INTO homework_assignments (homework_id, student_id, deadline)
      VALUES (?, ?, ?)
    `).run(req.params.id, student_id, deadline ?? null);

    return res.status(201).json({ assignment: getAssignment(lastInsertRowid) });
  }

  // Group assignment: create one assignment per group member
  const members = db.prepare('SELECT student_id FROM group_members WHERE group_id = ?').all(group_id);
  if (!members.length) return res.status(400).json({ error: 'Group has no members' });

  const ins = db.prepare(
    'INSERT INTO homework_assignments (homework_id, student_id, group_id, deadline) VALUES (?, ?, ?, ?)'
  );
  const insertAll = db.transaction(() => {
    for (const m of members) ins.run(req.params.id, m.student_id, group_id, deadline ?? null);
  });
  insertAll();

  const assignments = db.prepare(
    'SELECT * FROM homework_assignments WHERE homework_id = ? AND group_id = ?'
  ).all(req.params.id, group_id);

  res.status(201).json({ assigned_count: assignments.length, assignments });
});

// GET /api/teacher/assignments — teacher inbox (all assignments, filterable)
router.get('/homeworks/assignments/inbox', requireAuth, requireTeacher, (req, res) => {
  const { status, student_id } = req.query;
  const conditions = [];
  const params = [];

  if (status) { conditions.push('ha.status = ?'); params.push(status); }
  if (student_id) { conditions.push('ha.student_id = ?'); params.push(Number(student_id)); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(`
    SELECT ha.*, hw.title as homework_title, hw.instruction_html,
           u.name as student_name, u.email as student_email
    FROM homework_assignments ha
    JOIN homeworks hw ON hw.id = ha.homework_id
    JOIN users u ON u.id = ha.student_id
    ${where}
    ORDER BY ha.deadline ASC NULLS LAST, ha.assigned_at DESC
  `).all(...params);

  res.json({ assignments: rows });
});

// GET /api/teacher/assignments/:id
router.get('/homeworks/assignments/:id', requireAuth, requireTeacher, (req, res) => {
  const a = db.prepare(`
    SELECT ha.*, hw.title as homework_title, hw.instruction_html,
           u.name as student_name
    FROM homework_assignments ha
    JOIN homeworks hw ON hw.id = ha.homework_id
    JOIN users u ON u.id = ha.student_id
    WHERE ha.id = ?
  `).get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Assignment not found' });

  a.questions = db.prepare(`
    SELECT hq.position, q.id, q.type, q.stem, q.difficulty, q.max_points,
           q.explanation, q.model_answer
    FROM homework_questions hq
    JOIN questions q ON q.id = hq.question_id
    WHERE hq.homework_id = ?
    ORDER BY hq.position
  `).all(a.homework_id);

  const submission = db.prepare(
    'SELECT * FROM homework_submissions WHERE assignment_id = ?'
  ).get(req.params.id);
  if (submission) {
    submission.answers = db.prepare(
      'SELECT * FROM homework_answers WHERE submission_id = ? ORDER BY id'
    ).all(submission.id);
    a.submission = submission;
  }

  res.json({ assignment: a });
});

// ─── Student submission ───────────────────────────────────────────────────────

// POST /api/student/homeworks/:assignmentId/submit
// Body: { answers: [{ question_id, answer_text?, file_url? }] }
studentRouter.post('/homeworks/:assignmentId/submit', requireAuth, (req, res) => {
  const assignment = db.prepare(
    'SELECT * FROM homework_assignments WHERE id = ? AND student_id = ?'
  ).get(req.params.assignmentId, req.user.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });
  if (assignment.status === 'corrected') return res.status(400).json({ error: 'Already corrected' });

  const { answers = [] } = req.body;

  const existing = db.prepare(
    'SELECT id FROM homework_submissions WHERE assignment_id = ?'
  ).get(req.params.assignmentId);
  if (existing) {
    db.prepare('DELETE FROM homework_answers WHERE submission_id = ?').run(existing.id);
    db.prepare('DELETE FROM homework_submissions WHERE id = ?').run(existing.id);
  }

  const { lastInsertRowid: subId } = db.prepare(
    `INSERT INTO homework_submissions (assignment_id, submitted_at) VALUES (?, datetime('now'))`
  ).run(req.params.assignmentId);

  const ins = db.prepare(`
    INSERT INTO homework_answers (submission_id, question_id, answer_text, file_url)
    VALUES (?, ?, ?, ?)
  `);
  const insertAll = db.transaction(() => {
    for (const a of answers) ins.run(subId, a.question_id, a.answer_text ?? null, a.file_url ?? null);
  });
  insertAll();

  db.prepare(`
    UPDATE homework_assignments SET status = 'submitted', submitted_at = datetime('now') WHERE id = ?
  `).run(req.params.assignmentId);

  res.status(201).json({ submission: getSubmission(subId) });
});

// GET /api/student/homeworks — student's assigned homeworks
studentRouter.get('/homeworks', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT ha.*, hw.title as homework_title, hw.instruction_html
    FROM homework_assignments ha
    JOIN homeworks hw ON hw.id = ha.homework_id
    WHERE ha.student_id = ?
    ORDER BY ha.deadline ASC NULLS LAST
  `).all(req.user.id);
  res.json({ assignments: rows });
});

// ─── Teacher correction ───────────────────────────────────────────────────────

// POST /api/teacher/assignments/:id/correct
// Body: { teacher_comment?, answers: [{ answer_id, score, teacher_note }] }
router.post('/homeworks/assignments/:id/correct', requireAuth, requireTeacher, (req, res) => {
  const assignment = db.prepare(
    'SELECT * FROM homework_assignments WHERE id = ?'
  ).get(req.params.id);
  if (!assignment) return res.status(404).json({ error: 'Assignment not found' });

  const submission = db.prepare(
    'SELECT * FROM homework_submissions WHERE assignment_id = ?'
  ).get(req.params.id);
  if (!submission) return res.status(400).json({ error: 'No submission to correct' });

  const { teacher_comment, answers = [] } = req.body;

  // Score individual answers
  let totalScore = 0;
  const update = db.prepare(`
    UPDATE homework_answers SET score = ?, teacher_note = ? WHERE id = ?
  `);
  const correctAll = db.transaction(() => {
    for (const a of answers) {
      update.run(a.score ?? null, a.teacher_note ?? null, a.answer_id);
      if (a.score) totalScore += a.score;
    }
  });
  correctAll();

  db.prepare(`
    UPDATE homework_submissions
    SET corrected_at = datetime('now'), overall_score = ?, teacher_comment = ?
    WHERE id = ?
  `).run(totalScore, teacher_comment ?? null, submission.id);

  db.prepare(`
    UPDATE homework_assignments
    SET status = 'corrected', corrected_at = datetime('now')
    WHERE id = ?
  `).run(req.params.id);

  // Notify the student their homework has been graded (fire-and-forget).
  const student = db.prepare(
    `SELECT u.name, u.email, hw.title AS homework_title
       FROM homework_assignments ha
       JOIN users u ON u.id = ha.student_id
       JOIN homeworks hw ON hw.id = ha.homework_id
      WHERE ha.id = ?`
  ).get(req.params.id);
  if (student) {
    sendHomeworkGradedEmail({
      studentName: student.name,
      studentEmail: student.email,
      homeworkTitle: student.homework_title,
      score: totalScore,
      teacherComment: teacher_comment ?? null,
    });
  }

  res.json({ submission: getSubmission(submission.id) });
});

module.exports = { teacherRouter, studentRouter };
