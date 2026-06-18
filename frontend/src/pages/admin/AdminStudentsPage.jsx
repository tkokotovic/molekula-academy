import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getAdminStudents, setStudentSubscription, getHomeworkInbox, createAdminStudent } from '../../api/client';

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
  if (days < 30) return `${days}d`;
  return formatDate(iso);
}

function examCountdown(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff < 0)  return { label: formatDate(dateStr), color: 'var(--ink-soft)' };
  if (diff === 0) return { label: 'Danas!', color: '#dc2626' };
  if (diff <= 7)  return { label: `Za ${diff}d`, color: '#dc2626' };
  if (diff <= 30) return { label: `Za ${diff}d`, color: '#d97706' };
  return { label: formatDate(dateStr), color: 'var(--ink-soft)' };
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

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
};

function AddStudentModal({ onClose, onCreated }) {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [form, setForm] = useState({ name: '', email: '', password: '', subscription_tier: 'basic' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  function set(k, v) { setForm(p => ({ ...p, [k]: v })); setErr(''); }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setErr('');
    try {
      await createAdminStudent(form);
      onCreated();
      onClose();
    } catch (ex) {
      setErr(ex.message || t('Greška.', 'Error.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--surface)', borderRadius: 14, padding: '28px 28px 24px',
        width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--ink)', margin: 0, flex: 1 }}>
            {t('Dodaj studenta', 'Add student')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 20 }}>×</button>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>{t('Ime i prezime', 'Full name')}</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} style={inp} placeholder="Ana Horvat" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Email</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="ana@example.com" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>{t('Lozinka (min. 8 znakova)', 'Password (min. 8 chars)')}</label>
            <input required type="password" value={form.password} onChange={e => set('password', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>Plan</label>
            <select value={form.subscription_tier} onChange={e => set('subscription_tier', e.target.value)} style={inp}>
              <option value="basic">Basic</option>
              <option value="premium">Premium</option>
            </select>
          </div>

          {err && <div style={{ fontSize: 13, color: '#dc2626', background: '#fee2e2', borderRadius: 6, padding: '8px 12px' }}>{err}</div>}

          <div style={{ display: 'flex', gap: 10, marginTop: 6, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{
              padding: '8px 18px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13.5,
            }}>
              {t('Odustani', 'Cancel')}
            </button>
            <button type="submit" disabled={saving} style={{
              padding: '8px 22px', borderRadius: 8, border: 'none',
              background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
              opacity: saving ? .7 : 1,
            }}>
              {saving ? '…' : t('Kreiraj', 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── AdminStudentsPage ────────────────────────────────────────────────────────

export default function AdminStudentsPage() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [students, setStudents] = useState([]);
  const [hwInbox,  setHwInbox]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [planFilter, setPlanFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

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
    const hasOverdue   = mine.some(a => a.status !== 'corrected' && a.deadline && new Date(a.deadline.replace(' ', 'T') + 'Z') < new Date());
    const hasSubmitted = mine.some(a => a.status === 'submitted');
    const allDone      = mine.every(a => a.status === 'corrected');
    if (hasOverdue)   return { color: '#dc2626', title: 'Kasni sa zadaćom' };
    if (hasSubmitted) return { color: '#d97706', title: 'Čeka ispravljanje' };
    if (allDone)      return { color: '#16a34a', title: 'Sve ispravljeno' };
    return null;
  }

  // Filter
  let filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    const matchPlan = planFilter === 'all' || s.subscription_tier === planFilter;
    return matchSearch && matchPlan;
  });

  // Sort: exam date ascending (nulls last), then last_active desc
  filtered = [...filtered].sort((a, b) => {
    const aDate = a.exam_date ? new Date(a.exam_date) : null;
    const bDate = b.exam_date ? new Date(b.exam_date) : null;
    if (aDate && bDate) return aDate - bDate;
    if (aDate) return -1;
    if (bDate) return 1;
    const aAct = a.last_active ? new Date(a.last_active) : new Date(0);
    const bAct = b.last_active ? new Date(b.last_active) : new Date(0);
    return bAct - aAct;
  });

  const total   = students.length;
  const premium = students.filter(s => s.subscription_tier === 'premium').length;
  const basic   = total - premium;

  const filterOpts = [
    { key: 'all',     label: t('Svi', 'All'),         count: total   },
    { key: 'premium', label: 'Premium',                count: premium },
    { key: 'basic',   label: 'Basic',                  count: basic   },
  ];

  return (
    <div style={{ padding: '28px 28px 48px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 12 }}>
        <div>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 4px' }}>
            Admin
          </p>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', margin: 0 }}>
            {t('Studenti', 'Students')}
          </h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          style={{
            marginTop: 8, padding: '8px 18px', borderRadius: 9, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer',
            fontSize: 13.5, fontWeight: 600, flexShrink: 0,
          }}
        >
          + {t('Dodaj studenta', 'Add student')}
        </button>
      </div>

      {showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onCreated={load}
        />
      )}

      {/* Filter chips + search row */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        {filterOpts.map(o => (
          <button
            key={o.key}
            onClick={() => setPlanFilter(o.key)}
            style={{
              padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
              fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--mono)',
              border: planFilter === o.key ? '1.5px solid var(--accent)' : '1px solid var(--line)',
              background: planFilter === o.key ? 'color-mix(in srgb, var(--accent) 12%, transparent)' : 'var(--surface)',
              color: planFilter === o.key ? 'var(--accent)' : 'var(--ink-soft)',
            }}
          >
            {o.label} <span style={{ opacity: .6 }}>({o.count})</span>
          </button>
        ))}

        <div style={{ flex: 1, minWidth: 200 }} />

        {/* Search */}
        <div style={{ position: 'relative', width: 280 }}>
          <svg style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink-soft)' }}
            width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('Pretraži…', 'Search…')}
            style={{
              width: '100%', boxSizing: 'border-box',
              padding: '8px 12px 8px 32px', borderRadius: 9,
              border: '1px solid var(--line)', background: 'var(--surface)',
              color: 'var(--ink)', fontFamily: 'var(--sans)', fontSize: 13, outline: 'none',
            }}
          />
        </div>
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
          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1.4fr 160px 100px 110px 100px 80px 28px 28px',
            padding: '10px 16px',
            borderBottom: '1px solid var(--line)',
            fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.06em',
            textTransform: 'uppercase', color: 'var(--ink-soft)',
          }}>
            <span>{t('Ime', 'Name')}</span>
            <span>Email</span>
            <span>{t('Kolegij', 'Course')}</span>
            <span>{t('Plan', 'Plan')}</span>
            <span>{t('Ispit', 'Exam')}</span>
            <span>{t('Aktivan', 'Active')}</span>
            <span>{t('Prosjek', 'Avg')}</span>
            <span title="Zadaće">ZD</span>
            <span title="Poruke">✉</span>
          </div>

          {filtered.map((s, i) => {
            const dot  = hwDot(s.id);
            const exam = examCountdown(s.exam_date);
            const hasMsg = (s.unread_messages || 0) > 0;
            return (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1.4fr 160px 100px 110px 100px 80px 28px 28px',
                  padding: '11px 16px',
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
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {s.email}
                </span>
                <div style={{ overflow: 'hidden' }}>
                  {s.enrolled_course ? (
                    <>
                      <div style={{ fontSize: 13, color: 'var(--ink)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.enrollment_count > 1 ? `${s.enrolled_course} +${s.enrollment_count - 1}` : s.enrolled_course}
                      </div>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>—</span>
                  )}
                </div>
                <span>
                  <PlanBadge tier={s.subscription_tier} studentId={s.id} onChanged={load} />
                </span>
                <span style={{ fontSize: 12.5, color: exam?.color || 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>
                  {exam ? exam.label : '—'}
                </span>
                <span style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{timeAgo(s.last_active)}</span>
                <span style={{ fontSize: 13, color: s.avg_score >= 80 ? '#1ec8b6' : s.avg_score >= 60 ? '#f59e0b' : s.avg_score ? '#d6492f' : 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>
                  {s.avg_score != null ? `${s.avg_score}%` : '—'}
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {dot ? <span title={dot.title} style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: dot.color }} /> : null}
                </span>
                <span style={{ display: 'flex', alignItems: 'center' }}>
                  {hasMsg ? <span title="Nepročitane poruke" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: '50%', background: '#2563eb' }} /> : null}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
