import { useState, useEffect } from 'react';
import { getAdminRevenue, getAdminStudents } from '../../api/client';

function StatCard({ label, value, sub, colour }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 14, padding: '20px 24px', flex: 1, minWidth: 160,
    }}>
      <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 30, color: colour || 'var(--ink)', lineHeight: 1, marginBottom: 6 }}>
        {value}
      </div>
      <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{sub}</div>}
    </div>
  );
}

export default function AdminRevenuePage() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [rev,      setRev]      = useState(null);
  const [students, setStudents] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([getAdminRevenue(), getAdminStudents()])
      .then(([r, s]) => { setRev(r); setStudents(s); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 13 }}>…</div>
  );

  // Signups per month (last 6 months)
  const now = new Date();
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    return {
      label: d.toLocaleDateString('hr-HR', { month: 'short' }),
      key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
    };
  });

  const signupsByMonth = {};
  students.forEach(s => {
    const key = s.created_at?.slice(0, 7);
    if (key) signupsByMonth[key] = (signupsByMonth[key] || 0) + 1;
  });

  const maxSignups = Math.max(1, ...months.map(m => signupsByMonth[m.key] || 0));

  return (
    <div style={{ padding: '28px 28px 48px' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 4px' }}>
          Admin
        </p>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', margin: '0 0 6px' }}>
          {t('Prihodi', 'Revenue')}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: 0 }}>
          {t('Procjena temeljena na broju studenata. Stvarni podaci naplate dostupni nakon Stripe integracije.', 'Estimate based on student counts. Real billing data available after Stripe integration.')}
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 32 }}>
        <StatCard
          label={t('Procijenjeni MRR', 'Estimated MRR')}
          value={`€${rev?.mrr_estimate ?? 0}`}
          sub={t('Mjesečni prihod (procjena)', 'Monthly recurring revenue (estimate)')}
          colour="var(--accent)"
        />
        <StatCard
          label="Premium"
          value={rev?.premium_count ?? 0}
          sub={`€${(rev?.premium_count ?? 0) * 39} / ${t('mj', 'mo')}`}
          colour="var(--accent)"
        />
        <StatCard
          label="Basic"
          value={rev?.basic_count ?? 0}
          sub={`€${(rev?.basic_count ?? 0) * 19} / ${t('mj', 'mo')}`}
        />
        <StatCard
          label={t('Ukupno studenata', 'Total students')}
          value={(rev?.basic_count ?? 0) + (rev?.premium_count ?? 0)}
          sub={t('Svi registrirani', 'All registered')}
        />
      </div>

      {/* Plan split bar */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '20px 24px', marginBottom: 24,
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 14 }}>
          {t('Raspodjela planova', 'Plan split')}
        </div>
        {(() => {
          const total = (rev?.basic_count ?? 0) + (rev?.premium_count ?? 0);
          const premPct = total > 0 ? Math.round(((rev?.premium_count ?? 0) / total) * 100) : 0;
          const basicPct = 100 - premPct;
          return (
            <div>
              <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                <div style={{ width: `${premPct}%`, background: 'var(--accent)', transition: 'width .5s' }} />
                <div style={{ flex: 1, background: 'var(--line)' }} />
              </div>
              <div style={{ display: 'flex', gap: 20, fontSize: 13 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--accent)', display: 'inline-block' }} />
                  <span style={{ color: 'var(--ink)' }}>Premium — {premPct}%</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--line)', display: 'inline-block' }} />
                  <span style={{ color: 'var(--ink)' }}>Basic — {basicPct}%</span>
                </span>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Signups chart */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '20px 24px',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 20 }}>
          {t('Novi studenti — zadnjih 6 mjeseci', 'New students — last 6 months')}
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
          {months.map(m => {
            const count = signupsByMonth[m.key] || 0;
            const barH = maxSignups > 0 ? Math.max(4, Math.round((count / maxSignups) * 100)) : 4;
            return (
              <div key={m.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>{count || ''}</span>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  height: `${barH}%`, minHeight: 4,
                  background: count > 0 ? 'var(--accent)' : 'var(--line)',
                  transition: 'height .4s',
                }} />
                <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>{m.label}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
