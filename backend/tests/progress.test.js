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

async function studentToken(email = 'ana@student.hr', name = 'Ana') {
  return register(name, email);
}

// Create course + topic + lesson, returns { courseId, topicId, lessonId }
async function createContent(token, slug = 'ib-chem') {
  const cRes = await request(app)
    .post('/api/teacher/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'IB Chemistry', slug });
  const courseId = cRes.body.course.id;

  await request(app)
    .patch(`/api/teacher/courses/${courseId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'published' });

  const tRes = await request(app)
    .post(`/api/teacher/courses/${courseId}/topics`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Stoichiometry' });
  const topicId = tRes.body.topic.id;

  const lRes = await request(app)
    .post(`/api/teacher/topics/${topicId}/lessons`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Mole concept' });
  const lessonId = lRes.body.lesson.id;

  await request(app)
    .patch(`/api/teacher/lessons/${lessonId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'published' });

  return { courseId, topicId, lessonId };
}

// Create + publish a topic_quiz with one MCQ question, return quizId
async function createPublishedQuiz(token, topicId) {
  // Create question
  const qRes = await request(app)
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
  const questionId = qRes.body.question.id;

  // Create quiz
  const quizRes = await request(app)
    .post('/api/teacher/quizzes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'Stoichiometry Quiz',
      topic_id: topicId,
      type: 'topic_quiz',
      questions: [{ question_id: questionId, position: 0 }],
    });
  const quizId = quizRes.body.id;

  // Publish quiz
  await request(app)
    .patch(`/api/teacher/quizzes/${quizId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'published' });

  return quizId;
}

// Start + submit an attempt, returns attempt
async function submitAttempt(studentTok, quizId, questionId, optionId) {
  const startRes = await request(app)
    .post(`/api/student/quizzes/${quizId}/attempts`)
    .set('Authorization', `Bearer ${studentTok}`);
  const attemptId = startRes.body.id;

  await request(app)
    .post(`/api/student/attempts/${attemptId}/submit`)
    .set('Authorization', `Bearer ${studentTok}`)
    .send({ answers: [{ question_id: questionId, answer_data: { option_ids: [optionId] } }] });

  return attemptId;
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

// ─── Lesson Progress ──────────────────────────────────────────────────────────

describe('Lesson progress — student', () => {
  test('student marks lesson as in_progress', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { lessonId } = await createContent(teacher);

    const res = await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'in_progress', time_spent_seconds: 30 });

    expect(res.status).toBe(200);
    expect(res.body.progress.status).toBe('in_progress');
    expect(res.body.progress.time_spent_seconds).toBe(30);
    expect(res.body.progress.first_opened_at).toBeTruthy();
    expect(res.body.progress.completed_at).toBeNull();
  });

  test('student marks lesson as completed', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { lessonId } = await createContent(teacher);

    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'in_progress', time_spent_seconds: 60 });

    const res = await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'completed', time_spent_seconds: 120 });

    expect(res.status).toBe(200);
    expect(res.body.progress.status).toBe('completed');
    expect(res.body.progress.time_spent_seconds).toBe(180); // 60 + 120 accumulated
    expect(res.body.progress.completed_at).toBeTruthy();
  });

  test('time_spent accumulates across updates', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { lessonId } = await createContent(teacher);

    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'in_progress', time_spent_seconds: 100 });

    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'in_progress', time_spent_seconds: 50 });

    const res = await request(app)
      .get(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.body.progress.time_spent_seconds).toBe(150);
  });

  test('status cannot go backward from completed to in_progress', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { lessonId } = await createContent(teacher);

    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'completed', time_spent_seconds: 200 });

    const res = await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'in_progress', time_spent_seconds: 10 });

    expect(res.status).toBe(200);
    // Status stays completed, time still accumulates
    expect(res.body.progress.status).toBe('completed');
    expect(res.body.progress.time_spent_seconds).toBe(210);
  });

  test('GET /api/student/lessons/:id/progress returns null when not started', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { lessonId } = await createContent(teacher);

    const res = await request(app)
      .get(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.progress).toBeNull();
  });

  test('GET /api/student/lessons/:id/progress returns existing progress', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { lessonId } = await createContent(teacher);

    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'in_progress', time_spent_seconds: 45 });

    const res = await request(app)
      .get(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.progress.status).toBe('in_progress');
    expect(res.body.progress.time_spent_seconds).toBe(45);
  });

  test('unauthenticated request is rejected', async () => {
    const teacher = await teacherToken();
    const { lessonId } = await createContent(teacher);

    const res = await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .send({ status: 'in_progress', time_spent_seconds: 10 });

    expect(res.status).toBe(401);
  });

  test('400 for invalid status value', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { lessonId } = await createContent(teacher);

    const res = await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'banana', time_spent_seconds: 10 });

    expect(res.status).toBe(400);
  });

  test('404 for non-existent lesson', async () => {
    const student = await studentToken();

    const res = await request(app)
      .post('/api/student/lessons/9999/progress')
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'in_progress', time_spent_seconds: 10 });

    expect(res.status).toBe(404);
  });
});

// ─── Course completion stats ──────────────────────────────────────────────────

describe('GET /api/student/progress/courses', () => {
  test('returns course completion percentages', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { courseId, topicId, lessonId } = await createContent(teacher);

    // Add a second lesson to the same topic
    const l2Res = await request(app)
      .post(`/api/teacher/topics/${topicId}/lessons`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ title: 'Avogadro' });
    const lessonId2 = l2Res.body.lesson.id;
    await request(app)
      .patch(`/api/teacher/lessons/${lessonId2}/status`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ status: 'published' });

    // Complete first lesson only
    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'completed', time_spent_seconds: 100 });

    const res = await request(app)
      .get('/api/student/progress/courses')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.courses).toHaveLength(1);

    const course = res.body.courses[0];
    expect(course.course_id).toBe(courseId);
    expect(course.total_lessons).toBe(2);
    expect(course.completed_lessons).toBe(1);
    expect(course.completion_pct).toBe(50);
  });

  test('returns 0% when no lessons completed', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    await createContent(teacher);

    const res = await request(app)
      .get('/api/student/progress/courses')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    const course = res.body.courses[0];
    expect(course.completed_lessons).toBe(0);
    expect(course.completion_pct).toBe(0);
  });

  test('401 without auth', async () => {
    const res = await request(app).get('/api/student/progress/courses');
    expect(res.status).toBe(401);
  });
});

// ─── Quiz history ─────────────────────────────────────────────────────────────

describe('GET /api/student/progress/quiz-history', () => {
  test('returns submitted quiz attempts with score info', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { topicId } = await createContent(teacher);

    const quizId = await createPublishedQuiz(teacher, topicId);

    // Get question + option ids for submitting
    const quizData = await request(app)
      .get(`/api/student/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${student}`);
    const questionId = quizData.body.questions[0].id;
    const correctOption = quizData.body.questions[0].options[0]; // first option in test = 'Water'

    await submitAttempt(student, quizId, questionId, correctOption.id);

    const res = await request(app)
      .get('/api/student/progress/quiz-history')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.attempts).toHaveLength(1);

    const attempt = res.body.attempts[0];
    expect(attempt.quiz_title).toBe('Stoichiometry Quiz');
    expect(attempt.score).toBeDefined();
    expect(attempt.max_score).toBe(1);
    expect(attempt.topic_id).toBe(topicId);
    expect(attempt.submitted_at).toBeTruthy();
  });

  test('returns empty array when no attempts', async () => {
    const student = await studentToken();
    const res = await request(app)
      .get('/api/student/progress/quiz-history')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.attempts).toHaveLength(0);
  });

  test('401 without auth', async () => {
    const res = await request(app).get('/api/student/progress/quiz-history');
    expect(res.status).toBe(401);
  });
});

// ─── Overall stats ────────────────────────────────────────────────────────────

describe('GET /api/student/progress/stats', () => {
  test('returns aggregate stats', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { topicId, lessonId } = await createContent(teacher);

    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'completed', time_spent_seconds: 300 });

    const res = await request(app)
      .get('/api/student/progress/stats')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.total_lessons_completed).toBe(1);
    expect(res.body.stats.total_time_spent_seconds).toBe(300);
    expect(res.body.stats.total_quizzes_taken).toBe(0);
    expect(typeof res.body.stats.current_streak_days).toBe('number');
  });

  test('counts quiz attempts in stats', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const { topicId } = await createContent(teacher);

    const quizId = await createPublishedQuiz(teacher, topicId);
    const quizData = await request(app)
      .get(`/api/student/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${student}`);
    const questionId = quizData.body.questions[0].id;
    const optId = quizData.body.questions[0].options[0].id;

    await submitAttempt(student, quizId, questionId, optId);

    const res = await request(app)
      .get('/api/student/progress/stats')
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.total_quizzes_taken).toBe(1);
  });

  test('401 without auth', async () => {
    const res = await request(app).get('/api/student/progress/stats');
    expect(res.status).toBe(401);
  });
});

// ─── Teacher views ────────────────────────────────────────────────────────────

describe('Teacher student progress view', () => {
  test('teacher can view a student lesson progress', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const studentUser = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();
    const { lessonId } = await createContent(teacher);

    await request(app)
      .post(`/api/student/lessons/${lessonId}/progress`)
      .set('Authorization', `Bearer ${student}`)
      .send({ status: 'completed', time_spent_seconds: 200 });

    const res = await request(app)
      .get(`/api/teacher/students/${studentUser.id}/progress/courses`)
      .set('Authorization', `Bearer ${teacher}`);

    expect(res.status).toBe(200);
    expect(res.body.courses).toBeDefined();
    expect(res.body.courses[0].completed_lessons).toBe(1);
  });

  test('teacher can view a student quiz history', async () => {
    const teacher = await teacherToken();
    const student = await studentToken();
    const studentUser = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();
    const { topicId } = await createContent(teacher);

    const quizId = await createPublishedQuiz(teacher, topicId);
    const quizData = await request(app)
      .get(`/api/student/quizzes/${quizId}`)
      .set('Authorization', `Bearer ${student}`);
    const questionId = quizData.body.questions[0].id;
    const optId = quizData.body.questions[0].options[0].id;

    await submitAttempt(student, quizId, questionId, optId);

    const res = await request(app)
      .get(`/api/teacher/students/${studentUser.id}/progress/quiz-history`)
      .set('Authorization', `Bearer ${teacher}`);

    expect(res.status).toBe(200);
    expect(res.body.attempts).toHaveLength(1);
  });

  test('404 for unknown student', async () => {
    const teacher = await teacherToken();

    const res = await request(app)
      .get('/api/teacher/students/9999/progress/courses')
      .set('Authorization', `Bearer ${teacher}`);

    expect(res.status).toBe(404);
  });

  test('non-teacher gets 403 on teacher progress routes', async () => {
    const student = await studentToken();
    const studentUser = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const res = await request(app)
      .get(`/api/teacher/students/${studentUser.id}/progress/courses`)
      .set('Authorization', `Bearer ${student}`);

    expect(res.status).toBe(403);
  });
});
