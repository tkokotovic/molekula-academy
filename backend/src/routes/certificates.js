/**
 * Certificate routes (Step 39)
 *
 * Student:
 *   GET  /api/student/certificates                        — list earned certs
 *   GET  /api/student/certificates/:id/download          — stream PDF
 *   GET  /api/student/topics/:topicId/certificate-status — check status
 */

const express = require('express');
const PDFDocument = require('pdfkit');
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// ─── List certificates ────────────────────────────────────────────────────────

// GET /api/student/certificates
router.get('/certificates', requireAuth, (req, res) => {
  const certs = db.prepare(`
    SELECT c.id, c.topic_id, c.quiz_attempt_id, c.issued_at,
           t.title AS topic_title
      FROM certificates c
      JOIN topics t ON c.topic_id = t.id
     WHERE c.student_id = ?
     ORDER BY c.issued_at DESC
  `).all(req.user.id);

  return res.json(certs);
});

// ─── Download PDF ─────────────────────────────────────────────────────────────

// GET /api/student/certificates/:id/download
router.get('/certificates/:id/download', requireAuth, (req, res) => {
  const cert = db.prepare(`
    SELECT c.*, t.title AS topic_title, u.name AS student_name
      FROM certificates c
      JOIN topics t ON c.topic_id = t.id
      JOIN users u ON c.student_id = u.id
     WHERE c.id = ?
  `).get(req.params.id);

  if (!cert) return res.status(404).json({ error: 'Certificate not found' });
  if (cert.student_id !== req.user.id) return res.status(404).json({ error: 'Certificate not found' });

  // Generate PDF on-the-fly
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 60, bottom: 60, left: 60, right: 60 },
  });

  const filename = `certifikat-${cert.id}.pdf`;
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

  doc.pipe(res);

  // ─── Certificate design ───────────────────────────────────────────────────

  const W = doc.page.width;
  const H = doc.page.height;
  const cx = W / 2;

  // Background
  doc.rect(0, 0, W, H).fill('#f5f8f7');

  // Outer border
  doc
    .rect(20, 20, W - 40, H - 40)
    .lineWidth(3)
    .stroke('#0b343c');

  // Inner border
  doc
    .rect(28, 28, W - 56, H - 56)
    .lineWidth(1)
    .stroke('#0f8f86');

  // Academy name
  doc
    .fillColor('#0b343c')
    .fontSize(13)
    .font('Helvetica-Bold')
    .text('MOLEKULA ACADEMY', cx - 120, 60, { width: 240, align: 'center' });

  // Decorative line
  doc
    .moveTo(cx - 100, 82)
    .lineTo(cx + 100, 82)
    .lineWidth(1)
    .stroke('#1ec8b6');

  // Title
  doc
    .fillColor('#0b343c')
    .fontSize(32)
    .font('Helvetica-Bold')
    .text('CERTIFIKAT', 0, 105, { align: 'center' });

  doc
    .fontSize(16)
    .font('Helvetica')
    .fillColor('#0f8f86')
    .text('O ZAVRŠENOM MODULU', 0, 145, { align: 'center' });

  // Body text
  doc
    .fontSize(14)
    .fillColor('#333333')
    .font('Helvetica')
    .text('Ovime se potvrđuje da je', 0, 195, { align: 'center' });

  // Student name
  doc
    .fontSize(28)
    .font('Helvetica-Bold')
    .fillColor('#0b343c')
    .text(cert.student_name, 0, 218, { align: 'center' });

  // Divider under name
  doc
    .moveTo(cx - 140, 258)
    .lineTo(cx + 140, 258)
    .lineWidth(1)
    .stroke('#0b343c');

  doc
    .fontSize(14)
    .font('Helvetica')
    .fillColor('#333333')
    .text('uspješno završio/la modul', 0, 268, { align: 'center' });

  // Topic title
  doc
    .fontSize(22)
    .font('Helvetica-Bold')
    .fillColor('#0f8f86')
    .text(cert.topic_title, 0, 292, { align: 'center' });

  doc
    .fontSize(14)
    .font('Helvetica')
    .fillColor('#333333')
    .text('položivši završni test s ocjenom ≥ 70%', 0, 325, { align: 'center' });

  // Issued date
  const issuedDate = new Date(cert.issued_at).toLocaleDateString('hr-HR', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  doc
    .fontSize(12)
    .fillColor('#555555')
    .text(`Datum: ${issuedDate}`, 0, 365, { align: 'center' });

  // Bottom line + teacher
  doc
    .moveTo(cx - 80, 390)
    .lineTo(cx + 80, 390)
    .lineWidth(1)
    .stroke('#0b343c');

  doc
    .fontSize(11)
    .fillColor('#0b343c')
    .font('Helvetica-Bold')
    .text('dr. Tomislav', cx - 80, 396, { width: 160, align: 'center' });

  doc
    .fontSize(10)
    .font('Helvetica')
    .fillColor('#555555')
    .text('Profesor kemije', cx - 80, 410, { width: 160, align: 'center' });

  doc.end();
});

// ─── Certificate status for a topic ──────────────────────────────────────────

// GET /api/student/topics/:topicId/certificate-status
router.get('/topics/:topicId/certificate-status', requireAuth, (req, res) => {
  const cert = db.prepare(`
    SELECT id, issued_at FROM certificates
     WHERE student_id = ? AND topic_id = ?
  `).get(req.user.id, req.params.topicId);

  if (cert) {
    return res.json({ status: 'earned', certificate_id: cert.id, issued_at: cert.issued_at });
  }
  return res.json({ status: 'not_earned' });
});

module.exports = router;
