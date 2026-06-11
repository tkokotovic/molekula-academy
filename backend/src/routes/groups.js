const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

router.use(requireAuth, requireTeacher);

// GET /api/teacher/groups
router.get('/groups', (req, res) => {
  const groups = db.prepare('SELECT * FROM groups ORDER BY name').all();
  groups.forEach(g => {
    g.member_count = db.prepare(
      'SELECT COUNT(*) as n FROM group_members WHERE group_id = ?'
    ).get(g.id).n;
  });
  res.json({ groups });
});

// POST /api/teacher/groups
router.post('/groups', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  const { lastInsertRowid } = db.prepare(
    'INSERT INTO groups (name, created_by) VALUES (?, ?)'
  ).run(name.trim(), req.user.id);

  res.status(201).json({ group: db.prepare('SELECT * FROM groups WHERE id = ?').get(lastInsertRowid) });
});

// GET /api/teacher/groups/:id
router.get('/groups/:id', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  group.members = db.prepare(`
    SELECT u.id, u.name, u.email, u.subscription_tier, u.exam_date
    FROM group_members gm
    JOIN users u ON u.id = gm.student_id
    WHERE gm.group_id = ?
    ORDER BY u.name
  `).all(req.params.id);

  res.json({ group });
});

// PUT /api/teacher/groups/:id — rename
router.put('/groups/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM groups WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Group not found' });

  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'name is required' });

  db.prepare('UPDATE groups SET name = ? WHERE id = ?').run(name.trim(), req.params.id);
  res.json({ group: db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id) });
});

// DELETE /api/teacher/groups/:id
router.delete('/groups/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM groups WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Group not found' });
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.json({ message: 'Group deleted' });
});

// POST /api/teacher/groups/:id/members — add student(s)
// Body: { student_ids: [1, 2, 3] }
router.post('/groups/:id/members', (req, res) => {
  const group = db.prepare('SELECT id FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const { student_ids = [] } = req.body;
  if (!Array.isArray(student_ids) || student_ids.length === 0)
    return res.status(400).json({ error: 'student_ids array is required' });

  const ins = db.prepare('INSERT OR IGNORE INTO group_members (group_id, student_id) VALUES (?, ?)');
  const insertAll = db.transaction((ids) => {
    for (const id of ids) ins.run(req.params.id, id);
  });
  insertAll(student_ids);

  const members = db.prepare(`
    SELECT u.id, u.name, u.email FROM group_members gm
    JOIN users u ON u.id = gm.student_id WHERE gm.group_id = ? ORDER BY u.name
  `).all(req.params.id);

  res.json({ members });
});

// DELETE /api/teacher/groups/:id/members/:studentId — remove one student
router.delete('/groups/:id/members/:studentId', (req, res) => {
  db.prepare('DELETE FROM group_members WHERE group_id = ? AND student_id = ?')
    .run(req.params.id, req.params.studentId);
  res.json({ message: 'Member removed' });
});

// GET /api/teacher/groups/:id/progress — aggregate stats for all members
router.get('/groups/:id/progress', (req, res) => {
  const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id);
  if (!group) return res.status(404).json({ error: 'Group not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.exam_date
    FROM group_members gm
    JOIN users u ON u.id = gm.student_id
    WHERE gm.group_id = ?
  `).all(req.params.id);

  const stats = members.map(m => {
    const lessonsDone = db.prepare(
      `SELECT COUNT(*) as n FROM lesson_progress WHERE student_id = ? AND status = 'completed'`
    ).get(m.id).n;

    const quizStats = db.prepare(`
      SELECT COUNT(*) as attempts,
             AVG(score) as avg_score
      FROM quiz_attempts WHERE student_id = ? AND status = 'completed'
    `).get(m.id);

    const hwStats = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN status = 'corrected' THEN 1 ELSE 0 END) as corrected
      FROM homework_assignments WHERE student_id = ?
    `).get(m.id);

    return {
      ...m,
      lessons_completed: lessonsDone,
      quiz_attempts: quizStats.attempts,
      quiz_avg_score: quizStats.avg_score ? Math.round(quizStats.avg_score) : null,
      homeworks_total: hwStats.total,
      homeworks_corrected: hwStats.corrected,
    };
  });

  res.json({ group, stats });
});

module.exports = router;
