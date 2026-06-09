/**
 * AI Grading Service
 *
 * Grades short_answer and chem_equation answers.
 *
 * Current implementation: keyword-based heuristic, designed to be
 * swapped for a real LLM call (e.g. Claude API) when ready.
 *
 * Returns: { suggested_points: number, feedback: string }
 *
 * The service also loads past teacher corrections for the same question
 * and uses them to calibrate scoring — this is the "learning" mechanism.
 * When wired to a real LLM, corrections become few-shot examples in the prompt.
 */

const db = require('../db');

/**
 * Grade a student answer for a short_answer or chem_equation question.
 *
 * @param {object} question   - full question row (with points_override applied as max_points)
 * @param {object} answerData - { text: string }
 * @returns {{ suggested_points: number, feedback: string }}
 */
function gradeAnswer(question, answerData) {
  const text = (answerData.text || '').trim().toLowerCase();
  const maxPoints = question.max_points;

  if (!text) {
    return { suggested_points: 0, feedback: 'No answer provided.' };
  }

  // Load options/keywords for this question
  const options = db
    .prepare('SELECT * FROM question_options WHERE question_id = ? ORDER BY position')
    .all(question.id);

  // Load past teacher corrections for calibration
  const corrections = db
    .prepare('SELECT * FROM ai_grading_corrections WHERE question_id = ? ORDER BY created_at DESC LIMIT 20')
    .all(question.id);

  // ── Keyword scoring ───────────────────────────────────────────────────────
  // Each option has keywords. Match keywords → earn that option's points.
  // Cap at max_points.
  let earnedPoints = 0;
  const matchedConcepts = [];
  const missingConcepts = [];

  for (const opt of options) {
    const keywords = JSON.parse(opt.keywords || '[]');
    const hit =
      keywords.some(kw => text.includes(kw.toLowerCase())) ||
      text.includes(opt.text.toLowerCase());

    if (hit) {
      earnedPoints += opt.points;
      matchedConcepts.push(opt.text);
    } else if (opt.is_correct) {
      missingConcepts.push(opt.text);
    }
  }

  earnedPoints = Math.min(earnedPoints, maxPoints);

  // ── Correction-based calibration ──────────────────────────────────────────
  // If teacher has previously corrected answers that are similar to this one,
  // nudge our score toward the teacher's historical average.
  if (corrections.length > 0) {
    const similar = corrections.filter(c => {
      const cText = (c.answer_text || '').toLowerCase();
      // Simple similarity: at least one shared word longer than 4 chars
      const words = text.split(/\s+/).filter(w => w.length > 4);
      return words.some(w => cText.includes(w));
    });

    if (similar.length > 0) {
      const avgTeacherRatio =
        similar.reduce((sum, c) => sum + c.teacher_points / maxPoints, 0) /
        similar.length;
      // Blend: 70% keyword score, 30% correction signal
      const keywordRatio = earnedPoints / maxPoints;
      const blendedRatio = keywordRatio * 0.7 + avgTeacherRatio * 0.3;
      earnedPoints = Math.round(blendedRatio * maxPoints * 2) / 2; // round to 0.5
      earnedPoints = Math.max(0, Math.min(earnedPoints, maxPoints));
    }
  }

  // ── Feedback ──────────────────────────────────────────────────────────────
  let feedback;
  if (earnedPoints >= maxPoints) {
    feedback = 'Excellent answer — all key concepts covered.';
  } else if (earnedPoints > 0) {
    const parts = [];
    if (matchedConcepts.length > 0) {
      parts.push(`Mentioned: ${matchedConcepts.join(', ')}.`);
    }
    if (missingConcepts.length > 0) {
      parts.push(`Could also include: ${missingConcepts.join(', ')}.`);
    }
    feedback = parts.join(' ') || 'Partial credit awarded.';
  } else {
    const hint = missingConcepts.length > 0
      ? `Key concepts to mention: ${missingConcepts.join(', ')}.`
      : 'Answer does not match the expected concepts.';
    feedback = hint;
  }

  return { suggested_points: earnedPoints, feedback };
}

module.exports = { gradeAnswer };
