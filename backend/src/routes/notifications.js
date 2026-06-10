const express = require('express');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// GET /api/student/notifications
router.get('/notifications', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 50
  `).all(req.user.id);
  const unread = rows.filter(r => !r.read_at).length;
  return res.json({ notifications: rows, unread });
});

// PATCH /api/student/notifications/read-all
router.patch('/notifications/read-all', requireAuth, (req, res) => {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE notifications SET read_at = ?
     WHERE user_id = ? AND read_at IS NULL
  `).run(now, req.user.id);
  return res.json({ ok: true });
});

// PATCH /api/student/notifications/:id/read
router.patch('/notifications/:id/read', requireAuth, (req, res) => {
  const id = Number(req.params.id);
  const row = db.prepare('SELECT id FROM notifications WHERE id = ? AND user_id = ?').get(id, req.user.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  db.prepare("UPDATE notifications SET read_at = ? WHERE id = ?").run(new Date().toISOString(), id);
  return res.json({ ok: true });
});

module.exports = router;
