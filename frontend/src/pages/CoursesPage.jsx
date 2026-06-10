import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getEnrollment, getStudentCourses } from '../api/client';

function fmtDate(value) {
  if (!value) return null;
  const d = new Date(value.includes('T') ? value : value.replace(' ', 'T') + 'Z');
  if (isNaN(d)) return null;
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function CourseInitial({ title, size = 44, fontSize = 18, muted = false }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: 12, flexShrink: 0,
      background: muted ? 'var(--bg)' : 'var(--accent-wash)',
      display: 'grid', placeItems: 'center',
      color: muted ? 'var(--ink-faint)' : 'var(--accent-ink)',
      fontFamily: 'var(--mono)', fontWeight: 700, fontSize,
    }}>
      {(title || '?')[0]}
    </div>
  );
}

// ─── Active enrolled course — the highlighted hero card ─────────────────────────

function ActiveCourseCard({ enrollment }) {
  const enrolledOn = fmtDate(enrollment.enrolled_at);
  return (
    <Link to={`/courses/${enrollment.course_id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        position: 'relative', overflow: 'hidden',
        border: '2px solid var(--accent)', borderRadius: 16,
        background: 'var(--accent-wash)', padding: '28px 28px 26px',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, letterSpacing: '.06em',
          color: 'var(--accent-ink)', textTransform: 'uppercase', marginBottom: 12,
        }}>
          ● Tvoj kolegij
        </div>

        <h2 style={{
          margin: '0 0 8px', fontFamily: 'var(--display)', fontWeight: 800,
          fontSize: 26, color: 'var(--ink)', lineHeight: 1.2,
        }}>
          {enrollment.course_title}
        </h2>

        {enrollment.course_description && (
          <p style={{ margin: '0 0 18px', fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6, maxWidth: 560 }}>
            {enrollment.course_description}
          </p>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15,
            padding: '10px 20px', borderRadius: 10,
          }}>
            Nastavi učiti
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
          {enrolledOn && (
            <span style={{ fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
              Upisano {enrolledOn}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ─── No active enrollment ───────────────────────────────────────────────────────

function NoEnrollment() {
  return (
    <div style={{
      border: '2px dashed var(--line)', borderRadius: 16, padding: '32px 28px',
      textAlign: 'center', background: 'var(--surface)',
    }}>
      <p style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
        Još nisi upisan/a ni na jedan kolegij.
      </p>
      <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
        Odaberi kolegij iz kataloga ispod kako bi započeo/la s učenjem.
      </p>
    </div>
  );
}

// ─── Locked catalogue card ──────────────────────────────────────────────────────

function LockedCourseCard({ course }) {
  return (
    <div style={{
      border: '1.5px solid var(--line)', borderRadius: 12, background: 'var(--surface)',
      padding: '18px 22px', display: 'flex', alignItems: 'center', gap: 16, opacity: 0.85,
    }}>
      <CourseInitial title={course.title} muted />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 2 }}>
          {course.title}
        </div>
        {course.description && (
          <p style={{
            margin: 0, color: 'var(--ink-faint)', fontSize: 13.5, lineHeight: 1.45,
            overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
          }}>
            {course.description}
          </p>
        )}
      </div>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
        background: 'var(--bg)', color: 'var(--ink-faint)', fontSize: 12.5, fontWeight: 600,
        padding: '6px 12px', borderRadius: 20,
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Zaključano
      </span>
    </div>
  );
}

// ─── Previous course row ────────────────────────────────────────────────────────

function PreviousCourseRow({ course }) {
  const left = fmtDate(course.unenrolled_at);
  return (
    <Link to={`/courses/${course.course_id}`} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
        borderRadius: 10, transition: 'background .12s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        <CourseInitial title={course.course_title} size={34} fontSize={14} muted />
        <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--ink-soft)' }}>
          {course.course_title}
        </span>
        {left && (
          <span style={{ fontSize: 12.5, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
            do {left}
          </span>
        )}
        <span style={{ color: 'var(--ink-faint)', fontSize: 16 }}>›</span>
      </div>
    </Link>
  );
}

// ─── Section heading ────────────────────────────────────────────────────────────

function SectionHead({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{
        margin: 0, fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)',
      }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ margin: '3px 0 0', fontSize: 13.5, color: 'var(--ink-faint)' }}>{subtitle}</p>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function CoursesPage() {
  const [active, setActive]     = useState(null);
  const [previous, setPrevious] = useState([]);
  const [courses, setCourses]   = useState([]);
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [enr, cat] = await Promise.all([getEnrollment(), getStudentCourses()]);
      setActive(enr.enrollment || null);
      setPrevious(enr.previous || []);
      setCourses(cat || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Catalogue = published courses the student is neither actively enrolled in
  // nor previously enrolled in. Those show up in their own sections.
  const previousIds = new Set(previous.map(p => p.course_id));
  const locked = courses.filter(c => c.id !== active?.course_id && !previousIds.has(c.id));

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontFamily: 'var(--display)', fontWeight: 800, fontSize: 30, color: 'var(--ink)' }}>
          Kolegiji
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: 'var(--ink-soft)' }}>
          Nastavi gdje si stao/la ili istraži što te još čeka.
        </p>
      </div>

      {loading && <p style={{ color: 'var(--ink-faint)' }}>Učitavam…</p>}

      {!loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
          {/* Active enrolled course */}
          <section>
            {active ? <ActiveCourseCard enrollment={active} /> : <NoEnrollment />}
          </section>

          {/* Locked catalogue */}
          {locked.length > 0 && (
            <section>
              <SectionHead
                title="Katalog"
                subtitle="Otključaj dodatne kolegije kupnjom paketa."
              />
              <div style={{ display: 'grid', gap: 12 }}>
                {locked.map(c => <LockedCourseCard key={c.id} course={c} />)}
              </div>
            </section>
          )}

          {/* Previous courses */}
          {previous.length > 0 && (
            <section>
              <SectionHead title="Prethodni kolegiji" />
              <div style={{
                border: '1.5px solid var(--line)', borderRadius: 12,
                background: 'var(--surface)', padding: 6,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                {previous.map(c => <PreviousCourseRow key={c.id} course={c} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
