import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMe } from '../api/client';
import { getStudentStats, getCourseProgress } from '../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Dobro jutro';
  if (h < 18) return 'Dobar dan';
  return 'Dobra večer';
}

function formatTime(seconds) {
  if (!seconds || seconds === 0) return '0 min';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m} min`;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const FlameIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
    <path d="M13.5 0.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5 0.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/>
  </svg>
);

const BookIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4z"/>
    <path d="M18 7v13"/>
  </svg>
);

const ChartIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>
  </svg>
);

const QuizIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M9 9a3 3 0 113.9 2.9c-.9.3-1.4 1-1.4 2.1"/>
    <circle cx="11.5" cy="18" r=".6" fill="currentColor"/>
    <rect x="3" y="3" width="18" height="18" rx="4"/>
  </svg>
);

const CalIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="5" width="18" height="16" rx="3"/>
    <path d="M3 9h18M8 3v4M16 3v4"/>
  </svg>
);

const ArrowRight = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M5 12h14M13 6l6 6-6 6"/>
  </svg>
);

const VideoIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="3" y="6" width="13" height="12" rx="2"/>
    <path d="M16 10l5-3v10l-5-3"/>
  </svg>
);

const TrophyIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M6 3H18M5 3v5a7 7 0 0014 0V3M12 15v6M8 21h8"/>
    <path d="M5 8H3a2 2 0 000 4h2M19 8h2a2 2 0 010 4h-2"/>
  </svg>
);

// ─── Streak badge ─────────────────────────────────────────────────────────────

function StreakBadge({ days }) {
  const colour = days >= 7 ? '#ff6b35' : days >= 3 ? '#f59e0b' : 'var(--accent)';
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `color-mix(in srgb, ${colour} 14%, var(--surface))`,
      border: `1.5px solid color-mix(in srgb, ${colour} 35%, transparent)`,
      borderRadius: 999, padding: '5px 14px 5px 10px',
    }}>
      <FlameIcon width={16} height={16} style={{ color: colour }} />
      <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: colour }}>
        {days}
      </span>
      <span style={{ fontSize: 13, color: 'var(--ink-soft)', marginLeft: 2 }}>
        {days === 1 ? 'dan zaredom' : days < 5 ? 'dana zaredom' : 'dana zaredom'}
      </span>
    </div>
  );
}

// ─── Continue learning card ───────────────────────────────────────────────────

function ContinueCard({ courses }) {
  // Find the course with the most in-progress lessons first, then least progress
  const inProgress = courses
    .filter(c => c.in_progress_lessons > 0 || (c.completed_lessons > 0 && c.completion_pct < 100))
    .sort((a, b) => {
      if (b.in_progress_lessons !== a.in_progress_lessons) return b.in_progress_lessons - a.in_progress_lessons;
      return a.completion_pct - b.completion_pct;
    });

  if (inProgress.length === 0) {
    const notStarted = courses.filter(c => c.completion_pct === 0);
    if (notStarted.length > 0) {
      return <ContinueCardUI course={notStarted[0]} cta="Počni učiti" />;
    }
    return (
      <div className="continue" style={{ textAlign: 'center', padding: '32px 28px' }}>
        <TrophyIcon width={36} height={36} style={{ color: 'rgba(255,255,255,.8)', margin: '0 auto 12px' }} />
        <h2 style={{ fontSize: 22 }}>Sve lekcije završene!</h2>
        <p style={{ color: 'rgba(255,255,255,.7)', marginTop: 8 }}>
          Provjeri kvizove ili pričekaj novi sadržaj.
        </p>
      </div>
    );
  }

  return <ContinueCardUI course={inProgress[0]} cta="Nastavi učiti" />;
}

function ContinueCardUI({ course, cta }) {
  const barColour = course.completion_pct >= 70 ? '#1ec8b6' : course.completion_pct >= 40 ? '#f59e0b' : '#1ec8b6';
  return (
    <div className="continue">
      {/* Background decoration */}
      <div style={{
        position: 'absolute', right: -40, top: -40,
        width: 200, height: 200, borderRadius: '50%',
        background: 'rgba(255,255,255,.04)', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', right: 20, bottom: -60,
        width: 160, height: 160, borderRadius: '50%',
        background: 'rgba(255,255,255,.03)', pointerEvents: 'none',
      }} />

      <span style={{
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'rgba(255,255,255,.6)',
      }}>
        {cta}
      </span>
      <h2>{course.course_title}</h2>
      <p className="meta">
        {course.completed_lessons} / {course.total_lessons} lekcija &middot; {course.completion_pct}% završeno
      </p>

      {/* Progress bar */}
      <div style={{
        height: 6, borderRadius: 999, background: 'rgba(255,255,255,.15)', margin: '16px 0 20px', overflow: 'hidden',
      }}>
        <div style={{
          width: `${course.completion_pct}%`, height: '100%', borderRadius: 999,
          background: barColour, transition: 'width .6s var(--ease)',
        }} />
      </div>

      <Link
        to={`/courses/${course.course_id}`}
        className="btn btn-white btn-sm"
        style={{ textDecoration: 'none', display: 'inline-flex', gap: 8, alignItems: 'center' }}
      >
        <BookIcon width={15} height={15} />
        Otvori kurs
        <ArrowRight width={14} height={14} />
      </Link>
    </div>
  );
}

// ─── Course progress list ─────────────────────────────────────────────────────

function CourseProgressList({ courses }) {
  if (courses.length === 0) {
    return (
      <p style={{ color: 'var(--ink-faint)', fontSize: 14, padding: '12px 0' }}>
        Nema dostupnih kurseva.
      </p>
    );
  }

  const colours = ['#1ec8b6', '#0f8f86', '#f59e0b', '#6366f1', '#ec4899'];

  return (
    <div>
      {courses.map((c, i) => (
        <Link
          key={c.course_id}
          to={`/courses/${c.course_id}`}
          className="course-row"
          style={{ textDecoration: 'none', display: 'flex' }}
        >
          {/* Colour dot */}
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: colours[i % colours.length], flexShrink: 0, marginTop: 6,
          }} />
          <div className="mini-track" style={{ flex: 1 }}>
            <div className="nm">{c.course_title}</div>
            <div className="ct">
              {c.completed_lessons}/{c.total_lessons} lekcija
              {c.in_progress_lessons > 0 && ` · ${c.in_progress_lessons} u tijeku`}
            </div>
            <div className="bar">
              <i style={{
                width: `${c.completion_pct}%`,
                background: colours[i % colours.length],
              }} />
            </div>
          </div>
          <div className="pct" style={{ alignSelf: 'center', marginLeft: 12 }}>
            {c.completion_pct}%
          </div>
        </Link>
      ))}
    </div>
  );
}

// ─── Quick links ──────────────────────────────────────────────────────────────

const QUICK_LINKS = [
  { to: '/courses',  label: 'Svi kursevi', Icon: BookIcon,  colour: '#0f8f86' },
  { to: '/progress', label: 'Napredak',    Icon: ChartIcon, colour: '#6366f1' },
  { to: '/quizzes',  label: 'Kvizovi',     Icon: QuizIcon,  colour: '#f59e0b' },
  { to: '/schedule', label: 'Zakaži Zoom', Icon: VideoIcon, colour: '#ec4899' },
];

function QuickLinks() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--line)',
      borderRadius: 'var(--radius)', padding: '20px',
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 14,
      }}>
        Brzi pristup
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {QUICK_LINKS.map(({ to, label, Icon, colour }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 8, padding: '16px 10px', borderRadius: 12,
              border: '1.5px solid var(--line)', textDecoration: 'none',
              background: 'var(--bg)', transition: 'border-color .15s, transform .15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = colour; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10,
              background: `color-mix(in srgb, ${colour} 14%, var(--surface))`,
              display: 'grid', placeItems: 'center',
            }}>
              <Icon width={18} height={18} style={{ color: colour }} />
            </div>
            <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 500, textAlign: 'center' }}>
              {label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Zoom card ────────────────────────────────────────────────────────────────

function UpcomingSession() {
  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px solid var(--line)',
      borderRadius: 'var(--radius)', padding: '20px',
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 14,
      }}>
        Sljedeća sesija
      </div>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '14px', borderRadius: 12,
        background: 'color-mix(in srgb, var(--accent) 8%, var(--bg))',
        border: '1.5px solid color-mix(in srgb, var(--accent) 20%, transparent)',
        marginBottom: 14,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: 'var(--accent)', display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <VideoIcon width={18} height={18} style={{ color: '#fff' }} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
            Nije zakazana
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
            Premium: 1 besplatna/mj.
          </div>
        </div>
      </div>
      <Link
        to="/schedule"
        className="btn btn-primary btn-sm"
        style={{
          textDecoration: 'none', display: 'flex',
          justifyContent: 'center', gap: 7, alignItems: 'center', width: '100%',
        }}
      >
        <CalIcon width={15} height={15} />
        Zakaži sesiju
      </Link>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 18, radius = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'var(--line)', animation: 'pulse 1.4s ease-in-out infinite',
    }} />
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [user, setUser]       = useState(null);
  const [stats, setStats]     = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [me, st, co] = await Promise.all([
          getMe(),
          getStudentStats(),
          getCourseProgress(),
        ]);
        if (!mounted) return;
        setUser(me);
        setStats(st);
        setCourses(co);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const firstName = user?.name?.split(' ')[0] ?? '';

  // ── Stats row values ────────────────────────────────────────────────────────
  const statItems = [
    {
      v: loading ? null : (stats?.total_lessons_completed ?? 0),
      l: 'Lekcija završeno',
    },
    {
      v: loading ? null : formatTime(stats?.total_time_spent_seconds),
      l: 'Ukupno učenja',
    },
    {
      v: loading ? null : (stats?.avg_score_pct != null ? `${stats.avg_score_pct}%` : '—'),
      l: 'Prosj. rezultat',
    },
    {
      v: loading ? null : (stats?.total_quizzes_taken ?? 0),
      l: 'Kvizova rješeno',
    },
  ];

  if (error) {
    return (
      <div className="content">
        <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <p style={{ color: '#d6492f' }}>Greška pri učitavanju: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p style={{
            fontFamily: 'var(--mono)', fontSize: 11.5, letterSpacing: '.08em',
            textTransform: 'uppercase', color: 'var(--accent-ink)', marginBottom: 6,
          }}>
            {greeting()}
          </p>
          {loading ? (
            <Skeleton w={220} h={38} radius={10} />
          ) : (
            <h1 style={{
              fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34,
              color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0,
            }}>
              {firstName ? `Dobrodošao, ${firstName}!` : 'Dobrodošao!'}
            </h1>
          )}
        </div>

        {/* Streak badge */}
        {!loading && stats && (
          <div style={{ paddingTop: 4 }}>
            <StreakBadge days={stats.current_streak_days ?? 0} />
          </div>
        )}
      </div>

      {/* Strongest / weakest topic hint */}
      {!loading && stats?.strongest_topic && (
        <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginTop: 8 }}>
          Najjača tema:{' '}
          <strong style={{ color: 'var(--ink)' }}>{stats.strongest_topic.title}</strong>
          {' '}({stats.strongest_topic.avg_score_pct}%)
          {stats.weakest_topic && (
            <>
              {' · '}Radi na:{' '}
              <strong style={{ color: 'var(--ink)' }}>{stats.weakest_topic.title}</strong>
              {' '}({stats.weakest_topic.avg_score_pct}%)
            </>
          )}
        </p>
      )}

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      <div className="stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: 24 }}>
        {statItems.map(({ v, l }) => (
          <div key={l} className="stat">
            {v === null ? (
              <>
                <Skeleton w="60%" h={28} radius={6} />
                <Skeleton w="80%" h={14} radius={4} style={{ marginTop: 6 }} />
              </>
            ) : (
              <>
                <div className="v">{v}</div>
                <div className="l">{l}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div className="dash-grid">
        {/* Left column */}
        <div className="col">
          {/* Continue learning */}
          {loading ? (
            <Skeleton w="100%" h={200} radius={16} />
          ) : (
            <ContinueCard courses={courses} />
          )}

          {/* All courses progress */}
          <div style={{
            background: 'var(--surface)', border: '1.5px solid var(--line)',
            borderRadius: 'var(--radius)', padding: '20px 24px',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
            }}>
              <span style={{
                fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
                textTransform: 'uppercase', color: 'var(--ink-faint)',
              }}>
                Svi kursevi
              </span>
              <Link
                to="/courses"
                style={{
                  fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--accent-ink)',
                  textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Svi <ArrowRight width={13} height={13} />
              </Link>
            </div>
            {loading ? (
              <div style={{ display: 'grid', gap: 14 }}>
                <Skeleton w="100%" h={52} radius={8} />
                <Skeleton w="100%" h={52} radius={8} />
              </div>
            ) : (
              <CourseProgressList courses={courses} />
            )}
          </div>
        </div>

        {/* Right column */}
        <div className="col">
          <QuickLinks />
          <UpcomingSession />
        </div>
      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .45; }
        }
      `}</style>
    </div>
  );
}
