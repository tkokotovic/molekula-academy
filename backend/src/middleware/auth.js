const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'molekula-dev-secret-change-in-production';

function requireAuth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token nije pronađen.' });
  }

  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token nije validan.' });
  }
}

function requireTeacher(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'teacher' && req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Pristup zabranjen. Samo za nastavnika.' });
    }
    next();
  });
}

function requireOwner(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'owner') {
      return res.status(403).json({ error: 'Pristup zabranjen. Samo za vlasnika.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireTeacher, requireOwner, JWT_SECRET };
