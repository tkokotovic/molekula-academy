/**
 * Certificate service (Step 39)
 *
 * A certificate is issued for a topic when ALL of:
 *  1. The quiz is of type 'topic_quiz'
 *  2. The attempt's score >= 70% of max_score
 *  3. The student has completed ALL published lessons in that topic
 *
 * One certificate per (student, topic) — duplicates are silently ignored.
 */

const db = require('../db');
const { sendCertificateEmail } = require('./email');

const PASS_THRESHOLD = 0.70; // 70%

/**
 * Check eligibility and, if met, insert a certificate row.
 *
 * @param {number} studentId
 * @param {number} attemptId  - the just-submitted quiz_attempts.id
 * @returns {boolean}         - true if a certificate was issued (or already existed)
 */
function checkAndIssueCertificate(studentId, attemptId) {
  const attempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);
  if (!attempt) return false;

  const quiz = db.prepare('SELECT * FROM quizzes WHERE id = ?').get(attempt.quiz_id);
  if (!quiz || quiz.type !== 'topic_quiz') return false;
  if (!quiz.topic_id) return false;

  // 1. Score threshold
  const maxScore = attempt.max_score;
  if (!maxScore || maxScore === 0) return false;
  const pct = (attempt.score ?? 0) / maxScore;
  if (pct < PASS_THRESHOLD) return false;

  // 2. All published lessons in topic completed
  const totalPublished = db.prepare(`
    SELECT COUNT(*) AS cnt
      FROM lessons
     WHERE topic_id = ? AND status = 'published'
  `).get(quiz.topic_id).cnt;

  if (totalPublished === 0) return false; // no lessons = no certificate

  const completed = db.prepare(`
    SELECT COUNT(*) AS cnt
      FROM lesson_progress lp
      JOIN lessons l ON lp.lesson_id = l.id
     WHERE lp.student_id = ?
       AND l.topic_id = ?
       AND l.status = 'published'
       AND lp.status = 'completed'
  `).get(studentId, quiz.topic_id).cnt;

  if (completed < totalPublished) return false;

  // 3. Insert certificate (ignore if already exists — UNIQUE constraint)
  try {
    db.prepare(`
      INSERT INTO certificates (student_id, topic_id, quiz_attempt_id)
      VALUES (?, ?, ?)
    `).run(studentId, quiz.topic_id, attemptId);

    // Step 59b: notify student
    const student = db.prepare('SELECT name, email FROM users WHERE id = ?').get(studentId);
    const topic   = db.prepare('SELECT name FROM topics WHERE id = ?').get(quiz.topic_id);
    if (student && topic) {
      sendCertificateEmail({ studentName: student.name, studentEmail: student.email, topicName: topic.name });
    }

    return true;
  } catch (e) {
    // UNIQUE constraint violation = already earned; that's fine
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE' || (e.message && e.message.includes('UNIQUE'))) {
      return true;
    }
    throw e;
  }
}

module.exports = { checkAndIssueCertificate };
