const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── GET /api/teacher/chem-compounds?q= ──────────────────────────────────────
// Built-in seed (owner_id IS NULL) + the requesting teacher's own compounds.
// Optional case-insensitive name/formula search.
router.get('/chem-compounds', requireAuth, requireTeacher, (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  let rows = db.prepare(
    'SELECT * FROM chem_compounds WHERE owner_id IS NULL OR owner_id = ? ORDER BY (owner_id IS NULL) DESC, name_hr COLLATE NOCASE'
  ).all(req.user.id);
  if (q) {
    rows = rows.filter(r =>
      (r.name_hr || '').toLowerCase().includes(q) ||
      (r.name_en || '').toLowerCase().includes(q) ||
      (r.formula || '').toLowerCase().includes(q)
    );
  }
  res.json({ compounds: rows });
});

// ─── POST /api/teacher/chem-compounds ────────────────────────────────────────
// Save a custom compound for reuse. De-dupes against the caller's own list.
router.post('/chem-compounds', requireAuth, requireTeacher, (req, res) => {
  const { name_hr, name_en, formula } = req.body;
  if (!name_hr || !formula) {
    return res.status(400).json({ error: 'name_hr and formula are required' });
  }
  const dupe = db.prepare(
    'SELECT * FROM chem_compounds WHERE owner_id = ? AND name_hr = ? COLLATE NOCASE'
  ).get(req.user.id, name_hr);
  if (dupe) {
    db.prepare('UPDATE chem_compounds SET name_en = ?, formula = ? WHERE id = ?')
      .run(name_en || null, formula, dupe.id);
    return res.json({ compound: db.prepare('SELECT * FROM chem_compounds WHERE id = ?').get(dupe.id) });
  }
  const info = db.prepare(
    'INSERT INTO chem_compounds (owner_id, name_hr, name_en, formula) VALUES (?, ?, ?, ?)'
  ).run(req.user.id, name_hr, name_en || null, formula);
  res.status(201).json({ compound: db.prepare('SELECT * FROM chem_compounds WHERE id = ?').get(info.lastInsertRowid) });
});

// ─── DELETE /api/teacher/chem-compounds/:id (own only) ───────────────────────
router.delete('/chem-compounds/:id', requireAuth, requireTeacher, (req, res) => {
  const row = db.prepare('SELECT * FROM chem_compounds WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  if (row.owner_id !== req.user.id) return res.status(403).json({ error: 'Cannot delete built-in or others\' compounds' });
  db.prepare('DELETE FROM chem_compounds WHERE id = ?').run(req.params.id);
  res.json({ message: 'Deleted' });
});

module.exports = router;
