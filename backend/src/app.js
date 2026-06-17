const express = require('express');
const path = require('path');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const app = express();

// Behind a reverse proxy (Nginx/Hetzner) in production — needed so rate-limit
// and req.ip see the real client address, not the proxy's.
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

// ─── Security headers ──────────────────────────────────────────────────────────
// crossOriginResourcePolicy relaxed so auth-gated /uploads images load in the SPA.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

// ─── CORS ───────────────────────────────────────────────────────────────────────
// Same-origin in production (frontend served by the same host). CORS_ORIGIN can
// list extra allowed origins (comma-separated) for staging / separate frontends.
const corsOrigins = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
if (corsOrigins.length) {
  app.use(cors({ origin: corsOrigins, credentials: true }));
}

// Cap JSON body size — lesson blocks can carry pasted HTML + base64 images.
app.use(express.json({ limit: '5mb' }));

// ─── Auth rate limiting ──────────────────────────────────────────────────────────
// Throttle credential endpoints to blunt brute-force / credential-stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,        // 15 min
  max: 20,                         // 20 attempts / IP / window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Previše pokušaja. Pokušajte ponovno za nekoliko minuta.' },
});
// Skip throttling in the test env (suites fire many auth calls from one IP).
if (process.env.NODE_ENV !== 'test') {
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/forgot-password', '/api/auth/reset-password'], authLimiter);
}

// Serve uploaded files (message attachments, lesson media, etc.) — auth-gated so
// lesson images can't be hot-linked or shared as bare URLs (student protection).
const { requireUploadsAuth } = require('./middleware/uploadsAuth');
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
app.use('/uploads', requireUploadsAuth, express.static(UPLOAD_DIR));

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

// Notifications
app.use('/api/student', require('./routes/notifications'));

// Tutoring packages + hours (R31)
const { teacherRouter: tutoringTeacherRouter, studentRouter: tutoringStudentRouter } = require('./routes/tutoring');
app.use('/api/teacher', tutoringTeacherRouter);
app.use('/api/student', tutoringStudentRouter);

// Broadcasts (R29a)
app.use('/api/teacher', require('./routes/broadcasts'));

// Groups / Cohorts (R27a)
app.use('/api/teacher', require('./routes/groups'));

// Syllabus codes + lesson tags (R08a)
app.use('/api/teacher', require('./routes/syllabus'));

// Homeworks (R17)
const { teacherRouter: hwTeacherRouter, studentRouter: hwStudentRouter } = require('./routes/homeworks');
app.use('/api/teacher', hwTeacherRouter);
app.use('/api/student', hwStudentRouter);

// File upload
app.use('/api/teacher/upload', require('./routes/upload'));

// Inline-chemistry compound library
app.use('/api/teacher', require('./routes/chem_compounds'));

// PDF export (R35 parent report, R36 progress report, lesson export)
app.use('/api/teacher', require('./routes/pdf'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// ─── Frontend serving (production) ───────────────────────────────────────────
// In production the Express server also serves the Vite build. Public marketing
// pages get meta-tag injection for SEO; all other routes get the SPA fallback.
if (process.env.NODE_ENV === 'production') {
  const fs = require('fs');
  const DIST = path.join(__dirname, '..', '..', 'frontend', 'dist');
  const BASE_HTML = path.join(DIST, 'index.html');

  const META = {
    '/': {
      title: 'Molekula Academy — Online kemija za IB, medicinare i stomatologe',
      description: 'Personalizirana online nastava kemije za IB učenike, pristupnike na medicinu i stomatologiju te studente. Lekcije, kvizovi i 1-na-1 tutoring.',
      og_image: 'https://molekula-academy.hr/og-home.png',
    },
    '/privacy': {
      title: 'Politika privatnosti — Molekula Academy',
      description: 'Saznajte kako Molekula Academy prikuplja, koristi i štiti vaše osobne podatke.',
    },
    '/terms': {
      title: 'Uvjeti korištenja — Molekula Academy',
      description: 'Uvjeti i odredbe korištenja platforme Molekula Academy.',
    },
  };

  app.use(express.static(DIST));

  app.get('*', (req, res) => {
    const meta = META[req.path];
    if (!meta || !fs.existsSync(BASE_HTML)) {
      return res.sendFile(BASE_HTML);
    }
    let html = fs.readFileSync(BASE_HTML, 'utf8');
    const ogImage = meta.og_image || 'https://molekula-academy.hr/og-home.png';
    const injection = [
      `<title>${meta.title}</title>`,
      `<meta name="description" content="${meta.description}" />`,
      `<meta property="og:title" content="${meta.title}" />`,
      `<meta property="og:description" content="${meta.description}" />`,
      `<meta property="og:image" content="${ogImage}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
    ].join('\n    ');
    html = html.replace('<title>Molekula Academy</title>', injection);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  });
}

// ─── Global error handler ─────────────────────────────────────────────────────
// Last-resort catch so an unhandled throw returns JSON instead of crashing the
// process or leaking a stack trace to the client.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err.stack || err.message || err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ error: 'Došlo je do greške. Pokušajte ponovno.' });
});

module.exports = app;
