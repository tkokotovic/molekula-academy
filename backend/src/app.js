const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Serve uploaded files (message attachments, lesson media, etc.)
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// Auth & admin
app.use('/api/auth', require('./routes/auth'));
app.use('/api/admin', require('./routes/admin'));

// Content — public + teacher
const { publicRouter, teacherRouter } = require('./routes/courses');
app.use('/api/courses', publicRouter);
app.use('/api/teacher/courses', teacherRouter);

// Topics (mounted at /api/teacher — handles /courses/:id/topics AND /topics/:id)
app.use('/api/teacher', require('./routes/topics'));

// Lessons (mounted at /api/teacher — handles /topics/:id/lessons AND /lessons/:id)
app.use('/api/teacher', require('./routes/lessons'));

// Lesson blocks (mounted at /api/teacher — handles /lessons/:id/blocks AND /blocks/:id)
app.use('/api/teacher', require('./routes/lesson_blocks'));

// Student lesson blocks — plan-filtered by visibility (R07 enforcement)
app.use('/api/student', require('./routes/student_lessons'));

// Questions bank
app.use('/api/teacher/questions', require('./routes/questions'));

// Quiz engine
const { teacherRouter: quizTeacherRouter, studentRouter: quizStudentRouter, attemptRouter } = require('./routes/quizzes');
app.use('/api/teacher/quizzes', quizTeacherRouter);
app.use('/api/student/quizzes', quizStudentRouter);
app.use('/api/student/attempts', attemptRouter);

// Mock exam — student management + teacher feedback
app.use('/api/teacher/mock-exams', require('./routes/mock_exam'));

// AI Grading — teacher grades answers + views attempts
app.use('/api/teacher/attempts', require('./routes/grading'));

// Progress tracking + analytics (Step 38)
const { studentRouter: progressStudentRouter, teacherRouter: progressTeacherRouter } = require('./routes/progress');
app.use('/api/student', progressStudentRouter);
app.use('/api/teacher', progressTeacherRouter);

// Certificates (Step 39)
app.use('/api/student', require('./routes/certificates'));

// Quiz Library (Step 39b)
const { teacherRouter: libraryTeacherRouter, libraryRouter, studentRouter: libraryStudentRouter } = require('./routes/quiz_library');
app.use('/api/teacher/quizzes', libraryTeacherRouter);
app.use('/api/teacher', libraryRouter);
app.use('/api/student', libraryStudentRouter);

// Messaging (Phase 7)
const { studentRouter: msgStudentRouter, teacherRouter: msgTeacherRouter } = require('./routes/messages');
app.use('/api/student', msgStudentRouter);
app.use('/api/teacher', msgTeacherRouter);

// Sessions (S10)
const { studentRouter: sessStudentRouter, teacherRouter: sessTeacherRouter } = require('./routes/sessions');
app.use('/api/student', sessStudentRouter);
app.use('/api/teacher', sessTeacherRouter);

// File upload
app.use('/api/teacher/upload', require('./routes/upload'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
