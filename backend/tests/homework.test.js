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

async function createTopic(token, slug = 'ib-chem') {
  const cRes = await request(app)
    .post('/api/teacher/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'IB Chemistry', slug });
  const courseId = cRes.body.course.id;

  const tRes = await request(app)
    .post(`/api/teacher/courses/${courseId}/topics`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Stoichiometry' });
  return tRes.body.topic.id;
}

async function createQuestion(token, topicId) {
  const res = await request(app)
    .post('/api/teacher/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'mcq',
      stem: 'What is H2O?',
      difficulty: 'easy',
      max_points: 1,
      topic_id: topicId,
      options: [
        { text: 'Water', is_correct: true,  points: 1, keywords: [] },
        { text: 'Fire',  is_correct: false, points: 0, keywords: [] },
      ],
    });
  return res.body.question.id;
}

// future date (tomorrow)
function tomorrow() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString();
}

// past date (yesterday)
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString();
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM lesson_progress').run();
  db.prepare('DELETE FROM quiz_attempt_answers').run();
  db.prepare('DELETE FROM ai_grading_corrections').run();
  db.prepare('DELETE FROM quiz_attempts').run();
  db.prepare('DELETE FROM mock_exam_students').run();
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

// ─── Homework creation ────────────────────────────────────────────────────────

describe('Homework quiz — teacher creation', () => {
  test('teacher creates homework quiz with due_date', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Stoichiometry Homework',
        topic_id: topicId,
        type: 'homework',
        due_date: tomorrow(),
        questions: [{ question_id: questionId, position: 0 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('homework');
    expect(res.body.due_date).toBeTruthy();
  });

  test('homework type requires due_date', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Homework without due date',
        topic_id: topicId,
        type: 'homework',
        questions: [{ question_id: questionId, position: 0 }],
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/due_date/i);
  });

  test('non-homework quizzes do not require due_date', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Regular quiz',
        topic_id: topicId,
        type: 'topic_quiz',
        questions: [{ question_id: questionId, position: 0 }],
      });

    expect(res.status).toBe(201);
  });

  test('homework max_attempts defaults to unlimited (null)', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'HW1',
        topic_id: topicId,
        type: 'homework',
        due_date: tomorrow(),
        questions: [{ question_id: questionId, position: 0 }],
      });

    expect(res.status).toBe(201);
    // homework gets max_attempts = null (unlimited until deadline)
    expect(res.body.max_attempts).toBeNull();
  });
});

// ─── Student homework list ────────────────────────────────────────────────────

describe('GET /api/student/homework', () => {
  test('returns published homework quizzes', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    // Create and publish homework
    const hwRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'HW1',
        topic_id: topicId,
        type: 'homework',
        due_date: tomorrow(),
        questions: [{ question_id: questionId, position: 0 }],
      });
    const quizId = hwRes.body.id;

    await request(app)
      .patch(`/api/teacher/quizzes/${quizId}/status`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ status: 'published' });

    const res = await request(app)
      .get('/api/student/homework')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.homework).toHaveLength(1);
    expect(res.body.homework[0].title).toBe('HW1');
    expect(res.body.homework[0].due_date).toBeTruthy();
  });

  test('does not return regular (topic_quiz) quizzes', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    // Create regular quiz
    const quizRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Regular Quiz',
        topic_id: topicId,
        type: 'topic_quiz',
        questions: [{ question_id: questionId, position: 0 }],
      });
    await request(app)
      .patch(`/api/teacher/quizzes/${quizRes.body.id}/status`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ status: 'published' });

    const res = await request(app)
      .get('/api/student/homework')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.homework).toHaveLength(0);
  });

  test('includes overdue homework (for student to see history)', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    // Create overdue homework
    const hwRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Overdue HW',
        topic_id: topicId,
        type: 'homework',
        due_date: yesterday(),
        questions: [{ question_id: questionId, position: 0 }],
      });
    await request(app)
      .patch(`/api/teacher/quizzes/${hwRes.body.id}/status`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ status: 'published' });

    const res = await request(app)
      .get('/api/student/homework')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    // Overdue homework IS returned (with is_overdue flag) so student can see it
    expect(res.body.homework).toHaveLength(1);
    expect(res.body.homework[0].is_overdue).toBe(true);
  });

  test('401 without auth', async () => {
    const res = await request(app).get('/api/student/homework');
    expect(res.status).toBe(401);
  });
});

// ─── Homework attempts ────────────────────────────────────────────────────────

describe('Homework attempt rules', () => {
  test('student can start homework attempt before due_date', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    const hwRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'HW1',
        topic_id: topicId,
        type: 'homework',
        due_date: tomorrow(),
        questions: [{ question_id: questionId, position: 0 }],
      });
    const quizId = hwRes.body.id;

    await request(app)
      .patch(`/api/teacher/quizzes/${quizId}/status`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ status: 'published' });

    const res = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(201);
  });

  test('student cannot start homework attempt after due_date', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    const hwRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Overdue HW',
        topic_id: topicId,
        type: 'homework',
        due_date: yesterday(),
        questions: [{ question_id: questionId, position: 0 }],
      });
    const quizId = hwRes.body.id;

    await request(app)
      .patch(`/api/teacher/quizzes/${quizId}/status`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ status: 'published' });

    const res = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/rok/i); // Croatian: "rok" = deadline
  });

  test('student can attempt homework multiple times before deadline', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const topicId = await createTopic(teacher);
    const questionId = await createQuestion(teacher, topicId);

    const hwRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'HW multi',
        topic_id: topicId,
        type: 'homework',
        due_date: tomorrow(),
        questions: [{ question_id: questionId, position: 0 }],
      });
    const quizId = hwRes.body.id;

    await request(app)
      .patch(`/api/teacher/quizzes/${quizId}/status`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ status: 'published' });

    // Start + submit first attempt
    const a1 = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${student}`);
    expect(a1.status).toBe(201);
    expect(a1.body.attempt_number).toBe(1);

    await request(app)
      .post(`/api/student/attempts/${a1.body.id}/submit`)
      .set('Authorization', `Bearer ${student}`)
      .send({ answers: [] });

    // Start second attempt
    const a2 = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${student}`);
    expect(a2.status).toBe(201);
    expect(a2.body.attempt_number).toBe(2);
  });
});
