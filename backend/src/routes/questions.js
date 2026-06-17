const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const { needsGeneration, generateForQuestion } = require('../services/aiAnswerGeneration');

// All routes require teacher role
router.use(requireAuth, requireTeacher);

const VALID_TYPES = ['true_false', 'mcq', 'fill_blank', 'short_answer', 'chem_equation'];
const VALID_DIFFICULTIES = ['easy', 'medium', 'hard', 'multi_topic'];
const VALID_STATUSES = ['pending_approval', 'approved', 'rejected', 'archived', 'ai_generated_pending_approval'];
const VALID_SOURCE_TYPES = ['teacher', 'past_exam', 'entrance_exam', 'uni_exam'];
const VALID_IB_LEVELS = ['HL', 'SL', 'both'];
const VALID_CATEGORIES = ['ib_sl', 'ib_hl', 'drzavna_matura', 'prijemni', 'medchem_1', 'medchem_2'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseQuestion(row) {
  if (!row) return null;
  return {
    ...row,
    model_answer: row.model_answer ?? null,
    ib_paper: row.ib_paper ?? null,
    source_year: row.source_year ?? null,
    source_month: row.source_month ?? null,
    syllabus_item_ids: JSON.parse(row.syllabus_item_ids || '[]'),
    stem_blocks: row.stem_blocks ? JSON.parse(row.stem_blocks) : null,
  };
}

function getOptions(questionId) {
  return db.prepare(`
    SELECT id, text, is_correct, points, keywords, position, is_ai_suggested
    FROM question_options
    WHERE question_id = ?
    ORDER BY position
  `).all(questionId).map(o => ({
    ...o,
    is_correct: o.is_correct === 1,
    is_ai_suggested: o.is_ai_suggested === 1,
    keywords: JSON.parse(o.keywords || '[]'),
  }));
}

function getCategories(questionId) {
  return db.prepare('SELECT category FROM question_categories WHERE question_id = ? ORDER BY category')
    .all(questionId).map(r => r.category);
}

function getSyllabusCodes(questionId) {
  return db.prepare('SELECT category, code FROM question_syllabus_codes WHERE question_id = ? ORDER BY category, code')
    .all(questionId);
}

function setCategories(questionId, categories = []) {
  db.prepare('DELETE FROM question_categories WHERE question_id = ?').run(questionId);
  const ins = db.prepare('INSERT OR IGNORE INTO question_categories (question_id, category) VALUES (?, ?)');
  for (const cat of categories) {
    if (VALID_CATEGORIES.includes(cat)) ins.run(questionId, cat);
  }
}

function setSyllabusCodes(questionId, codes = []) {
  db.prepare('DELETE FROM question_syllabus_codes WHERE question_id = ?').run(questionId);
  const ins = db.prepare('INSERT OR IGNORE INTO question_syllabus_codes (question_id, category, code) VALUES (?, ?, ?)');
  for (const { category, code } of codes) {
    if (category && code && VALID_CATEGORIES.includes(category)) ins.run(questionId, category, code);
  }
}

function attachMeta(question) {
  question.categories = getCategories(question.id);
  question.syllabus_codes = getSyllabusCodes(question.id);
  return question;
}

function insertOptions(questionId, options = [], aiSuggestedIndex = null) {
  const stmt = db.prepare(`
    INSERT INTO question_options
      (question_id, text, is_correct, points, keywords, position, is_ai_suggested)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  options.forEach((opt, i) => {
    stmt.run(
      questionId,
      opt.text,
      opt.is_correct ? 1 : 0,
      opt.points ?? (opt.is_correct ? 1 : 0),
      JSON.stringify(opt.keywords ?? []),
      i,
      (opt.is_ai_suggested || i === aiSuggestedIndex) ? 1 : 0
    );
  });
}

// ─── POST /api/teacher/questions/import ──────────────────────────────────────

router.post('/import', (req, res) => {
  const { questions } = req.body;

  if (!Array.isArray(questions) || questions.length === 0)
    return res.status(400).json({ error: 'questions array is required and must not be empty' });

  // Validate all questions before inserting any (atomic import)
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q.type || !VALID_TYPES.includes(q.type))
      return res.status(400).json({ error: `Invalid type at index ${i}: must be one of ${VALID_TYPES.join(', ')}` });
    if (!q.stem)
      return res.status(400).json({ error: `Missing stem at index ${i}` });
  }

  const batchId = crypto.randomUUID();

  const insertBatch = db.transaction(() => {
    db.prepare(`
      INSERT INTO question_import_batches (id, imported_by, total_count)
      VALUES (?, ?, ?)
    `).run(batchId, req.user.id, questions.length);

    const inserted = [];
    for (const q of questions) {
      const { lastInsertRowid } = db.prepare(`
        INSERT INTO questions
          (type, stem, explanation, difficulty, max_points, ib_level, ib_paper,
           source_type, source_year, source_month, source_label,
           topic_id, syllabus_item_ids, status, import_batch_id, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_approval', ?, ?)
      `).run(
        q.type, q.stem, q.explanation ?? null,
        q.difficulty ?? 'medium', q.max_points ?? 1,
        q.ib_level ?? null, q.ib_paper ?? null,
        q.source_type ?? 'teacher',
        q.source_year ?? null, q.source_month ?? null, q.source_label ?? null,
        q.topic_id ?? null, JSON.stringify(q.syllabus_item_ids ?? []),
        batchId, req.user.id
      );
      insertOptions(lastInsertRowid, q.options ?? []);
      setCategories(lastInsertRowid, q.categories ?? []);
      setSyllabusCodes(lastInsertRowid, q.syllabus_codes ?? []);
      inserted.push(lastInsertRowid);
    }
    return inserted;
  });

  const ids = insertBatch();
  const importedQuestions = ids.map(id => {
    const q = attachMeta(parseQuestion(db.prepare('SELECT * FROM questions WHERE id = ?').get(id)));
    q.options = getOptions(id);
    return q;
  });

  return res.status(201).json({
    batch_id: batchId,
    imported_count: importedQuestions.length,
    questions: importedQuestions,
  });
});

// ─── GET /api/teacher/questions/import/:batchId ───────────────────────────────

router.get('/import/:batchId', (req, res) => {
  const batch = db.prepare('SELECT * FROM question_import_batches WHERE id = ?').get(req.params.batchId);
  if (!batch) return res.status(404).json({ error: 'Import batch not found' });

  const rows = db.prepare('SELECT * FROM questions WHERE import_batch_id = ? ORDER BY id').all(req.params.batchId);
  const questions = rows.map(r => {
    const q = parseQuestion(r);
    q.options = getOptions(r.id);
    return q;
  });

  return res.json({ batch, questions });
});

// ─── POST /api/teacher/questions ─────────────────────────────────────────────

router.post('/', (req, res) => {
  const {
    type, stem, explanation, difficulty = 'medium',
    max_points = 1, ib_level, ib_paper,
    source_type = 'teacher', source_year, source_month, source_label,
    topic_id, syllabus_item_ids = [],
    options = [],
    model_answer = null,
    categories = [],
    syllabus_codes = [],
    stem_blocks = null,
  } = req.body;

  if (!stem) return res.status(400).json({ error: 'stem is required' });
  if (!type || !VALID_TYPES.includes(type))
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  if (!VALID_DIFFICULTIES.includes(difficulty))
    return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });
  if (ib_level && !VALID_IB_LEVELS.includes(ib_level))
    return res.status(400).json({ error: `ib_level must be one of: ${VALID_IB_LEVELS.join(', ')}` });
  if (source_type && !VALID_SOURCE_TYPES.includes(source_type))
    return res.status(400).json({ error: `source_type must be one of: ${VALID_SOURCE_TYPES.join(', ')}` });

  const requiresAI = needsGeneration(type, options, model_answer);
  const status = requiresAI ? 'ai_generated_pending_approval' : 'approved';
  const aiResult = requiresAI ? generateForQuestion({ type, stem, max_points }, options) : null;
  const finalModelAnswer = aiResult?.modelAnswer ?? model_answer ?? null;

  const { lastInsertRowid } = db.prepare(`
    INSERT INTO questions
      (type, stem, stem_blocks, explanation, model_answer, difficulty, max_points, ib_level, ib_paper,
       source_type, source_year, source_month, source_label,
       topic_id, syllabus_item_ids, status, import_batch_id, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)
  `).run(
    type, stem, stem_blocks ? JSON.stringify(stem_blocks) : null,
    explanation ?? null, finalModelAnswer, difficulty, max_points,
    ib_level ?? null, ib_paper ?? null,
    source_type, source_year ?? null, source_month ?? null, source_label ?? null,
    topic_id ?? null, JSON.stringify(syllabus_item_ids),
    status, req.user.id
  );

  const aiSuggestedIndex = aiResult?.suggestedOptionIndex ?? null;
  insertOptions(lastInsertRowid, options, aiSuggestedIndex);
  setCategories(lastInsertRowid, categories);
  setSyllabusCodes(lastInsertRowid, syllabus_codes);

  const question = attachMeta(parseQuestion(
    db.prepare('SELECT * FROM questions WHERE id = ?').get(lastInsertRowid)
  ));
  question.options = getOptions(lastInsertRowid);

  return res.status(201).json({ question });
});

// ─── GET /api/teacher/questions ──────────────────────────────────────────────

router.get('/', (req, res) => {
  const { type, difficulty, ib_level, ib_paper, source_type, topic_id, status, category } = req.query;

  const conditions = [];
  const params = [];

  if (type) { conditions.push('q.type = ?'); params.push(type); }
  if (difficulty) { conditions.push('q.difficulty = ?'); params.push(difficulty); }
  if (ib_level) { conditions.push('q.ib_level = ?'); params.push(ib_level); }
  if (ib_paper) { conditions.push('q.ib_paper = ?'); params.push(Number(ib_paper)); }
  if (source_type) { conditions.push('q.source_type = ?'); params.push(source_type); }
  if (topic_id) { conditions.push('q.topic_id = ?'); params.push(Number(topic_id)); }
  if (status) { conditions.push('q.status = ?'); params.push(status); }
  if (!status) { conditions.push("q.status = 'approved'"); }

  // Filter by category via join
  const categoryJoin = category
    ? `JOIN question_categories qc ON qc.question_id = q.id AND qc.category = ?`
    : '';
  if (category) params.unshift(category);

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db.prepare(
    `SELECT q.* FROM questions q ${categoryJoin} ${where} ORDER BY q.id DESC`
  ).all(...params);

  const questions = rows.map(r => {
    const q = attachMeta(parseQuestion(r));
    q.options = getOptions(r.id);
    return q;
  });

  return res.json({ questions });
});

// ─── GET /api/teacher/questions/:id ──────────────────────────────────────────

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Question not found' });

  const question = attachMeta(parseQuestion(row));
  question.options = getOptions(row.id);

  return res.json({ question });
});

// ─── PUT /api/teacher/questions/:id ──────────────────────────────────────────

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });

  const {
    stem, explanation, model_answer, difficulty, max_points,
    ib_level, ib_paper, source_type, source_year, source_month, source_label,
    topic_id, syllabus_item_ids, options,
    categories, syllabus_codes, stem_blocks,
  } = req.body;

  if (difficulty && !VALID_DIFFICULTIES.includes(difficulty))
    return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTIES.join(', ')}` });

  db.prepare(`
    UPDATE questions SET
      stem = COALESCE(?, stem),
      stem_blocks = COALESCE(?, stem_blocks),
      explanation = COALESCE(?, explanation),
      model_answer = COALESCE(?, model_answer),
      difficulty = COALESCE(?, difficulty),
      max_points = COALESCE(?, max_points),
      ib_level = COALESCE(?, ib_level),
      ib_paper = COALESCE(?, ib_paper),
      source_type = COALESCE(?, source_type),
      source_year = COALESCE(?, source_year),
      source_month = COALESCE(?, source_month),
      source_label = COALESCE(?, source_label),
      topic_id = COALESCE(?, topic_id),
      syllabus_item_ids = COALESCE(?, syllabus_item_ids),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    stem ?? null,
    stem_blocks !== undefined ? (stem_blocks ? JSON.stringify(stem_blocks) : null) : null,
    explanation ?? null, model_answer ?? null, difficulty ?? null, max_points ?? null,
    ib_level ?? null, ib_paper ?? null,
    source_type ?? null, source_year ?? null, source_month ?? null, source_label ?? null,
    topic_id ?? null,
    syllabus_item_ids ? JSON.stringify(syllabus_item_ids) : null,
    req.params.id
  );

  if (Array.isArray(options)) {
    db.prepare('DELETE FROM question_options WHERE question_id = ?').run(req.params.id);
    insertOptions(req.params.id, options);
  }
  if (Array.isArray(categories)) setCategories(req.params.id, categories);
  if (Array.isArray(syllabus_codes)) setSyllabusCodes(req.params.id, syllabus_codes);

  const question = attachMeta(parseQuestion(
    db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)
  ));
  question.options = getOptions(req.params.id);

  return res.json({ question });
});

// ─── PATCH /api/teacher/questions/:id/status ─────────────────────────────────

router.patch('/:id/status', (req, res) => {
  const { status } = req.body;
  if (!status || !VALID_STATUSES.includes(status))
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });

  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });

  db.prepare(`
    UPDATE questions SET status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(status, req.params.id);

  // Keep batch counters in sync when approving/rejecting imported questions
  if (existing.import_batch_id) {
    if (status === 'approved') {
      db.prepare(`
        UPDATE question_import_batches SET approved_count = approved_count + 1 WHERE id = ?
      `).run(existing.import_batch_id);
    } else if (status === 'rejected') {
      db.prepare(`
        UPDATE question_import_batches SET rejected_count = rejected_count + 1 WHERE id = ?
      `).run(existing.import_batch_id);
    }
  }

  const question = attachMeta(parseQuestion(
    db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id)
  ));
  question.options = getOptions(req.params.id);

  return res.json({ question });
});

// ─── DELETE /api/teacher/questions/:id ───────────────────────────────────────

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM questions WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Question not found' });

  db.prepare('DELETE FROM question_options WHERE question_id = ?').run(req.params.id);
  db.prepare('DELETE FROM questions WHERE id = ?').run(req.params.id);

  return res.json({ message: 'Question deleted' });
});

module.exports = router;
