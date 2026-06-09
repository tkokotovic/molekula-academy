/**
 * AI Answer Generation Service
 *
 * Called when a teacher creates a question without providing a correct answer.
 * Generates suggested answers/options so the question can enter the
 * ai_generated_pending_approval review queue.
 *
 * Current implementation: heuristic stub.
 * Replace generateForQuestion() with a real Claude API call when ready.
 *
 * Exports:
 *   needsGeneration(type, options, modelAnswer) → boolean
 *   generateForQuestion(question, options)      → { suggestedOptionIndex, modelAnswer }
 */

/**
 * Returns true if the question has no correct answer provided.
 *
 * @param {string}  type         - question type
 * @param {Array}   options      - option objects with is_correct flag
 * @param {string|null} modelAnswer - teacher-provided model answer (may be null)
 */
function needsGeneration(type, options = [], modelAnswer = null) {
  const hasCorrectOption = options.some(o => o.is_correct);
  const hasModelAnswer   = modelAnswer != null && String(modelAnswer).trim().length > 0;

  if (type === 'mcq' || type === 'true_false') {
    // Must have at least one option marked correct
    return !hasCorrectOption;
  }

  if (type === 'short_answer' || type === 'fill_blank' || type === 'chem_equation') {
    // Model answer OR a correct-marked keyword option counts
    return !hasCorrectOption && !hasModelAnswer;
  }

  return false;
}

/**
 * Generate a suggested answer for a question that has no correct answer.
 *
 * @param {{ type: string, stem: string, max_points: number }} question
 * @param {Array} options  - array of { text, is_correct, points, keywords }
 * @returns {{ suggestedOptionIndex: number|null, modelAnswer: string|null }}
 *
 * suggestedOptionIndex: for MCQ/T-F — index into options array to mark as correct
 * modelAnswer: for text types — generated reference answer string
 */
function generateForQuestion(question, options = []) {
  const { type, stem = '' } = question;

  // ── MCQ / True–False ──────────────────────────────────────────────────────
  if (type === 'mcq' || type === 'true_false') {
    if (options.length === 0) {
      return { suggestedOptionIndex: null, modelAnswer: null };
    }

    // Heuristic: find the option whose text shares most words with the stem.
    // Falls back to index 0 if no overlap found.
    const stemWords = stem.toLowerCase().split(/\W+/).filter(w => w.length > 2);

    let bestIdx = 0;
    let bestScore = -1;

    options.forEach((opt, i) => {
      const optWords = (opt.text || '').toLowerCase().split(/\W+/);
      const overlap = optWords.filter(w => stemWords.includes(w)).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestIdx = i;
      }
    });

    return { suggestedOptionIndex: bestIdx, modelAnswer: null };
  }

  // ── Short answer / fill_blank / chem_equation ────────────────────────────
  const preview = stem.length > 120 ? stem.slice(0, 117) + '…' : stem;
  const modelAnswer = `[AI suggestion — review required] ${preview}`;

  return { suggestedOptionIndex: null, modelAnswer };
}

module.exports = { needsGeneration, generateForQuestion };
