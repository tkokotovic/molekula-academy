import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStudents, setStudentSubscription, getHomeworkInbox } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hr-HR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return 'Nikad';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Danas';
  if (days === 1) return 'Jučer';
  if (days < 30) return `${days}d ago`;
  return formatDate(iso);
}

function PlanBadge({ tier, studentId, onChanged }) {
  const [loading, setLoading] = useState(false);

  async function toggle() {
    const next = tier === 'premium' ? 'basic' : 'premium';
    if (!window.confirm(`Promijeni plan na ${next}?`)) return;
    setLoading(true);
    try {
      await setStudentSubscription(studentId, next);
      onChanged();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title="Klikni za promjenu plana"
      style={{
        padding: '3px 10px', borderRadius: 20, border: 'none', cursor: 'pointer',
        fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--mono)',
        background: tier === 'premium'
          ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
          : 'var(--bg)',
        color: tier === 'premium' ? 'var(--accent)' : 'var(--ink-soft)',
        border: `1px solid ${tier === 'premium' ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)'}`,
        opacity: loading ? .5 : 1,
      }}
    >
      {tier === 'premium' ? 'Premium' : 'Basic'}
    </button>
  );
}

// ─── AdminStudentsPage ────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [students,   setStudents]   = useState([]);
  const [hwInbox,    setHwInbox]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState('');

  function load() {
    setLoading(true);
    Promise.all([getAdminStudents(), getHomeworkInbox().catch(() => [])])
      .then(([s, hw]) => { setStudents(s || []); setHwInbox(hw || []); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function hwDot(studentId) {
    const mine = hwInbox.filter(a => a.student_id === studentId);
    if (!mine.length) return null;
    const hasOverdue  = mine.some(a => a.status !== 'corrected' && a.deadline && new Date(a.deadline.replace(' ', 'T') + 'Z') < new Date());
    const hasSubmitted = mine.some(a => a.status === 'submitted');
    const allDone     = mine.every(a => a.status === 'corrected');
    if (hasOverdue)   return { color: '#dc2626', title: 'Kasni sa zadaćom' };
    if (hasSubmitted) return { color: '#d97706', title: 'Čeka ispravljanje' };
    if (allDone)      return { color: '#16a34a', title: 'Sve zadaće ispravljene' };
    return null;
  }

  const filtered = students.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  // Summary stats
  const total   = students.length;
  const premium = students.filter(s => s.subscription_tier === 'premium').length;
  const basic   = total - premium;

  return (
    <div style={{ padding: '28px 28px 48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 4px' }}>
          Admin
        </p>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', margin: 0 }}>
          {t('Studenti', 'Students')}
        </h1>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: t('Ukupno', 'Total'),   value: total,   colour: 'var(--ink)' },
          { label: 'Premium',              value: premium, colour: 'var(--accent)' },
          { label: 'Basic',               value: basic,   colour: 'var(--ink-soft)' },
        ].map(({ label, value, colour }) => (
          <div key={label} style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 10, padding: '10px 18px', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22, color: colour }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ position: 'relative', maxWidth: 360, marginBottom: 20 }}>
        <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' }}
          width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
        </svg>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder={t('Pretraži ime ili email…', 'Search name or email…')}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '9px 14px 9px 36px', borderRadius: 9,
            border: '1px solid var(--line)', background: 'var(--surface)',
            color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13.5, outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 13 }}>…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--ink-soft)' }}>
          {t('Nema studenata.', 'No students found.')}
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 140px 100px 80px 80px 90px 100px 36px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--line)',
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.06em',
            textTransform: 'uppercase', color: 'var(--ink-soft)',
          }}>
            <span>{t('Ime', 'Name')}</span>
            <span>Email</span>
            <span>{t('Kolegij', 'Course')}</span>
            <span>{t('Plan', 'Plan')}</span>
            <span>{t('Lekcije', 'Lessons')}</span>
            <span>{t('Kvizovi', 'Quizzes')}</span>
            <span>{t('Prosjek', 'Avg score')}</span>
            <span>{t('Aktivan', 'Last active')}</span>
            <span title="Zadaće">ZD</span>
          </div>

          {filtered.map((s, i) => (
            <div
              key={s.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 140px 100px 80px 80px 90px 100px 36px',
                padding: '12px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--line)' : 'none',
                alignItems: 'center',
              }}
            >
              <Link
                to={`/admin/students/${s.id}`}
                style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', textDecoration: 'none' }}
              >
                {s.name}
              </Link>
              <span style={{ fontSize: 13, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.email}
              </span>
              <div style={{ overflow: 'hidden' }}>
                {s.enrolled_course ? (
                  <>
                    <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.enrollment_count > 1 ? `${s.enrolled_course} +${s.enrollment_count - 1}` : s.enrolled_course}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 1 }}>
                      {t('od', 'since')} {formatDate(s.enrolled_since)}
                    </div>
                  </>
                ) : (
                  <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>—</span>
                )}
              </div>
              <span>
                <PlanBadge tier={s.subscription_tier} studentId={s.id} onChanged={load} />
              </span>
              <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{s.lessons_completed ?? 0}</span>
              <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{s.quizzes_taken ?? 0}</span>
              <span style={{ fontSize: 13.5, color: s.avg_score >= 80 ? '#1ec8b6' : s.avg_score >= 60 ? '#f59e0b' : s.avg_score ? '#d6492f' : 'var(--ink-soft)' }}>
                {s.avg_score != null ? `${s.avg_score}%` : '—'}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{timeAgo(s.last_active)}</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {(() => { const dot = hwDot(s.id); return dot ? <span title={dot.title} style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: dot.color }} /> : null; })()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
