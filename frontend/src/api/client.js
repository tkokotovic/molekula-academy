// ─── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'molekula_token';

export function getToken()        { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t)       { localStorage.setItem(TOKEN_KEY, t); }
export function clearToken()      { localStorage.removeItem(TOKEN_KEY); }
export function isAuthenticated() { return Boolean(getToken()); }

// ─── Base fetch wrapper ───────────────────────────────────────────────────────

async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res = await fetch(path, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

export async function logout() {
  clearToken();
}

export async function getMe() {
  return apiFetch('/api/auth/me');
}

export async function updateProfile(fields) {
  const data = await apiFetch('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  if (data.token) setToken(data.token);
  return data.user;
}

// ─── Courses ──────────────────────────────────────────────────────────────────

export async function getCourses() {
  const data = await apiFetch('/api/teacher/courses');
  return data.courses;
}

export async function createCourse(fields) {
  const data = await apiFetch('/api/teacher/courses', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.course;
}

export async function updateCourse(id, fields) {
  const data = await apiFetch(`/api/teacher/courses/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return data.course;
}

export async function setCourseStatus(id, status) {
  const data = await apiFetch(`/api/teacher/courses/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data.course;
}

export async function deleteCourse(id) {
  return apiFetch(`/api/teacher/courses/${id}`, { method: 'DELETE' });
}

// ─── Topics ───────────────────────────────────────────────────────────────────

export async function getTopics(courseId) {
  const data = await apiFetch(`/api/teacher/courses/${courseId}/topics`);
  return data.topics;
}

export async function createTopic(courseId, fields) {
  const data = await apiFetch(`/api/teacher/courses/${courseId}/topics`, {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.topic;
}

export async function updateTopic(id, fields) {
  const data = await apiFetch(`/api/teacher/topics/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return data.topic;
}

export async function setTopicStatus(id, status) {
  const data = await apiFetch(`/api/teacher/topics/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data.topic;
}

export async function deleteTopicById(id) {
  return apiFetch(`/api/teacher/topics/${id}`, { method: 'DELETE' });
}

// ─── Lessons ──────────────────────────────────────────────────────────────────

export async function getLessonsByTopic(topicId) {
  const data = await apiFetch(`/api/teacher/topics/${topicId}/lessons`);
  return data.lessons;
}

export async function getLesson(lessonId) {
  const data = await apiFetch(`/api/teacher/lessons/${lessonId}`);
  return data.lesson;
}

export async function createLesson(topicId, fields) {
  const data = await apiFetch(`/api/teacher/topics/${topicId}/lessons`, {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.lesson;
}

export async function updateLesson(id, fields) {
  const data = await apiFetch(`/api/teacher/lessons/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return data.lesson;
}

export async function setLessonStatus(id, status) {
  const data = await apiFetch(`/api/teacher/lessons/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data.lesson;
}

export async function deleteLessonById(id) {
  return apiFetch(`/api/teacher/lessons/${id}`, { method: 'DELETE' });
}

// ─── Master lesson library + forks ─────────────────────────────────────────────

export async function getLibraryLessons() {
  const data = await apiFetch('/api/teacher/library/lessons');
  return data.lessons;
}

export async function createLibraryLesson(fields) {
  const data = await apiFetch('/api/teacher/library/lessons', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.lesson;
}

// Copy a master lesson (+ its blocks) into a course topic as an independent fork
export async function forkLesson(masterLessonId, topicId) {
  const data = await apiFetch(`/api/teacher/lessons/${masterLessonId}/fork`, {
    method: 'POST',
    body: JSON.stringify({ topicId }),
  });
  return data.lesson;
}

// List a master lesson's forks with per-fork in-sync/differs status
export async function getLessonForks(masterLessonId) {
  return apiFetch(`/api/teacher/lessons/${masterLessonId}/forks`);
}

// Replace selected forks' blocks with the master's current content
export async function pushLessonToForks(masterLessonId, forkIds) {
  return apiFetch(`/api/teacher/lessons/${masterLessonId}/push`, {
    method: 'POST',
    body: JSON.stringify({ forkIds }),
  });
}

export async function getLessonBlocks(lessonId) {
  const data = await apiFetch(`/api/teacher/lessons/${lessonId}/blocks`);
  return data.blocks;
}

// Student lesson view — returns only blocks the student's plan is allowed to see
export async function getStudentLessonBlocks(lessonId) {
  const data = await apiFetch(`/api/student/lessons/${lessonId}/blocks`);
  return data.blocks;
}

// ─── Enrollment ───────────────────────────────────────────────────────────────

export async function getEnrollment() {
  return apiFetch('/api/student/enrollment');
}

export async function enroll(courseId) {
  const data = await apiFetch('/api/student/enrollment', {
    method: 'POST',
    body: JSON.stringify({ course_id: courseId }),
  });
  return data.enrollment;
}

// ─── Student content reads (published-only, no teacher_notes) ──────────────────

export async function getStudentCourses() {
  const data = await apiFetch('/api/student/courses');
  return data.courses;
}

export async function getStudentTopic(topicId) {
  const data = await apiFetch(`/api/student/topics/${topicId}`);
  return data.topic;
}

export async function getStudentCourse(courseId) {
  const data = await apiFetch(`/api/student/courses/${courseId}`);
  return data.course;
}

export async function getStudentCourseTopics(courseId) {
  const data = await apiFetch(`/api/student/courses/${courseId}/topics`);
  return data.topics;
}

export async function getStudentLessonsByTopic(topicId) {
  const data = await apiFetch(`/api/student/topics/${topicId}/lessons`);
  return data.lessons;
}

export async function getStudentLesson(lessonId) {
  const data = await apiFetch(`/api/student/lessons/${lessonId}`);
  return data.lesson;
}

export async function createLessonBlock(lessonId, type, content) {
  const data = await apiFetch(`/api/teacher/lessons/${lessonId}/blocks`, {
    method: 'POST',
    body: JSON.stringify({ type, content }),
  });
  return data.block;
}

export async function updateLessonBlock(blockId, content) {
  const data = await apiFetch(`/api/teacher/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify({ content }),
  });
  return data.block;
}

export async function deleteLessonBlock(blockId) {
  return apiFetch(`/api/teacher/blocks/${blockId}`, { method: 'DELETE' });
}

// Set a block's access level: 'public' | 'basic' | 'premium'
export async function setBlockVisibility(blockId, visibility) {
  const data = await apiFetch(`/api/teacher/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify({ visibility }),
  });
  return data.block;
}

export async function reorderLessonBlocks(lessonId, ids) {
  const data = await apiFetch(`/api/teacher/lessons/${lessonId}/blocks/reorder`, {
    method: 'PATCH',
    body: JSON.stringify({ ids }),
  });
  return data.blocks;
}

// ─── Question bank ────────────────────────────────────────────────────────────

export async function getQuestions(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  const data = await apiFetch(`/api/teacher/questions${qs ? `?${qs}` : ''}`);
  return data.questions;
}

export async function createQuestion(fields) {
  const data = await apiFetch('/api/teacher/questions', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.question;
}

export async function updateQuestion(id, fields) {
  const data = await apiFetch(`/api/teacher/questions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return data.question;
}

export async function setQuestionStatus(id, status) {
  const data = await apiFetch(`/api/teacher/questions/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
  return data.question;
}

export async function deleteQuestion(id) {
  return apiFetch(`/api/teacher/questions/${id}`, { method: 'DELETE' });
}

// ─── Teacher quizzes ──────────────────────────────────────────────────────────

export async function getTeacherQuizzes(params = {}) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ''))
  ).toString();
  const data = await apiFetch(`/api/teacher/quizzes${qs ? `?${qs}` : ''}`);
  return data.quizzes;
}

export async function createTeacherQuiz(fields) {
  const data = await apiFetch('/api/teacher/quizzes', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.quiz;
}

export async function updateTeacherQuiz(id, fields) {
  const data = await apiFetch(`/api/teacher/quizzes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return data.quiz;
}

export async function deleteTeacherQuiz(id) {
  return apiFetch(`/api/teacher/quizzes/${id}`, { method: 'DELETE' });
}

// ─── Student progress ─────────────────────────────────────────────────────────

export async function getLessonProgress(lessonId) {
  const data = await apiFetch(`/api/student/lessons/${lessonId}/progress`);
  return data.progress;
}

export async function markLessonProgress(lessonId, status = 'completed', timeSpentSeconds = 0) {
  const data = await apiFetch(`/api/student/lessons/${lessonId}/progress`, {
    method: 'POST',
    body: JSON.stringify({ status, time_spent_seconds: timeSpentSeconds }),
  });
  return data.progress;
}

// ─── Quizzes ──────────────────────────────────────────────────────────────────

export async function getQuiz(quizId) {
  return apiFetch(`/api/student/quizzes/${quizId}`);
}

export async function getQuizAttempts(quizId) {
  return apiFetch(`/api/student/quizzes/${quizId}/attempts`);
}

export async function startAttempt(quizId) {
  return apiFetch(`/api/student/quizzes/${quizId}/attempts`, { method: 'POST' });
}

export async function submitAttempt(attemptId, answers) {
  return apiFetch(`/api/student/attempts/${attemptId}/submit`, {
    method: 'POST',
    body: JSON.stringify({ answers }),
  });
}

export async function getAttempt(attemptId) {
  return apiFetch(`/api/student/attempts/${attemptId}`);
}

// ─── Student dashboard / progress ────────────────────────────────────────────

export async function getStudentStats() {
  const data = await apiFetch('/api/student/progress/stats');
  return data.stats;
}

export async function getCourseProgress() {
  const data = await apiFetch('/api/student/progress/courses');
  return data.courses;
}

export async function getRecentQuizHistory() {
  const data = await apiFetch('/api/student/progress/quiz-history');
  return data.attempts;
}

// ─── Certificates ─────────────────────────────────────────────────────────────

export async function getCertificates() {
  return apiFetch('/api/student/certificates');
}

export function getCertificateDownloadUrl(certId) {
  return `/api/student/certificates/${certId}/download`;
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export async function getMessages() {
  const data = await apiFetch('/api/student/messages');
  return data.messages;
}

export async function sendMessage(text) {
  const data = await apiFetch('/api/student/messages', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return data.message;
}

export async function getMessageThreads() {
  const data = await apiFetch('/api/teacher/messages');
  return data.threads;
}

export async function getMessageThread(studentId) {
  return apiFetch(`/api/teacher/messages/${studentId}`);
}

export async function replyToStudent(studentId, text) {
  const data = await apiFetch(`/api/teacher/messages/${studentId}`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return data.message;
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export async function getAdminStudents() {
  const data = await apiFetch('/api/admin/students');
  return data.students;
}

export async function getAdminStudent(id) {
  return apiFetch(`/api/admin/students/${id}`);
}

export async function setStudentSubscription(id, tier) {
  const data = await apiFetch(`/api/admin/users/${id}/subscription`, {
    method: 'PATCH',
    body: JSON.stringify({ subscription_tier: tier }),
  });
  return data.user;
}

export async function getAdminRevenue() {
  return apiFetch('/api/admin/revenue');
}

export async function getAdminDashboard() {
  return apiFetch('/api/admin/dashboard');
}

export async function updateStudentProfile(id, fields) {
  const data = await apiFetch(`/api/admin/students/${id}/profile`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  return data.user;
}
