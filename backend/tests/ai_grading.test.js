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

async function createShortAnswerQuestion(token, topicId) {
  const res = await request(app)
    .post('/api/teacher/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'short_answer',
      stem: 'Explain why water has a high boiling point.',
      difficulty: 'medium',
      max_points: 3,
      topic_id: topicId,
      options: [
        { text: 'hydrogen bonding', is_correct: true, points: 2, keywords: ['hydrogen bond', 'H-bond', 'hydrogen bonding'] },
        { text: 'polar molecule', is_correct: true, points: 1, keywords: ['polar', 'dipole'] },
      ],
    });
  return res.body.question.id;
}

async function createChemEquationQuestion(token, topicId) {
  const res = await request(app)
    .post('/api/teacher/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'chem_equation',
      stem: 'Write the balanced equation for the combustion of methane.',
      difficulty: 'medium',
      max_points: 2,
      topic_id: topicId,
      options: [
        { text: 'CH4 + 2O2 -> CO2 + 2H2O', is_correct: true, points: 2, keywords: ['CH4', 'CO2', '2H2O'] },
      ],
    });
  return res.body.question.id;
}

async function createMcqQuestion(token, topicId) {
  const res = await request(app)
    .post('/api/teacher/questions')
    .set('Authorization', `Bearer ${token}`)
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
  return res.body.question.id;
}

/** Creates a published quiz with given question ids */
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

/** Student starts an attempt and returns attempt id */
async function startAttempt(quizId, token) {
  const res = await request(app)
    .post(`/api/student/quizzes/${quizId}/attempts`)
    .set('Authorization', `Bearer ${token}`);
  return res.body.id;
}

/** Student submits answers and returns response body */
async function submitAttempt(attemptId, answers, token) {
  const res = await request(app)
    .post(`/api/student/attempts/${attemptId}/submit`)
    .set('Authorization', `Bearer ${token}`)
    .send({ answers });
  return res.body;
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

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('AI grading on submit', () => {
  test('short_answer gets AI-graded on submit — attempt becomes graded', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);

    const body = await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Water molecules form hydrogen bonds with each other.' } },
    ], sToken);

    // AI should grade it → status graded
    expect(body.status).toBe('graded');

    // The answer should have points_earned set (AI graded)
    const answer = body.answers.find(a => a.question_id === qId);
    expect(answer).toBeDefined();
    expect(answer.points_earned).not.toBeNull();
    expect(answer.ai_suggested_points).not.toBeNull();
  });

  test('chem_equation gets AI-graded on submit', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createChemEquationQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);

    const body = await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'CH4 + 2O2 -> CO2 + 2H2O' } },
    ], sToken);

    expect(body.status).toBe('graded');
    const answer = body.answers.find(a => a.question_id === qId);
    expect(answer.ai_suggested_points).not.toBeNull();
  });

  test('mix of MCQ and short_answer: MCQ auto-graded, short_answer AI-graded, attempt fully graded', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const mcqId = await createMcqQuestion(tToken, topicId);
    const saId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [mcqId, saId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);

    const mcqOptions = db.prepare("SELECT id FROM question_options WHERE question_id = ? AND is_correct = 1").get(mcqId);

    const body = await submitAttempt(attemptId, [
      { question_id: mcqId, answer_data: { option_ids: [mcqOptions.id] } },
      { question_id: saId, answer_data: { text: 'Hydrogen bonds cause high boiling point.' } },
    ], sToken);

    expect(body.status).toBe('graded');
    expect(body.score).toBeGreaterThan(0);
  });
});

describe('GET /api/student/attempts/:id — AI fields exposed to student', () => {
  test('student sees ai_suggested_points and ai_feedback after submit', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);

    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Because of hydrogen bonds between water molecules.' } },
    ], sToken);

    const res = await request(app)
      .get(`/api/student/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(200);
    const answer = res.body.answers.find(a => a.question_id === qId);
    expect(answer.ai_suggested_points).toBeDefined();
    expect(answer.ai_feedback).toBeDefined();
  });
});

describe('PATCH /api/teacher/attempts/:attemptId/answers/:answerId/grade', () => {
  test('teacher can grade an ungraded short_answer', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);
    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Something about bonds.' } },
    ], sToken);

    const answers = db.prepare('SELECT * FROM quiz_attempt_answers WHERE attempt_id = ?').all(attemptId);
    const answerId = answers[0].id;

    const res = await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/answers/${answerId}/grade`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ points_earned: 2, is_correct: true, feedback: 'Good mention of bonding.' });

    expect(res.status).toBe(200);
    expect(res.body.answer.points_earned).toBe(2);
    expect(res.body.answer.is_correct).toBe(true);
    expect(res.body.answer.graded_by).toBeTruthy(); // teacher's user id
  });

  test('grading updates the attempt score and marks it graded', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);
    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Incomplete answer.' } },
    ], sToken);

    const answers = db.prepare('SELECT * FROM quiz_attempt_answers WHERE attempt_id = ?').all(attemptId);
    const answerId = answers[0].id;

    await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/answers/${answerId}/grade`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ points_earned: 1, is_correct: false, feedback: 'Missing key concepts.' });

    const updatedAttempt = db.prepare('SELECT * FROM quiz_attempts WHERE id = ?').get(attemptId);
    expect(updatedAttempt.status).toBe('graded');
    expect(updatedAttempt.score).toBe(1);
  });

  test('teacher override of AI grade logs a correction', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);
    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Hydrogen bonds.' } },
    ], sToken);

    const answers = db.prepare('SELECT * FROM quiz_attempt_answers WHERE attempt_id = ?').all(attemptId);
    const answerId = answers[0].id;
    const aiPoints = answers[0].ai_suggested_points;

    // Teacher disagrees with AI
    await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/answers/${answerId}/grade`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ points_earned: aiPoints + 1, is_correct: true, feedback: 'AI underscored.' });

    const correction = db.prepare(
      'SELECT * FROM ai_grading_corrections WHERE question_id = ?'
    ).get(qId);

    expect(correction).toBeDefined();
    expect(correction.ai_points).toBe(aiPoints);
    expect(correction.teacher_points).toBe(aiPoints + 1);
    expect(correction.answer_text).toBe('Hydrogen bonds.');
  });

  test('no correction logged when teacher matches AI score', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);
    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Hydrogen bonds cause high boiling point.' } },
    ], sToken);

    const answers = db.prepare('SELECT * FROM quiz_attempt_answers WHERE attempt_id = ?').all(attemptId);
    const answerId = answers[0].id;
    const aiPoints = answers[0].ai_suggested_points;

    // Teacher agrees with AI — same score
    await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/answers/${answerId}/grade`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ points_earned: aiPoints, is_correct: true, feedback: 'Good.' });

    const corrections = db.prepare('SELECT * FROM ai_grading_corrections WHERE question_id = ?').all(qId);
    expect(corrections).toHaveLength(0);
  });

  test('student cannot access the grade endpoint', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);
    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Some answer.' } },
    ], sToken);

    const answers = db.prepare('SELECT * FROM quiz_attempt_answers WHERE attempt_id = ?').all(attemptId);
    const answerId = answers[0].id;

    const res = await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/answers/${answerId}/grade`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ points_earned: 2, is_correct: true });

    expect(res.status).toBe(403);
  });

  test('returns 404 for non-existent attempt', async () => {
    const tToken = await teacherToken();

    const res = await request(app)
      .patch('/api/teacher/attempts/99999/answers/99999/grade')
      .set('Authorization', `Bearer ${tToken}`)
      .send({ points_earned: 1, is_correct: true });

    expect(res.status).toBe(404);
  });

  test('returns 400 if points_earned exceeds max_points', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId); // max_points = 3
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);
    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Answer.' } },
    ], sToken);

    const answers = db.prepare('SELECT * FROM quiz_attempt_answers WHERE attempt_id = ?').all(attemptId);
    const answerId = answers[0].id;

    const res = await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/answers/${answerId}/grade`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ points_earned: 10, is_correct: true }); // 10 > max_points 3

    expect(res.status).toBe(400);
  });
});

describe('GET /api/teacher/attempts/:attemptId — teacher can view attempt with all answers', () => {
  test('teacher can view a submitted attempt with answers and AI grades', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);
    await submitAttempt(attemptId, [
      { question_id: qId, answer_data: { text: 'Answer text here.' } },
    ], sToken);

    const res = await request(app)
      .get(`/api/teacher/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${tToken}`);

    expect(res.status).toBe(200);
    expect(res.body.answers).toBeDefined();
    const answer = res.body.answers[0];
    expect(answer.ai_suggested_points).toBeDefined();
    expect(answer.ai_feedback).toBeDefined();
  });

  test('student cannot access teacher attempt endpoint', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createShortAnswerQuestion(tToken, topicId);
    const quizId = await createPublishedQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const attemptId = await startAttempt(quizId, sToken);

    const res = await request(app)
      .get(`/api/teacher/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(403);
  });
});
