// ─── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = 'molekula_token';

// Mirror the JWT into a same-origin cookie. Bare <img src="/uploads/…"> tags in
// lesson content can't send the Authorization header, but the browser attaches
// this cookie automatically, so the auth-gated /uploads route still resolves.
function syncTokenCookie(token) {
  if (typeof document === 'undefined') return;
  if (token) {
    // 7-day max-age mirrors a typical session; Lax so same-site navigations work.
    document.cookie = `${TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=604800; SameSite=Lax`;
  } else {
    document.cookie = `${TOKEN_KEY}=; path=/; max-age=0; SameSite=Lax`;
  }
}

export function getToken()        { return localStorage.getItem(TOKEN_KEY); }
export function setToken(t)       { localStorage.setItem(TOKEN_KEY, t); syncTokenCookie(t); }
export function clearToken()      { localStorage.removeItem(TOKEN_KEY); syncTokenCookie(null); }
export function isAuthenticated() { return Boolean(getToken()); }

// Re-sync on load for sessions that authenticated before the cookie existed.
syncTokenCookie(getToken());

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

export async function setLessonStatus(id, status, publish_at) {
  const body = publish_at ? { status, publish_at } : { status };
  const data = await apiFetch(`/api/teacher/lessons/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
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

// Convert a block to another type (optionally resetting/carrying content)
export async function changeLessonBlockType(blockId, type, content) {
  const data = await apiFetch(`/api/teacher/blocks/${blockId}`, {
    method: 'PATCH',
    body: JSON.stringify({ type, content }),
  });
  return data.block;
}

// ─── Chemistry compound library (inline /ch picker) ────────────────────────────

export async function getChemCompounds(q = '') {
  const data = await apiFetch(`/api/teacher/chem-compounds${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  return data.compounds;
}

export async function saveChemCompound({ name_hr, name_en, formula }) {
  const data = await apiFetch('/api/teacher/chem-compounds', {
    method: 'POST',
    body: JSON.stringify({ name_hr, name_en, formula }),
  });
  return data.compound;
}

export async function deleteChemCompound(id) {
  return apiFetch(`/api/teacher/chem-compounds/${id}`, { method: 'DELETE' });
}

// ─── File / image upload ───────────────────────────────────────────────────────
// Uploads a File/Blob, returns the public URL (server resizes images → WebP).
export async function uploadImage(file) {
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch('/api/teacher/upload', {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: fd,
  });
  if (!res.ok) throw new Error('Upload failed');
  const data = await res.json();
  const p = data.upload?.path || '';
  return p ? `/${p.replace(/^\/+/, '')}` : '';
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

export async function importQuestions(questions) {
  const data = await apiFetch('/api/teacher/questions/import', {
    method: 'POST',
    body: JSON.stringify({ questions }),
  });
  return data;
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

export async function getStudentQuizzesByCourse(courseId) {
  return apiFetch(`/api/student/quizzes?type=topic_quiz&course_id=${courseId}`);
}

export async function getStudentMockExams() {
  return apiFetch('/api/student/quizzes?type=mock_exam');
}

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

// ─── Homework (teacher) ───────────────────────────────────────────────────────

export async function getTeacherHomeworks() {
  const data = await apiFetch('/api/teacher/homeworks');
  return data.homeworks;
}

export async function createHomework(fields) {
  return apiFetch('/api/teacher/homeworks', { method: 'POST', body: JSON.stringify(fields) });
}

export async function updateHomework(id, fields) {
  return apiFetch(`/api/teacher/homeworks/${id}`, { method: 'PUT', body: JSON.stringify(fields) });
}

export async function deleteHomework(id) {
  return apiFetch(`/api/teacher/homeworks/${id}`, { method: 'DELETE' });
}

export async function assignHomework(id, fields) {
  return apiFetch(`/api/teacher/homeworks/${id}/assign`, { method: 'POST', body: JSON.stringify(fields) });
}

export async function getHomeworkInbox(params = {}) {
  const qs = new URLSearchParams(params).toString();
  const data = await apiFetch(`/api/teacher/homeworks/assignments/inbox${qs ? '?' + qs : ''}`);
  return data.assignments;
}

export async function getHomeworkAssignment(id) {
  const data = await apiFetch(`/api/teacher/homeworks/assignments/${id}`);
  return data.assignment;
}

export async function correctAssignment(id, fields) {
  return apiFetch(`/api/teacher/homeworks/assignments/${id}/correct`, { method: 'POST', body: JSON.stringify(fields) });
}

export async function getAdminGroups() {
  const data = await apiFetch('/api/teacher/groups');
  return data.groups;
}

export async function createGroup(name) {
  const data = await apiFetch('/api/teacher/groups', { method: 'POST', body: JSON.stringify({ name }) });
  return data.group;
}

export async function getGroup(id) {
  const data = await apiFetch(`/api/teacher/groups/${id}`);
  return data.group;
}

export async function updateGroup(id, name) {
  const data = await apiFetch(`/api/teacher/groups/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });
  return data.group;
}

export async function deleteGroup(id) {
  return apiFetch(`/api/teacher/groups/${id}`, { method: 'DELETE' });
}

export async function addGroupMembers(id, student_ids) {
  const data = await apiFetch(`/api/teacher/groups/${id}/members`, { method: 'POST', body: JSON.stringify({ student_ids }) });
  return data.members;
}

export async function removeGroupMember(id, studentId) {
  return apiFetch(`/api/teacher/groups/${id}/members/${studentId}`, { method: 'DELETE' });
}

export async function getGroupProgress(id) {
  const data = await apiFetch(`/api/teacher/groups/${id}/progress`);
  return data.stats;
}

// ─── Homework (student) ───────────────────────────────────────────────────────

export async function getStudentHomework() {
  const data = await apiFetch('/api/student/homeworks');
  return data.assignments;
}

export async function submitHomework(assignmentId, answers) {
  return apiFetch(`/api/student/homeworks/${assignmentId}/submit`, { method: 'POST', body: JSON.stringify({ answers }) });
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

export async function sendMessage(text, file = null) {
  const token = getToken();
  const form = new FormData();
  if (text) form.append('text', text);
  if (file) form.append('file', file);

  const res = await fetch('/api/student/messages', {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  return data.message;
}

export async function getMessageThreads() {
  const data = await apiFetch('/api/teacher/messages');
  return data.threads;
}

export async function getMessageThread(studentId) {
  return apiFetch(`/api/teacher/messages/${studentId}`);
}

export async function replyToStudent(studentId, text, file = null) {
  const token = getToken();
  const form = new FormData();
  if (text) form.append('text', text);
  if (file) form.append('file', file);

  const res = await fetch(`/api/teacher/messages/${studentId}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  const data = await res.json();
  return data.message;
}

export async function archiveMessageThread(studentId) {
  return apiFetch(`/api/teacher/messages/${studentId}/archive`, { method: 'POST' });
}

export async function unarchiveMessageThread(studentId) {
  return apiFetch(`/api/teacher/messages/${studentId}/unarchive`, { method: 'POST' });
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

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function getStudentSessions() {
  const data = await apiFetch('/api/student/sessions');
  return data.sessions;
}

export async function getTeacherSessions(studentId = null) {
  const qs = studentId ? `?student_id=${studentId}` : '';
  const data = await apiFetch(`/api/teacher/sessions${qs}`);
  return data.sessions;
}

export async function createSession(fields) {
  const data = await apiFetch('/api/teacher/sessions', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.session;
}

export async function updateSession(id, fields) {
  const data = await apiFetch(`/api/teacher/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  return data.session;
}

export async function deleteSession(id) {
  return apiFetch(`/api/teacher/sessions/${id}`, { method: 'DELETE' });
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function getNotifications() {
  return apiFetch('/api/student/notifications');
}

export async function markNotificationRead(id) {
  return apiFetch(`/api/student/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiFetch('/api/student/notifications/read-all', { method: 'PATCH' });
}

// ─── Broadcasts ───────────────────────────────────────────────────────────────

export async function getBroadcasts() {
  const data = await apiFetch('/api/teacher/broadcasts');
  return data.broadcasts;
}

export async function getBroadcast(id) {
  const data = await apiFetch(`/api/teacher/broadcasts/${id}`);
  return data.broadcast;
}

export async function sendBroadcast(fields) {
  const data = await apiFetch('/api/teacher/broadcasts', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.broadcast;
}

export async function previewBroadcastAudience(audience_filter) {
  const data = await apiFetch('/api/teacher/broadcasts/preview', {
    method: 'POST',
    body: JSON.stringify({ audience_filter }),
  });
  return data.recipient_count;
}

// ─── Tutoring packages ────────────────────────────────────────────────────────

export async function getTutoringPackages() {
  const data = await apiFetch('/api/teacher/tutoring/packages');
  return data.packages;
}

export async function createTutoringPackage(fields) {
  const data = await apiFetch('/api/teacher/tutoring/packages', {
    method: 'POST',
    body: JSON.stringify(fields),
  });
  return data.package;
}

export async function updateTutoringPackage(id, fields) {
  const data = await apiFetch(`/api/teacher/tutoring/packages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(fields),
  });
  return data.package;
}

export async function deleteTutoringPackage(id) {
  return apiFetch(`/api/teacher/tutoring/packages/${id}`, { method: 'DELETE' });
}

export async function getStudentHours(studentId) {
  const data = await apiFetch(`/api/teacher/students/${studentId}/hours`);
  return data;
}

export async function updateStudentHours(studentId, fields) {
  const data = await apiFetch(`/api/teacher/students/${studentId}/hours`, {
    method: 'PATCH',
    body: JSON.stringify(fields),
  });
  return data.hours;
}

export async function getSyllabusCodes(courseType) {
  const qs = courseType ? `?course_type=${courseType}` : '';
  return apiFetch(`/api/teacher/syllabus-codes${qs}`);
}

export async function getLessonSyllabusTags(lessonId) {
  return apiFetch(`/api/teacher/lessons/${lessonId}/syllabus-tags`);
}

export async function setLessonSyllabusTags(lessonId, ids) {
  return apiFetch(`/api/teacher/lessons/${lessonId}/syllabus-tags`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ syllabus_code_ids: ids }),
  });
}

// ─── PDF exports ──────────────────────────────────────────────────────────────

// Download a blob from an authenticated endpoint and trigger a browser save dialog.
async function downloadPDF(url, method = 'GET', body = null, filename = 'dokument.pdf') {
  const opts = {
    method,
    headers: { Authorization: `Bearer ${getToken()}` },
  };
  if (body) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`PDF greška: ${res.status}`);
  const blob = await res.blob();
  const href = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = href;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(href);
}

export async function downloadParentReportPDF(studentId, fields, studentName) {
  const date = new Date().toISOString().slice(0, 10);
  const safe = (studentName || 'student').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  return downloadPDF(
    `/api/teacher/students/${studentId}/pdf/parent-report`,
    'POST',
    fields,
    `izvjestaj_${safe}_${date}.pdf`,
  );
}

export async function downloadProgressReportPDF(studentId, studentName) {
  const date = new Date().toISOString().slice(0, 10);
  const safe = (studentName || 'student').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  return downloadPDF(
    `/api/teacher/students/${studentId}/pdf/progress`,
    'GET',
    null,
    `napredak_${safe}_${date}.pdf`,
  );
}

export async function downloadLessonPDF(lessonId, lessonTitle) {
  const safe = (lessonTitle || 'lekcija').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_');
  return downloadPDF(
    `/api/teacher/lessons/${lessonId}/pdf`,
    'GET',
    null,
    `${safe}.pdf`,
  );
}
