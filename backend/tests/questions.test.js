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

// ─── POST /api/teacher/questions ─────────────────────────────────────────────

describe('POST /api/teacher/questions', () => {
  test('teacher can create a true_false question', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'true_false',
        stem: 'Water is a covalent compound.',
        difficulty: 'easy',
        ib_level: 'SL',
        ib_paper: 1,
        options: [
          { text: 'True', is_correct: false },
          { text: 'False', is_correct: true },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question).toMatchObject({
      type: 'true_false',
      stem: 'Water is a covalent compound.',
      difficulty: 'easy',
      ib_level: 'SL',
      ib_paper: 1,
      status: 'approved',   // teacher-created questions are auto-approved
    });
    expect(res.body.question.id).toBeDefined();
    expect(res.body.question.options).toHaveLength(2);
  });

  test('teacher can create an MCQ question', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'mcq',
        stem: 'What is the atomic number of carbon?',
        difficulty: 'easy',
        options: [
          { text: '6', is_correct: true },
          { text: '12', is_correct: false },
          { text: '4', is_correct: false },
          { text: '8', is_correct: false },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.type).toBe('mcq');
    expect(res.body.question.options).toHaveLength(4);
    const correct = res.body.question.options.filter(o => o.is_correct);
    expect(correct).toHaveLength(1);
    expect(correct[0].text).toBe('6');
  });

  test('teacher can create a short_answer question with keywords and points', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'short_answer',
        stem: 'Explain why sodium chloride dissolves in water.',
        difficulty: 'medium',
        max_points: 3,
        options: [
          { text: 'Ionic compound', is_correct: true, points: 1, keywords: ['ionic'] },
          { text: 'Polar solvent / water is polar', is_correct: true, points: 1, keywords: ['polar'] },
          { text: 'Ion-dipole interactions', is_correct: true, points: 1, keywords: ['ion-dipole', 'dipole'] },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.max_points).toBe(3);
    expect(res.body.question.options).toHaveLength(3);
  });

  test('teacher can create a chem_equation question', async () => {
    const token = await teacherToken();

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'chem_equation',
        stem: 'Write the balanced equation for the combustion of methane.',
        difficulty: 'medium',
        ib_level: 'SL',
        ib_paper: 2,
        source_type: 'past_exam',
        source_year: 2022,
        source_month: 5,
        source_label: 'IB May 2022 Paper 2',
        max_points: 2,
        options: [
          { text: 'CH4 + 2O2 → CO2 + 2H2O', is_correct: true, points: 2 },
          { text: 'CH4 + 2O2 -> CO2 + 2H2O', is_correct: true, points: 2 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.source_type).toBe('past_exam');
    expect(res.body.question.source_year).toBe(2022);
  });

  test('stem is required', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true_false' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/stem/i);
  });

  test('type is required and must be valid', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ stem: 'Some question?', type: 'essay' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/type/i);
  });

  test('student cannot create a question', async () => {
    const token = await studentToken();
    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true_false', stem: 'Hacked question?' });

    expect(res.status).toBe(403);
  });

  test('unauthenticated request is rejected', async () => {
    const res = await request(app)
      .post('/api/teacher/questions')
      .send({ type: 'true_false', stem: 'Anonymous question?' });

    expect(res.status).toBe(401);
  });
});

// ─── GET /api/teacher/questions ──────────────────────────────────────────────

describe('GET /api/teacher/questions', () => {
  test('teacher can list all approved questions', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true_false', stem: 'Q1', options: [{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }] });

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', stem: 'Q2', options: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }] });

    const res = await request(app)
      .get('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(2);
  });

  test('filter by type', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true_false', stem: 'TF question', options: [{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }] });

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', stem: 'MCQ question', options: [{ text: 'A', is_correct: true }] });

    const res = await request(app)
      .get('/api/teacher/questions?type=true_false')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].type).toBe('true_false');
  });

  test('filter by difficulty', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true_false', stem: 'Easy Q', difficulty: 'easy', options: [{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }] });

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'true_false', stem: 'Hard Q', difficulty: 'hard', options: [{ text: 'True', is_correct: false }, { text: 'False', is_correct: true }] });

    const res = await request(app)
      .get('/api/teacher/questions?difficulty=easy')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].stem).toBe('Easy Q');
  });

  test('filter by ib_level', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', stem: 'HL Q', ib_level: 'HL', options: [{ text: 'A', is_correct: true }] });

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', stem: 'SL Q', ib_level: 'SL', options: [{ text: 'A', is_correct: true }] });

    const res = await request(app)
      .get('/api/teacher/questions?ib_level=HL')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].ib_level).toBe('HL');
  });

  test('filter by source_type', async () => {
    const token = await teacherToken();

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', stem: 'Past exam Q', source_type: 'past_exam', source_year: 2020, options: [{ text: 'A', is_correct: true }] });

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({ type: 'mcq', stem: 'Teacher Q', source_type: 'teacher', options: [{ text: 'A', is_correct: true }] });

    const res = await request(app)
      .get('/api/teacher/questions?source_type=past_exam')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].source_type).toBe('past_exam');
  });

  test('filter by status — pending_approval questions appear with status filter', async () => {
    const token = await teacherToken();

    // Manually insert a pending question via DB to simulate import
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('tomislav@molekula.hr').id;
    db.prepare(`
      INSERT INTO questions (type, stem, difficulty, source_type, status, created_by)
      VALUES ('mcq', 'Imported pending Q', 'easy', 'past_exam', 'pending_approval', ?)
    `).run(userId);

    const res = await request(app)
      .get('/api/teacher/questions?status=pending_approval')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].status).toBe('pending_approval');
  });

  test('student cannot list questions', async () => {
    const token = await studentToken();
    const res = await request(app)
      .get('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/teacher/questions/:id ──────────────────────────────────────────

describe('GET /api/teacher/questions/:id', () => {
  test('teacher can get a single question with options', async () => {
    const token = await teacherToken();

    const createRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'mcq',
        stem: 'What is H2O?',
        options: [
          { text: 'Water', is_correct: true },
          { text: 'Hydrogen', is_correct: false },
        ],
      });

    const id = createRes.body.question.id;
    const res = await request(app)
      .get(`/api/teacher/questions/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.question.stem).toBe('What is H2O?');
    expect(res.body.question.options).toHaveLength(2);
  });

  test('returns 404 for non-existent question', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .get('/api/teacher/questions/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/teacher/questions/:id ──────────────────────────────────────────

describe('PUT /api/teacher/questions/:id', () => {
  test('teacher can update a question stem and difficulty', async () => {
    const token = await teacherToken();

    const createRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'true_false',
        stem: 'Original stem',
        difficulty: 'easy',
        options: [{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }],
      });

    const id = createRes.body.question.id;

    const res = await request(app)
      .put(`/api/teacher/questions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        stem: 'Updated stem',
        difficulty: 'hard',
        options: [{ text: 'True', is_correct: false }, { text: 'False', is_correct: true }],
      });

    expect(res.status).toBe(200);
    expect(res.body.question.stem).toBe('Updated stem');
    expect(res.body.question.difficulty).toBe('hard');
  });

  test('returns 404 for non-existent question', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .put('/api/teacher/questions/99999')
      .set('Authorization', `Bearer ${token}`)
      .send({ stem: 'Ghost' });
    expect(res.status).toBe(404);
  });
});

// ─── PATCH /api/teacher/questions/:id/status ─────────────────────────────────

describe('PATCH /api/teacher/questions/:id/status', () => {
  test('teacher can approve a pending question', async () => {
    const token = await teacherToken();
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('tomislav@molekula.hr').id;
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO questions (type, stem, difficulty, source_type, status, created_by)
      VALUES ('mcq', 'Pending Q', 'easy', 'past_exam', 'pending_approval', ?)
    `).run(userId);

    const res = await request(app)
      .patch(`/api/teacher/questions/${lastInsertRowid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.question.status).toBe('approved');
  });

  test('teacher can reject a pending question', async () => {
    const token = await teacherToken();
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('tomislav@molekula.hr').id;
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO questions (type, stem, difficulty, source_type, status, created_by)
      VALUES ('mcq', 'Bad Q', 'easy', 'past_exam', 'pending_approval', ?)
    `).run(userId);

    const res = await request(app)
      .patch(`/api/teacher/questions/${lastInsertRowid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.question.status).toBe('rejected');
  });

  test('invalid status is rejected', async () => {
    const token = await teacherToken();
    const userId = db.prepare('SELECT id FROM users WHERE email = ?').get('tomislav@molekula.hr').id;
    const { lastInsertRowid } = db.prepare(`
      INSERT INTO questions (type, stem, difficulty, source_type, status, created_by)
      VALUES ('mcq', 'Q', 'easy', 'teacher', 'approved', ?)
    `).run(userId);

    const res = await request(app)
      .patch(`/api/teacher/questions/${lastInsertRowid}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invisible' });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/teacher/questions/:id ───────────────────────────────────────

describe('DELETE /api/teacher/questions/:id', () => {
  test('teacher can delete a question', async () => {
    const token = await teacherToken();

    const createRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'true_false',
        stem: 'To delete',
        options: [{ text: 'True', is_correct: true }, { text: 'False', is_correct: false }],
      });

    const id = createRes.body.question.id;
    const res = await request(app)
      .delete(`/api/teacher/questions/${id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    const listRes = await request(app)
      .get('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`);
    expect(listRes.body.questions).toHaveLength(0);
  });

  test('deleting a question cascades to its options', async () => {
    const token = await teacherToken();

    const createRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        type: 'mcq',
        stem: 'Cascade test',
        options: [{ text: 'A', is_correct: true }, { text: 'B', is_correct: false }],
      });

    const id = createRes.body.question.id;
    await request(app)
      .delete(`/api/teacher/questions/${id}`)
      .set('Authorization', `Bearer ${token}`);

    const opts = db.prepare('SELECT * FROM question_options WHERE question_id = ?').all(id);
    expect(opts).toHaveLength(0);
  });

  test('returns 404 for non-existent question', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .delete('/api/teacher/questions/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});
