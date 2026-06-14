import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  getLesson, getLessonBlocks, createLessonBlock, updateLessonBlock,
  deleteLessonBlock, reorderLessonBlocks, setBlockVisibility, changeLessonBlockType,
  getSyllabusCodes, getLessonSyllabusTags, setLessonSyllabusTags,
  setLessonStatus, getToken,
} from '../../api/client';
import TiptapEditor from '../../components/TiptapEditor';
import MolekulaMark from '../../components/MolekulaMark';
import SmilesDrawer from 'smiles-drawer';
import './LessonEditorCanvas.css';

// ─── Block type registry ───────────────────────────────────────────────────────

const BLOCK_TYPES = [
  { type: 'heading',    label: 'Naslov',        icon: '𝐇',  group: 'Tekst' },
  { type: 'text',       label: 'Tekst',         icon: '¶',  group: 'Tekst' },
  { type: 'quote',      label: 'Citat',         icon: '❝',  group: 'Tekst' },
  { type: 'callout',    label: 'Ključna točka', icon: '💡', group: 'Tekst' },
  { type: 'warning',    label: 'Upozorenje',    icon: '⚠️', group: 'Tekst' },
  { type: 'summary',    label: 'Sažetak',       icon: '📋', group: 'Tekst' },
  { type: 'divider',    label: 'Razdjelnik',    icon: '—',  group: 'Tekst' },
  { type: 'equation',   label: 'Jednadžba',     icon: '∑',  group: 'Kemija' },
  { type: 'molecule3d', label: 'Molekula 3D',   icon: '⚗️', group: 'Kemija' },
  { type: 'image',      label: 'Slika',         icon: '🖼️', group: 'Mediji' },
  { type: 'gif',        label: 'GIF',           icon: '🎞️', group: 'Mediji' },
  { type: 'video',      label: 'Video',         icon: '🎬', group: 'Mediji' },
  { type: 'table',      label: 'Tablica',       icon: '⊞',  group: 'Podaci' },
  { type: 'graph',      label: 'Graf',          icon: '📈', group: 'Podaci' },
  { type: 'python',     label: 'Python / Kod',  icon: '🐍', group: 'Podaci' },
  { type: 'link',       label: 'Vanjski link',  icon: '🔗', group: 'Linkovi' },
  { type: 'quiz_link',  label: 'Link na kviz',  icon: '🧪', group: 'Linkovi' },
  { type: 'pdf',        label: 'PDF',           icon: '📄', group: 'Linkovi' },
];

const TYPE_MAP = Object.fromEntries(BLOCK_TYPES.map(b => [b.type, b]));

// ─── Signal-block colour system ─────────────────────────────────────────────────
// Colour as a signal, not decoration. Five semantic roles, each a left-accent bar
// + tinted wash + uppercase label. Locked palette (see lesson-editor-redesign memory).
const SIGNAL = {
  callout:  { accent: '#0f8f86', wash: '#e7f4f0', label: '#0f6e56', body: '#0b343c', icon: '💡', title: 'Ključna točka' },
  exam_tip: { accent: '#ba7517', wash: '#faeeda', label: '#854f0b', body: '#412402', icon: '🎓', title: 'Savjet za ispit' },
  warning:  { accent: '#d85a30', wash: '#faece7', label: '#993c1d', body: '#4a1b0c', icon: '⚠️', title: 'Upozorenje / česta greška' },
  summary:  { accent: '#639922', wash: '#eaf3de', label: '#3b6d11', body: '#173404', icon: '📋', title: 'Sažetak' },
};

// ─── Block visibility (R07) ────────────────────────────────────────────────────
// public  → svi vide (i besplatni pregled)
// basic   → vide Basic + Premium pretplatnici
// premium → vide samo Premium pretplatnici
const VIS_ORDER = ['public', 'basic', 'premium'];
const VIS_META = {
  public:  { label: 'Svi',     icon: '🌐', color: '#475569', bg: 'color-mix(in srgb,#475569 8%,transparent)',  border: 'color-mix(in srgb,#475569 28%,transparent)' },
  basic:   { label: 'Basic',   icon: '●',  color: '#1d4ed8', bg: 'color-mix(in srgb,#1d4ed8 9%,transparent)',  border: 'color-mix(in srgb,#1d4ed8 30%,transparent)' },
  premium: { label: 'Premium', icon: '★',  color: '#b45309', bg: 'color-mix(in srgb,#b45309 10%,transparent)', border: 'color-mix(in srgb,#b45309 32%,transparent)' },
};
const nextVisibility = (v) => VIS_ORDER[(VIS_ORDER.indexOf(v) + 1) % VIS_ORDER.length];
// Which plans can see a block of given visibility
const planSees = (visibility, plan) => {
  if (visibility === 'public') return true;
  if (visibility === 'basic')  return plan === 'basic' || plan === 'premium';
  return plan === 'premium';
};

const DEFAULT_CONTENT = {
  heading:    { text: '', level: 2 },
  text:       { html: '' },
  quote:      { text: '', attribution: '' },
  callout:    { text: '' },
  warning:    { text: '' },
  summary:    { items: [''] },
  divider:    {},
  equation:   { latex: '', caption: '' },
  molecule3d: { smiles: '', name: '' },
  image:      { url: '', alt: '', caption: '' },
  gif:        { url: '', alt: '', caption: '' },
  video:      { url: '', caption: '', title: '' },
  table:      { caption: '', headers: ['Stupac 1', 'Stupac 2'], rows: [['', '']] },
  graph:      { type: 'bar', labels: [], datasets: [{ label: '', data: [] }], caption: '' },
  python:     { code: '', caption: '', runtime: 'static' },
  link:       { url: '', title: '', description: '' },
  quiz_link:  { quiz_id: '', label: '', description: '' },
  pdf:        { url: '', label: '' },
};

// ─── Block type conversion (Turn into) ─────────────────────────────────────────
// Pull the plain-text gist out of any block so a conversion can carry it over.
function extractText(type, content = {}) {
  switch (type) {
    case 'text':    return (content.html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    case 'heading':
    case 'quote':
    case 'callout':
    case 'warning': return (content.text || '').trim();
    case 'summary': return (Array.isArray(content.items) ? content.items : []).filter(Boolean).join('\n');
    case 'equation':return (content.latex || '').trim();
    default:        return '';
  }
}

// Build the target block's content when converting, carrying text where it fits.
function convertedContent(fromType, toType, content) {
  const base = JSON.parse(JSON.stringify(DEFAULT_CONTENT[toType] || {}));
  const text = extractText(fromType, content);
  if (!text) return base;
  switch (toType) {
    case 'text':    base.html = `<p>${text.replace(/\n+/g, '</p><p>')}</p>`; break;
    case 'heading':
    case 'quote':
    case 'callout':
    case 'warning': base.text = text.replace(/\n+/g, ' '); break;
    case 'summary': base.items = text.split('\n').filter(Boolean); break;
    case 'equation':base.latex = text; break;
    default: break; // media/link/etc — keep defaults, text doesn't map
  }
  return base;
}

// ─── Auto-save debounce hook ───────────────────────────────────────────────────

function useDebounce(fn, delay) {
  const t = useRef(null);
  return useCallback((...args) => {
    clearTimeout(t.current);
    t.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

// ─── Shared input style ────────────────────────────────────────────────────────

const inp = {
  width: '100%', boxSizing: 'border-box',
  padding: '7px 11px', borderRadius: 7,
  border: '1px solid var(--line)', background: 'var(--bg)',
  color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
};

const Field = ({ label, hint, children }) => (
  <label style={{ display: 'block', marginBottom: 12 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
      {label}{hint && <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--ink-faint)', textTransform: 'none', letterSpacing: 0 }}>{hint}</span>}
    </div>
    {children}
  </label>
);

// ─── SMILES → 2D structure SVG ────────────────────────────────────────────────

function MoleculeCanvas({ smiles, width = 300, height = 220 }) {
  const svgRef = useRef(null);
  const drawer = useRef(null);

  useEffect(() => {
    drawer.current = new SmilesDrawer.SvgDrawer({ width, height });
  }, [width, height]);

  useEffect(() => {
    if (!smiles?.trim() || !svgRef.current || !drawer.current) return;
    SmilesDrawer.parse(
      smiles.trim(),
      tree => drawer.current.draw(tree, svgRef.current, 'light'),
      _err => { if (svgRef.current) svgRef.current.innerHTML = ''; }
    );
  }, [smiles]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      style={{ display: 'block', margin: '0 auto', maxWidth: '100%' }}
    />
  );
}

// ─── Visual block renderers (these ARE the editable content) ───────────────────

function HeadingBlock({ content, onChange }) {
  const sizes = { 1: 36, 2: 28, 3: 22, 4: 17 };
  const sz = sizes[content.level || 2] || 28;
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
      <select
        value={content.level || 2}
        onChange={e => onChange({ ...content, level: Number(e.target.value) })}
        style={{ fontSize: 11, color: 'var(--ink-faint)', border: '1px solid var(--line)', borderRadius: 5, background: 'var(--bg)', cursor: 'pointer', padding: '2px 5px', flexShrink: 0, outline: 'none' }}
      >
        {[1,2,3,4].map(l => <option key={l} value={l}>H{l}</option>)}
      </select>
      <input
        value={content.text || ''}
        onChange={e => onChange({ ...content, text: e.target.value })}
        placeholder="Naslov…"
        style={{
          flex: 1, border: 'none', outline: 'none', background: 'transparent',
          fontSize: sz, fontWeight: 800, fontFamily: 'var(--display)', color: 'var(--ink)',
          padding: 0, lineHeight: 1.2,
        }}
      />
    </div>
  );
}

function TextBlock({ content, onChange }) {
  return (
    <TiptapEditor
      value={content.html || ''}
      onChange={html => onChange({ ...content, html })}
      placeholder="Počni pisati sadržaj lekcije…"
      minHeight={80}
    />
  );
}

function QuoteBlock({ content, onChange }) {
  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [content.text]);
  return (
    <div style={{ borderLeft: '4px solid var(--accent)', paddingLeft: 18, paddingTop: 4, paddingBottom: 4 }}>
      <textarea
        ref={taRef}
        value={content.text || ''}
        onChange={e => onChange({ ...content, text: e.target.value })}
        placeholder="Tekst citata…"
        rows={2}
        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: 17, fontStyle: 'italic', color: 'var(--ink)', fontFamily: 'var(--display)', lineHeight: 1.6, overflow: 'hidden', boxSizing: 'border-box' }}
      />
      <input
        value={content.attribution || ''}
        onChange={e => onChange({ ...content, attribution: e.target.value })}
        placeholder="— Atribucija (neobavezno)"
        style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--ink-soft)', fontFamily: 'inherit', width: '100%', marginTop: 4 }}
      />
    </div>
  );
}

function CalloutBlock({ content, onChange }) {
  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.style.height = taRef.current.scrollHeight + 'px'; }
  }, [content.text]);
  const s = SIGNAL.callout;
  return (
    <div style={{ borderLeft: `3px solid ${s.accent}`, background: s.wash, borderRadius: '0 10px 10px 0', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: s.label, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
        <span>{s.icon}</span> {s.title}
      </div>
      <textarea
        ref={taRef}
        value={content.text || ''}
        onChange={e => onChange({ ...content, text: e.target.value })}
        placeholder="Ključna točka…"
        rows={2}
        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: 15, color: s.body, fontFamily: 'inherit', lineHeight: 1.6, overflow: 'hidden', boxSizing: 'border-box' }}
      />
    </div>
  );
}

function WarningBlock({ content, onChange }) {
  const taRef = useRef(null);
  useEffect(() => {
    if (taRef.current) { taRef.current.style.height = 'auto'; taRef.current.style.height = taRef.current.scrollHeight + 'px'; }
  }, [content.text]);
  const s = SIGNAL.warning;
  return (
    <div style={{ borderLeft: `3px solid ${s.accent}`, background: s.wash, borderRadius: '0 10px 10px 0', padding: '12px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: s.label, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>
        <span>{s.icon}</span> {s.title}
      </div>
      <textarea
        ref={taRef}
        value={content.text || ''}
        onChange={e => onChange({ ...content, text: e.target.value })}
        placeholder="Upozorenje…"
        rows={2}
        style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', resize: 'none', fontSize: 15, color: s.body, fontFamily: 'inherit', lineHeight: 1.6, overflow: 'hidden', boxSizing: 'border-box' }}
      />
    </div>
  );
}

function SummaryBlock({ content, onChange }) {
  const items = Array.isArray(content.items) ? content.items : [''];
  const inputRefs = useRef([]);

  function setItem(i, v) {
    onChange({ ...content, items: items.map((x, j) => j === i ? v : x) });
  }
  function handleKey(e, i) {
    if (e.key === 'Enter') {
      e.preventDefault();
      const next = [...items.slice(0, i + 1), '', ...items.slice(i + 1)];
      onChange({ ...content, items: next });
      setTimeout(() => inputRefs.current[i + 1]?.focus(), 0);
    }
    if (e.key === 'Backspace' && !items[i] && items.length > 1) {
      e.preventDefault();
      onChange({ ...content, items: items.filter((_, j) => j !== i) });
      setTimeout(() => inputRefs.current[Math.max(0, i - 1)]?.focus(), 0);
    }
  }

  const s = SIGNAL.summary;
  return (
    <div style={{ borderLeft: `3px solid ${s.accent}`, background: s.wash, borderRadius: '0 10px 10px 0', padding: '14px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: s.label, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>
        <span>{s.icon}</span> {s.title}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ color: s.accent, fontWeight: 700, fontSize: 16, flexShrink: 0 }}>•</span>
          <input
            ref={el => inputRefs.current[i] = el}
            value={item}
            onChange={e => setItem(i, e.target.value)}
            onKeyDown={e => handleKey(e, i)}
            placeholder={`Stavka ${i + 1}…`}
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 15, color: 'var(--ink)', fontFamily: 'inherit' }}
          />
          {items.length > 1 && (
            <button type="button" onClick={() => onChange({ ...content, items: items.filter((_, j) => j !== i) })}
              style={{ background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', opacity: 0.5, lineHeight: 1 }}>✕</button>
          )}
        </div>
      ))}
      <button type="button" onClick={() => { onChange({ ...content, items: [...items, ''] }); setTimeout(() => inputRefs.current[items.length]?.focus(), 0); }}
        style={{ marginTop: 4, background: 'none', border: 'none', color: 'var(--ink-faint)', cursor: 'pointer', fontSize: 13, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}>
        + Dodaj stavku
      </button>
    </div>
  );
}

function renderKatex(latex, el) {
  if (!el || !latex) return;
  const go = () => {
    try { window.katex.render(latex, el, { throwOnError: false, displayMode: true }); }
    catch { el.textContent = latex; }
  };
  if (window.katex) go();
  else window.addEventListener('load', go, { once: true });
}

function EquationBlock({ content, onChange }) {
  const [editing, setEditing] = useState(!content.latex);
  const previewRef = useRef(null);
  const liveRef    = useRef(null);

  // Full-size preview (display mode)
  useEffect(() => {
    if (!editing) renderKatex(content.latex, previewRef.current);
  }, [content.latex, editing]);

  // Live preview while editing
  useEffect(() => {
    if (editing) renderKatex(content.latex, liveRef.current);
  }, [content.latex, editing]);

  if (editing) {
    return (
      <div style={{ border: '1.5px solid var(--accent)', borderRadius: 10, padding: 16, background: 'var(--bg)' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', marginBottom: 8, fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>∑ LaTeX jednadžba</div>
        <textarea
          autoFocus
          style={{ ...inp, minHeight: 72, resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 13 }}
          value={content.latex || ''}
          onChange={e => onChange({ ...content, latex: e.target.value })}
          placeholder="\ce{H2SO4 + 2NaOH -> Na2SO4 + 2H2O}"
          spellCheck={false}
        />
        <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 6, fontFamily: 'var(--mono)', lineHeight: 1.7 }}>
          {'Kemija: \\ce{H2SO4} · Reakcija: \\ce{A -> B} · Ekvilibrij: \\ce{A <=> B}'}<br/>
          {'Matematika: E=mc^2 · Razlomak: \\frac{1}{2} · Integral: \\int_a^b f(x)\\,dx'}
        </div>
        <input
          style={{ ...inp, marginTop: 8 }}
          value={content.caption || ''}
          onChange={e => onChange({ ...content, caption: e.target.value })}
          placeholder="Opis jednadžbe (neobavezno)"
        />
        {content.latex && (
          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '14px 20px', marginTop: 10, textAlign: 'center', overflowX: 'auto' }}>
            <div ref={liveRef} />
          </div>
        )}
        <button type="button" onClick={() => setEditing(false)}
          style={{ marginTop: 10, padding: '7px 18px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          ✓ Gotovo
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{ textAlign: 'center', padding: '20px 16px', cursor: 'text', border: '1px solid var(--line)', borderRadius: 10, background: 'var(--surface)' }}
      title="Klikni za uređivanje"
    >
      {content.latex
        ? <div ref={previewRef} style={{ overflowX: 'auto' }} />
        : <span style={{ color: 'var(--ink-faint)', fontSize: 15 }}>Klikni za unos LaTeX jednadžbe…</span>}
      {content.caption && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 10 }}>{content.caption}</div>}
    </div>
  );
}

function DividerBlock() {
  return <hr style={{ border: 'none', borderTop: '2px solid var(--line)', margin: '8px 0' }} />;
}

// ─── Table block (inline editing) ─────────────────────────────────────────────

function TableBlock({ content, onChange }) {
  const headers = content.headers || [''];
  const rows    = content.rows    || [['']];

  function setCell(ri, ci, val) {
    onChange({ ...content, rows: rows.map((r, i) => i === ri ? r.map((c, j) => j === ci ? val : c) : r) });
  }
  function setHeader(ci, val) {
    onChange({ ...content, headers: headers.map((h, i) => i === ci ? val : h) });
  }

  const cellS = { border: '1px solid var(--line)', padding: '6px 10px', minWidth: 80, fontSize: 14 };
  const editInp = { border: 'none', outline: 'none', background: 'transparent', fontSize: 'inherit', color: 'var(--ink)', fontFamily: 'inherit', width: '100%', boxSizing: 'border-box' };

  return (
    <div>
      {content.caption && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 8, fontStyle: 'italic' }}>{content.caption}</div>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--surface)' }}>
              {headers.map((h, ci) => (
                <th key={ci} style={{ ...cellS, fontWeight: 700 }}>
                  <input value={h} onChange={e => setHeader(ci, e.target.value)} style={{ ...editInp, fontWeight: 700 }} placeholder={`Stupac ${ci + 1}`} />
                </th>
              ))}
              <th style={{ ...cellS, width: 32 }}>
                <button type="button" onClick={() => onChange({ ...content, headers: [...headers, ''], rows: rows.map(r => [...r, '']) })}
                  style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 5, padding: '2px 7px', cursor: 'pointer', fontSize: 12 }}>+</button>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} style={{ background: ri % 2 === 0 ? 'var(--bg)' : 'var(--surface)' }}>
                {headers.map((_, ci) => (
                  <td key={ci} style={cellS}>
                    <input value={row[ci] ?? ''} onChange={e => setCell(ri, ci, e.target.value)} style={editInp} />
                  </td>
                ))}
                <td style={{ ...cellS, width: 32 }}>
                  <button type="button" onClick={() => onChange({ ...content, rows: rows.filter((_, i) => i !== ri) })}
                    style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={() => onChange({ ...content, rows: [...rows, headers.map(() => '')] })}
          style={{ padding: '5px 12px', border: '1px dashed var(--line)', borderRadius: 7, background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13 }}>+ Dodaj red</button>
        {headers.length > 1 && (
          <button type="button" onClick={() => onChange({ ...content, headers: headers.slice(0, -1), rows: rows.map(r => r.slice(0, -1)) })}
            style={{ padding: '5px 12px', border: '1px dashed var(--line)', borderRadius: 7, background: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 13 }}>− Ukloni zadnji stupac</button>
        )}
      </div>
    </div>
  );
}

// ─── Settings panel for media / complex blocks ─────────────────────────────────

function MediaSettings({ type, content, onChange }) {
  switch (type) {
    case 'molecule3d':
      return (
        <>
          <Field label="SMILES notacija" hint="npr. CCO (etanol) · c1ccccc1 (benzen) · CC(=O)O (octena kiselina)">
            <input style={{ ...inp, fontFamily: 'var(--mono)' }} value={content.smiles || ''} onChange={e => onChange({ ...content, smiles: e.target.value })} placeholder="C(C(=O)O)N" />
          </Field>
          {content.smiles && (
            <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '10px', marginBottom: 12, textAlign: 'center' }}>
              <MoleculeCanvas smiles={content.smiles} width={260} height={180} />
            </div>
          )}
          <Field label="Ime molekule">
            <input style={inp} value={content.name || ''} onChange={e => onChange({ ...content, name: e.target.value })} placeholder="npr. Glicin" />
          </Field>
        </>
      );

    case 'image':
    case 'gif':
      return (
        <>
          <Field label="URL slike">
            <input style={inp} value={content.url || ''} onChange={e => onChange({ ...content, url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Alt tekst" hint="Za pristupačnost">
            <input style={inp} value={content.alt || ''} onChange={e => onChange({ ...content, alt: e.target.value })} placeholder="Kratak opis slike" />
          </Field>
          <Field label="Opis slike (neobavezno)">
            <input style={inp} value={content.caption || ''} onChange={e => onChange({ ...content, caption: e.target.value })} placeholder="npr. Kristalna struktura NaCl" />
          </Field>
        </>
      );

    case 'video':
      return (
        <>
          <Field label="URL videa" hint="YouTube, Vimeo ili MP4">
            <input style={inp} value={content.url || ''} onChange={e => onChange({ ...content, url: e.target.value })} placeholder="https://www.youtube.com/watch?v=…" />
          </Field>
          <Field label="Naslov videa">
            <input style={inp} value={content.title || ''} onChange={e => onChange({ ...content, title: e.target.value })} placeholder="npr. Uvod u elektrokemiju" />
          </Field>
          <Field label="Opis (neobavezno)">
            <input style={inp} value={content.caption || ''} onChange={e => onChange({ ...content, caption: e.target.value })} placeholder="Kratki opis sadržaja" />
          </Field>
        </>
      );

    case 'graph':
      return (
        <>
          <Field label="Vrsta grafa">
            <select style={inp} value={content.type || 'bar'} onChange={e => onChange({ ...content, type: e.target.value })}>
              <option value="bar">Stupčasti (Bar)</option>
              <option value="line">Linijski (Line)</option>
              <option value="pie">Kružni (Pie)</option>
              <option value="scatter">Raspršeni (Scatter)</option>
            </select>
          </Field>
          <Field label="Oznake osi X" hint="Odvojite zarezom">
            <input style={inp} value={(content.labels || []).join(', ')} onChange={e => onChange({ ...content, labels: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="0°C, 25°C, 50°C, 100°C" />
          </Field>
          <Field label="Podaci" hint="Odvojite zarezom">
            <input style={inp} value={(content.datasets?.[0]?.data || []).join(', ')} onChange={e => {
              const data = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(x => !isNaN(x));
              onChange({ ...content, datasets: [{ ...(content.datasets?.[0] || {}), data }] });
            }} placeholder="0, 18, 36, 100" />
          </Field>
          <Field label="Naziv serije">
            <input style={inp} value={content.datasets?.[0]?.label || ''} onChange={e => onChange({ ...content, datasets: [{ ...(content.datasets?.[0] || {}), label: e.target.value }] })} placeholder="Topivost (g/100mL)" />
          </Field>
          <Field label="Opis grafa (neobavezno)">
            <input style={inp} value={content.caption || ''} onChange={e => onChange({ ...content, caption: e.target.value })} />
          </Field>
        </>
      );

    case 'python':
      return (
        <>
          <Field label="Python kod">
            <textarea style={{ ...inp, minHeight: 140, resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 13 }} value={content.code || ''} onChange={e => onChange({ ...content, code: e.target.value })} spellCheck={false} />
          </Field>
          <Field label="Vrsta prikaza">
            <select style={inp} value={content.runtime || 'static'} onChange={e => onChange({ ...content, runtime: e.target.value })}>
              <option value="static">Statični prikaz koda</option>
              <option value="embed">Embed (Trinket / Replit)</option>
              <option value="pyodide">Interaktivno (Pyodide)</option>
            </select>
          </Field>
          {content.runtime === 'embed' && (
            <Field label="Embed URL">
              <input style={inp} value={content.embed_url || ''} onChange={e => onChange({ ...content, embed_url: e.target.value })} placeholder="https://trinket.io/embed/…" />
            </Field>
          )}
          <Field label="Opis (neobavezno)">
            <input style={inp} value={content.caption || ''} onChange={e => onChange({ ...content, caption: e.target.value })} />
          </Field>
        </>
      );

    case 'link':
      return (
        <>
          <Field label="URL">
            <input style={inp} value={content.url || ''} onChange={e => onChange({ ...content, url: e.target.value })} placeholder="https://…" />
          </Field>
          <Field label="Naslov linka">
            <input style={inp} value={content.title || ''} onChange={e => onChange({ ...content, title: e.target.value })} placeholder="npr. Wikipedia: Periodni sustav" />
          </Field>
          <Field label="Opis (neobavezno)">
            <input style={inp} value={content.description || ''} onChange={e => onChange({ ...content, description: e.target.value })} />
          </Field>
        </>
      );

    case 'quiz_link':
      return (
        <>
          <Field label="ID kviza">
            <input style={{ ...inp, fontFamily: 'var(--mono)' }} value={content.quiz_id || ''} onChange={e => onChange({ ...content, quiz_id: e.target.value })} placeholder="42" />
          </Field>
          <Field label="Naziv kviza">
            <input style={inp} value={content.label || ''} onChange={e => onChange({ ...content, label: e.target.value })} placeholder="Kviz: Kiseline i baze" />
          </Field>
          <Field label="Opis (neobavezno)">
            <input style={inp} value={content.description || ''} onChange={e => onChange({ ...content, description: e.target.value })} />
          </Field>
        </>
      );

    case 'pdf':
      return (
        <>
          <Field label="URL PDF-a">
            <input style={inp} value={content.url || ''} onChange={e => onChange({ ...content, url: e.target.value })} placeholder="https://…/dokument.pdf" />
          </Field>
          <Field label="Naziv">
            <input style={inp} value={content.label || ''} onChange={e => onChange({ ...content, label: e.target.value })} placeholder="npr. Radni list: Elektrokemija" />
          </Field>
        </>
      );

    default:
      return null;
  }
}

// ─── Visual previews for media blocks ─────────────────────────────────────────

function MediaPreview({ type, content, onOpenSettings }) {
  const bt = TYPE_MAP[type] || {};

  switch (type) {
    case 'image':
    case 'gif':
      if (content.url) {
        return (
          <div style={{ textAlign: 'center' }}>
            <img src={content.url} alt={content.alt || ''} style={{ maxWidth: '100%', borderRadius: 10, border: '1.5px solid var(--line)', display: 'block', margin: '0 auto' }} />
            {content.caption && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8, fontStyle: 'italic' }}>{content.caption}</div>}
          </div>
        );
      }
      return (
        <button type="button" onClick={onOpenSettings} style={{ width: '100%', padding: '40px 20px', border: '2px dashed var(--line)', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-faint)', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{bt.icon}</div>
          <div style={{ fontSize: 14 }}>Klikni za dodavanje {type === 'gif' ? 'GIF-a' : 'slike'}</div>
        </button>
      );

    case 'video':
      if (content.url) {
        const isYT = content.url.includes('youtube') || content.url.includes('youtu.be');
        const ytId = isYT ? (content.url.match(/(?:v=|youtu\.be\/)([^&?/]+)/)?.[1]) : null;
        return (
          <div>
            {ytId ? (
              <div style={{ position: 'relative', paddingTop: '56.25%', borderRadius: 10, overflow: 'hidden', border: '1.5px solid var(--line)' }}>
                <iframe src={`https://www.youtube.com/embed/${ytId}`} title={content.title || 'Video'} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                  style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} />
              </div>
            ) : (
              <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 10, padding: '16px 20px', fontSize: 14, color: 'var(--ink-soft)' }}>
                🎬 <a href={content.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-ink)' }}>{content.title || content.url}</a>
              </div>
            )}
            {content.caption && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8, fontStyle: 'italic' }}>{content.caption}</div>}
          </div>
        );
      }
      return (
        <button type="button" onClick={onOpenSettings} style={{ width: '100%', padding: '40px 20px', border: '2px dashed var(--line)', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-faint)', textAlign: 'center' }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🎬</div>
          <div style={{ fontSize: 14 }}>Klikni za dodavanje videa</div>
        </button>
      );

    case 'molecule3d':
      if (content.smiles) {
        return (
          <div style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1.5px solid color-mix(in srgb, var(--accent) 25%, transparent)', borderRadius: 10, padding: '16px 24px', textAlign: 'center' }}>
            {content.name && <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 8 }}>{content.name}</div>}
            <MoleculeCanvas smiles={content.smiles} width={320} height={220} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', marginTop: 6 }}>{content.smiles}</div>
          </div>
        );
      }
      return (
        <div style={{ background: 'color-mix(in srgb, var(--accent) 8%, transparent)', border: '1.5px dashed color-mix(in srgb, var(--accent) 35%, transparent)', borderRadius: 10, padding: '32px 24px', textAlign: 'center', cursor: 'pointer' }} onClick={onOpenSettings}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>⚗️</div>
          <div style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Klikni ⚙ za unos SMILES notacije molekule</div>
        </div>
      );

    case 'python':
      if (content.code) {
        return (
          <div>
            <pre style={{ background: 'color-mix(in srgb, var(--ink) 6%, transparent)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px', overflowX: 'auto', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.6, margin: 0, color: 'var(--ink)' }}>
              <code>{content.code}</code>
            </pre>
            {content.caption && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8, fontStyle: 'italic' }}>{content.caption}</div>}
          </div>
        );
      }
      return (
        <button type="button" onClick={onOpenSettings} style={{ width: '100%', padding: '32px 20px', border: '2px dashed var(--line)', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-faint)', textAlign: 'center' }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🐍</div>
          <div style={{ fontSize: 14 }}>Klikni za dodavanje Python koda</div>
        </button>
      );

    case 'link':
      if (content.url || content.title) {
        return (
          <div style={{ border: '1.5px solid var(--line)', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface)' }}>
            <span style={{ fontSize: 22, flexShrink: 0 }}>🔗</span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{content.title || content.url}</div>
              {content.description && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{content.description}</div>}
              {content.url && <div style={{ fontSize: 12, color: 'var(--accent-ink)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{content.url}</div>}
            </div>
          </div>
        );
      }
      return (
        <button type="button" onClick={onOpenSettings} style={{ width: '100%', padding: '24px 20px', border: '2px dashed var(--line)', borderRadius: 10, background: 'var(--surface)', cursor: 'pointer', color: 'var(--ink-faint)', textAlign: 'center', fontSize: 14 }}>
          🔗 Klikni za dodavanje linka
        </button>
      );

    case 'quiz_link':
      return (
        <div style={{ background: 'color-mix(in srgb, #8b5cf6 10%, transparent)', border: '1.5px solid color-mix(in srgb, #8b5cf6 30%, transparent)', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>🧪</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{content.label || 'Kviz'}</div>
            {content.description && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{content.description}</div>}
            {content.quiz_id && <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginTop: 2 }}>ID: {content.quiz_id}</div>}
          </div>
        </div>
      );

    case 'pdf':
      return (
        <div style={{ border: '1.5px solid var(--line)', borderRadius: 10, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface)' }}>
          <span style={{ fontSize: 24, flexShrink: 0 }}>📄</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{content.label || 'PDF dokument'}</div>
            {content.url && <div style={{ fontSize: 12, color: 'var(--accent-ink)', marginTop: 2 }}>{content.url}</div>}
          </div>
        </div>
      );

    case 'graph':
      return (
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 10, padding: '20px', textAlign: 'center' }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📈</div>
          <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>
            {content.caption || `${content.type || 'Bar'} graf`}
          </div>
          {content.datasets?.[0]?.label && <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 4 }}>{content.datasets[0].label}</div>}
        </div>
      );

    default:
      return (
        <div style={{ padding: '20px', border: '1px dashed var(--line)', borderRadius: 10, color: 'var(--ink-faint)', fontSize: 14 }}>
          {bt.icon} {bt.label || type}
        </div>
      );
  }
}

// ─── Block search (slash menu) ─────────────────────────────────────────────────
// Bilingual match: HR label, EN-ish type id, and group name.
function filterBlockTypes(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return BLOCK_TYPES;
  return BLOCK_TYPES.filter(b =>
    b.label.toLowerCase().includes(q) ||
    b.type.toLowerCase().includes(q) ||
    b.group.toLowerCase().includes(q)
  );
}

// One result row used by both the modal picker and the inline slash menu.
function BlockResultRow({ bt, active, onPick, onHover }) {
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={() => onPick(bt.type)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
        padding: '8px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
        background: active ? 'var(--accent-wash)' : 'transparent',
        color: 'var(--ink)', fontSize: 14, fontWeight: 500, fontFamily: 'inherit',
      }}
    >
      <span style={{ fontSize: 18, width: 22, textAlign: 'center', flexShrink: 0 }}>{bt.icon}</span>
      <span style={{ flex: 1 }}>{bt.label}</span>
      <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{bt.group}</span>
    </button>
  );
}

// Filterable, keyboard-navigable list. Parent owns query + active index.
function BlockResultsList({ query, activeIdx, setActiveIdx, onPick }) {
  const results = filterBlockTypes(query);
  if (results.length === 0) {
    return <div style={{ padding: '14px 12px', color: 'var(--ink-faint)', fontSize: 13, fontFamily: 'var(--mono)' }}>Nema rezultata za “{query}”</div>;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      {results.map((bt, i) => (
        <BlockResultRow key={bt.type} bt={bt} active={i === activeIdx}
          onHover={() => setActiveIdx(i)} onPick={onPick} />
      ))}
    </div>
  );
}

// ─── Block picker modal (top-bar "+ Dodaj blok") ───────────────────────────────

function BlockPicker({ onPick, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const results = filterBlockTypes(query);

  useEffect(() => { setActiveIdx(0); }, [query]);

  function handleKey(e) {
    const n = results.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, n - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[activeIdx]) { onPick(results[activeIdx].type); onClose(); } }
    else if (e.key === 'Escape') { onClose(); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '12vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', width: 460, maxWidth: 'calc(100vw - 32px)', maxHeight: '70vh', overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,.22)', display: 'flex', flexDirection: 'column' }}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Traži blok… (npr. naslov, slika, jednadžba)"
          style={{ border: 'none', borderBottom: '1px solid var(--line)', outline: 'none', padding: '14px 18px', fontSize: 15, fontFamily: 'inherit', color: 'var(--ink)', background: 'transparent' }}
        />
        <div style={{ overflowY: 'auto', padding: 8 }}>
          <BlockResultsList query={query} activeIdx={activeIdx} setActiveIdx={setActiveIdx}
            onPick={t => { onPick(t); onClose(); }} />
        </div>
      </div>
    </div>
  );
}

// ─── Block handle menu (Notion ⠿) ──────────────────────────────────────────────
// Opens from the left drag handle: Turn into / Duplicate / Visibility / Move / Delete.

function MenuRow({ icon, label, hint, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', textAlign: 'left',
        padding: '8px 12px', border: 'none', borderRadius: 8, cursor: 'pointer',
        background: 'transparent', color: danger ? '#dc2626' : 'var(--ink)', fontSize: 14, fontFamily: 'inherit',
      }}
      onMouseEnter={e => e.currentTarget.style.background = danger ? 'color-mix(in srgb,#ef4444 10%,transparent)' : 'var(--accent-wash)'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {hint && <span style={{ fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>{hint}</span>}
    </button>
  );
}

function BlockHandleMenu({ block, onChangeType, onDuplicate, onMove, onSetVisibility, onDelete, onClose }) {
  const [view, setView] = useState('root'); // root | turn | vis
  const menu = {
    position: 'absolute', top: 28, left: 0, zIndex: 80, width: 240, maxHeight: 360, overflowY: 'auto',
    background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
    boxShadow: '0 16px 48px rgba(11,52,60,.20)', padding: 6,
  };

  return (
    <>
      {/* click-catcher */}
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 79 }} />
      <div style={menu} onClick={e => e.stopPropagation()}>
        {view === 'root' && (
          <>
            <MenuRow icon="🔄" label="Pretvori u…" hint="▸" onClick={() => setView('turn')} />
            <MenuRow icon="⧉" label="Dupliciraj" onClick={() => { onDuplicate(); onClose(); }} />
            <MenuRow icon="👁" label="Vidljivost…" hint={VIS_META[block.visibility || 'public'].label} onClick={() => setView('vis')} />
            <div style={{ height: 1, background: 'var(--line)', margin: '4px 6px' }} />
            <MenuRow icon="↑" label="Pomakni gore" onClick={() => { onMove(-1); onClose(); }} />
            <MenuRow icon="↓" label="Pomakni dolje" onClick={() => { onMove(1); onClose(); }} />
            <div style={{ height: 1, background: 'var(--line)', margin: '4px 6px' }} />
            <MenuRow icon="🗑" label="Obriši blok" danger onClick={() => { onDelete(); onClose(); }} />
          </>
        )}
        {view === 'turn' && (
          <>
            <MenuRow icon="←" label="Natrag" onClick={() => setView('root')} />
            <div style={{ height: 1, background: 'var(--line)', margin: '4px 6px' }} />
            {BLOCK_TYPES.map(bt => (
              <MenuRow
                key={bt.type}
                icon={bt.icon}
                label={bt.label}
                hint={bt.type === block.type ? '✓' : bt.group}
                onClick={() => { if (bt.type !== block.type) onChangeType(bt.type); onClose(); }}
              />
            ))}
          </>
        )}
        {view === 'vis' && (
          <>
            <MenuRow icon="←" label="Natrag" onClick={() => setView('root')} />
            <div style={{ height: 1, background: 'var(--line)', margin: '4px 6px' }} />
            {VIS_ORDER.map(v => {
              const m = VIS_META[v];
              return (
                <MenuRow
                  key={v}
                  icon={m.icon}
                  label={m.label}
                  hint={(block.visibility || 'public') === v ? '✓' : ''}
                  onClick={() => { onSetVisibility(v); onClose(); }}
                />
              );
            })}
          </>
        )}
      </div>
    </>
  );
}

// ─── Notion-style block wrapper ────────────────────────────────────────────────

// Blocks that render a visual preview and need a settings panel
const MEDIA_TYPES = new Set(['molecule3d', 'image', 'gif', 'video', 'graph', 'python', 'link', 'quiz_link', 'pdf', 'graph']);
// Blocks that are always directly editable (no settings needed)
const INLINE_TYPES = new Set(['heading', 'text', 'quote', 'callout', 'warning', 'summary', 'equation', 'divider', 'table']);

function NotionBlock({ block, onUpdate, onDelete, onSetVisibility, onChangeType, onDuplicate, onMove, dragAttributes, dragListeners, isDragging, nodeRef, dndStyle }) {
  const [draft, setDraft]               = useState(block.content || {});
  const [showSettings, setShowSettings] = useState(false);
  const [isHovered, setIsHovered]       = useState(false);
  const [menuOpen, setMenuOpen]         = useState(false);
  const [saving, setSaving]             = useState(false);
  const saveTimer                       = useRef(null);
  const bt                              = TYPE_MAP[block.type] || {};

  // Sync if block changes externally (e.g. after API save returns updated block)
  useEffect(() => {
    setDraft(block.content || {});
  }, [block.id]);

  // Auto-open settings for empty media blocks
  useEffect(() => {
    const c = block.content || {};
    if (MEDIA_TYPES.has(block.type) && !c.url && !c.smiles && !c.code && !c.quiz_id && !c.label) {
      setShowSettings(true);
    }
  }, [block.id]);

  function handleChange(newContent) {
    setDraft(newContent);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try { await onUpdate(newContent); }
      finally { setSaving(false); }
    }, 700);
  }

  const isMedia = MEDIA_TYPES.has(block.type);

  return (
    <div
      ref={nodeRef}
      style={{ position: 'relative', marginBottom: 4, ...dndStyle, opacity: isDragging ? 0.4 : 1 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left controls: fills the whole gutter so the hover zone is continuous
          (no dead gap where the handle would vanish before you reach it). */}
      <div style={{
        position: 'absolute', left: -44, top: 0, bottom: 0, width: 44,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start',
        paddingTop: 6, paddingRight: 4,
        opacity: isHovered || menuOpen ? 1 : 0, transition: 'opacity .15s',
        pointerEvents: isHovered || menuOpen ? 'auto' : 'none',
      }}>
        <button
          {...dragAttributes}
          {...dragListeners}
          onClick={() => setMenuOpen(o => !o)}
          title="Klikni za izbornik · povuci za premještanje"
          style={{ background: menuOpen ? 'var(--accent-wash)' : 'none', border: 'none', cursor: isDragging ? 'grabbing' : 'grab', color: 'var(--ink-faint)', fontSize: 16, padding: '4px 6px', borderRadius: 6, lineHeight: 1 }}
        >⠿</button>
      </div>

      {menuOpen && (
        <BlockHandleMenu
          block={block}
          onChangeType={onChangeType}
          onDuplicate={onDuplicate}
          onMove={onMove}
          onSetVisibility={onSetVisibility}
          onDelete={onDelete}
          onClose={() => setMenuOpen(false)}
        />
      )}

      {/* Block content */}
      <div style={{
        borderRadius: 10,
        padding: block.type === 'text' ? 0 : (block.type === 'divider' ? '4px 0' : '6px 8px'),
        background: block.type === 'text' ? 'transparent' : 'transparent',
        outline: isHovered && block.type !== 'text' ? '2px solid color-mix(in srgb, var(--accent) 20%, transparent)' : '2px solid transparent',
        transition: 'outline-color .15s',
        position: 'relative',
      }}>
        {/* Block type label (top-left, on hover) */}
        {isHovered && block.type !== 'text' && (
          <div style={{ position: 'absolute', top: -18, left: 4, fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', pointerEvents: 'none' }}>
            {bt.icon} {bt.label}
          </div>
        )}

        {/* Render the block */}
        {isMedia ? (
          <MediaPreview type={block.type} content={draft} onOpenSettings={() => setShowSettings(true)} />
        ) : block.type === 'table' ? (
          <TableBlock content={draft} onChange={handleChange} />
        ) : block.type === 'heading' ? (
          <HeadingBlock content={draft} onChange={handleChange} />
        ) : block.type === 'text' ? (
          <TextBlock content={draft} onChange={handleChange} />
        ) : block.type === 'quote' ? (
          <QuoteBlock content={draft} onChange={handleChange} />
        ) : block.type === 'callout' ? (
          <CalloutBlock content={draft} onChange={handleChange} />
        ) : block.type === 'warning' ? (
          <WarningBlock content={draft} onChange={handleChange} />
        ) : block.type === 'summary' ? (
          <SummaryBlock content={draft} onChange={handleChange} />
        ) : block.type === 'equation' ? (
          <EquationBlock content={draft} onChange={handleChange} />
        ) : block.type === 'divider' ? (
          <DividerBlock />
        ) : null}
      </div>

      {/* Block toolbar: visibility + settings + delete — hover, top-right, inside the canvas */}
      <div style={{
        position: 'absolute', right: 4, top: -14, zIndex: 5,
        display: 'flex', alignItems: 'center', gap: 5,
        opacity: isHovered ? 1 : 0, transition: 'opacity .15s',
        pointerEvents: isHovered ? 'auto' : 'none',
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 9,
        padding: '3px 5px', boxShadow: '0 4px 14px rgba(11,52,60,.10)',
      }}>
        {(() => {
          const vis = block.visibility || 'public';
          const m = VIS_META[vis];
          return (
            <button
              onClick={() => onSetVisibility(nextVisibility(vis))}
              title={`Vidljivost: ${m.label} — klikni za promjenu (Svi → Basic → Premium)`}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: m.bg, border: `1px solid ${m.border}`, borderRadius: 16,
                padding: '2px 9px', cursor: 'pointer', color: m.color,
                fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
              }}
            >{m.icon} {m.label}</button>
          );
        })()}
        {isMedia && (
          <button
            onClick={() => setShowSettings(s => !s)}
            title="Postavke"
            style={{
              background: showSettings ? 'var(--accent-wash)' : 'transparent',
              border: `1px solid ${showSettings ? 'var(--accent)' : 'var(--line)'}`,
              borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
              color: showSettings ? 'var(--accent-ink)' : 'var(--ink-soft)', fontSize: 13,
            }}
          >⚙</button>
        )}
        <button
          onClick={onDelete}
          title="Obriši blok"
          style={{ background: 'transparent', border: '1px solid color-mix(in srgb,#ef4444 25%,transparent)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', color: '#dc2626', fontSize: 13 }}
        >🗑</button>
      </div>

      {/* Inline settings panel for media blocks */}
      {showSettings && isMedia && (
        <div style={{ marginTop: 8, border: '1.5px solid var(--accent)', borderRadius: 10, padding: '16px 20px', background: 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {bt.icon} {bt.label} — Postavke
            </div>
            <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
          <MediaSettings type={block.type} content={draft} onChange={handleChange} />
        </div>
      )}
    </div>
  );
}

// ─── Sortable wrapper ──────────────────────────────────────────────────────────

function SortableNotionBlock(props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.block.id });
  return (
    <NotionBlock
      {...props}
      nodeRef={setNodeRef}
      dragAttributes={attributes}
      dragListeners={listeners}
      isDragging={isDragging}
      dndStyle={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : 'auto' }}
    />
  );
}

// ─── Inline slash menu ─────────────────────────────────────────────────────────
// Type "/" to open a filterable block menu right at the insertion point.

function AddBlockButton({ onPick }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  const results = filterBlockTypes(query);

  useEffect(() => { setActiveIdx(0); }, [query, open]);

  // Close when clicking outside
  useEffect(() => {
    if (!open) return;
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) reset(); }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function reset() { setOpen(false); setQuery(''); setActiveIdx(0); }
  function pick(type) { onPick(type); reset(); }

  function handleChange(e) {
    let v = e.target.value;
    if (v.startsWith('/')) v = v.slice(1);  // tolerate a leading slash
    setQuery(v);
    setOpen(true);
  }

  function handleKey(e) {
    const n = results.length;
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActiveIdx(i => Math.min(i + 1, n - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[activeIdx]) pick(results[activeIdx].type); }
    else if (e.key === 'Escape') { reset(); inputRef.current?.blur(); }
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative', marginTop: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, border: `1.5px dashed ${open ? 'var(--accent)' : 'var(--line)'}`, borderRadius: 10, padding: '9px 14px', background: open ? 'var(--accent-wash)' : 'transparent', transition: 'border-color .15s, background .15s' }}>
        <span style={{ color: 'var(--accent)', fontSize: 15, fontWeight: 700, flexShrink: 0 }}>＋</span>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKey}
          placeholder={'Upiši "/" za blok — naslov, tekst, slika, jednadžba…'}
          style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontSize: 14, color: 'var(--ink)', fontFamily: 'var(--mono)' }}
        />
      </div>

      {open && (
        <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(100% + 6px)', zIndex: 60, background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 16px 48px rgba(11,52,60,.18)', padding: 8, maxHeight: 340, overflowY: 'auto' }}>
          <BlockResultsList query={query} activeIdx={activeIdx} setActiveIdx={setActiveIdx} onPick={pick} />
        </div>
      )}
    </div>
  );
}

// ─── Preview-as-student (R07) ──────────────────────────────────────────────────

// Read-only KaTeX render for the preview column
function EquationPreview({ latex }) {
  const ref = useRef(null);
  useEffect(() => { renderKatex(latex, ref.current); }, [latex]);
  return <div ref={ref} style={{ overflowX: 'auto', padding: '4px 0' }} />;
}

// Compact read-only rendering of a single block for the preview columns
function PreviewBlock({ block }) {
  const { type, content = {} } = block;
  const cap = content.caption || content.title || content.label;
  const mediaBox = (icon, primary) => (
    <div style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: '14px 16px', background: 'var(--surface)', color: 'var(--ink-soft)', fontSize: 13 }}>
      <span style={{ marginRight: 8 }}>{icon}</span>{primary}
      {cap && <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>{cap}</div>}
    </div>
  );
  switch (type) {
    case 'heading': {
      const Tag = `h${content.level || 2}`;
      return <Tag style={{ fontFamily: 'var(--display)', color: 'var(--ink)', margin: '6px 0' }}>{content.text || '—'}</Tag>;
    }
    case 'text':
      return <div style={{ color: 'var(--ink)', lineHeight: 1.6, fontSize: 14 }} dangerouslySetInnerHTML={{ __html: content.html || '' }} />;
    case 'quote':
      return <blockquote style={{ borderLeft: '3px solid var(--accent)', margin: 0, padding: '4px 14px', color: 'var(--ink-soft)', fontStyle: 'italic' }}>{content.text}{content.attribution && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--ink-faint)' }}>— {content.attribution}</div>}</blockquote>;
    case 'callout':
      return <div style={{ background: 'var(--accent-wash)', borderRadius: 8, padding: '10px 14px', color: 'var(--accent-ink)', fontSize: 14 }}>💡 {content.text}</div>;
    case 'warning':
      return <div style={{ background: 'color-mix(in srgb,#f59e0b 12%,transparent)', borderRadius: 8, padding: '10px 14px', color: '#92400e', fontSize: 14 }}>⚠️ {content.text}</div>;
    case 'summary':
      return <ul style={{ margin: '4px 0', paddingLeft: 20, color: 'var(--ink)', fontSize: 14 }}>{(content.items || []).filter(Boolean).map((it, i) => <li key={i}>{it}</li>)}</ul>;
    case 'equation':
      return <EquationPreview latex={content.latex} />;
    case 'divider':
      return <hr style={{ border: 'none', borderTop: '1px solid var(--line)', margin: '12px 0' }} />;
    case 'table':
      return (
        <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
          <thead><tr>{(content.headers || []).map((h, i) => <th key={i} style={{ border: '1px solid var(--line)', padding: '5px 8px', textAlign: 'left', background: 'var(--surface)' }}>{h}</th>)}</tr></thead>
          <tbody>{(content.rows || []).map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci} style={{ border: '1px solid var(--line)', padding: '5px 8px' }}>{c}</td>)}</tr>)}</tbody>
        </table>
      );
    case 'image': case 'gif':
      return content.url
        ? <figure style={{ margin: 0 }}><img src={content.url} alt={content.alt || ''} style={{ maxWidth: '100%', borderRadius: 8 }} />{cap && <figcaption style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>{cap}</figcaption>}</figure>
        : mediaBox('🖼️', 'Slika');
    case 'molecule3d':
      return content.smiles ? <MoleculeCanvas smiles={content.smiles} /> : mediaBox('⚗️', 'Molekula');
    case 'video':   return mediaBox('🎬', content.url || 'Video');
    case 'pdf':     return mediaBox('📄', content.label || content.url || 'PDF dokument');
    case 'link':    return mediaBox('🔗', content.title || content.url || 'Vanjski link');
    case 'quiz_link': return mediaBox('🧪', content.label || 'Kviz');
    case 'graph':   return mediaBox('📈', cap || 'Graf');
    case 'python':  return mediaBox('🐍', cap || 'Python / kod');
    default:        return mediaBox('▫️', TYPE_MAP[type]?.label || type);
  }
}

function PreviewColumn({ plan, blocks }) {
  const m = VIS_META[plan === 'basic' ? 'basic' : 'premium'];
  const visibleCount = blocks.filter(b => planSees(b.visibility || 'public', plan)).length;
  return (
    <div style={{ flex: 1, minWidth: 0, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ padding: '10px 16px', background: m.bg, borderBottom: `1px solid ${m.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, color: m.color, fontFamily: 'var(--display)', fontSize: 15 }}>{m.icon} {plan === 'basic' ? 'Basic pretplatnik' : 'Premium pretplatnik'}</span>
        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>{visibleCount}/{blocks.length} blokova</span>
      </div>
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '64vh', overflowY: 'auto' }}>
        {blocks.length === 0 && <div style={{ color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', padding: 24 }}>Nema blokova.</div>}
        {blocks.map(b => planSees(b.visibility || 'public', plan)
          ? <div key={b.id}><PreviewBlock block={b} /></div>
          : <div key={b.id} style={{ border: '1px dashed var(--line)', borderRadius: 8, padding: '10px 14px', color: 'var(--ink-faint)', fontSize: 12, fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)' }}>
              🔒 {VIS_META[b.visibility].label} sadržaj — skriveno
            </div>
        )}
      </div>
    </div>
  );
}

function StudentPreviewModal({ blocks, onClose }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg)', borderRadius: 16, padding: 24, width: 'min(1100px, 96vw)', boxShadow: '0 20px 60px rgba(0,0,0,.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Pregled kao student</div>
            <div style={{ fontSize: 18, fontWeight: 800, fontFamily: 'var(--display)', color: 'var(--ink)' }}>Što vidi koji plan</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>Zatvori ×</button>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          <PreviewColumn plan="basic" blocks={blocks} />
          <PreviewColumn plan="premium" blocks={blocks} />
        </div>
      </div>
    </div>
  );
}

// ─── Syllabus tag picker ───────────────────────────────────────────────────────

const COURSE_TYPE_LABELS = {
  ib_sl:          'IB SL',
  ib_hl:          'IB HL',
  drzavna_matura: 'Državna matura',
  prijemni:       'Prijemni',
  medchem_1:      'MedChem I',
  medchem_2:      'MedChem II',
};

function SyllabusTagPicker({ lessonId }) {
  const [tags,       setTags]       = useState([]);   // currently saved tags
  const [allCodes,   setAllCodes]   = useState([]);   // all syllabus_codes rows
  const [open,       setOpen]       = useState(false);
  const [tab,        setTab]        = useState('ib_sl');
  const [saving,     setSaving]     = useState(false);
  const [pendingIds, setPendingIds] = useState(null); // null = not editing

  useEffect(() => {
    Promise.all([getSyllabusCodes(), getLessonSyllabusTags(lessonId)])
      .then(([codes, saved]) => { setAllCodes(codes); setTags(saved); });
  }, [lessonId]);

  function openPicker() {
    setPendingIds(new Set(tags.map(t => t.id)));
    setOpen(true);
  }

  function toggleCode(id) {
    setPendingIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      const updated = await setLessonSyllabusTags(lessonId, [...pendingIds]);
      setTags(updated);
      setOpen(false);
      setPendingIds(null);
    } finally {
      setSaving(false);
    }
  }

  function cancel() {
    setOpen(false);
    setPendingIds(null);
  }

  const codesForTab = allCodes.filter(c => c.course_type === tab);
  const courseTypes = [...new Set(allCodes.map(c => c.course_type))];

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Tag chips row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', minHeight: 28 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em', marginRight: 2 }}>
          Syllabus
        </span>
        {tags.length === 0 && (
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>nema oznaka</span>
        )}
        {tags.map(t => (
          <span key={t.id} style={{
            fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
            padding: '2px 8px', borderRadius: 20,
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent-ink)',
            border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
          }}>
            {COURSE_TYPE_LABELS[t.course_type] || t.course_type} {t.code}
          </span>
        ))}
        <button
          onClick={openPicker}
          style={{ fontSize: 11, fontFamily: 'var(--mono)', padding: '2px 9px', borderRadius: 20, border: '1px dashed var(--line)', background: 'none', color: 'var(--ink-soft)', cursor: 'pointer' }}
        >
          {tags.length === 0 ? '+ Dodaj oznake' : 'Uredi'}
        </button>
      </div>

      {/* Picker modal */}
      {open && (
        <div onClick={cancel} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 16, border: '1px solid var(--line)', padding: 24, width: 560, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, fontFamily: 'var(--display)', color: 'var(--ink)' }}>Syllabus oznake</h3>
              <button onClick={cancel} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1 }}>×</button>
            </div>

            {/* Course type tabs */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {courseTypes.map(ct => (
                <button
                  key={ct}
                  onClick={() => setTab(ct)}
                  style={{
                    fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
                    padding: '4px 12px', borderRadius: 20, border: '1px solid var(--line)',
                    cursor: 'pointer',
                    background: tab === ct ? 'var(--accent)' : 'var(--bg)',
                    color: tab === ct ? '#fff' : 'var(--ink-soft)',
                  }}
                >
                  {COURSE_TYPE_LABELS[ct] || ct}
                  {(() => { const n = allCodes.filter(c => c.course_type === ct && pendingIds.has(c.id)).length; return n > 0 ? ` (${n})` : ''; })()}
                </button>
              ))}
            </div>

            {/* Code grid */}
            <div style={{ overflowY: 'auto', flex: 1 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 6 }}>
                {codesForTab.map(c => {
                  const selected = pendingIds.has(c.id);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCode(c.id)}
                      style={{
                        textAlign: 'left', padding: '8px 12px', borderRadius: 9,
                        border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--line)'}`,
                        background: selected ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg)',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: selected ? 'var(--accent-ink)' : 'var(--ink)' }}>{c.code}</div>
                      {c.title && <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 2, lineHeight: 1.3 }}>{c.title}</div>}
                    </button>
                  );
                })}
                {codesForTab.length === 0 && (
                  <div style={{ gridColumn: '1/-1', color: 'var(--ink-faint)', fontSize: 13, padding: '20px 0' }}>Nema kodova za ovaj tip.</div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
              <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
                {pendingIds.size} {pendingIds.size === 1 ? 'oznaka' : 'oznaka'} odabrano
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={cancel} style={{ padding: '7px 16px', border: '1px solid var(--line)', borderRadius: 8, background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Odustani</button>
                <button onClick={save} disabled={saving} style={{ padding: '7px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Sprema…' : 'Spremi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Status control ───────────────────────────────────────────────────────────

const STATUS_CFG = {
  draft:     { label: 'Skica',      color: '#f59e0b' },
  published: { label: 'Objavljeno', color: '#10b981' },
  scheduled: { label: 'Zakazano',   color: '#6366f1' },
  archived:  { label: 'Arhivirano', color: '#94a3b8' },
};

function StatusControl({ status, publishAt, open, saving, scheduleDate, onToggle, onClose, onPick, onScheduleDateChange }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.draft;
  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        disabled={saving}
        style={{
          padding: '5px 12px', borderRadius: 99, border: `1px solid ${cfg.color}44`,
          background: cfg.color + '18', color: cfg.color,
          fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, cursor: 'pointer',
          opacity: saving ? 0.6 : 1,
        }}
      >
        {cfg.label} ▾
      </button>
      {open && (
        <>
          <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 199 }} />
          <div style={{
            position: 'absolute', top: '100%', right: 0, marginTop: 6,
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, boxShadow: '0 8px 30px rgba(0,0,0,.18)',
            padding: '8px', minWidth: 220, zIndex: 200,
          }}>
            {['draft', 'published', 'archived'].map(s => (
              <button
                key={s}
                onClick={() => onPick(s)}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '7px 12px', borderRadius: 7, border: 'none',
                  background: status === s ? STATUS_CFG[s].color + '18' : 'transparent',
                  color: STATUS_CFG[s].color, fontSize: 13, fontFamily: 'var(--mono)',
                  fontWeight: 700, cursor: 'pointer',
                }}
              >
                {STATUS_CFG[s].label}
              </button>
            ))}
            <div style={{ borderTop: '1px solid var(--line)', marginTop: 6, paddingTop: 8, paddingLeft: 4, paddingRight: 4 }}>
              <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', marginBottom: 6, paddingLeft: 8 }}>
                Zakaži objavu:
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="datetime-local"
                  value={scheduleDate}
                  onChange={e => onScheduleDateChange(e.target.value)}
                  style={{
                    flex: 1, padding: '6px 8px', borderRadius: 7,
                    border: '1px solid var(--line)', background: 'var(--bg)',
                    color: 'var(--ink)', fontSize: 12, fontFamily: 'var(--mono)',
                  }}
                />
                <button
                  onClick={() => onPick('scheduled')}
                  disabled={!scheduleDate}
                  style={{
                    padding: '6px 10px', borderRadius: 7, border: 'none',
                    background: scheduleDate ? '#6366f1' : 'var(--line)',
                    color: scheduleDate ? '#fff' : 'var(--ink-faint)',
                    fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700,
                    cursor: scheduleDate ? 'pointer' : 'default',
                  }}
                >
                  OK
                </button>
              </div>
              {status === 'scheduled' && publishAt && (
                <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: '#6366f1', marginTop: 6, paddingLeft: 4 }}>
                  Objava: {new Date(publishAt).toLocaleString('hr')}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ─── LessonEditorPage ──────────────────────────────────────────────────────────

export default function LessonEditorPage() {
  const { lessonId } = useParams();
  const navigate = useNavigate();

  const [lesson,       setLesson]       = useState(null);
  const [blocks,       setBlocks]       = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [showPicker,   setShowPicker]   = useState(false);
  const [showPreview,  setShowPreview]  = useState(false);
  const [exportingDocx, setExportingDocx] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [scheduleDate,   setScheduleDate]   = useState('');
  const [statusSaving,   setStatusSaving]   = useState(false);
  const [saveState,      setSaveState]      = useState('idle'); // idle | saving | saved
  const saveStateTimer                      = useRef(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [lessonData, blocksData] = await Promise.all([getLesson(lessonId), getLessonBlocks(lessonId)]);
      setLesson(lessonData);
      setBlocks(blocksData);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(newStatus) {
    if (newStatus === 'scheduled' && !scheduleDate) return;
    setStatusSaving(true);
    try {
      const publishAt = newStatus === 'scheduled' ? new Date(scheduleDate).toISOString() : undefined;
      const updated = await setLessonStatus(lessonId, newStatus, publishAt);
      setLesson(updated);
      setShowStatusMenu(false);
      setScheduleDate('');
    } catch (e) {
      alert(e.message);
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleAddBlock(type) {
    const content = JSON.parse(JSON.stringify(DEFAULT_CONTENT[type] || {}));
    const newBlock = await createLessonBlock(lessonId, type, content);
    setBlocks(bs => [...bs, newBlock]);
  }

  async function handleUpdate(block, newContent) {
    setSaveState('saving');
    try {
      const updated = await updateLessonBlock(block.id, newContent);
      setBlocks(bs => bs.map(b => b.id === updated.id ? updated : b));
      setSaveState('saved');
      clearTimeout(saveStateTimer.current);
      saveStateTimer.current = setTimeout(() => setSaveState('idle'), 1600);
    } catch (e) {
      setSaveState('idle');
      throw e;
    }
  }

  async function handleDelete(block) {
    if (!window.confirm(`Obriši blok "${TYPE_MAP[block.type]?.label || block.type}"?`)) return;
    await deleteLessonBlock(block.id);
    setBlocks(bs => bs.filter(b => b.id !== block.id));
  }

  async function handleSetVisibility(block, visibility) {
    // optimistic — visibility changes are cheap and frequent
    setBlocks(bs => bs.map(b => b.id === block.id ? { ...b, visibility } : b));
    try { await setBlockVisibility(block.id, visibility); }
    catch { setBlocks(bs => bs.map(b => b.id === block.id ? { ...b, visibility: block.visibility } : b)); }
  }

  async function handleChangeType(block, newType) {
    if (newType === block.type) return;
    const content = convertedContent(block.type, newType, block.content);
    setSaveState('saving');
    try {
      const updated = await changeLessonBlockType(block.id, newType, content);
      setBlocks(bs => bs.map(b => b.id === updated.id ? updated : b));
      setSaveState('saved');
      clearTimeout(saveStateTimer.current);
      saveStateTimer.current = setTimeout(() => setSaveState('idle'), 1600);
    } catch (e) { setSaveState('idle'); alert(e.message); }
  }

  async function handleDuplicate(block) {
    let copy = await createLessonBlock(lessonId, block.type, JSON.parse(JSON.stringify(block.content || {})));
    if ((block.visibility || 'public') !== 'public') {
      copy = await setBlockVisibility(copy.id, block.visibility);
    }
    const idx = blocks.findIndex(b => b.id === block.id);
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    setBlocks(next);
    try { await reorderLessonBlocks(lessonId, next.map(b => b.id)); } catch { /* keep optimistic order */ }
  }

  async function handleMove(block, dir) {
    const idx = blocks.findIndex(b => b.id === block.id);
    const target = idx + dir;
    if (target < 0 || target >= blocks.length) return;
    const next = arrayMove(blocks, idx, target);
    setBlocks(next);
    try { await reorderLessonBlocks(lessonId, next.map(b => b.id)); }
    catch { setBlocks(blocks); }
  }

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex(b => b.id === active.id);
    const newIdx = blocks.findIndex(b => b.id === over.id);
    const reordered = arrayMove(blocks, oldIdx, newIdx);
    setBlocks(reordered);
    try { await reorderLessonBlocks(lessonId, reordered.map(b => b.id)); }
    catch { setBlocks(blocks); }
  }

  async function handleDownloadDocx() {
    setExportingDocx(true);
    try {
      const res = await fetch(`/api/teacher/lessons/${lessonId}/export?format=docx`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${lesson?.title || 'lekcija'}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Greška pri izvozu: ' + e.message);
    } finally {
      setExportingDocx(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>
      Učitavam uređivač…
    </div>
  );

  if (error) return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <p style={{ color: '#dc2626' }}>Greška: {error}</p>
      <button onClick={load} style={{ padding: '8px 20px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer' }}>Pokušaj ponovo</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>

      {/* ── Top bar ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 100, background: 'var(--surface)', borderBottom: '1px solid var(--line)', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <button onClick={() => navigate('/admin/content')}
          style={{ background: 'none', border: '1px solid var(--line)', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 13, fontWeight: 600 }}>
          ← Natrag
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 2 }}>Uređivač lekcije</div>
          <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'var(--display)', color: 'var(--ink)' }}>{lesson?.title}</div>
        </div>
        <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
          {blocks.length} {blocks.length === 1 ? 'blok' : 'blokova'}
        </span>
        {(() => {
          const map = {
            saving: { dot: '#ba7517', text: 'Spremam…' },
            saved:  { dot: '#0f8f86', text: 'Spremljeno' },
            idle:   { dot: '#cfdcda', text: 'Automatsko spremanje' },
          };
          const s = map[saveState];
          return (
            <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', whiteSpace: 'nowrap' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, display: 'inline-block' }} />
              {s.text}
            </span>
          );
        })()}

        {/* ── Status control ── */}
        <StatusControl
          status={lesson?.status ?? 'draft'}
          publishAt={lesson?.publish_at}
          open={showStatusMenu}
          saving={statusSaving}
          scheduleDate={scheduleDate}
          onToggle={() => setShowStatusMenu(s => !s)}
          onClose={() => setShowStatusMenu(false)}
          onPick={handleStatusChange}
          onScheduleDateChange={setScheduleDate}
        />

        <button
          onClick={() => window.open(`/admin/lessons/${lessonId}/print`, '_blank')}
          title="Otvara stranicu za ispis u novoj kartici — ispiši ili spremi kao PDF"
          style={{ background: 'var(--surface)', color: 'var(--ink-soft)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}
        >
          📄 PDF
        </button>
        <button
          onClick={handleDownloadDocx}
          disabled={exportingDocx}
          title="Preuzmi Word dokument (.docx)"
          style={{ background: 'var(--surface)', color: 'var(--ink-soft)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 14px', fontWeight: 600, fontSize: 13, cursor: exportingDocx ? 'default' : 'pointer', opacity: exportingDocx ? 0.6 : 1 }}
        >
          {exportingDocx ? '⏳' : '📝'} DOCX
        </button>
        <button onClick={() => setShowPreview(true)} disabled={blocks.length === 0}
          style={{ background: 'var(--surface)', color: 'var(--ink-soft)', border: '1px solid var(--line)', borderRadius: 9, padding: '8px 16px', fontWeight: 600, fontSize: 14, cursor: blocks.length === 0 ? 'default' : 'pointer', opacity: blocks.length === 0 ? 0.5 : 1 }}>
          👁 Pregled kao student
        </button>
        <button onClick={() => setShowPicker(true)}
          style={{ background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          ＋ Dodaj blok
        </button>
      </div>

      {/* ── Branded WYSIWYG canvas ── */}
      <div className="mol-canvas">
        <div className="mol-canvas__header">
          <div className="mol-canvas__brand">
            <MolekulaMark variant="dark" size={28} />
            <span className="mol-canvas__wordmark">Molekula Academy</span>
          </div>
          {lesson?.topic_title && <span className="mol-canvas__crumb">{lesson.topic_title}</span>}
        </div>

        <div className="mol-canvas__body">
          <MolekulaMark variant="watermark" size={380} className="mol-canvas__watermark" />
          <div className="mol-canvas__content">

        {/* Lesson title */}
        <h1 style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, color: '#0b343c', marginBottom: 8, marginTop: 0 }}>
          {lesson?.title}
        </h1>
        {lesson?.summary && (
          <p style={{ fontSize: 16, color: 'var(--ink-soft)', lineHeight: 1.6, marginBottom: 8, marginTop: 0 }}>{lesson.summary}</p>
        )}
        {(lesson?.difficulty || lesson?.duration_minutes) && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            {lesson.difficulty && <span style={{ fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: 'var(--accent-wash)', color: 'var(--accent-ink)' }}>
              {lesson.difficulty === 'easy' ? 'Lagano' : lesson.difficulty === 'medium' ? 'Srednje' : 'Teško'}
            </span>}
            {lesson.duration_minutes && <span style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', padding: '3px 10px', border: '1px solid var(--line)', borderRadius: 20 }}>⏱ {lesson.duration_minutes} min</span>}
          </div>
        )}

        <SyllabusTagPicker lessonId={lessonId} />

        {/* Empty state */}
        {blocks.length === 0 ? (
          <div style={{ padding: '32px 0' }}>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 13, marginBottom: 14, color: 'var(--ink-faint)', textAlign: 'center' }}>Lekcija nema sadržaja. Upiši “/” da dodaš prvi blok.</p>
            <AddBlockButton onPick={handleAddBlock} />
          </div>
        ) : (
          <>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
                {blocks.map(block => (
                  <div key={block.id} style={{ marginBottom: 16 }}>
                    <SortableNotionBlock
                      block={block}
                      onUpdate={content => handleUpdate(block, content)}
                      onDelete={() => handleDelete(block)}
                      onSetVisibility={vis => handleSetVisibility(block, vis)}
                      onChangeType={newType => handleChangeType(block, newType)}
                      onDuplicate={() => handleDuplicate(block)}
                      onMove={dir => handleMove(block, dir)}
                    />
                  </div>
                ))}
              </SortableContext>
            </DndContext>

            <AddBlockButton onPick={handleAddBlock} />
          </>
        )}
          </div>
        </div>

        <div className="mol-canvas__footer">
          <span>molekula.academy</span>
          <span>© Molekula Academy{lesson?.topic_title ? ` · ${lesson.topic_title}` : ''}</span>
        </div>
      </div>

      {showPicker && <BlockPicker onPick={handleAddBlock} onClose={() => setShowPicker(false)} />}
      {showPreview && <StudentPreviewModal blocks={blocks} onClose={() => setShowPreview(false)} />}
    </div>
  );
}
