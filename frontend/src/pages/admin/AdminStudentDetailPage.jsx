import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAdminStudent, setStudentSubscription, getCertificateDownloadUrl } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hr-HR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function scoreColour(pct) {
  if (pct == null) return 'var(--ink-soft)';
  if (pct >= 80) return '#1ec8b6';
  if (pct >= 60) return '#f59e0b';
  return '#d6492f';
}

function Ring({ pct = 0, size = 64, stroke = 6, colour = 'var(--accent)' }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={colour} strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle"
        fontFamily="var(--mono)" fontWeight="700" fontSize={size * 0.22} fill="var(--ink)">
        {pct}%
      </text>
    </svg>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h2 style={{
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 12,
      }}>{title}</h2>
      {children}
    </div>
  );
}

// ─── AdminStudentDetailPage ───────────────────────────────────────────────────

export default function AdminStudentDetailPage() {
  const { id } = useParams();
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(false);

  function load() {
    setLoading(true);
    getAdminStudent(id).then(setData).catch(() => {}).finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [id]);

  async function changePlan(tier) {
    if (!window.confirm(`Promijeni plan na ${tier}?`)) return;
    setPlanLoading(true);
    try {
      await setStudentSubscription(id, tier);
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setPlanLoading(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 13 }}>…</div>
  );

  if (!data) return (
    <div style={{ padding: 40, color: 'var(--ink-soft)' }}>{t('Student nije pronađen.', 'Student not found.')}</div>
  );

  const { student, courses, quizHistory, certificates } = data;
  const isPremium = student.subscription_tier === 'premium';

  return (
    <div style={{ padding: '28px 28px 48px', maxWidth: 860 }}>

      {/* Back */}
      <Link to="/admin/students" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {t('Svi studenti', 'All students')}
      </Link>

      {/* Profile header */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '20px 24px',
        display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap',
        marginBottom: 28,
      }}>
        {/* Avatar */}
        <div style={{
          width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20,
        }}>
          {student.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)', margin: '0 0 4px' }}>{student.name}</h1>
          <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>
            {student.email} &middot; {t('Registriran', 'Joined')} {formatDate(student.created_at)}
          </div>
        </div>

        {/* Plan switcher */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
          <div style={{
            padding: '6px 14px', borderRadius: 20, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
            background: isPremium ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg)',
            color: isPremium ? 'var(--accent)' : 'var(--ink-soft)',
            border: `1px solid ${isPremium ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)'}`,
          }}>
            {isPremium ? 'Premium' : 'Basic'}
          </div>
          <button
            onClick={() => changePlan(isPremium ? 'basic' : 'premium')}
            disabled={planLoading}
            style={{
              fontSize: 12, color: 'var(--accent)', background: 'none', border: 'none',
              cursor: 'pointer', textDecoration: 'underline', padding: 0, opacity: planLoading ? .5 : 1,
            }}
          >
            {t(isPremium ? 'Degradiraj na Basic' : 'Nadogradi na Premium', isPremium ? 'Downgrade to Basic' : 'Upgrade to Premium')}
          </button>
        </div>
      </div>

      {/* Course progress */}
      <Section title={t('Napredak po kolegijima', 'Course progress')}>
        {courses.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{t('Nema aktivnih kolegija.', 'No active courses.')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courses.map(c => {
              const pct = c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0;
              const hrs = Math.floor(c.time_spent_seconds / 3600);
              const mins = Math.floor((c.time_spent_seconds % 3600) / 60);
              return (
                <div key={c.id} style={{
                  background: 'var(--surface)', border: '1px solid var(--line)',
                  borderRadius: 12, padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: 16,
                }}>
                  <Ring pct={pct} colour={pct >= 80 ? '#1ec8b6' : pct >= 40 ? '#f59e0b' : 'var(--accent)'} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', marginBottom: 3 }}>{c.title}</div>
                    <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                      {c.completed_lessons}/{c.total_lessons} {t('lekcija', 'lessons')}
                      {c.time_spent_seconds > 0 && ` · ${hrs > 0 ? hrs + 'h ' : ''}${mins}min`}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Quiz history */}
      <Section title={t('Povijest kvizova', 'Quiz history')}>
        {quizHistory.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{t('Nema riješenih kvizova.', 'No quizzes taken.')}</p>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
            {quizHistory.map((q, i) => {
              const pct = q.max_score > 0 ? Math.round((q.score / q.max_score) * 100) : 0;
              return (
                <div key={q.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '11px 16px',
                  borderBottom: i < quizHistory.length - 1 ? '1px solid var(--line)' : 'none',
                }}>
                  <span style={{
                    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
                    color: scoreColour(pct), minWidth: 44, textAlign: 'right',
                  }}>
                    {pct}%
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{q.quiz_title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{q.score}/{q.max_score} {t('bodova', 'pts')} · {formatDate(q.submitted_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Certificates */}
      <Section title={t('Certifikati', 'Certificates')}>
        {certificates.length === 0 ? (
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>{t('Nema certifikata.', 'No certificates yet.')}</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {certificates.map(c => (
              <div key={c.id} style={{
                background: 'var(--surface)', border: '1px solid var(--line)',
                borderRadius: 10, padding: '12px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/>
                </svg>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{c.topic_title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{formatDate(c.issued_at)}</div>
                </div>
                <a
                  href={getCertificateDownloadUrl(c.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12.5, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}
                >
                  {t('Preuzmi', 'Download')}
                </a>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}
