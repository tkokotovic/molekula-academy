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

function makeOwner(email) {
  db.prepare("UPDATE users SET role = 'owner' WHERE email = ?").run(email);
}

function makeStudentPremium(email) {
  db.prepare("UPDATE users SET subscription_tier = 'premium' WHERE email = ?").run(email);
}

async function ownerToken() {
  await register('Tomislav', 'tomislav@molekula.hr');
  makeOwner('tomislav@molekula.hr');
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tomislav@molekula.hr', password: 'lozinka123' });
  return res.body.token;
}

async function teacherToken(email = 'teacher@molekula.hr') {
  await register('Ivan', email);
  makeTeacher(email);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'lozinka123' });
  return res.body.token;
}

async function studentToken(email = 'ana@student.hr', name = 'Ana') {
  return register(name, email);
}

async function premiumStudentToken(email = 'premium@student.hr', name = 'Petra') {
  const token = await register(name, email);
  makeStudentPremium(email);
  // Re-login so JWT contains subscription_tier = 'premium'
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'lozinka123' });
  return res.body.token;
}

// Creates a topic (used for quiz association)
async function createTopic(token) {
  const courseRes = await request(app)
    .post('/api/teacher/courses')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'IB Chemistry', slug: 'ib-chem-mock' });
  const courseId = courseRes.body.course.id;

  const topicRes = await request(app)
    .post(`/api/teacher/courses/${courseId}/topics`)
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'Stoichiometry' });
  return topicRes.body.topic.id;
}

// Creates an MCQ question and returns its id
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
      ],
    });
  return res.body.question.id;
}

// Creates a published mock exam and returns its id
async function createMockExam(token, topicId, overrides = {}) {
  const now = new Date();
  const start = new Date(now.getTime() - 60 * 60 * 1000).toISOString(); // 1hr ago
  const end   = new Date(now.getTime() + 60 * 60 * 1000).toISOString(); // 1hr from now

  const res = await request(app)
    .post('/api/teacher/quizzes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title: 'IB Mock Exam 2024',
      type: 'mock_exam',
      topic_id: topicId,
      time_limit_minutes: 90,
      scheduled_start: start,
      scheduled_end: end,
      status: 'published',
      questions: [],
      ...overrides,
    });
  return res.body.id;
}

// ─── Teardown ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM mock_exam_students').run();
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

// ─── Subscription management (owner only) ────────────────────────────────────

describe('Subscription management', () => {
  test('owner can upgrade a student to premium', async () => {
    const owner = await ownerToken();
    const studentTok = await studentToken('ana@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const res = await request(app)
      .patch(`/api/admin/users/${student.id}/subscription`)
      .set('Authorization', `Bearer ${owner}`)
      .send({ subscription_tier: 'premium' });

    expect(res.status).toBe(200);
    expect(res.body.user.subscription_tier).toBe('premium');
  });

  test('owner can downgrade a student to basic', async () => {
    const owner = await ownerToken();
    await studentToken('ana@student.hr');
    makeStudentPremium('ana@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const res = await request(app)
      .patch(`/api/admin/users/${student.id}/subscription`)
      .set('Authorization', `Bearer ${owner}`)
      .send({ subscription_tier: 'basic' });

    expect(res.status).toBe(200);
    expect(res.body.user.subscription_tier).toBe('basic');
  });

  test('teacher cannot change subscription tier', async () => {
    const teacher = await teacherToken();
    await studentToken('ana@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const res = await request(app)
      .patch(`/api/admin/users/${student.id}/subscription`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ subscription_tier: 'premium' });

    expect(res.status).toBe(403);
  });

  test('student cannot change subscription tier', async () => {
    const student = await studentToken('ana@student.hr');
    const student2 = await studentToken('bob@student.hr', 'Bob');
    const s2 = db.prepare("SELECT * FROM users WHERE email = 'bob@student.hr'").get();

    const res = await request(app)
      .patch(`/api/admin/users/${s2.id}/subscription`)
      .set('Authorization', `Bearer ${student}`)
      .send({ subscription_tier: 'premium' });

    expect(res.status).toBe(403);
  });

  test('invalid subscription_tier is rejected', async () => {
    const owner = await ownerToken();
    await studentToken('ana@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const res = await request(app)
      .patch(`/api/admin/users/${student.id}/subscription`)
      .set('Authorization', `Bearer ${owner}`)
      .send({ subscription_tier: 'vip' });

    expect(res.status).toBe(400);
  });
});

// ─── Mock exam creation ───────────────────────────────────────────────────────

describe('Mock exam creation', () => {
  test('teacher can create a mock exam with scheduled window', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const now = new Date();

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'IB Mock 2024',
        type: 'mock_exam',
        topic_id: topicId,
        time_limit_minutes: 90,
        scheduled_start: new Date(now.getTime() + 3600000).toISOString(),
        scheduled_end:   new Date(now.getTime() + 7200000).toISOString(),
        status: 'published',
        questions: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('mock_exam');
    expect(res.body.max_attempts).toBe(1);
    expect(res.body.scheduled_start).toBeTruthy();
    expect(res.body.scheduled_end).toBeTruthy();
  });

  test('teacher can create an example mock exam (no window)', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Example Mock',
        type: 'mock_exam',
        topic_id: topicId,
        time_limit_minutes: 60,
        is_example: true,
        status: 'published',
        questions: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.is_example).toBe(1);
    expect(res.body.max_attempts).toBe(1);
  });

  test('mock exam always gets max_attempts = 1 regardless of payload', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const now = new Date();

    const res = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${teacher}`)
      .send({
        title: 'Mock Exam',
        type: 'mock_exam',
        topic_id: topicId,
        time_limit_minutes: 90,
        max_attempts: 5,           // should be overridden to 1
        scheduled_start: new Date(now.getTime() - 3600000).toISOString(),
        scheduled_end:   new Date(now.getTime() + 3600000).toISOString(),
        status: 'published',
        questions: [],
      });

    expect(res.status).toBe(201);
    expect(res.body.max_attempts).toBe(1);
  });
});

// ─── Premium access gate ──────────────────────────────────────────────────────

describe('Mock exam premium access gate', () => {
  test('premium student can start a mock exam attempt within window', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const examId  = await createMockExam(teacher, topicId);

    const res = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);

    expect(res.status).toBe(201);
  });

  test('basic student cannot start a mock exam attempt', async () => {
    const teacher  = await teacherToken();
    const topicId  = await createTopic(teacher);
    const basic    = await studentToken();
    const examId   = await createMockExam(teacher, topicId);

    const res = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${basic}`);

    expect(res.status).toBe(403);
  });
});

// ─── Scheduled window enforcement ────────────────────────────────────────────

describe('Mock exam scheduled window', () => {
  test('premium student cannot start attempt before scheduled_start', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const now = new Date();

    const examId = await createMockExam(teacher, topicId, {
      scheduled_start: new Date(now.getTime() + 3600000).toISOString(),  // 1hr future
      scheduled_end:   new Date(now.getTime() + 7200000).toISOString(),
    });

    const res = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/window|available|scheduled/i);
  });

  test('premium student cannot start attempt after scheduled_end', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const now = new Date();

    const examId = await createMockExam(teacher, topicId, {
      scheduled_start: new Date(now.getTime() - 7200000).toISOString(),  // 2hrs ago
      scheduled_end:   new Date(now.getTime() - 3600000).toISOString(),  // 1hr ago
    });

    const res = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/window|available|scheduled|ended/i);
  });
});

// ─── One attempt only ─────────────────────────────────────────────────────────

describe('Mock exam one-attempt limit', () => {
  test('premium student cannot start a second attempt', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const examId  = await createMockExam(teacher, topicId);

    // First attempt — should succeed
    const first = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);
    expect(first.status).toBe(201);

    // Second attempt — should be rejected
    const second = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);
    expect(second.status).toBe(409);
    expect(second.body.error).toMatch(/attempt|already/i);
  });
});

// ─── Example mock exam student management ────────────────────────────────────

describe('Example mock exam — student management', () => {
  test('teacher can add a student to an example mock exam', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    await studentToken('ana@student.hr');
    makeStudentPremium('ana@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const examId = await createMockExam(teacher, topicId, {
      is_example: true,
      scheduled_start: undefined,
      scheduled_end: undefined,
    });

    const res = await request(app)
      .post(`/api/teacher/mock-exams/${examId}/students`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ student_id: student.id });

    expect(res.status).toBe(201);
  });

  test('teacher can remove a student from an example mock exam', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    await studentToken('ana@student.hr');
    makeStudentPremium('ana@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const examId = await createMockExam(teacher, topicId, { is_example: true });

    await request(app)
      .post(`/api/teacher/mock-exams/${examId}/students`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ student_id: student.id });

    const res = await request(app)
      .delete(`/api/teacher/mock-exams/${examId}/students/${student.id}`)
      .set('Authorization', `Bearer ${teacher}`);

    expect(res.status).toBe(200);
  });

  test('teacher can list students on an example mock exam', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    await studentToken('ana@student.hr');
    makeStudentPremium('ana@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'ana@student.hr'").get();

    const examId = await createMockExam(teacher, topicId, { is_example: true });

    await request(app)
      .post(`/api/teacher/mock-exams/${examId}/students`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ student_id: student.id });

    const res = await request(app)
      .get(`/api/teacher/mock-exams/${examId}/students`)
      .set('Authorization', `Bearer ${teacher}`);

    expect(res.status).toBe(200);
    expect(res.body.students).toHaveLength(1);
    expect(res.body.students[0].id).toBe(student.id);
  });
});

// ─── Example mock — access control ───────────────────────────────────────────

describe('Example mock exam access', () => {
  test('premium student on the list can start an example mock at any time', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken('premium@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'premium@student.hr'").get();

    const examId = await createMockExam(teacher, topicId, {
      is_example: true,
      scheduled_start: undefined,
      scheduled_end: undefined,
    });

    // Add student to example list
    await request(app)
      .post(`/api/teacher/mock-exams/${examId}/students`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ student_id: student.id });

    const res = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);

    expect(res.status).toBe(201);
  });

  test('premium student NOT on the list cannot access an example mock', async () => {
    const teacher  = await teacherToken();
    const topicId  = await createTopic(teacher);
    const premium  = await premiumStudentToken('premium@student.hr');

    const examId = await createMockExam(teacher, topicId, {
      is_example: true,
      scheduled_start: undefined,
      scheduled_end: undefined,
    });
    // Not adding premium student to the list

    const res = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);

    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/access|list|allowed/i);
  });

  test('basic student on the list still cannot access an example mock', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const basic   = await studentToken('basic@student.hr');
    const student = db.prepare("SELECT * FROM users WHERE email = 'basic@student.hr'").get();

    const examId = await createMockExam(teacher, topicId, { is_example: true });

    await request(app)
      .post(`/api/teacher/mock-exams/${examId}/students`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ student_id: student.id });

    const res = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${basic}`);

    expect(res.status).toBe(403);
  });
});

// ─── Teacher overall feedback ─────────────────────────────────────────────────

describe('Teacher overall feedback on attempt', () => {
  test('teacher can write overall feedback on a mock exam attempt', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const examId  = await createMockExam(teacher, topicId);

    const attemptRes = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);
    const attemptId = attemptRes.body.id;

    const res = await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/feedback`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ teacher_feedback: 'Excellent work! Watch your significant figures.' });

    expect(res.status).toBe(200);
    expect(res.body.attempt.teacher_feedback).toBe('Excellent work! Watch your significant figures.');
  });

  test('student can view teacher feedback after grading', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const examId  = await createMockExam(teacher, topicId);

    const attemptRes = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);
    const attemptId = attemptRes.body.id;

    // Teacher submits feedback
    await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/feedback`)
      .set('Authorization', `Bearer ${teacher}`)
      .send({ teacher_feedback: 'Good effort.' });

    // Student views attempt
    const res = await request(app)
      .get(`/api/student/attempts/${attemptId}`)
      .set('Authorization', `Bearer ${premium}`);

    expect(res.status).toBe(200);
    expect(res.body.teacher_feedback).toBe('Good effort.');
  });

  test('student cannot write teacher feedback', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const examId  = await createMockExam(teacher, topicId);

    const attemptRes = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);
    const attemptId = attemptRes.body.id;

    const res = await request(app)
      .patch(`/api/teacher/attempts/${attemptId}/feedback`)
      .set('Authorization', `Bearer ${premium}`)
      .send({ teacher_feedback: 'Self-praise.' });

    expect(res.status).toBe(403);
  });
});

// ─── Auto-submit grace period ─────────────────────────────────────────────────

describe('Auto-submit grace period', () => {
  test('attempt submitted within grace period is accepted', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const examId  = await createMockExam(teacher, topicId, { time_limit_minutes: 1, grace_period_seconds: 120 });

    const startRes = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);
    const attemptId = startRes.body.id;

    // Backdate started_at by 90 seconds (past 1-min limit but within 120s grace)
    const backdated = new Date(Date.now() - 90 * 1000).toISOString();
    db.prepare("UPDATE quiz_attempts SET started_at = ? WHERE id = ?").run(backdated, attemptId);

    const res = await request(app)
      .post(`/api/student/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${premium}`)
      .send({ answers: [] });

    expect(res.status).toBe(200);
  });

  test('attempt submitted after grace period is rejected (too late)', async () => {
    const teacher = await teacherToken();
    const topicId = await createTopic(teacher);
    const premium = await premiumStudentToken();
    const examId  = await createMockExam(teacher, topicId, { time_limit_minutes: 1, grace_period_seconds: 120 });

    const startRes = await request(app)
      .post(`/api/student/quizzes/${examId}/attempts`)
      .set('Authorization', `Bearer ${premium}`);
    const attemptId = startRes.body.id;

    // Backdate started_at by 5 minutes (well past grace)
    const backdated = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    db.prepare("UPDATE quiz_attempts SET started_at = ? WHERE id = ?").run(backdated, attemptId);

    const res = await request(app)
      .post(`/api/student/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${premium}`)
      .send({ answers: [] });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/time|expired|late/i);
  });
});
