const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');
const { buildLessonDocx } = require('../lib/docxExport');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_STATUSES   = ['draft', 'published', 'scheduled', 'archived'];
const VALID_DIFFICULTY = ['easy', 'medium', 'hard'];

// Auto-publish a scheduled lesson if its publish_at has passed; returns up-to-date row.
function maybeAutoPublish(id) {
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE lessons
    SET status = 'published', updated_at = datetime('now')
    WHERE id = ? AND status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= ?
  `).run(id, now);
}

function parseLesson(row) {
  if (!row) return null;
  return {
    ...row,
    learning_objectives: JSON.parse(row.learning_objectives || '[]'),
    tags:                JSON.parse(row.tags                || '[]'),
    prerequisites:       JSON.parse(row.prerequisites       || '[]'),
    linked_quiz_ids:     JSON.parse(row.linked_quiz_ids     || '[]'),
  };
}

// ─── POST /api/teacher/topics/:topicId/lessons ────────────────────────────────

router.post('/topics/:topicId/lessons', requireAuth, requireTeacher, (req, res) => {
  const { topicId } = req.params;
  const {
    title, summary, learning_objectives, difficulty,
    duration_minutes, tags, prerequisites, teacher_notes,
  } = req.body;

  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topicId);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const diff = difficulty || 'medium';
  if (!VALID_DIFFICULTY.includes(diff)) {
    return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTY.join(', ')}` });
  }

  const objectivesJson  = JSON.stringify(Array.isArray(learning_objectives) ? learning_objectives : []);
  const tagsJson        = JSON.stringify(Array.isArray(tags)                ? tags                : []);
  const prereqJson      = JSON.stringify(Array.isArray(prerequisites)       ? prerequisites       : []);

  const result = db.prepare(`
    INSERT INTO lessons
      (topic_id, title, summary, learning_objectives, difficulty, duration_minutes,
       tags, prerequisites, teacher_notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    topicId,
    title.trim(),
    summary          || null,
    objectivesJson,
    diff,
    duration_minutes || null,
    tagsJson,
    prereqJson,
    teacher_notes    || null,
  );

  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid));
  return res.status(201).json({ lesson });
});

// ─── GET /api/teacher/topics/:topicId/lessons ────────────────────────────────

router.get('/topics/:topicId/lessons', requireAuth, requireTeacher, (req, res) => {
  const { topicId } = req.params;
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE lessons SET status = 'published', updated_at = datetime('now')
    WHERE topic_id = ? AND status = 'scheduled' AND publish_at IS NOT NULL AND publish_at <= ?
  `).run(topicId, now);
  const rows = db.prepare(`
    SELECT l.*, m.title AS master_title,
      (SELECT GROUP_CONCAT(sc.code, ',')
       FROM lesson_syllabus_tags lst
       JOIN syllabus_codes sc ON sc.id = lst.syllabus_code_id
       WHERE lst.lesson_id = l.id
       ORDER BY sc.course_type, sc.position) AS syllabus_codes_csv
    FROM lessons l
    LEFT JOIN lessons m ON m.id = l.master_lesson_id
    WHERE l.topic_id = ? ORDER BY l.position, l.created_at
  `).all(topicId);
  return res.json({ lessons: rows.map(parseLesson) });
});

// ─── Master lesson library ───────────────────────────────────────────────────
// GET /api/teacher/library/lessons — all master lessons with block + fork counts

router.get('/library/lessons', requireAuth, requireTeacher, (req, res) => {
  const libTopicId = db.getLibraryTopicId();
  const rows = db.prepare(`
    SELECT l.*,
      (SELECT COUNT(*) FROM lesson_blocks b WHERE b.lesson_id = l.id) AS block_count,
      (SELECT COUNT(*) FROM lessons f WHERE f.master_lesson_id = l.id) AS fork_count
    FROM lessons l
    WHERE l.topic_id = ?
    ORDER BY l.title COLLATE NOCASE
  `).all(libTopicId);
  return res.json({ lessons: rows.map(parseLesson) });
});

// POST /api/teacher/library/lessons — create a new master lesson in the library
router.post('/library/lessons', requireAuth, requireTeacher, (req, res) => {
  const { title, summary } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const libTopicId = db.getLibraryTopicId();
  const result = db.prepare(`
    INSERT INTO lessons (topic_id, title, summary) VALUES (?, ?, ?)
  `).run(libTopicId, title.trim(), summary || null);
  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(result.lastInsertRowid));
  return res.status(201).json({ lesson });
});

// POST /api/teacher/lessons/:id/fork — copy a master lesson (+ blocks) into a topic
router.post('/lessons/:id/fork', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { topicId } = req.body;

  const master = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!master) return res.status(404).json({ error: 'Master lesson not found' });

  const topic = db.prepare('SELECT id FROM topics WHERE id = ?').get(topicId);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  const fork = db.transaction(() => {
    // next position at the end of the target topic
    const max = db.prepare('SELECT COALESCE(MAX(position), -1) AS m FROM lessons WHERE topic_id = ?').get(topicId).m;

    const info = db.prepare(`
      INSERT INTO lessons
        (topic_id, title, summary, learning_objectives, difficulty, duration_minutes,
         tags, prerequisites, teacher_notes, status, position, master_lesson_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).run(
      topicId, master.title, master.summary, master.learning_objectives,
      master.difficulty, master.duration_minutes, master.tags, master.prerequisites,
      master.teacher_notes, max + 1, master.id,
    );
    const newId = info.lastInsertRowid;

    // deep-copy all blocks
    const blocks = db.prepare('SELECT type, content, position, visibility FROM lesson_blocks WHERE lesson_id = ? ORDER BY position').all(master.id);
    const insertBlock = db.prepare('INSERT INTO lesson_blocks (lesson_id, type, content, position, visibility) VALUES (?, ?, ?, ?, ?)');
    for (const b of blocks) insertBlock.run(newId, b.type, b.content, b.position, b.visibility);

    return parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(newId));
  })();

  return res.status(201).json({ lesson: fork });
});

// GET /api/teacher/lessons/:id/forks — list a master's forks with sync status
router.get('/lessons/:id/forks', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const master = db.prepare('SELECT id, title FROM lessons WHERE id = ?').get(id);
  if (!master) return res.status(404).json({ error: 'Lesson not found' });

  const masterBlocks = db.prepare('SELECT type, content, visibility FROM lesson_blocks WHERE lesson_id = ? ORDER BY position').all(id);
  const masterSig = JSON.stringify(masterBlocks);

  const forks = db.prepare(`
    SELECT l.id, l.title, l.status,
           t.title AS topic_title, c.id AS course_id, c.title AS course_title
    FROM lessons l
    JOIN topics t ON t.id = l.topic_id
    JOIN courses c ON c.id = t.course_id
    WHERE l.master_lesson_id = ?
    ORDER BY c.title COLLATE NOCASE, t.title COLLATE NOCASE
  `).all(id);

  const result = forks.map(f => {
    const fb = db.prepare('SELECT type, content, visibility FROM lesson_blocks WHERE lesson_id = ? ORDER BY position').all(f.id);
    return { ...f, block_count: fb.length, in_sync: JSON.stringify(fb) === masterSig };
  });

  return res.json({
    master: { id: master.id, title: master.title, block_count: masterBlocks.length },
    forks: result,
  });
});

// POST /api/teacher/lessons/:id/push — replace selected forks' blocks with master's
router.post('/lessons/:id/push', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { forkIds } = req.body;

  const master = db.prepare('SELECT id FROM lessons WHERE id = ?').get(id);
  if (!master) return res.status(404).json({ error: 'Lesson not found' });
  if (!Array.isArray(forkIds) || forkIds.length === 0) {
    return res.status(400).json({ error: 'forkIds array required' });
  }

  const masterBlocks = db.prepare('SELECT type, content, position, visibility FROM lesson_blocks WHERE lesson_id = ? ORDER BY position').all(id);

  const updated = db.transaction(() => {
    let count = 0;
    const ins = db.prepare('INSERT INTO lesson_blocks (lesson_id, type, content, position, visibility) VALUES (?, ?, ?, ?, ?)');
    for (const forkId of forkIds) {
      const fork = db.prepare('SELECT id FROM lessons WHERE id = ? AND master_lesson_id = ?').get(forkId, id);
      if (!fork) continue; // ignore ids that aren't forks of this master
      db.prepare('DELETE FROM lesson_blocks WHERE lesson_id = ?').run(forkId);
      for (const b of masterBlocks) ins.run(forkId, b.type, b.content, b.position, b.visibility);
      db.prepare(`UPDATE lessons SET updated_at = datetime('now') WHERE id = ?`).run(forkId);
      count++;
    }
    return count;
  })();

  return res.json({ updated });
});

// ─── GET /api/teacher/lessons/:id ────────────────────────────────────────────

router.get('/lessons/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  maybeAutoPublish(id);
  const row = db.prepare(`
    SELECT l.*, m.title AS master_title, t.title AS topic_title,
           c.course_type AS course_type
    FROM lessons l
    LEFT JOIN lessons m ON m.id = l.master_lesson_id
    LEFT JOIN topics t ON t.id = l.topic_id
    LEFT JOIN courses c ON c.id = t.course_id
    WHERE l.id = ?
  `).get(id);
  const lesson = parseLesson(row);
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });
  return res.json({ lesson });
});

// ─── PUT /api/teacher/lessons/:id ────────────────────────────────────────────

router.put('/lessons/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });

  const {
    title, summary, learning_objectives, difficulty,
    duration_minutes, tags, prerequisites, teacher_notes, publish_at,
  } = req.body;

  if (difficulty !== undefined && !VALID_DIFFICULTY.includes(difficulty)) {
    return res.status(400).json({ error: `difficulty must be one of: ${VALID_DIFFICULTY.join(', ')}` });
  }

  const newTitle       = title               !== undefined ? title.trim()       : existing.title;
  const newSummary     = summary             !== undefined ? summary             : existing.summary;
  const newObjectives  = learning_objectives !== undefined
    ? JSON.stringify(Array.isArray(learning_objectives) ? learning_objectives : [])
    : existing.learning_objectives;
  const newDifficulty  = difficulty          !== undefined ? difficulty          : existing.difficulty;
  const newDuration    = duration_minutes    !== undefined ? duration_minutes    : existing.duration_minutes;
  const newTags        = tags                !== undefined
    ? JSON.stringify(Array.isArray(tags)   ? tags         : [])
    : existing.tags;
  const newPrereqs     = prerequisites       !== undefined
    ? JSON.stringify(Array.isArray(prerequisites) ? prerequisites : [])
    : existing.prerequisites;
  const newNotes       = teacher_notes       !== undefined ? teacher_notes       : existing.teacher_notes;
  const newPublishAt   = publish_at          !== undefined ? publish_at          : existing.publish_at;

  db.prepare(`
    UPDATE lessons
    SET title = ?, summary = ?, learning_objectives = ?, difficulty = ?,
        duration_minutes = ?, tags = ?, prerequisites = ?, teacher_notes = ?,
        publish_at = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(newTitle, newSummary, newObjectives, newDifficulty, newDuration,
         newTags, newPrereqs, newNotes, newPublishAt, id);

  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(id));
  return res.json({ lesson });
});

// ─── PATCH /api/teacher/lessons/:id/status ───────────────────────────────────

router.patch('/lessons/:id/status', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const { status, publish_at } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
  }
  if (status === 'scheduled' && !publish_at) {
    return res.status(400).json({ error: 'publish_at is required when status is scheduled' });
  }

  const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });

  // Clear publish_at when leaving scheduled; set it when entering scheduled
  const newPublishAt = status === 'scheduled' ? publish_at : null;
  db.prepare(`UPDATE lessons SET status = ?, publish_at = ?, updated_at = datetime('now') WHERE id = ?`).run(status, newPublishAt, id);
  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(id));
  return res.json({ lesson });
});

// ─── GET /api/teacher/lessons/:id/export?format=docx ─────────────────────────

router.get('/lessons/:id/export', requireAuth, requireTeacher, async (req, res) => {
  const { id } = req.params;
  const { format = 'docx' } = req.query;

  const lesson = parseLesson(db.prepare('SELECT * FROM lessons WHERE id = ?').get(id));
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' });

  const blocks = db.prepare('SELECT * FROM lesson_blocks WHERE lesson_id = ? ORDER BY position, id').all(id);

  if (format === 'docx') {
    const buffer = await buildLessonDocx(lesson, blocks, req.user);
    const safeName = lesson.title.replace(/[^a-z0-9čćšđž_\- ]/gi, '_').slice(0, 60);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}.docx"`);
    return res.send(buffer);
  }

  return res.status(400).json({ error: 'Unsupported format. Use format=docx' });
});

// ─── DELETE /api/teacher/lessons/:id ─────────────────────────────────────────

router.delete('/lessons/:id', requireAuth, requireTeacher, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT id FROM lessons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Lesson not found' });

  db.prepare('DELETE FROM lessons WHERE id = ?').run(id);
  return res.json({ message: 'Lesson deleted' });
});

module.exports = router;
