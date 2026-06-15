const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');
const db = require('../db');
const { requireAuth, requireTeacher } = require('../middleware/auth');

// ─── Allowed MIME types ───────────────────────────────────────────────────────

const ALLOWED_TYPES = new Set([
  // Images
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  // Documents
  'application/pdf',
  // Video
  'video/mp4', 'video/webm', 'video/ogg',
  // Audio
  'audio/mpeg', 'audio/ogg', 'audio/wav',
  // Chemistry / 3D molecule formats (uploaded as text)
  'chemical/x-pdb', 'chemical/x-mdl-molfile',
  // Plain text (for .pdb/.sdf uploaded without proper MIME)
  'text/plain',
]);

function fileFilter(req, file, cb) {
  if (ALLOWED_TYPES.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'Unsupported file type'));
  }
}

// ─── Storage — disk (prod) vs memory (test) ───────────────────────────────────

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');

function buildStorage() {
  if (process.env.NODE_ENV === 'test') {
    return multer.memoryStorage();
  }
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOAD_DIR),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      cb(null, `${randomUUID()}${ext}`);
    },
  });
}

const upload = multer({
  storage: buildStorage(),
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
});

// ─── POST /api/teacher/upload ─────────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireTeacher,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        return res.status(400).json({ error: `Unsupported file type` });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    let { originalname, mimetype, size, filename: diskFilename, buffer } = req.file;

    // In test mode we use memory storage — generate a uuid filename ourselves
    const ext = path.extname(originalname);
    let filename = diskFilename || `${randomUUID()}${ext}`;

    // Image optimisation: resize (max 1600px) + convert to WebP. Keep animated
    // GIFs and SVGs untouched. Disk mode only (tests use memory storage).
    const isOptimisable = /^image\/(jpeg|png|webp)$/.test(mimetype);
    if (isOptimisable && diskFilename && process.env.NODE_ENV !== 'test') {
      try {
        const sharp = require('sharp');
        const srcPath = path.join(UPLOAD_DIR, diskFilename);
        const webpName = `${randomUUID()}.webp`;
        const info = await sharp(srcPath)
          .rotate() // honour EXIF orientation
          .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
          .webp({ quality: 82 })
          .toFile(path.join(UPLOAD_DIR, webpName));
        fs.unlink(srcPath, () => {});
        filename = webpName;
        mimetype = 'image/webp';
        size = info.size;
      } catch (e) {
        // sharp unavailable or processing failed — keep the original upload
      }
    }

    const filePath = process.env.NODE_ENV === 'test'
      ? `uploads/${filename}`
      : path.relative(path.join(__dirname, '../..'), path.join(UPLOAD_DIR, filename));

    // Get the teacher's user id from the JWT payload (set by requireAuth)
    const uploadedBy = req.user.id;

    const result = db.prepare(`
      INSERT INTO uploads (filename, original_name, mime_type, size, path, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(filename, originalname, mimetype, size || (buffer ? buffer.length : 0), filePath, uploadedBy);

    const record = db.prepare('SELECT * FROM uploads WHERE id = ?').get(result.lastInsertRowid);
    return res.status(201).json({ upload: record });
  }
);

module.exports = router;
