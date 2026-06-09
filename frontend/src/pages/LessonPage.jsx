import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getLesson, getLessonsByTopic, getLessonBlocks,
  getLessonProgress, markLessonProgress,
} from '../api/client';

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
  if (!content?.html && !content?.text) return null;
  return (
    <div
      className="lesson-prose"
      style={{ lineHeight: 1.8, fontSize: 17 }}
      dangerouslySetInnerHTML={{ __html: content.html || `<p>${content.text}</p>` }}
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
        margin: '4px 0',
      }}
    >
      <div ref={ref} />
    </div>
  );
}

function BlockKeypoint({ content }) {
  return (
    <div style={{
      background: 'var(--accent-wash)',
      borderLeft: '4px solid var(--accent)',
      borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
      padding: '16px 20px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <span style={{ fontSize: 20, lineHeight: 1.4 }}>💡</span>
      <p style={{ margin: 0, color: 'var(--accent-ink)', fontWeight: 600, fontSize: 15, lineHeight: 1.6 }}>
        {content?.text || ''}
      </p>
    </div>
  );
}

function BlockSummary({ content }) {
  const items = Array.isArray(content?.items) ? content.items : (content?.text ? [content.text] : []);
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--accent)',
      borderRadius: 'var(--radius-sm)',
      padding: '18px 22px',
    }}>
      <p style={{ margin: '0 0 10px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
        Sažetak · Summary
      </p>
      {items.length > 0 ? (
        <ul style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
          {items.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      ) : (
        <p style={{ margin: 0, color: 'var(--ink-soft)' }}>{content?.text || ''}</p>
      )}
    </div>
  );
}

function BlockImage({ content }) {
  if (!content?.src) return null;
  return (
    <figure style={{ margin: '4px 0', textAlign: 'center' }}>
      <img
        src={content.src}
        alt={content.alt || ''}
        style={{ maxWidth: '100%', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--line)' }}
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
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px dashed var(--line-strong)',
      borderRadius: 'var(--radius-sm)',
      padding: '32px 24px',
      textAlign: 'center',
      color: 'var(--ink-faint)',
    }}>
      <div style={{ fontSize: 40, marginBottom: 8 }}>⚗️</div>
      <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 13 }}>
        Molekula 3D: {content?.smiles || content?.name || '(SMILES nije definiran)'}
      </p>
      <p style={{ margin: '8px 0 0', fontSize: 12 }}>3D prikaz dostupan u sljedećoj verziji</p>
    </div>
  );
}

function LessonBlock({ block }) {
  const { type, content } = block;
  const wrapStyle = { margin: '20px 0' };

  switch (type) {
    case 'text':       return <div style={wrapStyle}><BlockText content={content} /></div>;
    case 'equation':   return <div style={wrapStyle}><BlockEquation content={content} /></div>;
    case 'keypoint':   return <div style={wrapStyle}><BlockKeypoint content={content} /></div>;
    case 'summary':    return <div style={wrapStyle}><BlockSummary content={content} /></div>;
    case 'image':      return <div style={wrapStyle}><BlockImage content={content} /></div>;
    case 'video':      return <div style={wrapStyle}><BlockVideo content={content} /></div>;
    case 'table':      return <div style={wrapStyle}><BlockTable content={content} /></div>;
    case 'flashcard':  return <div style={wrapStyle}><BlockFlashcard content={content} /></div>;
    case 'pdf':        return <div style={wrapStyle}><BlockPdf content={content} /></div>;
    case 'link':       return <div style={wrapStyle}><BlockLink content={content} /></div>;
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

  const [lesson,    setLesson]   = useState(null);
  const [blocks,    setBlocks]   = useState([]);
  const [siblings,  setSiblings] = useState([]);  // all lessons in this topic
  const [progress,  setProgress] = useState(null);
  const [loading,   setLoading]  = useState(true);
  const [error,     setError]    = useState('');
  const [marking,   setMarking]  = useState(false);
  const [completedIds, setCompletedIds] = useState(new Set());

  const startTime = useRef(Date.now());

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [lessonData, blocksData, siblingData] = await Promise.all([
        getLesson(lessonId),
        getLessonBlocks(lessonId),
        getLessonsByTopic(topicId),
      ]);
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
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

      {/* Breadcrumb */}
      <nav style={{ fontSize: 13, color: 'var(--ink-faint)', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Link to="/courses" style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 600 }}>Kolegiji</Link>
        <span>›</span>
        <Link to={`/courses/${courseId}`} style={{ color: 'var(--accent-ink)', textDecoration: 'none', fontWeight: 600 }}>Kurs #{courseId}</Link>
        <span>›</span>
        <span style={{ color: 'var(--ink-soft)' }}>Tema #{topicId}</span>
        <span>›</span>
        <span style={{ color: 'var(--ink)' }}>{lesson?.title}</span>
      </nav>

      {/* Layout: content + sidebar */}
      <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>

        {/* ── Main content ── */}
        <main style={{ flex: 1, minWidth: 0 }}>

          {/* Lesson header */}
          <div style={{ marginBottom: 28 }}>
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
            <h1 style={{ margin: '0 0 10px', fontFamily: 'var(--display)', fontSize: 'clamp(22px, 4vw, 34px)', color: 'var(--ink)', lineHeight: 1.2 }}>
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
          </div>

          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '0 0 24px' }} />

          {/* Blocks */}
          {blocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--ink-faint)' }}>
              <p style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>Ova lekcija još nema sadržaja.</p>
            </div>
          ) : (
            blocks.map(block => <LessonBlock key={block.id} block={block} />)
          )}

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
