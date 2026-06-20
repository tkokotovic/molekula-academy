// Flashcards (#18) — student-created study cards with Anki-style spaced
// repetition, plus teacher decks that can be shared with students.
//
// Mounted twice in app.js:
//   studentRouter → /api/student/flashcards
//   teacherRouter → /api/teacher/flashcards
//
// Card front/back are stored verbatim (may carry inline KaTeX / mhchem) and an
// optional image_url pointing at an /uploads/… file.

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── SM-2 spaced repetition ────────────────────────────────────────────────────
// Classic SuperMemo-2, the algorithm behind Anki. The four study buttons map to a
// recall quality q; q<3 resets the streak (relearn), otherwise the interval grows
// by the ease factor. Ease drifts with performance and never drops below 1.3.
const GRADE_QUALITY = { again: 1, hard: 3, good: 4, easy: 5 };

function applySm2(prev, grade) {
  let ease = prev?.ease ?? 2.5;
  let interval = prev?.interval_days ?? 0;
  let reps = prev?.repetitions ?? 0;
  const q = GRADE_QUALITY[grade] ?? 4;

  if (q < 3) {
    // Lapse — relearn from scratch; card stays due in this session.
    reps = 0;
    interval = 0;
  } else {
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    if (grade === 'hard') interval = Math.max(1, Math.round(interval * 0.8));
    if (grade === 'easy') interval = Math.max(interval + 1, Math.round(interval * 1.3));
    reps += 1;
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  return { ease, interval_days: interval, repetitions: reps };
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function deckCardCount(deckId) {
  return db.prepare('SELECT COUNT(*) AS n FROM flashcards WHERE deck_id = ?').get(deckId).n;
}

// Cards a given student still owes review on in this deck: never-seen cards plus
// cards whose next-review time has passed.
function deckDueCount(deckId, studentId) {
  return db.prepare(`
    SELECT COUNT(*) AS n
      FROM flashcards c
      LEFT JOIN flashcard_reviews r ON r.card_id = c.id AND r.student_id = ?
     WHERE c.deck_id = ?
       AND (r.id IS NULL OR r.due_at <= datetime('now'))
  `).get(studentId, deckId).n;
}

// Can this student see/study this deck? Their own decks, public teacher decks, or
// teacher decks explicitly shared with them.
function studentCanAccessDeck(deck, studentId) {
  if (!deck) return false;
  if (deck.owner_id === studentId) return true;
  if (deck.source !== 'teacher') return false;
  if (deck.is_public) return true;
  const share = db.prepare(
    'SELECT 1 FROM flashcard_deck_shares WHERE deck_id = ? AND student_id = ?'
  ).get(deck.id, studentId);
  return Boolean(share);
}

function getCardWithDeck(cardId) {
  return db.prepare(`
    SELECT c.*, d.owner_id AS deck_owner_id, d.source AS deck_source
      FROM flashcards c JOIN flashcard_decks d ON d.id = c.deck_id
     WHERE c.id = ?
  `).get(cardId);
}

function clampText(v, max = 5000) {
  const s = typeof v === 'string' ? v : '';
  return s.length > max ? s.slice(0, max) : s;
}

// ─── Image upload (shared by both routers) ─────────────────────────────────────
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/gif', 'image/webp']);

function buildStorage() {
  if (process.env.NODE_ENV === 'test') return multer.memoryStorage();
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname)}`),
  });
}

const upload = multer({
  storage: buildStorage(),
  fileFilter: (req, file, cb) =>
    IMAGE_TYPES.has(file.mimetype) ? cb(null, true) : cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE')),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

async function handleImageUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'Nije priložena slika.' });
  let { originalname, mimetype, size, filename: diskFilename, buffer } = req.file;
  const ext = path.extname(originalname);
  let filename = diskFilename || `${randomUUID()}${ext}`;

  // Resize + WebP-convert raster images to keep cards light (disk mode only).
  if (/^image\/(jpeg|png|webp)$/.test(mimetype) && diskFilename && process.env.NODE_ENV !== 'test') {
    try {
      const sharp = require('sharp');
      const webpName = `${randomUUID()}.webp`;
      const info = await sharp(path.join(UPLOAD_DIR, diskFilename))
        .rotate()
        .resize({ width: 1200, height: 1200, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toFile(path.join(UPLOAD_DIR, webpName));
      fs.unlink(path.join(UPLOAD_DIR, diskFilename), () => {});
      filename = webpName;
      mimetype = 'image/webp';
      size = info.size;
    } catch { /* sharp unavailable — keep original */ }
  }

  const filePath = process.env.NODE_ENV === 'test'
    ? `uploads/${filename}`
    : path.relative(path.join(__dirname, '../..'), path.join(UPLOAD_DIR, filename));

  db.prepare(`
    INSERT INTO uploads (filename, original_name, mime_type, size, path, uploaded_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(filename, originalname, mimetype, size || (buffer ? buffer.length : 0), filePath, req.user.id);

  return res.status(201).json({ url: `/${filePath.replace(/^\/+/, '')}` });
}

const uploadMiddleware = (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return res.status(400).json({ error: 'Nepodržani tip datoteke (samo slike).' });
    next();
  });
};

// ════════════════════════════════════════════════════════════════════════════════
// STUDENT ROUTER
// ════════════════════════════════════════════════════════════════════════════════

const studentRouter = express.Router();
studentRouter.use(requireAuth);

// List decks visible to me: my own + public/shared teacher decks. Each carries a
// card count and how many cards are due for me right now.
studentRouter.get('/decks', (req, res) => {
  const uid = req.user.id;
  const decks = db.prepare(`
    SELECT d.*, u.name AS owner_name
      FROM flashcard_decks d
      JOIN users u ON u.id = d.owner_id
     WHERE d.owner_id = ?
        OR (d.source = 'teacher' AND d.is_public = 1)
        OR (d.source = 'teacher' AND d.id IN (
              SELECT deck_id FROM flashcard_deck_shares WHERE student_id = ?))
     ORDER BY d.updated_at DESC
  `).all(uid, uid);

  const out = decks.map(d => ({
    id: d.id,
    title: d.title,
    description: d.description,
    source: d.source,
    owner_name: d.owner_name,
    is_mine: d.owner_id === uid,
    card_count: deckCardCount(d.id),
    due_count: deckDueCount(d.id, uid),
    updated_at: d.updated_at,
  }));
  res.json({ decks: out });
});

// Create one of my own decks.
studentRouter.post('/decks', (req, res) => {
  const title = clampText(req.body.title, 200).trim();
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const info = db.prepare(`
    INSERT INTO flashcard_decks (owner_id, source, title, description)
    VALUES (?, 'student', ?, ?)
  `).run(req.user.id, title, clampText(req.body.description, 1000));
  res.status(201).json({ deck: db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(info.lastInsertRowid) });
});

// Deck detail + cards. Read-only unless it's my own deck (is_mine flag tells the UI).
studentRouter.get('/decks/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(req.params.id);
  if (!studentCanAccessDeck(deck, req.user.id)) return res.status(404).json({ error: 'Set nije pronađen.' });
  const cards = db.prepare(
    'SELECT id, front, back, image_url, position FROM flashcards WHERE deck_id = ? ORDER BY position, id'
  ).all(deck.id);
  res.json({
    deck: { ...deck, is_mine: deck.owner_id === req.user.id, card_count: cards.length },
    cards,
  });
});

studentRouter.patch('/decks/:id', (req, res) => {
  const deck = db.prepare('SELECT * FROM flashcard_decks WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Set nije pronađen.' });
  const title = req.body.title !== undefined ? clampText(req.body.title, 200).trim() : deck.title;
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const description = req.body.description !== undefined ? clampText(req.body.description, 1000) : deck.description;
  db.prepare(`UPDATE flashcard_decks SET title = ?, description = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(title, description, deck.id);
  res.json({ deck: db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(deck.id) });
});

studentRouter.delete('/decks/:id', (req, res) => {
  const info = db.prepare('DELETE FROM flashcard_decks WHERE id = ? AND owner_id = ?').run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Set nije pronađen.' });
  res.json({ ok: true });
});

// Add a card to my own deck.
studentRouter.post('/decks/:id/cards', (req, res) => {
  const deck = db.prepare('SELECT * FROM flashcard_decks WHERE id = ? AND owner_id = ?').get(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Set nije pronađen.' });
  const front = clampText(req.body.front);
  const back = clampText(req.body.back);
  if (!front.trim() && !back.trim() && !req.body.image_url) {
    return res.status(400).json({ error: 'Kartica je prazna.' });
  }
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) AS p FROM flashcards WHERE deck_id = ?').get(deck.id).p;
  const info = db.prepare(`
    INSERT INTO flashcards (deck_id, front, back, image_url, position)
    VALUES (?, ?, ?, ?, ?)
  `).run(deck.id, front, back, req.body.image_url || null, maxPos + 1);
  db.prepare(`UPDATE flashcard_decks SET updated_at = datetime('now') WHERE id = ?`).run(deck.id);
  res.status(201).json({ card: db.prepare('SELECT id, front, back, image_url, position FROM flashcards WHERE id = ?').get(info.lastInsertRowid) });
});

studentRouter.patch('/cards/:id', (req, res) => {
  const card = getCardWithDeck(req.params.id);
  if (!card || card.deck_owner_id !== req.user.id) return res.status(404).json({ error: 'Kartica nije pronađena.' });
  const front = req.body.front !== undefined ? clampText(req.body.front) : card.front;
  const back = req.body.back !== undefined ? clampText(req.body.back) : card.back;
  const image_url = req.body.image_url !== undefined ? (req.body.image_url || null) : card.image_url;
  db.prepare('UPDATE flashcards SET front = ?, back = ?, image_url = ? WHERE id = ?').run(front, back, image_url, card.id);
  db.prepare(`UPDATE flashcard_decks SET updated_at = datetime('now') WHERE id = ?`).run(card.deck_id);
  res.json({ card: db.prepare('SELECT id, front, back, image_url, position FROM flashcards WHERE id = ?').get(card.id) });
});

studentRouter.delete('/cards/:id', (req, res) => {
  const card = getCardWithDeck(req.params.id);
  if (!card || card.deck_owner_id !== req.user.id) return res.status(404).json({ error: 'Kartica nije pronađena.' });
  db.prepare('DELETE FROM flashcards WHERE id = ?').run(card.id);
  res.json({ ok: true });
});

// Build a study queue: due + new cards for this deck, new cards last so review
// debt is cleared first. Each card carries its current SR state for the client.
studentRouter.get('/decks/:id/study', (req, res) => {
  const deck = db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(req.params.id);
  if (!studentCanAccessDeck(deck, req.user.id)) return res.status(404).json({ error: 'Set nije pronađen.' });
  const cards = db.prepare(`
    SELECT c.id, c.front, c.back, c.image_url,
           r.repetitions, r.due_at,
           CASE WHEN r.id IS NULL THEN 1 ELSE 0 END AS is_new
      FROM flashcards c
      LEFT JOIN flashcard_reviews r ON r.card_id = c.id AND r.student_id = ?
     WHERE c.deck_id = ?
       AND (r.id IS NULL OR r.due_at <= datetime('now'))
     ORDER BY is_new ASC, r.due_at ASC, c.position ASC
     LIMIT 60
  `).all(req.user.id, deck.id);
  res.json({ deck: { id: deck.id, title: deck.title }, cards });
});

// Record a review and advance the card's SR schedule. grade ∈ again|hard|good|easy.
studentRouter.post('/cards/:id/review', (req, res) => {
  const grade = req.body.grade;
  if (!GRADE_QUALITY[grade]) return res.status(400).json({ error: 'Nevažeća ocjena.' });
  const card = getCardWithDeck(req.params.id);
  if (!card) return res.status(404).json({ error: 'Kartica nije pronađena.' });
  const deck = db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(card.deck_id);
  if (!studentCanAccessDeck(deck, req.user.id)) return res.status(404).json({ error: 'Kartica nije pronađena.' });

  const prev = db.prepare('SELECT * FROM flashcard_reviews WHERE student_id = ? AND card_id = ?').get(req.user.id, card.id);
  const next = applySm2(prev, grade);
  // interval 0 (lapse) → due immediately so it recurs this session.
  const dueExpr = next.interval_days > 0 ? `datetime('now', '+${next.interval_days} days')` : `datetime('now')`;

  db.prepare(`
    INSERT INTO flashcard_reviews (student_id, card_id, ease, interval_days, repetitions, due_at, last_reviewed_at)
    VALUES (?, ?, ?, ?, ?, ${dueExpr}, datetime('now'))
    ON CONFLICT(student_id, card_id) DO UPDATE SET
      ease = excluded.ease,
      interval_days = excluded.interval_days,
      repetitions = excluded.repetitions,
      due_at = excluded.due_at,
      last_reviewed_at = excluded.last_reviewed_at
  `).run(req.user.id, card.id, next.ease, next.interval_days, next.repetitions);

  res.json({ review: { ...next, due_in_days: next.interval_days } });
});

// Image upload for cards.
studentRouter.post('/upload', uploadMiddleware, handleImageUpload);

// ════════════════════════════════════════════════════════════════════════════════
// TEACHER ROUTER
// ════════════════════════════════════════════════════════════════════════════════

const teacherRouter = express.Router();
teacherRouter.use(requireAuth, requireTeacher);

// Teacher's own decks, with card count + share reach (public, or #students).
teacherRouter.get('/decks', (req, res) => {
  const decks = db.prepare(`
    SELECT * FROM flashcard_decks WHERE owner_id = ? AND source = 'teacher' ORDER BY updated_at DESC
  `).all(req.user.id);
  const out = decks.map(d => ({
    ...d,
    card_count: deckCardCount(d.id),
    shared_count: db.prepare('SELECT COUNT(*) AS n FROM flashcard_deck_shares WHERE deck_id = ?').get(d.id).n,
  }));
  res.json({ decks: out });
});

teacherRouter.post('/decks', (req, res) => {
  const title = clampText(req.body.title, 200).trim();
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const info = db.prepare(`
    INSERT INTO flashcard_decks (owner_id, source, title, description, is_public)
    VALUES (?, 'teacher', ?, ?, ?)
  `).run(req.user.id, title, clampText(req.body.description, 1000), req.body.is_public ? 1 : 0);
  res.status(201).json({ deck: db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(info.lastInsertRowid) });
});

function teacherDeck(id, ownerId) {
  return db.prepare(`SELECT * FROM flashcard_decks WHERE id = ? AND owner_id = ? AND source = 'teacher'`).get(id, ownerId);
}

teacherRouter.get('/decks/:id', (req, res) => {
  const deck = teacherDeck(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Set nije pronađen.' });
  const cards = db.prepare(
    'SELECT id, front, back, image_url, position FROM flashcards WHERE deck_id = ? ORDER BY position, id'
  ).all(deck.id);
  const sharedIds = db.prepare('SELECT student_id FROM flashcard_deck_shares WHERE deck_id = ?')
    .all(deck.id).map(r => r.student_id);
  res.json({ deck: { ...deck, card_count: cards.length }, cards, shared_student_ids: sharedIds });
});

teacherRouter.patch('/decks/:id', (req, res) => {
  const deck = teacherDeck(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Set nije pronađen.' });
  const title = req.body.title !== undefined ? clampText(req.body.title, 200).trim() : deck.title;
  if (!title) return res.status(400).json({ error: 'Naslov je obavezan.' });
  const description = req.body.description !== undefined ? clampText(req.body.description, 1000) : deck.description;
  const is_public = req.body.is_public !== undefined ? (req.body.is_public ? 1 : 0) : deck.is_public;
  db.prepare(`UPDATE flashcard_decks SET title = ?, description = ?, is_public = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(title, description, is_public, deck.id);
  res.json({ deck: db.prepare('SELECT * FROM flashcard_decks WHERE id = ?').get(deck.id) });
});

teacherRouter.delete('/decks/:id', (req, res) => {
  const info = db.prepare(`DELETE FROM flashcard_decks WHERE id = ? AND owner_id = ? AND source = 'teacher'`)
    .run(req.params.id, req.user.id);
  if (!info.changes) return res.status(404).json({ error: 'Set nije pronađen.' });
  res.json({ ok: true });
});

teacherRouter.post('/decks/:id/cards', (req, res) => {
  const deck = teacherDeck(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Set nije pronađen.' });
  const front = clampText(req.body.front);
  const back = clampText(req.body.back);
  if (!front.trim() && !back.trim() && !req.body.image_url) return res.status(400).json({ error: 'Kartica je prazna.' });
  const maxPos = db.prepare('SELECT COALESCE(MAX(position), -1) AS p FROM flashcards WHERE deck_id = ?').get(deck.id).p;
  const info = db.prepare('INSERT INTO flashcards (deck_id, front, back, image_url, position) VALUES (?, ?, ?, ?, ?)')
    .run(deck.id, front, back, req.body.image_url || null, maxPos + 1);
  db.prepare(`UPDATE flashcard_decks SET updated_at = datetime('now') WHERE id = ?`).run(deck.id);
  res.status(201).json({ card: db.prepare('SELECT id, front, back, image_url, position FROM flashcards WHERE id = ?').get(info.lastInsertRowid) });
});

function teacherCard(cardId, ownerId) {
  const card = getCardWithDeck(cardId);
  if (!card || card.deck_owner_id !== ownerId || card.deck_source !== 'teacher') return null;
  return card;
}

teacherRouter.patch('/cards/:id', (req, res) => {
  const card = teacherCard(req.params.id, req.user.id);
  if (!card) return res.status(404).json({ error: 'Kartica nije pronađena.' });
  const front = req.body.front !== undefined ? clampText(req.body.front) : card.front;
  const back = req.body.back !== undefined ? clampText(req.body.back) : card.back;
  const image_url = req.body.image_url !== undefined ? (req.body.image_url || null) : card.image_url;
  db.prepare('UPDATE flashcards SET front = ?, back = ?, image_url = ? WHERE id = ?').run(front, back, image_url, card.id);
  res.json({ card: db.prepare('SELECT id, front, back, image_url, position FROM flashcards WHERE id = ?').get(card.id) });
});

teacherRouter.delete('/cards/:id', (req, res) => {
  const card = teacherCard(req.params.id, req.user.id);
  if (!card) return res.status(404).json({ error: 'Kartica nije pronađena.' });
  db.prepare('DELETE FROM flashcards WHERE id = ?').run(card.id);
  res.json({ ok: true });
});

// Set sharing: is_public flag and/or explicit student grants (replaces the set).
teacherRouter.put('/decks/:id/share', (req, res) => {
  const deck = teacherDeck(req.params.id, req.user.id);
  if (!deck) return res.status(404).json({ error: 'Set nije pronađen.' });
  const isPublic = req.body.is_public ? 1 : 0;
  const studentIds = Array.isArray(req.body.student_ids) ? req.body.student_ids.map(Number).filter(Boolean) : [];

  const tx = db.transaction(() => {
    db.prepare(`UPDATE flashcard_decks SET is_public = ?, updated_at = datetime('now') WHERE id = ?`).run(isPublic, deck.id);
    db.prepare('DELETE FROM flashcard_deck_shares WHERE deck_id = ?').run(deck.id);
    const ins = db.prepare('INSERT OR IGNORE INTO flashcard_deck_shares (deck_id, student_id) VALUES (?, ?)');
    for (const sid of studentIds) {
      const isStudent = db.prepare(`SELECT 1 FROM users WHERE id = ? AND role = 'student'`).get(sid);
      if (isStudent) ins.run(deck.id, sid);
    }
  });
  tx();
  res.json({ ok: true, is_public: isPublic, shared_student_ids: studentIds });
});

// Student picker for the share dialog.
teacherRouter.get('/students', (req, res) => {
  const students = db.prepare(`SELECT id, name, email FROM users WHERE role = 'student' ORDER BY name`).all();
  res.json({ students });
});

teacherRouter.post('/upload', uploadMiddleware, handleImageUpload);

module.exports = { studentRouter, teacherRouter };
