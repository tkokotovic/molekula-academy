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

// Creates a topic (returns topic id)
async function createTopic(token) {
  const courseRes = await request(app)
    .post('/api/teacher/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'IB Chemistry', slug: 'ib-chem' });
  const courseId = courseRes.body.course.id;  // courses route wraps in { course }

  const topicRes = await request(app)
    .post(`/api/teacher/courses/${courseId}/topics`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Stoichiometry' });
  return topicRes.body.topic.id;             // topics route wraps in { topic }
}

// Creates an approved MCQ question, returns question id
async function createQuestion(token, topicId) {
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
        { text: '20 g/mol', is_correct: false, points: 0, keywords: [] },
      ],
    });
  return res.body.question.id;              // questions route wraps in { question }
}

// Creates a true_false question, returns question id
async function createTFQuestion(token, topicId) {
  const res = await request(app)
    .post('/api/teacher/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'true_false',
      stem: 'Water is a polar molecule.',
      difficulty: 'easy',
      max_points: 1,
      topic_id: topicId,
      options: [
        { text: 'True',  is_correct: true,  points: 1, keywords: [] },
        { text: 'False', is_correct: false, points: 0, keywords: [] },
      ],
    });
  return res.body.question.id;
}

// Creates a fill_blank question, returns question id
async function createFillBlankQuestion(token, topicId) {
  const res = await request(app)
    .post('/api/teacher/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'fill_blank',
      stem: 'The atomic number of Carbon is ___.',
      difficulty: 'easy',
      max_points: 2,
      topic_id: topicId,
      options: [
        { text: '6', is_correct: true, points: 2, keywords: ['6', 'six'] },
      ],
    });
  return res.body.question.id;
}

// Creates a quiz with given question ids, returns quiz object
async function createQuiz(token, topicId, questionIds, overrides = {}) {
  const res = await request(app)
    .post('/api/teacher/quizzes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Stoichiometry Quiz 1',
      topic_id: topicId,
      questions: questionIds.map((id, i) => ({ question_id: id, position: i })),
      ...overrides,
    });
  return res.body;
}

// ─── Setup / teardown ────────────────────────────────────────────────────────

beforeEach(() => {
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

afterAll(() => {
  db.close();
});

// ─── POST /api/teacher/quizzes ───────────────────────────────────────────────

describe('POST /api/teacher/quizzes', () => {
  test('teacher can create a quiz with questions', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Stoichiometry Quiz 1',
        topic_id: topicId,
        max_attempts: 3,
        pass_score: 70,
        questions: [{ question_id: qId, position: 0 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Stoichiometry Quiz 1');
    expect(res.body.max_attempts).toBe(3);
    expect(res.body.pass_score).toBe(70);
    expect(res.body.status).toBe('draft');
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].question_id).toBe(qId);
  });

  test('student cannot create a quiz', async () => {
    const token = await studentToken();
    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Hack quiz', questions: [] });
    expect(res.status).toBe(403);
  });

  test('title is required', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ questions: [] });
    expect(res.status).toBe(400);
  });

  test('questions array is required', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({ title: 'Quiz' });
    expect(res.status).toBe(400);
  });

  test('duplicate question_id in same quiz is rejected', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Bad Quiz',
        topic_id: topicId,
        questions: [
          { question_id: qId, position: 0 },
          { question_id: qId, position: 1 },
        ],
      });
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/teacher/quizzes ────────────────────────────────────────────────

describe('GET /api/teacher/quizzes', () => {
  test('teacher can list all quizzes', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);

    await createQuiz(token, topicId, [qId]);
    await createQuiz(token, topicId, [qId], { title: 'Quiz 2' });

    const res = await request(app)
      .get('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
  });

  test('can filter by topic_id', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);

    await createQuiz(token, topicId, [qId]);
    await createQuiz(token, null, [qId], { title: 'No-topic quiz' });

    const res = await request(app)
      .get(`/api/teacher/quizzes?topic_id=${topicId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].topic_id).toBe(topicId);
  });

  test('student cannot access teacher quiz list', async () => {
    const token = await studentToken();
    const res = await request(app)
      .get('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });
});

// ─── GET /api/teacher/quizzes/:id ───────────────────────────────────────────

describe('GET /api/teacher/quizzes/:id', () => {
  test('teacher gets quiz with questions and options', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);
    const quiz = await createQuiz(token, topicId, [qId]);

    const res = await request(app)
      .get(`/api/teacher/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(quiz.id);
    expect(res.body.questions).toHaveLength(1);
    expect(res.body.questions[0].options).toBeDefined();
  });

  test('returns 404 for non-existent quiz', async () => {
    const token = await teacherToken();
    const res = await request(app)
      .get('/api/teacher/quizzes/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ─── PUT /api/teacher/quizzes/:id ───────────────────────────────────────────

describe('PUT /api/teacher/quizzes/:id', () => {
  test('teacher can update quiz metadata and questions', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId1 = await createQuestion(token, topicId);
    const qId2 = await createTFQuestion(token, topicId);
    const quiz = await createQuiz(token, topicId, [qId1]);

    const res = await request(app)
      .put(`/api/teacher/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Updated Quiz',
        max_attempts: 2,
        questions: [
          { question_id: qId1, position: 0 },
          { question_id: qId2, position: 1 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Updated Quiz');
    expect(res.body.max_attempts).toBe(2);
    expect(res.body.questions).toHaveLength(2);
  });
});

// ─── PATCH /api/teacher/quizzes/:id/status ───────────────────────────────────

describe('PATCH /api/teacher/quizzes/:id/status', () => {
  test('teacher can publish a quiz', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);
    const quiz = await createQuiz(token, topicId, [qId]);

    const res = await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  test('invalid status is rejected', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);
    const quiz = await createQuiz(token, topicId, [qId]);

    const res = await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'invalid_status' });

    expect(res.status).toBe(400);
  });
});

// ─── DELETE /api/teacher/quizzes/:id ────────────────────────────────────────

describe('DELETE /api/teacher/quizzes/:id', () => {
  test('teacher can delete a quiz', async () => {
    const token = await teacherToken();
    const topicId = await createTopic(token);
    const qId = await createQuestion(token, topicId);
    const quiz = await createQuiz(token, topicId, [qId]);

    const del = await request(app)
      .delete(`/api/teacher/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(del.status).toBe(200);

    const get = await request(app)
      .get(`/api/teacher/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);
  });
});

// ─── Student — GET /api/student/quizzes ─────────────────────────────────────

describe('GET /api/student/quizzes', () => {
  test('student sees only published quizzes', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);

    // draft quiz
    await createQuiz(tToken, topicId, [qId]);
    // published quiz
    const quiz = await createQuiz(tToken, topicId, [qId], { title: 'Published Quiz' });
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const res = await request(app)
      .get('/api/student/quizzes')
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe('Published Quiz');
  });

  test('can filter by topic_id', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);

    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const res = await request(app)
      .get(`/api/student/quizzes?topic_id=${topicId}`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

// ─── Student — GET /api/student/quizzes/:id ──────────────────────────────────

describe('GET /api/student/quizzes/:id', () => {
  test('student gets quiz without correct answer revealed', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);

    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const res = await request(app)
      .get(`/api/student/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(200);
    // is_correct must be hidden from students before attempt
    const options = res.body.questions[0].options;
    expect(options.every(o => o.is_correct === undefined)).toBe(true);
  });

  test('student cannot access draft quiz', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const res = await request(app)
      .get(`/api/student/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(404);
  });
});

// ─── Student — POST /api/student/quizzes/:id/attempts (start) ───────────────

describe('POST /api/student/quizzes/:id/attempts', () => {
  test('student can start a quiz attempt', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const res = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('in_progress');
    expect(res.body.attempt_number).toBe(1);
    expect(res.body.quiz_id).toBe(quiz.id);
  });

  test('attempt_number increments correctly', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();

    // First attempt — start and submit it so next can begin
    const a1 = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);
    expect(a1.body.attempt_number).toBe(1);

    await request(app)
      .post(`/api/student/attempts/${a1.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ answers: [] });

    const a2 = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);
    expect(a2.body.attempt_number).toBe(2);
  });

  test('cannot start attempt on draft quiz', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);

    const sToken = await studentToken();
    const res = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(404);
  });

  test('cannot start new attempt while one is in_progress', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    const res2 = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res2.status).toBe(409);
  });

  test('cannot exceed max_attempts', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId], { max_attempts: 2 });
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();

    for (let i = 0; i < 2; i++) {
      const a = await request(app)
        .post(`/api/student/quizzes/${quiz.id}/attempts`)
        .set('Authorization', `Bearer ${sToken}`);
      await request(app)
        .post(`/api/student/attempts/${a.body.id}/submit`)
        .set('Authorization', `Bearer ${sToken}`)
        .send({ answers: [] });
    }

    const res = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(403);
  });
});

// ─── Student — POST /api/student/attempts/:id/submit ─────────────────────────

describe('POST /api/student/attempts/:id/submit', () => {
  test('MCQ: correct answer earns full points', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId); // MCQ, answer is option[0]
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    // Fetch quiz to get option ids
    const quizData = await request(app)
      .get(`/api/student/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${sToken}`);
    const firstOption = quizData.body.questions[0].options[0]; // "18 g/mol"

    const res = await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({
        answers: [
          { question_id: qId, answer_data: { option_ids: [firstOption.id] } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('graded');
    expect(res.body.score).toBe(1);
    expect(res.body.max_score).toBe(1);
    expect(res.body.answers[0].is_correct).toBe(true);
    expect(res.body.answers[0].points_earned).toBe(1);
  });

  test('MCQ: wrong answer earns 0 points', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    const quizData = await request(app)
      .get(`/api/student/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${sToken}`);
    const wrongOption = quizData.body.questions[0].options[1]; // "16 g/mol"

    const res = await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({
        answers: [
          { question_id: qId, answer_data: { option_ids: [wrongOption.id] } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.score).toBe(0);
    expect(res.body.answers[0].is_correct).toBe(false);
  });

  test('fill_blank: keyword match earns points', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createFillBlankQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    const res = await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({
        answers: [
          { question_id: qId, answer_data: { text: '6' } },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.answers[0].is_correct).toBe(true);
    expect(res.body.answers[0].points_earned).toBe(2);
  });

  test('cannot submit same attempt twice', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ answers: [] });

    const res2 = await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ answers: [] });

    expect(res2.status).toBe(409);
  });

  test('student cannot submit another student\'s attempt', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken1 = await studentToken('ana@student.hr');
    const sToken2 = await studentToken('bob@student.hr');

    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken1}`);

    const res = await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken2}`)
      .send({ answers: [] });

    expect(res.status).toBe(403);
  });
});

// ─── Student — GET /api/student/quizzes/:id/attempts ─────────────────────────

describe('GET /api/student/quizzes/:id/attempts', () => {
  test('student sees their attempt history', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);
    await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ answers: [] });

    const res = await request(app)
      .get(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].attempt_number).toBe(1);
    expect(res.body[0].status).toBe('graded');
  });
});

// ─── Student — GET /api/student/attempts/:id ────────────────────────────────

describe('GET /api/student/attempts/:id', () => {
  test('student gets attempt details with answers after submission', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);

    const quizData = await request(app)
      .get(`/api/student/quizzes/${quiz.id}`)
      .set('Authorization', `Bearer ${sToken}`);
    const correctOption = quizData.body.questions[0].options[0];

    await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({
        answers: [{ question_id: qId, answer_data: { option_ids: [correctOption.id] } }],
      });

    const res = await request(app)
      .get(`/api/student/attempts/${attempt.body.id}`)
      .set('Authorization', `Bearer ${sToken}`);

    expect(res.status).toBe(200);
    expect(res.body.answers).toHaveLength(1);
    expect(res.body.answers[0].is_correct).toBe(true);
    // After submission, correct answers are revealed
    expect(res.body.answers[0].question.options.some(o => o.is_correct !== undefined)).toBe(true);
  });
});

// ─── Teacher — GET /api/teacher/quizzes/:id/attempts ────────────────────────

describe('GET /api/teacher/quizzes/:id/attempts', () => {
  test('teacher can see all student attempts for a quiz', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    const qId = await createQuestion(tToken, topicId);
    const quiz = await createQuiz(tToken, topicId, [qId]);
    await request(app)
      .patch(`/api/teacher/quizzes/${quiz.id}/status`)
      .set('Authorization', `Bearer ${tToken}`)
      .send({ status: 'published' });

    const sToken = await studentToken();
    const attempt = await request(app)
      .post(`/api/student/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${sToken}`);
    await request(app)
      .post(`/api/student/attempts/${attempt.body.id}/submit`)
      .set('Authorization', `Bearer ${sToken}`)
      .send({ answers: [] });

    const res = await request(app)
      .get(`/api/teacher/quizzes/${quiz.id}/attempts`)
      .set('Authorization', `Bearer ${tToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].student_name).toBeDefined();
  });
});

// ─── Self-generated quizzes ───────────────────────────────────────────────────

describe('POST /api/student/quizzes/self-generated', () => {
  test('student can generate a quiz from the question bank', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);

    // Create several questions to pull from
    await createQuestion(tToken, topicId);
    await createTFQuestion(tToken, topicId);
    await createFillBlankQuestion(tToken, topicId);

    const sToken = await studentToken();
    const res = await request(app)
      .post('/api/student/quizzes/self-generated')
      .set('Authorization', `Bearer ${sToken}`)
      .send({
        topic_ids: [topicId],
        count: 2,
      });

    expect(res.status).toBe(201);
    expect(res.body.quiz).toBeDefined();
    expect(res.body.attempt).toBeDefined();
    expect(res.body.quiz.type).toBe('self_generated');
    expect(res.body.quiz.questions.length).toBeLessThanOrEqual(3);
    expect(res.body.quiz.questions.length).toBeGreaterThanOrEqual(1);
  });

  test('returns 400 if no topic_ids provided', async () => {
    const sToken = await studentToken();
    const res = await request(app)
      .post('/api/student/quizzes/self-generated')
      .set('Authorization', `Bearer ${sToken}`)
      .send({ count: 5 });
    expect(res.status).toBe(400);
  });

  test('returns 400 if no approved questions match filters', async () => {
    const tToken = await teacherToken();
    const topicId = await createTopic(tToken);
    // No questions created

    const sToken = await studentToken();
    const res = await request(app)
      .post('/api/student/quizzes/self-generated')
      .set('Authorization', `Bearer ${sToken}`)
      .send({ topic_ids: [topicId], count: 5 });

    expect(res.status).toBe(400);
  });
});
