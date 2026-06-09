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

async function createTopic(token, courseId, title = 'Atomska struktura') {
  const res = await request(app)
    .post(`/api/teacher/courses/${courseId}/topics`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title });
  return res.body.topic;
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

// ─── POST /api/teacher/topics/:topicId/lessons ────────────────────────────────

describe('POST /api/teacher/topics/:topicId/lessons', () => {
  test('teacher can create a lesson with all fields', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const res = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Građa atoma',
        summary: 'Uvod u građu atoma i subatomske čestice',
        learning_objectives: ['Opisati građu atoma', 'Razlikovati elektron, proton i neutron'],
        difficulty: 'easy',
        duration_minutes: 30,
        tags: ['atom', 'struktura'],
        prerequisites: [],
        teacher_notes: 'Naglasiti razliku između mase i naboja',
      });

    expect(res.status).toBe(201);
    expect(res.body.lesson).toMatchObject({
      topic_id: topic.id,
      title: 'Građa atoma',
      summary: 'Uvod u građu atoma i subatomske čestice',
      difficulty: 'easy',
      duration_minutes: 30,
      status: 'draft',
      teacher_notes: 'Naglasiti razliku između mase i naboja',
    });
    expect(res.body.lesson.id).toBeDefined();
    expect(res.body.lesson.learning_objectives).toEqual(['Opisati građu atoma', 'Razlikovati elektron, proton i neutron']);
    expect(res.body.lesson.tags).toEqual(['atom', 'struktura']);
    expect(res.body.lesson.prerequisites).toEqual([]);
    expect(res.body.lesson.linked_quiz_ids).toEqual([]);
  });

  test('teacher can create a minimal lesson (title only)', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const res = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Minimalna lekcija' });

    expect(res.status).toBe(201);
    expect(res.body.lesson.title).toBe('Minimalna lekcija');
    expect(res.body.lesson.difficulty).toBe('medium');
    expect(res.body.lesson.learning_objectives).toEqual([]);
    expect(res.body.lesson.tags).toEqual([]);
  });

  test('student cannot create a lesson', async () => {
    const teacher = await teacherToken();
    const course = await createCourse(teacher);
    const topic = await createTopic(teacher, course.id);
    const student = await studentToken();

    const res = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${student}`)
      .send({ title: 'Hacked Lesson' });

    expect(res.status).toBe(403);
  });

  test('unauthenticated request cannot create a lesson', async () => {
    const teacher = await teacherToken();
    const course = await createCourse(teacher);
    const topic = await createTopic(teacher, course.id);

    const res = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .send({ title: 'No Auth' });

    expect(res.status).toBe(401);
  });

  test('title is required', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const res = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ summary: 'No title' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('returns 404 if topic does not exist', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/topics/99999/lessons')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Orphan Lesson' });

    expect(res.status).toBe(404);
  });

  test('invalid difficulty is rejected', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const res = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Bad Difficulty', difficulty: 'expert' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/difficulty/i);
  });

  test('accepted difficulty values: easy, medium, hard', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    for (const diff of ['easy', 'medium', 'hard']) {
      const res = await request(app)
        .post(`/api/teacher/topics/${topic.id}/lessons`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: `Lesson ${diff}`, difficulty: diff });
      expect(res.status).toBe(201);
      expect(res.body.lesson.difficulty).toBe(diff);
    }
  });
});

// ─── GET /api/teacher/topics/:topicId/lessons ────────────────────────────────

describe('GET /api/teacher/topics/:topicId/lessons', () => {
  test('teacher can list lessons for a topic', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lekcija A' });

    await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lekcija B' });

    const res = await request(app)
      .get(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lessons).toHaveLength(2);
  });

  test('returns empty array when topic has no lessons', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const res = await request(app)
      .get(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lessons).toEqual([]);
  });

  test('only returns lessons for the requested topic', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topicA = await createTopic(token, course.id, 'Topic A');
    const topicB = await createTopic(token, course.id, 'Topic B');

    await request(app)
      .post(`/api/teacher/topics/${topicA.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lekcija za A' });

    await request(app)
      .post(`/api/teacher/topics/${topicB.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lekcija za B' });

    const res = await request(app)
      .get(`/api/teacher/topics/${topicA.id}/lessons`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.body.lessons).toHaveLength(1);
    expect(res.body.lessons[0].title).toBe('Lekcija za A');
  });

  test('student cannot list lessons via teacher endpoint', async () => {
    const teacher = await teacherToken();
    const course = await createCourse(teacher);
    const topic = await createTopic(teacher, course.id);
    const student = await studentToken();

    const res = await request(app)
      .get(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/teacher/lessons/:id ────────────────────────────────────────────

describe('GET /api/teacher/lessons/:id', () => {
  test('teacher can get a single lesson by id', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Kemijska veza', teacher_notes: 'Privatne bilješke' });

    const lessonId = createRes.body.lesson.id;

    const res = await request(app)
      .get(`/api/teacher/lessons/${lessonId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.lesson.title).toBe('Kemijska veza');
    expect(res.body.lesson.teacher_notes).toBe('Privatne bilješke');
  });

  test('returns 404 for non-existent lesson', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .get('/api/teacher/lessons/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/teacher/lessons/:id ────────────────────────────────────────────

describe('PUT /api/teacher/lessons/:id', () => {
  test('teacher can update title, summary, and difficulty', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Stari naziv' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .put(`/api/teacher/lessons/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Novi naziv', summary: 'Novi sažetak', difficulty: 'hard' });

    expect(res.status).toBe(200);
    expect(res.body.lesson.title).toBe('Novi naziv');
    expect(res.body.lesson.summary).toBe('Novi sažetak');
    expect(res.body.lesson.difficulty).toBe('hard');
  });

  test('teacher can update learning_objectives array', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Elektrokemija' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .put(`/api/teacher/lessons/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ learning_objectives: ['Razumjeti oksidaciju', 'Razumjeti redukciju'] });

    expect(res.status).toBe(200);
    expect(res.body.lesson.learning_objectives).toEqual(['Razumjeti oksidaciju', 'Razumjeti redukciju']);
  });

  test('teacher can update tags and prerequisites', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Termodinamika' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .put(`/api/teacher/lessons/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ tags: ['toplina', 'entropija'], prerequisites: [id - 1] });

    expect(res.status).toBe(200);
    expect(res.body.lesson.tags).toEqual(['toplina', 'entropija']);
    expect(res.body.lesson.prerequisites).toEqual([id - 1]);
  });

  test('invalid difficulty in update is rejected', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Test' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .put(`/api/teacher/lessons/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ difficulty: 'legend' });

    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent lesson', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .put('/api/teacher/lessons/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/teacher/lessons/:id/status ────────────────────────────────────

describe('PATCH /api/teacher/lessons/:id/status', () => {
  test('teacher can publish a draft lesson', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Termokemija' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .patch(`/api/teacher/lessons/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.lesson.status).toBe('published');
  });

  test('teacher can archive a lesson', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Stara lekcija' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .patch(`/api/teacher/lessons/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(200);
    expect(res.body.lesson.status).toBe('archived');
  });

  test('invalid status is rejected', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lekcija' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .patch(`/api/teacher/lessons/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'hidden' });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/teacher/lessons/:id ─────────────────────────────────────────

describe('DELETE /api/teacher/lessons/:id', () => {
  test('teacher can delete a lesson', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    const createRes = await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Za brisanje' });

    const id = createRes.body.lesson.id;

    const res = await request(app)
      .delete(`/api/teacher/lessons/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.lessons).toHaveLength(0);
  });

  test('returns 404 for non-existent lesson', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .delete('/api/teacher/lessons/99999')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('deleting a topic cascades and removes its lessons', async () => {
    const token = await teacherToken();
    const course = await createCourse(token);
    const topic = await createTopic(token, course.id);

    await request(app)
      .post(`/api/teacher/topics/${topic.id}/lessons`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Lekcija koja nestaje' });

    await request(app)
      .delete(`/api/teacher/topics/${topic.id}`)
      .set('Authorization', `Bearer ${token}`);

    const remaining = db.prepare('SELECT * FROM lessons WHERE topic_id = ?').all(topic.id);
    expect(remaining).toHaveLength(0);
  });
});
