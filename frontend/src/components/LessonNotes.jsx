import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { getLessonNote, saveLessonNote } from '../api/client';
import { renderChemHtml } from '../utils/chemText';

// Per-lesson study notes (#17). Private to the student, online-only (no export).
// Free text with inline KaTeX / mhchem support: $…$, $$…$$, \ce{…}, \pu{…}.
// Autosaves on a debounce; the surrounding lesson view has copy/keyboard guards,
// so we stop those events from leaving this editor (a student must be able to
// type, copy and cut inside their own notes).

const AUTOSAVE_MS = 900;

function statusLabel(status) {
  switch (status) {
    case 'saving': return { text: 'Spremam…',                color: 'var(--ink-faint)' };
    case 'saved':  return { text: 'Spremljeno ✓',            color: 'var(--accent-ink)' };
    case 'error':  return { text: 'Greška pri spremanju',    color: '#c0392b' };
    case 'dirty':  return { text: 'Nespremljene promjene',   color: 'var(--ink-faint)' };
    default:       return { text: '',                        color: 'var(--ink-faint)' };
  }
}

export default function LessonNotes({ lessonId }) {
  const [content, setContent] = useState('');
  const [loaded, setLoaded]   = useState(false);
  const [status, setStatus]   = useState('idle'); // idle | dirty | saving | saved | error
  const [tab, setTab]         = useState('write'); // write | preview
  const [katexReady, setKatexReady] = useState(
    () => typeof window !== 'undefined' && Boolean(window.katex)
  );

  const timer      = useRef(null);
  const lastSaved  = useRef('');
  const contentRef = useRef('');           // latest value, for unmount flush
  contentRef.current = content;

  const save = useCallback(async (text) => {
    setStatus('saving');
    try {
      await saveLessonNote(lessonId, text);
      lastSaved.current = text;
      setStatus(s => (contentRef.current === text ? 'saved' : s));
    } catch {
      setStatus('error');
    }
  }, [lessonId]);

  // Load existing note when the lesson changes; flush any pending save on the way out.
  useEffect(() => {
    let alive = true;
    setLoaded(false);
    setStatus('idle');
    getLessonNote(lessonId)
      .then(note => {
        if (!alive) return;
        const c = note?.content || '';
        setContent(c);
        lastSaved.current = c;
        setLoaded(true);
      })
      .catch(() => { if (alive) setLoaded(true); });

    return () => {
      alive = false;
      if (timer.current) clearTimeout(timer.current);
      if (contentRef.current !== lastSaved.current) {
        saveLessonNote(lessonId, contentRef.current).catch(() => {});
      }
    };
  }, [lessonId]);

  // Persist on tab close / refresh too (covers the debounce gap).
  useEffect(() => {
    const flush = () => {
      if (contentRef.current !== lastSaved.current) {
        saveLessonNote(lessonId, contentRef.current).catch(() => {});
      }
    };
    window.addEventListener('beforeunload', flush);
    return () => window.removeEventListener('beforeunload', flush);
  }, [lessonId]);

  // KaTeX loads deferred — flip ready once it's available so the preview renders.
  useEffect(() => {
    if (katexReady || typeof window === 'undefined') return;
    const t = setInterval(() => { if (window.katex) { setKatexReady(true); clearInterval(t); } }, 150);
    return () => clearInterval(t);
  }, [katexReady]);

  function handleChange(e) {
    const text = e.target.value;
    setContent(text);
    setStatus('dirty');
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (text !== lastSaved.current) save(text);
    }, AUTOSAVE_MS);
  }

  // Keep the lesson's content guards from swallowing copy/cut/typing inside notes.
  const stop = e => e.stopPropagation();

  const previewHtml = useMemo(
    () => renderChemHtml(content),
    [content, katexReady]
  );

  const label = statusLabel(status);

  return (
    <section
      style={{
        marginTop: 32,
        border: '1.5px solid var(--line)',
        borderRadius: 'var(--radius)',
        background: 'var(--surface)',
        overflow: 'hidden',
        userSelect: 'text',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
        padding: '12px 18px', borderBottom: '1px solid var(--line)', background: 'var(--bg)',
      }}>
        <span style={{ fontSize: 18 }}>📝</span>
        <div style={{ flex: 1, minWidth: 140 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
            Moje bilješke
          </p>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-faint)' }}>
            My notes · privatne, samo za tebe
          </p>
        </div>

        {/* Write / Preview toggle */}
        <div style={{ display: 'flex', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-pill)', overflow: 'hidden' }}>
          {[['write', 'Uredi'], ['preview', 'Pregled']].map(([key, text]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              style={{
                border: 'none', cursor: 'pointer', padding: '6px 14px', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--body)',
                background: tab === key ? 'var(--accent)' : 'transparent',
                color: tab === key ? 'var(--on-accent)' : 'var(--ink-soft)',
              }}
            >
              {text}
            </button>
          ))}
        </div>

        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: label.color, minWidth: 90, textAlign: 'right' }}>
          {label.text}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: 18 }}>
        {!loaded ? (
          <p style={{ margin: 0, fontFamily: 'var(--mono)', fontSize: 13, color: 'var(--ink-faint)' }}>
            Učitavam bilješke…
          </p>
        ) : tab === 'write' ? (
          <>
            <textarea
              value={content}
              onChange={handleChange}
              onCopy={stop}
              onCut={stop}
              onPaste={stop}
              onContextMenu={stop}
              onKeyDown={stop}
              placeholder="Zapiši svoje bilješke ovdje… Za formule koristi $\ce{H2O}$ ili $$E = mc^2$$."
              spellCheck={false}
              style={{
                width: '100%', minHeight: 180, resize: 'vertical', boxSizing: 'border-box',
                border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)',
                padding: '12px 14px', fontSize: 15, lineHeight: 1.7, color: 'var(--ink)',
                fontFamily: 'var(--mono)', background: 'var(--bg)', outline: 'none',
              }}
            />
            <p style={{ margin: '8px 2px 0', fontSize: 12, color: 'var(--ink-faint)' }}>
              Podržava LaTeX/KaTeX i kemijske formule:{' '}
              <code style={{ fontFamily: 'var(--mono)' }}>$…$</code>,{' '}
              <code style={{ fontFamily: 'var(--mono)' }}>$$…$$</code>,{' '}
              <code style={{ fontFamily: 'var(--mono)' }}>\ce{'{…}'}</code>. Sprema se automatski.
            </p>
          </>
        ) : (
          content.trim() ? (
            <div
              className="lesson-prose"
              style={{ fontSize: 15, lineHeight: 1.8, color: 'var(--ink)', whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-faint)', fontStyle: 'italic' }}>
              Još nema bilješki. Prebaci na „Uredi” da počneš pisati.
            </p>
          )
        )}
      </div>
    </section>
  );
}
