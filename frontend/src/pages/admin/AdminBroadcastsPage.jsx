import { useState, useEffect } from 'react';
import {
  getBroadcasts, getBroadcast, sendBroadcast, previewBroadcastAudience,
  getAdminStudents, getAdminGroups, getCourses,
} from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function audienceLabel(filter) {
  if (!filter) return 'Svi studenti';
  const { scope, plan, course_id, group_id } = filter;
  if (scope === 'by_plan') return plan === 'premium' ? 'Premium studenti' : 'Basic studenti';
  if (scope === 'by_course') return `Kolegij #${course_id}`;
  if (scope === 'by_group') return `Grupa #${group_id}`;
  if (scope === 'individuals') return 'Odabrani studenti';
  return 'Svi studenti';
}

const SCOPE_OPTIONS = [
  { value: 'all',         label: 'Svi studenti' },
  { value: 'by_plan',     label: 'Po planu' },
  { value: 'by_course',   label: 'Po kolegiju' },
  { value: 'by_group',    label: 'Po grupi' },
  { value: 'individuals', label: 'Odabrani studenti' },
];

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
  if (variant === 'primary')
    return { ...base, background: 'var(--accent)', color: '#fff' };
  if (variant === 'ghost')
    return { ...base, background: 'transparent', color: 'var(--ink-soft)', border: '1px solid var(--line)' };
  if (variant === 'secondary')
    return { ...base, background: 'var(--surface)', color: 'var(--ink)', border: '1px solid var(--line)' };
  return base;
}

// ─── Audience filter builder ──────────────────────────────────────────────────

function AudienceFilter({ filter, onChange, courses, groups, students }) {
  const { scope } = filter;

  function set(key, val) {
    onChange({ ...filter, [key]: val });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>
          PUBLIKA
        </label>
        <select value={scope} onChange={e => onChange({ scope: e.target.value })} style={inp}>
          {SCOPE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {scope === 'by_plan' && (
        <div>
          <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>PLAN</label>
          <select value={filter.plan || 'premium'} onChange={e => set('plan', e.target.value)} style={inp}>
            <option value="premium">Premium</option>
            <option value="basic">Basic</option>
          </select>
        </div>
      )}

      {scope === 'by_course' && (
        <div>
          <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>KOLEGIJ</label>
          <select value={filter.course_id || ''} onChange={e => set('course_id', Number(e.target.value))} style={inp}>
            <option value="">— odaberi —</option>
            {courses.map(c => <option key={c.id} value={c.id}>{c.title_hr || c.title_en}</option>)}
          </select>
        </div>
      )}

      {scope === 'by_group' && (
        <div>
          <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>GRUPA</label>
          <select value={filter.group_id || ''} onChange={e => set('group_id', Number(e.target.value))} style={inp}>
            <option value="">— odaberi —</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      )}

      {scope === 'individuals' && (
        <div>
          <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>STUDENTI</label>
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, maxHeight: 160, overflowY: 'auto', background: 'var(--bg)' }}>
            {students.map(s => {
              const checked = (filter.student_ids || []).includes(s.id);
              return (
                <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 12px', cursor: 'pointer', background: checked ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent' }}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const ids = new Set(filter.student_ids || []);
                      checked ? ids.delete(s.id) : ids.add(s.id);
                      set('student_ids', [...ids]);
                    }}
                    style={{ accentColor: 'var(--accent)', width: 14, height: 14, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: 'var(--ink)', fontWeight: checked ? 600 : 400 }}>{s.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--ink-soft)', marginLeft: 'auto' }}>{s.email}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Compose panel ────────────────────────────────────────────────────────────

function ComposePanel({ courses, groups, students, onSent }) {
  const [form, setForm] = useState({
    title: '', body_hr: '', body_en: '',
    audience_filter: { scope: 'all' },
  });
  const [preview, setPreview] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [sending, setSending] = useState(false);

  async function handlePreview() {
    setPreviewing(true);
    try {
      const count = await previewBroadcastAudience(form.audience_filter);
      setPreview(count);
    } catch (e) {
      alert(e.message);
    } finally {
      setPreviewing(false);
    }
  }

  async function handleSend() {
    if (!form.title.trim()) return alert('Upiši naslov.');
    if (!form.body_hr.trim() && !form.body_en.trim()) return alert('Upiši poruku (HR ili EN).');
    if (!window.confirm(`Slanje svim primateljima. Nastavi?`)) return;
    setSending(true);
    try {
      const b = await sendBroadcast(form);
      onSent(b);
      setForm({ title: '', body_hr: '', body_en: '', audience_filter: { scope: 'all' } });
      setPreview(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
          Nova obavijest
        </div>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          Pošalji obavijest
        </h2>
      </div>

      {/* Naslov */}
      <div>
        <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>NASLOV</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Naslov obavijesti…"
          style={inp}
        />
      </div>

      {/* Body HR */}
      <div>
        <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>PORUKA (HR)</label>
        <textarea
          value={form.body_hr}
          onChange={e => setForm(f => ({ ...f, body_hr: e.target.value }))}
          rows={4}
          placeholder="Tekst poruke na hrvatskom…"
          style={{ ...inp, resize: 'vertical' }}
        />
      </div>

      {/* Body EN */}
      <div>
        <label style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', display: 'block', marginBottom: 6 }}>PORUKA (EN)</label>
        <textarea
          value={form.body_en}
          onChange={e => setForm(f => ({ ...f, body_en: e.target.value }))}
          rows={4}
          placeholder="Message text in English…"
          style={{ ...inp, resize: 'vertical' }}
        />
      </div>

      {/* Audience */}
      <AudienceFilter
        filter={form.audience_filter}
        onChange={af => { setForm(f => ({ ...f, audience_filter: af })); setPreview(null); }}
        courses={courses}
        groups={groups}
        students={students}
      />

      {/* Preview + Send */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 4 }}>
        <button onClick={handlePreview} disabled={previewing} style={btn('ghost', previewing)}>
          {previewing ? 'Računam…' : 'Provjeri broj primatelja'}
        </button>
        {preview !== null && (
          <span style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            → <strong style={{ color: 'var(--ink)' }}>{preview}</strong> {preview === 1 ? 'primatelj' : 'primatelja'}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={handleSend} disabled={sending} style={btn('primary', sending)}>
          {sending ? 'Šaljem…' : 'Pošalji'}
        </button>
      </div>
    </div>
  );
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function DetailPanel({ broadcastId, onClose }) {
  const [broadcast, setBroadcast] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getBroadcast(broadcastId)
      .then(b => { setBroadcast(b); setLoading(false); })
      .catch(() => setLoading(false));
  }, [broadcastId]);

  if (loading) return <div style={{ padding: 32, color: 'var(--ink-soft)', fontSize: 13 }}>Učitavam…</div>;
  if (!broadcast) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 4 }}>
            {fmtDate(broadcast.sent_at)}
          </div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            {broadcast.title}
          </h2>
        </div>
        <button onClick={onClose} style={{ ...btn('ghost'), padding: '6px 14px', flexShrink: 0 }}>
          ← Novi
        </button>
      </div>

      {/* Audience */}
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', marginBottom: 4 }}>PUBLIKA</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{audienceLabel(broadcast.audience_filter)}</div>
        </div>
        <div style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)', flex: 1 }}>
          <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', marginBottom: 4 }}>PRIMATELJI</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{(broadcast.recipients || []).length}</div>
        </div>
      </div>

      {/* Body */}
      {broadcast.body_hr && (
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', marginBottom: 6 }}>PORUKA (HR)</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)' }}>
            {broadcast.body_hr}
          </div>
        </div>
      )}
      {broadcast.body_en && (
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', marginBottom: 6 }}>PORUKA (EN)</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, whiteSpace: 'pre-wrap', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)' }}>
            {broadcast.body_en}
          </div>
        </div>
      )}

      {/* Recipients */}
      {broadcast.recipients && broadcast.recipients.length > 0 && (
        <div>
          <div style={{ fontSize: 12, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', marginBottom: 8 }}>PRIMATELJI</div>
          <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg)', borderBottom: '1px solid var(--line)' }}>
                  {['Ime', 'Email', 'Dostavljeno'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', fontWeight: 600 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {broadcast.recipients.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '8px 12px', color: 'var(--ink)', fontWeight: 600 }}>{r.name}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{r.email}</td>
                    <td style={{ padding: '8px 12px', color: 'var(--ink-soft)' }}>{fmtDate(r.delivered_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminBroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // broadcast id or null (= compose)
  const [courses, setCourses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);

  function load() {
    getBroadcasts()
      .then(bs => { setBroadcasts(bs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => {
    load();
    getCourses().then(cs => setCourses(cs || [])).catch(() => {});
    getAdminGroups().then(gs => setGroups(gs || [])).catch(() => {});
    getAdminStudents().then(ss => setStudents(ss || [])).catch(() => {});
  }, []);

  function handleSent(b) {
    setBroadcasts(prev => [b, ...prev]);
    setSelected(b.id);
  }

  const TH = { fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', fontWeight: 600, textAlign: 'left', padding: '8px 12px' };
  const TD = { padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 13.5 };

  return (
    <div style={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Left: list */}
      <div style={{
        width: 300, flexShrink: 0, borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', background: 'var(--surface)',
      }}>
        {/* Compose button */}
        <div style={{ padding: '16px 16px 12px', borderBottom: '1px solid var(--line)' }}>
          <button
            onClick={() => setSelected(null)}
            style={{ ...btn(selected === null ? 'primary' : 'ghost'), width: '100%', textAlign: 'center' }}
          >
            + Nova obavijest
          </button>
        </div>

        {/* Broadcasts log */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '20px 16px', color: 'var(--ink-soft)', fontSize: 13 }}>Učitavam…</div>
          ) : broadcasts.length === 0 ? (
            <div style={{ padding: '20px 16px', color: 'var(--ink-soft)', fontSize: 13 }}>Još nema obavijesti.</div>
          ) : (
            broadcasts.map(b => (
              <button
                key={b.id}
                onClick={() => setSelected(b.id)}
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none',
                  borderBottom: '1px solid var(--line)', cursor: 'pointer',
                  background: selected === b.id ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                  borderLeft: selected === b.id ? '3px solid var(--accent)' : '3px solid transparent',
                }}
              >
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3, lineHeight: 1.3 }}>
                  {b.title}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--ink-soft)', display: 'flex', gap: 8 }}>
                  <span>{fmtDate(b.sent_at)}</span>
                  <span>·</span>
                  <span>{b.recipient_count} {b.recipient_count === 1 ? 'primatelj' : 'primatelja'}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right: compose or detail */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 36px' }}>
        {selected === null ? (
          <ComposePanel
            courses={courses}
            groups={groups}
            students={students}
            onSent={handleSent}
          />
        ) : (
          <DetailPanel
            broadcastId={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}
