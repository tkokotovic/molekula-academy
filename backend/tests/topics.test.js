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

async function createCourse(token, title = 'Opća kemija') {
  const res = await request(app)
    .post('/api/teacher/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({ title });
  return res.body.course;
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

// ─── POST /api/teacher/courses/:courseId/topics ───────────────────────────────

describe('POST /api/teacher/courses/:courseId/topics', () => {
  test('teacher can create a topic', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const res = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Atomska struktura', description: 'Elektroni, protoni i neutroni' });

    expect(res.status).toBe(201);
    expect(res.body.topic).toMatchObject({
      course_id: course.id,
      title: 'Atomska struktura',
      description: 'Elektroni, protoni i neutroni',
      status: 'draft',
    });
    expect(res.body.topic.id).toBeDefined();
    expect(res.body.topic.syllabus_item_ids).toEqual([]);
    expect(res.body.topic.linked_quiz_ids).toEqual([]);
  });

  test('student cannot create a topic', async () => {
    const teacher = await teacherToken();
    const course = await createCourse(teacher);
    const student = await studentToken();

    const res = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${student}`)
      .send({ title: 'Hacked Topic' });

    expect(res.status).toBe(403);
  });

  test('unauthenticated request cannot create a topic', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const res = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .send({ title: 'No Auth' });

    expect(res.status).toBe(401);
  });

  test('title is required', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const res = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No title here' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('returns 404 if course does not exist', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/courses/99999/topics')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Orphan Topic' });

    expect(res.status).toBe(404);
  });

  test('teacher can set syllabus_item_ids on creation', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const res = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Periodični sustav', syllabus_item_ids: [1, 2, 3] });

    expect(res.status).toBe(201);
    expect(res.body.topic.syllabus_item_ids).toEqual([1, 2, 3]);
  });
});

// ─── GET /api/teacher/courses/:courseId/topics ────────────────────────────────

describe('GET /api/teacher/courses/:courseId/topics', () => {
  test('teacher can list topics for a course', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Topic A' });

    await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Topic B' });

    const res = await request(app)
      .get(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.topics).toHaveLength(2);
  });

  test('returns empty array when course has no topics', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const res = await request(app)
      .get(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.topics).toEqual([]);
  });

  test('only returns topics for the requested course', async () => {
    const token = await teacherToken();
    const courseA = await createCourse(token, 'Kemija A');
    const courseB = await createCourse(token, 'Kemija B');

    await request(app)
      .post(`/api/teacher/courses/${courseA.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Topic za A' });

    await request(app)
      .post(`/api/teacher/courses/${courseB.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Topic za B' });

    const res = await request(app)
      .get(`/api/teacher/courses/${courseA.id}/topics`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.topics).toHaveLength(1);
    expect(res.body.topics[0].title).toBe('Topic za A');
  });

  test('student cannot list topics', async () => {
    const teacher = await teacherToken();
    const course = await createCourse(teacher);
    const student = await studentToken();

    const res = await request(app)
      .get(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/teacher/topics/:id ─────────────────────────────────────────────

describe('GET /api/teacher/topics/:id', () => {
  test('teacher can get a single topic by id', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const createRes = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Kemijska veza' });

    const topicId = createRes.body.topic.id;

    const res = await request(app)
      .get(`/api/teacher/topics/${topicId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.topic.title).toBe('Kemijska veza');
    expect(res.body.topic.id).toBe(topicId);
  });

  test('returns 404 for non-existent topic', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .get('/api/teacher/topics/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/teacher/topics/:id ─────────────────────────────────────────────

describe('PUT /api/teacher/topics/:id', () => {
  test('teacher can update title and description', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const createRes = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Stari naziv' });

    const id = createRes.body.topic.id;

    const res = await request(app)
      .put(`/api/teacher/topics/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Novi naziv', description: 'Ažuriran opis' });

    expect(res.status).toBe(200);
    expect(res.body.topic.title).toBe('Novi naziv');
    expect(res.body.topic.description).toBe('Ažuriran opis');
  });

  test('teacher can update syllabus_item_ids', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const createRes = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Organska kemija' });

    const id = createRes.body.topic.id;

    const res = await request(app)
      .put(`/api/teacher/topics/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ syllabus_item_ids: [5, 6, 7] });

    expect(res.status).toBe(200);
    expect(res.body.topic.syllabus_item_ids).toEqual([5, 6, 7]);
  });

  test('returns 404 for non-existent topic', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .put('/api/teacher/topics/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/teacher/topics/:id/status ────────────────────────────────────

describe('PATCH /api/teacher/topics/:id/status', () => {
  test('teacher can publish a draft topic', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const createRes = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Termokemija' });

    const id = createRes.body.topic.id;

    const res = await request(app)
      .patch(`/api/teacher/topics/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.topic.status).toBe('published');
  });

  test('invalid status is rejected', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const createRes = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Elektrokemija' });

    const id = createRes.body.topic.id;

    const res = await request(app)
      .patch(`/api/teacher/topics/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invisible' });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/teacher/topics/:id ──────────────────────────────────────────

describe('DELETE /api/teacher/topics/:id', () => {
  test('teacher can delete a topic', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);

    const createRes = await request(app)
      .post(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Za brisanje' });

    const id = createRes.body.topic.id;

    const res = await request(app)
      .delete(`/api/teacher/topics/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/teacher/courses/${course.id}/topics`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.topics).toHaveLength(0);
  });

  test('returns 404 for non-existent topic', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .delete('/api/teacher/topics/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});
