import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getMe, getStudentStats, getCourseProgress, getEnrollment, getStudentHomework, getStudentSessions } from '../api/client';

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

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target - now) / (1000 * 60 * 60 * 24));
}

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' });
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

const ClipboardIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
    <rect x="8" y="2" width="8" height="4" rx="1"/>
    <path d="M8 4H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-2"/>
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
        {days === 1 ? 'dan zaredom' : 'dana zaredom'}
      </span>
    </div>
  );
}

// ─── Exam countdown ───────────────────────────────────────────────────────────

function ExamCountdown({ examDate }) {
  const days = daysUntil(examDate);

  if (!examDate) {
    return (
      <div style={{
        background: 'var(--surface)', border: '1.5px dashed var(--line)',
        borderRadius: 'var(--radius)', padding: '20px',
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
          textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 10,
        }}>
          Datum ispita
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 12, margin: '0 0 12px' }}>
          Postavi datum svog ispita za osobni odbrojnik.
        </p>
        <Link to="/settings" style={{
          fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent-ink)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4,
        }}>
          Postavi datum <ArrowRight width={12} height={12} />
        </Link>
      </div>
    );
  }

  if (days < 0) return null;

  const urgency = days <= 7 ? '#d6492f' : days <= 30 ? '#f59e0b' : 'var(--accent)';
  const dayWord = days === 1 ? 'dan' : 'dana';
  const msg = days === 0
    ? 'Ispit je danas — sretno!'
    : days === 1
    ? 'Ispit je sutra — sretno!'
    : null;

  return (
    <div style={{
      background: `color-mix(in srgb, ${urgency} 8%, var(--surface))`,
      border: `1.5px solid color-mix(in srgb, ${urgency} 30%, transparent)`,
      borderRadius: 'var(--radius)', padding: '20px',
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 12,
      }}>
        Do ispita
      </div>
      {days > 1 ? (
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 44, lineHeight: 1,
            color: urgency,
          }}>
            {days}
          </span>
          <span style={{ fontSize: 15, color: 'var(--ink-soft)' }}>{dayWord}</span>
        </div>
      ) : (
        <p style={{ fontSize: 16, fontWeight: 700, color: urgency, marginBottom: 4 }}>
          {msg}
        </p>
      )}
      <p style={{ fontSize: 13, color: 'var(--ink-faint)', margin: 0 }}>
        {days > 1 ? `Ispit ${fmtDate(examDate)}` : msg}
      </p>
    </div>
  );
}

// ─── Homework card (conditional) ──────────────────────────────────────────────

function HomeworkCard({ homework }) {
  const pending = (homework || []).filter(h => !h.is_overdue);
  if (pending.length === 0) return null;

  function fmtDue(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short' });
  }

  const urgentCount = pending.filter(h => {
    const d = daysUntil(h.due_date);
    return d !== null && d <= 3;
  }).length;

  const accentColor = urgentCount > 0 ? '#f59e0b' : 'var(--accent)';

  return (
    <div style={{
      background: urgentCount > 0
        ? 'color-mix(in srgb, #f59e0b 8%, var(--surface))'
        : 'var(--surface)',
      border: urgentCount > 0
        ? '1.5px solid color-mix(in srgb, #f59e0b 30%, transparent)'
        : '1.5px solid var(--line)',
      borderRadius: 'var(--radius)', padding: '20px',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12,
      }}>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
          textTransform: 'uppercase', color: 'var(--ink-faint)',
        }}>
          Domaće zadaće
        </span>
        <span style={{
          fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700,
          background: accentColor, color: '#fff', borderRadius: 999, padding: '2px 8px',
        }}>
          {pending.length}
        </span>
      </div>
      <div style={{ display: 'grid', gap: 8 }}>
        {pending.slice(0, 3).map(h => {
          const d = daysUntil(h.due_date);
          const urgent = d !== null && d <= 3;
          return (
            <Link
              key={h.id}
              to="/quizzes"
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 10,
                background: 'var(--bg)',
                border: `1.5px solid ${urgent ? 'color-mix(in srgb, #f59e0b 35%, transparent)' : 'var(--line)'}`,
                textDecoration: 'none',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500 }}>
                {h.title}
              </span>
              {h.due_date && (
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 11.5, flexShrink: 0, marginLeft: 8,
                  color: urgent ? '#f59e0b' : 'var(--ink-faint)',
                }}>
                  {fmtDue(h.due_date)}
                </span>
              )}
            </Link>
          );
        })}
      </div>
      {pending.length > 3 && (
        <Link to="/quizzes" style={{
          fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--accent-ink)',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 3, marginTop: 10,
        }}>
          +{pending.length - 3} još <ArrowRight width={11} height={11} />
        </Link>
      )}
    </div>
  );
}

// ─── Continue learning card ───────────────────────────────────────────────────

function ContinueCard({ courses, enrollment }) {
  if (enrollment) {
    const active = courses.find(c => c.course_id === enrollment.course_id);
    const course = active ?? {
      course_id: enrollment.course_id,
      course_title: enrollment.course_title,
      completed_lessons: 0,
      total_lessons: 0,
      in_progress_lessons: 0,
      completion_pct: 0,
    };
    const cta = course.completed_lessons > 0 ? 'Nastavi učiti' : 'Počni učiti';
    return <ContinueCardUI course={course} cta={cta} />;
  }

  const inProgress = courses
    .filter(c => c.in_progress_lessons > 0 || (c.completed_lessons > 0 && c.completion_pct < 100))
    .sort((a, b) => {
      if (b.in_progress_lessons !== a.in_progress_lessons) return b.in_progress_lessons - a.in_progress_lessons;
      return a.completion_pct - b.completion_pct;
    });

  if (inProgress.length === 0) {
    const notStarted = courses.filter(c => c.completion_pct === 0);
    if (notStarted.length > 0) return <ContinueCardUI course={notStarted[0]} cta="Počni učiti" />;
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
        {course.total_lessons > 0
          ? `${course.completed_lessons} / ${course.total_lessons} lekcija · ${course.completion_pct}% završeno`
          : 'Lekcije se učitavaju…'}
      </p>

      {course.total_lessons > 0 && (
        <div style={{
          height: 6, borderRadius: 999, background: 'rgba(255,255,255,.15)', margin: '16px 0 20px', overflow: 'hidden',
        }}>
          <div style={{
            width: `${course.completion_pct}%`, height: '100%', borderRadius: 999,
            background: barColour, transition: 'width .6s var(--ease)',
          }} />
        </div>
      )}
      {course.total_lessons === 0 && <div style={{ marginBottom: 20 }} />}

      <Link
        to={`/courses/${course.course_id}`}
        className="btn btn-white btn-sm"
        style={{ textDecoration: 'none', display: 'inline-flex', gap: 8, alignItems: 'center' }}
      >
        <BookIcon width={15} height={15} />
        Otvori kolegij
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
        Nema dostupnih kolegija.
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
              <i style={{ width: `${c.completion_pct}%`, background: colours[i % colours.length] }} />
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
  { to: '/courses',  label: 'Svi kolegiji', Icon: BookIcon,  colour: '#0f8f86' },
  { to: '/progress', label: 'Napredak',     Icon: ChartIcon, colour: '#6366f1' },
  { to: '/quizzes',  label: 'Kvizovi',      Icon: QuizIcon,  colour: '#f59e0b' },
  { to: '/schedule', label: 'Zakaži Zoom',  Icon: VideoIcon, colour: '#ec4899' },
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

function fmtSessionDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
}

function UpcomingSession({ session }) {
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
        {session ? (
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {session.title}
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 2 }}>
              {fmtSessionDate(session.scheduled_at)}
            </div>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>
              Nije zakazana
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-faint)', marginTop: 2 }}>
              Premium: 1 besplatna/mj.
            </div>
          </div>
        )}
      </div>
      {session?.zoom_url ? (
        <a
          href={session.zoom_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm"
          style={{
            textDecoration: 'none', display: 'flex',
            justifyContent: 'center', gap: 7, alignItems: 'center', width: '100%',
          }}
        >
          <VideoIcon width={15} height={15} />
          Pridruži se
        </a>
      ) : (
        <Link
          to="/schedule"
          className="btn btn-primary btn-sm"
          style={{
            textDecoration: 'none', display: 'flex',
            justifyContent: 'center', gap: 7, alignItems: 'center', width: '100%',
          }}
        >
          <CalIcon width={15} height={15} />
          {session ? 'Raspored sesija' : 'Zakaži sesiju'}
        </Link>
      )}
    </div>
  );
}

// ─── Previous courses strip ───────────────────────────────────────────────────

function PreviousCoursesStrip({ previous }) {
  if (!previous || previous.length === 0) return null;

  return (
    <div style={{ marginTop: 32 }}>
      <div style={{
        fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
        textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 12,
      }}>
        Prethodni kolegiji
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {previous.map(e => (
          <Link
            key={e.id}
            to={`/courses/${e.course_id}`}
            style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '12px 16px', borderRadius: 12,
              background: 'var(--surface)', border: '1.5px solid var(--line)',
              textDecoration: 'none', opacity: 0.65,
              transition: 'opacity .15s',
            }}
            onMouseEnter={ev => { ev.currentTarget.style.opacity = '1'; }}
            onMouseLeave={ev => { ev.currentTarget.style.opacity = '0.65'; }}
          >
            <span style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
              {e.course_title}
            </span>
            {e.unenrolled_at && (
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--ink-faint)', flexShrink: 0, marginLeft: 12 }}>
                do {fmtDate(e.unenrolled_at)}
              </span>
            )}
          </Link>
        ))}
      </div>
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
  const [user, setUser]             = useState(null);
  const [stats, setStats]           = useState(null);
  const [courses, setCourses]       = useState([]);
  const [enrollment, setEnrollment] = useState(null);
  const [previous, setPrevious]     = useState([]);
  const [homework, setHomework]     = useState([]);
  const [nextSession, setNextSession] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [me, st, co, enr, hw, sessions] = await Promise.all([
          getMe(),
          getStudentStats(),
          getCourseProgress(),
          getEnrollment(),
          getStudentHomework().catch(() => []),
          getStudentSessions().catch(() => []),
        ]);
        if (!mounted) return;
        setUser(me);
        setStats(st);
        setCourses(co);
        setEnrollment(enr.enrollment ?? null);
        setPrevious(enr.previous ?? []);
        setHomework(Array.isArray(hw) ? hw : []);
        const now = new Date();
        const upcoming = sessions.filter(s => s.status === 'upcoming' && new Date(s.scheduled_at) > now);
        setNextSession(upcoming[0] ?? null);
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

  const statItems = [
    { v: loading ? null : (stats?.total_lessons_completed ?? 0), l: 'Lekcija završeno' },
    { v: loading ? null : formatTime(stats?.total_time_spent_seconds),  l: 'Ukupno učenja' },
    { v: loading ? null : (stats?.avg_score_pct != null ? `${stats.avg_score_pct}%` : '—'), l: 'Prosj. rezultat' },
    { v: loading ? null : (stats?.total_quizzes_taken ?? 0), l: 'Kvizova rješeno' },
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

        {!loading && stats && (
          <div style={{ paddingTop: 4 }}>
            <StreakBadge days={stats.current_streak_days ?? 0} />
          </div>
        )}
      </div>

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
          {loading ? (
            <Skeleton w="100%" h={200} radius={16} />
          ) : (
            <ContinueCard courses={courses} enrollment={enrollment} />
          )}

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
                Svi kolegiji
              </span>
              <Link to="/courses" style={{
                fontFamily: 'var(--mono)', fontSize: 11.5, color: 'var(--accent-ink)',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4,
              }}>
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
          {loading ? (
            <Skeleton w="100%" h={120} radius={16} />
          ) : (
            <ExamCountdown examDate={user?.exam_date ?? null} />
          )}

          {!loading && <HomeworkCard homework={homework} />}

          <QuickLinks />
          <UpcomingSession session={nextSession} />
        </div>
      </div>

      {/* ── Previous courses ───────────────────────────────────────────────── */}
      {!loading && <PreviousCoursesStrip previous={previous} />}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: .45; }
        }
      `}</style>
    </div>
  );
}
