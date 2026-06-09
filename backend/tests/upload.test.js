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

// Minimal valid file buffers
const pngBuffer = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489' +
  '0000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex'
);
const pdfBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<< >>\nendobj\n%%EOF');
const textBuffer = Buffer.from('hello world');

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM uploads').run();
  db.prepare('DELETE FROM lesson_blocks').run();
  db.prepare('DELETE FROM lessons').run();
  db.prepare('DELETE FROM topics').run();
  db.prepare('DELETE FROM courses').run();
  db.prepare('DELETE FROM users').run();
});

afterAll(() => {
  db.close();
});

// ─── POST /api/teacher/upload ─────────────────────────────────────────────────

describe('POST /api/teacher/upload', () => {
  test('teacher can upload a PNG image', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngBuffer, { filename: 'atom.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body.upload).toMatchObject({
      original_name: 'atom.png',
      mime_type: 'image/png',
    });
    expect(res.body.upload.id).toBeDefined();
    expect(res.body.upload.filename).toBeDefined();
    expect(res.body.upload.size).toBeGreaterThan(0);
    expect(res.body.upload.path).toBeDefined();
    expect(res.body.upload.uploaded_by).toBeDefined();
  });

  test('teacher can upload a PDF', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pdfBuffer, { filename: 'formula-sheet.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.upload.original_name).toBe('formula-sheet.pdf');
    expect(res.body.upload.mime_type).toBe('application/pdf');
  });

  test('upload is recorded in the DB', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngBuffer, { filename: 'test.png', contentType: 'image/png' });

    const record = db.prepare('SELECT * FROM uploads WHERE id = ?').get(res.body.upload.id);
    expect(record).not.toBeNull();
    expect(record.original_name).toBe('test.png');
  });

  test('generated filename is unique (uuid-based), not the original name', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngBuffer, { filename: 'atom.png', contentType: 'image/png' });

    expect(res.body.upload.filename).not.toBe('atom.png');
    // Should look like a uuid or uuid+extension
    expect(res.body.upload.filename.length).toBeGreaterThan(10);
  });

  test('student cannot upload files', async () => {
    const student = await studentToken();

    const res = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${student}`)
      .attach('file', pngBuffer, { filename: 'hack.png', contentType: 'image/png' });

    expect(res.status).toBe(403);
  });

  test('unauthenticated request cannot upload', async () => {
    const res = await request(app)
      .post('/api/teacher/upload')
      .attach('file', pngBuffer, { filename: 'anon.png', contentType: 'image/png' });

    expect(res.status).toBe(401);
  });

  test('request without a file returns 400', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file/i);
  });

  test('disallowed file type is rejected', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', textBuffer, { filename: 'script.exe', contentType: 'application/octet-stream' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  test('multiple uploads get unique filenames', async () => {
    const token = await teacherToken();

    const r1 = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

    const r2 = await request(app)
      .post('/api/teacher/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', pngBuffer, { filename: 'img.png', contentType: 'image/png' });

    expect(r1.body.upload.filename).not.toBe(r2.body.upload.filename);
  });
});
