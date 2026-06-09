import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getCourses, createCourse, deleteCourse, logout,
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

// ─── Create/Edit dialog ───────────────────────────────────────────────────────

function CourseDialog({ onSave, onClose }) {
  const [title, setTitle]       = useState('');
  const [description, setDesc]  = useState('');
  const [error, setError]       = useState('');
  const [saving, setSaving]     = useState(false);

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
        <h2 style={{ margin: '0 0 20px', fontSize: 20, color: '#0b343c' }}>Novi kolegij</h2>
        <form onSubmit={handleSubmit}>
          <label htmlFor="course-title" style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 14 }}>
            Naziv (title)
          </label>
          <input
            id="course-title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="npr. IB Kemija HL"
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1.5px solid #ccd9d7', fontSize: 15, boxSizing: 'border-box',
            }}
          />

          <label htmlFor="course-desc" style={{ display: 'block', margin: '16px 0 6px', fontWeight: 600, fontSize: 14 }}>
            Opis (opis)
          </label>
          <textarea
            id="course-desc"
            value={description}
            onChange={e => setDesc(e.target.value)}
            rows={3}
            placeholder="Kratki opis kolegija..."
            style={{
              width: '100%', padding: '10px 14px', borderRadius: 8,
              border: '1.5px solid #ccd9d7', fontSize: 15, resize: 'vertical', boxSizing: 'border-box',
            }}
          />

          {error && (
            <p style={{ color: '#c0392b', marginTop: 8, fontSize: 14 }}>{error}</p>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 24, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={btnSecondary}>
              Odustani
            </button>
            <button type="submit" disabled={saving} style={btnPrimary}>
              {saving ? 'Spremat...' : 'Spremi (save)'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCourses(await getCourses());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  async function handleCreate(fields) {
    await createCourse(fields);
    await refresh();
  }

  async function handleDelete(id) {
    await deleteCourse(id);
    await refresh();
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '40px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
        <h1 style={{ margin: 0, fontSize: 28, color: '#0b343c', fontFamily: 'Bricolage Grotesque, sans-serif' }}>
          Kolegiji (Courses)
        </h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={() => setShowForm(true)} style={btnPrimary}>
            + Novi kolegij (New course)
          </button>
          <button
            onClick={async () => { await logout(); navigate('/login'); }}
            style={{ ...btnPrimary, background: 'transparent', color: '#0b343c', border: '1px solid #0b343c' }}
          >
            Odjava
          </button>
        </div>
      </div>

      {/* List */}
      {loading && <p style={{ color: '#888' }}>Učitavam...</p>}

      {!loading && courses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: '#888' }}>
          <p style={{ fontSize: 18 }}>Nema kolegija (no courses) — kreirajte prvi!</p>
        </div>
      )}

      {!loading && courses.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {courses.map(course => (
            <div key={course.id} style={cardStyle}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                  <Link
                    to={`/courses/${course.id}`}
                    style={{ fontSize: 18, fontWeight: 700, color: '#0b343c', textDecoration: 'none' }}
                  >
                    {course.title}
                  </Link>
                  <StatusBadge status={course.status} />
                </div>
                {course.description && (
                  <p style={{ margin: 0, color: '#5a7a74', fontSize: 14 }}>{course.description}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Link to={`/courses/${course.id}`} style={{ ...btnSecondary, textDecoration: 'none', fontSize: 13 }}>
                  Teme →
                </Link>
                <button
                  onClick={() => handleDelete(course.id)}
                  style={{ ...btnDanger, fontSize: 13 }}
                  aria-label="Obriši (delete)"
                >
                  Obriši
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog */}
      {showForm && (
        <CourseDialog onSave={handleCreate} onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

// ─── Shared button styles ─────────────────────────────────────────────────────

const btnPrimary = {
  background: '#0f8f86', color: '#fff', border: 'none',
  padding: '10px 20px', borderRadius: 8, cursor: 'pointer',
  fontWeight: 600, fontSize: 14,
};

const btnSecondary = {
  background: '#f0f4f3', color: '#0b343c', border: '1.5px solid #ccd9d7',
  padding: '8px 16px', borderRadius: 8, cursor: 'pointer',
  fontWeight: 600, fontSize: 14,
};

const btnDanger = {
  background: '#fff0f0', color: '#c0392b', border: '1.5px solid #f5c6c6',
  padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontWeight: 600,
};

const cardStyle = {
  background: '#fff', border: '1.5px solid #e0eae8', borderRadius: 12,
  padding: '18px 20px', display: 'flex', alignItems: 'center',
  gap: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
};
