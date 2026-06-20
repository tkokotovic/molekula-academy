import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getStudentLesson, getStudentLessonsByTopic, getStudentLessonBlocks,
  getStudentCourse, getStudentTopic,
  getLessonProgress, markLessonProgress, getMe,
} from '../api/client';
import { hydrateChemHtml } from '../components/extensions/chem';
import { Watermark, useContentGuards } from '../components/ContentProtection';
import MolekulaMark from '../components/MolekulaMark';
import Molecule3dViewer from '../components/Molecule3dViewer';
import LessonNotes from '../components/LessonNotes';
import './admin/LessonEditorCanvas.css';

// Signal-block palette — kept in sync with the editor (LessonEditorPage SIGNAL),
// so what the teacher authors is what the student reads. Colour as signal, not decoration.
const SIGNAL = {
  callout:  { accent: '#0f8f86', wash: '#e7f4f0', label: '#0f6e56', body: '#0b343c', icon: '💡', title: 'Ključna točka' },
  exam_tip: { accent: '#ba7517', wash: '#faeeda', label: '#854f0b', body: '#412402', icon: '🎓', title: 'Savjet za ispit' },
  warning:  { accent: '#d85a30', wash: '#faece7', label: '#993c1d', body: '#4a1b0c', icon: '⚠️', title: 'Upozorenje / česta greška' },
  summary:  { accent: '#639922', wash: '#eaf3de', label: '#3b6d11', body: '#173404', icon: '📋', title: 'Sažetak' },
};

// Render saved text-block HTML, hydrating inline chem/math (data-chem spans) with
// KaTeX. KaTeX loads deferred, so re-hydrate once it's available.
function useChemHtml(raw) {
  const [html, setHtml] = useState(() => hydrateChemHtml(raw));
  useEffect(() => {
    setHtml(hydrateChemHtml(raw));
    if (typeof window !== 'undefined' && !window.katex) {
      const t = setInterval(() => { if (window.katex) { setHtml(hydrateChemHtml(raw)); clearInterval(t); } }, 120);
      return () => clearInterval(t);
    }
  }, [raw]);
  return html;
}

const MOBILE_NUDGE_KEY = 'molekula_mobile_nudge_dismissed';

// ─── Difficulty badge ─────────────────────────────────────────────────────────

const DIFF_LABELS = { easy: 'Lagano', medium: 'Srednje', hard: 'Teško' };
const DIFF_COLORS = {
  easy:   { background: '#d4f5f0', color: '#064843' },
  medium: { background: '#fff3d4', color: '#7a4f00' },
  hard:   { background: '#fde8e8', color: '#7a1515' },
};

function DiffBadge({ difficulty }) {
  const style = DIFF_COLORS[difficulty] || DIFF_COLORS.medium;
  return (
    <span style={{ ...style, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '.05em' }}>
      {DIFF_LABELS[difficulty] || difficulty}
    </span>
  );
}

// ─── Block renderers ──────────────────────────────────────────────────────────

function BlockText({ content }) {
  const raw = content?.html || (content?.text ? `<p>${content.text}</p>` : '');
  const html = useChemHtml(raw);
  if (!raw) return null;
  return (
    <div
      className="lesson-prose"
      style={{ lineHeight: 1.8, fontSize: 17 }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function BlockEquation({ content }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const latex = content?.latex || content?.formula || '';
    if (window.katex) {
      try {
        window.katex.render(latex, ref.current, { throwOnError: false, displayMode: true });
      } catch (_) {
        ref.current.textContent = latex;
      }
    } else {
      ref.current.textContent = latex;
    }
  }, [content]);

  return (
    <figure style={{ margin: '4px 0' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--line)',
          borderRadius: 'var(--radius-sm)',
          padding: '20px 28px',
          overflowX: 'auto',
          fontFamily: 'var(--mono)',
          fontSize: 18,
          textAlign: 'center',
        }}
      >
        <div ref={ref} />
      </div>
      {content?.caption && (
        <figcaption style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic', textAlign: 'center' }}>{content.caption}</figcaption>
      )}
    </figure>
  );
}

function BlockHeading({ content }) {
  const level = Math.min(Math.max(content?.level || 2, 1), 5);
  const Tag = `h${level}`;
  const sizes = { 1: 30, 2: 25, 3: 21, 4: 18, 5: 16 };
  return (
    <Tag style={{
      fontFamily: 'var(--display)', fontWeight: 800, color: '#0b343c',
      fontSize: sizes[level], lineHeight: 1.25, margin: '8px 0',
    }}>
      {content?.text || ''}
    </Tag>
  );
}

// Callout / exam tip / warning — shared signal-block renderer (left accent bar + wash).
function BlockSignal({ type, content }) {
  const s = SIGNAL[type] || SIGNAL.callout;
  const html = useChemHtml(content?.html || (content?.text ? `<p>${content.text}</p>` : ''));
  return (
    <div style={{ borderLeft: `3px solid ${s.accent}`, background: s.wash, borderRadius: '0 10px 10px 0', padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: s.label, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>
        <span>{s.icon}</span> {s.title}
      </div>
      <div style={{ color: s.body, fontSize: 16, lineHeight: 1.65 }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  );
}

function BlockQuote({ content }) {
  return (
    <blockquote style={{ borderLeft: '4px solid var(--accent)', margin: 0, paddingLeft: 20, paddingTop: 4, paddingBottom: 4 }}>
      <p style={{ margin: 0, fontSize: 19, fontStyle: 'italic', color: 'var(--ink)', fontFamily: 'var(--display)', lineHeight: 1.6 }}>
        {content?.text || ''}
      </p>
      {content?.attribution && (
        <footer style={{ marginTop: 6, fontSize: 14, color: 'var(--ink-soft)' }}>— {content.attribution}</footer>
      )}
    </blockquote>
  );
}

function BlockDivider() {
  return <hr style={{ border: 'none', borderTop: '2px solid var(--line)', margin: '4px 0' }} />;
}

function BlockList({ content }) {
  const items = Array.isArray(content?.items) ? content.items.filter(Boolean) : [];
  if (!items.length) return null;
  const Tag = content?.ordered ? 'ol' : 'ul';
  return (
    <Tag style={{ margin: '4px 0', paddingLeft: 26, lineHeight: 1.8, fontSize: 17, color: 'var(--ink)' }}>
      {items.map((it, i) => <li key={i} style={{ marginBottom: 2 }}>{it}</li>)}
    </Tag>
  );
}

function BlockChecklist({ content }) {
  const items = Array.isArray(content?.items) ? content.items : [];
  if (!items.length) return null;
  return (
    <div>
      {items.map((it, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '3px 0', fontSize: 17, lineHeight: 1.6, color: it.checked ? 'var(--ink-faint)' : 'var(--ink)' }}>
          <span style={{ fontSize: 18, lineHeight: 1.4, color: it.checked ? 'var(--accent)' : 'var(--ink-faint)' }}>{it.checked ? '☑' : '☐'}</span>
          <span style={{ textDecoration: it.checked ? 'line-through' : 'none' }}>{it.text}</span>
        </div>
      ))}
    </div>
  );
}

function BlockToggle({ content }) {
  const html = useChemHtml(content?.html || '');
  return (
    <details style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '4px 16px', background: 'var(--surface)' }}>
      <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: 17, color: 'var(--ink)', fontFamily: 'var(--display)', padding: '8px 0' }}>
        {content?.title || 'Više…'}
      </summary>
      <div className="lesson-prose" style={{ paddingBottom: 10, lineHeight: 1.75, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: html }} />
    </details>
  );
}

function BlockColumn({ html }) {
  const hydrated = useChemHtml(html || '');
  return <div className="lesson-prose" style={{ minWidth: 0, lineHeight: 1.75, fontSize: 16 }} dangerouslySetInnerHTML={{ __html: hydrated }} />;
}

function BlockColumns({ content }) {
  const cols = Array.isArray(content?.cols) && content.cols.length ? content.cols : [];
  if (!cols.length) return null;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols.length}, 1fr)`, gap: 24 }} className="lesson-columns">
      {cols.map((c, i) => <BlockColumn key={i} html={c?.html} />)}
    </div>
  );
}

function BlockToc({ allBlocks = [] }) {
  const headings = allBlocks
    .filter(b => b.type === 'heading' && (b.content?.text || '').trim())
    .map(b => ({ level: b.content.level || 2, text: b.content.text }));
  if (!headings.length) return null;
  return (
    <nav style={{ border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', background: 'var(--surface)' }}>
      <p style={{ margin: '0 0 10px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 700 }}>
        ☰ Sadržaj
      </p>
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {headings.map((h, i) => (
          <li key={i} style={{ padding: '3px 0', paddingLeft: (h.level - 1) * 16, fontSize: 15, color: 'var(--ink)' }}>{h.text}</li>
        ))}
      </ul>
    </nav>
  );
}

function BlockEmbed({ content }) {
  const url = content?.url || '';
  if (!url) return null;
  return (
    <figure style={{ margin: 0 }}>
      <div style={{ position: 'relative', paddingTop: '62%', borderRadius: 'var(--radius-sm)', overflow: 'hidden', border: '1.5px solid var(--line)' }}>
        <iframe src={url} title={content?.caption || 'Ugrađeni sadržaj'} allowFullScreen
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }} />
      </div>
      {content?.caption && <figcaption style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic', textAlign: 'center' }}>{content.caption}</figcaption>}
    </figure>
  );
}

function BlockQuizLink({ content }) {
  const id = content?.quiz_id;
  const inner = (
    <>
      <span style={{ fontSize: 24 }}>🧪</span>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{content?.label || 'Kviz'}</p>
        {content?.description && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-faint)' }}>{content.description}</p>}
      </div>
    </>
  );
  const boxStyle = { display: 'flex', alignItems: 'center', gap: 14, background: 'var(--accent-wash)', border: '1.5px solid var(--accent)', borderRadius: 'var(--radius-sm)', padding: '16px 20px', textDecoration: 'none' };
  return id
    ? <Link to={`/quizzes/${id}`} style={boxStyle}>{inner}</Link>
    : <div style={boxStyle}>{inner}</div>;
}

function BlockCode({ content }) {
  return (
    <div style={{ border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      {content?.caption && <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>{content.caption}</div>}
      <pre style={{ margin: 0, padding: '14px 16px', overflowX: 'auto', fontSize: 13, fontFamily: 'var(--mono)', lineHeight: 1.6, color: 'var(--ink)', background: 'var(--bg)' }}>
        <code>{content?.code || ''}</code>
      </pre>
    </div>
  );
}

function BlockSummary({ content }) {
  const items = Array.isArray(content?.items) ? content.items.filter(Boolean) : (content?.text ? [content.text] : []);
  const s = SIGNAL.summary;
  return (
    <div style={{ borderLeft: `3px solid ${s.accent}`, background: s.wash, borderRadius: '0 10px 10px 0', padding: '16px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: s.label, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>
        <span>{s.icon}</span> {s.title}
      </div>
      <ul style={{ margin: 0, paddingLeft: 22, lineHeight: 1.8, fontSize: 16, color: s.body }}>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

function BlockImage({ content }) {
  const src = content?.url || content?.src || '';
  if (!src) return null;
  return (
    <figure style={{ margin: '4px 0', textAlign: 'center' }}>
      <img
        src={src}
        alt={content.alt || ''}
        draggable={false}
        onContextMenu={e => e.preventDefault()}
        style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--line)', WebkitUserDrag: 'none' }}
      />
      {content.caption && (
        <figcaption style={{ marginTop: 8, fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
          {content.caption}
        </figcaption>
      )}
    </figure>
  );
}

function BlockVideo({ content }) {
  const url = content?.url || content?.src || '';
  // Convert YouTube watch URLs to embed
  const embedUrl = url
    .replace('watch?v=', 'embed/')
    .replace('youtu.be/', 'www.youtube.com/embed/');
  const isYoutube = embedUrl.includes('youtube.com/embed') || embedUrl.includes('youtu.be');

  if (!url) return null;

  if (isYoutube) {
    return (
      <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
        <iframe
          src={embedUrl}
          title={content?.title || 'Video'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <video
      src={url}
      controls
      style={{ width: '100%', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--line)' }}
    />
  );
}

function BlockTable({ content }) {
  const headers = Array.isArray(content?.headers) ? content.headers : [];
  const rows    = Array.isArray(content?.rows) ? content.rows : [];
  if (!headers.length && !rows.length) return null;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
        {headers.length > 0 && (
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i} style={{
                  padding: '10px 14px', textAlign: 'left', fontWeight: 700,
                  background: 'var(--accent)', color: 'var(--on-accent)',
                  borderBottom: '2px solid var(--accent)',
                  fontSize: 13,
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--bg)' }}>
              {(Array.isArray(row) ? row : [row]).map((cell, j) => (
                <td key={j} style={{
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--line)',
                  color: 'var(--ink)',
                }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BlockFlashcard({ content }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <div
      onClick={() => setFlipped(f => !f)}
      style={{
        cursor: 'pointer',
        background: flipped ? 'var(--deep)' : 'var(--surface)',
        color: flipped ? '#fff' : 'var(--ink)',
        border: '1.5px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        padding: '28px 24px',
        textAlign: 'center',
        transition: 'background .25s, color .25s',
        userSelect: 'none',
        minHeight: 100,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
      }}
    >
      <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', opacity: .6 }}>
        {flipped ? 'Odgovor · Answer' : 'Pitanje · Question'}
      </p>
      <p style={{ margin: 0, fontSize: 17, fontWeight: 600, lineHeight: 1.5 }}>
        {flipped ? (content?.back || '—') : (content?.front || '—')}
      </p>
      <p style={{ margin: 0, fontSize: 12, opacity: .5, marginTop: 4 }}>Klikni za okretanje · Click to flip</p>
    </div>
  );
}

function BlockPdf({ content }) {
  const src = content?.url || content?.src || '';
  if (!src) return null;
  return (
    <div style={{ border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
      <iframe src={src} title="PDF" style={{ width: '100%', height: 600, border: 0 }} />
    </div>
  );
}

function BlockLink({ content }) {
  const url = content?.url || '#';
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        background: 'var(--surface)',
        border: '1.5px solid var(--line)',
        borderRadius: 'var(--radius-sm)',
        padding: '16px 20px',
        textDecoration: 'none',
        color: 'var(--ink)',
        transition: 'border-color .15s',
      }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
    >
      <span style={{ fontSize: 24 }}>🔗</span>
      <div>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 15 }}>{content?.title || url}</p>
        {content?.description && (
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-faint)' }}>{content.description}</p>
        )}
      </div>
    </a>
  );
}

function BlockMolecule3d({ content }) {
  return <Molecule3dViewer smiles={content?.smiles} name={content?.name} />;
}

function LessonBlock({ block, allBlocks }) {
  const { type, content } = block;
  // Headings hug the following block; dividers need less vertical air.
  const gap = type === 'heading' ? '24px 0 4px' : type === 'divider' ? '12px 0' : '20px 0';
  const wrapStyle = { margin: gap };

  switch (type) {
    case 'text':       return <div style={wrapStyle}><BlockText content={content} /></div>;
    case 'heading':    return <div style={wrapStyle}><BlockHeading content={content} /></div>;
    case 'equation':   return <div style={wrapStyle}><BlockEquation content={content} /></div>;
    case 'callout':
    case 'keypoint':   return <div style={wrapStyle}><BlockSignal type="callout" content={content} /></div>;
    case 'exam_tip':   return <div style={wrapStyle}><BlockSignal type="exam_tip" content={content} /></div>;
    case 'warning':    return <div style={wrapStyle}><BlockSignal type="warning" content={content} /></div>;
    case 'summary':    return <div style={wrapStyle}><BlockSummary content={content} /></div>;
    case 'quote':      return <div style={wrapStyle}><BlockQuote content={content} /></div>;
    case 'divider':    return <div style={wrapStyle}><BlockDivider /></div>;
    case 'list':       return <div style={wrapStyle}><BlockList content={content} /></div>;
    case 'checklist':  return <div style={wrapStyle}><BlockChecklist content={content} /></div>;
    case 'toggle':     return <div style={wrapStyle}><BlockToggle content={content} /></div>;
    case 'columns':    return <div style={wrapStyle}><BlockColumns content={content} /></div>;
    case 'toc':        return <div style={wrapStyle}><BlockToc allBlocks={allBlocks} /></div>;
    case 'embed':      return <div style={wrapStyle}><BlockEmbed content={content} /></div>;
    case 'image':
    case 'gif':        return <div style={wrapStyle}><BlockImage content={content} /></div>;
    case 'video':      return <div style={wrapStyle}><BlockVideo content={content} /></div>;
    case 'table':      return <div style={wrapStyle}><BlockTable content={content} /></div>;
    case 'flashcard':  return <div style={wrapStyle}><BlockFlashcard content={content} /></div>;
    case 'pdf':        return <div style={wrapStyle}><BlockPdf content={content} /></div>;
    case 'link':       return <div style={wrapStyle}><BlockLink content={content} /></div>;
    case 'quiz_link':  return <div style={wrapStyle}><BlockQuizLink content={content} /></div>;
    case 'python':
    case 'graph':      return <div style={wrapStyle}><BlockCode content={content} /></div>;
    case 'molecule3d': return <div style={wrapStyle}><BlockMolecule3d content={content} /></div>;
    default:
      return (
        <div style={{ ...wrapStyle, padding: '12px 16px', background: 'var(--bg)', border: '1px dashed var(--line)', borderRadius: 8, fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
          Nepoznat blok: {type}
        </div>
      );
  }
}

// ─── Sidebar lesson list ───────────────────────────────────────────────────────

function LessonSidebar({ lessons, currentLessonId, courseId, topicId, completedIds }) {
  return (
    <nav style={{
      position: 'sticky',
      top: 80,
      maxHeight: 'calc(100vh - 120px)',
      overflowY: 'auto',
      background: 'var(--surface)',
      border: '1.5px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '14px 0',
      minWidth: 220,
      width: 240,
      flexShrink: 0,
    }}>
      <p style={{
        margin: '0 0 8px',
        padding: '0 16px 10px',
        fontFamily: 'var(--mono)',
        fontSize: 11,
        letterSpacing: '.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-faint)',
        borderBottom: '1px solid var(--line)',
      }}>
        Lekcije · Lessons
      </p>
      {lessons.map((lesson, idx) => {
        const isCurrent  = lesson.id === Number(currentLessonId);
        const isDone     = completedIds.has(lesson.id);
        return (
          <Link
            key={lesson.id}
            to={`/courses/${courseId}/topics/${topicId}/lessons/${lesson.id}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 16px',
              textDecoration: 'none',
              background: isCurrent ? 'var(--accent)' : 'transparent',
              color: isCurrent ? 'var(--on-accent)' : 'var(--ink-soft)',
              fontSize: 14,
              fontWeight: isCurrent ? 600 : 400,
              borderLeft: isCurrent ? '3px solid var(--accent-bright)' : '3px solid transparent',
              transition: 'background .15s, color .15s',
            }}
            onMouseEnter={e => { if (!isCurrent) e.currentTarget.style.background = 'var(--accent-wash)'; }}
            onMouseLeave={e => { if (!isCurrent) e.currentTarget.style.background = 'transparent'; }}
          >
            <span style={{
              flexShrink: 0,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: isDone ? (isCurrent ? 'rgba(255,255,255,.3)' : 'var(--accent)') : (isCurrent ? 'rgba(255,255,255,.2)' : 'var(--line)'),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 11,
              fontWeight: 700,
              color: isDone ? '#fff' : (isCurrent ? '#fff' : 'var(--ink-faint)'),
              fontFamily: 'var(--mono)',
            }}>
              {isDone ? '✓' : idx + 1}
            </span>
            <span style={{ flex: 1, lineHeight: 1.3 }}>{lesson.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function LessonPage() {
  const { courseId, topicId, lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson,      setLesson]    = useState(null);
  const [blocks,      setBlocks]    = useState([]);
  const [siblings,    setSiblings]  = useState([]);
  const [courseTitle, setCourseTitle] = useState('');
  const [topicTitle,  setTopicTitle]  = useState('');
  const [progress,    setProgress]  = useState(null);
  const [loading,     setLoading]   = useState(true);
  const [error,       setError]     = useState('');
  const [marking,     setMarking]   = useState(false);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [showQuizPrompt, setShowQuizPrompt] = useState(false);
  const [user, setUser] = useState(null);
  const [mobileNudgeDismissed, setMobileNudgeDismissed] = useState(
    () => Boolean(localStorage.getItem(MOBILE_NUDGE_KEY))
  );
  const isMobile = window.innerWidth < 768;

  // Content protection: per-student watermark + copy/right-click/print guards.
  useContentGuards(true);
  useEffect(() => { getMe().then(setUser).catch(() => {}); }, []);
  useEffect(() => {
    document.body.classList.add('printing-blocked');
    return () => document.body.classList.remove('printing-blocked');
  }, []);
  const watermarkLabel = user ? `${user.name} · ${user.email}` : '';

  const startTime = useRef(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lessonData, blocksData, siblingData, courseData, topicData] = await Promise.all([
        getStudentLesson(lessonId),
        getStudentLessonBlocks(lessonId),
        getStudentLessonsByTopic(topicId),
        getStudentCourse(courseId).catch(() => null),
        getStudentTopic(topicId).catch(() => null),
      ]);
      setCourseTitle(courseData?.title || '');
      setTopicTitle(topicData?.title || '');
      setLesson(lessonData);
      setBlocks(blocksData);
      setSiblings(siblingData);

      // Load progress for all sibling lessons to show checkmarks
      const progResults = await Promise.allSettled(
        siblingData.map(l => getLessonProgress(l.id))
      );
      const done = new Set();
      progResults.forEach((r, i) => {
        if (r.status === 'fulfilled' && r.value?.status === 'completed') {
          done.add(siblingData[i].id);
        }
      });
      setCompletedIds(done);

      // Current lesson's progress
      const myProg = progResults[siblingData.findIndex(l => l.id === Number(lessonId))];
      if (myProg?.status === 'fulfilled') setProgress(myProg.value);

      startTime.current = Date.now();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lessonId, topicId]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkComplete() {
    const elapsed = Math.round((Date.now() - startTime.current) / 1000);
    setMarking(true);
    try {
      const updated = await markLessonProgress(lessonId, 'completed', elapsed);
      setProgress(updated);
      setCompletedIds(prev => new Set([...prev, Number(lessonId)]));
      // Show quiz suggestion if lesson has linked quizzes
      if (lesson?.linked_quiz_ids?.length > 0) setShowQuizPrompt(true);
    } catch (e) {
      alert('Greška: ' + e.message);
    } finally {
      setMarking(false);
    }
  }

  // Prev / next within the topic
  const currentIndex = siblings.findIndex(l => l.id === Number(lessonId));
  const prevLesson   = currentIndex > 0 ? siblings[currentIndex - 1] : null;
  const nextLesson   = currentIndex >= 0 && currentIndex < siblings.length - 1 ? siblings[currentIndex + 1] : null;

  const isCompleted = progress?.status === 'completed' || completedIds.has(Number(lessonId));

  // ── Render ──

  if (loading) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-faint)' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam lekciju…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: '#c0392b' }}>
        <p>Greška: {error}</p>
        <button onClick={load} style={btnPrimary}>Pokušaj ponovo</button>
      </div>
    );
  }

  return (
    <div
      className="lesson-protected"
      style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px', userSelect: 'none' }}
    >
      <Watermark label={watermarkLabel} />

      {/* Mobile desktop nudge */}
      {isMobile && !mobileNudgeDismissed && (
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)',
          borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 12, fontSize: 13 }}>
          <span>💻</span>
          <span style={{ flex: 1, color: 'var(--ink-soft)' }}>
            Za bolji doživljaj učenja, preporučamo desktop · <em>For the best study experience, we recommend desktop.</em>
          </span>
          <button
            onClick={() => { localStorage.setItem(MOBILE_NUDGE_KEY, '1'); setMobileNudgeDismissed(true); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, padding: '0 4px', lineHeight: 1 }}
            aria-label="Zatvori"
          >×</button>
        </div>
      )}

      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Link to="/courses" style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 600 }}>Kolegiji</Link>
        <span>›</span>
        <Link to={`/courses/${courseId}`} style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 600 }}>
          {courseTitle || `Kolegij #${courseId}`}
        </Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-soft)' }}>{topicTitle || `Tema #${topicId}`}</span>
        <span>›</span>
        <span style={{ color: 'var(--ink)' }}>{lesson?.title}</span>
      </nav>

      {/* Layout: content + sidebar */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Branded reading canvas — mirrors the editor's WYSIWYG output */}
          <article className="mol-canvas" style={{ margin: '0 0 32px' }}>
            <div className="mol-canvas__header">
              <div className="mol-canvas__brand">
                <MolekulaMark variant="dark" size={28} />
                <span className="mol-canvas__wordmark">Molekula Academy</span>
              </div>
              {topicTitle && <span className="mol-canvas__crumb">{topicTitle}</span>}
            </div>

            <div className="mol-canvas__body">
              <MolekulaMark variant="watermark" size={380} className="mol-canvas__watermark" />
              <div className="mol-canvas__content">

                {/* Lesson header */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                  <DiffBadge difficulty={lesson?.difficulty} />
                  {lesson?.duration_minutes && (
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink-faint)', padding: '2px 10px', border: '1.5px solid var(--line)', borderRadius: 20 }}>
                      ⏱ {lesson.duration_minutes} min
                    </span>
                  )}
                  {isCompleted && (
                    <span style={{ background: '#d4f5f0', color: '#064843', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                      ✓ Završeno
                    </span>
                  )}
                </div>
                <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 'clamp(24px, 4vw, 34px)', color: '#0b343c', lineHeight: 1.2 }}>
                  {lesson?.title}
                </h1>
                {lesson?.summary && (
                  <p style={{ margin: 0, fontSize: 17, color: 'var(--ink-soft)', lineHeight: 1.6 }}>
                    {lesson.summary}
                  </p>
                )}
                {Array.isArray(lesson?.learning_objectives) && lesson.learning_objectives.length > 0 && (
                  <div style={{ marginTop: 16, padding: '14px 18px', background: 'var(--bg)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)' }}>
                    <p style={{ margin: '0 0 8px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
                      Ciljevi učenja · Learning objectives
                    </p>
                    <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.8, fontSize: 15, color: 'var(--ink-soft)' }}>
                      {lesson.learning_objectives.map((obj, i) => <li key={i}>{obj}</li>)}
                    </ul>
                  </div>
                )}

                {/* Divider */}
                <hr style={{ border: 'none', borderTop: '1px solid #e7e3d7', margin: '24px 0' }} />

                {/* Blocks */}
                {blocks.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-faint)' }}>
                    <p style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>Ova lekcija još nema sadržaja.</p>
                  </div>
                ) : (
                  blocks.map(block => <LessonBlock key={block.id} block={block} allBlocks={blocks} />)
                )}
              </div>
            </div>

            <div className="mol-canvas__footer">
              <span>molekula.academy</span>
              <span>© Molekula Academy{topicTitle ? ` · ${topicTitle}` : ''}</span>
            </div>
          </article>

          {/* Private study notes for this lesson (#17) */}
          <LessonNotes lessonId={lessonId} />

          {/* Mark complete + nav */}
          <div style={{ marginTop: 48, paddingTop: 28, borderTop: '1px solid var(--line)' }}>

            {/* Mark as complete */}
            {!isCompleted ? (
              <div style={{ marginBottom: 28, textAlign: 'center' }}>
                <button
                  onClick={handleMarkComplete}
                  disabled={marking}
                  style={{ ...btnPrimary, fontSize: 16, padding: '13px 32px' }}
                >
                  {marking ? 'Spremam…' : '✓ Označi kao završeno'}
                </button>
                <p style={{ margin: '10px 0 0', fontSize: 13, color: 'var(--ink-faint)' }}>
                  Mark as complete
                </p>
              </div>
            ) : (
              <div style={{ marginBottom: 28, textAlign: 'center', padding: '16px 24px', background: 'var(--accent-wash)', borderRadius: 'var(--radius-sm)' }}>
                <p style={{ margin: 0, fontWeight: 700, color: 'var(--accent-ink)', fontSize: 16 }}>
                  ✓ Lekcija završena!
                </p>
                {nextLesson && (
                  <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
                    Nastavi na sljedeću lekciju ↓
                  </p>
                )}
              </div>
            )}

            {/* Post-lesson quiz suggestion */}
            {showQuizPrompt && lesson?.linked_quiz_ids?.length > 0 && (
              <div style={{ marginBottom: 28, padding: '18px 22px',
                background: 'var(--surface)', border: '1.5px solid var(--accent)',
                borderRadius: 'var(--radius-sm)', display: 'flex',
                alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ margin: '0 0 4px', fontWeight: 700, color: 'var(--ink)', fontSize: 15 }}>
                    Provjeri znanje
                  </p>
                  <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-soft)' }}>
                    Uzmi kviz za ovu lekciju i provjeri što si naučio/la.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Link
                    to={`/quizzes/${lesson.linked_quiz_ids[0]}`}
                    style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-block' }}
                  >
                    Uzmi kviz →
                  </Link>
                  <button
                    onClick={() => setShowQuizPrompt(false)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer',
                      color: 'var(--ink-faint)', fontSize: 20, padding: '0 4px', lineHeight: 1 }}
                    aria-label="Zatvori"
                  >×</button>
                </div>
              </div>
            )}

            {/* Prev / Next */}
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              {prevLesson ? (
                <button
                  onClick={() => navigate(`/courses/${courseId}/topics/${topicId}/lessons/${prevLesson.id}`)}
                  style={btnGhost}
                >
                  ← {prevLesson.title}
                </button>
              ) : <div />}
              {nextLesson ? (
                <button
                  onClick={() => navigate(`/courses/${courseId}/topics/${topicId}/lessons/${nextLesson.id}`)}
                  style={btnPrimary}
                >
                  {nextLesson.title} →
                </button>
              ) : (
                <button
                  onClick={() => navigate(`/courses/${courseId}`)}
                  style={btnGhost}
                >
                  ← Natrag na kurs
                </button>
              )}
            </div>
          </div>
        </main>

        {/* ── Sidebar ── */}
        {siblings.length > 1 && (
          <LessonSidebar
            lessons={siblings}
            currentLessonId={lessonId}
            courseId={courseId}
            topicId={topicId}
            completedIds={completedIds}
          />
        )}
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary = {
  background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
  padding: '11px 22px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontWeight: 600, fontSize: 14, fontFamily: 'var(--body)',
  transition: 'background .15s',
};

const btnGhost = {
  background: 'transparent', color: 'var(--ink-soft)',
  border: '1.5px solid var(--line)', padding: '11px 22px',
  borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontWeight: 600, fontSize: 14, fontFamily: 'var(--body)',
  transition: 'border-color .15s, color .15s',
  maxWidth: '45%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
};
