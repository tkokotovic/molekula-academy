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

function wrapHtml(content) {
  return `<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f5; margin: 0; padding: 20px; }
    .card { background: #fff; border-radius: 8px; max-width: 560px; margin: 0 auto; padding: 32px; }
    .logo { font-size: 20px; font-weight: bold; color: #0ea5e9; margin-bottom: 24px; }
    h2 { margin: 0 0 12px; color: #1e293b; }
    p { color: #475569; line-height: 1.6; margin: 0 0 12px; }
    .highlight { color: #1e293b; font-weight: bold; }
    .btn { display: inline-block; margin-top: 16px; padding: 12px 24px; background: #0ea5e9; color: #fff; border-radius: 6px; text-decoration: none; font-weight: bold; }
    .footer { margin-top: 24px; font-size: 12px; color: #94a3b8; }
  </style>
</head>
<body><div class="card">${content}</div></body>
</html>`;
}

// ─── Step 58: teacher notified when student sends a message ───────────────────

async function notifyTeacherNewMessage({ studentName, studentEmail, messageText }) {
  const subject = `Nova poruka od ${studentName} — Molekula Academy`;

  const html = wrapHtml(`
    <div class="logo">Molekula Academy</div>
    <h2>Nova poruka od studenta</h2>
    <p><span class="highlight">${studentName}</span> (${studentEmail}) je poslao/la poruku:</p>
    <blockquote style="border-left:4px solid #0ea5e9;margin:16px 0;padding:8px 16px;color:#1e293b;">
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
    <div class="logo">Molekula Academy</div>
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
    <div class="logo">Molekula Academy</div>
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
  const subject = 'Professor Tomislav ti je odgovorio — Molekula Academy';

  const html = wrapHtml(`
    <div class="logo">Molekula Academy</div>
    <h2>Imaš novu poruku od profesora</h2>
    <p>Professor <span class="highlight">Tomislav</span> ti je odgovorio:</p>
    <blockquote style="border-left:4px solid #0ea5e9;margin:16px 0;padding:8px 16px;color:#1e293b;">
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
    <div class="logo">Molekula Academy</div>
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
};
