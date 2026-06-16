import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { getLesson, getLessonBlocks, getMe } from '../../api/client';
import { hydrateChemHtml } from '../../components/extensions/chem';
import MolekulaMark from '../../components/MolekulaMark';
import './LessonEditorCanvas.css';
import SmilesDrawer from 'smiles-drawer';

// ─── KaTeX helper ──────────────────────────────────────────────────────────────

function renderKatex(latex, el) {
  if (!el || !latex) return;
  const go = () => {
    try { window.katex.render(latex, el, { throwOnError: false, displayMode: true }); }
    catch { el.textContent = latex; }
  };
  if (window.katex) go();
  else window.addEventListener('load', go, { once: true });
}

function EquationDisplay({ latex, caption }) {
  const ref = useRef(null);
  useEffect(() => { renderKatex(latex, ref.current); }, [latex]);
  return (
    <div className="print-equation">
      <div ref={ref} />
      {caption && <p className="print-caption">{caption}</p>}
    </div>
  );
}

// ─── Molecule display ──────────────────────────────────────────────────────────

function MoleculeDisplay({ smiles, name }) {
  const svgRef = useRef(null);
  useEffect(() => {
    if (!smiles?.trim() || !svgRef.current) return;
    const drawer = new SmilesDrawer.SvgDrawer({ width: 280, height: 200 });
    SmilesDrawer.parse(
      smiles.trim(),
      tree => drawer.draw(tree, svgRef.current, 'light'),
      () => { if (svgRef.current) svgRef.current.innerHTML = ''; }
    );
  }, [smiles]);
  return (
    <div className="print-molecule">
      {name && <p className="print-molecule-name">{name}</p>}
      <svg ref={svgRef} width={280} height={200} style={{ display: 'block', margin: '0 auto' }} />
      <p className="print-molecule-smiles">{smiles}</p>
    </div>
  );
}

// ─── Block renderer ────────────────────────────────────────────────────────────

function PrintBlock({ block, allBlocks = [] }) {
  const c = block.content || {};

  switch (block.type) {
    case 'heading': {
      const Tag = `h${c.level || 2}`;
      return <Tag className="print-heading">{c.text}</Tag>;
    }
    case 'text':
      return <div className="print-text" dangerouslySetInnerHTML={{ __html: hydrateChemHtml(c.html || '') }} />;
    case 'quote':
      return (
        <blockquote className="print-quote">
          <p>{c.text}</p>
          {c.attribution && <footer>— {c.attribution}</footer>}
        </blockquote>
      );
    case 'callout': case 'keypoint':
      return <div className="print-signal print-callout"><span className="print-signal-label">💡 Ključna točka</span>{c.text}</div>;
    case 'exam_tip':
      return <div className="print-signal print-examtip"><span className="print-signal-label">🎓 Savjet za ispit</span>{c.text}</div>;
    case 'warning':
      return <div className="print-signal print-warning"><span className="print-signal-label">⚠️ Upozorenje / česta greška</span>{c.text}</div>;
    case 'summary':
      return (
        <div className="print-signal print-summary">
          <span className="print-signal-label">📋 Sažetak</span>
          <ul>{(c.items || []).filter(Boolean).map((item, i) => <li key={i}>{item}</li>)}</ul>
        </div>
      );
    case 'list': {
      const items = (c.items || []).filter(Boolean);
      const Tag = c.ordered ? 'ol' : 'ul';
      return <Tag className="print-list">{items.map((it, i) => <li key={i}>{it}</li>)}</Tag>;
    }
    case 'checklist':
      return (
        <ul className="print-checklist">
          {(c.items || []).map((it, i) => <li key={i}>{it.checked ? '☑' : '☐'} {it.text}</li>)}
        </ul>
      );
    case 'toggle':
      return (
        <div className="print-toggle">
          <p className="print-toggle-title">▸ {c.title || ''}</p>
          <div className="print-text" dangerouslySetInnerHTML={{ __html: hydrateChemHtml(c.html || '') }} />
        </div>
      );
    case 'columns':
      return (
        <div className="print-columns" style={{ gridTemplateColumns: `repeat(${(c.cols || []).length || 2}, 1fr)` }}>
          {(c.cols || []).map((col, i) => <div key={i} className="print-text" dangerouslySetInnerHTML={{ __html: hydrateChemHtml(col?.html || '') }} />)}
        </div>
      );
    case 'toc': {
      const headings = allBlocks.filter(b => b.type === 'heading' && (b.content?.text || '').trim());
      if (!headings.length) return null;
      return (
        <div className="print-toc">
          <p className="print-summary-label">☰ Sadržaj</p>
          <ul>{headings.map((h, i) => <li key={i} style={{ marginLeft: ((h.content.level || 2) - 1) * 14 }}>{h.content.text}</li>)}</ul>
        </div>
      );
    }
    case 'embed':
      return (
        <div className="print-media-placeholder">
          🔌 Ugradnja: <a href={c.url}>{c.caption || c.url}</a>
        </div>
      );
    case 'divider':
      return <hr className="print-divider" />;
    case 'equation':
      return <EquationDisplay latex={c.latex} caption={c.caption} />;
    case 'molecule3d':
      return <MoleculeDisplay smiles={c.smiles} name={c.name} />;
    case 'image': case 'gif':
      return (
        <figure className="print-figure">
          {c.url && <img src={c.url} alt={c.alt || ''} style={{ maxWidth: '100%' }} />}
          {c.caption && <figcaption>{c.caption}</figcaption>}
        </figure>
      );
    case 'video':
      return (
        <div className="print-media-placeholder">
          🎬 Video: <a href={c.url}>{c.title || c.url}</a>
        </div>
      );
    case 'table': {
      const headers = c.headers || [];
      const rows = c.rows || [];
      return (
        <div className="print-table-wrap">
          {c.caption && <p className="print-caption">{c.caption}</p>}
          <table className="print-table">
            {headers.length > 0 && <thead><tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr></thead>}
            <tbody>{rows.map((row, ri) => <tr key={ri}>{(row || []).map((cell, ci) => <td key={ci}>{cell}</td>)}</tr>)}</tbody>
          </table>
        </div>
      );
    }
    case 'python': case 'graph':
      return (
        <div className="print-code">
          {c.caption && <p className="print-caption">{c.caption}</p>}
          {c.code ? <pre><code>{c.code}</code></pre> : <p className="print-caption">[{block.type === 'graph' ? 'Graf' : 'Kod'}]</p>}
        </div>
      );
    case 'link':
      return (
        <div className="print-link">
          🔗 <strong>{c.title || c.url}</strong>
          {c.url && c.url !== c.title && <span className="print-link-url"> — {c.url}</span>}
          {c.description && <p>{c.description}</p>}
        </div>
      );
    case 'quiz_link':
      return <div className="print-link">🧪 Kviz: <strong>{c.label || ''}</strong></div>;
    case 'pdf':
      return (
        <div className="print-link">
          📄 <strong>{c.label || 'PDF dokument'}</strong>
          {c.url && <span className="print-link-url"> — {c.url}</span>}
        </div>
      );
    default:
      return null;
  }
}

// ─── Print page ────────────────────────────────────────────────────────────────

export default function LessonPrintPage() {
  const { lessonId } = useParams();
  const [lesson, setLesson] = useState(null);
  const [blocks, setBlocks] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [ready,  setReady]  = useState(false);

  useEffect(() => {
    Promise.all([getLesson(lessonId), getLessonBlocks(lessonId), getMe().catch(() => null)])
      .then(([l, b, me]) => { setLesson(l); setBlocks(b); setTeacher(me); })
      .finally(() => setReady(true));
  }, [lessonId]);

  // Trigger print once content and KaTeX are ready.
  // ?print=0 opens the branded preview without the print dialog.
  useEffect(() => {
    if (!ready || !lesson) return;
    if (new URLSearchParams(window.location.search).get('print') === '0') return;
    const delay = setTimeout(() => window.print(), 800);
    return () => clearTimeout(delay);
  }, [ready, lesson]);

  if (!ready) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Učitavam lekciju…</div>;
  if (!lesson) return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Lekcija nije pronađena.</div>;

  return (
    <>
      <style>{`
        /* ── Print layout ── */
        @page { margin: 12mm; }
        body { font-family: 'Georgia', serif; font-size: 11pt; color: #25302f; background: #fff; margin: 0;
               -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-doc { max-width: 820px; margin: 0 auto; padding: 0 16px 40px; }

        /* Force the branded canvas to print its colours; flatten the card for paper */
        .print-doc .mol-canvas { margin: 16px 0 0; box-shadow: none; }
        .print-doc .mol-canvas__header,
        .print-doc .mol-canvas__footer,
        .print-doc .print-signal,
        .print-doc .print-table th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .print-doc .mol-canvas__body { padding: 36px 44px 44px; }
        @media print {
          .print-doc { max-width: none; padding: 0; }
          .print-doc .mol-canvas { border: none; border-radius: 0; margin: 0; }
        }

        /* Screen-only controls */
        .print-controls { padding: 16px 0 24px; display: flex; gap: 12px; align-items: center; }
        .print-controls button { padding: 8px 18px; border-radius: 7px; border: 1px solid #ccc; background: #f9f9f9; cursor: pointer; font-size: 14px; font-weight: 600; }
        .print-controls button.primary { background: #0f8f86; color: #fff; border-color: #0f8f86; }
        @media print { .print-controls { display: none; } }

        /* Title */
        .print-title { font-size: 26pt; font-weight: 800; margin: 0 0 8px; color: #0b343c; }
        .print-subtitle { font-size: 12pt; color: #555; font-style: italic; margin: 0 0 8px; }
        .print-meta { font-size: 9pt; color: #888; margin: 0 0 20px; }
        .print-rule { border: none; border-top: 2px solid #0b343c; margin: 0 0 24px; }

        /* Headings */
        .print-heading { color: #111; margin: 20px 0 8px; }
        h1.print-heading { font-size: 20pt; }
        h2.print-heading { font-size: 16pt; }
        h3.print-heading { font-size: 13pt; }
        h4.print-heading { font-size: 11pt; }

        /* Text */
        .print-text { line-height: 1.65; margin-bottom: 10px; }
        .print-text p { margin: 0 0 8px; }

        /* Quote */
        .print-quote { border-left: 4px solid #0f8f86; margin: 14px 0; padding: 6px 16px; font-style: italic; color: #333; }
        .print-quote footer { font-size: 9pt; color: #666; margin-top: 4px; }

        /* Signal blocks (callout / exam tip / warning / summary) — brand palette */
        .print-signal { padding: 10px 14px; border-radius: 0 6px 6px 0; margin: 12px 0; page-break-inside: avoid; }
        .print-signal-label { display: block; font-size: 8.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; margin: 0 0 4px; }
        .print-callout { background: #e7f4f0; border-left: 4px solid #0f8f86; color: #0b343c; }
        .print-callout .print-signal-label { color: #0f6e56; }
        .print-examtip { background: #faeeda; border-left: 4px solid #ba7517; color: #412402; }
        .print-examtip .print-signal-label { color: #854f0b; }
        .print-warning { background: #faece7; border-left: 4px solid #d85a30; color: #4a1b0c; }
        .print-warning .print-signal-label { color: #993c1d; }

        /* Summary */
        .print-summary { background: #eaf3de; border-left: 4px solid #639922; color: #173404; }
        .print-summary .print-signal-label { color: #3b6d11; }
        .print-summary-label { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: #64748b; margin: 0 0 8px; }
        .print-summary ul { margin: 0; padding-left: 20px; }
        .print-summary li { margin-bottom: 4px; }

        /* Lists / checklist */
        .print-list { margin: 10px 0; padding-left: 24px; line-height: 1.6; }
        .print-list li { margin-bottom: 3px; }
        .print-checklist { margin: 10px 0; padding-left: 6px; list-style: none; line-height: 1.7; }
        .print-checklist li { margin-bottom: 3px; }

        /* Toggle (always expanded in print) */
        .print-toggle { border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 14px; margin: 12px 0; page-break-inside: avoid; }
        .print-toggle-title { font-weight: 700; margin: 0 0 6px; color: #0b343c; }

        /* Columns */
        .print-columns { display: grid; gap: 18px; margin: 12px 0; }

        /* Table of contents */
        .print-toc { border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 16px; margin: 12px 0; background: #f8fafc; page-break-inside: avoid; }
        .print-toc ul { margin: 0; padding-left: 18px; }
        .print-toc li { margin-bottom: 3px; }

        /* Divider */
        .print-divider { border: none; border-top: 1px solid #d1d5db; margin: 16px 0; }

        /* Equation */
        .print-equation { text-align: center; padding: 16px 0; margin: 12px 0; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; page-break-inside: avoid; }
        .print-equation .katex-display { margin: 0; }

        /* Molecule */
        .print-molecule { text-align: center; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 16px; margin: 12px 0; background: #f8fafc; page-break-inside: avoid; }
        .print-molecule-name { font-weight: 700; margin: 0 0 8px; }
        .print-molecule-smiles { font-family: monospace; font-size: 9pt; color: #6b7280; margin: 6px 0 0; }

        /* Figure */
        .print-figure { margin: 12px 0; text-align: center; page-break-inside: avoid; }
        .print-figure img { max-width: 100%; max-height: 320px; border: 1px solid #e2e8f0; border-radius: 6px; }
        .print-figure figcaption { font-size: 9pt; color: #6b7280; margin-top: 6px; font-style: italic; }

        /* Table */
        .print-table-wrap { margin: 12px 0; overflow-x: auto; page-break-inside: avoid; }
        .print-table { border-collapse: collapse; width: 100%; font-size: 10pt; }
        .print-table th { background: #f3f4f6; border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; font-weight: 700; }
        .print-table td { border: 1px solid #d1d5db; padding: 5px 10px; }
        .print-table tr:nth-child(even) td { background: #f9fafb; }

        /* Code */
        .print-code pre { background: #f3f4f6; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px 14px; font-size: 9pt; overflow-x: auto; white-space: pre-wrap; page-break-inside: avoid; }

        /* Links */
        .print-link { border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin: 10px 0; background: #f8fafc; }
        .print-link-url { font-size: 9pt; color: #6366f1; }
        .print-media-placeholder { background: #f3f4f6; border: 1px dashed #d1d5db; border-radius: 6px; padding: 10px 14px; color: #6b7280; font-size: 10pt; }

        /* Caption */
        .print-caption { font-size: 9pt; color: #6b7280; font-style: italic; margin: 4px 0; }
      `}</style>

      <div className="print-doc">
        {/* Screen controls */}
        <div className="print-controls">
          <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'sans-serif' }}>Pregled za ispis</span>
          <button className="primary" onClick={() => window.print()}>🖨 Ispiši / Spremi PDF</button>
          <button onClick={() => window.close()}>Zatvori</button>
        </div>

        {/* Branded canvas — mirrors the on-screen lesson */}
        <article className="mol-canvas">
          <div className="mol-canvas__header">
            <div className="mol-canvas__brand">
              <MolekulaMark variant="dark" size={26} />
              <span className="mol-canvas__wordmark">Molekula Academy</span>
            </div>
            {lesson.topic_title && <span className="mol-canvas__crumb">{lesson.topic_title}</span>}
          </div>

          <div className="mol-canvas__body">
            <MolekulaMark variant="watermark" size={380} className="mol-canvas__watermark" />
            <div className="mol-canvas__content">

              {/* Lesson header */}
              <h1 className="print-title">{lesson.title}</h1>
              {lesson.summary && <p className="print-subtitle">{lesson.summary}</p>}
              <p className="print-meta">
                {lesson.difficulty && `Razina: ${lesson.difficulty === 'easy' ? 'Lagano' : lesson.difficulty === 'medium' ? 'Srednje' : 'Teško'}`}
                {lesson.difficulty && lesson.duration_minutes && ' · '}
                {lesson.duration_minutes && `Trajanje: ${lesson.duration_minutes} min`}
              </p>
              <hr className="print-rule" />

              {/* Blocks */}
              {blocks.map(block => (
                <div key={block.id} style={{ marginBottom: 6 }}>
                  <PrintBlock block={block} allBlocks={blocks} />
                </div>
              ))}

              {blocks.length === 0 && (
                <p style={{ color: '#9ca3af', fontStyle: 'italic' }}>Lekcija nema sadržaja.</p>
              )}
            </div>
          </div>

          <div className="mol-canvas__footer">
            <span>molekula.academy</span>
            <span>© Molekula Academy{lesson.topic_title ? ` · ${lesson.topic_title}` : ''}{teacher?.name ? ` · ${teacher.name}` : ''}</span>
          </div>
        </article>
      </div>
    </>
  );
}
