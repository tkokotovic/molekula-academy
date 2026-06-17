/**
 * Email service — Nodemailer wrapper with dev-mode fallback.
 *
 * Configure via environment variables (see .env.example).
 * When SMTP_HOST is not set, emails are printed to the console instead of sent.
 */

const nodemailer = require('nodemailer');

// ─── Transport ────────────────────────────────────────────────────────────────

function createTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST) {
    // Dev mode: log to console, never throw
    return null;
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_SECURE === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

const transport = createTransport();

const FROM    = process.env.EMAIL_FROM    || 'Molekula Academy <noreply@molekula-academy.hr>';
const TEACHER = process.env.TEACHER_EMAIL || 'tomislav@molekula.hr';

// ─── Core send ────────────────────────────────────────────────────────────────

async function send({ to, subject, html, text }) {
  if (!transport) {
    console.log(`[email] DEV — to: ${to} | subject: ${subject}`);
    console.log(`[email] text: ${text || '(html only)'}`);
    return;
  }

  try {
    await transport.sendMail({ from: FROM, to, subject, html, text });
  } catch (err) {
    // Never crash the request — just log
    console.error('[email] send error:', err.message);
  }
}

// ─── Templates ───────────────────────────────────────────────────────────────

// Brand palette (see design-decisions): deep teal, accent teal, bright-teal CTAs.
// Email clients rarely load custom fonts, so we declare the brand faces first
// then fall back to system stacks that match their character.
function wrapHtml(content) {
  return `<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=DM+Sans:wght@400;500&display=swap');
    body { font-family: 'DM Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; background: #eef3f3; margin: 0; padding: 24px; }
    .card { background: #fff; border-radius: 12px; max-width: 560px; margin: 0 auto; overflow: hidden; box-shadow: 0 2px 8px rgba(11,52,60,0.08); }
    .header { background: #0b343c; padding: 24px 32px; }
    .logo { font-family: 'Bricolage Grotesque', 'DM Sans', Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 700; color: #1ec8b6; margin: 0; letter-spacing: -0.01em; }
    .body { padding: 28px 32px 32px; }
    h2 { font-family: 'Bricolage Grotesque', 'DM Sans', Helvetica, Arial, sans-serif; margin: 0 0 12px; color: #0b343c; font-weight: 700; }
    p { color: #475569; line-height: 1.6; margin: 0 0 12px; }
    .highlight { color: #0b343c; font-weight: 600; }
    .btn { display: inline-block; margin-top: 16px; padding: 12px 26px; background: #1ec8b6; color: #0b343c; border-radius: 8px; text-decoration: none; font-weight: 700; }
    blockquote { border-left: 4px solid #0f8f86; margin: 16px 0; padding: 8px 16px; color: #0b343c; }
    .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body><div class="card">
  <div class="header"><p class="logo">Molekula Academy</p></div>
  <div class="body">${content}</div>
</div></body>
</html>`;
}

// ─── Step 58: teacher notified when student sends a message ───────────────────

async function notifyTeacherNewMessage({ studentName, studentEmail, messageText }) {
  const subject = `Nova poruka od ${studentName} — Molekula Academy`;

  const html = wrapHtml(`
    <h2>Nova poruka od studenta</h2>
    <p><span class="highlight">${studentName}</span> (${studentEmail}) je poslao/la poruku:</p>
    <blockquote>
      ${escapeHtml(messageText)}
    </blockquote>
    <a class="btn" href="https://molekula-academy.hr/admin/messages">Otvori poruke</a>
    <div class="footer">Molekula Academy — admin panel</div>
  `);

  const text =
    `Nova poruka od ${studentName} (${studentEmail}):\n\n${messageText}\n\nOdgovori u admin panelu.`;

  await send({ to: TEACHER, subject, html, text });
}

// ─── Step 59a: welcome email to new student ───────────────────────────────────

async function sendWelcomeEmail({ studentName, studentEmail }) {
  const subject = 'Dobrodošli u Molekula Academy!';

  const html = wrapHtml(`
    <h2>Dobrodošli, ${escapeHtml(studentName)}!</h2>
    <p>Drago nam je što si se pridružio/la Molekula Academy — online platformi za kemiju koja
       te priprema za IB, prijemni ispit i sveučilišne ispite.</p>
    <p>Što možeš raditi:</p>
    <ul style="color:#475569;line-height:1.8;">
      <li>Pregledavaj tečajeve i lekcije</li>
      <li>Rješavaj kvizove i prati napredak</li>
      <li>Piši poruke svom profesoru</li>
      <li>Zarađuj certifikate po završetku tema</li>
    </ul>
    <a class="btn" href="https://molekula-academy.hr/courses">Počni učiti</a>
    <div class="footer">Ako imaš pitanja, odgovori na ovaj email ili piši kroz platformu.</div>
  `);

  const text =
    `Dobrodošli, ${studentName}!\n\nRegistracija na Molekula Academy je uspješna.\n` +
    `Prijavi se i počni učiti: https://molekula-academy.hr/courses`;

  await send({ to: studentEmail, subject, html, text });
}

// ─── Step 59b: certificate earned notification ────────────────────────────────

async function sendCertificateEmail({ studentName, studentEmail, topicName }) {
  const subject = `Čestitamo! Zaradio/la si certifikat za "${topicName}"`;

  const html = wrapHtml(`
    <h2>Čestitamo, ${escapeHtml(studentName)}! 🎓</h2>
    <p>Uspješno si završio/la temu <span class="highlight">${escapeHtml(topicName)}</span>
       i zaradio/la certifikat.</p>
    <p>Certifikat možeš preuzeti u svom profilu.</p>
    <a class="btn" href="https://molekula-academy.hr/progress">Preuzmi certifikat</a>
    <div class="footer">Nastavi učiti — sljedeća tema te čeka!</div>
  `);

  const text =
    `Čestitamo, ${studentName}!\n\n` +
    `Zaradio/la si certifikat za temu "${topicName}".\n\n` +
    `Preuzmi ga na: https://molekula-academy.hr/progress`;

  await send({ to: studentEmail, subject, html, text });
}

// ─── Step 59c: teacher reply notification to student ─────────────────────────

async function notifyStudentTeacherReplied({ studentName, studentEmail, replyText }) {
  const subject = 'Profesor Tomislav ti je odgovorio — Molekula Academy';

  const html = wrapHtml(`
    <h2>Imaš novu poruku od profesora</h2>
    <p>Profesor <span class="highlight">Tomislav</span> ti je odgovorio:</p>
    <blockquote>
      ${escapeHtml(replyText)}
    </blockquote>
    <a class="btn" href="https://molekula-academy.hr/messages">Otvori razgovor</a>
    <div class="footer">Molekula Academy</div>
  `);

  const text =
    `Imaš novu poruku od profesora Tomislava:\n\n${replyText}\n\n` +
    `Otvori razgovor: https://molekula-academy.hr/messages`;

  await send({ to: studentEmail, subject, html, text });
}

// ─── Password reset ───────────────────────────────────────────────────────────

async function sendPasswordResetEmail({ studentName, studentEmail, resetUrl }) {
  const subject = 'Zahtjev za promjenu lozinke — Molekula Academy';

  const html = wrapHtml(`
    <h2>Promjena lozinke</h2>
    <p>Bok ${escapeHtml(studentName)},</p>
    <p>Zaprimili smo zahtjev za promjenu lozinke na tvom računu. Klikni na gumb ispod
       kako bi postavio/la novu lozinku. Poveznica vrijedi <span class="highlight">60 minuta</span>.</p>
    <a class="btn" href="${resetUrl}">Postavi novu lozinku</a>
    <p style="margin-top:20px;font-size:13px;">Ako nisi ti zatražio/la promjenu, slobodno ignoriraj
       ovaj email — tvoja lozinka ostaje nepromijenjena.</p>
    <div class="footer">Molekula Academy</div>
  `);

  const text =
    `Bok ${studentName},\n\n` +
    `Zatražena je promjena lozinke. Postavi novu na sljedećoj poveznici (vrijedi 60 min):\n` +
    `${resetUrl}\n\nAko nisi ti, ignoriraj ovaj email.`;

  await send({ to: studentEmail, subject, html, text });
}

// ─── H08: homework graded notification to student ────────────────────────────

async function sendHomeworkGradedEmail({ studentName, studentEmail, homeworkTitle, score, teacherComment }) {
  const subject = `Zadaća "${homeworkTitle}" je ocijenjena — Molekula Academy`;

  const scoreLine =
    score != null
      ? `<p>Ostvareni bodovi: <span class="highlight">${escapeHtml(String(score))}</span></p>`
      : '';
  const commentBlock = teacherComment
    ? `<p>Komentar profesora:</p><blockquote>${escapeHtml(teacherComment)}</blockquote>`
    : '';

  const html = wrapHtml(`
    <h2>Tvoja zadaća je pregledana</h2>
    <p>Profesor je ocijenio tvoju zadaću <span class="highlight">${escapeHtml(homeworkTitle)}</span>.</p>
    ${scoreLine}
    ${commentBlock}
    <a class="btn" href="https://molekula-academy.hr/homeworks">Pogledaj ocjenu</a>
    <div class="footer">Molekula Academy</div>
  `);

  const text =
    `Bok ${studentName},\n\n` +
    `Tvoja zadaća "${homeworkTitle}" je ocijenjena.\n` +
    (score != null ? `Bodovi: ${score}\n` : '') +
    (teacherComment ? `Komentar: ${teacherComment}\n` : '') +
    `\nPogledaj na: https://molekula-academy.hr/homeworks`;

  await send({ to: studentEmail, subject, html, text });
}

// ─── H08: session scheduled notification to student ──────────────────────────

async function sendSessionScheduledEmail({ studentName, studentEmail, title, scheduledAt, zoomUrl, prepNote }) {
  const subject = `Termin dogovoren: ${title} — Molekula Academy`;

  const zoomBlock = zoomUrl
    ? `<a class="btn" href="${zoomUrl}">Pridruži se Zoom pozivu</a>`
    : `<a class="btn" href="https://molekula-academy.hr/sessions">Pogledaj termin</a>`;
  const prepBlock = prepNote
    ? `<p>Priprema za sat:</p><blockquote>${escapeHtml(prepNote)}</blockquote>`
    : '';

  const html = wrapHtml(`
    <h2>Termin je dogovoren</h2>
    <p>Bok ${escapeHtml(studentName)}, dogovoren je termin za
       <span class="highlight">${escapeHtml(title)}</span>.</p>
    <p>Vrijeme: <span class="highlight">${escapeHtml(formatDateTimeHr(scheduledAt))}</span></p>
    ${prepBlock}
    ${zoomBlock}
    <div class="footer">Molekula Academy</div>
  `);

  const text =
    `Bok ${studentName},\n\n` +
    `Dogovoren je termin za "${title}".\n` +
    `Vrijeme: ${formatDateTimeHr(scheduledAt)}\n` +
    (prepNote ? `Priprema: ${prepNote}\n` : '') +
    (zoomUrl ? `Zoom: ${zoomUrl}\n` : '') +
    `\nPogledaj na: https://molekula-academy.hr/sessions`;

  await send({ to: studentEmail, subject, html, text });
}

async function sendSessionReminderEmail({ studentName, studentEmail, title, scheduledAt, zoomUrl, hoursUntil }) {
  const timeLabel = hoursUntil <= 1 ? 'za sat vremena' : 'sutra';
  const subject = `Podsjetnik: termin ${timeLabel} — ${title}`;

  const zoomBlock = zoomUrl
    ? `<a class="btn" href="${zoomUrl}">Pridruži se Zoom pozivu</a>`
    : `<a class="btn" href="https://molekula-academy.hr/sessions">Pogledaj termine</a>`;

  const html = wrapHtml(`
    <h2>Termin ${timeLabel}</h2>
    <p>Bok ${escapeHtml(studentName)}, podsjećamo te na nadolazeći termin.</p>
    <p>Predmet: <span class="highlight">${escapeHtml(title)}</span></p>
    <p>Vrijeme: <span class="highlight">${escapeHtml(formatDateTimeHr(scheduledAt))}</span></p>
    ${zoomBlock}
    <div class="footer">Molekula Academy</div>
  `);

  const text =
    `Bok ${studentName},\n\n` +
    `Podsjetnik: termin "${title}" je ${timeLabel}.\n` +
    `Vrijeme: ${formatDateTimeHr(scheduledAt)}\n` +
    (zoomUrl ? `Zoom: ${zoomUrl}\n` : '') +
    `\nPogledaj na: https://molekula-academy.hr/sessions`;

  await send({ to: studentEmail, subject, html, text });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateTimeHr(value) {
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('hr-HR', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}


function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = {
  notifyTeacherNewMessage,
  sendWelcomeEmail,
  sendCertificateEmail,
  notifyStudentTeacherReplied,
  sendPasswordResetEmail,
  sendHomeworkGradedEmail,
  sendSessionScheduledEmail,
  sendSessionReminderEmail,
};
