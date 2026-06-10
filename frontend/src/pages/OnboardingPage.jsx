import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isAuthenticated, getStudentCourses, enroll, updateProfile } from '../api/client';

const LOGO = (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10,
    fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24,
    letterSpacing: '-0.03em', color: 'var(--ink)' }}>
    <span style={{ width: 30, height: 34, position: 'relative', display: 'inline-grid', placeItems: 'center' }}>
      <span style={{ position: 'absolute', inset: 0,
        clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
        background: 'var(--accent)' }} />
      <span style={{ position: 'relative', color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13 }}>M</span>
    </span>
    Molekula
  </span>
);

export default function OnboardingPage() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated()) navigate('/login', { replace: true });
  }, [navigate]);

  const [step, setStep]           = useState(1); // 1 | 2 | 3
  const [courses, setCourses]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [examDate, setExamDate]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [enrolledCourse, setEnrolledCourse] = useState(null);

  // Load user name from token for welcome screen
  let userName = '';
  try {
    const payload = JSON.parse(atob(localStorage.getItem('molekula_token').split('.')[1]));
    userName = payload.name || payload.email || '';
  } catch {}

  useEffect(() => {
    getStudentCourses()
      .then(cs => setCourses(cs || []))
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleEnroll() {
    if (!selectedId) return;
    setSaving(true);
    setError('');
    try {
      await enroll(selectedId);
      setEnrolledCourse(courses.find(c => c.id === selectedId));
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleExamDate(skip = false) {
    setSaving(true);
    setError('');
    try {
      if (!skip && examDate) {
        await updateProfile({ exam_date: examDate });
      }
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex',
      flexDirection: 'column', alignItems: 'center', padding: '40px 24px' }}>

      {/* Header */}
      <div style={{ marginBottom: 40 }}>{LOGO}</div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 40 }}>
        {[1, 2, 3].map(n => (
          <div key={n} style={{
            width: n === step ? 24 : 8, height: 8,
            borderRadius: 4,
            background: n <= step ? 'var(--accent)' : 'var(--line-strong)',
            transition: 'width .25s ease, background .25s ease',
          }} />
        ))}
      </div>

      {/* ─── Step 1: Pick course ─── */}
      {step === 1 && (
        <div style={{ width: '100%', maxWidth: 680 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800,
            color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
            Odaberi kolegij
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 15,
            marginBottom: 32 }}>
            Koji kolegij ćeš pohađati? Uvijek možeš zamoliti Tomislava za promjenu.
          </p>

          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>Učitavanje…</p>
          ) : courses.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
              Nema dostupnih kolegija. Kontaktiraj Tomislava.
            </p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
              {courses.map(c => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    background: selectedId === c.id ? 'var(--accent)' : 'var(--surface)',
                    border: `2px solid ${selectedId === c.id ? 'var(--accent)' : 'var(--line)'}`,
                    borderRadius: 'var(--radius)',
                    padding: '20px 22px',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'border-color .15s, background .15s',
                  }}
                >
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16,
                    color: selectedId === c.id ? '#fff' : 'var(--ink)', marginBottom: 6 }}>
                    {c.title}
                  </div>
                  {c.description && (
                    <div style={{ fontSize: 13, color: selectedId === c.id ? 'rgba(255,255,255,.8)' : 'var(--ink-soft)',
                      lineHeight: 1.5 }}>
                      {c.description.length > 100 ? c.description.slice(0, 100) + '…' : c.description}
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <p style={{ textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13, marginTop: 24 }}>
            Ne možeš se odlučiti?{' '}
            <a href="mailto:tomislav@molekula.hr" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
              Kontaktiraj Tomislava →
            </a>
          </p>

          {error && <p style={{ color: '#c0392b', textAlign: 'center', fontSize: 14, marginTop: 12 }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
            <button
              className="btn btn-primary"
              onClick={handleEnroll}
              disabled={!selectedId || saving}
              style={{ minWidth: 180, justifyContent: 'center' }}
            >
              {saving ? 'Upisujem…' : 'Nastavi →'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 2: Exam date ─── */}
      {step === 2 && (
        <div style={{ width: '100%', maxWidth: 480 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800,
            color: 'var(--ink)', textAlign: 'center', marginBottom: 8 }}>
            Datum ispita
          </h1>
          <p style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 15,
            marginBottom: 32 }}>
            Unesi datum ispita i mi ćemo pratiti koliko dana ostaje. Možeš preskočiti i postaviti kasnije.
          </p>

          <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)', padding: '32px 28px' }}>
            <label style={{ display: 'block', fontWeight: 600, fontSize: 14,
              color: 'var(--ink)', marginBottom: 8 }}>
              Datum ispita (opcionalno)
            </label>
            <input
              type="date"
              value={examDate}
              onChange={e => setExamDate(e.target.value)}
              style={{ width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-sm)',
                border: '1.5px solid var(--line-strong)', fontSize: 15,
                fontFamily: 'var(--body)', color: 'var(--ink)', background: 'var(--bg)',
                outline: 'none', boxSizing: 'border-box' }}
            />
          </div>

          {error && <p style={{ color: '#c0392b', textAlign: 'center', fontSize: 14, marginTop: 12 }}>{error}</p>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', marginTop: 28 }}>
            <button
              className="btn"
              onClick={() => handleExamDate(true)}
              disabled={saving}
              style={{ minWidth: 120, justifyContent: 'center',
                background: 'var(--surface)', border: '1.5px solid var(--line)',
                color: 'var(--ink-soft)' }}
            >
              Preskoči
            </button>
            <button
              className="btn btn-primary"
              onClick={() => handleExamDate(false)}
              disabled={saving}
              style={{ minWidth: 160, justifyContent: 'center' }}
            >
              {saving ? 'Spremam…' : 'Nastavi →'}
            </button>
          </div>
        </div>
      )}

      {/* ─── Step 3: Welcome ─── */}
      {step === 3 && (
        <div style={{ width: '100%', maxWidth: 520, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 24 }}>🎉</div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800,
            color: 'var(--ink)', marginBottom: 12 }}>
            Dobrodošao/la, {userName.split(' ')[0]}!
          </h1>
          <p style={{ color: 'var(--ink-soft)', fontSize: 16, lineHeight: 1.6, marginBottom: 8 }}>
            Tvoj kolegij{' '}
            <strong style={{ color: 'var(--ink)' }}>
              {enrolledCourse?.title || 'je spreman'}
            </strong>{' '}
            je spreman.
          </p>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginBottom: 40 }}>
            Sve lekcije, kvizovi i materijali su dostupni. Krenimo!
          </p>

          <button
            className="btn btn-primary"
            onClick={() => navigate('/dashboard', { replace: true })}
            style={{ minWidth: 200, justifyContent: 'center', fontSize: 16, padding: '14px 28px' }}
          >
            Počni učiti →
          </button>
        </div>
      )}
    </div>
  );
}
