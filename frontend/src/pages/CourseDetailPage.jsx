import { useState, useEffect, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getStudentCourse, getStudentCourseTopics, createTopic, deleteTopicById,
  getStudentLessonsByTopic,
} from '../api/client';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_LABELS = { draft: 'Nacrt', published: 'Objavljeno', archived: 'Arhivirano' };
const STATUS_COLORS = {
  draft:     { background: '#f0f4f3', color: '#5a7a74' },
  published: { background: '#d4f5f0', color: '#0b343c' },
  archived:  { background: '#e8e8e8', color: '#888'    },
};

function StatusBadge({ status }) {
  const style = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ ...style, padding: '2px 10px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ─── Topic dialog ─────────────────────────────────────────────────────────────

function TopicDialog({ onSave, onClose }) {
  const [title, setTitle]      = useState('');
  const [description, setDesc] = useState('');
  const [error, setError]      = useState('');
  const [saving, setSaving]    = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) { setError('Naziv je obavezan (title required)'); return; }
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description });
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100,
      }}
    >
      <div style={{
        background: '#fff', borderRadius: 12, padding: 32, width: 460, maxWidth: '90vw',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
      }}>
        <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#0b343c' }}>Nova tema (New topic)</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="topic-title" style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
            Naziv (title)
          </label>
          <input
            id="topic-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="npr. Atomska struktura"
            style={inputStyle}
          />

          <label htmlFor="topic-desc" style={{ display: 'block', margin: '16px 0 6px', fontWeight: 600, fontSize: 14 }}>
            Opis
          </label>
          <textarea
            id="topic-desc"
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            placeholder="Kratki opis teme..."
            style={{ ...inputStyle, resize: 'vertical' }}
          />

          {error && <p style={{ color: '#c0392b', marginTop: 8, fontSize: 14 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Odustani</button>
            <button type="submit" disabled={saving} style={btnPrimary}>
              {saving ? 'Spremat...' : 'Spremi (save)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Topic card with lesson list ──────────────────────────────────────────────

function TopicCard({ topic, courseId, onDelete }) {
  const [lessons, setLessons] = useState([]);
  const [expanded, setExpanded] = useState(true);
  const [loadingLessons, setLoadingLessons] = useState(false);

  useEffect(() => {
    setLoadingLessons(true);
    getStudentLessonsByTopic(topic.id)
      .then(setLessons)
      .catch(() => setLessons([]))
      .finally(() => setLoadingLessons(false));
  }, [topic.id]);

  return (
    <div style={cardStyle}>
      {/* Topic header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
        <button
          onClick={() => setExpanded(e => !e)}
          aria-label={expanded ? 'Sažmi' : 'Proširi'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px', color: 'var(--ink-faint)', fontSize: 16, lineHeight: 1, flexShrink: 0 }}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{topic.title}</span>
            <StatusBadge status={topic.status} />
            <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
              {lessons.length} lekcija
            </span>
          </div>
          {topic.description && (
            <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)', fontSize: 14 }}>{topic.description}</p>
          )}
        </div>
        <button
          onClick={() => onDelete(topic.id)}
          style={{ ...btnDanger, fontSize: 13, flexShrink: 0 }}
          aria-label="Obriši temu"
        >
          Obriši
        </button>
      </div>

      {/* Lesson list */}
      {expanded && (
        <div style={{ width: '100%', marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--line)' }}>
          {loadingLessons && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)', paddingLeft: 32 }}>Učitavam lekcije…</p>
          )}
          {!loadingLessons && lessons.length === 0 && (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)', paddingLeft: 32 }}>
              Nema lekcija u ovoj temi.
            </p>
          )}
          {!loadingLessons && lessons.map((lesson, idx) => (
            <Link
              key={lesson.id}
              to={`/courses/${courseId}/topics/${topic.id}/lessons/${lesson.id}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 8px 8px 32px',
                textDecoration: 'none',
                color: 'var(--ink-soft)',
                fontSize: 14,
                borderRadius: 8,
                transition: 'background .13s, color .13s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent-wash)'; e.currentTarget.style.color = 'var(--accent-ink)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--ink-soft)'; }}
            >
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', minWidth: 18, textAlign: 'right' }}>
                {idx + 1}.
              </span>
              <span style={{ flex: 1 }}>{lesson.title}</span>
              {lesson.duration_minutes && (
                <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
                  {lesson.duration_minutes} min
                </span>
              )}
              <StatusBadge status={lesson.status} />
              <span style={{ color: 'var(--accent)', fontSize: 16, marginLeft: 2 }}>›</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CourseDetailPage() {
  const { courseId } = useParams();
  const [course, setCourse]   = useState(null);
  const [topics, setTopics]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [courseData, topicList] = await Promise.all([
        getStudentCourse(Number(courseId)),
        getStudentCourseTopics(Number(courseId)),
      ]);
      setCourse(courseData);
      setTopics(topicList);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate(fields) {
    await createTopic(Number(courseId), fields);
    await refresh();
  }

  async function handleDelete(id) {
    await deleteTopicById(id);
    await refresh();
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 20, fontSize: 14, color: 'var(--ink-faint)' }}>
        <Link to="/courses" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>
          ← Kolegiji (Courses)
        </Link>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: 'var(--ink)', fontFamily: 'var(--display)' }}>
          {loading ? '…' : (course?.title || 'Kolegij')}
        </h1>
        <button onClick={() => setShowForm(true)} style={btnPrimary}>
          + Nova tema
        </button>
      </div>

      {/* Topic list */}
      {loading && <p style={{ color: 'var(--ink-faint)' }}>Učitavam...</p>}

      {!loading && topics.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-faint)' }}>
          <p style={{ fontSize: 18 }}>Nema tema — dodajte prvu!</p>
        </div>
      )}

      {!loading && topics.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {topics.map(topic => (
            <TopicCard
              key={topic.id}
              topic={topic}
              courseId={courseId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      {showForm && (
        <TopicDialog onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1.5px solid #ccd9d7', fontSize: 15, boxSizing: 'border-box',
};

const btnPrimary = {
  background: '#0f8f86', color: '#fff', border: 'none',
  padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};

const btnSecondary = {
  background: '#f0f4f3', color: '#0b343c', border: '1.5px solid #ccd9d7',
  padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14,
};

const btnDanger = {
  background: '#fff0f0', color: '#c0392b', border: '1.5px solid #f5c6c6',
  padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};

const cardStyle = {
  background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 12,
  padding: '16px 18px', display: 'flex', flexDirection: 'column',
  gap: 0, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
};
