const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

router.use(requireAuth, requireTeacher);

// Resolve audience filter → array of user ids
function resolveAudience(filter = {}) {
  const { scope, course_id, plan, group_id, student_ids } = filter;

  if (scope === 'individuals' && Array.isArray(student_ids)) {
    return student_ids.map(Number);
  }

  let query = 'SELECT id FROM users WHERE role = ?';
  const params = ['student'];

  if (scope === 'by_plan' && plan) {
    query += ' AND subscription_tier = ?';
    params.push(plan);
  } else if (scope === 'by_course' && course_id) {
    query = `
      SELECT DISTINCT u.id FROM users u
      JOIN enrollments e ON e.student_id = u.id
      WHERE u.role = ? AND e.course_id = ? AND e.status = 'active'
    `;
    params.push(course_id);
  } else if (scope === 'by_group' && group_id) {
    query = `
      SELECT u.id FROM users u
      JOIN group_members gm ON gm.student_id = u.id
      WHERE u.role = ? AND gm.group_id = ?
    `;
    params.push(group_id);
  }

  return db.prepare(query).all(...params).map(r => r.id);
}

// POST /api/teacher/broadcasts — send a broadcast
// Body: { title, body_hr, body_en, audience_filter: { scope, course_id?, plan?, group_id?, student_ids? } }
router.post('/broadcasts', (req, res) => {
  const { title, body_hr, body_en, audience_filter = { scope: 'all' } } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  if (!body_hr && !body_en) return res.status(400).json({ error: 'body_hr or body_en is required' });

  const recipientIds = resolveAudience(audience_filter);
  if (!recipientIds.length) return res.status(400).json({ error: 'No recipients match this audience filter' });

  const { lastInsertRowid: broadcastId } = db.prepare(`
    INSERT INTO broadcasts (title, body_hr, body_en, audience_filter, created_by, sent_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).run(
    title.trim(),
    body_hr ?? null,
    body_en ?? null,
    JSON.stringify(audience_filter),
    req.user.id
  );

  // Deliver: insert into broadcast_recipients + notifications for each recipient
  const insRecipient = db.prepare(
    'INSERT INTO broadcast_recipients (broadcast_id, user_id, delivered_at) VALUES (?, ?, datetime(\'now\'))'
  );
  const insNotif = db.prepare(`
    INSERT INTO notifications (user_id, type, title_hr, title_en, body_hr, body_en, action_url)
    VALUES (?, 'broadcast', ?, ?, ?, ?, '/messages')
  `);

  const deliver = db.transaction(() => {
    for (const uid of recipientIds) {
      insRecipient.run(broadcastId, uid);
      insNotif.run(uid, title.trim(), title.trim(), body_hr ?? null, body_en ?? null);
    }
  });
  deliver();

  const broadcast = db.prepare('SELECT * FROM broadcasts WHERE id = ?').get(broadcastId);
  broadcast.audience_filter = JSON.parse(broadcast.audience_filter);
  broadcast.recipient_count = recipientIds.length;

  res.status(201).json({ broadcast });
});

// GET /api/teacher/broadcasts — broadcast log
router.get('/broadcasts', (req, res) => {
  const rows = db.prepare('SELECT * FROM broadcasts ORDER BY sent_at DESC').all();
  const broadcasts = rows.map(b => {
    b.audience_filter = JSON.parse(b.audience_filter || '{}');
    b.recipient_count = db.prepare(
      'SELECT COUNT(*) as n FROM broadcast_recipients WHERE broadcast_id = ?'
    ).get(b.id).n;
    return b;
  });
  res.json({ broadcasts });
});

// GET /api/teacher/broadcasts/:id — detail with recipient list
router.get('/broadcasts/:id', (req, res) => {
  const b = db.prepare('SELECT * FROM broadcasts WHERE id = ?').get(req.params.id);
  if (!b) return res.status(404).json({ error: 'Broadcast not found' });

  b.audience_filter = JSON.parse(b.audience_filter || '{}');
  b.recipients = db.prepare(`
    SELECT u.id, u.name, u.email, br.delivered_at
    FROM broadcast_recipients br
    JOIN users u ON u.id = br.user_id
    WHERE br.broadcast_id = ?
    ORDER BY u.name
  `).all(req.params.id);

  res.json({ broadcast: b });
});

// POST /api/teacher/broadcasts/preview — count recipients without sending
router.post('/broadcasts/preview', (req, res) => {
  const { audience_filter = { scope: 'all' } } = req.body;
  const ids = resolveAudience(audience_filter);
  res.json({ recipient_count: ids.length });
});

module.exports = router;
