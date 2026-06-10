const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');
const { sendWelcomeEmail } = require('../services/email');

const router = express.Router();

function makeToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, subscription_tier: user.subscription_tier },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function safeUser(user) {
  const { password, ...rest } = user;
  return rest;
}

// ─── REGISTER ────────────────────────────────────────────────────────────────

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // Validate
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Ime, email i lozinka su obavezni.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Lozinka mora imati najmanje 8 znakova.' });
  }

  // Check duplicate email
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'Email adresa je već registrirana.' });
  }

  // Hash password and insert
  const hashed = await bcrypt.hash(password, 12);
  const result = db.prepare(
    'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)'
  ).run(name, email.toLowerCase().trim(), hashed, 'student');

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
  const token = makeToken(user);

  // Step 59a: send welcome email (fire-and-forget)
  sendWelcomeEmail({ studentName: user.name, studentEmail: user.email });

  return res.status(201).json({ user: safeUser(user), token });
});

// ─── LOGIN ───────────────────────────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email i lozinka su obavezni.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Pogrešan email ili lozinka.' });
  }

  const token = makeToken(user);
  return res.status(200).json({ user: safeUser(user), token });
});

// ─── GET CURRENT USER ────────────────────────────────────────────────────────

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Korisnik nije pronađen.' });
  return res.json(safeUser(user));
});

// ─── UPDATE PROFILE ───────────────────────────────────────────────────────────

router.patch('/profile', requireAuth, async (req, res) => {
  const { name, email, current_password, new_password, exam_date } = req.body;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(401).json({ error: 'Korisnik nije pronađen.' });

  // Name update
  if (name !== undefined) {
    if (!name.trim()) return res.status(400).json({ error: 'Ime ne smije biti prazno.' });
  }

  // Email update — check uniqueness
  if (email !== undefined && email.toLowerCase().trim() !== user.email) {
    const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(email.toLowerCase().trim(), user.id);
    if (existing) return res.status(409).json({ error: 'Email adresa je već u upotrebi.' });
  }

  // Password change — requires current_password verification
  let hashedNew = null;
  if (new_password !== undefined) {
    if (!current_password) return res.status(400).json({ error: 'Unesite trenutnu lozinku.' });
    const valid = await bcrypt.compare(current_password, user.password);
    if (!valid) return res.status(401).json({ error: 'Trenutna lozinka nije točna.' });
    if (new_password.length < 8) return res.status(400).json({ error: 'Nova lozinka mora imati najmanje 8 znakova.' });
    hashedNew = await bcrypt.hash(new_password, 12);
  }

  // Apply updates
  const updatedName  = name  !== undefined ? name.trim()                : user.name;
  const updatedEmail = email !== undefined ? email.toLowerCase().trim() : user.email;
  const updatedPass  = hashedNew           ? hashedNew                  : user.password;
  const updatedExam  = exam_date !== undefined ? (exam_date || null)    : user.exam_date;

  db.prepare('UPDATE users SET name = ?, email = ?, password = ?, exam_date = ? WHERE id = ?')
    .run(updatedName, updatedEmail, updatedPass, updatedExam, user.id);

  const updated = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
  const token = makeToken(updated);
  return res.json({ user: safeUser(updated), token });
});

module.exports = router;
