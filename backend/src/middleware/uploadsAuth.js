const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('./auth');

// Guard for /uploads — lesson images & attachments must not be hot-linkable or
// shareable as bare URLs. Accepts a valid JWT from any of:
//   • Authorization: Bearer <token>   (API/XHR callers)
//   • ?t=<token>                       (explicit query, e.g. printable export)
//   • molekula_token cookie            (plain <img src="/uploads/…"> requests)
// The cookie is the important one: browsers attach it automatically to image
// requests, so authored content keeps its bare /uploads/ srcs.
function parseCookies(header) {
  const out = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i === -1) continue;
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function requireUploadsAuth(req, res, next) {
  let token = null;
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) {
    token = header.slice(7);
  } else if (req.query && req.query.t) {
    token = String(req.query.t);
  } else {
    token = parseCookies(req.headers.cookie).molekula_token || null;
  }

  if (!token) return res.status(401).json({ error: 'Token nije pronađen.' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token nije validan.' });
  }
}

module.exports = { requireUploadsAuth };
