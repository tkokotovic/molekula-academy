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

const sampleBatch = [
  {
    type: 'mcq',
    stem: 'What is the molar mass of water?',
    difficulty: 'easy',
    ib_level: 'SL',
    ib_paper: 1,
    source_type: 'past_exam',
    source_year: 2021,
    source_month: 5,
    options: [
      { text: '18 g/mol', is_correct: true },
      { text: '16 g/mol', is_correct: false },
      { text: '20 g/mol', is_correct: false },
      { text: '12 g/mol', is_correct: false },
    ],
  },
  {
    type: 'true_false',
    stem: 'Avogadro\'s number is 6.02 × 10²³.',
    difficulty: 'easy',
    ib_level: 'SL',
    source_type: 'past_exam',
    source_year: 2021,
    source_month: 5,
    options: [
      { text: 'True', is_correct: true },
      { text: 'False', is_correct: false },
    ],
  },
  {
    type: 'short_answer',
    stem: 'State two properties of ionic compounds.',
    difficulty: 'medium',
    ib_level: 'SL',
    ib_paper: 2,
    source_type: 'past_exam',
    source_year: 2021,
    source_month: 5,
    max_points: 2,
    options: [
      { text: 'High melting point', is_correct: true, points: 1, keywords: ['melting', 'high melting'] },
      { text: 'Conducts electricity when dissolved', is_correct: true, points: 1, keywords: ['conduct', 'electricity'] },
    ],
  },
];

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM question_options').run();
  db.prepare('DELETE FROM questions').run();
  db.prepare('DELETE FROM question_import_batches').run();
  db.prepare('DELETE FROM lesson_blocks').run();
  db.prepare('DELETE FROM lessons').run();
  db.prepare('DELETE FROM topics').run();
  db.prepare('DELETE FROM courses').run();
  db.prepare('DELETE FROM users').run();
});

afterAll(() => {
  db.close();
});

// ─── POST /api/teacher/questions/import ──────────────────────────────────────

describe('POST /api/teacher/questions/import', () => {
  test('teacher can import a batch of questions', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: sampleBatch });

    expect(res.status).toBe(201);
    expect(res.body.batch_id).toBeDefined();
    expect(res.body.imported_count).toBe(3);
    expect(res.body.questions).toHaveLength(3);
    // All imported questions start as pending_approval
    res.body.questions.forEach(q => {
      expect(q.status).toBe('pending_approval');
      expect(q.import_batch_id).toBe(res.body.batch_id);
    });
  });

  test('imported questions have the correct batch_id and options', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [sampleBatch[0]] });

    const batchId = res.body.batch_id;
    const q = res.body.questions[0];

    expect(q.import_batch_id).toBe(batchId);
    expect(q.options).toHaveLength(4);
    expect(q.options.find(o => o.is_correct).text).toBe('18 g/mol');
  });

  test('empty questions array is rejected', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/questions/i);
  });

  test('invalid question in batch returns 400 with index info', async () => {
    const token = await teacherToken();

    const badBatch = [
      { type: 'mcq', stem: 'Valid Q', options: [{ text: 'A', is_correct: true }] },
      { type: 'invalid_type', stem: 'Bad Q' },   // invalid type at index 1
    ];

    const res = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: badBatch });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/index 1/i);
  });

  test('import is atomic — if one question is invalid, none are saved', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({
        questions: [
          { type: 'mcq', stem: 'Good Q', options: [{ text: 'A', is_correct: true }] },
          { type: 'bad_type', stem: 'Bad Q' },
        ],
      });

    const count = db.prepare('SELECT COUNT(*) as n FROM questions').get().n;
    expect(count).toBe(0);
  });

  test('student cannot import questions', async () => {
    const token = await studentToken();

    const res = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: sampleBatch });

    expect(res.status).toBe(403);
  });
});

// ─── GET /api/teacher/questions/import/:batchId ───────────────────────────────

describe('GET /api/teacher/questions/import/:batchId', () => {
  test('teacher can get all questions in a batch', async () => {
    const token = await teacherToken();

    const importRes = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: sampleBatch });

    const batchId = importRes.body.batch_id;

    const res = await request(app)
      .get(`/api/teacher/questions/import/${batchId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.batch.id).toBe(batchId);
    expect(res.body.batch.total_count).toBe(3);
    expect(res.body.questions).toHaveLength(3);
  });

  test('returns 404 for non-existent batch', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .get('/api/teacher/questions/import/non-existent-batch')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/teacher/questions/:id/status (approval flow) ─────────────────

describe('Approval workflow for imported questions', () => {
  test('teacher approves a pending question and batch approved_count increments', async () => {
    const token = await teacherToken();

    const importRes = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [sampleBatch[0]] });

    const questionId = importRes.body.questions[0].id;
    const batchId = importRes.body.batch_id;

    await request(app)
      .patch(`/api/teacher/questions/${questionId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' });

    const batch = db.prepare('SELECT * FROM question_import_batches WHERE id = ?').get(batchId);
    expect(batch.approved_count).toBe(1);
  });

  test('teacher rejects a pending question and batch rejected_count increments', async () => {
    const token = await teacherToken();

    const importRes = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [sampleBatch[0]] });

    const questionId = importRes.body.questions[0].id;
    const batchId = importRes.body.batch_id;

    await request(app)
      .patch(`/api/teacher/questions/${questionId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' });

    const batch = db.prepare('SELECT * FROM question_import_batches WHERE id = ?').get(batchId);
    expect(batch.rejected_count).toBe(1);
  });

  test('approved imported questions appear in the main question list', async () => {
    const token = await teacherToken();

    const importRes = await request(app)
      .post('/api/teacher/questions/import')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: sampleBatch });

    // Approve first two, reject the third
    await request(app)
      .patch(`/api/teacher/questions/${importRes.body.questions[0].id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' });

    await request(app)
      .patch(`/api/teacher/questions/${importRes.body.questions[1].id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' });

    await request(app)
      .patch(`/api/teacher/questions/${importRes.body.questions[2].id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' });

    const listRes = await request(app)
      .get('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`);

    // Default list shows only approved — 2 approved from batch
    expect(listRes.body.questions).toHaveLength(2);
  });
});
