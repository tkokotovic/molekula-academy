const db = require('../db');
const { sendSessionReminderEmail } = require('./email');

const INTERVAL_MS = 15 * 60 * 1000; // every 15 minutes

async function sendReminders() {
  const now = new Date();

  // 24h window: sessions starting between 23h and 25h from now
  const win24Lo = new Date(now.getTime() + 23 * 60 * 60 * 1000).toISOString();
  const win24Hi = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

  // 1h window: sessions starting between 15min and 90min from now
  const win1Lo  = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const win1Hi  = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

  const sessions24 = db.prepare(`
    SELECT s.id, s.title, s.scheduled_at, s.zoom_url,
           u.name AS student_name, u.email AS student_email
      FROM sessions s
      JOIN users u ON u.id = s.student_id
     WHERE s.status = 'upcoming'
       AND s.reminder_24h_sent = 0
       AND s.scheduled_at BETWEEN ? AND ?
  `).all(win24Lo, win24Hi);

  for (const s of sessions24) {
    await sendSessionReminderEmail({
      studentName: s.student_name,
      studentEmail: s.student_email,
      title: s.title,
      scheduledAt: s.scheduled_at,
      zoomUrl: s.zoom_url,
      hoursUntil: 24,
    });
    db.prepare(`UPDATE sessions SET reminder_24h_sent = 1 WHERE id = ?`).run(s.id);
  }

  const sessions1 = db.prepare(`
    SELECT s.id, s.title, s.scheduled_at, s.zoom_url,
           u.name AS student_name, u.email AS student_email
      FROM sessions s
      JOIN users u ON u.id = s.student_id
     WHERE s.status = 'upcoming'
       AND s.reminder_1h_sent = 0
       AND s.scheduled_at BETWEEN ? AND ?
  `).all(win1Lo, win1Hi);

  for (const s of sessions1) {
    await sendSessionReminderEmail({
      studentName: s.student_name,
      studentEmail: s.student_email,
      title: s.title,
      scheduledAt: s.scheduled_at,
      zoomUrl: s.zoom_url,
      hoursUntil: 1,
    });
    db.prepare(`UPDATE sessions SET reminder_1h_sent = 1 WHERE id = ?`).run(s.id);
  }

  if (sessions24.length + sessions1.length > 0) {
    console.log(`[cron] reminders sent — 24h: ${sessions24.length}, 1h: ${sessions1.length}`);
  }
}

function startCron() {
  sendReminders().catch(err => console.error('[cron] error:', err.message));
  setInterval(() => {
    sendReminders().catch(err => console.error('[cron] error:', err.message));
  }, INTERVAL_MS);
  console.log('[cron] session reminder job started (every 15 min)');
}

module.exports = { startCron };
