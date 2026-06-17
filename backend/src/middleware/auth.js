const jwt = require('jsonwebtoken');

// In production a real secret MUST be supplied — refuse to boot with the dev
// fallback, otherwise tokens would be signed with a publicly-known key.
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is required in production. Set it in the environment before starting.');
}

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
