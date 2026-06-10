import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { getEnrollment, getStudentCourseTopics, getStudentQuizzesByCourse, getStudentMockExams } from '../api/client';

// ─── Score badge ──────────────────────────────────────────────────────────────

function ScoreBadge({ best, max }) {
  if (best === null || best === undefined || !max) return null;
  const pct = Math.round((best / max) * 100);
  const color = pct >= 70 ? '#0f8f86' : pct >= 50 ? '#e6a817' : '#c0392b';
  const bg = pct >= 70 ? '#e7f6f3' : pct >= 50 ? '#fef3db' : '#fde8e8';
  return (
    <span style={{
      padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
      fontFamily: 'var(--mono)', color, background: bg,
    }}>
      {pct}%
    </span>
  );
}

// ─── Quiz row ─────────────────────────────────────────────────────────────────

function QuizRow({ quiz }) {
  const navigate = useNavigate();
  const attempted = quiz.my_attempts > 0;
  const hasBest = quiz.my_best_score !== null && quiz.my_best_score !== undefined;

  return (
    <div
      onClick={() => navigate(`/quizzes/${quiz.id}`)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
        border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm, 12px)',
        background: 'var(--surface)', cursor: 'pointer',
        transition: 'border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,143,134,.08)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {quiz.title}
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--ink-faint)' }}>
          {quiz.questions_count ?? '?'} pitanja
          {quiz.time_limit_minutes ? ` · ${quiz.time_limit_minutes} min` : ''}
          {attempted ? ` · ${quiz.my_attempts} pokušaja` : ''}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        {hasBest && <ScoreBadge best={quiz.my_best_score} max={quiz.my_best_max} />}
        {!attempted && (
          <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Nije pokušano</span>
        )}
        <span style={{ fontSize: 16, color: 'var(--ink-faint)' }}>›</span>
      </div>
    </div>
  );
}

// ─── Topic accordion ──────────────────────────────────────────────────────────

function TopicGroup({ topic, quizzes }) {
  const [open, setOpen] = useState(true);
  const attempted = quizzes.filter(q => q.my_attempts > 0).length;

  return (
    <div style={{ marginBottom: 12 }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', border: '1.5px solid var(--line)',
          borderRadius: open ? 'var(--radius-sm, 12px) var(--radius-sm, 12px) 0 0' : 'var(--radius-sm, 12px)',
          background: 'var(--bg)', cursor: 'pointer', textAlign: 'left',
          transition: 'border-radius .1s',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>{topic.title}</span>
        <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
          {attempted}/{quizzes.length} pokušano
        </span>
        <span style={{ fontSize: 14, color: 'var(--ink-faint)', transform: open ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>›</span>
      </button>

      {open && (
        <div style={{
          border: '1.5px solid var(--line)', borderTop: 'none',
          borderRadius: '0 0 var(--radius-sm, 12px) var(--radius-sm, 12px)',
          padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
          background: 'var(--surface)',
        }}>
          {quizzes.length === 0 ? (
            <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)', textAlign: 'center', padding: '12px 0' }}>
              Nema kvizova za ovu temu.
            </p>
          ) : (
            quizzes.map(q => <QuizRow key={q.id} quiz={q} />)
          )}
        </div>
      )}
    </div>
  );
}

// ─── Mock exam card ───────────────────────────────────────────────────────────

function MockExamCard({ quiz }) {
  const navigate = useNavigate();
  const attempted = quiz.my_attempts > 0;
  const hasBest = quiz.my_best_score !== null && quiz.my_best_score !== undefined;

  return (
    <div
      onClick={() => navigate(`/quizzes/${quiz.id}`)}
      style={{
        padding: '18px 20px', border: '1.5px solid var(--line)',
        borderRadius: 'var(--radius, 16px)', background: 'var(--surface)',
        cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(15,143,134,.1)'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.boxShadow = 'none'; }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
        <div>
          <p style={{ margin: '0 0 4px', fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
            Probni ispit
          </p>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', lineHeight: 1.3 }}>{quiz.title}</h3>
        </div>
        {hasBest && <ScoreBadge best={quiz.my_best_score} max={quiz.my_best_max} />}
      </div>

      <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--ink-faint)', flexWrap: 'wrap' }}>
        {quiz.time_limit_minutes && <span>⏱ {quiz.time_limit_minutes} min</span>}
        <span>📝 {quiz.questions_count ?? '?'} pitanja</span>
        <span>{attempted ? `✓ Pokušano (${quiz.my_attempts}×)` : '○ Nije pokušano'}</span>
        {quiz.pass_score && <span>Prolaz: {quiz.pass_score}%</span>}
      </div>
    </div>
  );
}

// ─── Tab 1 — topic quizzes ────────────────────────────────────────────────────

function TopicQuizzesTab({ enrollment }) {
  const [topics, setTopics] = useState(null);
  const [quizzes, setQuizzes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enrollment?.course_id) return;
    Promise.all([
      getStudentCourseTopics(enrollment.course_id),
      getStudentQuizzesByCourse(enrollment.course_id),
    ])
      .then(([t, q]) => { setTopics(t); setQuizzes(q); })
      .catch(e => setError(e.message));
  }, [enrollment?.course_id]);

  if (!enrollment) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)' }}>Nisi upisan ni u jedan kolegij.</p>
        <Link to="/courses" style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 14 }}>Odaberi kolegij →</Link>
      </div>
    );
  }

  if (error) return <p style={{ color: '#c0392b', padding: '24px', fontSize: 14 }}>{error}</p>;
  if (!topics || !quizzes) return <p style={{ padding: '40px 24px', color: 'var(--ink-faint)', fontSize: 13, fontFamily: 'var(--mono)' }}>Učitavam…</p>;

  const quizByTopic = {};
  quizzes.forEach(q => {
    const tid = q.topic_id;
    if (!quizByTopic[tid]) quizByTopic[tid] = [];
    quizByTopic[tid].push(q);
  });

  const topicsWithQuizzes = topics.filter(t => (quizByTopic[t.id] || []).length > 0);

  if (topicsWithQuizzes.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)' }}>Nema dostupnih kvizova za ovaj kolegij.</p>
      </div>
    );
  }

  return (
    <div>
      {topicsWithQuizzes.map(topic => (
        <TopicGroup key={topic.id} topic={topic} quizzes={quizByTopic[topic.id] || []} />
      ))}
    </div>
  );
}

// ─── Tab 2 — mock exams ───────────────────────────────────────────────────────

function MockExamsTab() {
  const [exams, setExams] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getStudentMockExams()
      .then(setExams)
      .catch(e => setError(e.message));
  }, []);

  if (error) return <p style={{ color: '#c0392b', padding: '24px', fontSize: 14 }}>{error}</p>;
  if (!exams) return <p style={{ padding: '40px 24px', color: 'var(--ink-faint)', fontSize: 13, fontFamily: 'var(--mono)' }}>Učitavam…</p>;

  if (exams.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 24px' }}>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)' }}>Nema dostupnih probnih ispita.</p>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Probni ispiti dostupni su Premium korisnicima kada ih nastavnik objavi.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {exams.map(ex => <MockExamCard key={ex.id} quiz={ex} />)}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'quizzes', label: 'Kvizovi' },
  { id: 'mock', label: 'Probni ispiti' },
];

export default function QuizzesPage() {
  const [tab, setTab] = useState('quizzes');
  const [enrollment, setEnrollment] = useState(undefined);

  useEffect(() => {
    getEnrollment()
      .then(data => setEnrollment(data?.enrollment ?? null))
      .catch(() => setEnrollment(null));
  }, []);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)' }}>Kvizovi</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-faint)' }}>
          Vježbaj gradivo i prati napredak · Practice and track your progress
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--line)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px', border: 'none', cursor: 'pointer',
              background: 'transparent', fontSize: 14, fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? 'var(--accent)' : 'var(--ink-soft)',
              fontFamily: 'var(--body)',
              borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -2,
              transition: 'color .15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'quizzes' && <TopicQuizzesTab enrollment={enrollment} />}
      {tab === 'mock' && <MockExamsTab />}
    </div>
  );
}
