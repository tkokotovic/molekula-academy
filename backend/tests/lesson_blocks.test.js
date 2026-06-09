const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function register(name, email, password = 'lozinka123') {
  const res = await request(app).post('/api/auth/register').send({ name, email, password });
  return res.body.token;
}

function makeTeacher(email) {
  db.prepare("UPDATE users SET role = 'teacher' WHERE email = ?").run(email);
}

async function teacherToken() {
  await register('Tomislav', 'tomislav@molekula.hr');
  makeTeacher('tomislav@molekula.hr');
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tomislav@molekula.hr', password: 'lozinka123' });
  return res.body.token;
}

async function studentToken() {
  return register('Ana', 'ana@student.hr');
}

async function createCourse(token) {
  const res = await request(app)
    .post('/api/teacher/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Opća kemija' });
  return res.body.course;
}

async function createTopic(token, courseId) {
  const res = await request(app)
    .post(`/api/teacher/courses/${courseId}/topics`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Atomska struktura' });
  return res.body.topic;
}

async function createLesson(token, topicId) {
  const res = await request(app)
    .post(`/api/teacher/topics/${topicId}/lessons`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Građa atoma' });
  return res.body.lesson;
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM lesson_blocks').run();
  db.prepare('DELETE FROM lessons').run();
  db.prepare('DELETE FROM topics').run();
  db.prepare('DELETE FROM courses').run();
  db.prepare('DELETE FROM users').run();
});

afterAll(() => {
  db.close();
});

// ─── POST /api/teacher/lessons/:lessonId/blocks ───────────────────────────────

describe('POST /api/teacher/lessons/:lessonId/blocks', () => {
  test('teacher can add a text block', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const res = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>Atom je osnovna čestica tvari.</p>' } });

    expect(res.status).toBe(201);
    expect(res.body.block).toMatchObject({
      lesson_id: lesson.id,
      type: 'text',
    });
    expect(res.body.block.id).toBeDefined();
    expect(res.body.block.content).toMatchObject({ html: '<p>Atom je osnovna čestica tvari.</p>' });
  });

  test('teacher can add an equation block', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const res = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'equation', content: { latex: 'E = mc^2', display: true } });

    expect(res.status).toBe(201);
    expect(res.body.block.type).toBe('equation');
    expect(res.body.block.content).toMatchObject({ latex: 'E = mc^2', display: true });
  });

  test('teacher can add all 11 block types', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const types = [
      { type: 'text',       content: { html: '<p>Tekst</p>' } },
      { type: 'equation',   content: { latex: 'H_2O', display: false } },
      { type: 'image',      content: { url: '/uploads/atom.png', caption: 'Atom' } },
      { type: 'animation',  content: { url: '/uploads/animation.gif', caption: 'Animacija' } },
      { type: 'pdf',        content: { url: '/uploads/doc.pdf', title: 'Dokument' } },
      { type: 'video',      content: { url: 'https://youtu.be/abc', caption: 'Video' } },
      { type: 'molecule3d', content: { data: 'ATOM 1...', format: 'pdb' } },
      { type: 'table',      content: { headers: ['Element', 'Simbol'], rows: [['Vodik', 'H']] } },
      { type: 'link',       content: { url: 'https://periodni.com', label: 'Periodni sustav' } },
      { type: 'flashcard',  content: { front: 'Što je atom?', back: 'Osnovna čestica tvari.' } },
      { type: 'summary',    content: { points: ['Atom ima jezgru', 'Jezgra ima protone i neutrone'] } },
    ];

    for (const block of types) {
      const res = await request(app)
        .post(`/api/teacher/lessons/${lesson.id}/blocks`)
        .set('Authorization', `Bearer ${token}`)
        .send(block);
      expect(res.status).toBe(201);
      expect(res.body.block.type).toBe(block.type);
    }
  });

  test('type is required', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const res = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: { html: '<p>no type</p>' } });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  test('invalid block type is rejected', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const res = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'diagram', content: {} });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  test('returns 404 if lesson does not exist', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/lessons/99999/blocks')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>orphan</p>' } });

    expect(res.status).toBe(404);
  });

  test('student cannot add a block', async () => {
    const teacher = await teacherToken();
    const course = await createCourse(teacher);
    const topic = await createTopic(teacher, course.id);
    const lesson = await createLesson(teacher, topic.id);
    const student = await studentToken();

    const res = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${student}`)
      .send({ type: 'text', content: { html: '<p>hack</p>' } });

    expect(res.status).toBe(403);
  });

  test('blocks are auto-positioned in order', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const b1 = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>prvi</p>' } });

    const b2 = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>drugi</p>' } });

    expect(b1.body.block.position).toBe(0);
    expect(b2.body.block.position).toBe(1);
  });
});

// ─── GET /api/teacher/lessons/:lessonId/blocks ───────────────────────────────

describe('GET /api/teacher/lessons/:lessonId/blocks', () => {
  test('teacher can list blocks for a lesson in order', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>A</p>' } });

    await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'equation', content: { latex: 'x=1' } });

    const res = await request(app)
      .get(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.blocks).toHaveLength(2);
    expect(res.body.blocks[0].type).toBe('text');
    expect(res.body.blocks[1].type).toBe('equation');
  });

  test('returns empty array when lesson has no blocks', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const res = await request(app)
      .get(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.blocks).toEqual([]);
  });

  test('student cannot list blocks via teacher endpoint', async () => {
    const teacher = await teacherToken();
    const course = await createCourse(teacher);
    const topic = await createTopic(teacher, course.id);
    const lesson = await createLesson(teacher, topic.id);
    const student = await studentToken();

    const res = await request(app)
      .get(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(403);
  });
});

// ─── PATCH /api/teacher/blocks/:id — update content ──────────────────────────

describe('PATCH /api/teacher/blocks/:id', () => {
  test('teacher can update block content', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const createRes = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>stari</p>' } });

    const blockId = createRes.body.block.id;

    const res = await request(app)
      .patch(`/api/teacher/blocks/${blockId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ content: { html: '<p>novi sadržaj</p>' } });

    expect(res.status).toBe(200);
    expect(res.body.block.content).toMatchObject({ html: '<p>novi sadržaj</p>' });
  });

  test('returns 404 for non-existent block', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .patch('/api/teacher/blocks/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ content: { html: '<p>ghost</p>' } });

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/teacher/lessons/:lessonId/blocks/reorder ─────────────────────

describe('PATCH /api/teacher/lessons/:lessonId/blocks/reorder', () => {
  test('teacher can reorder blocks', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const b1 = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>prvi</p>' } });

    const b2 = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'equation', content: { latex: 'x=1' } });

    const b3 = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'image', content: { url: '/img.png' } });

    // Reverse the order
    const ids = [b3.body.block.id, b1.body.block.id, b2.body.block.id];

    const res = await request(app)
      .patch(`/api/teacher/lessons/${lesson.id}/blocks/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({ ids });

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`);

    expect(listRes.body.blocks[0].id).toBe(ids[0]);
    expect(listRes.body.blocks[1].id).toBe(ids[1]);
    expect(listRes.body.blocks[2].id).toBe(ids[2]);
  });

  test('ids array is required for reorder', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const res = await request(app)
      .patch(`/api/teacher/lessons/${lesson.id}/blocks/reorder`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/teacher/blocks/:id ──────────────────────────────────────────

describe('DELETE /api/teacher/blocks/:id', () => {
  test('teacher can delete a block', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    const createRes = await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>za brisanje</p>' } });

    const blockId = createRes.body.block.id;

    const res = await request(app)
      .delete(`/api/teacher/blocks/${blockId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.blocks).toHaveLength(0);
  });

  test('returns 404 for non-existent block', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .delete('/api/teacher/blocks/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('deleting a lesson cascades and removes its blocks', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);
    const lesson = await createLesson(token, topic.id);

    await request(app)
      .post(`/api/teacher/lessons/${lesson.id}/blocks`)
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'text', content: { html: '<p>nestaje</p>' } });

    await request(app)
      .delete(`/api/teacher/lessons/${lesson.id}`)
      .set('Authorization', `Bearer ${token}`);

    const remaining = db.prepare('SELECT * FROM lesson_blocks WHERE lesson_id = ?').all(lesson.id);
    expect(remaining).toHaveLength(0);
  });
});
