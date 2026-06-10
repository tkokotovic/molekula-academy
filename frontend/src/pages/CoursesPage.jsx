import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getStudentCourses } from '../api/client';

const STATUS_LABELS = { draft: 'Nacrt', published: 'Objavljeno', archived: 'Arhivirano' };
const STATUS_COLORS = {
  draft:     { background: 'var(--bg)', color: 'var(--ink-soft)' },
  published: { background: 'color-mix(in srgb,#22c55e 12%,transparent)', color: '#16a34a' },
  archived:  { background: 'color-mix(in srgb,var(--ink-soft) 10%,transparent)', color: 'var(--ink-soft)' },
};

function StatusBadge({ status }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.draft;
  return (
    <span style={{ ...s, padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)' }}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try { setCourses(await getStudentCourses()); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="page-head" style={{ marginBottom: 28 }}>
        <h1>Kolegiji</h1>
        <p>Odaberi kolegij i nastavi gdje si stao/la.</p>
      </div>

      {loading && <p style={{ color: 'var(--ink-faint)' }}>Učitavam…</p>}

      {!loading && courses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-faint)' }}>
          <p style={{ fontSize: 18 }}>Još nema dostupnih kolegija.</p>
        </div>
      )}

      {!loading && courses.length > 0 && (
        <div style={{ display: 'grid', gap: 12 }}>
          {courses.map(course => (
            <Link
              key={course.id}
              to={`/courses/${course.id}`}
              style={{ textDecoration: 'none' }}
            >
              <div className="card" style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                  background: 'var(--accent-wash)', display: 'grid', placeItems: 'center',
                  color: 'var(--accent-ink)', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18,
                }}>
                  {course.title[0]}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>{course.title}</span>
                    <StatusBadge status={course.status} />
                  </div>
                  {course.description && (
                    <p style={{ margin: 0, color: 'var(--ink-soft)', fontSize: 14 }}>{course.description}</p>
                  )}
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ink-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
