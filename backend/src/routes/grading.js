/**
 * Teacher grading endpoints.
 *
 * PATCH /api/teacher/attempts/:attemptId/answers/:answerId/grade
 *   — Teacher sets final score + feedback for an answer.
 *   — If AI previously suggested a score, and teacher assigns a different one,
 *     the delta is logged to ai_grading_corrections so the AI can learn.
 *
 * GET /api/teacher/attempts/:attemptId
 *   — Teacher views a full attempt (student answers + AI suggestions).
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireTeacher } = require('../middleware/auth');
const { applyOptionOrder } = require('../utils/shuffle');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Recalculate attempt score from all graded answers.
 * Returns the sum of points_earned where not NULL.
 */
function recalcAttemptScore(attemptId) {
  const row = db
    .prepare('SELECT SUM(points_earned) AS total FROM quiz_attempt_answers WHERE attempt_id = ?')
    .get(attemptId);
  return row.total || 0;
}

/**
 * Check if all answers in an attempt are now graded.
 */
function allAnswersGraded(attemptId) {
  const ungraded = db
    .prepare('SELECT COUNT(*) AS cnt FROM quiz_attempt_answers WHERE attempt_id = ? AND points_earned IS NULL')
    .get(attemptId);
  return ungraded.cnt === 0;
}

// ─── PATCH /api/teacher/attempts/:attemptId/answers/:answerId/grade ───────────

router.patch('/:attemptId/answers/:answerId/grade', requireTeacher, (req, res) => {
  const { attemptId, answerId } = req.params;
  const { points_earned, is_correct, feedback } = req.body;

  if (points_earned === undefined || points_earned === null) {
    return res.status(400).json({ error: 'points_earned is required' });
  }
  if (typeof points_earned !== 'number' || points_earned < 0) {
    return res.status(400).json({ error: 'points_earned must be a non-negative number' });
  }

  // Load attempt
  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  // Load answer
  const answer = db.prepare('SELECT * FROM quiz_attempt_answers WHERE id = ? AND attempt_id = ?')
    .get(answerId, attemptId);
  if (!answer) return res.status(404).json({ error: 'Answer not found' });

  // Load question to check max_points
  const question = db.prepare('SELECT * FROM questions WHERE id = ?').get(answer.question_id);
  const quizQ = db.prepare('SELECT points_override FROM quiz_questions WHERE quiz_id = ? AND question_id = ?')
    .get(attempt.quiz_id, answer.question_id);
  const maxPoints = (quizQ && quizQ.points_override != null) ? quizQ.points_override : question.max_points;

  if (points_earned > maxPoints) {
    return res.status(400).json({ error: `points_earned (${points_earned}) exceeds max_points (${maxPoints})` });
  }

  const isCorrectVal = is_correct === true || is_correct === 1 ? 1 : 0;

  // Log correction if AI had previously suggested a different score
  const aiPoints = answer.ai_suggested_points;
  if (aiPoints !== null && aiPoints !== undefined && aiPoints !== points_earned) {
    const answerText = (() => {
      try { return JSON.parse(answer.answer_data).text || ''; } catch { return ''; }
    })();
    db.prepare(`
      INSERT INTO ai_grading_corrections
        (question_id, answer_text, ai_points, teacher_points, teacher_feedback)
      VALUES (?, ?, ?, ?, ?)
    `).run(answer.question_id, answerText, aiPoints, points_earned, feedback || null);
  }

  // Update the answer
  db.prepare(`
    UPDATE quiz_attempt_answers
       SET is_correct   = ?,
           points_earned = ?,
           graded_at    = datetime('now'),
           graded_by    = ?
     WHERE id = ?
  `).run(isCorrectVal, points_earned, req.user.id, answerId);

  // Recalculate attempt score; mark graded if all answers now graded
  const newScore = recalcAttemptScore(attemptId);
  const fullyGraded = allAnswersGraded(attemptId);

  db.prepare(`
    UPDATE quiz_attempts
       SET score    = ?,
           status   = CASE WHEN ? THEN 'graded' ELSE status END,
           graded_at = CASE WHEN ? THEN datetime('now') ELSE graded_at END
     WHERE id = ?
  `).run(newScore, fullyGraded ? 1 : 0, fullyGraded ? 1 : 0, attemptId);

  const updatedAnswer = db.prepare('SELECT * FROM quiz_attempt_answers WHERE id = ?').get(answerId);
  const updatedAttempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);

  return res.json({
    attempt: updatedAttempt,
    answer: {
      ...updatedAnswer,
      is_correct: updatedAnswer.is_correct === null ? null : updatedAnswer.is_correct === 1,
    },
  });
});

// ─── GET /api/teacher/attempts/:attemptId ─────────────────────────────────────

router.get('/:attemptId', requireTeacher, (req, res) => {
  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  const optionOrders = attempt.option_orders ? JSON.parse(attempt.option_orders) : {};

  const rawAnswers = db.prepare(`
    SELECT qaa.*, q.type, q.stem, q.explanation, q.max_points
      FROM quiz_attempt_answers qaa
      JOIN questions q ON qaa.question_id = q.id
     WHERE qaa.attempt_id = ?
  `).all(req.params.attemptId);

  const answers = rawAnswers.map(row => {
    const rawOptions = db
      .prepare('SELECT * FROM question_options WHERE question_id = ? ORDER BY position')
      .all(row.question_id);

    const parsedOptions = rawOptions.map(o => ({
      id: o.id,
      text: o.text,
      is_correct: o.is_correct === 1,
      points: o.points,
      keywords: JSON.parse(o.keywords || '[]'),
      position: o.position,
    }));
    const orderedOptions = applyOptionOrder(parsedOptions, optionOrders[String(row.question_id)]);

    return {
      id: row.id,
      question_id: row.question_id,
      answer_data: JSON.parse(row.answer_data || '{}'),
      is_correct: row.is_correct === null ? null : row.is_correct === 1,
      points_earned: row.points_earned,
      graded_at: row.graded_at,
      graded_by: row.graded_by,
      ai_suggested_points: row.ai_suggested_points,
      ai_feedback: row.ai_feedback,
      ai_graded_at: row.ai_graded_at,
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

// ─── PATCH /api/teacher/attempts/:attemptId/feedback ─────────────────────────

router.patch('/:attemptId/feedback', requireTeacher, (req, res) => {
  const { teacher_feedback } = req.body;

  if (teacher_feedback === undefined) {
    return res.status(400).json({ error: 'teacher_feedback is required' });
  }

  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(req.params.attemptId);
  if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

  db.prepare("UPDATE quiz_attempts SET teacher_feedback = ? WHERE id = ?")
    .run(teacher_feedback, req.params.attemptId);

  const updated = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(req.params.attemptId);
  return res.json({ attempt: updated });
});

module.exports = router;
