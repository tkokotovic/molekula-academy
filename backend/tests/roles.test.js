const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

// Helper — register a user and return their token
async function register(name, email, password = 'lozinka123') {
  const res = await request(app).post('/api/auth/register').send({ name, email, password });
  return res.body.token;
}

// Helper — directly set a user's role in the DB (simulates teacher account creation)
function makeTeacher(email) {
  db.prepare("UPDATE users SET role = 'teacher' WHERE email = ?").run(email);
}

beforeEach(() => {
  db.prepare('DELETE FROM users').run();
});

afterAll(() => {
  db.close();
});

// ─── ROLE MIDDLEWARE ──────────────────────────────────────────────────────────

describe('Teacher-only routes', () => {
  test('teacher can access teacher route', async () => {
    const token = await register('Tomislav', 'tomislav@molekula.hr');
    makeTeacher('tomislav@molekula.hr');

    const res = await request(app)
      .get('/api/admin/ping')
      .set('Authorization', `Bearer ${token}`);

    // Token was issued before role change — re-login to get fresh token
    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'tomislav@molekula.hr',
      password: 'lozinka123',
    });
    const teacherToken = loginRes.body.token;

    const res2 = await request(app)
      .get('/api/admin/ping')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res2.status).toBe(200);
  });

  test('student cannot access teacher route', async () => {
    const token = await register('Ana Horvat', 'ana@test.com');
    const res = await request(app)
      .get('/api/admin/ping')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  test('unauthenticated user cannot access teacher route', async () => {
    const res = await request(app).get('/api/admin/ping');
    expect(res.status).toBe(401);
  });
});

// ─── ROLE VISIBLE IN /me ─────────────────────────────────────────────────────

describe('Role is visible in /me', () => {
  test('newly registered user has student role', async () => {
    const token = await register('Ana Horvat', 'ana@test.com');
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.body.role).toBe('student');
  });

  test('teacher user has teacher role', async () => {
    await register('Tomislav', 'tomislav@molekula.hr');
    makeTeacher('tomislav@molekula.hr');

    const loginRes = await request(app).post('/api/auth/login').send({
      email: 'tomislav@molekula.hr',
      password: 'lozinka123',
    });
    const teacherToken = loginRes.body.token;

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${teacherToken}`);
    expect(res.body.role).toBe('teacher');
  });
});
