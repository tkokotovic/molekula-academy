import { useState, useEffect, useCallback } from 'react';
import {
  getTeacherHomeworks, createHomework, updateHomework, deleteHomework,
  assignHomework, getHomeworkInbox, getHomeworkAssignment, correctAssignment,
  getQuestions, getAdminStudents, getAdminGroups,
} from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function fmtDeadline(str) {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  const now = new Date();
  const diff = Math.ceil((d - now) / 86400000);
  if (diff < 0) return { label: `Prošlo ${Math.abs(diff)}d`, color: '#dc2626' };
  if (diff === 0) return { label: 'Danas', color: '#d97706' };
  if (diff === 1) return { label: 'Sutra', color: '#d97706' };
  return { label: `Za ${diff}d`, color: 'var(--ink-soft)' };
}

const STATUS_META = {
  assigned:   { label: 'Čeka predaju',    bg: '#e0f2fe', color: '#0369a1' },
  submitted:  { label: 'Na ispravljanju', bg: '#fef3c7', color: '#b45309' },
  corrected:  { label: 'Ispravljeno',     bg: '#dcfce7', color: '#15803d' },
  overdue:    { label: 'Kasni',           bg: '#fee2e2', color: '#dc2626' },
};

const TYPE_LABELS = { mcq: 'MCQ', true_false: 'T/F', short_answer: 'KO', calculation: 'Račun', essay: 'Esej' };
const DIFF_LABELS  = { easy: 'Lako', medium: 'Srednje', hard: 'Teško' };

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
};

function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.assigned;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      padding: '2px 8px', borderRadius: 20,
      background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  );
}

function computeStatus(a) {
  if (a.status === 'corrected') return 'corrected';
  if (a.status === 'submitted') return 'submitted';
  if (a.deadline) {
    const d = new Date(a.deadline.includes('T') ? a.deadline : a.deadline.replace(' ', 'T') + 'Z');
    if (d < new Date()) return 'overdue';
  }
  return 'assigned';
}

// ─── Question picker modal ────────────────────────────────────────────────────

function QuestionPickerModal({ selected, onClose, onConfirm }) {
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [picked,    setPicked]    = useState(selected.map(q => q.id));

  useEffect(() => {
    getQuestions({ status: 'active' })
      .then(qs => { setQuestions(qs || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const filtered = questions.filter(q =>
    !search || q.stem?.toLowerCase().includes(search.toLowerCase()) ||
    q.type?.toLowerCase().includes(search.toLowerCase())
  );

  function toggle(q) {
    setPicked(p => p.includes(q.id) ? p.filter(x => x !== q.id) : [...p, q.id]);
  }

  function confirm() {
    const result = picked.map(id => questions.find(q => q.id === id)).filter(Boolean);
    const existing = selected.filter(q => picked.includes(q.id));
    const existingIds = new Set(existing.map(q => q.id));
    const newOnes = result.filter(q => !existingIds.has(q.id));
    onConfirm([...existing, ...newOnes]);
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 400, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', width: 680, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink)', flex: 1 }}>Odaberi pitanja</h3>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{picked.length} odabrano</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '12px 24px', borderBottom: '1px solid var(--line)' }}>
          <input style={inp} placeholder="Pretraži pitanja…" value={search} onChange={e => setSearch(e.target.value)} autoFocus />
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>Učitavanje…</div>}
          {!loading && filtered.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>Nema pitanja.</div>}
          {filtered.map(q => {
            const active = picked.includes(q.id);
            return (
              <div
                key={q.id}
                onClick={() => toggle(q)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px',
                  borderRadius: 8, cursor: 'pointer', marginBottom: 2,
                  background: active ? 'color-mix(in srgb, var(--accent) 8%, transparent)' : 'transparent',
                  border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'transparent'}`,
                }}
              >
                <div style={{
                  width: 18, height: 18, borderRadius: 5, border: `2px solid ${active ? 'var(--accent)' : 'var(--line)'}`,
                  background: active ? 'var(--accent)' : 'transparent', flexShrink: 0, marginTop: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {active && <svg viewBox="0 0 12 10" width="10" height="10"><path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--ink)', lineHeight: 1.4, marginBottom: 4 }}
                    dangerouslySetInnerHTML={{ __html: q.stem || '(bez teksta)' }}
                  />
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--ink-faint)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>
                      {TYPE_LABELS[q.type] || q.type}
                    </span>
                    <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>
                      {DIFF_LABELS[q.difficulty] || q.difficulty}
                    </span>
                    <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>
                      {q.max_points ?? 1} bod
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontSize: 13 }}>Odustani</button>
          <button onClick={confirm} style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
            Dodaj {picked.length > 0 ? `(${picked.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Create / Edit homework modal ─────────────────────────────────────────────

function HomeworkModal({ initial, onClose, onSaved }) {
  const [title,       setTitle]       = useState(initial?.title || '');
  const [instruction, setInstruction] = useState(initial?.instruction_html || '');
  const [questions,   setQuestions]   = useState(initial?.questions || []);
  const [showPicker,  setShowPicker]  = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [err,         setErr]         = useState('');

  function move(idx, dir) {
    const arr = [...questions];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    setQuestions(arr);
  }

  async function submit(e) {
    e.preventDefault();
    if (!title.trim()) { setErr('Naslov je obavezan.'); return; }
    setSaving(true); setErr('');
    try {
      const fields = { title: title.trim(), instruction_html: instruction || null, question_ids: questions.map(q => q.id) };
      if (initial) await updateHomework(initial.id, fields);
      else await createHomework(fields);
      onSaved();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 28, width: 620, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>
              {initial ? 'Uredi zadaću' : 'Nova zadaća'}
            </h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1 }}>×</button>
          </div>

          <form onSubmit={submit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 5, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Naslov</label>
              <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="Npr. Kemijska ravnoteža — vježba" autoFocus />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 5, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Uputa (opcionalno)</label>
              <textarea
                style={{ ...inp, minHeight: 80, resize: 'vertical' }}
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder="Dodatna uputa studentu…"
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <label style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                  Pitanja ({questions.length})
                </label>
                <button type="button" onClick={() => setShowPicker(true)} style={{ padding: '5px 12px', borderRadius: 7, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                  + Dodaj pitanja
                </button>
              </div>

              {questions.length === 0 && (
                <div style={{ padding: '16px', border: '1.5px dashed var(--line)', borderRadius: 8, textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13 }}>
                  Nema pitanja — klikni "Dodaj pitanja"
                </div>
              )}

              {questions.map((q, i) => (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, border: '1px solid var(--line)', marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', width: 20, textAlign: 'right', flexShrink: 0 }}>{i + 1}.</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                      dangerouslySetInnerHTML={{ __html: q.stem || '(bez teksta)' }}
                    />
                    <div style={{ display: 'flex', gap: 5, marginTop: 3 }}>
                      <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>{TYPE_LABELS[q.type] || q.type}</span>
                      <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>· {q.max_points ?? 1} bod</span>
                    </div>
                  </div>
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} style={{ background: 'none', border: 'none', cursor: i === 0 ? 'default' : 'pointer', opacity: i === 0 ? .3 : .7, fontSize: 15, padding: '2px 4px', color: 'var(--ink)' }}>↑</button>
                  <button type="button" onClick={() => move(i,  1)} disabled={i === questions.length - 1} style={{ background: 'none', border: 'none', cursor: i === questions.length - 1 ? 'default' : 'pointer', opacity: i === questions.length - 1 ? .3 : .7, fontSize: 15, padding: '2px 4px', color: 'var(--ink)' }}>↓</button>
                  <button type="button" onClick={() => setQuestions(qs => qs.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-soft)', padding: '2px 4px', lineHeight: 1 }}>×</button>
                </div>
              ))}
            </div>

            {err && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{err}</div>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontSize: 13.5 }}>Odustani</button>
              <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Sprema…' : (initial ? 'Spremi promjene' : 'Stvori zadaću')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {showPicker && (
        <QuestionPickerModal
          selected={questions}
          onClose={() => setShowPicker(false)}
          onConfirm={newList => { setQuestions(newList); setShowPicker(false); }}
        />
      )}
    </>
  );
}

// ─── Assign modal ─────────────────────────────────────────────────────────────

function AssignModal({ homework, onClose, onAssigned }) {
  const [mode,       setMode]       = useState('student'); // 'student' | 'group'
  const [students,   setStudents]   = useState([]);
  const [groups,     setGroups]     = useState([]);
  const [studentId,  setStudentId]  = useState('');
  const [groupId,    setGroupId]    = useState('');
  const [deadline,   setDeadline]   = useState('');
  const [saving,     setSaving]     = useState(false);
  const [err,        setErr]        = useState('');

  useEffect(() => {
    Promise.all([getAdminStudents(), getAdminGroups()])
      .then(([s, g]) => { setStudents(s || []); setGroups(g || []); })
      .catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (mode === 'student' && !studentId) { setErr('Odaberi studenta.'); return; }
    if (mode === 'group'   && !groupId)   { setErr('Odaberi grupu.'); return; }
    setSaving(true); setErr('');
    try {
      const body = mode === 'student'
        ? { student_id: Number(studentId), deadline: deadline || null }
        : { group_id:   Number(groupId),   deadline: deadline || null };
      await assignHomework(homework.id, body);
      onAssigned();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 28, width: 480, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>Dodijeli zadaću</h3>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>{homework.title}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={submit}>
          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--bg)', borderRadius: 10, padding: 4 }}>
            {[['student', 'Pojedinac'], ['group', 'Grupa']].map(([v, l]) => (
              <button
                key={v} type="button"
                onClick={() => setMode(v)}
                style={{ flex: 1, padding: '7px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .12s',
                  background: mode === v ? 'var(--surface)' : 'transparent',
                  color: mode === v ? 'var(--ink)' : 'var(--ink-soft)',
                  boxShadow: mode === v ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
                }}
              >{l}</button>
            ))}
          </div>

          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 5, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              {mode === 'student' ? 'Student' : 'Grupa'}
            </label>
            {mode === 'student' ? (
              <select style={inp} value={studentId} onChange={e => setStudentId(e.target.value)}>
                <option value="">— odaberi studenta —</option>
                {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
              </select>
            ) : (
              <select style={inp} value={groupId} onChange={e => setGroupId(e.target.value)}>
                <option value="">— odaberi grupu —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            )}
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 5, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
              Rok (opcionalno)
            </label>
            <input type="date" style={inp} value={deadline} onChange={e => setDeadline(e.target.value)} />
          </div>

          {err && <div style={{ marginBottom: 12, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{err}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontSize: 13.5 }}>Odustani</button>
            <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, opacity: saving ? .6 : 1 }}>
              {saving ? 'Dodjeljuje…' : 'Dodijeli'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Correction modal ─────────────────────────────────────────────────────────

function CorrectionModal({ assignmentId, onClose, onCorrected }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [scores,  setScores]  = useState({});
  const [notes,   setNotes]   = useState({});
  const [comment, setComment] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [err,     setErr]     = useState('');

  useEffect(() => {
    getHomeworkAssignment(assignmentId)
      .then(a => {
        setData(a);
        if (a.submission) {
          const initScores = {};
          const initNotes  = {};
          for (const ans of a.submission.answers) {
            initScores[ans.id] = ans.score  ?? '';
            initNotes[ans.id]  = ans.teacher_note ?? '';
          }
          setScores(initScores);
          setNotes(initNotes);
          setComment(a.submission.teacher_comment || '');
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [assignmentId]);

  async function submit(e) {
    e.preventDefault();
    if (!data?.submission) return;
    setSaving(true); setErr('');
    try {
      const answers = data.submission.answers.map(ans => ({
        answer_id:    ans.id,
        score:        scores[ans.id] !== '' ? Number(scores[ans.id]) : null,
        teacher_note: notes[ans.id] || null,
      }));
      await correctAssignment(assignmentId, { teacher_comment: comment || null, answers });
      onCorrected();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 40, color: 'var(--ink-soft)', fontSize: 14 }}>Učitavanje…</div>
      </div>
    );
  }

  if (!data) return null;

  const sub = data.submission;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 0, width: 720, maxWidth: 'calc(100vw - 32px)', maxHeight: 'calc(100vh - 48px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        {/* Header */}
        <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: '0 0 2px', fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>
              {data.homework_title}
            </h3>
            <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
              {data.student_name} · predano {fmtDate(sub?.submitted_at)}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1, marginTop: 2 }}>×</button>
        </div>

        {!sub ? (
          <div style={{ padding: 32, color: 'var(--ink-soft)', fontSize: 13, textAlign: 'center' }}>Student još nije predao zadaću.</div>
        ) : (
          <form onSubmit={submit} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 28px' }}>
              {data.questions?.map((q, qi) => {
                const ans = sub.answers.find(a => a.question_id === q.id);
                const needsScore = ['short_answer', 'calculation', 'essay'].includes(q.type);
                return (
                  <div key={q.id} style={{ marginBottom: 20, padding: '16px 18px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--line)' }}>
                    {/* Question */}
                    <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', width: 22, flexShrink: 0, paddingTop: 2 }}>{qi + 1}.</span>
                      <div>
                        <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 6 }}
                          dangerouslySetInnerHTML={{ __html: q.stem }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>{TYPE_LABELS[q.type] || q.type}</span>
                          <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>{q.max_points ?? 1} bod</span>
                        </div>
                      </div>
                    </div>

                    {/* Student answer */}
                    <div style={{ marginLeft: 32, marginBottom: needsScore ? 12 : 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Odgovor studenta</div>
                      {ans?.answer_text ? (
                        <div style={{ fontSize: 13, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 }}>
                          {ans.answer_text}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic' }}>Nema odgovora</div>
                      )}
                      {ans?.file_url && (
                        <a href={ans.file_url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--accent)', display: 'inline-block', marginTop: 6 }}>
                          📎 Priložena datoteka
                        </a>
                      )}
                    </div>

                    {/* Model answer (for reference) */}
                    {q.model_answer && (
                      <div style={{ marginLeft: 32, marginBottom: needsScore ? 12 : 0 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Model odgovora</div>
                        <div style={{ fontSize: 12.5, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '7px 11px' }}>{q.model_answer}</div>
                      </div>
                    )}

                    {/* Score + note fields for manual grading */}
                    {needsScore && ans && (
                      <div style={{ marginLeft: 32, display: 'grid', gridTemplateColumns: '100px 1fr', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
                            Bodovi / {q.max_points ?? 1}
                          </div>
                          <input
                            type="number" min="0" max={q.max_points ?? 1} step="0.5"
                            style={{ ...inp, padding: '6px 10px' }}
                            value={scores[ans.id] ?? ''}
                            onChange={e => setScores(s => ({ ...s, [ans.id]: e.target.value }))}
                          />
                        </div>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 4, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Komentar</div>
                          <input
                            style={{ ...inp, padding: '6px 10px' }}
                            value={notes[ans.id] || ''}
                            onChange={e => setNotes(n => ({ ...n, [ans.id]: e.target.value }))}
                            placeholder="Opcionalni komentar za ovo pitanje…"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Overall comment */}
              <div style={{ marginBottom: 8 }}>
                <label style={{ display: 'block', fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', marginBottom: 5, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Opći komentar</label>
                <textarea
                  style={{ ...inp, minHeight: 72, resize: 'vertical' }}
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Opći komentar za cijelu zadaću…"
                />
              </div>

              {err && <div style={{ padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{err}</div>}
            </div>

            <div style={{ padding: '16px 28px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontSize: 13.5 }}>Zatvori</button>
              <button type="submit" disabled={saving || data.status === 'corrected'} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: '#15803d', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, opacity: saving ? .6 : 1 }}>
                {saving ? 'Sprema…' : data.status === 'corrected' ? 'Već ispravljeno' : 'Označi ispravljenim'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Homework list tab ────────────────────────────────────────────────────────

function HomeworkListTab() {
  const [homeworks,   setHomeworks]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showCreate,  setShowCreate]  = useState(false);
  const [editing,     setEditing]     = useState(null);
  const [assigning,   setAssigning]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getTeacherHomeworks()
      .then(h => { setHomeworks(h || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(hw) {
    if (!window.confirm(`Obriši zadaću "${hw.title}"? Sva dodjela će biti izgubljena.`)) return;
    try { await deleteHomework(hw.id); load(); } catch (ex) { alert(ex.message); }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>Zadaće</div>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Nova zadaća
        </button>
      </div>

      {loading && <div style={{ color: 'var(--ink-soft)', fontSize: 13, padding: '24px 0' }}>Učitavanje…</div>}

      {!loading && homeworks.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14 }}>
          Nema zadaća. Klikni "Nova zadaća" za početak.
        </div>
      )}

      {homeworks.map(hw => (
        <div key={hw.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', marginBottom: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{hw.title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-faint)' }}>
              {hw.question_count ?? 0} {hw.question_count === 1 ? 'pitanje' : 'pitanja'} · stvoreno {fmtDate(hw.created_at)}
            </div>
          </div>
          <button
            onClick={() => setAssigning(hw)}
            style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--accent)', background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}
          >
            Dodijeli
          </button>
          <button
            onClick={() => setEditing(hw)}
            style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 12.5 }}
          >
            Uredi
          </button>
          <button
            onClick={() => handleDelete(hw)}
            style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12.5 }}
          >
            Briši
          </button>
        </div>
      ))}

      {showCreate && (
        <HomeworkModal onClose={() => setShowCreate(false)} onSaved={() => { setShowCreate(false); load(); }} />
      )}
      {editing && (
        <HomeworkModal initial={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {assigning && (
        <AssignModal homework={assigning} onClose={() => setAssigning(null)} onAssigned={() => { setAssigning(null); }} />
      )}
    </div>
  );
}

// ─── Inbox tab ────────────────────────────────────────────────────────────────

function InboxTab() {
  const [assignments,  setAssignments]  = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [correcting,   setCorrecting]   = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    getHomeworkInbox()
      .then(a => { setAssignments(a || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const list = assignments
    .map(a => ({ ...a, _status: computeStatus(a) }))
    .filter(a => filter === 'all' || a._status === filter);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>Inbox</div>
      </div>

      {/* Filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {[['all', 'Sve'], ['submitted', 'Na ispravljanju'], ['corrected', 'Ispravljeno'], ['overdue', 'Kasni'], ['assigned', 'Čeka predaju']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setFilter(v)}
            style={{
              padding: '5px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
              border: `1px solid ${filter === v ? 'var(--accent)' : 'var(--line)'}`,
              background: filter === v ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg)',
              color: filter === v ? 'var(--accent)' : 'var(--ink-soft)',
            }}
          >{l}</button>
        ))}
      </div>

      {loading && <div style={{ color: 'var(--ink-soft)', fontSize: 13, padding: '24px 0' }}>Učitavanje…</div>}
      {!loading && list.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14 }}>Nema zadaća u ovoj kategoriji.</div>
      )}

      {list.map(a => {
        const dl = fmtDeadline(a.deadline);
        const canCorrect = a._status === 'submitted';
        return (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', background: 'var(--surface)', borderRadius: 10, border: '1px solid var(--line)', marginBottom: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{a.homework_title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginBottom: 4 }}>{a.student_name}</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusChip status={a._status} />
                {dl && <span style={{ fontSize: 11.5, color: dl.color, fontFamily: 'var(--mono)' }}>{dl.label}</span>}
                {a.submitted_at && <span style={{ fontSize: 11.5, color: 'var(--ink-faint)' }}>predano {fmtDate(a.submitted_at)}</span>}
              </div>
            </div>
            <button
              onClick={() => setCorrecting(a.id)}
              style={{
                padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                background: canCorrect ? '#15803d' : 'var(--bg)',
                color: canCorrect ? '#fff' : 'var(--ink-soft)',
                border: `1px solid ${canCorrect ? '#15803d' : 'var(--line)'}`,
              }}
            >
              {canCorrect ? 'Ispravi' : 'Pregled'}
            </button>
          </div>
        );
      })}

      {correcting !== null && (
        <CorrectionModal
          assignmentId={correcting}
          onClose={() => setCorrecting(null)}
          onCorrected={() => { setCorrecting(null); load(); }}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminHomeworksPage() {
  const [tab, setTab] = useState('homeworks');

  return (
    <div style={{ padding: '32px 40px', maxWidth: 900 }}>
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 28, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
        {[['homeworks', 'Zadaće'], ['inbox', 'Inbox']].map(([v, l]) => (
          <button
            key={v}
            onClick={() => setTab(v)}
            style={{
              padding: '8px 20px', fontSize: 13.5, fontWeight: 600, cursor: 'pointer',
              background: 'none', border: 'none',
              color: tab === v ? 'var(--accent)' : 'var(--ink-soft)',
              borderBottom: `2px solid ${tab === v ? 'var(--accent)' : 'transparent'}`,
              marginBottom: -1, transition: 'all .12s',
            }}
          >{l}</button>
        ))}
      </div>

      {tab === 'homeworks' && <HomeworkListTab />}
      {tab === 'inbox'     && <InboxTab />}
    </div>
  );
}
