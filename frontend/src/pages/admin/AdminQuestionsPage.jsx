import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getQuestions, createQuestion, updateQuestion,
  deleteQuestion, setQuestionStatus, getCourses,
  getTeacherQuizzes, createTeacherQuiz, updateTeacherQuiz, deleteTeacherQuiz,
  getSyllabusCodes, importQuestions,
} from '../../api/client';

// ─── Category system ───────────────────────────────────────────────────────────
// IDs must match backend VALID_CATEGORIES and syllabus_codes.course_type

const CATEGORY_GROUPS = [
  {
    group: 'IB',
    items: [
      { id: 'ib_sl', label: 'IB SL', color: '#0284c7' },
      { id: 'ib_hl', label: 'IB HL', color: '#7c3aed' },
    ],
  },
  {
    group: 'Državna matura',
    items: [
      { id: 'drzavna_matura', label: 'Državna matura', color: '#0f766e' },
    ],
  },
  {
    group: 'Prijemni',
    items: [
      { id: 'prijemni', label: 'Prijemni ispit', color: '#b45309' },
    ],
  },
  {
    group: 'MCBC',
    items: [
      { id: 'medchem_1', label: 'MCBC 1', color: '#be185d' },
      { id: 'medchem_2', label: 'MCBC 2 — Biokemija', color: '#065f46' },
    ],
  },
];

const ALL_CATEGORIES = CATEGORY_GROUPS.flatMap(g => g.items);
const CAT_MAP = Object.fromEntries(ALL_CATEGORIES.map(c => [c.id, c]));

function CategoryPill({ id, size = 'sm' }) {
  const cat = CAT_MAP[id];
  if (!cat) return null;
  const fs = size === 'sm' ? 10 : 12;
  return (
    <span style={{
      fontSize: fs, fontWeight: 700, fontFamily: 'var(--mono)',
      padding: size === 'sm' ? '1px 7px' : '3px 10px',
      borderRadius: 20,
      background: cat.color + '18',
      color: cat.color,
      border: `1px solid ${cat.color}40`,
      whiteSpace: 'nowrap',
    }}>
      {cat.label}
    </span>
  );
}

function CategoryPicker({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {CATEGORY_GROUPS.map(grp => (
        <div key={grp.group}>
          <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 6 }}>{grp.group}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {grp.items.map(cat => {
              const active = value.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onChange(active ? value.filter(x => x !== cat.id) : [...value, cat.id])}
                  style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    border: `1.5px solid ${active ? cat.color : 'var(--line)'}`,
                    background: active ? cat.color + '18' : 'var(--bg)',
                    color: active ? cat.color : 'var(--ink-soft)',
                    transition: 'all .12s',
                  }}
                >
                  {active ? '✓ ' : ''}{cat.label}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Syllabus code picker (per category) ──────────────────────────────────────

function SyllabusCodePicker({ categories, value, onChange, allSyllabusCodes }) {
  // value: [{ category, code }]
  // allSyllabusCodes: [{ id, course_type, code, title, position }]

  if (!categories.length) return null;

  function getSelected(cat) {
    return value.find(x => x.category === cat)?.code || '';
  }

  function setForCat(cat, code) {
    const next = value.filter(x => x.category !== cat);
    if (code) next.push({ category: cat, code });
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {categories.map(catId => {
        const cat = CAT_MAP[catId];
        if (!cat) return null;
        const codes = allSyllabusCodes.filter(c => c.course_type === catId);
        const selected = getSelected(catId);
        return (
          <div key={catId}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: cat.color, fontFamily: 'var(--mono)' }}>
                {cat.label}
              </span>
            </div>
            <select
              style={{
                width: '100%', boxSizing: 'border-box', padding: '7px 10px',
                borderRadius: 8, border: `1.5px solid ${selected ? cat.color + '60' : 'var(--line)'}`,
                background: 'var(--bg)', color: 'var(--ink)', fontSize: 13,
                fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
              }}
              value={selected}
              onChange={e => setForCat(catId, e.target.value)}
            >
              <option value="">— bez koda —</option>
              {codes.map(c => (
                <option key={c.id} value={c.code}>{c.code} — {c.title}</option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const TYPES = ['mcq', 'true_false', 'fill_blank', 'short_answer', 'chem_equation'];
const TYPE_LABELS = { mcq: 'MCQ', true_false: 'Točno/Netočno', fill_blank: 'Dopuni', short_answer: 'Kratki odgovor', chem_equation: 'Kemijska jednadžba' };
const DIFFICULTIES = ['easy', 'medium', 'hard', 'multi_topic'];
const DIFF_LABELS = { easy: 'Lako', medium: 'Srednje', hard: 'Teško', multi_topic: 'Multi-tema' };
const DIFF_COLORS = { easy: '#16a34a', medium: '#d97706', hard: '#dc2626', multi_topic: '#7c3aed' };
const STATUS_LABELS = { approved: 'Odobreno', pending_approval: 'Na čekanju', archived: 'Arhivirano', rejected: 'Odbijeno', ai_generated_pending_approval: 'AI — na čekanju' };
const STATUS_COLORS = {
  approved:   { bg: 'color-mix(in srgb,#22c55e 12%,transparent)', color: '#16a34a' },
  pending_approval: { bg: 'color-mix(in srgb,#f59e0b 12%,transparent)', color: '#d97706' },
  rejected:   { bg: 'color-mix(in srgb,#ef4444 12%,transparent)', color: '#dc2626' },
  archived:   { bg: 'color-mix(in srgb,var(--ink-soft) 10%,transparent)', color: 'var(--ink-soft)' },
  ai_generated_pending_approval: { bg: 'color-mix(in srgb,#8b5cf6 12%,transparent)', color: '#7c3aed' },
};

const SOURCE_TYPES = [
  { id: 'teacher',       label: 'Izvorno (nastavnik)' },
  { id: 'past_exam',     label: 'Stari ispit' },
  { id: 'entrance_exam', label: 'Prijemni ispit' },
  { id: 'uni_exam',      label: 'Fakultetski ispit' },
];

const QUIZ_TYPES = [
  { id: 'mock_exam',       label: 'Lažni ispit (Mock)',       icon: '📝', desc: 'Vremenski ograničen, ocjenjen, simulacija pravog ispita.' },
  { id: 'topic_quiz',      label: 'Kviz teme',                icon: '📚', desc: 'Trajno vezan za temu u tečaju, dostupan svim studentima.' },
  { id: 'homework',        label: 'Domaća zadaća',            icon: '🏠', desc: 'Zadatak koji studenti rješavaju kod kuće s rokom.' },
  { id: 'class_quiz',      label: 'Razredni kviz',            icon: '👥', desc: 'Poslan cijelom razredu ili grupi studenata.' },
  { id: 'single_student',  label: 'Individualni kviz',        icon: '👤', desc: 'Poslan jednom specifičnom studentu.' },
  { id: 'practice',        label: 'Vježba (neocjenjivana)',   icon: '🔁', desc: 'Student može rješavati više puta bez ocjene.' },
];

// ─── Shared styles ─────────────────────────────────────────────────────────────

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px',
  borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg)',
  color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit', outline: 'none',
};

function Field({ label, hint, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 5, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase' }}>
        {label}
        {hint && <span style={{ fontWeight: 400, marginLeft: 6, color: 'var(--ink-faint)', textTransform: 'none', letterSpacing: 0, fontSize: 11 }}>{hint}</span>}
      </div>
      {children}
    </label>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.archived;
  return <span style={{ ...s, padding: '2px 9px', borderRadius: 20, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{STATUS_LABELS[status] || status}</span>;
}

function DiffBadge({ difficulty }) {
  return <span style={{ color: DIFF_COLORS[difficulty] || 'var(--ink-soft)', fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700 }}>{DIFF_LABELS[difficulty] || difficulty}</span>;
}

// ─── Rich text editor (compact) ────────────────────────────────────────────────

function RichTextEditor({ value, onChange, minHeight = 80, placeholder = '' }) {
  const ref = useRef(null);
  const init = useRef(false);

  useEffect(() => {
    if (!init.current && ref.current) {
      ref.current.innerHTML = value || '';
      init.current = true;
    }
  }, [value]);

  function exec(cmd, val) {
    ref.current?.focus();
    document.execCommand(cmd, false, val ?? null);
    onChange(ref.current?.innerHTML || '');
  }

  const TB = ({ cmd, val, title, children }) => (
    <button type="button" title={title} onMouseDown={e => { e.preventDefault(); exec(cmd, val); }}
      style={{ background: 'none', border: 'none', borderRadius: 4, padding: '2px 6px', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: 'var(--ink-soft)', minWidth: 24 }}>
      {children}
    </button>
  );

  return (
    <div style={{ border: '1.5px solid var(--line)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
      <div style={{ display: 'flex', gap: 2, padding: '4px 6px', borderBottom: '1px solid var(--line)', background: 'var(--surface)', flexWrap: 'wrap' }}>
        <TB cmd="bold" title="Podebljano"><b>B</b></TB>
        <TB cmd="italic" title="Kurziv"><i>I</i></TB>
        <TB cmd="underline" title="Podcrtano"><u>U</u></TB>
        <TB cmd="superscript" title="Gornji indeks">x²</TB>
        <TB cmd="subscript" title="Donji indeks">x₂</TB>
        <div style={{ width: 1, background: 'var(--line)', margin: '2px 3px' }} />
        <TB cmd="insertUnorderedList" title="Lista">• list</TB>
        <TB cmd="removeFormat" title="Ukloni format">✕</TB>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={() => onChange(ref.current?.innerHTML || '')}
        data-placeholder={placeholder}
        style={{ minHeight, padding: '10px 12px', color: 'var(--ink)', fontSize: 14, lineHeight: 1.65, outline: 'none', fontFamily: 'inherit' }}
      />
    </div>
  );
}

// ─── Equation block (compact) ──────────────────────────────────────────────────

function EquationInput({ latex, onChange }) {
  const previewRef = useRef(null);

  useEffect(() => {
    if (!previewRef.current || !latex) { if (previewRef.current) previewRef.current.textContent = ''; return; }
    if (window.katex) {
      try { window.katex.render(latex, previewRef.current, { throwOnError: false, displayMode: true }); }
      catch (_) { previewRef.current.textContent = latex; }
    } else {
      previewRef.current.textContent = latex;
    }
  }, [latex]);

  return (
    <div style={{ border: '1.5px solid var(--line)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg)' }}>
      <input
        style={{ ...inp, border: 'none', borderBottom: '1px solid var(--line)', borderRadius: 0, fontFamily: 'var(--mono)', fontSize: 13 }}
        value={latex}
        onChange={e => onChange(e.target.value)}
        placeholder="\ce{H_2O} ili \frac{a}{b}"
        spellCheck={false}
      />
      {latex && (
        <div style={{ padding: '10px 16px', textAlign: 'center', background: 'var(--surface)', overflowX: 'auto' }}>
          <div ref={previewRef} />
        </div>
      )}
    </div>
  );
}

// ─── Stem block editor ─────────────────────────────────────────────────────────

function StemBlockEditor({ blocks, onChange }) {
  function addBlock(type) {
    const defaults = {
      text: { html: '' },
      equation: { latex: '' },
      image: { url: '', alt: '', caption: '' },
    };
    onChange([...blocks, { type, content: defaults[type] }]);
  }
  function removeBlock(i) {
    onChange(blocks.filter((_, j) => j !== i));
  }
  function updateBlock(i, content) {
    onChange(blocks.map((b, j) => j === i ? { ...b, content } : b));
  }
  function moveBlock(i, dir) {
    const next = [...blocks];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  }

  return (
    <div>
      {blocks.length === 0 && (
        <div style={{ padding: '14px 16px', border: '1.5px dashed var(--line)', borderRadius: 8, color: 'var(--ink-faint)', fontSize: 13, textAlign: 'center', marginBottom: 10 }}>
          Dodaj blokove pitanja ispod ↓
        </div>
      )}

      {blocks.map((b, i) => (
        <div key={i} style={{ marginBottom: 8, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', background: 'var(--surface)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 8px', background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', flex: 1 }}>
              {b.type === 'text' ? '¶ Tekst' : b.type === 'equation' ? '∑ Jednadžba' : '🖼 Slika'}
            </span>
            <button type="button" onClick={() => moveBlock(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', color: i === 0 ? 'var(--line)' : 'var(--ink-soft)', fontSize: 11, padding: '1px 4px' }}>▲</button>
            <button type="button" onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} style={{ background: 'none', border: 'none', cursor: i === blocks.length - 1 ? 'default' : 'pointer', color: i === blocks.length - 1 ? 'var(--line)' : 'var(--ink-soft)', fontSize: 11, padding: '1px 4px' }}>▼</button>
            <button type="button" onClick={() => removeBlock(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: '1px 4px' }}>✕</button>
          </div>
          <div style={{ padding: 10 }}>
            {b.type === 'text' && (
              <RichTextEditor value={b.content.html || ''} onChange={html => updateBlock(i, { ...b.content, html })} minHeight={60} placeholder="Tekst pitanja…" />
            )}
            {b.type === 'equation' && (
              <EquationInput latex={b.content.latex || ''} onChange={latex => updateBlock(i, { ...b.content, latex })} />
            )}
            {b.type === 'image' && (
              <>
                <input style={{ ...inp, marginBottom: 6 }} value={b.content.url || ''} onChange={e => updateBlock(i, { ...b.content, url: e.target.value })} placeholder="URL slike / GIF-a…" />
                {b.content.url && <img src={b.content.url} alt="" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 6, display: 'block', marginBottom: 6 }} />}
                <input style={inp} value={b.content.caption || ''} onChange={e => updateBlock(i, { ...b.content, caption: e.target.value })} placeholder="Opis (neobavezno)" />
              </>
            )}
          </div>
        </div>
      ))}

      <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
        {[
          { type: 'text',     icon: '¶',  label: 'Tekst' },
          { type: 'equation', icon: '∑',  label: 'Jednadžba' },
          { type: 'image',    icon: '🖼', label: 'Slika / GIF' },
        ].map(({ type, icon, label }) => (
          <button key={type} type="button" onClick={() => addBlock(type)}
            style={{ padding: '5px 12px', border: '1.5px dashed var(--line)', borderRadius: 7, background: 'none', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent-ink)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
          >
            {icon} {label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── MCQ options editor ────────────────────────────────────────────────────────

function OptionsEditor({ options, onChange }) {
  function update(i, key, val) {
    onChange(options.map((o, j) => j === i ? { ...o, [key]: val } : o));
  }
  function add() {
    onChange([...options, { html: '', text: '', equation: '', is_correct: false }]);
  }
  function remove(i) {
    if (options.length <= 2) return;
    onChange(options.filter((_, j) => j !== i));
  }
  function toggleCorrect(i) {
    onChange(options.map((o, j) => j === i ? { ...o, is_correct: !o.is_correct } : o));
  }

  return (
    <div>
      {options.map((opt, i) => (
        <div key={i} style={{ marginBottom: 8, border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', background: opt.is_correct ? 'color-mix(in srgb,#22c55e 6%,transparent)' : 'var(--bg)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--line)', background: opt.is_correct ? 'color-mix(in srgb,#22c55e 10%,transparent)' : 'var(--surface)' }}>
            <button
              type="button"
              onClick={() => toggleCorrect(i)}
              style={{
                width: 20, height: 20, flexShrink: 0, borderRadius: 4,
                border: `2px solid ${opt.is_correct ? '#16a34a' : 'var(--line)'}`,
                background: opt.is_correct ? '#16a34a' : 'transparent',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontSize: 12, fontWeight: 700,
              }}
            >
              {opt.is_correct ? '✓' : ''}
            </button>
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: opt.is_correct ? '#16a34a' : 'var(--ink-faint)', flex: 1 }}>
              Opcija {String.fromCharCode(65 + i)}{opt.is_correct ? ' — Točno' : ''}
            </span>
            {options.length > 2 && (
              <button type="button" onClick={() => remove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 13, padding: 2 }}>✕</button>
            )}
          </div>
          <div style={{ padding: 8 }}>
            <input
              style={{ ...inp, marginBottom: opt.equation !== undefined ? 6 : 0 }}
              value={opt.text || opt.html?.replace(/<[^>]*>/g, '') || ''}
              onChange={e => update(i, 'text', e.target.value)}
              placeholder={`Tekst opcije ${String.fromCharCode(65 + i)}…`}
            />
            {opt.equation !== undefined && opt.equation !== null && (
              <EquationInput latex={opt.equation || ''} onChange={eq => update(i, 'equation', eq)} />
            )}
            <button
              type="button"
              onClick={() => update(i, 'equation', opt.equation != null ? null : '')}
              style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-faint)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', textDecoration: 'underline' }}
            >
              {opt.equation != null ? '− Ukloni jednadžbu' : '+ Dodaj jednadžbu u opciju'}
            </button>
          </div>
        </div>
      ))}
      <button type="button" onClick={add}
        style={{ fontSize: 12, color: 'var(--accent-ink)', background: 'var(--accent-wash)', border: 'none', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontWeight: 600 }}>
        + Dodaj opciju
      </button>
    </div>
  );
}

// ─── Question modal ────────────────────────────────────────────────────────────

function QuestionModal({ initial, topics, allSyllabusCodes, onSave, onClose }) {
  const [type,         setType]         = useState(initial?.type        || 'mcq');
  const [stemBlocks,   setStemBlocks]   = useState(
    initial?.stem_blocks?.length ? initial.stem_blocks : [{ type: 'text', content: { html: initial?.stem || '' } }]
  );
  const [explanation,  setExplanation]  = useState(initial?.explanation || '');
  const [modelAnswer,  setModelAnswer]  = useState(initial?.model_answer || '');
  const [difficulty,   setDifficulty]   = useState(initial?.difficulty  || 'medium');
  const [topicId,      setTopicId]      = useState(initial?.topic_id    || '');
  const [categories,   setCategories]   = useState(initial?.categories  || []);
  const [syllabusCodesByCategory, setSyllabusCodesByCategory] = useState(
    initial?.syllabus_codes?.length ? initial.syllabus_codes : []
  );
  const [points,       setPoints]       = useState(initial?.points ?? initial?.max_points ?? 1);
  const [sourceType,   setSourceType]   = useState(initial?.source_type || 'teacher');
  const [sourceYear,   setSourceYear]   = useState(initial?.source_year || '');
  const [sourceMonth,  setSourceMonth]  = useState(initial?.source_month || '');
  const [ibPaper,      setIbPaper]      = useState(initial?.ib_paper || '');
  const [options,      setOptions]      = useState(initial?.options?.map(o => ({ ...o, equation: o.equation ?? null })) || [
    { text: '', is_correct: true,  equation: null },
    { text: '', is_correct: false, equation: null },
    { text: '', is_correct: false, equation: null },
    { text: '', is_correct: false, equation: null },
  ]);
  const [saving, setSaving] = useState(false);
  const [err,    setErr]    = useState('');

  const needsOptions = ['mcq', 'true_false'].includes(type);

  useEffect(() => {
    if (type === 'true_false') {
      setOptions([{ text: 'Točno', is_correct: true, equation: null }, { text: 'Netočno', is_correct: false, equation: null }]);
    }
  }, [type]);

  // Remove syllabus codes for categories that were deselected
  useEffect(() => {
    setSyllabusCodesByCategory(prev => prev.filter(x => categories.includes(x.category)));
  }, [categories]);

  function stemPlainText() {
    return stemBlocks.map(b => {
      if (b.type === 'text') return b.content.html?.replace(/<[^>]*>/g, '') || '';
      if (b.type === 'equation') return b.content.latex || '';
      return b.content.caption || b.content.url || '';
    }).join(' ').trim();
  }

  const showSourceExtra = sourceType !== 'teacher';

  async function submit(e) {
    e.preventDefault();
    if (stemPlainText().length < 2) { setErr('Tekst pitanja je obavezan.'); return; }
    setSaving(true); setErr('');
    try {
      await onSave({
        type,
        stem: stemPlainText(),
        stem_blocks: stemBlocks,
        explanation: explanation.trim() || null,
        model_answer: modelAnswer.trim() || null,
        difficulty,
        topic_id: topicId ? Number(topicId) : null,
        source_type: sourceType,
        source_year: sourceYear ? Number(sourceYear) : null,
        source_month: sourceMonth ? Number(sourceMonth) : null,
        ib_paper: ibPaper ? Number(ibPaper) : null,
        categories,
        syllabus_codes: syllabusCodesByCategory,
        max_points: Number(points) || 1,
        points: Number(points) || 1,
        options: needsOptions ? options : [],
      });
      onClose();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 28, width: 720, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>{initial ? 'Uredi pitanje' : 'Novo pitanje'}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1, padding: 4 }}>×</button>
        </div>

        <form onSubmit={submit}>
          {/* Type + difficulty + points */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 80px', gap: 12, marginBottom: 14 }}>
            <Field label="Vrsta pitanja">
              <select style={inp} value={type} onChange={e => setType(e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
            </Field>
            <Field label="Težina">
              <select style={inp} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
              </select>
            </Field>
            <Field label="Bodovi">
              <input type="number" min="0.5" max="20" step="0.5" style={inp} value={points} onChange={e => setPoints(e.target.value)} />
            </Field>
          </div>

          {/* Stem blocks */}
          <Field label="Tekst pitanja" hint="Dodaj blokove — tekst, jednadžbu ili sliku u željenom redoslijedu">
            <StemBlockEditor blocks={stemBlocks} onChange={setStemBlocks} />
          </Field>

          {/* Options */}
          {needsOptions && (
            <Field label="Ponuđeni odgovori" hint="Označi ✓ za točan(e)">
              <OptionsEditor options={options} onChange={setOptions} />
            </Field>
          )}
          {!needsOptions && (
            <Field label="Model odgovora">
              <textarea style={{ ...inp, minHeight: 72, resize: 'vertical' }} value={modelAnswer} onChange={e => setModelAnswer(e.target.value)} placeholder="Očekivani odgovor…" />
            </Field>
          )}

          {/* Explanation */}
          <Field label="Objašnjenje" hint="Prikazuje se studentu nakon odgovora">
            <RichTextEditor value={explanation} onChange={setExplanation} minHeight={56} placeholder="Zašto je ovaj odgovor točan…" />
          </Field>

          {/* Source */}
          <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', marginBottom: 14, background: 'var(--bg)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 10, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase' }}>Izvor</div>
            <div style={{ display: 'grid', gridTemplateColumns: showSourceExtra ? '1fr 1fr 1fr' : '1fr', gap: 10 }}>
              <div>
                <select style={inp} value={sourceType} onChange={e => setSourceType(e.target.value)}>
                  {SOURCE_TYPES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </div>
              {showSourceExtra && (
                <>
                  <input
                    type="number" min="1990" max="2030" style={inp}
                    value={sourceYear} onChange={e => setSourceYear(e.target.value)}
                    placeholder="Godina (npr. 2023)"
                  />
                  {['past_exam'].includes(sourceType) ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <input
                        type="number" min="1" max="12" style={inp}
                        value={sourceMonth} onChange={e => setSourceMonth(e.target.value)}
                        placeholder="Mjesec"
                      />
                      <input
                        type="number" min="1" max="3" style={inp}
                        value={ibPaper} onChange={e => setIbPaper(e.target.value)}
                        placeholder="Rad (1/2/3)"
                      />
                    </div>
                  ) : (
                    <div />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Categories */}
          <Field label="Kategorije" hint="Može biti više">
            <CategoryPicker value={categories} onChange={setCategories} />
          </Field>

          {/* Syllabus codes per category */}
          {categories.length > 0 && (
            <Field label="Kod kurikuluma" hint="Jedan kod po kategoriji">
              <SyllabusCodePicker
                categories={categories}
                value={syllabusCodesByCategory}
                onChange={setSyllabusCodesByCategory}
                allSyllabusCodes={allSyllabusCodes}
              />
            </Field>
          )}

          {/* Topic */}
          <Field label="Tema (neobavezno)">
            <select style={inp} value={topicId} onChange={e => setTopicId(e.target.value)}>
              <option value="">— bez teme —</option>
              {topics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
            </select>
          </Field>

          {err && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 8px' }}>{err}</p>}

          <button type="submit" disabled={saving} style={{ width: '100%', padding: '10px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
            {saving ? 'Snimam…' : 'Spremi pitanje'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Question card (list view) ─────────────────────────────────────────────────

function QuestionCard({ q, onEdit, onDelete, onStatus, selectable, selected, onSelect }) {
  const [expanded, setExpanded] = useState(false);

  const syllabusTags = q.syllabus_codes?.length > 0
    ? q.syllabus_codes.map(sc => {
        const cat = CAT_MAP[sc.category];
        return cat ? (
          <span key={`${sc.category}-${sc.code}`} style={{
            fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700,
            padding: '1px 6px', borderRadius: 4,
            background: cat.color + '15', color: cat.color,
            border: `1px solid ${cat.color}35`,
            whiteSpace: 'nowrap',
          }}>
            {sc.code}
          </span>
        ) : null;
      })
    : null;

  return (
    <div style={{ padding: '12px 16px', borderRadius: 10, border: `1.5px solid ${selected ? 'var(--accent)' : 'var(--line)'}`, background: selected ? 'var(--accent-wash)' : 'var(--surface)', marginBottom: 6, transition: 'border-color .12s, background .12s' }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        {selectable && (
          <button type="button" onClick={() => onSelect(q)}
            style={{ flexShrink: 0, width: 22, height: 22, borderRadius: 5, border: `2px solid ${selected ? 'var(--accent)' : 'var(--line)'}`, background: selected ? 'var(--accent)' : 'transparent', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2 }}
          >{selected ? '✓' : ''}</button>
        )}

        <span style={{ flexShrink: 0, marginTop: 2, fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-faint)', background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 6, padding: '2px 7px', whiteSpace: 'nowrap' }}>
          {TYPE_LABELS[q.type] || q.type}
        </span>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--ink)', lineHeight: 1.45 }}>
            {q.stem?.length > 140 ? q.stem.slice(0, 140) + '…' : q.stem}
          </p>
          {/* Category pills + syllabus code tags */}
          {(q.categories?.length > 0 || syllabusTags) && (
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginTop: 5 }}>
              {q.categories?.map(c => <CategoryPill key={c} id={c} />)}
              {syllabusTags}
            </div>
          )}
          {/* Performance stats */}
          {q.attempt_count > 0 && (
            <div style={{ marginTop: 4, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
              {Math.round((q.correct_count / q.attempt_count) * 100)}% točno · {q.attempt_count} pokušaja
              {q.avg_time_seconds > 0 && ` · ${Math.round(q.avg_time_seconds)}s prosj.`}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
          <DiffBadge difficulty={q.difficulty} />
          {q.points != null && q.points !== 1 && (
            <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>{q.points || q.max_points}b</span>
          )}
          <StatusBadge status={q.status} />
          {!selectable && (
            <>
              <button onClick={() => setExpanded(x => !x)} title="Proširi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, fontSize: 13 }}>{expanded ? '▲' : '▼'}</button>
              <button onClick={onEdit} title="Uredi" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, fontSize: 13 }}>✏️</button>
              <button onClick={onDelete} title="Obriši" style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 4, fontSize: 13 }}>🗑</button>
            </>
          )}
        </div>
      </div>

      {expanded && !selectable && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          {q.options?.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 6, marginBottom: 10 }}>
              {q.options.map((o, i) => (
                <div key={i} style={{ padding: '6px 10px', borderRadius: 7, border: `1px solid ${o.is_correct ? 'color-mix(in srgb,#22c55e 30%,transparent)' : 'var(--line)'}`, background: o.is_correct ? 'color-mix(in srgb,#22c55e 10%,transparent)' : 'var(--bg)', fontSize: 13, fontWeight: o.is_correct ? 700 : 400, color: o.is_correct ? '#16a34a' : 'var(--ink-soft)' }}>
                  {String.fromCharCode(65 + i)}. {o.text || o.html?.replace(/<[^>]*>/g, '') || ''}
                  {o.equation && <div style={{ fontFamily: 'var(--mono)', fontSize: 11, marginTop: 3, opacity: .7 }}>{o.equation}</div>}
                </div>
              ))}
            </div>
          )}
          {q.explanation && <div style={{ fontSize: 13, color: 'var(--ink-soft)', background: 'var(--bg)', padding: '8px 12px', borderRadius: 7, borderLeft: '3px solid var(--accent)' }}><b>Objašnjenje:</b> {q.explanation}</div>}
          {q.source_type && q.source_type !== 'teacher' && (
            <div style={{ marginTop: 8, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>
              {SOURCE_TYPES.find(s => s.id === q.source_type)?.label}
              {q.source_year ? ` · ${q.source_year}` : ''}
              {q.source_month ? `/${q.source_month}` : ''}
              {q.ib_paper ? ` · Rad ${q.ib_paper}` : ''}
            </div>
          )}
          {q.status === 'pending_approval' && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => onStatus(q, 'approved')} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 7, border: 'none', background: 'color-mix(in srgb,#22c55e 15%,transparent)', color: '#16a34a', fontWeight: 700, cursor: 'pointer' }}>✓ Odobri</button>
              <button onClick={() => onStatus(q, 'rejected')} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 7, border: 'none', background: 'color-mix(in srgb,#ef4444 10%,transparent)', color: '#dc2626', fontWeight: 700, cursor: 'pointer' }}>✗ Odbij</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Quiz builder panel ────────────────────────────────────────────────────────

function QuizBuilderPanel({ questions, allTopics, onSaved }) {
  const [quizzes,     setQuizzes]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [editQuiz,    setEditQuiz]    = useState(null);
  const [search,      setSearch]      = useState('');
  const [filterCat,   setFilterCat]   = useState('');
  const [filterDiff,  setFilterDiff]  = useState('');
  const [filterType,  setFilterType]  = useState('');
  const [selected,    setSelected]    = useState([]);
  const [quizName,    setQuizName]    = useState('');
  const [quizDesc,    setQuizDesc]    = useState('');
  const [quizType,    setQuizType]    = useState('topic_quiz');
  const [timeLimit,   setTimeLimit]   = useState('');
  const [topicLink,   setTopicLink]   = useState('');
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  useEffect(() => {
    getTeacherQuizzes()
      .then(data => setQuizzes(data || []))
      .catch(() => setQuizzes([]))
      .finally(() => setLoading(false));
  }, []);

  const visible = questions.filter(q => {
    if (search && !q.stem.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && !(q.categories || []).includes(filterCat)) return false;
    if (filterDiff && q.difficulty !== filterDiff) return false;
    if (filterType && q.type !== filterType) return false;
    return true;
  });

  function toggleSelect(q) {
    setSelected(sel => sel.includes(q.id) ? sel.filter(x => x !== q.id) : [...sel, q.id]);
  }

  function loadQuizForEdit(quiz) {
    setQuizName(quiz.title || '');
    setQuizDesc(quiz.description || '');
    setQuizType(quiz.quiz_type || 'topic_quiz');
    setTimeLimit(quiz.time_limit_minutes || '');
    setTopicLink(quiz.topic_id || '');
    setSelected(quiz.question_ids || []);
    setEditQuiz(quiz);
  }

  function resetForm() {
    setQuizName(''); setQuizDesc(''); setQuizType('topic_quiz');
    setTimeLimit(''); setTopicLink(''); setSelected([]);
    setEditQuiz(null); setErr('');
  }

  async function saveQuiz() {
    if (!quizName.trim()) { setErr('Naziv kviza je obavezan.'); return; }
    if (selected.length === 0) { setErr('Odaberi barem jedno pitanje.'); return; }
    setSaving(true); setErr('');
    const fields = {
      title: quizName.trim(),
      description: quizDesc.trim() || null,
      quiz_type: quizType,
      time_limit_minutes: timeLimit ? Number(timeLimit) : null,
      topic_id: topicLink ? Number(topicLink) : null,
      question_ids: selected,
      status: 'draft',
    };
    try {
      if (editQuiz && editQuiz !== 'new') {
        const updated = await updateTeacherQuiz(editQuiz.id, fields);
        setQuizzes(qs => qs.map(x => x.id === updated.id ? updated : x));
      } else {
        const created = await createTeacherQuiz(fields);
        setQuizzes(qs => [created, ...qs]);
      }
      resetForm();
      if (onSaved) onSaved();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(quiz) {
    if (!window.confirm(`Obriši kviz "${quiz.title}"?`)) return;
    await deleteTeacherQuiz(quiz.id);
    setQuizzes(qs => qs.filter(x => x.id !== quiz.id));
  }

  const selectedQuestions = questions.filter(q => selected.includes(q.id));
  const totalPoints = selectedQuestions.reduce((s, q) => s + (q.points || q.max_points || 1), 0);
  const qt = QUIZ_TYPES.find(x => x.id === quizType) || QUIZ_TYPES[0];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 20, alignItems: 'start' }}>

      {/* Left: question picker */}
      <div>
        <div style={{ marginBottom: 12 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>Odaberi pitanja</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <input style={{ ...inp, maxWidth: 220, padding: '6px 10px', fontSize: 13 }} placeholder="Pretraži…" value={search} onChange={e => setSearch(e.target.value)} />
            <select style={{ padding: '6px 10px', borderRadius: 7, border: '1.5px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, cursor: 'pointer' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
              <option value="">Sve kategorije</option>
              {ALL_CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select style={{ padding: '6px 10px', borderRadius: 7, border: '1.5px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, cursor: 'pointer' }} value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
              <option value="">Sve težine</option>
              {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
            </select>
            <select style={{ padding: '6px 10px', borderRadius: 7, border: '1.5px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, cursor: 'pointer' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
              <option value="">Sve vrste</option>
              {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
            {visible.length} pitanja · {selected.length} odabrano · {totalPoints} bodova ukupno
          </div>
        </div>

        <div style={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto', paddingRight: 4 }}>
          {visible.length === 0 && <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>Nema pitanja.</div>}
          {visible.map(q => (
            <QuestionCard
              key={q.id}
              q={q}
              selectable
              selected={selected.includes(q.id)}
              onSelect={toggleSelect}
            />
          ))}
        </div>
      </div>

      {/* Right: quiz config */}
      <div style={{ position: 'sticky', top: 80 }}>
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, fontFamily: 'var(--display)', color: 'var(--ink)' }}>
              {editQuiz && editQuiz !== 'new' ? `Uredi: ${editQuiz.title}` : 'Novi kviz'}
            </h3>
            {editQuiz && <button type="button" onClick={resetForm} style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'none', border: 'none', cursor: 'pointer' }}>+ Novi</button>}
          </div>

          <Field label="Naziv kviza">
            <input style={inp} value={quizName} onChange={e => setQuizName(e.target.value)} placeholder="npr. IB HL Mock — Lipanj 2026" />
          </Field>

          <Field label="Opis / napomena">
            <textarea style={{ ...inp, minHeight: 56, resize: 'vertical' }} value={quizDesc} onChange={e => setQuizDesc(e.target.value)} placeholder="Kratki opis, upute za studente…" />
          </Field>

          <Field label="Vrsta kviza">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {QUIZ_TYPES.map(qt2 => (
                <button key={qt2.id} type="button" onClick={() => setQuizType(qt2.id)}
                  style={{ textAlign: 'left', padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${quizType === qt2.id ? 'var(--accent)' : 'var(--line)'}`, background: quizType === qt2.id ? 'var(--accent-wash)' : 'var(--bg)', cursor: 'pointer' }}>
                  <div style={{ fontSize: 16, marginBottom: 2 }}>{qt2.icon}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: quizType === qt2.id ? 'var(--accent-ink)' : 'var(--ink)', lineHeight: 1.3 }}>{qt2.label}</div>
                </button>
              ))}
            </div>
          </Field>

          {['mock_exam', 'homework', 'class_quiz'].includes(quizType) && (
            <Field label="Vremensko ograničenje (min)" hint="0 = bez ograničenja">
              <input type="number" min="0" style={inp} value={timeLimit} onChange={e => setTimeLimit(e.target.value)} placeholder="npr. 45" />
            </Field>
          )}
          {quizType === 'topic_quiz' && (
            <Field label="Poveži s temom">
              <select style={inp} value={topicLink} onChange={e => setTopicLink(e.target.value)}>
                <option value="">— odaberi temu —</option>
                {allTopics.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
              </select>
            </Field>
          )}

          <div style={{ background: 'var(--bg)', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Odabrana pitanja ({selected.length})</div>
            {selected.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>Odaberi pitanja s lijeve strane</div>
            ) : (
              <>
                {selectedQuestions.slice(0, 5).map((q, i) => (
                  <div key={q.id} style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink-faint)', flexShrink: 0 }}>{i + 1}.</span>
                    <span style={{ fontSize: 12, color: 'var(--ink-soft)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.stem?.slice(0, 50)}…</span>
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>{q.points || q.max_points || 1}b</span>
                    <button type="button" onClick={() => toggleSelect(q)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 11, padding: 0 }}>✕</button>
                  </div>
                ))}
                {selected.length > 5 && <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>+ još {selected.length - 5} pitanja</div>}
                <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--line)', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', fontWeight: 700 }}>
                  Ukupno: {totalPoints} bodova
                </div>
              </>
            )}
          </div>

          {err && <p style={{ color: '#ef4444', fontSize: 12, margin: '0 0 8px' }}>{err}</p>}

          <button type="button" onClick={saveQuiz} disabled={saving}
            style={{ width: '100%', padding: '10px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? .6 : 1 }}>
            {saving ? 'Snimam…' : editQuiz && editQuiz !== 'new' ? '✓ Spremi izmjene' : '✓ Stvori kviz'}
          </button>

          <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center' }}>{qt.desc}</div>
        </div>

        {!loading && quizzes.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Moji kvizovi ({quizzes.length})</div>
            {quizzes.map(quiz => {
              const qt2 = QUIZ_TYPES.find(x => x.id === quiz.quiz_type) || QUIZ_TYPES[0];
              return (
                <div key={quiz.id} style={{ padding: '10px 12px', border: '1px solid var(--line)', borderRadius: 9, marginBottom: 6, background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{qt2.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{quiz.title}</div>
                    <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>{qt2.label} · {quiz.question_ids?.length || 0} pitanja</div>
                  </div>
                  <button type="button" onClick={() => loadQuizForEdit(quiz)} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-soft)', cursor: 'pointer', fontWeight: 600 }}>Uredi</button>
                  <button type="button" onClick={() => deleteQuiz(quiz)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: 14, padding: 2 }}>🗑</button>
                </div>
              );
            })}
          </div>
        )}
        {loading && <div style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', textAlign: 'center' }}>Učitavam kvizove…</div>}
      </div>
    </div>
  );
}

// ─── Bulk paste parser ─────────────────────────────────────────────────────────

const OPTION_LABEL_RE = /^([A-Da-d])[.)]\s*/;
const QUESTION_NUM_RE = /^(\d+)[.)]\s+/;
const ANSWER_RE = /^(?:answer|correct|točan\s+odgovor|odgovor)\s*[:=]\s*([A-Da-d])/i;

function parsePastedText(raw) {
  const lines = raw.split('\n').map(l => l.trimEnd());
  const blocks = [];
  let cur = null;

  function flush() {
    if (!cur) return;
    const stem = cur.stemLines.join(' ').trim();
    if (stem.length < 2) { cur = null; return; }
    blocks.push(cur);
    cur = null;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // New numbered question
    const numMatch = trimmed.match(QUESTION_NUM_RE);
    if (numMatch) {
      flush();
      cur = { stemLines: [trimmed.slice(numMatch[0].length)], options: [], answerLetter: '' };
      continue;
    }

    if (!cur) {
      // First un-numbered block is treated as a question
      if (trimmed.length > 8) {
        cur = { stemLines: [trimmed], options: [], answerLetter: '' };
      }
      continue;
    }

    // Option line A) B) C) D)
    const optMatch = trimmed.match(OPTION_LABEL_RE);
    if (optMatch) {
      cur.options.push({ letter: optMatch[1].toUpperCase(), text: trimmed.slice(optMatch[0].length), is_correct: false });
      continue;
    }

    // Answer marker
    const ansMatch = trimmed.match(ANSWER_RE);
    if (ansMatch) {
      cur.answerLetter = ansMatch[1].toUpperCase();
      continue;
    }

    // Empty line = potential question boundary (only if we have stem + some options)
    if (trimmed === '') {
      if (cur.options.length > 0) {
        flush();
      }
      continue;
    }

    // Otherwise continuation of stem
    if (cur.options.length === 0) {
      cur.stemLines.push(trimmed);
    }
  }
  flush();

  // Apply correct answer, convert to question objects
  return blocks.map((b, i) => {
    const isMCQ = b.options.length >= 2;
    const opts = isMCQ
      ? b.options.map(o => ({
          text: o.text,
          is_correct: b.answerLetter ? o.letter === b.answerLetter : false,
          equation: null,
        }))
      : [];
    // Pad MCQ to 4 options if needed
    while (isMCQ && opts.length < 4) opts.push({ text: '', is_correct: false, equation: null });

    return {
      _id: i,
      stem: b.stemLines.join(' ').trim(),
      type: isMCQ ? 'mcq' : 'short_answer',
      options: opts,
      difficulty: 'medium',
      categories: [],
      syllabus_codes: [],
      source_type: 'teacher',
      skip: false,
      _noCorrect: isMCQ && !b.answerLetter,
    };
  });
}

// ─── Bulk import panel ─────────────────────────────────────────────────────────

function BulkImportPanel({ onImported }) {
  const [step, setStep] = useState('paste'); // paste | review | done
  const [raw, setRaw] = useState('');
  const [parsed, setParsed] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState('');

  function doParse() {
    const qs = parsePastedText(raw);
    if (!qs.length) { setErr('Nije pronađeno nijedno pitanje. Provjeri format.'); return; }
    setErr('');
    setParsed(qs);
    setStep('review');
  }

  function updateQ(idx, patch) {
    setParsed(prev => prev.map((q, i) => i === idx ? { ...q, ...patch } : q));
  }

  function updateOption(qIdx, oIdx, patch) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, options: q.options.map((o, j) => j === oIdx ? { ...o, ...patch } : o) };
    }));
  }

  function toggleCorrect(qIdx, oIdx) {
    setParsed(prev => prev.map((q, i) => {
      if (i !== qIdx) return q;
      return { ...q, _noCorrect: false, options: q.options.map((o, j) => ({ ...o, is_correct: j === oIdx })) };
    }));
  }

  async function doImport() {
    const toSend = parsed.filter(q => !q.skip && q.stem.length >= 2);
    if (!toSend.length) { setErr('Nema pitanja za uvoz.'); return; }
    setImporting(true); setErr('');
    try {
      const resp = await importQuestions(toSend.map(q => ({
        type: q.type,
        stem: q.stem,
        difficulty: q.difficulty,
        source_type: q.source_type,
        categories: q.categories,
        syllabus_codes: q.syllabus_codes,
        options: q.type === 'mcq' ? q.options.filter(o => o.text.trim()) : [],
        max_points: 1,
        status: 'pending_approval',
      })));
      setResult(resp);
      setStep('done');
      if (onImported) onImported();
    } catch (ex) {
      setErr(ex.message);
    } finally {
      setImporting(false);
    }
  }

  function reset() {
    setStep('paste'); setRaw(''); setParsed([]); setResult(null); setErr('');
  }

  const toImport = parsed.filter(q => !q.skip).length;

  if (step === 'done') {
    return (
      <div style={{ maxWidth: 600, margin: '60px auto', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
        <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--display)', color: 'var(--ink)' }}>Uvoz završen</h2>
        <p style={{ color: 'var(--ink-soft)', fontSize: 14, margin: '0 0 24px' }}>
          {result?.imported_count} pitanja uvezeno s oznakom <b>Na čekanju</b> — odobri ih u bazi pitanja.
        </p>
        <button onClick={reset} style={{ padding: '10px 28px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
          Uvezi više
        </button>
      </div>
    );
  }

  if (step === 'review') {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontFamily: 'var(--display)', color: 'var(--ink)' }}>
            Pregled — {parsed.length} pitanja parsirana
          </h2>
          <div style={{ flex: 1 }} />
          <button onClick={reset} style={{ fontSize: 12, color: 'var(--ink-soft)', background: 'none', border: '1.5px solid var(--line)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer' }}>
            ← Natrag
          </button>
          <button
            onClick={doImport}
            disabled={importing || toImport === 0}
            style={{ padding: '8px 22px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing || toImport === 0 ? .5 : 1 }}>
            {importing ? 'Uvozim…' : `Uvezi ${toImport} pitanja`}
          </button>
        </div>
        {err && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{err}</p>}

        {parsed.map((q, qi) => (
          <div key={qi} style={{
            marginBottom: 12, border: `1.5px solid ${q.skip ? 'var(--line)' : q._noCorrect ? '#f59e0b60' : 'var(--line)'}`,
            borderRadius: 12, background: q.skip ? 'var(--bg)' : 'var(--surface)',
            opacity: q.skip ? .45 : 1, transition: 'opacity .12s',
          }}>
            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)' }}>#{qi + 1}</span>
              <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, padding: '2px 8px', borderRadius: 6, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--ink-soft)' }}>
                {TYPE_LABELS[q.type] || q.type}
              </span>
              {q._noCorrect && (
                <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: '#d97706', background: 'color-mix(in srgb,#f59e0b 12%,transparent)', padding: '2px 8px', borderRadius: 6 }}>
                  ⚠ Označi točan odgovor
                </span>
              )}
              <select
                style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1.5px solid var(--line)', background: 'var(--bg)', color: DIFF_COLORS[q.difficulty], fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                value={q.difficulty}
                onChange={e => updateQ(qi, { difficulty: e.target.value })}
              >
                {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
              </select>
              <select
                style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontFamily: 'inherit', cursor: 'pointer' }}
                value={q.type}
                onChange={e => updateQ(qi, { type: e.target.value })}
              >
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              <div style={{ flex: 1 }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: 12, color: 'var(--ink-soft)', userSelect: 'none' }}>
                <input type="checkbox" checked={q.skip} onChange={e => updateQ(qi, { skip: e.target.checked })} style={{ cursor: 'pointer' }} />
                Preskoči
              </label>
            </div>

            <div style={{ padding: '12px 14px' }}>
              {/* Stem */}
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 4 }}>Tekst pitanja</div>
                <textarea
                  style={{ ...inp, minHeight: 60, resize: 'vertical', fontFamily: 'inherit' }}
                  value={q.stem}
                  onChange={e => updateQ(qi, { stem: e.target.value })}
                />
              </div>

              {/* MCQ options */}
              {q.type === 'mcq' && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Opcije — klikni za točan odgovor</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {q.options.map((o, oi) => (
                      <div
                        key={oi}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px',
                          borderRadius: 8, border: `1.5px solid ${o.is_correct ? '#16a34a' : 'var(--line)'}`,
                          background: o.is_correct ? 'color-mix(in srgb,#22c55e 8%,transparent)' : 'var(--bg)',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleCorrect(qi, oi)}
                      >
                        <span style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: o.is_correct ? '#16a34a' : 'var(--ink-faint)', flexShrink: 0 }}>
                          {o.is_correct ? '✓' : String.fromCharCode(65 + oi)}
                        </span>
                        <input
                          style={{ flex: 1, border: 'none', background: 'transparent', color: 'var(--ink)', fontSize: 13, fontFamily: 'inherit', outline: 'none', minWidth: 0 }}
                          value={o.text}
                          onChange={e => updateOption(qi, oi, { text: e.target.value })}
                          onClick={ev => ev.stopPropagation()}
                          placeholder={`Opcija ${String.fromCharCode(65 + oi)}…`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div>
                <div style={{ fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Kategorije</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {ALL_CATEGORIES.map(cat => {
                    const active = q.categories.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => updateQ(qi, { categories: active ? q.categories.filter(x => x !== cat.id) : [...q.categories, cat.id] })}
                        style={{
                          padding: '3px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                          border: `1.5px solid ${active ? cat.color : 'var(--line)'}`,
                          background: active ? cat.color + '18' : 'var(--bg)',
                          color: active ? cat.color : 'var(--ink-faint)',
                        }}
                      >
                        {active ? '✓ ' : ''}{cat.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {err && <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>{err}</p>}
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={doImport}
            disabled={importing || toImport === 0}
            style={{ padding: '10px 28px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: importing ? 'not-allowed' : 'pointer', opacity: importing || toImport === 0 ? .5 : 1 }}>
            {importing ? 'Uvozim…' : `Uvezi ${toImport} pitanja →`}
          </button>
        </div>
      </div>
    );
  }

  // step === 'paste'
  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ margin: '0 0 6px', fontSize: 18, fontFamily: 'var(--display)', color: 'var(--ink)' }}>Masovni uvoz pitanja</h2>
      <p style={{ margin: '0 0 20px', color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6 }}>
        Zalijepi tekst s pitanjima ispod. Sustav prepoznaje numerirane upitnike i odgovore A/B/C/D.
        Nakon parsiranja možeš pregledati i ispraviti svako pitanje prije uvoza.
      </p>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px', marginBottom: 16, fontSize: 13, color: 'var(--ink-soft)', lineHeight: 1.7 }}>
        <b style={{ color: 'var(--ink)', fontFamily: 'var(--mono)', fontSize: 12 }}>Primjer formata:</b>
        <pre style={{ margin: '8px 0 0', fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink)', background: 'var(--bg)', padding: '10px 12px', borderRadius: 7, overflowX: 'auto' }}>{
`1. Koja je molekularna formula vode?
A) H2O2
B) H2O
C) HO
D) H3O
Answer: B

2. Što je pH čiste vode pri 25°C?
A) 5
B) 6
C) 7
D) 8
Answer: C`
        }</pre>
      </div>

      <textarea
        style={{ ...inp, minHeight: 320, resize: 'vertical', fontFamily: 'var(--mono)', fontSize: 13, lineHeight: 1.65, marginBottom: 14 }}
        value={raw}
        onChange={e => { setRaw(e.target.value); setErr(''); }}
        placeholder="Zalijepi pitanja ovdje…"
        spellCheck={false}
      />

      {err && <p style={{ color: '#ef4444', fontSize: 13, margin: '0 0 10px' }}>{err}</p>}

      <button
        onClick={doParse}
        disabled={raw.trim().length < 10}
        style={{ padding: '10px 28px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700, cursor: raw.trim().length < 10 ? 'not-allowed' : 'pointer', opacity: raw.trim().length < 10 ? .5 : 1 }}>
        Parsiraj pitanja →
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function AdminQuestionsPage() {
  const [tab,       setTab]       = useState('bank');
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [modal,     setModal]     = useState(null);
  const [allTopics, setAllTopics] = useState([]);
  const [allSyllabusCodes, setAllSyllabusCodes] = useState([]);

  // Filters
  const [search,       setSearch]       = useState('');
  const [filterType,   setFilterType]   = useState('');
  const [filterDiff,   setFilterDiff]   = useState('');
  const [filterStatus, setFilterStatus] = useState('approved');
  const [filterCat,    setFilterCat]    = useState('');
  const [filterCode,   setFilterCode]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filterType) params.type = filterType;
      if (filterDiff) params.difficulty = filterDiff;
      params.status = filterStatus || 'approved';
      setQuestions(await getQuestions(params));
    } finally {
      setLoading(false);
    }
  }, [filterType, filterDiff, filterStatus]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    getCourses().then(courses =>
      Promise.all(courses.map(c =>
        fetch(`/api/teacher/courses/${c.id}/topics`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('molekula_token')}` },
        }).then(r => r.json()).then(d => d.topics || [])
      )).then(arrays => setAllTopics(arrays.flat())).catch(() => {})
    ).catch(() => {});

    getSyllabusCodes().then(codes => setAllSyllabusCodes(codes || [])).catch(() => {});
  }, []);

  const visible = questions.filter(q => {
    if (search && !q.stem.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterCat && !(q.categories || []).includes(filterCat)) return false;
    if (filterCode) {
      const hasCode = (q.syllabus_codes || []).some(sc =>
        sc.code.toLowerCase().includes(filterCode.toLowerCase())
      );
      if (!hasCode) return false;
    }
    return true;
  });

  async function handleSave(fields) {
    if (modal === 'new') {
      const q = await createQuestion({ ...fields, status: 'approved' });
      setQuestions(qs => [q, ...qs]);
    } else {
      const q = await updateQuestion(modal.id, fields);
      setQuestions(qs => qs.map(x => x.id === q.id ? q : x));
    }
  }

  async function handleDelete(q) {
    if (!window.confirm(`Obriši pitanje?\n\n"${q.stem?.slice(0, 80)}…"`)) return;
    await deleteQuestion(q.id);
    setQuestions(qs => qs.filter(x => x.id !== q.id));
  }

  async function handleStatus(q, status) {
    const updated = await setQuestionStatus(q.id, status);
    setQuestions(qs => qs.map(x => x.id === updated.id ? updated : x));
  }

  const selStyle = {
    padding: '7px 10px', borderRadius: 8, border: '1.5px solid var(--line)',
    background: 'var(--surface)', color: 'var(--ink)', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
  };

  const catCounts = {};
  questions.forEach(q => (q.categories || []).forEach(c => { catCounts[c] = (catCounts[c] || 0) + 1; }));

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontFamily: 'var(--display)', color: 'var(--ink)' }}>Baza pitanja</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>Pitanja za kvizove i ispite. Graditelj kviza u drugom tabu.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setTab('bank')} style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid var(--line)', background: tab === 'bank' ? 'var(--accent)' : 'var(--surface)', color: tab === 'bank' ? '#fff' : 'var(--ink-soft)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            📚 Baza pitanja
          </button>
          <button onClick={() => setTab('builder')} style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid var(--line)', background: tab === 'builder' ? 'var(--accent)' : 'var(--surface)', color: tab === 'builder' ? '#fff' : 'var(--ink-soft)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            🧪 Graditelj kviza
          </button>
          <button onClick={() => setTab('import')} style={{ padding: '8px 18px', borderRadius: 9, border: '1.5px solid var(--line)', background: tab === 'import' ? 'var(--accent)' : 'var(--surface)', color: tab === 'import' ? '#fff' : 'var(--ink-soft)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            📋 Uvoz
          </button>
          {tab === 'bank' && (
            <button onClick={() => setModal('new')} style={{ marginLeft: 4, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 9, padding: '8px 18px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              + Novo pitanje
            </button>
          )}
        </div>
      </div>

      {/* ── Question bank tab ── */}
      {tab === 'bank' && (
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Category sidebar */}
          <div style={{ position: 'sticky', top: 80 }}>
            <div style={{ fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 10 }}>Kategorije</div>
            <button
              onClick={() => setFilterCat('')}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '7px 12px', borderRadius: 8, border: `1.5px solid ${!filterCat ? 'var(--accent)' : 'var(--line)'}`, background: !filterCat ? 'var(--accent-wash)' : 'var(--bg)', color: !filterCat ? 'var(--accent-ink)' : 'var(--ink-soft)', fontWeight: !filterCat ? 700 : 400, fontSize: 13, cursor: 'pointer', marginBottom: 4 }}
            >
              Sve ({questions.length})
            </button>
            {CATEGORY_GROUPS.map(grp => (
              <div key={grp.group} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 9, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', textTransform: 'uppercase', letterSpacing: '.08em', padding: '4px 12px 2px' }}>{grp.group}</div>
                {grp.items.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setFilterCat(filterCat === cat.id ? '' : cat.id)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', textAlign: 'left', padding: '6px 12px', borderRadius: 7, border: `1.5px solid ${filterCat === cat.id ? cat.color : 'transparent'}`, background: filterCat === cat.id ? cat.color + '15' : 'transparent', color: filterCat === cat.id ? cat.color : 'var(--ink-soft)', fontWeight: filterCat === cat.id ? 700 : 400, fontSize: 12, cursor: 'pointer', marginBottom: 2 }}
                  >
                    <span>{cat.label}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 10, opacity: .7 }}>{catCounts[cat.id] || 0}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Question list */}
          <div>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ position: 'relative', flex: '1 1 180px', maxWidth: 260 }}>
                <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-faint)' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>
                <input style={{ ...selStyle, paddingLeft: 30, width: '100%', boxSizing: 'border-box' }} placeholder="Pretraži pitanja…" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <input
                style={{ ...selStyle, width: 130, fontFamily: 'var(--mono)', fontSize: 12 }}
                placeholder="Kod (npr. 4.2)"
                value={filterCode}
                onChange={e => setFilterCode(e.target.value)}
                title="Filtriraj po kodu kurikuluma"
              />
              <select style={selStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Sve vrste</option>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
              </select>
              <select style={selStyle} value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                <option value="">Sve težine</option>
                {DIFFICULTIES.map(d => <option key={d} value={d}>{DIFF_LABELS[d]}</option>)}
              </select>
              <select style={selStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                <option value="approved">Odobrena</option>
                <option value="pending_approval">Na čekanju</option>
                <option value="archived">Arhivirana</option>
                <option value="rejected">Odbijena</option>
                <option value="">Sva</option>
              </select>
            </div>

            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-soft)', marginBottom: 10 }}>
              {loading ? 'Učitavam…' : `${visible.length} pitanja${filterCat ? ` · ${CAT_MAP[filterCat]?.label}` : ''}${filterCode ? ` · kod: ${filterCode}` : ''}`}
            </div>

            {!loading && visible.length === 0 && (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-faint)' }}>
                <p>Nema pitanja koja odgovaraju filtru.</p>
              </div>
            )}

            {visible.map(q => (
              <QuestionCard
                key={q.id}
                q={q}
                onEdit={() => setModal(q)}
                onDelete={() => handleDelete(q)}
                onStatus={handleStatus}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Quiz builder tab ── */}
      {tab === 'builder' && (
        <QuizBuilderPanel questions={questions} allTopics={allTopics} />
      )}

      {/* ── Import tab ── */}
      {tab === 'import' && (
        <BulkImportPanel onImported={() => { load(); setTab('bank'); }} />
      )}

      {/* ── Modal ── */}
      {modal && (
        <QuestionModal
          initial={modal === 'new' ? null : modal}
          topics={allTopics}
          allSyllabusCodes={allSyllabusCodes}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
