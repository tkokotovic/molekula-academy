import { useState, useEffect, useRef } from 'react';
import {
  getAdminGroups, createGroup, updateGroup, deleteGroup,
  getGroup, addGroupMembers, removeGroupMember, getGroupProgress,
  getAdminStudents,
} from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hr-HR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function PlanBadge({ tier }) {
  const isPremium = tier === 'premium';
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700,
      fontFamily: 'var(--mono)',
      background: isPremium ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--bg)',
      color: isPremium ? 'var(--accent)' : 'var(--ink-soft)',
      border: `1px solid ${isPremium ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)'}`,
    }}>
      {isPremium ? 'Premium' : 'Basic'}
    </span>
  );
}

// ─── Add Students Modal ───────────────────────────────────────────────────────

function AddStudentsModal({ groupId, existingIds, onAdded, onClose }) {
  const [allStudents, setAllStudents] = useState([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getAdminStudents().then(s => setAllStudents(s || [])).catch(() => {});
  }, []);

  const available = allStudents.filter(s =>
    !existingIds.has(s.id) &&
    (s.name.toLowerCase().includes(search.toLowerCase()) ||
     s.email.toLowerCase().includes(search.toLowerCase()))
  );

  function toggle(id) {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function handleAdd() {
    if (!selected.size) return;
    setSaving(true);
    try {
      await addGroupMembers(groupId, [...selected]);
      onAdded();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'var(--surface)', borderRadius: 12, width: 480, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,.25)',
        border: '1px solid var(--line)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 17, fontWeight: 700, color: 'var(--ink)', marginBottom: 10 }}>
            Dodaj studente u grupu
          </div>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Pretraži studente…"
            style={{
              width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)',
              background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
          {available.length === 0 && (
            <div style={{ padding: '20px 24px', color: 'var(--ink-soft)', fontSize: 13 }}>
              Nema dostupnih studenata.
            </div>
          )}
          {available.map(s => (
            <label key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '8px 24px',
              cursor: 'pointer',
              background: selected.has(s.id) ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
            }}>
              <input
                type="checkbox"
                checked={selected.has(s.id)}
                onChange={() => toggle(s.id)}
                style={{ accentColor: 'var(--accent)', width: 15, height: 15, flexShrink: 0 }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink)' }}>{s.name}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{s.email}</div>
              </div>
              <PlanBadge tier={s.subscription_tier} />
            </label>
          ))}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnStyle('ghost')}>Odustani</button>
          <button
            onClick={handleAdd}
            disabled={saving || !selected.size}
            style={btnStyle('primary', saving || !selected.size)}
          >
            {saving ? 'Dodajem…' : `Dodaj ${selected.size || ''}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab({ group, onChanged }) {
  const [removing, setRemoving] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const existingIds = new Set((group.members || []).map(m => m.id));

  async function remove(studentId) {
    if (!window.confirm('Ukloni studenta iz grupe?')) return;
    setRemoving(studentId);
    try {
      await removeGroupMember(group.id, studentId);
      onChanged();
    } catch (e) {
      alert(e.message);
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => setShowAdd(true)} style={btnStyle('primary')}>
          + Dodaj studente
        </button>
      </div>

      {(!group.members || group.members.length === 0) ? (
        <EmptyState text="Ova grupa nema članova. Dodaj studente gore." />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--line)' }}>
              {['Ime', 'Email', 'Plan', 'Ispit', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: '.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.members.map(m => (
              <tr key={m.id} style={{ borderBottom: '1px solid var(--line)' }}>
                <td style={{ padding: '10px 12px', color: 'var(--ink)', fontWeight: 600 }}>{m.name}</td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-soft)', fontSize: 13 }}>{m.email}</td>
                <td style={{ padding: '10px 12px' }}><PlanBadge tier={m.subscription_tier} /></td>
                <td style={{ padding: '10px 12px', color: 'var(--ink-soft)', fontSize: 13 }}>{formatDate(m.exam_date)}</td>
                <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                  <button
                    onClick={() => remove(m.id)}
                    disabled={removing === m.id}
                    style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink-soft)', fontSize: 12, cursor: 'pointer', opacity: removing === m.id ? .5 : 1 }}
                  >
                    Ukloni
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showAdd && (
        <AddStudentsModal
          groupId={group.id}
          existingIds={existingIds}
          onAdded={() => { setShowAdd(false); onChanged(); }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ groupId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getGroupProgress(groupId)
      .then(s => setStats(s || []))
      .catch(() => setStats([]))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <Spinner />;

  if (!stats || stats.length === 0) {
    return <EmptyState text="Nema podataka o napretku — dodaj studente u grupu." />;
  }

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr style={{ borderBottom: '1px solid var(--line)' }}>
          {['Student', 'Lekcije', 'Kvizovi', 'Prosjek', 'Zadaće', ''].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '8px 12px', fontSize: 11.5, fontFamily: 'var(--mono)', color: 'var(--ink-soft)', fontWeight: 600, letterSpacing: '.05em' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {stats.map(s => {
          const hwPct = s.homeworks_total > 0
            ? Math.round((s.homeworks_corrected / s.homeworks_total) * 100)
            : null;
          return (
            <tr key={s.id} style={{ borderBottom: '1px solid var(--line)' }}>
              <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--ink)' }}>{s.name}</td>
              <td style={{ padding: '10px 12px', color: 'var(--ink-soft)' }}>{s.lessons_completed}</td>
              <td style={{ padding: '10px 12px', color: 'var(--ink-soft)' }}>{s.quiz_attempts}</td>
              <td style={{ padding: '10px 12px' }}>
                {s.quiz_avg_score !== null
                  ? <span style={{ fontWeight: 700, color: s.quiz_avg_score >= 70 ? '#16a34a' : s.quiz_avg_score >= 50 ? '#d97706' : '#dc2626' }}>{s.quiz_avg_score}%</span>
                  : <span style={{ color: 'var(--ink-soft)' }}>—</span>
                }
              </td>
              <td style={{ padding: '10px 12px', color: 'var(--ink-soft)' }}>
                {hwPct !== null ? `${s.homeworks_corrected}/${s.homeworks_total} (${hwPct}%)` : '—'}
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                {formatDate(s.exam_date)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ─── Group Detail ─────────────────────────────────────────────────────────────

function GroupDetail({ groupId, onGroupRenamed, onGroupDeleted }) {
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('members');
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef(null);

  function load() {
    setLoading(true);
    getGroup(groupId)
      .then(g => { setGroup(g); setEditName(g.name); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [groupId]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  async function handleRename() {
    if (!editName.trim() || editName.trim() === group.name) { setEditing(false); return; }
    setSaving(true);
    try {
      const updated = await updateGroup(groupId, editName.trim());
      setGroup(g => ({ ...g, name: updated.name }));
      onGroupRenamed(groupId, updated.name);
      setEditing(false);
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Obriši grupu "${group.name}"? Ova radnja se ne može poništiti.`)) return;
    try {
      await deleteGroup(groupId);
      onGroupDeleted(groupId);
    } catch (e) {
      alert(e.message);
    }
  }

  if (loading) return <div style={{ padding: 32 }}><Spinner /></div>;
  if (!group) return null;

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      {/* Group header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                ref={inputRef}
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') { setEditing(false); setEditName(group.name); } }}
                style={{
                  fontSize: 22, fontFamily: 'var(--display)', fontWeight: 700,
                  border: 'none', borderBottom: '2px solid var(--accent)',
                  background: 'transparent', color: 'var(--ink)', outline: 'none',
                  padding: '2px 0', width: '100%',
                }}
              />
              <button onClick={handleRename} disabled={saving} style={btnStyle('primary', saving)}>Spremi</button>
              <button onClick={() => { setEditing(false); setEditName(group.name); }} style={btnStyle('ghost')}>✕</button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{group.name}</h2>
              <button onClick={() => setEditing(true)} title="Preimenuj grupu" style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 4, borderRadius: 4 }}>
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            </div>
          )}
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 4 }}>
            {group.members?.length ?? 0} {(group.members?.length ?? 0) === 1 ? 'student' : 'studenta/studenata'}
          </div>
        </div>
        <button onClick={handleDelete} style={{ ...btnStyle('ghost'), color: '#dc2626', borderColor: '#fca5a5', flexShrink: 0 }}>
          Obriši grupu
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20, borderBottom: '1px solid var(--line)' }}>
        {[['members', 'Članovi'], ['progress', 'Napredak']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: '8px 16px', border: 'none', background: 'none', cursor: 'pointer',
            fontSize: 13.5, fontWeight: tab === key ? 700 : 500,
            color: tab === key ? 'var(--accent)' : 'var(--ink-soft)',
            borderBottom: tab === key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1,
          }}>{label}</button>
        ))}
      </div>

      {tab === 'members' && <MembersTab group={group} onChanged={load} />}
      {tab === 'progress' && <ProgressTab groupId={group.id} />}
    </div>
  );
}

// ─── AdminGroupsPage ──────────────────────────────────────────────────────────

export default function AdminGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);

  function loadGroups() {
    setLoading(true);
    getAdminGroups()
      .then(g => setGroups(g || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadGroups(); }, []);

  async function handleCreate() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const g = await createGroup(newName.trim());
      setGroups(prev => [...prev, { ...g, member_count: 0 }]);
      setSelected(g.id);
      setCreating(false);
      setNewName('');
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleGroupRenamed(id, name) {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, name } : g));
  }

  function handleGroupDeleted(id) {
    setGroups(prev => prev.filter(g => g.id !== id));
    if (selected === id) setSelected(null);
  }

  return (
    <div style={{ padding: '28px 28px 48px' }}>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 4px' }}>Admin</p>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', margin: 0 }}>Grupe / Kohorti</h1>
      </div>

      <div style={{ display: 'flex', gap: 28, alignItems: 'flex-start' }}>

        {/* Left: group list */}
        <div style={{ width: 260, flexShrink: 0 }}>
          <button
            onClick={() => { setCreating(true); setSelected(null); }}
            style={{ ...btnStyle('primary'), width: '100%', marginBottom: 12 }}
          >
            + Nova grupa
          </button>

          {creating && (
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10,
              padding: 14, marginBottom: 10,
            }}>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 8, fontFamily: 'var(--mono)', letterSpacing: '.05em', textTransform: 'uppercase' }}>Nova grupa</div>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') { setCreating(false); setNewName(''); } }}
                placeholder="Naziv grupe…"
                style={{
                  width: '100%', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--line)',
                  background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, boxSizing: 'border-box', marginBottom: 10, outline: 'none',
                }}
              />
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={handleCreate} disabled={saving || !newName.trim()} style={btnStyle('primary', saving || !newName.trim())}>
                  {saving ? 'Sprema…' : 'Kreiraj'}
                </button>
                <button onClick={() => { setCreating(false); setNewName(''); }} style={btnStyle('ghost')}>Odustani</button>
              </div>
            </div>
          )}

          {loading ? (
            <Spinner />
          ) : groups.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', padding: '12px 4px' }}>
              Još nema grupa. Kreiraj prvu grupu gore.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {groups.map(g => (
                <button
                  key={g.id}
                  onClick={() => { setSelected(g.id); setCreating(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', borderRadius: 9, border: '1px solid',
                    borderColor: selected === g.id ? 'var(--accent)' : 'var(--line)',
                    background: selected === g.id ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)',
                    cursor: 'pointer', textAlign: 'left', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 13.5, fontWeight: selected === g.id ? 700 : 500, color: selected === g.id ? 'var(--accent)' : 'var(--ink)' }}>
                    {g.name}
                  </span>
                  <span style={{
                    fontSize: 11, fontFamily: 'var(--mono)', fontWeight: 600,
                    padding: '2px 8px', borderRadius: 20,
                    background: 'var(--bg)', color: 'var(--ink-soft)',
                    border: '1px solid var(--line)',
                  }}>
                    {g.member_count}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: detail */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selected && !creating ? (
            <div style={{
              border: '1.5px dashed var(--line)', borderRadius: 12, padding: '48px 32px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--ink-soft)', fontSize: 14,
            }}>
              Odaberi grupu s popisa ili kreiraj novu.
            </div>
          ) : selected ? (
            <GroupDetail
              key={selected}
              groupId={selected}
              onGroupRenamed={handleGroupRenamed}
              onGroupDeleted={handleGroupDeleted}
            />
          ) : null}
        </div>

      </div>
    </div>
  );
}

// ─── Shared micro-components ──────────────────────────────────────────────────

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
      <div style={{ width: 24, height: 24, border: '3px solid var(--line)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin .7s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ padding: '32px 0', color: 'var(--ink-soft)', fontSize: 13.5, textAlign: 'center' }}>
      {text}
    </div>
  );
}

function btnStyle(variant, disabled = false) {
  const base = {
    padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', border: '1px solid',
    opacity: disabled ? .5 : 1, transition: 'opacity .15s',
    fontFamily: 'inherit',
  };
  if (variant === 'primary') return { ...base, background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' };
  return { ...base, background: 'var(--surface)', color: 'var(--ink-soft)', borderColor: 'var(--line)' };
}
