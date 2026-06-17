import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getCourses, createCourse, updateCourse, deleteCourse, setCourseStatus,
  getTopics, createTopic, updateTopic, deleteTopicById, setTopicStatus,
  getLessonsByTopic, createLesson, updateLesson, deleteLessonById, setLessonStatus,
  getLibraryLessons, createLibraryLesson, forkLesson,
  getLessonForks, pushLessonToForks,
} from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL = { draft: 'Skica', published: 'Objavljeno', scheduled: 'Zakazano', archived: 'Arhivirano' };
const STATUS_COLOR = { draft: '#f59e0b', published: '#10b981', scheduled: '#6366f1', archived: '#94a3b8' };
// Clicking a scheduled badge cancels back to draft
const STATUS_NEXT  = { draft: 'published', published: 'archived', archived: 'draft', scheduled: 'draft' };

function StatusBadge({ status, onClick, loading }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      title="Klikni za promjenu statusa"
      style={{
        padding: '2px 8px', borderRadius: 99, border: 'none', cursor: 'pointer',
        fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '.05em',
        background: STATUS_COLOR[status] + '22', color: STATUS_COLOR[status],
        opacity: loading ? 0.5 : 1,
      }}
    >
      {STATUS_LABEL[status] ?? status}
    </button>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
    >
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 12, padding: '28px 28px 24px', width: 460, maxWidth: '95vw',
        boxShadow: '0 20px 60px rgba(0,0,0,.25)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: 'var(--ink-soft)', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5, letterSpacing: '.04em', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid var(--line)',
  background: 'var(--bg)', color: 'var(--ink)', fontSize: 13.5, boxSizing: 'border-box',
  outline: 'none',
};

const btnPrimary = {
  padding: '8px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
  background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 13,
};
const btnGhost = {
  padding: '8px 16px', borderRadius: 8, border: '1px solid var(--line)', cursor: 'pointer',
  background: 'none', color: 'var(--ink-soft)', fontSize: 13,
};

// ─── Course modal ─────────────────────────────────────────────────────────────

function CourseModal({ course, onClose, onSaved }) {
  const [title, setTitle] = useState(course?.title ?? '');
  const [description, setDescription] = useState(course?.description ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (course) {
        await updateCourse(course.id, { title, description });
      } else {
        await createCourse({ title, description });
      }
      onSaved();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={course ? 'Uredi kolegij' : 'Novi kolegij'} onClose={onClose}>
      <Field label="Naziv">
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
      </Field>
      <Field label="Opis (opcionalno)">
        <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }}
          value={description} onChange={e => setDescription(e.target.value)} />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button style={btnGhost} onClick={onClose}>Odustani</button>
        <button style={{ ...btnPrimary, opacity: saving || !title.trim() ? 0.6 : 1 }} onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Sprema...' : 'Spremi'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Topic modal ──────────────────────────────────────────────────────────────

function TopicModal({ courseId, topic, onClose, onSaved }) {
  const [title, setTitle] = useState(topic?.title ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (topic) {
        await updateTopic(topic.id, { title });
      } else {
        await createTopic(courseId, { title });
      }
      onSaved();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={topic ? 'Uredi poglavlje' : 'Novo poglavlje'} onClose={onClose}>
      <Field label="Naziv poglavlja">
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button style={btnGhost} onClick={onClose}>Odustani</button>
        <button style={{ ...btnPrimary, opacity: saving || !title.trim() ? 0.6 : 1 }} onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Sprema...' : 'Spremi'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Lesson modal ─────────────────────────────────────────────────────────────

function LessonModal({ topicId, lesson, onClose, onSaved }) {
  const [title, setTitle] = useState(lesson?.title ?? '');
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!title.trim()) return;
    setSaving(true);
    try {
      if (lesson) {
        await updateLesson(lesson.id, { title });
      } else {
        await createLesson(topicId, { title });
      }
      onSaved();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal title={lesson ? 'Uredi lekciju' : 'Nova lekcija'} onClose={onClose}>
      <Field label="Naziv lekcije">
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button style={btnGhost} onClick={onClose}>Odustani</button>
        <button style={{ ...btnPrimary, opacity: saving || !title.trim() ? 0.6 : 1 }} onClick={save} disabled={saving || !title.trim()}>
          {saving ? 'Sprema...' : 'Spremi'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Lesson row ───────────────────────────────────────────────────────────────

function LessonRow({ lesson, topicId, onRefresh }) {
  const navigate = useNavigate();
  const [statusLoading, setStatusLoading] = useState(false);
  const [editing, setEditing] = useState(false);

  async function cycleStatus() {
    setStatusLoading(true);
    try {
      await setLessonStatus(lesson.id, STATUS_NEXT[lesson.status] ?? 'draft');
      onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setStatusLoading(false);
    }
  }

  async function del() {
    if (!window.confirm(`Obriši lekciju "${lesson.title}"?`)) return;
    try {
      await deleteLessonById(lesson.id);
      onRefresh();
    } catch (e) {
      alert(e.message);
    }
  }

  return (
    <>
      {editing && (
        <LessonModal topicId={topicId} lesson={lesson} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onRefresh(); }} />
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px 7px 36px',
        borderTop: '1px solid var(--line)', background: 'transparent',
      }}>
        <span style={{ fontSize: 13, color: 'var(--ink)', flex: 1, lineHeight: 1.4 }}>
          {lesson.title}
          {lesson.master_title && (
            <span title={`Forkano iz biblioteke: ${lesson.master_title}`}
              style={{ marginLeft: 8, fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent)', background: 'var(--accent)11', padding: '1px 6px', borderRadius: 99, whiteSpace: 'nowrap' }}>
              ⑂ iz biblioteke
            </span>
          )}
          {lesson.syllabus_codes_csv && (
            <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', marginLeft: 8 }}>
              {lesson.syllabus_codes_csv.split(',').map(code => (
                <span key={code} style={{
                  fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 600,
                  padding: '1px 6px', borderRadius: 99,
                  background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  color: 'var(--accent-ink)',
                  border: '1px solid color-mix(in srgb, var(--accent) 25%, transparent)',
                  whiteSpace: 'nowrap',
                }}>{code}</span>
              ))}
            </span>
          )}
        </span>
        <StatusBadge status={lesson.status ?? 'draft'} onClick={cycleStatus} loading={statusLoading} />
        <button
          onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)}
          title="Uredi sadržaj lekcije"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: 'var(--accent)' }}
        >✏️</button>
        <button onClick={() => setEditing(true)} title="Preimenuj"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: 'var(--ink-soft)' }}>
          ≡
        </button>
        <button onClick={del} title="Obriši"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 4px', color: '#ef4444' }}>
          ✕
        </button>
      </div>
    </>
  );
}

// ─── Topic accordion ──────────────────────────────────────────────────────────

function TopicAccordion({ topic, courseId, onRefresh }) {
  const [open, setOpen] = useState(true);
  const [lessons, setLessons] = useState(null);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingLesson, setAddingLesson] = useState(false);
  const [pickingLibrary, setPickingLibrary] = useState(false);

  useEffect(() => {
    if (open && lessons === null) loadLessons();
  }, [open]);

  async function loadLessons() {
    setLoadingLessons(true);
    try {
      const data = await getLessonsByTopic(topic.id);
      setLessons(data);
    } catch {
      setLessons([]);
    } finally {
      setLoadingLessons(false);
    }
  }

  async function cycleStatus() {
    setStatusLoading(true);
    try {
      await setTopicStatus(topic.id, STATUS_NEXT[topic.status] ?? 'draft');
      onRefresh();
    } catch (e) {
      alert(e.message);
    } finally {
      setStatusLoading(false);
    }
  }

  async function del() {
    if (!window.confirm(`Obriši poglavlje "${topic.title}" i sve lekcije?`)) return;
    try {
      await deleteTopicById(topic.id);
      onRefresh();
    } catch (e) {
      alert(e.message);
    }
  }

  function refreshLessons() {
    loadLessons();
  }

  return (
    <>
      {editing && (
        <TopicModal courseId={courseId} topic={topic} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onRefresh(); }} />
      )}
      {addingLesson && (
        <LessonModal topicId={topic.id} onClose={() => setAddingLesson(false)} onSaved={() => { setAddingLesson(false); refreshLessons(); }} />
      )}
      {pickingLibrary && (
        <LibraryPickerModal topicId={topic.id} onClose={() => setPickingLibrary(false)} onForked={() => { setPickingLibrary(false); refreshLessons(); }} />
      )}

      <div style={{ border: '1px solid var(--line)', borderRadius: 9, overflow: 'hidden', marginBottom: 8 }}>
        {/* Topic header */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px',
          background: 'var(--bg)', cursor: 'pointer',
        }} onClick={() => setOpen(o => !o)}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', userSelect: 'none', marginRight: 2 }}>
            {open ? '▾' : '▸'}
          </span>
          <span style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink)', flex: 1 }}>{topic.title}</span>
          <StatusBadge status={topic.status ?? 'draft'} onClick={e => { e.stopPropagation(); cycleStatus(); }} loading={statusLoading} />
          <button onClick={e => { e.stopPropagation(); setEditing(true); }} title="Uredi poglavlje"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 5px', color: 'var(--ink-soft)' }}>
            ≡
          </button>
          <button onClick={e => { e.stopPropagation(); del(); }} title="Obriši poglavlje"
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 5px', color: '#ef4444' }}>
            ✕
          </button>
        </div>

        {/* Lessons */}
        {open && (
          <div>
            {loadingLessons && (
              <div style={{ padding: '8px 36px', fontSize: 12, color: 'var(--ink-soft)' }}>Učitavanje…</div>
            )}
            {lessons && lessons.length === 0 && (
              <div style={{ padding: '8px 36px', fontSize: 12, color: 'var(--ink-soft)', borderTop: '1px solid var(--line)' }}>
                Nema lekcija
              </div>
            )}
            {lessons && lessons.map(l => (
              <LessonRow key={l.id} lesson={l} topicId={topic.id} onRefresh={refreshLessons} />
            ))}
            <div style={{ borderTop: '1px solid var(--line)', padding: '6px 12px 6px 36px', display: 'flex', gap: 16 }}>
              <button
                onClick={() => setAddingLesson(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, padding: 0 }}
              >
                + Nova lekcija
              </button>
              <button
                onClick={() => setPickingLibrary(true)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12.5, color: 'var(--accent)', fontWeight: 600, padding: 0 }}
              >
                ⑂ Iz biblioteke
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Course detail view ───────────────────────────────────────────────────────

function CourseDetail({ course, onBack, onCourseUpdated }) {
  const [topics, setTopics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addingTopic, setAddingTopic] = useState(false);
  const [editingCourse, setEditingCourse] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  useEffect(() => { loadTopics(); }, [course.id]);

  async function loadTopics() {
    setLoading(true);
    try {
      const data = await getTopics(course.id);
      setTopics(data);
    } catch {
      setTopics([]);
    } finally {
      setLoading(false);
    }
  }

  async function cycleStatus() {
    setStatusLoading(true);
    try {
      await setCourseStatus(course.id, STATUS_NEXT[course.status] ?? 'draft');
      onCourseUpdated();
    } catch (e) {
      alert(e.message);
    } finally {
      setStatusLoading(false);
    }
  }

  return (
    <>
      {editingCourse && (
        <CourseModal course={course} onClose={() => setEditingCourse(false)} onSaved={() => { setEditingCourse(false); onCourseUpdated(); }} />
      )}
      {addingTopic && (
        <TopicModal courseId={course.id} onClose={() => setAddingTopic(false)} onSaved={() => { setAddingTopic(false); loadTopics(); }} />
      )}

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <button onClick={onBack} style={{ ...btnGhost, marginBottom: 16, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Svi kolegiji
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 24, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>
            {course.title}
          </h1>
          <StatusBadge status={course.status ?? 'draft'} onClick={cycleStatus} loading={statusLoading} />
          <button onClick={() => setEditingCourse(true)} style={btnGhost}>Uredi kolegij</button>
        </div>
        {course.description && (
          <p style={{ margin: '8px 0 0', fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.55 }}>
            {course.description}
          </p>
        )}
        <div style={{ marginTop: 10, display: 'flex', gap: 16, fontSize: 12.5, color: 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>
          <span>{topics?.length ?? '—'} poglavlja</span>
          <span>·</span>
          <span>{course.lesson_count ?? '—'} lekcija</span>
          <span>·</span>
          <span>{course.enrolled_count ?? 0} upisanih</span>
        </div>
      </div>

      {/* Topics tree */}
      {loading && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Učitavanje…</div>}
      {!loading && topics && topics.length === 0 && (
        <div style={{
          padding: '32px 24px', border: '1px dashed var(--line)', borderRadius: 10,
          textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13.5,
        }}>
          Nema poglavlja. Dodaj prvo poglavlje.
        </div>
      )}
      {!loading && topics && topics.map(t => (
        <TopicAccordion key={t.id} topic={t} courseId={course.id} onRefresh={loadTopics} />
      ))}

      {!loading && (
        <button
          onClick={() => setAddingTopic(true)}
          style={{
            marginTop: 12, padding: '9px 16px', borderRadius: 8,
            border: '1px dashed var(--line)', background: 'none', cursor: 'pointer',
            fontSize: 13, color: 'var(--accent)', fontWeight: 600, width: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}
        >
          + Novo poglavlje
        </button>
      )}
    </>
  );
}

// ─── Course card ──────────────────────────────────────────────────────────────

function CourseCard({ course, onSelect, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  async function cycleStatus(e) {
    e.stopPropagation();
    setStatusLoading(true);
    try {
      await setCourseStatus(course.id, STATUS_NEXT[course.status] ?? 'draft');
      onRefresh();
    } catch (err) {
      alert(err.message);
    } finally {
      setStatusLoading(false);
    }
  }

  async function del(e) {
    e.stopPropagation();
    if (!window.confirm(`Obriši kolegij "${course.title}"? Ova akcija je nepovratna.`)) return;
    try {
      await deleteCourse(course.id);
      onRefresh();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      {editing && (
        <CourseModal course={course} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); onRefresh(); }} />
      )}
      <div
        onClick={() => onSelect(course)}
        style={{
          background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
          padding: '20px 20px 16px', cursor: 'pointer', transition: 'box-shadow .15s',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}
        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.1)'}
        onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
      >
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 15.5, color: 'var(--ink)', flex: 1, lineHeight: 1.3 }}>
            {course.title}
          </div>
          <StatusBadge status={course.status ?? 'draft'} onClick={cycleStatus} loading={statusLoading} />
        </div>

        {/* Description */}
        {course.description && (
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {course.description}
          </div>
        )}

        {/* Stats */}
        <div style={{ display: 'flex', gap: 14, fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', marginTop: 4 }}>
          <span>{course.topic_count ?? 0} pogl.</span>
          <span>·</span>
          <span>{course.lesson_count ?? 0} lekcija</span>
          <span>·</span>
          <span>{course.enrolled_count ?? 0} upisanih</span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4, borderTop: '1px solid var(--line)', paddingTop: 10 }}
          onClick={e => e.stopPropagation()}>
          <button
            onClick={e => { e.stopPropagation(); setEditing(true); }}
            style={{ ...btnGhost, fontSize: 12, padding: '5px 12px' }}
          >Uredi</button>
          <button onClick={del} style={{ ...btnGhost, fontSize: 12, padding: '5px 12px', color: '#ef4444', borderColor: '#fca5a5' }}>
            Obriši
          </button>
          <button
            onClick={e => { e.stopPropagation(); onSelect(course); }}
            style={{ ...btnPrimary, fontSize: 12, padding: '5px 12px', marginLeft: 'auto' }}
          >Otvori →</button>
        </div>
      </div>
    </>
  );
}

// ─── Library picker (fork a master lesson INTO a given topic) ──────────────────

function LibraryPickerModal({ topicId, onClose, onForked }) {
  const [lessons, setLessons] = useState(null);
  const [search, setSearch] = useState('');
  const [forkingId, setForkingId] = useState(null);

  useEffect(() => {
    getLibraryLessons().then(setLessons).catch(() => setLessons([]));
  }, []);

  async function fork(masterId) {
    setForkingId(masterId);
    try {
      await forkLesson(masterId, topicId);
      onForked();
    } catch (e) {
      alert(e.message);
      setForkingId(null);
    }
  }

  const filtered = (lessons ?? []).filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <Modal title="Dodaj lekciju iz biblioteke" onClose={onClose}>
      <p style={{ margin: '0 0 12px', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Stvara se nezavisna kopija lekcije u ovom kolegiju. Uređivanje kopije ne mijenja original.
      </p>
      <input style={{ ...inputStyle, marginBottom: 12 }} placeholder="Pretraži biblioteku…"
        value={search} onChange={e => setSearch(e.target.value)} autoFocus />
      <div style={{ maxHeight: 320, overflowY: 'auto', margin: '0 -4px' }}>
        {lessons === null && <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-soft)' }}>Učitavanje…</div>}
        {lessons && filtered.length === 0 && (
          <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-soft)' }}>
            {lessons.length === 0 ? 'Biblioteka je prazna.' : 'Nema rezultata.'}
          </div>
        )}
        {filtered.map(l => (
          <div key={l.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
            borderRadius: 8, border: '1px solid var(--line)', marginBottom: 6,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{l.title}</div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>
                {l.block_count ?? 0} blokova · {l.fork_count ?? 0} kopija
              </div>
            </div>
            <button onClick={() => fork(l.id)} disabled={forkingId === l.id}
              style={{ ...btnPrimary, fontSize: 12, padding: '5px 12px', opacity: forkingId === l.id ? 0.6 : 1 }}>
              {forkingId === l.id ? 'Dodajem…' : 'Dodaj →'}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
        <button style={btnGhost} onClick={onClose}>Zatvori</button>
      </div>
    </Modal>
  );
}

// ─── Course+topic picker (fork a master lesson into a chosen course) ───────────

function CourseTopicPickerModal({ masterLesson, onClose, onForked }) {
  const [courses, setCourses] = useState(null);
  const [courseId, setCourseId] = useState('');
  const [topics, setTopics] = useState(null);
  const [topicId, setTopicId] = useState('');
  const [forking, setForking] = useState(false);

  useEffect(() => {
    getCourses().then(setCourses).catch(() => setCourses([]));
  }, []);

  useEffect(() => {
    if (!courseId) { setTopics(null); setTopicId(''); return; }
    setTopics(null);
    getTopics(courseId).then(t => { setTopics(t); setTopicId(t[0]?.id ?? ''); }).catch(() => setTopics([]));
  }, [courseId]);

  async function fork() {
    if (!topicId) return;
    setForking(true);
    try {
      await forkLesson(masterLesson.id, topicId);
      onForked();
    } catch (e) {
      alert(e.message);
      setForking(false);
    }
  }

  return (
    <Modal title={`Dodaj "${masterLesson.title}" u kolegij`} onClose={onClose}>
      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Stvara se nezavisna, potpuno uredljiva kopija. Original u biblioteci ostaje netaknut.
      </p>
      <Field label="Kolegij">
        <select style={inputStyle} value={courseId} onChange={e => setCourseId(e.target.value)} autoFocus>
          <option value="">— odaberi kolegij —</option>
          {(courses ?? []).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
      </Field>
      <Field label="Poglavlje">
        <select style={inputStyle} value={topicId} onChange={e => setTopicId(e.target.value)} disabled={!courseId || !topics}>
          {!courseId && <option value="">— prvo odaberi kolegij —</option>}
          {courseId && topics && topics.length === 0 && <option value="">— kolegij nema poglavlja —</option>}
          {(topics ?? []).map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
        </select>
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button style={btnGhost} onClick={onClose}>Odustani</button>
        <button style={{ ...btnPrimary, opacity: forking || !topicId ? 0.6 : 1 }} onClick={fork} disabled={forking || !topicId}>
          {forking ? 'Dodajem…' : 'Dodaj kopiju'}
        </button>
      </div>
    </Modal>
  );
}

// ─── Push master content to forks ──────────────────────────────────────────────

function SyncChip({ inSync }) {
  const color = inSync ? '#10b981' : '#f59e0b';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 99, fontSize: 10.5, fontFamily: 'var(--mono)',
      fontWeight: 700, background: color + '22', color, whiteSpace: 'nowrap',
    }}>
      {inSync ? 'Usklađeno' : 'Razlikuje se'}
    </span>
  );
}

function PushToForksModal({ masterLesson, onClose, onDone }) {
  const [data, setData] = useState(null);
  const [selected, setSelected] = useState(() => new Set());
  const [pushing, setPushing] = useState(false);

  useEffect(() => {
    getLessonForks(masterLesson.id).then(d => {
      setData(d);
      // default-select only the copies that differ from the master
      setSelected(new Set(d.forks.filter(f => !f.in_sync).map(f => f.id)));
    }).catch(() => setData({ master: {}, forks: [] }));
  }, []);

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function push() {
    if (selected.size === 0) return;
    setPushing(true);
    try {
      await pushLessonToForks(masterLesson.id, Array.from(selected));
      onDone();
    } catch (e) {
      alert(e.message);
      setPushing(false);
    }
  }

  return (
    <Modal title={`Ažuriraj kopije — ${masterLesson.title}`} onClose={onClose}>
      <p style={{ margin: '0 0 14px', fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.5 }}>
        Zamjenjuje sadržaj odabranih kopija trenutnim sadržajem master lekcije
        {data?.master?.block_count != null && ` (${data.master.block_count} blokova)`}. Ova akcija je nepovratna.
      </p>

      {data === null && <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-soft)' }}>Učitavanje…</div>}
      {data && data.forks.length === 0 && (
        <div style={{ padding: 12, fontSize: 12.5, color: 'var(--ink-soft)' }}>Ova lekcija nema kopija u kolegijima.</div>
      )}

      <div style={{ maxHeight: 320, overflowY: 'auto', margin: '0 -2px' }}>
        {data && data.forks.map(f => (
          <label key={f.id} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
            border: '1px solid var(--line)', borderRadius: 8, marginBottom: 6, cursor: 'pointer',
          }}>
            <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)}
              style={{ width: 15, height: 15, accentColor: 'var(--accent)' }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {f.course_title} <span style={{ color: 'var(--ink-soft)', fontWeight: 400 }}>· {f.topic_title}</span>
              </div>
              <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', marginTop: 1 }}>
                {f.title} · {f.block_count} blokova
              </div>
            </div>
            <SyncChip inSync={f.in_sync} />
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
        <button style={btnGhost} onClick={onClose}>Odustani</button>
        <button style={{ ...btnPrimary, opacity: pushing || selected.size === 0 ? 0.6 : 1 }}
          onClick={push} disabled={pushing || selected.size === 0}>
          {pushing ? 'Ažuriram…' : `Ažuriraj odabrane (${selected.size})`}
        </button>
      </div>
    </Modal>
  );
}

// ─── Library view (the repository of all master lessons) ───────────────────────

function LibraryLessonRow({ lesson, onRefresh }) {
  const navigate = useNavigate();
  const [forkingTo, setForkingTo] = useState(false);
  const [pushing, setPushing] = useState(false);

  return (
    <>
      {forkingTo && (
        <CourseTopicPickerModal masterLesson={lesson} onClose={() => setForkingTo(false)}
          onForked={() => { setForkingTo(false); onRefresh(); }} />
      )}
      {pushing && (
        <PushToForksModal masterLesson={lesson} onClose={() => setPushing(false)}
          onDone={() => { setPushing(false); onRefresh(); }} />
      )}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        border: '1px solid var(--line)', borderRadius: 10, marginBottom: 8, background: 'var(--surface)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--display)' }}>{lesson.title}</div>
          <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', marginTop: 2 }}>
            {lesson.block_count ?? 0} blokova
            {lesson.fork_count > 0 && <span style={{ color: 'var(--accent)' }}> · u {lesson.fork_count} {lesson.fork_count === 1 ? 'kolegiju' : 'kolegija'}</span>}
          </div>
        </div>
        <button onClick={() => navigate(`/admin/lessons/${lesson.id}/edit`)} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>
          ✏️ Uredi sadržaj
        </button>
        {lesson.fork_count > 0 && (
          <button onClick={() => setPushing(true)} style={{ ...btnGhost, fontSize: 12, padding: '6px 12px' }}>
            ⟳ Ažuriraj kopije
          </button>
        )}
        <button onClick={() => setForkingTo(true)} style={{ ...btnPrimary, fontSize: 12, padding: '6px 12px' }}>
          + Dodaj u kolegij
        </button>
      </div>
    </>
  );
}

function LibraryView() {
  const [lessons, setLessons] = useState(null);
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLessons(await getLibraryLessons());
    } catch {
      setLessons([]);
    }
  }

  const filtered = (lessons ?? []).filter(l =>
    l.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {creating && (
        <LibraryCreateModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <input style={{ ...inputStyle, maxWidth: 320 }} placeholder="Pretraži lekcije…"
          value={search} onChange={e => setSearch(e.target.value)} />
        <button onClick={() => setCreating(true)} style={{ ...btnPrimary, marginLeft: 'auto' }}>
          + Nova lekcija
        </button>
      </div>

      {lessons === null && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Učitavanje…</div>}

      {lessons && filtered.length === 0 && (
        <div style={{
          padding: '40px 24px', border: '1px dashed var(--line)', borderRadius: 12,
          textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14,
        }}>
          {lessons.length === 0
            ? 'Biblioteka je prazna. Stvori master lekciju koju možeš ponovno koristiti u više kolegija.'
            : 'Nema rezultata.'}
        </div>
      )}

      {filtered.map(l => <LibraryLessonRow key={l.id} lesson={l} onRefresh={load} />)}
    </>
  );
}

function LibraryCreateModal({ onClose, onSaved }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  async function save(openEditor) {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const lesson = await createLibraryLesson({ title });
      if (openEditor) {
        navigate(`/admin/lessons/${lesson.id}/edit`);
      } else {
        onSaved();
      }
    } catch (e) {
      alert(e.message);
      setSaving(false);
    }
  }

  return (
    <Modal title="Nova master lekcija" onClose={onClose}>
      <Field label="Naziv lekcije">
        <input style={inputStyle} value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save(true)} autoFocus />
      </Field>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button style={btnGhost} onClick={onClose}>Odustani</button>
        <button style={{ ...btnGhost, opacity: saving || !title.trim() ? 0.6 : 1 }} onClick={() => save(false)} disabled={saving || !title.trim()}>
          Spremi
        </button>
        <button style={{ ...btnPrimary, opacity: saving || !title.trim() ? 0.6 : 1 }} onClick={() => save(true)} disabled={saving || !title.trim()}>
          Spremi i uredi sadržaj →
        </button>
      </div>
    </Modal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminCoursesPage() {
  const [tab, setTab] = useState('courses'); // 'courses' | 'library'
  const [courses, setCourses] = useState(null);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await getCourses();
      setCourses(data);
      // keep selected in sync if it was open
      if (selected) {
        const refreshed = data.find(c => c.id === selected.id);
        if (refreshed) setSelected(refreshed);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  // If a course is selected, show detail view
  if (selected) {
    const fresh = courses?.find(c => c.id === selected.id) ?? selected;
    return (
      <div style={{ padding: '32px 32px 64px', maxWidth: 760 }}>
        <CourseDetail
          course={fresh}
          onBack={() => setSelected(null)}
          onCourseUpdated={() => { load(); }}
        />
      </div>
    );
  }

  // List view with tabs
  return (
    <div style={{ padding: '32px 32px 64px', maxWidth: 900 }}>
      {creating && (
        <CourseModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}

      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4 }}>
            Sadržaj
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)' }}>
            Kolegiji i lekcije
          </h1>
        </div>
        {tab === 'courses' && (
          <button onClick={() => setCreating(true)} style={{ ...btnPrimary, marginLeft: 'auto' }}>
            + Novi kolegij
          </button>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--line)' }}>
        {[
          { id: 'courses', label: 'Kolegiji' },
          { id: 'library', label: '⑂ Biblioteka lekcija' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: 600,
              color: tab === t.id ? 'var(--ink)' : 'var(--ink-soft)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Courses tab */}
      {tab === 'courses' && (
        <>
          {loading && <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>Učitavanje…</div>}
          {!loading && courses && courses.length === 0 && (
            <div style={{
              padding: '48px 24px', border: '1px dashed var(--line)', borderRadius: 12,
              textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14,
            }}>
              Nema kolegija. Klikni "Novi kolegij" za početak.
            </div>
          )}
          {!loading && courses && courses.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {courses.map(c => (
                <CourseCard key={c.id} course={c} onSelect={setSelected} onRefresh={load} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Library tab */}
      {tab === 'library' && <LibraryView />}
    </div>
  );
}
