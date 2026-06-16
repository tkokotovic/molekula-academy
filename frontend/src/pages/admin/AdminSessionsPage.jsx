import { useState, useEffect } from 'react';
import {
  getTeacherSessions, createSession, updateSession, deleteSession,
  getTutoringPackages, createTutoringPackage, updateTutoringPackage, deleteTutoringPackage,
  getAdminStudents,
} from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function toLocalInputValue(str) {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_META = {
  upcoming:  { label: 'Nadolazeća', bg: '#e0f2fe', color: '#0369a1' },
  completed: { label: 'Završena',   bg: '#dcfce7', color: '#15803d' },
  cancelled: { label: 'Otkazana',   bg: '#fee2e2', color: '#dc2626' },
};

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
};

function btn(variant = 'primary', disabled = false) {
  const base = {
    padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', transition: 'opacity .15s',
    opacity: disabled ? .5 : 1, fontFamily: 'inherit',
  };
  if (variant === 'primary')  return { ...base, background: 'var(--accent)', color: '#fff' };
  if (variant === 'ghost')    return { ...base, background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--line)' };
  if (variant === 'danger')   return { ...base, background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' };
  return base;
}

function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.upcoming;
  return (
    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 20, background: m.bg, color: m.color }}>
      {m.label}
    </span>
  );
}

// ─── Session modal ────────────────────────────────────────────────────────────

function SessionModal({ session, students, onClose, onSaved }) {
  const editing = !!session;
  const [form, setForm] = useState({
    student_id: session?.student_id || '',
    title: session?.title || '',
    scheduled_at: toLocalInputValue(session?.scheduled_at) || '',
    duration_minutes: session?.duration_minutes || 60,
    zoom_url: session?.zoom_url || '',
    prep_note: session?.prep_note || '',
    status: session?.status || 'upcoming',
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.student_id) return alert('Odaberi studenta.');
    if (!form.title.trim()) return alert('Upiši naslov sesije.');
    if (!form.scheduled_at) return alert('Odaberi datum i vrijeme.');
    setSaving(true);
    try {
      const payload = {
        student_id: Number(form.student_id),
        title: form.title.trim(),
        scheduled_at: new Date(form.scheduled_at).toISOString(),
        duration_minutes: Number(form.duration_minutes),
        zoom_url: form.zoom_url.trim() || null,
        prep_note: form.prep_note.trim() || null,
        status: form.status,
      };
      const saved = editing
        ? await updateSession(session.id, payload)
        : await createSession(payload);
      onSaved(saved);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  const F = (label, key, type = 'text', extra = {}) => (
    <div>
      <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>{label}</label>
      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} style={inp} {...extra} />
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', width: 520, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
            {editing ? 'Uredi sesiju' : 'Nova sesija'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-soft)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Student */}
          <div>
            <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>STUDENT</label>
            <select value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))} style={inp} disabled={editing}>
              <option value="">— odaberi —</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
            </select>
          </div>

          {F('NASLOV SESIJE', 'title', 'text', { placeholder: 'npr. Kemijska ravnoteža — ponavljanje' })}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>DATUM I VRIJEME</label>
              <input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>TRAJANJE (min)</label>
              <input type="number" value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))} min={15} step={15} style={inp} />
            </div>
          </div>

          {F('MEETING URL (Google Meet / Zoom)', 'zoom_url', 'url', { placeholder: 'https://meet.google.com/…' })}

          <div>
            <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>BILJEŠKA (za pripremu)</label>
            <textarea value={form.prep_note} onChange={e => setForm(f => ({ ...f, prep_note: e.target.value }))} rows={3} placeholder="Privatne bilješke za pripremu sesije…" style={{ ...inp, resize: 'vertical' }} />
          </div>

          {editing && (
            <div>
              <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>STATUS</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} style={inp}>
                <option value="upcoming">Nadolazeća</option>
                <option value="completed">Završena</option>
                <option value="cancelled">Otkazana</option>
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn('ghost')}>Odustani</button>
          <button onClick={handleSave} disabled={saving} style={btn('primary', saving)}>
            {saving ? 'Spremam…' : (editing ? 'Spremi' : 'Zakaži sesiju')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sessions tab ─────────────────────────────────────────────────────────────

function SessionsTab({ students }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | upcoming | completed | cancelled
  const [modal, setModal] = useState(null); // null | 'create' | session obj

  function load() {
    getTeacherSessions()
      .then(ss => { setSessions(ss || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!window.confirm('Obriši sesiju?')) return;
    try {
      await deleteSession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  function handleSaved(saved) {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === saved.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], ...saved };
        return next;
      }
      // New — reload to get student_name
      load();
      return prev;
    });
    setModal(null);
  }

  const filtered = filter === 'all' ? sessions : sessions.filter(s => s.status === filter);
  const upcoming = sessions.filter(s => s.status === 'upcoming').length;

  const TH = { fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', fontWeight: 600, textAlign: 'left', padding: '8px 12px' };
  const TD = { padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 13.5, color: 'var(--ink)' };

  const FILTERS = [
    { key: 'all',       label: 'Sve' },
    { key: 'upcoming',  label: `Nadolazeće${upcoming ? ` (${upcoming})` : ''}` },
    { key: 'completed', label: 'Završene' },
    { key: 'cancelled', label: 'Otkazane' },
  ];

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {FILTERS.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              style={{
                padding: '5px 14px', borderRadius: 20, fontSize: 12.5, fontWeight: 600,
                border: '1px solid var(--line)', cursor: 'pointer',
                background: filter === f.key ? 'var(--accent)' : 'transparent',
                color: filter === f.key ? '#fff' : 'var(--ink-soft)',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={() => setModal('create')} style={btn('primary')}>+ Nova sesija</button>
      </div>

      {/* Table */}
      {loading ? (
        <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Učitavam…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>Nema sesija.</div>
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                {['Student', 'Naslov', 'Datum i vrijeme', 'Trajanje', 'Meeting', 'Status', ''].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
                  <td style={{ ...TD, fontWeight: 600 }}>{s.student_name || '—'}</td>
                  <td style={TD}>{s.title}</td>
                  <td style={{ ...TD, color: 'var(--ink-soft)' }}>{fmtDate(s.scheduled_at)}</td>
                  <td style={{ ...TD, color: 'var(--ink-soft)' }}>{s.duration_minutes} min</td>
                  <td style={TD}>
                    {s.zoom_url ? (
                      <a href={s.zoom_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                        Link ↗
                      </a>
                    ) : <span style={{ color: 'var(--ink-soft)' }}>—</span>}
                  </td>
                  <td style={TD}><StatusChip status={s.status} /></td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => setModal(s)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-soft)', fontSize: 12, cursor: 'pointer' }}>
                        Uredi
                      </button>
                      <button onClick={() => handleDelete(s.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                        Obriši
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <SessionModal
          session={modal === 'create' ? null : modal}
          students={students}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── Package modal ────────────────────────────────────────────────────────────

function PackageModal({ pkg, onClose, onSaved }) {
  const editing = !!pkg;
  const [form, setForm] = useState({
    name: pkg?.name || '',
    hours: pkg?.hours || '',
    price_eur: pkg?.price_eur || '',
    is_active: pkg?.is_active !== 0,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!form.name.trim() || !form.hours || !form.price_eur) return alert('Popuni sva polja.');
    setSaving(true);
    try {
      const payload = { name: form.name.trim(), hours: Number(form.hours), price_eur: Number(form.price_eur), is_active: form.is_active };
      const saved = editing ? await updateTutoringPackage(pkg.id, payload) : await createTutoringPackage(payload);
      onSaved(saved);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', width: 420, maxWidth: 'calc(100vw - 32px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700, color: 'var(--ink)' }}>
            {editing ? 'Uredi paket' : 'Novi paket'}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, color: 'var(--ink-soft)', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>NAZIV PAKETA</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="npr. Blok 5 sati" style={inp} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>SATI</label>
              <input type="number" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} min={1} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>CIJENA (EUR)</label>
              <input type="number" value={form.price_eur} onChange={e => setForm(f => ({ ...f, price_eur: e.target.value }))} min={0} step={0.01} style={inp} />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 13.5 }}>
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} style={{ accentColor: 'var(--accent)', width: 15, height: 15 }} />
            <span style={{ color: 'var(--ink)' }}>Aktivan paket (vidljiv studentima)</span>
          </label>
        </div>

        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btn('ghost')}>Odustani</button>
          <button onClick={handleSave} disabled={saving} style={btn('primary', saving)}>
            {saving ? 'Spremam…' : (editing ? 'Spremi' : 'Kreiraj paket')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Packages tab ─────────────────────────────────────────────────────────────

function PackagesTab() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  function load() {
    getTutoringPackages()
      .then(ps => { setPackages(ps || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function handleDelete(id) {
    if (!window.confirm('Obriši paket?')) return;
    try {
      await deleteTutoringPackage(id);
      setPackages(prev => prev.filter(p => p.id !== id));
    } catch (e) {
      alert(e.message);
    }
  }

  function handleSaved(saved) {
    setPackages(prev => {
      const idx = prev.findIndex(p => p.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [...prev, saved];
    });
    setModal(null);
  }

  const TH = { fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', fontWeight: 600, textAlign: 'left', padding: '8px 12px' };
  const TD = { padding: '11px 12px', borderBottom: '1px solid var(--line)', fontSize: 13.5, color: 'var(--ink)' };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <button onClick={() => setModal('create')} style={btn('primary')}>+ Novi paket</button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Učitavam…</div>
      ) : packages.length === 0 ? (
        <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>
          Nema paketa. Kreiraj prvi paket tutoringa.
        </div>
      ) : (
        <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                {['Naziv', 'Sati', 'Cijena (EUR)', 'Cijena/sat', 'Status', ''].map(h => (
                  <th key={h} style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {packages.map(p => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--line)', opacity: p.is_active ? 1 : .5 }}>
                  <td style={{ ...TD, fontWeight: 600 }}>{p.name}</td>
                  <td style={TD}>{p.hours}h</td>
                  <td style={TD}>{Number(p.price_eur).toFixed(2)} €</td>
                  <td style={{ ...TD, color: 'var(--ink-soft)' }}>{(p.price_eur / p.hours).toFixed(2)} €/h</td>
                  <td style={TD}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 20, background: p.is_active ? '#dcfce7' : '#f1f5f9', color: p.is_active ? '#15803d' : '#64748b' }}>
                      {p.is_active ? 'Aktivan' : 'Neaktivan'}
                    </span>
                  </td>
                  <td style={{ ...TD, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => setModal(p)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-soft)', fontSize: 12, cursor: 'pointer' }}>
                        Uredi
                      </button>
                      <button onClick={() => handleDelete(p.id)} style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fee2e2', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>
                        Obriši
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Info note */}
      <div style={{ marginTop: 20, padding: '12px 16px', borderRadius: 8, background: 'color-mix(in srgb, var(--accent) 6%, transparent)', border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', fontSize: 13, color: 'var(--ink-soft)' }}>
        Paketi su vidljivi studentima na stranici s tutoriranjem. Plaćanje se obrađuje putem Stripe naplate (coming soon).
      </div>

      {modal && (
        <PackageModal
          pkg={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS = [
  { key: 'sessions', label: 'Sesije' },
  { key: 'packages', label: 'Paketi tutoringa' },
];

export default function AdminSessionsPage() {
  const [tab, setTab] = useState('sessions');
  const [students, setStudents] = useState([]);

  useEffect(() => {
    getAdminStudents().then(ss => setStudents(ss || [])).catch(() => {});
  }, []);

  return (
    <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
          Komunikacija
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          Sesije i tutoring
        </h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--line)', marginBottom: 28 }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 20px', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600,
              background: 'transparent', fontFamily: 'inherit',
              color: tab === t.key ? 'var(--accent)' : 'var(--ink-soft)',
              borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'sessions' && <SessionsTab students={students} />}
      {tab === 'packages' && <PackagesTab />}
    </div>
  );
}
