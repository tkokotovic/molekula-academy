import { useState, useEffect, useCallback } from 'react';
import {
  getCourses, createCourse, updateCourse, setCourseStatus, deleteCourse,
  getTopics, createTopic, updateTopic, setTopicStatus, deleteTopicById,
  getLessonsByTopic, createLesson, updateLesson, setLessonStatus, deleteLessonById,
} from '../../api/client';

// ─── Shared helpers ───────────────────────────────────────────────────────────

const STATUS_CYCLE = { draft: 'published', published: 'archived', archived: 'draft' };
const STATUS_LABEL = { draft: 'Skica', published: 'Objavljeno', archived: 'Arhivirano' };
const STATUS_COLOR = {
  draft:     { bg: 'var(--bg)',                                               color: 'var(--ink-soft)', border: 'var(--line)' },
  published: { bg: 'color-mix(in srgb, #22c55e 12%, transparent)',            color: '#16a34a',         border: 'color-mix(in srgb, #22c55e 30%, transparent)' },
  archived:  { bg: 'color-mix(in srgb, var(--ink-soft) 10%, transparent)',    color: 'var(--ink-soft)', border: 'color-mix(in srgb, var(--ink-soft) 20%, transparent)' },
};

function StatusBadge({ status, onClick, loading }) {
  const c = STATUS_COLOR[status] || STATUS_COLOR.draft;
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Klikni za promjenu statusa"
      style={{
        padding: '2px 9px', borderRadius: 20, cursor: 'pointer',
        fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
        background: c.bg, color: c.color,
        border: `1px solid ${c.border}`,
        opacity: loading ? .5 : 1,
        whiteSpace: 'nowrap',
      }}
    >
      {STATUS_LABEL[status] || status}
    </button>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: 14,
          border: '1px solid var(--line)',
          padding: 28, width: 480, maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100vh - 64px)', overflowY: 'auto',
          boxShadow: '0 24px 64px rgba(0,0,0,.22)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--ink-soft)', lineHeight: 1, padding: 4 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase' }}>{label}</div>
      {children}
    </label>
  );
}

const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--bg)',
  color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit',
  outline: 'none',
};

function SaveBtn({ loading, label = 'Spremi' }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        marginTop: 8, width: '100%', padding: '10px 0',
        background: 'var(--accent)', color: '#fff',
        border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 700,
        cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? .6 : 1,
      }}
    >
      {loading ? 'Snimam…' : label}
    </button>
  );
}

// ─── Course modal ─────────────────────────────────────────────────────────────

function CourseModal({ initial, onSave, onClose }) {
  const [title,       setTitle]       = useState(initial?.title       || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [cover,       setCover]       = useState(initial?.cover_image_url || '');
  const [audience,    setAudience]    = useState((initial?.target_audience || []).join(', '));
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const fields = {
        title: title.trim(),
        description: description.trim() || null,
        cover_image_url: cover.trim() || null,
        target_audience: audience.split(',').map(s => s.trim()).filter(Boolean),
      };
      await onSave(fields);
      onClose();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? 'Uredi tečaj' : 'Novi tečaj'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Naziv">
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required />
        </Field>
        <Field label="Opis">
          <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        <Field label="URL naslovne slike">
          <input style={inputStyle} value={cover} onChange={e => setCover(e.target.value)} placeholder="https://…" />
        </Field>
        <Field label="Ciljana publika (odvojeno zarezom)">
          <input style={inputStyle} value={audience} onChange={e => setAudience(e.target.value)} placeholder="IB, Državna matura…" />
        </Field>
        {err && <p style={{ color: '#ef4444', fontSize: 13, marginTop: -6, marginBottom: 8 }}>{err}</p>}
        <SaveBtn loading={saving} />
      </form>
    </Modal>
  );
}

// ─── Topic modal ──────────────────────────────────────────────────────────────

function TopicModal({ initial, onSave, onClose }) {
  const [title,       setTitle]       = useState(initial?.title       || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await onSave({ title: title.trim(), description: description.trim() || null });
      onClose();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? 'Uredi temu' : 'Nova tema'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Naziv">
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required />
        </Field>
        <Field label="Opis">
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={description} onChange={e => setDescription(e.target.value)} />
        </Field>
        {err && <p style={{ color: '#ef4444', fontSize: 13, marginTop: -6, marginBottom: 8 }}>{err}</p>}
        <SaveBtn loading={saving} />
      </form>
    </Modal>
  );
}

// ─── Lesson modal ─────────────────────────────────────────────────────────────

function LessonModal({ initial, onSave, onClose }) {
  const [title,    setTitle]    = useState(initial?.title    || '');
  const [summary,  setSummary]  = useState(initial?.summary  || '');
  const [diff,     setDiff]     = useState(initial?.difficulty || 'medium');
  const [duration, setDuration] = useState(initial?.duration_minutes ?? '');
  const [notes,    setNotes]    = useState(initial?.teacher_notes || '');
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await onSave({
        title:            title.trim(),
        summary:          summary.trim() || null,
        difficulty:       diff,
        duration_minutes: duration !== '' ? Number(duration) : null,
        teacher_notes:    notes.trim() || null,
      });
      onClose();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  return (
    <Modal title={initial ? 'Uredi lekciju' : 'Nova lekcija'} onClose={onClose}>
      <form onSubmit={submit}>
        <Field label="Naziv">
          <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)} required />
        </Field>
        <Field label="Sažetak">
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={summary} onChange={e => setSummary(e.target.value)} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Težina">
            <select style={inputStyle} value={diff} onChange={e => setDiff(e.target.value)}>
              <option value="easy">Lako</option>
              <option value="medium">Srednje</option>
              <option value="hard">Teško</option>
            </select>
          </Field>
          <Field label="Trajanje (min)">
            <input type="number" min="1" max="300" style={inputStyle} value={duration} onChange={e => setDuration(e.target.value)} placeholder="—" />
          </Field>
        </div>
        <Field label="Bilješke učitelja">
          <textarea style={{ ...inputStyle, minHeight: 64, resize: 'vertical' }} value={notes} onChange={e => setNotes(e.target.value)} />
        </Field>
        {err && <p style={{ color: '#ef4444', fontSize: 13, marginTop: -6, marginBottom: 8 }}>{err}</p>}
        <SaveBtn loading={saving} />
      </form>
    </Modal>
  );
}

// ─── Column component ─────────────────────────────────────────────────────────

function Column({ title, count, onAdd, addLabel, children }) {
  return (
    <div style={{
      flex: '1 1 0', minWidth: 200,
      borderRight: '1px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{title}</span>
          {count != null && (
            <span style={{ marginLeft: 7, fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-soft)' }}>{count}</span>
          )}
        </div>
        {onAdd && (
          <button
            onClick={onAdd}
            title={addLabel}
            style={{
              background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: 7,
              width: 28, height: 28, fontSize: 18, lineHeight: '28px',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >＋</button>
        )}
      </div>
      {/* list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

function Row({ label, status, isSelected, onClick, onEdit, onDelete, statusLoading, onStatusClick }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '9px 10px', borderRadius: 9, marginBottom: 2,
        cursor: 'pointer',
        background: isSelected
          ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
          : hovered ? 'var(--bg)' : 'transparent',
        border: `1px solid ${isSelected ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'transparent'}`,
        transition: 'background .12s, border-color .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <span style={{
          flex: 1, minWidth: 0,
          fontSize: 13.5, fontWeight: isSelected ? 700 : 500,
          color: isSelected ? 'var(--accent)' : 'var(--ink)',
          wordBreak: 'break-word', lineHeight: 1.35,
        }}>{label}</span>

        {/* action icons — show on hover or selected */}
        {(hovered || isSelected) && (
          <div
            onClick={e => e.stopPropagation()}
            style={{ display: 'flex', gap: 4, flexShrink: 0 }}
          >
            <button
              onClick={onEdit}
              title="Uredi"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: 'var(--ink-soft)', fontSize: 13 }}
            >✏️</button>
            <button
              onClick={onDelete}
              title="Obriši"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: '#ef4444', fontSize: 13 }}
            >🗑</button>
          </div>
        )}
      </div>

      {status && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ marginTop: 5 }}
        >
          <StatusBadge status={status} onClick={onStatusClick} loading={statusLoading} />
        </div>
      )}
    </div>
  );
}

// ─── AdminContentPage ─────────────────────────────────────────────────────────

export default function AdminContentPage() {
  // ── state ──
  const [courses,       setCourses]       = useState([]);
  const [topics,        setTopics]        = useState([]);
  const [lessons,       setLessons]       = useState([]);
  const [selCourse,     setSelCourse]     = useState(null);
  const [selTopic,      setSelTopic]      = useState(null);
  const [loadingC,      setLoadingC]      = useState(true);
  const [loadingT,      setLoadingT]      = useState(false);
  const [loadingL,      setLoadingL]      = useState(false);
  const [statusBusy,    setStatusBusy]    = useState({});  // { 'c-3': true }

  // modals
  const [courseModal,   setCourseModal]   = useState(null);  // null | 'new' | course-obj
  const [topicModal,    setTopicModal]    = useState(null);
  const [lessonModal,   setLessonModal]   = useState(null);

  // ── loaders ──
  const loadCourses = useCallback(() => {
    setLoadingC(true);
    getCourses().then(setCourses).catch(() => {}).finally(() => setLoadingC(false));
  }, []);

  const loadTopics = useCallback((courseId) => {
    setLoadingT(true);
    setTopics([]); setLessons([]); setSelTopic(null);
    getTopics(courseId).then(setTopics).catch(() => {}).finally(() => setLoadingT(false));
  }, []);

  const loadLessons = useCallback((topicId) => {
    setLoadingL(true);
    setLessons([]);
    getLessonsByTopic(topicId).then(setLessons).catch(() => {}).finally(() => setLoadingL(false));
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  // ── course actions ──
  function selectCourse(c) {
    setSelCourse(c);
    loadTopics(c.id);
  }

  async function cycleStatus(key, id, cur, fn) {
    const next = STATUS_CYCLE[cur] || 'draft';
    setStatusBusy(p => ({ ...p, [key]: true }));
    try {
      const updated = await fn(id, next);
      if (key.startsWith('c-'))  setCourses(cs => cs.map(x => x.id === id ? updated : x));
      if (key.startsWith('t-'))  setTopics(ts  => ts.map(x => x.id === id ? updated : x));
      if (key.startsWith('l-'))  setLessons(ls => ls.map(x => x.id === id ? updated : x));
    } catch (ex) {
      alert(ex.message);
    } finally {
      setStatusBusy(p => ({ ...p, [key]: false }));
    }
  }

  async function handleDeleteCourse(c) {
    if (!window.confirm(`Obriši tečaj "${c.title}"? Ovo je nepovratno.`)) return;
    try {
      await deleteCourse(c.id);
      setCourses(cs => cs.filter(x => x.id !== c.id));
      if (selCourse?.id === c.id) { setSelCourse(null); setTopics([]); setLessons([]); setSelTopic(null); }
    } catch (ex) { alert(ex.message); }
  }

  async function handleDeleteTopic(t) {
    if (!window.confirm(`Obriši temu "${t.title}"?`)) return;
    try {
      await deleteTopicById(t.id);
      setTopics(ts => ts.filter(x => x.id !== t.id));
      if (selTopic?.id === t.id) { setSelTopic(null); setLessons([]); }
    } catch (ex) { alert(ex.message); }
  }

  async function handleDeleteLesson(l) {
    if (!window.confirm(`Obriši lekciju "${l.title}"?`)) return;
    try {
      await deleteLessonById(l.id);
      setLessons(ls => ls.filter(x => x.id !== l.id));
    } catch (ex) { alert(ex.message); }
  }

  // ── render ──
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Courses column ── */}
      <Column
        title="Tečajevi"
        count={courses.length}
        addLabel="Novi tečaj"
        onAdd={() => setCourseModal('new')}
      >
        {loadingC
          ? <Spinner />
          : courses.length === 0
            ? <Empty>Nema tečajeva</Empty>
            : courses.map(c => (
                <Row
                  key={c.id}
                  label={c.title}
                  status={c.status || 'draft'}
                  isSelected={selCourse?.id === c.id}
                  onClick={() => selectCourse(c)}
                  onEdit={() => setCourseModal(c)}
                  onDelete={() => handleDeleteCourse(c)}
                  statusLoading={statusBusy[`c-${c.id}`]}
                  onStatusClick={() => cycleStatus(`c-${c.id}`, c.id, c.status || 'draft', setCourseStatus)}
                />
              ))
        }
      </Column>

      {/* ── Topics column ── */}
      <Column
        title={selCourse ? `Teme · ${selCourse.title}` : 'Teme'}
        count={selCourse ? topics.length : null}
        addLabel="Nova tema"
        onAdd={selCourse ? () => setTopicModal('new') : null}
      >
        {!selCourse
          ? <Empty muted>Odaberi tečaj</Empty>
          : loadingT
            ? <Spinner />
            : topics.length === 0
              ? <Empty>Nema tema</Empty>
              : topics.map(t => (
                  <Row
                    key={t.id}
                    label={t.title}
                    status={t.status || 'draft'}
                    isSelected={selTopic?.id === t.id}
                    onClick={() => { setSelTopic(t); loadLessons(t.id); }}
                    onEdit={() => setTopicModal(t)}
                    onDelete={() => handleDeleteTopic(t)}
                    statusLoading={statusBusy[`t-${t.id}`]}
                    onStatusClick={() => cycleStatus(`t-${t.id}`, t.id, t.status || 'draft', setTopicStatus)}
                  />
                ))
        }
      </Column>

      {/* ── Lessons column ── */}
      <Column
        title={selTopic ? `Lekcije · ${selTopic.title}` : 'Lekcije'}
        count={selTopic ? lessons.length : null}
        addLabel="Nova lekcija"
        onAdd={selTopic ? () => setLessonModal('new') : null}
      >
        {!selTopic
          ? <Empty muted>Odaberi temu</Empty>
          : loadingL
            ? <Spinner />
            : lessons.length === 0
              ? <Empty>Nema lekcija</Empty>
              : lessons.map(l => (
                  <Row
                    key={l.id}
                    label={l.title}
                    status={l.status || 'draft'}
                    isSelected={false}
                    onClick={() => {}}
                    onEdit={() => setLessonModal(l)}
                    onDelete={() => handleDeleteLesson(l)}
                    statusLoading={statusBusy[`l-${l.id}`]}
                    onStatusClick={() => cycleStatus(`l-${l.id}`, l.id, l.status || 'draft', setLessonStatus)}
                  />
                ))
        }
      </Column>

      {/* ── Modals ── */}
      {courseModal && (
        <CourseModal
          initial={courseModal === 'new' ? null : courseModal}
          onClose={() => setCourseModal(null)}
          onSave={async (fields) => {
            if (courseModal === 'new') {
              const c = await createCourse(fields);
              setCourses(cs => [...cs, c]);
            } else {
              const c = await updateCourse(courseModal.id, fields);
              setCourses(cs => cs.map(x => x.id === c.id ? c : x));
              if (selCourse?.id === c.id) setSelCourse(c);
            }
          }}
        />
      )}

      {topicModal && selCourse && (
        <TopicModal
          initial={topicModal === 'new' ? null : topicModal}
          onClose={() => setTopicModal(null)}
          onSave={async (fields) => {
            if (topicModal === 'new') {
              const t = await createTopic(selCourse.id, fields);
              setTopics(ts => [...ts, t]);
            } else {
              const t = await updateTopic(topicModal.id, fields);
              setTopics(ts => ts.map(x => x.id === t.id ? t : x));
              if (selTopic?.id === t.id) setSelTopic(t);
            }
          }}
        />
      )}

      {lessonModal && selTopic && (
        <LessonModal
          initial={lessonModal === 'new' ? null : lessonModal}
          onClose={() => setLessonModal(null)}
          onSave={async (fields) => {
            if (lessonModal === 'new') {
              const l = await createLesson(selTopic.id, fields);
              setLessons(ls => [...ls, l]);
            } else {
              const l = await updateLesson(lessonModal.id, fields);
              setLessons(ls => ls.map(x => x.id === l.id ? l : x));
            }
          }}
        />
      )}
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
      Učitavam…
    </div>
  );
}

function Empty({ children, muted }) {
  return (
    <div style={{
      padding: '32px 12px', textAlign: 'center',
      color: muted ? 'color-mix(in srgb, var(--ink-soft) 50%, transparent)' : 'var(--ink-soft)',
      fontSize: 13, fontStyle: 'italic',
    }}>
      {children}
    </div>
  );
}
