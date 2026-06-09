const request = require('supertest');
const app = require('../src/app');
const db = require('../src/db');

beforeEach(() => {
  db.prepare('DELETE FROM users').run();
});

afterAll(() => {
  db.close();
});

// ─── REGISTER ────────────────────────────────────────────────────────────────

describe('POST /api/auth/register', () => {
  test('creates a new student account', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana Horvat',
      email: 'ana@test.com',
      password: 'lozinka123',
    });
    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('ana@test.com');
    expect(res.body.user.role).toBe('student');
    expect(res.body.user.password).toBeUndefined(); // never expose password
    expect(res.body.token).toBeDefined();
  });

  test('rejects duplicate email', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Ana Horvat',
      email: 'ana@test.com',
      password: 'lozinka123',
    });
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana Kopija',
      email: 'ana@test.com',
      password: 'drugilozinka',
    });
    expect(res.status).toBe(409);
  });

  test('rejects missing fields', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'ana@test.com',
    });
    expect(res.status).toBe(400);
  });

  test('rejects password shorter than 8 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana Horvat',
      email: 'ana@test.com',
      password: 'kratko',
    });
    expect(res.status).toBe(400);
  });
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Ana Horvat',
      email: 'ana@test.com',
      password: 'lozinka123',
    });
  });

  test('returns token with correct credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ana@test.com',
      password: 'lozinka123',
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe('ana@test.com');
  });

  test('rejects wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'ana@test.com',
      password: 'krivlozinka',
    });
    expect(res.status).toBe(401);
  });

  test('rejects unknown email', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'netko@test.com',
      password: 'lozinka123',
    });
    expect(res.status).toBe(401);
  });
});

// ─── GET CURRENT USER ────────────────────────────────────────────────────────

describe('GET /api/auth/me', () => {
  let token;

  beforeEach(async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Ana Horvat',
      email: 'ana@test.com',
      password: 'lozinka123',
    });
    token = res.body.token;
  });

  test('returns current user with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('ana@test.com');
    expect(res.body.password).toBeUndefined();
  });

  test('rejects request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('rejects invalid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer ovonijevalidan');
    expect(res.status).toBe(401);
  });
});
