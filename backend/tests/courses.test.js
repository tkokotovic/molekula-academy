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
  // Re-login so the JWT carries the updated 'teacher' role
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tomislav@molekula.hr', password: 'lozinka123' });
  return res.body.token;
}

async function studentToken() {
  return register('Ana', 'ana@student.hr');
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

// ─── Courses CRUD ─────────────────────────────────────────────────────────────

describe('POST /api/teacher/courses', () => {
  test('teacher can create a course', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'IB Chemistry HL',
        description: 'Comprehensive IB Chemistry Higher Level course',
        target_audience: ['IB'],
      });

    expect(res.status).toBe(201);
    expect(res.body.course).toMatchObject({
      title: 'IB Chemistry HL',
      slug: 'ib-chemistry-hl',
      status: 'draft',
      target_audience: ['IB'],
    });
    expect(res.body.course.id).toBeDefined();
  });

  test('student cannot create a course', async () => {
    const token = await studentToken();

    const res = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hacked Course' });

    expect(res.status).toBe(403);
  });

  test('unauthenticated request cannot create a course', async () => {
    const res = await request(app)
      .post('/api/teacher/courses')
      .send({ title: 'No Auth Course' });

    expect(res.status).toBe(401);
  });

  test('title is required', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No title given' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/title/i);
  });

  test('slug is auto-generated and unique — duplicate title gets a suffix', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Organic Chemistry' });

    const res = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Organic Chemistry' });

    expect(res.status).toBe(201);
    expect(res.body.course.slug).not.toBe('organic-chemistry');
    expect(res.body.course.slug).toMatch(/^organic-chemistry-/);
  });
});

describe('GET /api/teacher/courses', () => {
  test('teacher can list all courses including drafts', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Course A' });

    await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Course B' });

    const res = await request(app)
      .get('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(2);
  });

  test('student cannot list teacher courses', async () => {
    const token = await studentToken();
    const res = await request(app)
      .get('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/courses (public)', () => {
  test('public list returns only published courses', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Draft Course' });

    const pubRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Published Course' });

    await request(app)
      .patch(`/api/teacher/courses/${pubRes.body.course.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    const res = await request(app).get('/api/courses');

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);
    expect(res.body.courses[0].title).toBe('Published Course');
  });

  test('public list does not expose teacher_notes or private fields', async () => {
    const token = await teacherToken();
    const createRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Public Course' });

    await request(app)
      .patch(`/api/teacher/courses/${createRes.body.course.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    const res = await request(app).get('/api/courses');
    expect(res.body.courses[0]).not.toHaveProperty('teacher_notes');
  });
});

describe('PUT /api/teacher/courses/:id', () => {
  test('teacher can update a course title and description', async () => {
    const token = await teacherToken();
    const createRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Old Title' });

    const id = createRes.body.course.id;

    const res = await request(app)
      .put(`/api/teacher/courses/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'New Title', description: 'Updated description' });

    expect(res.status).toBe(200);
    expect(res.body.course.title).toBe('New Title');
    expect(res.body.course.description).toBe('Updated description');
  });

  test('updating a non-existent course returns 404', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .put('/api/teacher/courses/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/teacher/courses/:id/status', () => {
  test('teacher can publish a draft course', async () => {
    const token = await teacherToken();
    const createRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Chemistry Basics' });

    const id = createRes.body.course.id;

    const res = await request(app)
      .patch(`/api/teacher/courses/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe('published');
  });

  test('teacher can archive a published course', async () => {
    const token = await teacherToken();
    const createRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Old Course' });
    const id = createRes.body.course.id;

    await request(app)
      .patch(`/api/teacher/courses/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    const res = await request(app)
      .patch(`/api/teacher/courses/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'archived' });

    expect(res.status).toBe(200);
    expect(res.body.course.status).toBe('archived');
  });

  test('invalid status value is rejected', async () => {
    const token = await teacherToken();
    const createRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Some Course' });
    const id = createRes.body.course.id;

    const res = await request(app)
      .patch(`/api/teacher/courses/${id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invisible' });

    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/teacher/courses/:id', () => {
  test('teacher can delete a course', async () => {
    const token = await teacherToken();
    const createRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'To Delete' });
    const id = createRes.body.course.id;

    const res = await request(app)
      .delete(`/api/teacher/courses/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.courses).toHaveLength(0);
  });

  test('deleting a course cascades and removes its topics', async () => {
    const token = await teacherToken();
    const createRes = await request(app)
      .post('/api/teacher/courses')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Parent Course' });
    const courseId = createRes.body.course.id;

    await request(app)
      .post(`/api/teacher/courses/${courseId}/topics`)
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Organic Chemistry' });

    await request(app)
      .delete(`/api/teacher/courses/${courseId}`)
      .set('Authorization', `Bearer ${token}`);

    const remaining = db.prepare('SELECT * FROM topics WHERE course_id = ?').all(courseId);
    expect(remaining).toHaveLength(0);
  });
});
