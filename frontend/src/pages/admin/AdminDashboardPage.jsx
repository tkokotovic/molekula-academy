import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminDashboard } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.ceil(diff / 86400000);
}

function examUrgencyColor(days) {
  if (days <= 14) return '#d6492f';
  if (days <= 30) return '#f59e0b';
  return '#1ec8b6';
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hr-HR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'upravo';
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 14, padding: '18px 22px', flex: 1, minWidth: 140,
    }}>
      <div style={{
        fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 28,
        color: accent || 'var(--ink)', lineHeight: 1, marginBottom: 5,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{sub}</div>}
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ title, action, actionTo, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <h2 style={{
          margin: 0, fontFamily: 'var(--mono)', fontSize: 10.5,
          letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-soft)',
          fontWeight: 700,
        }}>
          {title}
        </h2>
        {action && actionTo && (
          <Link to={actionTo} style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none' }}>
            {action} →
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Action strip item ────────────────────────────────────────────────────────

function ActionItem({ icon, label, count, to, color }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 16px', borderRadius: 10,
        background: 'var(--surface)', border: '1px solid var(--line)',
        textDecoration: 'none', transition: 'border-color .15s',
        flex: 1, minWidth: 180,
      }}
    >
      <span style={{
        width: 36, height: 36, borderRadius: 10, flexShrink: 0,
        background: color + '18',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17,
      }}>
        {icon}
      </span>
      <div>
        <div style={{ fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: color, lineHeight: 1, marginBottom: 3 }}>
          {count}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</div>
      </div>
    </Link>
  );
}

// ─── AdminDashboardPage ───────────────────────────────────────────────────────

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminDashboard()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Dobro jutro' : hour < 18 ? 'Dobar dan' : 'Dobra večer';

  if (loading) {
    return (
      <div style={{ padding: '40px 32px', display: 'flex', alignItems: 'center', gap: 10, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', fontSize: 13 }}>
        <span style={{ opacity: .5 }}>Učitavanje…</span>
      </div>
    );
  }

  const { stats, new_students, upcoming_exams, open_messages, content_health } = data || {};

  const totalActions = (open_messages?.length || 0);

  return (
    <div style={{ padding: '28px 32px 56px', maxWidth: 1100 }}>

      {/* Greeting */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 700, color: 'var(--ink)', margin: '0 0 4px' }}>
          {greeting} 👋
        </h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-soft)' }}>
          {new Date().toLocaleDateString('hr-HR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Action strips */}
      {totalActions > 0 && (
        <Section title="Zahtijeva pažnju">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {open_messages?.length > 0 && (
              <ActionItem
                icon="💬"
                label="nepročitanih poruka"
                count={open_messages.length}
                to="/admin/messages"
                color="#7c3aed"
              />
            )}
          </div>
        </Section>
      )}

      {/* Quick stats */}
      <Section title="Pregled">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <StatCard label="Ukupno studenata" value={stats?.total_students ?? 0} />
          <StatCard label="Premium studenti" value={stats?.premium_count ?? 0} accent="var(--accent)" sub="aktivnih pretplata" />
          <StatCard label="Basic studenti" value={stats?.basic_count ?? 0} />
          <StatCard
            label="MRR (procjena)"
            value={`${(stats?.mrr_estimate ?? 0).toLocaleString('hr-HR')} €`}
            sub="bez Stripe integracije"
          />
        </div>
      </Section>

      {/* New students */}
      <Section title={`Novi studenti (${new_students?.length ?? 0} ovaj tjedan)`} action="Svi studenti" actionTo="/admin/students">
        {!new_students?.length ? (
          <EmptyState text="Nema novih studenata ovaj tjedan." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {new_students.map(s => (
              <StudentRow key={s.id} student={s} />
            ))}
          </div>
        )}
      </Section>

      {/* Upcoming exams */}
      <Section title="Nadolazeći ispiti (90 dana)" action="Svi studenti" actionTo="/admin/students">
        {!upcoming_exams?.length ? (
          <EmptyState text="Nema studenata s postavljenim datumom ispita u sljedećih 90 dana." />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 10,
          }}>
            {upcoming_exams.map(s => {
              const days = daysUntil(s.exam_date);
              const color = examUrgencyColor(days);
              return (
                <Link
                  key={s.id}
                  to={`/admin/students/${s.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '12px 14px', borderRadius: 10,
                    background: 'var(--surface)', border: '1px solid var(--line)',
                    textDecoration: 'none', transition: 'border-color .15s',
                  }}
                >
                  <span style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: color + '18', color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
                  }}>
                    {initials(s.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.name}
                    </div>
                    <div style={{ fontSize: 11.5, color, fontWeight: 700, fontFamily: 'var(--mono)' }}>
                      {days <= 0 ? 'Danas!' : `za ${days} dana`}
                      <span style={{ color: 'var(--ink-soft)', fontWeight: 400, marginLeft: 5 }}>
                        {formatDate(s.exam_date)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Section>

      {/* Content health */}
      <Section title="Stanje sadržaja" action="Kolegiji i lekcije" actionTo="/admin/courses">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <ContentHealthCard
            label="Lekcije u nacrtu"
            value={content_health?.draft_lessons ?? 0}
            to="/admin/courses"
            warn={content_health?.draft_lessons > 0}
          />
          <ContentHealthCard
            label="Lekcije bez kviza"
            value={content_health?.lessons_no_quiz ?? 0}
            to="/admin/courses"
            warn={content_health?.lessons_no_quiz > 0}
          />
        </div>
      </Section>

    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StudentRow({ student }) {
  return (
    <Link
      to={`/admin/students/${student.id}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px', borderRadius: 10,
        background: 'var(--surface)', border: '1px solid var(--line)',
        textDecoration: 'none', transition: 'background .12s',
      }}
    >
      <span style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'var(--accent-wash)', color: 'var(--accent-ink)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11,
      }}>
        {initials(student.name)}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {student.name}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--ink-soft)' }}>{student.email}</div>
      </div>
      <span style={{
        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
        fontFamily: 'var(--mono)',
        background: student.subscription_tier === 'premium'
          ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
          : 'var(--bg)',
        color: student.subscription_tier === 'premium' ? 'var(--accent)' : 'var(--ink-soft)',
        border: `1px solid ${student.subscription_tier === 'premium' ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)'}`,
      }}>
        {student.subscription_tier === 'premium' ? 'Premium' : 'Basic'}
      </span>
      <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
        {formatDate(student.created_at)}
      </span>
    </Link>
  );
}

function ContentHealthCard({ label, value, to, warn }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: 14,
        padding: '14px 18px', borderRadius: 12,
        background: 'var(--surface)',
        border: `1px solid ${warn && value > 0 ? '#f59e0b44' : 'var(--line)'}`,
        textDecoration: 'none', minWidth: 180,
      }}
    >
      <div style={{
        fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 26,
        color: warn && value > 0 ? '#f59e0b' : 'var(--ink)', lineHeight: 1,
      }}>
        {value}
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', fontWeight: 500 }}>{label}</div>
    </Link>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{
      padding: '20px 16px', borderRadius: 10,
      background: 'var(--surface)', border: '1px solid var(--line)',
      fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center',
    }}>
      {text}
    </div>
  );
}
