const express = require('express');
const router = express.Router();
const multer = require('multer');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── AI import helpers ────────────────────────────────────────────────────────

const aiImportUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/pdf'
      || file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      || file.originalname.toLowerCase().endsWith('.pdf')
      || file.originalname.toLowerCase().endsWith('.docx');
    cb(ok ? null : new Error('Samo PDF i DOCX datoteke'), ok);
  },
});

async function extractText(file) {
  if (file.mimetype === 'application/pdf' || file.originalname.toLowerCase().endsWith('.pdf')) {
    const pdfParse = require('pdf-parse');
    const result = await pdfParse(file.buffer);
    return result.text;
  }
  const mammoth = require('mammoth');
  const result = await mammoth.extractRawText({ buffer: file.buffer });
  return result.value;
}

const AI_IMPORT_SYSTEM = `You are a chemistry lesson content parser for Molekula Academy — a Croatian/English chemistry tutoring platform.
Given raw text extracted from a PDF or Word document, convert it into structured lesson blocks.

Return ONLY a valid JSON array. Each element is a block object with exactly two fields: "type" and "content".

Supported types and their content schemas:
- heading:  { "text": string, "level": 1-5 }
- text:     { "html": string }  — use <strong>, <em>, <ul><li>, <ol><li>, <p> for formatting
- equation: { "latex": string, "caption": string }  — LaTeX math; use \\ce{} for chemical formulas
- list:     { "items": string[], "ordered": boolean }
- callout:  { "text": string }  — key point / important note
- exam_tip: { "text": string }  — exam strategy tip
- warning:  { "text": string }  — common mistake or pitfall
- summary:  { "items": string[] }  — bullet summary of key facts
- divider:  {}

Rules:
- Identify section headers as heading blocks (level 1 for major sections, 2-3 for sub-sections)
- Convert mathematical expressions and chemical equations to LaTeX in equation blocks
- Chemical formulas in running text: use HTML <span class="chem" data-latex="\\ce{H2O}">H₂O</span> pattern inside text blocks
- Detect exam tips, warnings, and callouts from contextual clues (e.g., "Note:", "Warning:", "Tip:", "Common mistake:")
- Group related sentences into text blocks with proper HTML
- Do NOT add blocks for page numbers, headers/footers, or metadata
- Keep Croatian text in Croatian; keep English text in English
- Return ONLY the JSON array — no markdown fences, no explanation`;

async function callClaudeImport(text) {
  const Anthropic = require('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const msg = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 8192,
    system: AI_IMPORT_SYSTEM,
    messages: [{ role: 'user', content: `Convert this document text into lesson blocks:\n\n${text.slice(0, 40000)}` }],
  });
  const raw = msg.content.find(c => c.type === 'text')?.text || '[]';
  // Strip any accidental markdown fences
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

// Block type registry — kept in sync with the frontend slash-menu registry
// (frontend/src/pages/admin/LessonEditorPage.jsx BLOCK_TYPES). Grouped here for clarity.
const VALID_TYPES = [
  // Tekst
  'heading', 'text', 'quote', 'divider',
  'list', 'checklist', 'toggle', 'columns', 'toc',
  // Istaknuto (signal blocks)
  'callout', 'exam_tip', 'warning', 'summary',
  // Kemija
  'equation', 'formula', 'molecule3d', 'smiles',
  // Mediji
  'image', 'gif', 'video', 'animation', 'pdf',
  // Podaci
  'table', 'graph', 'python',
  // Veze / ostalo
  'link', 'quiz_link', 'flashcard', 'embed',
];

// Block-level access: public = everyone, basic = basic+premium, premium = premium only
const VALID_VISIBILITY = ['public', 'basic', 'premium'];

function parseBlock(row) {
  if (!row) return null;
  return {
    ...row,
    content: JSON.parse(row.content || '{}'),
  };
}

function nextPosition(lessonId) {
  const row = db.prepare(
    'SELECT COALESCE(MAX(position), -1) AS max_pos FROM lesson_blocks WHERE lesson_id = ?'
  ).get(lessonId);
  return row.max_pos + 1;
}

// ─── POST /api/teacher/lessons/:lessonId/blocks ───────────────────────────────

router.post('/lessons/:lessonId/blocks', requireAuth, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const { type, content, visibility } = req.body;

  const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(lessonId);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  if (!type) {
    return res.status(400).json({ error: 'type is required' });
  }
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (visibility !== undefined && !VALID_VISIBILITY.includes(visibility)) {
    return res.status(400).json({ error: `visibility must be one of: ${VALID_VISIBILITY.join(', ')}` });
  }

  const contentJson = JSON.stringify(content || {});
  const position = nextPosition(lessonId);

  const result = db.prepare(`
    INSERT INTO lesson_blocks (lesson_id, type, content, position, visibility)
    VALUES (?, ?, ?, ?, ?)
  `).run(lessonId, type, contentJson, position, visibility || 'public');

  const block = parseBlock(db.prepare('SELECT * FROM lesson_blocks WHERE id = ?').get(result.lastInsertRowid));
  return res.status(201).json({ block });
});

// ─── GET /api/teacher/lessons/:lessonId/blocks ───────────────────────────────

router.get('/lessons/:lessonId/blocks', requireAuth, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const rows = db.prepare(`
    SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY position, id
  `).all(lessonId);
  return res.json({ blocks: rows.map(parseBlock) });
});

// ─── PATCH /api/teacher/lessons/:lessonId/blocks/reorder ─────────────────────

router.patch('/lessons/:lessonId/blocks/reorder', requireAuth, requireTeacher, (req, res) => {
  const { lessonId } = req.params;
  const { ids } = req.body;

  if (!Array.isArray(ids)) {
    return res.status(400).json({ error: 'ids must be an array of block IDs' });
  }

  const update = db.prepare(
    'UPDATE lesson_blocks SET position = ? WHERE id = ? AND lesson_id = ?'
  );

  const reorderAll = db.transaction((orderedIds) => {
    orderedIds.forEach((id, index) => {
      update.run(index, id, lessonId);
    });
  });

  reorderAll(ids);

  const rows = db.prepare(
    'SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY position, id'
  ).all(lessonId);
  return res.json({ blocks: rows.map(parseBlock) });
});

// ─── PATCH /api/teacher/blocks/:id — update content ──────────────────────────

router.patch('/blocks/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { content, visibility, type } = req.body;

  const existing = db.prepare('SELECT * FROM lesson_blocks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Block not found' });

  if (visibility !== undefined && !VALID_VISIBILITY.includes(visibility)) {
    return res.status(400).json({ error: `visibility must be one of: ${VALID_VISIBILITY.join(', ')}` });
  }
  if (type !== undefined && !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }

  const newContent    = content    !== undefined ? JSON.stringify(content) : existing.content;
  const newVisibility = visibility !== undefined ? visibility              : existing.visibility;
  const newType       = type       !== undefined ? type                    : existing.type;

  db.prepare('UPDATE lesson_blocks SET content = ?, visibility = ?, type = ? WHERE id = ?')
    .run(newContent, newVisibility, newType, id);

  const block = parseBlock(db.prepare('SELECT * FROM lesson_blocks WHERE id = ?').get(id));
  return res.json({ block });
});

// ─── DELETE /api/teacher/blocks/:id ──────────────────────────────────────────

router.delete('/blocks/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM lesson_blocks WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Block not found' });

  db.prepare('DELETE FROM lesson_blocks WHERE id = ?').run(id);
  return res.json({ message: 'Block deleted' });
});

// ─── POST /api/teacher/lessons/:lessonId/ai-import ───────────────────────────
// Upload a PDF or DOCX, extract text, and ask Claude to parse it into lesson blocks.
// Returns suggested blocks (not saved); the teacher reviews and inserts them.

router.post('/lessons/:lessonId/ai-import', requireAuth, requireTeacher,
  aiImportUpload.single('file'),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'Datoteka nije priložena' });
    if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'Claude API nije konfiguriran (ANTHROPIC_API_KEY)' });

    const lesson = db.prepare('SELECT id FROM lessons WHERE id = ?').get(req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'Lekcija nije pronađena' });

    try {
      const text = await extractText(req.file);
      if (!text.trim()) return res.status(422).json({ error: 'Datoteka ne sadrži tekst koji se može pročitati' });

      const blocks = await callClaudeImport(text);
      if (!Array.isArray(blocks)) return res.status(502).json({ error: 'AI nije vratio valjani odgovor' });

      // Validate and sanitise each block — only keep known types
      const valid = blocks
        .filter(b => b && VALID_TYPES.includes(b.type) && typeof b.content === 'object')
        .map(b => ({ type: b.type, content: b.content }));

      return res.json({ blocks: valid, charCount: text.length });
    } catch (err) {
      console.error('ai-import error:', err.message);
      if (err instanceof SyntaxError) return res.status(502).json({ error: 'AI vratio nevaljan JSON' });
      return res.status(500).json({ error: 'Greška pri uvozi datoteke: ' + err.message });
    }
  }
);

module.exports = router;
