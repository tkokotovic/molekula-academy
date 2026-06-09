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

// Create course → topic, return { courseId, topicId }
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
  return { courseId, topicId: tRes.body.topic.id };
}

// Create and publish a topic_quiz with one MCQ question, return { quizId, questionId }
async function createTopicQuiz(token, topicId, title = 'Stoichiometry Quiz') {
  const qRes = await request(app)
    .post('/api/teacher/questions')
    .set('Authorization', `Bearer ${token}`)
    .send({
      type: 'mcq', stem: 'What is H2O?', difficulty: 'easy', max_points: 1, topic_id: topicId,
      options: [
        { text: 'Water', is_correct: true,  points: 1, keywords: [] },
        { text: 'Fire',  is_correct: false, points: 0, keywords: [] },
      ],
    });
  const questionId = qRes.body.question.id;

  const quizRes = await request(app)
    .post('/api/teacher/quizzes')
    .set('Authorization', `Bearer ${token}`)
    .send({
      title, topic_id: topicId, type: 'topic_quiz',
      questions: [{ question_id: questionId, position: 0 }],
    });
  const quizId = quizRes.body.id;

  await request(app)
    .patch(`/api/teacher/quizzes/${quizId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'published' });

  return { quizId, questionId };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM certificates').run();
  db.prepare('DELETE FROM lesson_progress').run();
  db.prepare('DELETE FROM quiz_attempt_answers').run();
  db.prepare('DELETE FROM ai_grading_corrections').run();
  db.prepare('DELETE FROM quiz_attempts').run();
  db.prepare('DELETE FROM quiz_assignments').run();
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

// ─── Save / unsave to library ─────────────────────────────────────────────────

describe('PATCH /api/teacher/quizzes/:id/library', () => {
  it('saves a quiz to the library', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    const res = await request(app)
      .patch(`/api/teacher/quizzes/${quizId}/library`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ save: true });
    expect(res.status).toBe(200);
    expect(res.body.is_library_template).toBe(1);
  });

  it('removes a quiz from the library', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    db.prepare("UPDATE quizzes SET is_library_template = 1 WHERE id = ?").run(quizId);

    const res = await request(app)
      .patch(`/api/teacher/quizzes/${quizId}/library`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ save: false });
    expect(res.status).toBe(200);
    expect(res.body.is_library_template).toBe(0);
  });

  it('returns 404 for non-existent quiz', async () => {
    const tTok = await teacherToken();
    const res = await request(app)
      .patch('/api/teacher/quizzes/99999/library')
      .set('Authorization', `Bearer ${tTok}`)
      .send({ save: true });
    expect(res.status).toBe(404);
  });

  it('requires teacher role', async () => {
    const sTok = await studentToken();
    const res = await request(app)
      .patch('/api/teacher/quizzes/1/library')
      .set('Authorization', `Bearer ${sTok}`)
      .send({ save: true });
    expect(res.status).toBe(403);
  });
});

// ─── List library ─────────────────────────────────────────────────────────────

describe('GET /api/teacher/quiz-library', () => {
  it('returns empty array when no templates saved', async () => {
    const tTok = await teacherToken();
    const res = await request(app)
      .get('/api/teacher/quiz-library')
      .set('Authorization', `Bearer ${tTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns only library templates, with question count', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId: q1 } = await createTopicQuiz(tTok, topicId, 'Quiz A');
    const { quizId: q2 } = await createTopicQuiz(tTok, topicId, 'Quiz B');

    // Save only q1 to library
    db.prepare("UPDATE quizzes SET is_library_template = 1 WHERE id = ?").run(q1);

    const res = await request(app)
      .get('/api/teacher/quiz-library')
      .set('Authorization', `Bearer ${tTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(q1);
    expect(res.body[0].title).toBe('Quiz A');
    expect(res.body[0].question_count).toBe(1);
  });

  it('requires teacher role', async () => {
    const sTok = await studentToken();
    const res = await request(app)
      .get('/api/teacher/quiz-library')
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(403);
  });
});

// ─── Clone a quiz ─────────────────────────────────────────────────────────────

describe('POST /api/teacher/quizzes/:id/clone', () => {
  it('clones a quiz with same questions in draft status', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    const res = await request(app)
      .post(`/api/teacher/quizzes/${quizId}/clone`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ title: 'Cloned Quiz' });
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Cloned Quiz');
    expect(res.body.status).toBe('draft');
    expect(res.body.id).not.toBe(quizId);

    // Questions are copied
    const cloneQs = db.prepare('SELECT * FROM quiz_questions WHERE quiz_id = ?').all(res.body.id);
    expect(cloneQs).toHaveLength(1);
  });

  it('uses original title with (kopija) suffix when no title provided', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId, 'Stoichiometry Quiz');

    const res = await request(app)
      .post(`/api/teacher/quizzes/${quizId}/clone`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({});
    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Stoichiometry Quiz (kopija)');
  });

  it('applies setting overrides to the clone', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    const res = await request(app)
      .post(`/api/teacher/quizzes/${quizId}/clone`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ time_limit_minutes: 30, max_attempts: 2, due_date: '2099-12-31' });
    expect(res.status).toBe(201);
    expect(res.body.time_limit_minutes).toBe(30);
    expect(res.body.max_attempts).toBe(2);
    expect(res.body.due_date).toBe('2099-12-31');
  });

  it('returns 404 for non-existent quiz', async () => {
    const tTok = await teacherToken();
    const res = await request(app)
      .post('/api/teacher/quizzes/99999/clone')
      .set('Authorization', `Bearer ${tTok}`)
      .send({});
    expect(res.status).toBe(404);
  });

  it('requires teacher role', async () => {
    const sTok = await studentToken();
    const res = await request(app)
      .post('/api/teacher/quizzes/1/clone')
      .set('Authorization', `Bearer ${sTok}`)
      .send({});
    expect(res.status).toBe(403);
  });
});

// ─── Assign quiz to students ──────────────────────────────────────────────────

describe('POST /api/teacher/quizzes/:id/assignments', () => {
  it('assigns a quiz to specific students', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    const s1Tok = await studentToken('ana@s.hr', 'Ana');
    const s2Tok = await studentToken('marko@s.hr', 'Marko');
    const s1Id = db.prepare("SELECT id FROM users WHERE email = 'ana@s.hr'").get().id;
    const s2Id = db.prepare("SELECT id FROM users WHERE email = 'marko@s.hr'").get().id;

    const res = await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [s1Id, s2Id] });
    expect(res.status).toBe(200);
    expect(res.body.assigned).toBe(2);

    const rows = db.prepare("SELECT * FROM quiz_assignments WHERE quiz_id = ?").all(quizId);
    expect(rows).toHaveLength(2);
  });

  it('ignores duplicate assignments (idempotent)', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    const sTok = await studentToken();
    const sId = db.prepare("SELECT id FROM users WHERE email = 'ana@student.hr'").get().id;

    await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [sId] });
    const res = await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [sId] });
    expect(res.status).toBe(200);
    const rows = db.prepare("SELECT * FROM quiz_assignments WHERE quiz_id = ?").all(quizId);
    expect(rows).toHaveLength(1);
  });

  it('returns 400 for empty student_ids', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    const res = await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [] });
    expect(res.status).toBe(400);
  });

  it('requires teacher role', async () => {
    const sTok = await studentToken();
    const res = await request(app)
      .post('/api/teacher/quizzes/1/assignments')
      .set('Authorization', `Bearer ${sTok}`)
      .send({ student_ids: [1] });
    expect(res.status).toBe(403);
  });
});

// ─── List assigned students ───────────────────────────────────────────────────

describe('GET /api/teacher/quizzes/:id/assignments', () => {
  it('returns assigned students for a quiz', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    await studentToken('ana@s.hr', 'Ana');
    const sId = db.prepare("SELECT id FROM users WHERE email = 'ana@s.hr'").get().id;

    await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [sId] });

    const res = await request(app)
      .get(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ student_id: sId, student_name: 'Ana', student_email: 'ana@s.hr' });
  });

  it('returns empty array when no assignments', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    const res = await request(app)
      .get(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

// ─── Remove assignment ────────────────────────────────────────────────────────

describe('DELETE /api/teacher/quizzes/:id/assignments/:studentId', () => {
  it('removes a student from the assignment', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    await studentToken('ana@s.hr', 'Ana');
    const sId = db.prepare("SELECT id FROM users WHERE email = 'ana@s.hr'").get().id;

    await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [sId] });

    const res = await request(app)
      .delete(`/api/teacher/quizzes/${quizId}/assignments/${sId}`)
      .set('Authorization', `Bearer ${tTok}`);
    expect(res.status).toBe(200);

    const rows = db.prepare("SELECT * FROM quiz_assignments WHERE quiz_id = ?").all(quizId);
    expect(rows).toHaveLength(0);
  });

  it('returns 404 for non-existent assignment', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);
    const res = await request(app)
      .delete(`/api/teacher/quizzes/${quizId}/assignments/99999`)
      .set('Authorization', `Bearer ${tTok}`);
    expect(res.status).toBe(404);
  });
});

// ─── Student sees assigned quizzes ────────────────────────────────────────────

describe('GET /api/student/assigned-quizzes', () => {
  it('returns empty array when nothing assigned', async () => {
    const sTok = await studentToken();
    const res = await request(app)
      .get('/api/student/assigned-quizzes')
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns quizzes assigned to this student', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    const sId = db.prepare("SELECT id FROM users WHERE email = 'ana@student.hr'").get().id;

    await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [sId] });

    const res = await request(app)
      .get('/api/student/assigned-quizzes')
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(quizId);
    expect(res.body[0].assigned_at).toBeTruthy();
  });

  it('does NOT return quizzes assigned to other students', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    await studentToken('ana@s.hr', 'Ana');
    await studentToken('marko@s.hr', 'Marko');
    const anaId = db.prepare("SELECT id FROM users WHERE email = 'ana@s.hr'").get().id;
    const markoTok = db.prepare("SELECT * FROM users WHERE email = 'marko@s.hr'").get();

    await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [anaId] });

    // Re-login Marko
    const markoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marko@s.hr', password: 'lozinka123' });
    const markoToken = markoRes.body.token;

    const res = await request(app)
      .get('/api/student/assigned-quizzes')
      .set('Authorization', `Bearer ${markoToken}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/student/assigned-quizzes');
    expect(res.status).toBe(401);
  });
});

// ─── Attempt gating for assigned-only quizzes ─────────────────────────────────

describe('Attempt gating — assigned quizzes', () => {
  it('non-assigned student cannot start an assigned quiz', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    await studentToken('ana@s.hr', 'Ana');
    await studentToken('marko@s.hr', 'Marko');
    const anaId = db.prepare("SELECT id FROM users WHERE email = 'ana@s.hr'").get().id;

    // Assign to Ana only
    await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [anaId] });

    // Marko tries to start
    const markoRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'marko@s.hr', password: 'lozinka123' });
    const markoToken = markoRes.body.token;

    const res = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${markoToken}`);
    expect(res.status).toBe(403);
  });

  it('assigned student can start the quiz', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    const sId = db.prepare("SELECT id FROM users WHERE email = 'ana@student.hr'").get().id;

    await request(app)
      .post(`/api/teacher/quizzes/${quizId}/assignments`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ student_ids: [sId] });

    const res = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(201);
  });

  it('unassigned quiz (no assignments) remains accessible to all students', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createTopic(tTok);
    const { quizId } = await createTopicQuiz(tTok, topicId);

    // No assignments added
    const sTok = await studentToken();
    const res = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(201);
  });
});
