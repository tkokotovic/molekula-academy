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

async function studentToken(email = 'ana@student.hr') {
  return register('Ana', email);
}

async function createTopic(token) {
  const courseRes = await request(app)
    .post('/api/teacher/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'IB Chemistry', slug: 'ib-chem' });
  const courseId = courseRes.body.course.id;

  const topicRes = await request(app)
    .post(`/api/teacher/courses/${courseId}/topics`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Stoichiometry' });
  return topicRes.body.topic.id;
}

async function createPublishedQuiz(token, topicId, questionIds) {
  const res = await request(app)
    .post('/api/teacher/quizzes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Test Quiz',
      topic_id: topicId,
      questions: questionIds.map((id, i) => ({ question_id: id, position: i })),
    });
  const quizId = res.body.id;
  await request(app)
    .patch(`/api/teacher/quizzes/${quizId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'published' });
  return quizId;
}

// ─── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM ai_grading_corrections').run();
  db.prepare('DELETE FROM quiz_attempt_answers').run();
  db.prepare('DELETE FROM quiz_attempts').run();
  db.prepare('DELETE FROM quiz_questions').run();
  db.prepare('DELETE FROM quizzes').run();
  db.prepare('DELETE FROM question_options').run();
  db.prepare('DELETE FROM questions').run();
  db.prepare('DELETE FROM question_import_batches').run();
  db.prepare('DELETE FROM lesson_blocks').run();
  db.prepare('DELETE FROM lessons').run();
  db.prepare('DELETE FROM topics').run();
  db.prepare('DELETE FROM courses').run();
  db.prepare('DELETE FROM users').run();
});

afterAll(() => db.close());

// ─── Model answer ─────────────────────────────────────────────────────────────

describe('model_answer field on questions', () => {
  test('teacher can create a short_answer question with model_answer', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'short_answer',
        stem: 'Explain why ice floats on water.',
        difficulty: 'medium',
        max_points: 3,
        model_answer: 'Ice is less dense than liquid water because hydrogen bonds in ice form a hexagonal lattice, holding molecules further apart.',
        topic_id: topicId,
        options: [
          { text: 'hydrogen bonds', is_correct: true, points: 2, keywords: ['hydrogen bond', 'H-bond'] },
          { text: 'lower density', is_correct: true, points: 1, keywords: ['density', 'less dense'] },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.model_answer).toContain('hydrogen bonds in ice');
    expect(res.body.question.status).toBe('approved');
  });

  test('model_answer is returned in GET /api/teacher/questions/:id', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const createRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'fill_blank',
        stem: 'The chemical formula for water is ___.',
        difficulty: 'easy',
        max_points: 1,
        model_answer: 'H2O',
        topic_id: topicId,
        options: [
          { text: 'H2O', is_correct: true, points: 1, keywords: ['H2O', 'water'] },
        ],
      });

    const id = createRes.body.question.id;
    const getRes = await request(app)
      .get(`/api/teacher/questions/${id}`)
      .set('Authorization', `Bearer ${tToken}`);

    expect(getRes.status).toBe(200);
    expect(getRes.body.question.model_answer).toBe('H2O');
  });

  test('teacher can update model_answer via PUT', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const createRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'short_answer',
        stem: 'Define enthalpy.',
        difficulty: 'hard',
        max_points: 2,
        topic_id: topicId,
        options: [
          { text: 'heat content', is_correct: true, points: 2, keywords: ['heat', 'enthalpy'] },
        ],
      });

    const id = createRes.body.question.id;

    const putRes = await request(app)
      .put(`/api/teacher/questions/${id}`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ model_answer: 'Enthalpy is the total heat content of a system at constant pressure.' });

    expect(putRes.status).toBe(200);
    expect(putRes.body.question.model_answer).toBe('Enthalpy is the total heat content of a system at constant pressure.');
  });

  test('model_answer is null if not provided (existing questions unaffected)', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'What is the molar mass of H2O?',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: '18 g/mol', is_correct: true,  points: 1, keywords: [] },
          { text: '16 g/mol', is_correct: false, points: 0, keywords: [] },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.model_answer).toBeNull();
    expect(res.body.question.status).toBe('approved');
  });
});

// ─── AI-generated pending approval ────────────────────────────────────────────

describe('ai_generated_pending_approval status', () => {
  test('MCQ with no is_correct option → status ai_generated_pending_approval, one option is_ai_suggested', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'What is the SI unit of pressure?',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'Pascal', is_correct: false, points: 0, keywords: [] },
          { text: 'Newton', is_correct: false, points: 0, keywords: [] },
          { text: 'Joule',  is_correct: false, points: 0, keywords: [] },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.status).toBe('ai_generated_pending_approval');
    const suggested = res.body.question.options.filter(o => o.is_ai_suggested);
    expect(suggested.length).toBe(1);
  });

  test('true_false with no correct option → AI suggests', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'true_false',
        stem: 'Oxygen is a metal.',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'True',  is_correct: false, points: 0, keywords: [] },
          { text: 'False', is_correct: false, points: 0, keywords: [] },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.status).toBe('ai_generated_pending_approval');
    const suggested = res.body.question.options.filter(o => o.is_ai_suggested);
    expect(suggested.length).toBe(1);
  });

  test('short_answer with no model_answer and no correct option → AI generates model_answer', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'short_answer',
        stem: 'Describe the structure of a benzene ring.',
        difficulty: 'hard',
        max_points: 3,
        topic_id: topicId,
        // No options, no model_answer
      });

    expect(res.status).toBe(201);
    expect(res.body.question.status).toBe('ai_generated_pending_approval');
    expect(res.body.question.model_answer).not.toBeNull();
    expect(res.body.question.model_answer.length).toBeGreaterThan(0);
  });

  test('chem_equation with no correct answer → AI generates model_answer', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'chem_equation',
        stem: 'Write the equation for the dissociation of sulfuric acid in water.',
        difficulty: 'medium',
        max_points: 2,
        topic_id: topicId,
      });

    expect(res.status).toBe(201);
    expect(res.body.question.status).toBe('ai_generated_pending_approval');
    expect(res.body.question.model_answer).not.toBeNull();
  });

  test('MCQ with a correct option → status approved (normal)', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'Which is the lightest element?',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'Hydrogen', is_correct: true,  points: 1, keywords: [] },
          { text: 'Helium',   is_correct: false, points: 0, keywords: [] },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.question.status).toBe('approved');
    expect(res.body.question.options.every(o => !o.is_ai_suggested)).toBe(true);
  });

  test('short_answer with model_answer provided → status approved (no AI needed)', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'short_answer',
        stem: 'What is Avogadro\'s number?',
        difficulty: 'easy',
        max_points: 1,
        model_answer: '6.022 × 10²³ particles per mole.',
        topic_id: topicId,
      });

    expect(res.status).toBe(201);
    expect(res.body.question.status).toBe('approved');
    expect(res.body.question.model_answer).toContain('6.022');
  });

  test('teacher can approve an ai_generated_pending_approval question', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const createRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'What is the charge of an electron?',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'Positive', is_correct: false, points: 0, keywords: [] },
          { text: 'Negative', is_correct: false, points: 0, keywords: [] },
          { text: 'Neutral',  is_correct: false, points: 0, keywords: [] },
        ],
      });

    expect(createRes.body.question.status).toBe('ai_generated_pending_approval');

    const approveRes = await request(app)
      .patch(`/api/teacher/questions/${createRes.body.question.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'approved' });

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.question.status).toBe('approved');
  });

  test('GET /api/teacher/questions with status=ai_generated_pending_approval returns those questions', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'What is the boiling point of nitrogen?',
        difficulty: 'medium',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: '-196°C', is_correct: false, points: 0, keywords: [] },
          { text: '-100°C', is_correct: false, points: 0, keywords: [] },
        ],
      });

    const listRes = await request(app)
      .get('/api/teacher/questions?status=ai_generated_pending_approval')
      .set('Authorization', `Bearer ${tToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.questions.length).toBeGreaterThanOrEqual(1);
    expect(listRes.body.questions[0].status).toBe('ai_generated_pending_approval');
  });

  test('is_ai_suggested flag is returned in options list', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const res = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'Which gas makes up most of the atmosphere?',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'Nitrogen', is_correct: false, points: 0, keywords: [] },
          { text: 'Oxygen',   is_correct: false, points: 0, keywords: [] },
          { text: 'Argon',    is_correct: false, points: 0, keywords: [] },
        ],
      });

    const id = res.body.question.id;
    const getRes = await request(app)
      .get(`/api/teacher/questions/${id}`)
      .set('Authorization', `Bearer ${tToken}`);

    const opts = getRes.body.question.options;
    expect(opts.some(o => o.is_ai_suggested === true)).toBe(true);
    expect(opts.some(o => o.is_ai_suggested === false)).toBe(true);
  });
});

// ─── Option shuffle ────────────────────────────────────────────────────────────

describe('Option shuffle in attempts', () => {
  test('starting an attempt stores option_orders for multi-option questions', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const qRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'Which is most electronegative?',
        difficulty: 'medium',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'Fluorine',  is_correct: true,  points: 1, keywords: [] },
          { text: 'Oxygen',    is_correct: false, points: 0, keywords: [] },
          { text: 'Nitrogen',  is_correct: false, points: 0, keywords: [] },
          { text: 'Chlorine',  is_correct: false, points: 0, keywords: [] },
        ],
      });
    const qId = qRes.body.question.id;
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptRes = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(attemptRes.status).toBe(201);
    const attemptId = attemptRes.body.id;

    const storedAttempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);
    expect(storedAttempt.option_orders).not.toBeNull();

    const orders = JSON.parse(storedAttempt.option_orders);
    expect(orders[String(qId)]).toBeDefined();
    expect(Array.isArray(orders[String(qId)])).toBe(true);
    expect(orders[String(qId)].length).toBe(4);
  });

  test('student sees options in shuffled order when viewing attempt', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const qRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'Which is the noble gas?',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'Neon',     is_correct: true,  points: 1, keywords: [] },
          { text: 'Sodium',   is_correct: false, points: 0, keywords: [] },
          { text: 'Sulfur',   is_correct: false, points: 0, keywords: [] },
          { text: 'Silicon',  is_correct: false, points: 0, keywords: [] },
        ],
      });
    const qId = qRes.body.question.id;
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptRes = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);
    const attemptId = attemptRes.body.id;

    // Submit to allow viewing
    await request(app)
      .post(`/api/student/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ answers: [] });

    const viewRes = await request(app)
      .get(`/api/student/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(viewRes.status).toBe(200);
    const options = viewRes.body.answers[0].question.options;
    expect(options.length).toBe(4);

    // Verify the order matches stored option_orders
    const stored = db.prepare('SELECT option_orders FROM quiz_attempts WHERE id = ?').get(attemptId);
    const orders = JSON.parse(stored.option_orders);
    const expectedOrder = orders[String(qId)];
    const returnedIds = options.map(o => o.id);
    expect(returnedIds).toEqual(expectedOrder);
  });

  test('teacher sees same option order as student for the same attempt', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const qRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'Which bond is strongest?',
        difficulty: 'medium',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'C-C', is_correct: false, points: 0, keywords: [] },
          { text: 'C=C', is_correct: false, points: 0, keywords: [] },
          { text: 'C≡C', is_correct: true,  points: 1, keywords: [] },
          { text: 'C-H', is_correct: false, points: 0, keywords: [] },
        ],
      });
    const qId = qRes.body.question.id;
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptRes = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);
    const attemptId = attemptRes.body.id;

    await request(app)
      .post(`/api/student/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ answers: [] });

    // Student view
    const studentView = await request(app)
      .get(`/api/student/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${sToken}`);

    // Teacher view
    const teacherView = await request(app)
      .get(`/api/teacher/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${tToken}`);

    const studentOptionIds = studentView.body.answers[0].question.options.map(o => o.id);
    const teacherOptionIds = teacherView.body.answers[0].question.options.map(o => o.id);

    expect(studentOptionIds).toEqual(teacherOptionIds);
  });

  test('true_false question (2 options) — option_orders still stored and used', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    const qRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'true_false',
        stem: 'Gold is a transition metal.',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'True',  is_correct: true,  points: 1, keywords: [] },
          { text: 'False', is_correct: false, points: 0, keywords: [] },
        ],
      });
    const qId = qRes.body.question.id;
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptRes = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(attemptRes.status).toBe(201);
    const stored = db.prepare('SELECT option_orders FROM quiz_attempts WHERE id = ?').get(attemptRes.body.id);
    const orders = JSON.parse(stored.option_orders);
    expect(orders[String(qId)]).toHaveLength(2);
  });

  test('self-generated quiz attempt also stores option_orders', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tToken}`)
      .send({
        type: 'mcq',
        stem: 'What is H2O?',
        difficulty: 'easy',
        max_points: 1,
        topic_id: topicId,
        options: [
          { text: 'Water',  is_correct: true,  points: 1, keywords: [] },
          { text: 'Acid',   is_correct: false, points: 0, keywords: [] },
          { text: 'Base',   is_correct: false, points: 0, keywords: [] },
        ],
      });

    const sToken = await studentToken();
    const res = await request(app)
      .post('/api/student/quizzes/self-generated')
      .set('Authorization', `Bearer ${sToken}`)
      .send({ topic_ids: [topicId], count: 1 });

    expect(res.status).toBe(201);
    const stored = db.prepare('SELECT option_orders FROM quiz_attempts WHERE id = ?').get(res.body.attempt.id);
    expect(stored.option_orders).not.toBeNull();
    const orders = JSON.parse(stored.option_orders);
    expect(Object.keys(orders).length).toBeGreaterThanOrEqual(1);
  });
});
