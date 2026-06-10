const express = require('express');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const { gradeAnswer } = require('../services/aiGrading');
const { buildOptionOrders, applyOptionOrder } = require('../utils/shuffle');
const { checkAndIssueCertificate } = require('../services/certificates');

const teacherRouter = express.Router();
const studentRouter = express.Router();

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Load a quiz row plus its ordered questions (with options).
 * options: { hideCorrect: bool } — strip is_correct from options when true.
 */
function loadQuizWithQuestions(quizId, { hideCorrect = false } = {}) {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(quizId);
  if (!quiz) return null;

  const quizQuestions = db
    .prepare(
      `SELECT qq.id AS qq_id, qq.position, qq.points_override,
              q.*
         FROM quiz_questions qq
         JOIN questions q ON qq.question_id = q.id
        WHERE qq.quiz_id = ?
        ORDER BY qq.position`
    )
    .all(quizId);

  const questions = quizQuestions.map(row => {
    const options = db
      .prepare('SELECT * FROM question_options WHERE question_id = ? ORDER BY position')
      .all(row.id);

    const parsedOptions = options.map(o => {
      const opt = {
        id: o.id,
        text: o.text,
        points: o.points,
        keywords: JSON.parse(o.keywords || '[]'),
        position: o.position,
      };
      if (!hideCorrect) opt.is_correct = o.is_correct === 1;
      return opt;
    });

    return {
      qq_id: row.qq_id,
      position: row.position,
      points_override: row.points_override,
      question_id: row.id,
      id: row.id,
      type: row.type,
      stem: row.stem,
      explanation: row.explanation,
      difficulty: row.difficulty,
      max_points: row.points_override ?? row.max_points,
      ib_level: row.ib_level,
      ib_paper: row.ib_paper,
      source_type: row.source_type,
      topic_id: row.topic_id,
      options: parsedOptions,
    };
  });

  return {
    ...quiz,
    questions,
  };
}

/**
 * Auto-grade a single question answer.
 * Returns { is_correct, points_earned } or null if can't auto-grade.
 */
function autoGrade(question, answerData) {
  const options = db
    .prepare('SELECT * FROM question_options WHERE question_id = ? ORDER BY position')
    .all(question.id);

  const effectivePoints = question.points_override ?? question.max_points;

  if (question.type === 'mcq' || question.type === 'true_false') {
    const selectedIds = answerData.option_ids || [];
    const correctIds = options.filter(o => o.is_correct).map(o => o.id);

    // All selected must be correct and all correct must be selected
    const allCorrect =
      selectedIds.length === correctIds.length &&
      selectedIds.every(id => correctIds.includes(id));

    return {
      is_correct: allCorrect,
      points_earned: allCorrect ? effectivePoints : 0,
    };
  }

  if (question.type === 'fill_blank') {
    const text = (answerData.text || '').trim().toLowerCase();
    let matched = false;
    let pointsEarned = 0;

    for (const opt of options) {
      const keywords = JSON.parse(opt.keywords || '[]');
      const hit = keywords.some(kw => text.includes(kw.toLowerCase())) || text === opt.text.toLowerCase();
      if (hit) {
        matched = true;
        pointsEarned = Math.max(pointsEarned, opt.points);
      }
    }

    return { is_correct: matched, points_earned: pointsEarned };
  }

  // short_answer, chem_equation — needs teacher grading
  return null;
}

// ─── Teacher CRUD ─────────────────────────────────────────────────────────────

// POST /api/teacher/quizzes
teacherRouter.post('/', requireTeacher, (req, res) => {
  const {
    title,
    description,
    topic_id,
    type = 'topic_quiz',
    status = 'draft',
    time_limit_minutes,
    shuffle_questions = false,
    pass_score = 60,
    questions,
    // Mock exam fields
    scheduled_start,
    scheduled_end,
    is_example = false,
    grace_period_seconds = 120,
    // Homework fields
    due_date,
  } = req.body;

  if (!title) return res.status(400).json({ error: 'title is required' });
  if (!Array.isArray(questions)) return res.status(400).json({ error: 'questions array is required' });

  // homework requires due_date
  if (type === 'homework' && !due_date) {
    return res.status(400).json({ error: 'due_date is required for homework quizzes' });
  }

  // mock_exam: always 1 attempt; homework: unlimited (null); others: default 5
  let max_attempts;
  if (type === 'mock_exam') {
    max_attempts = 1;
  } else if (type === 'homework') {
    max_attempts = null;
  } else {
    max_attempts = req.body.max_attempts ?? 5;
  }

  // Validate no duplicate question_ids
  const questionIds = questions.map(q => q.question_id);
  if (new Set(questionIds).size !== questionIds.length) {
    return res.status(400).json({ error: 'Duplicate question_id in questions array' });
  }

  const insertQuiz = db.prepare(`
    INSERT INTO quizzes
      (title, description, topic_id, type, status, time_limit_minutes, max_attempts,
       shuffle_questions, pass_score,
       scheduled_start, scheduled_end, is_example, grace_period_seconds,
       due_date, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertQQ = db.prepare(`
    INSERT INTO quiz_questions (quiz_id, question_id, position, points_override)
    VALUES (?, ?, ?, ?)
  `);

  const create = db.transaction(() => {
    const { lastInsertRowid } = insertQuiz.run(
      title, description || null, topic_id || null, type, status,
      time_limit_minutes || null, max_attempts,
      shuffle_questions ? 1 : 0, pass_score,
      scheduled_start || null, scheduled_end || null,
      is_example ? 1 : 0, grace_period_seconds,
      due_date || null,
      req.user.id
    );
    const quizId = lastInsertRowid;

    for (const q of questions) {
      insertQQ.run(quizId, q.question_id, q.position ?? 0, q.points_override ?? null);
    }

    return quizId;
  });

  let quizId;
  try {
    quizId = create();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  const quiz = loadQuizWithQuestions(quizId);
  return res.status(201).json(quiz);
});

// GET /api/teacher/quizzes
teacherRouter.get('/', requireTeacher, (req, res) => {
  const { topic_id, status } = req.query;

  let sql = 'SELECT * FROM quizzes WHERE 1=1';
  const params = [];

  if (topic_id) { sql += ' AND topic_id = ?'; params.push(Number(topic_id)); }
  if (status)   { sql += ' AND status = ?';   params.push(status); }

  sql += ' ORDER BY created_at DESC';

  const quizzes = db.prepare(sql).all(...params);
  return res.json(quizzes);
});

// GET /api/teacher/quizzes/:id
teacherRouter.get('/:id', requireTeacher, (req, res) => {
  const quiz = loadQuizWithQuestions(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });
  return res.json(quiz);
});

// PUT /api/teacher/quizzes/:id
teacherRouter.put('/:id', requireTeacher, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const {
    title,
    description,
    topic_id,
    time_limit_minutes,
    max_attempts,
    shuffle_questions,
    pass_score,
    questions,
  } = req.body;

  if (questions !== undefined && !Array.isArray(questions)) {
    return res.status(400).json({ error: 'questions must be an array' });
  }

  if (questions) {
    const ids = questions.map(q => q.question_id);
    if (new Set(ids).size !== ids.length) {
      return res.status(400).json({ error: 'Duplicate question_id in questions array' });
    }
  }

  const update = db.transaction(() => {
    db.prepare(`
      UPDATE quizzes SET
        title             = COALESCE(?, title),
        description       = COALESCE(?, description),
        topic_id          = COALESCE(?, topic_id),
        time_limit_minutes = COALESCE(?, time_limit_minutes),
        max_attempts      = COALESCE(?, max_attempts),
        shuffle_questions = COALESCE(?, shuffle_questions),
        pass_score        = COALESCE(?, pass_score),
        updated_at        = datetime('now')
      WHERE id = ?
    `).run(
      title ?? null, description ?? null, topic_id ?? null,
      time_limit_minutes ?? null, max_attempts ?? null,
      shuffle_questions !== undefined ? (shuffle_questions ? 1 : 0) : null,
      pass_score ?? null, req.params.id
    );

    if (questions) {
      db.prepare('DELETE FROM quiz_questions WHERE quiz_id = ?').run(req.params.id);
      const insertQQ = db.prepare(
        'INSERT INTO quiz_questions (quiz_id, question_id, position, points_override) VALUES (?, ?, ?, ?)'
      );
      for (const q of questions) {
        insertQQ.run(req.params.id, q.question_id, q.position ?? 0, q.points_override ?? null);
      }
    }
  });

  try {
    update();
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  return res.json(loadQuizWithQuestions(req.params.id));
});

// PATCH /api/teacher/quizzes/:id/status
teacherRouter.patch('/:id/status', requireTeacher, (req, res) => {
  const { status } = req.body;
  const VALID = ['draft', 'published', 'archived'];
  if (!VALID.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID.join(', ')}` });
  }

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  db.prepare("UPDATE quizzes SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(status, req.params.id);

  return res.json({ ...quiz, status });
});

// DELETE /api/teacher/quizzes/:id
teacherRouter.delete('/:id', requireTeacher, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  db.prepare('DELETE FROM quizzes WHERE id = ?').run(req.params.id);
  return res.json({ message: 'Quiz deleted' });
});

// GET /api/teacher/quizzes/:id/attempts — all student attempts
teacherRouter.get('/:id/attempts', requireTeacher, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const attempts = db.prepare(`
    SELECT qa.*, u.name AS student_name, u.email AS student_email
      FROM quiz_attempts qa
      JOIN users u ON qa.student_id = u.id
     WHERE qa.quiz_id = ?
     ORDER BY qa.started_at DESC
  `).all(req.params.id);

  return res.json(attempts);
});

// ─── Student routes ───────────────────────────────────────────────────────────

// POST /api/student/quizzes/self-generated  (must be before /:id routes)
studentRouter.post('/self-generated', requireAuth, (req, res) => {
  const { topic_ids, count = 10, difficulty, ib_level, question_type } = req.body;

  if (!Array.isArray(topic_ids) || topic_ids.length === 0) {
    return res.status(400).json({ error: 'topic_ids array is required' });
  }

  // Build query for approved questions matching filters
  const placeholders = topic_ids.map(() => '?').join(',');
  let sql = `SELECT * FROM questions WHERE status = 'approved' AND topic_id IN (${placeholders})`;
  const params = [...topic_ids];

  if (difficulty)     { sql += ' AND difficulty = ?';  params.push(difficulty); }
  if (ib_level)       { sql += ' AND ib_level = ?';    params.push(ib_level); }
  if (question_type)  { sql += ' AND type = ?';        params.push(question_type); }

  sql += ' ORDER BY RANDOM() LIMIT ?';
  params.push(Number(count));

  const pool = db.prepare(sql).all(...params);

  if (pool.length === 0) {
    return res.status(400).json({ error: 'No approved questions match the given filters' });
  }

  // Persist the self-generated quiz so the attempt can be reviewed
  const insertQuiz = db.prepare(`
    INSERT INTO quizzes (title, topic_id, type, status, max_attempts, created_by)
    VALUES (?, ?, 'self_generated', 'published', 5, ?)
  `);
  const insertQQ = db.prepare(
    'INSERT INTO quiz_questions (quiz_id, question_id, position) VALUES (?, ?, ?)'
  );
  const insertAttempt = db.prepare(`
    INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, max_score)
    VALUES (?, ?, 1, ?)
  `);

  const create = db.transaction(() => {
    const topicLabel = topic_ids.length === 1 ? `Topic ${topic_ids[0]}` : 'Multiple Topics';
    const title = `Self-generated: ${topicLabel}`;
    const { lastInsertRowid: quizId } = insertQuiz.run(title, topic_ids[0], req.user.id);

    let maxScore = 0;
    pool.forEach((q, i) => {
      insertQQ.run(quizId, q.id, i);
      maxScore += q.max_points;
    });

    const { lastInsertRowid: attemptId } = insertAttempt.run(quizId, req.user.id, maxScore);

    return { quizId, attemptId };
  });

  const { quizId, attemptId } = create();

  // Build and store shuffled option orders
  const optionOrders = buildOptionOrders(
    attemptId,
    pool.map(q => ({ id: q.id })),
    qId => db.prepare('SELECT id FROM question_options WHERE question_id = ? ORDER BY position').all(qId).map(o => o.id)
  );
  db.prepare('UPDATE quiz_attempts SET option_orders = ? WHERE id = ?').run(optionOrders, attemptId);

  const quiz = loadQuizWithQuestions(quizId, { hideCorrect: true });
  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);

  return res.status(201).json({ quiz, attempt });
});

// GET /api/student/quizzes — published only
// Supports ?type=topic_quiz|mock_exam (default: topic_quiz)
// Supports ?course_id=X (filter topic_quiz by course)
// Supports ?topic_id=X (filter topic_quiz by topic)
// Returns attempt stats: my_attempts, my_best_score, my_best_max
studentRouter.get('/', requireAuth, (req, res) => {
  const { topic_id, course_id, type = 'topic_quiz' } = req.query;
  const sid = req.user.id;

  const statsSql = `
    SELECT q.*,
           t.title AS topic_title,
           (SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id = q.id) AS questions_count,
           (SELECT COUNT(*) FROM quiz_attempts qa
             WHERE qa.quiz_id = q.id AND qa.student_id = ?) AS my_attempts,
           (SELECT MAX(qa.score) FROM quiz_attempts qa
             WHERE qa.quiz_id = q.id AND qa.student_id = ? AND qa.status = 'completed') AS my_best_score,
           (SELECT qa.max_score FROM quiz_attempts qa
             WHERE qa.quiz_id = q.id AND qa.student_id = ? AND qa.status = 'completed'
             ORDER BY qa.score DESC LIMIT 1) AS my_best_max
      FROM quizzes q
      LEFT JOIN topics t ON t.id = q.topic_id
     WHERE q.status = 'published'
  `;
  const params = [sid, sid, sid];

  if (type === 'mock_exam') {
    const isFreeUser = req.user.subscription_tier === 'free' && req.user.role === 'student';
    if (isFreeUser) return res.json([]);

    params.push(sid);
    const quizzes = db.prepare(statsSql + `
      AND q.type = 'mock_exam'
      AND (
        NOT EXISTS (SELECT 1 FROM mock_exam_students mes WHERE mes.quiz_id = q.id)
        OR EXISTS (SELECT 1 FROM mock_exam_students mes WHERE mes.quiz_id = q.id AND mes.student_id = ?)
      )
      ORDER BY q.created_at DESC
    `).all(...params);
    return res.json(quizzes);
  }

  // topic_quiz (default)
  let extraSql = " AND q.type = 'topic_quiz'";
  if (topic_id) { extraSql += ' AND q.topic_id = ?'; params.push(Number(topic_id)); }
  if (course_id) {
    extraSql += ' AND q.topic_id IN (SELECT id FROM topics WHERE course_id = ?)';
    params.push(Number(course_id));
  }
  extraSql += ' ORDER BY t.position, q.created_at';

  const quizzes = db.prepare(statsSql + extraSql).all(...params);
  return res.json(quizzes);
});

// GET /api/student/quizzes/:id
studentRouter.get('/:id', requireAuth, (req, res) => {
  const quiz = loadQuizWithQuestions(req.params.id, { hideCorrect: true });
  if (!quiz || quiz.status !== 'published') return res.status(404).json({ error: 'Quiz not found' });
  return res.json(quiz);
});

// GET /api/student/quizzes/:id/attempts — student's own attempts
studentRouter.get('/:id/attempts', requireAuth, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz) return res.status(404).json({ error: 'Quiz not found' });

  const attempts = db.prepare(`
    SELECT * FROM quiz_attempts
     WHERE quiz_id = ? AND student_id = ?
     ORDER BY attempt_number
  `).all(req.params.id, req.user.id);

  return res.json(attempts);
});

// POST /api/student/quizzes/:id/attempts — start new attempt
studentRouter.post('/:id/attempts', requireAuth, (req, res) => {
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(req.params.id);
  if (!quiz || quiz.status !== 'published') return res.status(404).json({ error: 'Quiz not found' });

  // ─── Assignment gate ─────────────────────────────────────────────────────
  // If quiz has any assignments, only assigned students may attempt it.
  const assignmentCount = db.prepare(
    'SELECT COUNT(*) AS cnt FROM quiz_assignments WHERE quiz_id = ?'
  ).get(quiz.id).cnt;
  if (assignmentCount > 0) {
    const isAssigned = db.prepare(
      'SELECT id FROM quiz_assignments WHERE quiz_id = ? AND student_id = ?'
    ).get(quiz.id, req.user.id);
    if (!isAssigned) {
      return res.status(403).json({ error: 'This quiz has been assigned to specific students only.' });
    }
  }

  // ─── Homework deadline check ─────────────────────────────────────────────
  if (quiz.type === 'homework') {
    if (quiz.due_date && new Date(quiz.due_date) < new Date()) {
      return res.status(403).json({ error: 'Rok za predaju ove domaće zadaće je prošao.' });
    }
    // homework: check for in-progress attempt (can't have two at once)
    const inProgress = db.prepare(`
      SELECT * FROM quiz_attempts
       WHERE quiz_id = ? AND student_id = ? AND status = 'in_progress'
    `).get(quiz.id, req.user.id);
    if (inProgress) {
      return res.status(409).json({ error: 'You have an attempt in progress. Submit it before starting a new one.' });
    }
  } else if (quiz.type === 'mock_exam') {
    // Must be premium
    if (req.user.subscription_tier !== 'premium') {
      return res.status(403).json({ error: 'Mock ispiti su dostupni samo Premium korisnicima.' });
    }

    // Check existing attempt (mock exams allow exactly 1)
    const existing = db.prepare(
      'SELECT id FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?'
    ).get(quiz.id, req.user.id);
    if (existing) {
      return res.status(409).json({ error: 'You already have an attempt for this mock exam.' });
    }

    if (quiz.is_example) {
      // Example exam: student must be on the hand-picked list
      const granted = db.prepare(
        'SELECT id FROM mock_exam_students WHERE quiz_id = ? AND student_id = ?'
      ).get(quiz.id, req.user.id);
      if (!granted) {
        return res.status(403).json({ error: 'You are not on the access list for this mock exam.' });
      }
    } else {
      // Scheduled exam: check time window
      const now = new Date();
      if (quiz.scheduled_start && new Date(quiz.scheduled_start) > now) {
        return res.status(403).json({ error: 'Mock exam not yet available. Check scheduled window.' });
      }
      if (quiz.scheduled_end && new Date(quiz.scheduled_end) < now) {
        return res.status(403).json({ error: 'Mock exam window has ended.' });
      }
    }
  } else {
    // Regular quiz: check for in-progress attempt and max_attempts
    const inProgress = db.prepare(`
      SELECT * FROM quiz_attempts
       WHERE quiz_id = ? AND student_id = ? AND status = 'in_progress'
    `).get(quiz.id, req.user.id);
    if (inProgress) {
      return res.status(409).json({ error: 'You have an attempt in progress. Submit it before starting a new one.' });
    }

    const completedCount = db.prepare(`
      SELECT COUNT(*) AS cnt FROM quiz_attempts
       WHERE quiz_id = ? AND student_id = ? AND status != 'in_progress'
    `).get(quiz.id, req.user.id).cnt;

    if (quiz.max_attempts !== null && completedCount >= quiz.max_attempts) {
      return res.status(403).json({ error: `Maximum attempts (${quiz.max_attempts}) reached.` });
    }
  }

  // ─── Create attempt ───────────────────────────────────────────────────────
  const existingCount = db.prepare(
    'SELECT COUNT(*) AS cnt FROM quiz_attempts WHERE quiz_id = ? AND student_id = ?'
  ).get(quiz.id, req.user.id).cnt;

  const maxScore = db.prepare(`
    SELECT SUM(COALESCE(qq.points_override, q.max_points)) AS total
      FROM quiz_questions qq
      JOIN questions q ON qq.question_id = q.id
     WHERE qq.quiz_id = ?
  `).get(quiz.id).total || 0;

  const attemptNumber = existingCount + 1;
  const { lastInsertRowid } = db.prepare(`
    INSERT INTO quiz_attempts (quiz_id, student_id, attempt_number, max_score)
    VALUES (?, ?, ?, ?)
  `).run(quiz.id, req.user.id, attemptNumber, maxScore);

  // Build and store shuffled option orders for this attempt
  const quizQuestions = db.prepare(
    'SELECT question_id AS id FROM quiz_questions WHERE quiz_id = ? ORDER BY position'
  ).all(quiz.id);
  const optionOrders = buildOptionOrders(
    lastInsertRowid,
    quizQuestions,
    qId => db.prepare('SELECT id FROM question_options WHERE question_id = ? ORDER BY position').all(qId).map(o => o.id)
  );
  db.prepare('UPDATE quiz_attempts SET option_orders = ? WHERE id = ?').run(optionOrders, lastInsertRowid);

  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(lastInsertRowid);
  return res.status(201).json(attempt);
});

// ─── Attempt routes (student) ─────────────────────────────────────────────────

const attemptRouter = express.Router();

// POST /api/student/attempts/:id/submit
attemptRouter.post('/:id/submit', requireAuth, (req, res) => {
  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(req.params.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.student_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
  if (attempt.status !== 'in_progress') return res.status(409).json({ error: 'Attempt already submitted' });

  // For mock exams with a time limit, enforce grace period deadline
  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(attempt.quiz_id);
  if (quiz && quiz.type === 'mock_exam' && quiz.time_limit_minutes) {
    const startedAt = new Date(attempt.started_at).getTime();
    const deadline = startedAt + (quiz.time_limit_minutes * 60 + quiz.grace_period_seconds) * 1000;
    if (Date.now() > deadline) {
      return res.status(409).json({ error: 'Time expired. Submission deadline has passed.' });
    }
  }

  const { answers = [] } = req.body;

  // Load quiz questions (with points overrides)
  const quizQuestions = db.prepare(`
    SELECT qq.points_override, q.*
      FROM quiz_questions qq
      JOIN questions q ON qq.question_id = q.id
     WHERE qq.quiz_id = ?
  `).all(attempt.quiz_id);

  const insertAnswer = db.prepare(`
    INSERT INTO quiz_attempt_answers
      (attempt_id, question_id, answer_data, is_correct, points_earned, graded_at, graded_by,
       ai_suggested_points, ai_feedback, ai_graded_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const AI_GRADED_TYPES = ['short_answer', 'chem_equation'];

  let totalScore = 0;
  const gradedAnswers = [];

  const submit = db.transaction(() => {
    for (const qq of quizQuestions) {
      const submitted = answers.find(a => a.question_id === qq.id);
      const answerData = submitted ? submitted.answer_data : {};

      let isCorrect = null;
      let pointsEarned = null;
      let gradedAt = null;
      let gradedBy = null;
      let aiSuggestedPoints = null;
      let aiFeedback = null;
      let aiGradedAt = null;

      const autoResult = autoGrade(qq, answerData);

      if (autoResult !== null) {
        // MCQ, true_false, fill_blank — immediate auto-grade
        isCorrect = autoResult.is_correct;
        pointsEarned = autoResult.points_earned;
        gradedAt = new Date().toISOString();
        totalScore += pointsEarned;
      } else if (AI_GRADED_TYPES.includes(qq.type)) {
        // short_answer, chem_equation — AI grading
        const effectiveQuestion = { ...qq, max_points: qq.points_override ?? qq.max_points };
        const aiResult = gradeAnswer(effectiveQuestion, answerData);
        aiSuggestedPoints = aiResult.suggested_points;
        aiFeedback = aiResult.feedback;
        aiGradedAt = new Date().toISOString();

        // AI grade becomes the working score (teacher may later override)
        pointsEarned = aiSuggestedPoints;
        isCorrect = pointsEarned >= (effectiveQuestion.max_points * 0.5) ? true : false;
        gradedAt = aiGradedAt;
        totalScore += pointsEarned;
      }

      const { lastInsertRowid: answerId } = insertAnswer.run(
        attempt.id, qq.id,
        JSON.stringify(answerData),
        isCorrect === null ? null : (isCorrect ? 1 : 0),
        pointsEarned, gradedAt, gradedBy,
        aiSuggestedPoints, aiFeedback, aiGradedAt
      );

      gradedAnswers.push({
        id: answerId,
        question_id: qq.id,
        answer_data: answerData,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        ai_suggested_points: aiSuggestedPoints,
        ai_feedback: aiFeedback,
      });
    }

    // All answers are now graded (either auto, AI, or skipped) — status → graded
    db.prepare(`
      UPDATE quiz_attempts
         SET status = 'graded', score = ?, submitted_at = datetime('now'),
             graded_at = datetime('now')
       WHERE id = ?
    `).run(totalScore, attempt.id);
  });

  submit();

  // Auto-issue certificate if eligible (topic_quiz, score >= 70%, all lessons done)
  try {
    checkAndIssueCertificate(req.user.id, attempt.id);
  } catch (_) {
    // Certificate check is non-critical — never block the submit response
  }

  const updated = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attempt.id);
  return res.json({ ...updated, answers: gradedAnswers });
});

// GET /api/student/attempts/:id
attemptRouter.get('/:id', requireAuth, (req, res) => {
  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(req.params.id);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });
  if (attempt.student_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

  const optionOrders = attempt.option_orders ? JSON.parse(attempt.option_orders) : {};

  const rawAnswers = db.prepare(`
    SELECT qaa.*, q.type, q.stem, q.explanation, q.max_points
      FROM quiz_attempt_answers qaa
      JOIN questions q ON qaa.question_id = q.id
     WHERE qaa.attempt_id = ?
  `).all(attempt.id);

  const answers = rawAnswers.map(row => {
    // After submission, reveal correct answers; apply stored shuffle order
    const rawOptions = db.prepare('SELECT * FROM question_options WHERE question_id = ? ORDER BY position').all(row.question_id);
    const parsedOptions = rawOptions.map(o => ({
      id: o.id,
      text: o.text,
      is_correct: o.is_correct === 1,
      points: o.points,
      position: o.position,
    }));
    const orderedOptions = applyOptionOrder(parsedOptions, optionOrders[String(row.question_id)]);

    return {
      id: row.id,
      question_id: row.question_id,
      answer_data: JSON.parse(row.answer_data || '{}'),
      is_correct: row.is_correct === null ? null : row.is_correct === 1,
      points_earned: row.points_earned,
      ai_suggested_points: row.ai_suggested_points !== undefined ? row.ai_suggested_points : null,
      ai_feedback: row.ai_feedback || null,
      question: {
        type: row.type,
        stem: row.stem,
        explanation: row.explanation,
        max_points: row.max_points,
        options: orderedOptions,
      },
    };
  });

  return res.json({ ...attempt, answers });
});

module.exports = { teacherRouter, studentRouter, attemptRouter };
