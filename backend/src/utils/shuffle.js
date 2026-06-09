/**
 * Deterministic Fisher-Yates shuffle using a 32-bit LCG seed.
 * Same seed → always same output order.
 *
 * @param {Array}  arr   - array to shuffle (not mutated)
 * @param {number} seed  - integer seed
 * @returns {Array}      - new shuffled array
 */
function seededShuffle(arr, seed) {
  const result = [...arr];
  let s = seed >>> 0; // ensure unsigned 32-bit
  for (let i = result.length - 1; i > 0; i--) {
    s = ((Math.imul(s, 1664525) + 1013904223) | 0) >>> 0;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Build option_orders JSON for an attempt.
 * For each question in the quiz, shuffles its option ids using a seed
 * derived from attemptId and questionId so the order is deterministic
 * and unique per (attempt, question) pair.
 *
 * @param {number} attemptId
 * @param {Array}  quizQuestions  - rows with at least { id } (question id)
 * @param {Function} getOptionIds - (questionId) => number[]
 * @returns {string}  JSON string: { [questionId]: [optionId, ...] }
 */
function buildOptionOrders(attemptId, quizQuestions, getOptionIds) {
  const orders = {};
  for (const qq of quizQuestions) {
    const optionIds = getOptionIds(qq.id);
    if (optionIds.length > 0) {
      const seed = ((attemptId * 31) ^ qq.id) >>> 0;
      orders[qq.id] = seededShuffle(optionIds, seed);
    }
  }
  return JSON.stringify(orders);
}

/**
 * Reorder an options array according to stored option_orders for one question.
 * If no order stored, returns original array.
 *
 * @param {Array}       options    - option objects with { id }
 * @param {number[]}    orderedIds - from option_orders[questionId]
 * @returns {Array}
 */
function applyOptionOrder(options, orderedIds) {
  if (!orderedIds || orderedIds.length === 0) return options;
  const map = new Map(options.map(o => [o.id, o]));
  return orderedIds.map(id => map.get(id)).filter(Boolean);
}

module.exports = { seededShuffle, buildOptionOrders, applyOptionOrder };
