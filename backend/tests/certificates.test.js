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

// Create course → topic → one published lesson, return ids
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

// Create and publish a topic_quiz with one MCQ question (1 point), return { quizId, questionId }
async function createTopicQuiz(token, topicId) {
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

  await request(app)
    .patch(`/api/teacher/quizzes/${quizId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'published' });

  return { quizId, questionId };
}

// Complete all lessons in topic for a student
async function completeLessons(studentTok, lessonId) {
  await request(app)
    .post(`/api/student/lessons/${lessonId}/progress`)
    .set('Authorization', `Bearer ${studentTok}`)
    .send({ status: 'completed', time_spent_seconds: 300 });
}

// Start + submit attempt with a given answer, return { attemptId, correctOptionId }
async function submitAttempt(studentTok, quizId, questionId, correct = true) {
  // Fetch options to find the correct one
  const startRes = await request(app)
    .post(`/api/student/quizzes/${quizId}/attempts`)
    .set('Authorization', `Bearer ${studentTok}`);
  expect(startRes.status).toBe(201);
  const attemptId = startRes.body.id;

  // Get correct option id directly from db
  const opts = db.prepare(
    "SELECT id, is_correct FROM question_options WHERE question_id = ?"
  ).all(questionId);
  const chosenId = correct
    ? opts.find(o => o.is_correct).id
    : opts.find(o => !o.is_correct).id;

  const submitRes = await request(app)
    .post(`/api/student/attempts/${attemptId}/submit`)
    .set('Authorization', `Bearer ${studentTok}`)
    .send({ answers: [{ question_id: questionId, answer_data: { option_ids: [chosenId] } }] });
  expect(submitRes.status).toBe(200);

  return { attemptId };
}

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  db.prepare('DELETE FROM certificates').run();
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

// ─── List certificates ────────────────────────────────────────────────────────

describe('GET /api/student/certificates', () => {
  it('returns empty array when no certificates earned', async () => {
    const tok = await studentToken();
    const res = await request(app)
      .get('/api/student/certificates')
      .set('Authorization', `Bearer ${tok}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns certificate after earning it', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    await completeLessons(sTok, lessonId);
    await submitAttempt(sTok, quizId, questionId, true);

    const res = await request(app)
      .get('/api/student/certificates')
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      topic_id: topicId,
      topic_title: 'Stoichiometry',
    });
    expect(res.body[0].issued_at).toBeTruthy();
    expect(res.body[0].id).toBeTruthy();
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/student/certificates');
    expect(res.status).toBe(401);
  });
});

// ─── Auto-issue on quiz submit ────────────────────────────────────────────────

describe('Certificate auto-issue on quiz submit', () => {
  it('issues certificate when score >= 70% and all lessons complete', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    await completeLessons(sTok, lessonId);
    await submitAttempt(sTok, quizId, questionId, true); // 100% score

    const cert = db.prepare(
      "SELECT * FROM certificates WHERE topic_id = ?"
    ).get(topicId);
    expect(cert).not.toBeNull();
    expect(cert.quiz_attempt_id).toBeTruthy();
  });

  it('does NOT issue certificate when score < 70%', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);

    // Create quiz with 3 questions (3 pts total); student answers 1 correct = 33%
    const makeQ = async (stem) => {
      const qRes = await request(app)
        .post('/api/teacher/questions')
        .set('Authorization', `Bearer ${tTok}`)
        .send({
          type: 'mcq', stem, difficulty: 'easy', max_points: 1, topic_id: topicId,
          options: [
            { text: 'Right', is_correct: true,  points: 1, keywords: [] },
            { text: 'Wrong', is_correct: false, points: 0, keywords: [] },
          ],
        });
      return qRes.body.question.id;
    };
    const q1 = await makeQ('Q1?');
    const q2 = await makeQ('Q2?');
    const q3 = await makeQ('Q3?');

    const quizRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${tTok}`)
      .send({
        title: 'Low score quiz', topic_id: topicId, type: 'topic_quiz',
        questions: [
          { question_id: q1, position: 0 },
          { question_id: q2, position: 1 },
          { question_id: q3, position: 2 },
        ],
      });
    const quizId = quizRes.body.id;
    await request(app)
      .patch(`/api/teacher/quizzes/${quizId}/status`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ status: 'published' });

    const sTok = await studentToken();
    await completeLessons(sTok, lessonId);

    // Start attempt
    const startRes = await request(app)
      .post(`/api/student/quizzes/${quizId}/attempts`)
      .set('Authorization', `Bearer ${sTok}`);
    const attemptId = startRes.body.id;

    // Answer only q1 correctly, skip q2 and q3 (wrong answer)
    const opts1 = db.prepare("SELECT id, is_correct FROM question_options WHERE question_id = ?").all(q1);
    const opts2 = db.prepare("SELECT id, is_correct FROM question_options WHERE question_id = ?").all(q2);
    const opts3 = db.prepare("SELECT id, is_correct FROM question_options WHERE question_id = ?").all(q3);

    await request(app)
      .post(`/api/student/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${sTok}`)
      .send({
        answers: [
          { question_id: q1, answer_data: { option_ids: [opts1.find(o => o.is_correct).id] } },
          { question_id: q2, answer_data: { option_ids: [opts2.find(o => !o.is_correct).id] } },
          { question_id: q3, answer_data: { option_ids: [opts3.find(o => !o.is_correct).id] } },
        ],
      });

    const cert = db.prepare("SELECT * FROM certificates WHERE topic_id = ?").get(topicId);
    expect(cert).toBeFalsy();
  });

  it('does NOT issue certificate when lessons not fully completed', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createContent(tTok);  // lesson exists but not completed
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    // Do NOT complete lessons
    await submitAttempt(sTok, quizId, questionId, true);

    const cert = db.prepare("SELECT * FROM certificates WHERE topic_id = ?").get(topicId);
    expect(cert).toBeFalsy();
  });

  it('does NOT issue certificate for non-topic_quiz types', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);

    // Create a homework quiz (not topic_quiz)
    const qRes = await request(app)
      .post('/api/teacher/questions')
      .set('Authorization', `Bearer ${tTok}`)
      .send({
        type: 'mcq', stem: 'H2O?', difficulty: 'easy', max_points: 1, topic_id: topicId,
        options: [
          { text: 'Water', is_correct: true,  points: 1, keywords: [] },
          { text: 'Fire',  is_correct: false, points: 0, keywords: [] },
        ],
      });
    const questionId = qRes.body.question.id;

    const hwRes = await request(app)
      .post('/api/teacher/quizzes')
      .set('Authorization', `Bearer ${tTok}`)
      .send({
        title: 'HW', topic_id: topicId, type: 'homework',
        due_date: '2099-12-31',
        questions: [{ question_id: questionId, position: 0 }],
      });
    const hwId = hwRes.body.id;
    await request(app)
      .patch(`/api/teacher/quizzes/${hwId}/status`)
      .set('Authorization', `Bearer ${tTok}`)
      .send({ status: 'published' });

    const sTok = await studentToken();
    await completeLessons(sTok, lessonId);

    const startRes = await request(app)
      .post(`/api/student/quizzes/${hwId}/attempts`)
      .set('Authorization', `Bearer ${sTok}`);
    const attemptId = startRes.body.id;
    const opts = db.prepare("SELECT id, is_correct FROM question_options WHERE question_id = ?").all(questionId);
    await request(app)
      .post(`/api/student/attempts/${attemptId}/submit`)
      .set('Authorization', `Bearer ${sTok}`)
      .send({ answers: [{ question_id: questionId, answer_data: { option_ids: [opts.find(o => o.is_correct).id] } }] });

    const cert = db.prepare("SELECT * FROM certificates WHERE topic_id = ?").get(topicId);
    expect(cert).toBeFalsy();
  });

  it('does NOT issue duplicate certificates on second passing attempt', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    // Allow multiple attempts for this test
    db.prepare("UPDATE quizzes SET max_attempts = 5 WHERE id = ?").run(quizId);

    const sTok = await studentToken();
    await completeLessons(sTok, lessonId);
    await submitAttempt(sTok, quizId, questionId, true); // 1st pass
    await submitAttempt(sTok, quizId, questionId, true); // 2nd pass

    const certs = db.prepare("SELECT * FROM certificates WHERE topic_id = ?").all(topicId);
    expect(certs).toHaveLength(1);
  });
});

// ─── Download certificate PDF ─────────────────────────────────────────────────

describe('GET /api/student/certificates/:id/download', () => {
  it('returns a PDF for an earned certificate', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    await completeLessons(sTok, lessonId);
    await submitAttempt(sTok, quizId, questionId, true);

    const listRes = await request(app)
      .get('/api/student/certificates')
      .set('Authorization', `Bearer ${sTok}`);
    const certId = listRes.body[0].id;

    const res = await request(app)
      .get(`/api/student/certificates/${certId}/download`)
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/pdf/);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    // PDF starts with %PDF-
    expect(res.body.slice(0, 4).toString()).toBe('%PDF');
  });

  it('returns 404 for a certificate that belongs to another student', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    const s1Tok = await studentToken('ana@s.hr', 'Ana');
    await completeLessons(s1Tok, lessonId);
    await submitAttempt(s1Tok, quizId, questionId, true);

    const s2Tok = await studentToken('marko@s.hr', 'Marko');

    const listRes = await request(app)
      .get('/api/student/certificates')
      .set('Authorization', `Bearer ${s1Tok}`);
    const certId = listRes.body[0].id;

    const res = await request(app)
      .get(`/api/student/certificates/${certId}/download`)
      .set('Authorization', `Bearer ${s2Tok}`);
    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent certificate id', async () => {
    const sTok = await studentToken();
    const res = await request(app)
      .get('/api/student/certificates/99999/download')
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(404);
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/student/certificates/1/download');
    expect(res.status).toBe(401);
  });
});

// ─── Certificate status check ─────────────────────────────────────────────────

describe('GET /api/student/topics/:topicId/certificate-status', () => {
  it('returns not_earned when no attempt taken', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createContent(tTok);

    const sTok = await studentToken();
    const res = await request(app)
      .get(`/api/student/topics/${topicId}/certificate-status`)
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('not_earned');
  });

  it('returns earned with certificate id after passing', async () => {
    const tTok = await teacherToken();
    const { topicId, lessonId } = await createContent(tTok);
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    await completeLessons(sTok, lessonId);
    await submitAttempt(sTok, quizId, questionId, true);

    const res = await request(app)
      .get(`/api/student/topics/${topicId}/certificate-status`)
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('earned');
    expect(res.body.certificate_id).toBeTruthy();
    expect(res.body.issued_at).toBeTruthy();
  });

  it('returns not_earned when lessons not completed despite passing quiz', async () => {
    const tTok = await teacherToken();
    const { topicId } = await createContent(tTok);
    const { quizId, questionId } = await createTopicQuiz(tTok, topicId);

    const sTok = await studentToken();
    // lessons NOT completed
    await submitAttempt(sTok, quizId, questionId, true);

    const res = await request(app)
      .get(`/api/student/topics/${topicId}/certificate-status`)
      .set('Authorization', `Bearer ${sTok}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('not_earned');
  });

  it('requires authentication', async () => {
    const res = await request(app).get('/api/student/topics/1/certificate-status');
    expect(res.status).toBe(401);
  });
});
