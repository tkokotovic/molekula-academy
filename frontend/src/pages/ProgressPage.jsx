import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getStudentStats, getCourseProgress, getRecentQuizHistory, getCertificates, getCertificateDownloadUrl } from '../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColour(pct) {
  if (pct === null || pct === undefined) return 'var(--line-strong)';
  if (pct >= 80) return '#1ec8b6';
  if (pct >= 60) return '#f59e0b';
  return '#d6492f';
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── SVG ring ─────────────────────────────────────────────────────────────────

function Ring({ pct = 0, size = 96, stroke = 9, colour = 'var(--accent)', children }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      {/* Track */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--line)" strokeWidth={stroke}
      />
      {/* Fill */}
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={colour} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .7s var(--ease)' }}
      />
      {/* Label */}
      <text
        x="50%" y="50%"
        dominantBaseline="central" textAnchor="middle"
        fontFamily="var(--mono)" fontWeight="700"
        fontSize={size * 0.2} fill="var(--ink)"
      >
        {pct}%
      </text>
      {children}
    </svg>
  );
}

// ─── Course completion rings ──────────────────────────────────────────────────

const RING_COLOURS = ['#1ec8b6', '#0f8f86', '#6366f1', '#f59e0b', '#ec4899'];

function CourseRings({ courses }) {
  if (!courses || courses.length === 0) {
    return (
      <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nema dostupnih kurseva.</p>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16 }}>
      {courses.map((c, i) => {
        const colour = RING_COLOURS[i % RING_COLOURS.length];
        return (
          <Link
            key={c.course_id}
            to={`/courses/${c.course_id}`}
            style={{ textDecoration: 'none' }}
          >
            <div
              style={{
                background: 'var(--bg)',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius-sm)',
                padding: '20px 16px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                transition: 'border-color .15s, transform .15s',
                cursor: 'pointer',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = colour; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.transform = ''; }}
            >
              <Ring pct={c.completion_pct} size={88} stroke={8} colour={colour} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3 }}>
                  {c.course_title}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-faint)', marginTop: 4 }}>
                  {c.completed_lessons}/{c.total_lessons} lekcija
                </div>
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

// ─── Quiz history bar chart (pure SVG) ───────────────────────────────────────

function QuizHistoryChart({ attempts }) {
  // Show last 10 attempts, oldest left → newest right
  const items = [...attempts].slice(0, 10).reverse();

  if (items.length === 0) {
    return (
      <div style={{
        padding: '32px 0', textAlign: 'center',
        color: 'var(--ink-faint)', fontSize: 14,
      }}>
        Još nema rješenih kvizova.
      </div>
    );
  }

  const W = 480;
  const H = 140;
  const barW = Math.min(36, (W - 40) / items.length - 6);
  const spacing = (W - 40) / items.length;
  const maxH = H - 36;

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', maxWidth: W, display: 'block', overflow: 'visible' }}
      >
        {/* Horizontal guide lines at 0%, 50%, 100% */}
        {[0, 50, 100].map(val => {
          const y = H - 28 - (val / 100) * maxH;
          return (
            <g key={val}>
              <line
                x1="30" y1={y} x2={W - 10} y2={y}
                stroke="var(--line)" strokeWidth="1"
                strokeDasharray={val === 0 ? '' : '3,4'}
              />
              <text x="24" y={y + 4} textAnchor="end"
                fontFamily="var(--mono)" fontSize="9" fill="var(--ink-faint)">
                {val}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {items.map((a, idx) => {
          const pct = a.score_pct ?? 0;
          const bh = Math.max(4, (pct / 100) * maxH);
          const x = 30 + idx * spacing + (spacing - barW) / 2;
          const y = H - 28 - bh;
          const colour = scoreColour(a.score_pct);
          const label = a.quiz_title?.length > 8 ? a.quiz_title.slice(0, 8) + '…' : (a.quiz_title ?? '');

          return (
            <g key={a.attempt_id}>
              <rect
                x={x} y={y} width={barW} height={bh}
                rx="4" fill={colour}
                style={{ transition: 'height .5s var(--ease)', opacity: 0.85 }}
              />
              {/* Score on top of bar */}
              {pct > 12 && (
                <text
                  x={x + barW / 2} y={y + bh - 5}
                  textAnchor="middle"
                  fontFamily="var(--mono)" fontSize="9" fontWeight="700" fill="#fff"
                >
                  {pct}%
                </text>
              )}
              {/* Quiz name below bar */}
              <text
                x={x + barW / 2} y={H - 10}
                textAnchor="middle"
                fontFamily="var(--body)" fontSize="9.5" fill="var(--ink-faint)"
              >
                {label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
        {[['#1ec8b6', '≥80% — Odlično'], ['#f59e0b', '60–79% — Dobro'], ['#d6492f', '<60% — Vježbaj']].map(([c, l]) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink-faint)' }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: c }} />
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Topic heatmap ────────────────────────────────────────────────────────────

function TopicHeatmap({ attempts }) {
  // Group by topic, compute avg score
  const topicMap = {};
  for (const a of attempts) {
    if (!a.topic_id || a.score_pct === null) continue;
    if (!topicMap[a.topic_id]) {
      topicMap[a.topic_id] = { title: a.topic_title || `Tema ${a.topic_id}`, scores: [] };
    }
    topicMap[a.topic_id].scores.push(a.score_pct);
  }

  const topics = Object.values(topicMap).map(t => ({
    title: t.title,
    avg: Math.round(t.scores.reduce((s, x) => s + x, 0) / t.scores.length),
    count: t.scores.length,
  })).sort((a, b) => b.avg - a.avg);

  if (topics.length === 0) {
    return (
      <p style={{ color: 'var(--ink-faint)', fontSize: 14, padding: '12px 0' }}>
        Nema podataka — riješi kvizove da vidiš analizu tema.
      </p>
    );
  }

  return (
    <div style={{ display: 'grid', gap: 10 }}>
      {topics.map(t => {
        const colour = scoreColour(t.avg);
        return (
          <div key={t.title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Title */}
            <div style={{
              width: 160, flexShrink: 0,
              fontSize: 13.5, color: 'var(--ink)', fontWeight: 500,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {t.title}
            </div>

            {/* Bar */}
            <div style={{
              flex: 1, height: 24, borderRadius: 6,
              background: 'var(--line)', overflow: 'hidden', position: 'relative',
            }}>
              <div style={{
                width: `${t.avg}%`, height: '100%',
                background: `color-mix(in srgb, ${colour} 65%, var(--bg))`,
                borderRadius: 6,
                transition: 'width .7s var(--ease)',
              }} />
              <div style={{
                position: 'absolute', inset: 0,
                display: 'flex', alignItems: 'center', paddingLeft: 10,
                fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700, color: 'var(--ink)',
              }}>
                {t.avg}%
              </div>
            </div>

            {/* Count */}
            <div style={{
              width: 60, flexShrink: 0,
              fontSize: 11.5, color: 'var(--ink-faint)', textAlign: 'right',
              fontFamily: 'var(--mono)',
            }}>
              {t.count} {t.count === 1 ? 'kviz' : 'kviza'}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Certificates section ────────────────────────────────────────────────────

const CertIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 15a5 5 0 100-10 5 5 0 000 10z" />
    <path d="M9 15v6l3-2 3 2v-6" />
  </svg>
);

const DownloadIcon = (p) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" {...p}>
    <path d="M12 3v12M8 11l4 4 4-4M5 20h14" />
  </svg>
);

function CertificatesSection({ certs }) {
  if (certs.length === 0) {
    return (
      <div style={{
        padding: '28px 24px', borderRadius: 'var(--radius-sm)',
        border: '1.5px dashed var(--line)', textAlign: 'center',
        color: 'var(--ink-faint)',
      }}>
        <CertIcon width={32} height={32} style={{ color: 'var(--line-strong)', margin: '0 auto 10px', display: 'block' }} />
        <div style={{ fontSize: 14 }}>
          Dovrši lekcije i položi kviz (≥70%) da zaradiš certifikat.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
      {certs.map(cert => (
        <div key={cert.id} style={{
          background: 'color-mix(in srgb, var(--accent) 6%, var(--bg))',
          border: '1.5px solid color-mix(in srgb, var(--accent) 20%, transparent)',
          borderRadius: 'var(--radius-sm)',
          padding: '16px 18px',
          display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 10, flexShrink: 0,
            background: 'var(--accent)', display: 'grid', placeItems: 'center',
          }}>
            <CertIcon width={20} height={20} style={{ color: '#fff' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: 13.5, fontWeight: 600, color: 'var(--ink)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {cert.topic_title}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginTop: 2 }}>
              {formatDate(cert.issued_at)}
            </div>
          </div>
          <a
            href={getCertificateDownloadUrl(cert.id)}
            download
            style={{
              display: 'grid', placeItems: 'center',
              width: 34, height: 34, borderRadius: 8, flexShrink: 0,
              background: 'var(--surface)', border: '1.5px solid var(--line)',
              color: 'var(--accent)', transition: 'background .15s',
              textDecoration: 'none',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.querySelector('svg').style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; e.currentTarget.querySelector('svg').style.color = ''; }}
          >
            <DownloadIcon width={15} height={15} />
          </a>
        </div>
      ))}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, kicker, children, action }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1.5px solid var(--line)',
      borderRadius: 'var(--radius)',
      padding: '22px 24px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        marginBottom: 18, gap: 12,
      }}>
        <div>
          {kicker && (
            <div style={{
              fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em',
              textTransform: 'uppercase', color: 'var(--ink-faint)', marginBottom: 4,
            }}>
              {kicker}
            </div>
          )}
          <h3 style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', margin: 0 }}>
            {title}
          </h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ w = '100%', h = 20, radius = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'var(--line)', animation: 'pulse 1.4s ease-in-out infinite',
    }} />
  );
}

// ─── Summary stats row ────────────────────────────────────────────────────────

function SummaryStats({ stats, courses }) {
  const totalLessons = courses.reduce((s, c) => s + c.total_lessons, 0);
  const doneLessons  = courses.reduce((s, c) => s + c.completed_lessons, 0);
  const overallPct   = totalLessons > 0 ? Math.round((doneLessons / totalLessons) * 100) : 0;

  const items = [
    { v: `${overallPct}%`, l: 'Ukupni napredak' },
    { v: stats?.total_quizzes_taken ?? 0, l: 'Kvizova rješeno' },
    { v: stats?.avg_score_pct != null ? `${stats.avg_score_pct}%` : '—', l: 'Prosječan rezultat' },
    { v: stats?.current_streak_days ?? 0, l: 'Dan zaredom' },
  ];

  return (
    <div className="stat-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
      {items.map(({ v, l }) => (
        <div key={l} className="stat">
          <div className="v">{v}</div>
          <div className="l">{l}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProgressPage() {
  const [stats,    setStats]    = useState(null);
  const [courses,  setCourses]  = useState([]);
  const [history,  setHistory]  = useState([]);
  const [certs,    setCerts]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [st, co, hi, ce] = await Promise.all([
          getStudentStats(),
          getCourseProgress(),
          getRecentQuizHistory(),
          getCertificates().catch(() => []),   // graceful fallback
        ]);
        if (!mounted) return;
        setStats(st);
        setCourses(co);
        setHistory(hi);
        setCerts(Array.isArray(ce) ? ce : []);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  if (error) {
    return (
      <div className="content">
        <p style={{ color: '#d6492f', padding: '40px 0', textAlign: 'center' }}>
          Greška pri učitavanju: {error}
        </p>
      </div>
    );
  }

  return (
    <div className="content">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <p style={{
          fontFamily: 'var(--mono)', fontSize: 11.5, letterSpacing: '.08em',
          textTransform: 'uppercase', color: 'var(--accent-ink)', marginBottom: 6,
        }}>
          Tvoj napredak
        </p>
        <h1 style={{
          fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34,
          color: 'var(--ink)', letterSpacing: '-0.02em', margin: 0,
        }}>
          Napredak
        </h1>
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
      </div>

      {/* ── Summary stats ──────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
          {[0,1,2,3].map(i => <Skeleton key={i} h={72} radius={14} />)}
        </div>
      ) : (
        <SummaryStats stats={stats} courses={courses} />
      )}

      {/* ── Main grid ──────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gap: 20 }}>

        {/* Course completion rings */}
        <Section
          kicker="Kursevi"
          title="Završenost kurseva"
          action={
            <Link
              to="/courses"
              style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--accent-ink)', textDecoration: 'none' }}
            >
              Svi kursevi →
            </Link>
          }
        >
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[0,1,2,3].map(i => <Skeleton key={i} h={150} radius={12} />)}
            </div>
          ) : (
            <CourseRings courses={courses} />
          )}
        </Section>

        {/* Two-column: quiz chart + topic heatmap */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

          <Section kicker="Kvizovi" title="Povijest rezultata">
            {loading ? (
              <Skeleton h={140} radius={8} />
            ) : (
              <QuizHistoryChart attempts={history} />
            )}
          </Section>

          <Section kicker="Teme" title="Snaga po temama">
            {loading ? (
              <div style={{ display: 'grid', gap: 10 }}>
                {[0,1,2].map(i => <Skeleton key={i} h={24} radius={6} />)}
              </div>
            ) : (
              <TopicHeatmap attempts={history} />
            )}
          </Section>
        </div>

        {/* Certificates */}
        <Section
          kicker={`Certifikati · ${certs.length} zarađeno`}
          title="Moji certifikati"
        >
          {loading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Skeleton h={72} radius={12} />
              <Skeleton h={72} radius={12} />
            </div>
          ) : (
            <CertificatesSection certs={certs} />
          )}
        </Section>

      </div>

      {/* Pulse animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: .45; }
        }
        @media (max-width: 700px) {
          .progress-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
