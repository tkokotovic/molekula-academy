import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  getAdminStudent, setStudentSubscription, updateStudentProfile,
  getHomeworkInbox, getHomeworkAssignment, correctAssignment,
  getTeacherSessions, createSession, updateSession, deleteSession,
} from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const lang = () => localStorage.getItem('mol_lang') || 'hr';
const t = (hr, en) => lang() === 'en' ? en : hr;

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hr-HR', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtDatetime(str) {
  if (!str) return '—';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function scoreColor(pct) {
  if (pct == null) return 'var(--ink-soft)';
  if (pct >= 80) return '#1ec8b6';
  if (pct >= 60) return '#f59e0b';
  return '#d6492f';
}

function examCountdown(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d - today) / 86400000);
  if (diff < 0)  return { label: `${fmtDate(dateStr)} (prošao)`, color: 'var(--ink-soft)' };
  if (diff === 0) return { label: 'Danas!', color: '#dc2626' };
  if (diff <= 14) return { label: `Za ${diff}d · ${fmtDate(dateStr)}`, color: '#dc2626' };
  if (diff <= 60) return { label: `Za ${diff}d · ${fmtDate(dateStr)}`, color: '#d97706' };
  return { label: fmtDate(dateStr), color: 'var(--ink-soft)' };
}

function Ring({ pct = 0, size = 60, stroke = 6, colour = 'var(--accent)' }) {
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

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  fontSize: 13.5, fontFamily: 'inherit', outline: 'none',
};

const STATUS_META = {
  assigned:  { label: 'Čeka predaju',    bg: '#e0f2fe', color: '#0369a1' },
  submitted: { label: 'Na ispravljanju', bg: '#fef3c7', color: '#b45309' },
  corrected: { label: 'Ispravljeno',     bg: '#dcfce7', color: '#15803d' },
  overdue:   { label: 'Kasni',           bg: '#fee2e2', color: '#dc2626' },
};

function hwStatus(a) {
  if (a.status === 'corrected') return 'corrected';
  if (a.status === 'submitted') return 'submitted';
  if (a.deadline) {
    const d = new Date(a.deadline.includes('T') ? a.deadline : a.deadline.replace(' ', 'T') + 'Z');
    if (d < new Date()) return 'overdue';
  }
  return 'assigned';
}

function StatusChip({ status }) {
  const m = STATUS_META[status] || STATUS_META.assigned;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
      padding: '2px 8px', borderRadius: 20, background: m.bg, color: m.color,
    }}>
      {m.label}
    </span>
  );
}

// ─── Correction Modal ─────────────────────────────────────────────────────────

function CorrectionModal({ assignmentId, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [scores, setScores] = useState({});
  const [notes, setNotes]   = useState({});
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHomeworkAssignment(assignmentId)
      .then(a => {
        setData(a);
        if (a.submission?.answers) {
          const s = {}; const n = {};
          a.submission.answers.forEach(ans => { s[ans.id] = ans.score ?? ''; n[ans.id] = ans.note ?? ''; });
          setScores(s); setNotes(n);
        }
        setComment(a.submission?.teacher_comment ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [assignmentId]);

  async function save() {
    setSaving(true);
    try {
      const answers = Object.keys(scores).map(id => ({
        answer_id: Number(id),
        score: scores[id] === '' ? null : Number(scores[id]),
        note: notes[id] || '',
      }));
      await correctAssignment(assignmentId, { answers, teacher_comment: comment });
      onSaved();
      onClose();
    } catch (e) {
      alert(e.message);
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
        width: '100%', maxWidth: 620, maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--ink)', margin: 0, flex: 1 }}>
            {t('Ispravljanje zadaće', 'Correct Homework')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 20, lineHeight: 1 }}>×</button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>…</div>
        ) : !data?.submission ? (
          <div style={{ color: 'var(--ink-soft)', padding: 20, textAlign: 'center' }}>
            {t('Student još nije predao zadaću.', 'Student has not submitted yet.')}
          </div>
        ) : (
          <>
            {data.submission.answers.map((ans, i) => {
              const q = data.homework.questions?.find(q => q.id === ans.question_id);
              const maxScore = q?.points ?? 1;
              const isShort = q?.type === 'short_answer' || q?.type === 'calculation' || q?.type === 'essay';
              return (
                <div key={ans.id} style={{
                  marginBottom: 16, padding: '14px 16px', borderRadius: 10,
                  background: 'var(--bg)', border: '1px solid var(--line)',
                }}>
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginBottom: 6 }}>
                    {i + 1}. {q?.type?.toUpperCase() || 'Q'}
                  </div>
                  <div style={{ fontSize: 14, color: 'var(--ink)', marginBottom: 8 }}
                    dangerouslySetInnerHTML={{ __html: q?.stem_html || q?.stem || '' }} />

                  <div style={{
                    background: 'var(--surface)', borderRadius: 6, padding: '8px 12px',
                    fontSize: 13.5, color: 'var(--ink)', marginBottom: isShort ? 10 : 0,
                    border: '1px solid var(--line)',
                  }}>
                    {ans.image_url
                      ? <img src={ans.image_url} alt="odgovor" style={{ maxWidth: '100%', borderRadius: 6, marginTop: 4 }} />
                      : ans.answer_text || <span style={{ color: 'var(--ink-soft)', fontStyle: 'italic' }}>{t('Bez odgovora', 'No answer')}</span>
                    }
                  </div>

                  {isShort && (
                    <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 8, marginTop: 6 }}>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block', marginBottom: 3 }}>
                          {t('Bodovi', 'Score')} /{maxScore}
                        </label>
                        <input
                          type="number" min={0} max={maxScore} step={0.5}
                          value={scores[ans.id] ?? ''}
                          onChange={e => setScores(p => ({ ...p, [ans.id]: e.target.value }))}
                          style={{ ...inp, width: 72, padding: '6px 10px' }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 11, color: 'var(--ink-soft)', display: 'block', marginBottom: 3 }}>
                          {t('Bilješka', 'Note')}
                        </label>
                        <input
                          value={notes[ans.id] ?? ''}
                          onChange={e => setNotes(p => ({ ...p, [ans.id]: e.target.value }))}
                          placeholder={t('Komentar za ovaj odgovor…', 'Comment on this answer…')}
                          style={{ ...inp, padding: '6px 10px' }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>
                {t('Opći komentar studentu', 'General comment to student')}
              </label>
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={3}
                placeholder={t('Opći komentar…', 'General comment…')}
                style={{ ...inp, resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 18, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--line)',
                background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13.5,
              }}>
                {t('Odustani', 'Cancel')}
              </button>
              <button onClick={save} disabled={saving} style={{
                padding: '8px 22px', borderRadius: 8, border: 'none',
                background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
                opacity: saving ? .7 : 1,
              }}>
                {saving ? '…' : t('Spremi ispravljanje', 'Save correction')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Session Modal ─────────────────────────────────────────────────────────────

function SessionModal({ studentId, session, onClose, onSaved }) {
  const isEdit = !!session;
  const [form, setForm] = useState({
    title:            session?.title ?? '',
    scheduled_at:     session?.scheduled_at ? session.scheduled_at.replace(' ', 'T').slice(0, 16) : '',
    duration_minutes: session?.duration_minutes ?? 60,
    zoom_url:         session?.zoom_url ?? '',
    prep_note:        session?.prep_note ?? '',
  });
  const [saving, setSaving] = useState(false);

  function set(key, val) { setForm(p => ({ ...p, [key]: val })); }

  async function save() {
    if (!form.title || !form.scheduled_at) return alert(t('Naslov i datum su obavezni.', 'Title and date are required.'));
    setSaving(true);
    try {
      if (isEdit) {
        await updateSession(session.id, form);
      } else {
        await createSession({ ...form, student_id: studentId });
      }
      onSaved();
      onClose();
    } catch (e) {
      alert(e.message);
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
        width: '100%', maxWidth: 480, boxShadow: '0 8px 40px rgba(0,0,0,.18)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 20, color: 'var(--ink)', margin: 0, flex: 1 }}>
            {isEdit ? t('Uredi termin', 'Edit session') : t('Novi termin', 'New session')}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)', fontSize: 20 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>{t('Naslov', 'Title')}</label>
            <input value={form.title} onChange={e => set('title', e.target.value)} style={inp} placeholder={t('npr. Ponavljanje kemijskog vezanja', 'e.g. Chemical bonding review')} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>{t('Datum i vrijeme', 'Date & time')}</label>
            <input type="datetime-local" value={form.scheduled_at} onChange={e => set('scheduled_at', e.target.value)} style={inp} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>{t('Trajanje (min)', 'Duration (min)')}</label>
            <input type="number" min={15} step={15} value={form.duration_minutes} onChange={e => set('duration_minutes', Number(e.target.value))} style={{ ...inp, width: 120 }} />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>{t('Zoom / Meet link (opcija)', 'Zoom / Meet link (optional)')}</label>
            <input value={form.zoom_url} onChange={e => set('zoom_url', e.target.value)} style={inp} placeholder="https://…" />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--ink-soft)', display: 'block', marginBottom: 4 }}>{t('Bilješka za pripremu', 'Prep note')}</label>
            <textarea value={form.prep_note} onChange={e => set('prep_note', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder={t('Što planiraš obraditi…', 'Topics to cover…')} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 18px', borderRadius: 8, border: '1px solid var(--line)',
            background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13.5,
          }}>
            {t('Odustani', 'Cancel')}
          </button>
          <button onClick={save} disabled={saving} style={{
            padding: '8px 22px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
            opacity: saving ? .7 : 1,
          }}>
            {saving ? '…' : t('Spremi', 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Tab components ───────────────────────────────────────────────────────────

function TabOverview({ student, courses, onProfileSaved }) {
  const isPremium = student.subscription_tier === 'premium';
  const [editExam,   setEditExam]   = useState(false);
  const [examVal,    setExamVal]    = useState(student.exam_date ?? '');
  const [editNotes,  setEditNotes]  = useState(false);
  const [notesVal,   setNotesVal]   = useState(student.admin_notes ?? '');
  const [saving,     setSaving]     = useState(false);

  async function saveField(field, value) {
    setSaving(true);
    try {
      await updateStudentProfile(student.id, { [field]: value });
      onProfileSaved();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  const exam = examCountdown(student.exam_date);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Key info card */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Exam date row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', minWidth: 120, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {t('Datum ispita', 'Exam date')}
          </span>
          {editExam ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="date"
                value={examVal}
                onChange={e => setExamVal(e.target.value)}
                style={{ ...inp, width: 160, padding: '5px 10px' }}
              />
              <button onClick={async () => { await saveField('exam_date', examVal); setEditExam(false); }}
                disabled={saving}
                style={{ padding: '5px 14px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                {saving ? '…' : t('Spremi', 'Save')}
              </button>
              <button onClick={() => { setExamVal(student.exam_date ?? ''); setEditExam(false); }}
                style={{ padding: '5px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 12.5 }}>
                {t('Odustani', 'Cancel')}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 14, color: exam?.color || 'var(--ink-soft)' }}>
                {exam ? exam.label : '—'}
              </span>
              <button onClick={() => setEditExam(true)}
                style={{ fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline' }}>
                {t('Uredi', 'Edit')}
              </button>
            </div>
          )}
        </div>

        {/* Plan row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', minWidth: 120, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            Plan
          </span>
          <span style={{
            padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
            background: isPremium ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--surface)',
            color: isPremium ? 'var(--accent)' : 'var(--ink-soft)',
            border: `1px solid ${isPremium ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)'}`,
          }}>
            {isPremium ? 'Premium' : 'Basic'}
          </span>
        </div>

        {/* Registered */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', minWidth: 120, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
            {t('Registriran', 'Joined')}
          </span>
          <span style={{ fontSize: 14, color: 'var(--ink)' }}>{fmtDate(student.created_at)}</span>
        </div>
      </div>

      {/* Courses */}
      {courses.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, marginTop: 0 }}>
            {t('Upisani kolegiji', 'Enrolled courses')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {courses.map(c => {
              const pct = c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0;
              return (
                <div key={c.id} style={{
                  background: 'var(--bg)', border: '1px solid var(--line)',
                  borderRadius: 10, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <Ring pct={pct} size={52} colour={pct >= 80 ? '#1ec8b6' : pct >= 40 ? '#f59e0b' : 'var(--accent)'} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>{c.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                      {c.completed_lessons}/{c.total_lessons} {t('lekcija', 'lessons')}
                      {' · '}{t('upisano', 'enrolled')} {fmtDate(c.enrolled_at)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Private notes */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-soft)', margin: 0 }}>
            {t('Privatne bilješke', 'Private notes')}
          </h3>
          {!editNotes && (
            <button onClick={() => setEditNotes(true)}
              style={{ fontSize: 11.5, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              {t('Uredi', 'Edit')}
            </button>
          )}
        </div>
        {editNotes ? (
          <div>
            <textarea
              value={notesVal}
              onChange={e => setNotesVal(e.target.value)}
              rows={5}
              placeholder={t('Bilješke vidljive samo tebi…', 'Notes visible only to you…')}
              style={{ ...inp, resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={async () => { await saveField('admin_notes', notesVal); setEditNotes(false); }}
                disabled={saving}
                style={{ padding: '6px 16px', borderRadius: 7, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {saving ? '…' : t('Spremi', 'Save')}
              </button>
              <button onClick={() => { setNotesVal(student.admin_notes ?? ''); setEditNotes(false); }}
                style={{ padding: '6px 12px', borderRadius: 7, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 13 }}>
                {t('Odustani', 'Cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10,
            padding: '12px 16px', fontSize: 14, color: student.admin_notes ? 'var(--ink)' : 'var(--ink-soft)',
            minHeight: 60, whiteSpace: 'pre-wrap', fontStyle: student.admin_notes ? 'normal' : 'italic',
          }}>
            {student.admin_notes || t('Nema bilješki.', 'No notes.')}
          </div>
        )}
      </div>
    </div>
  );
}

function TabProgress({ courses, quizHistory }) {
  const avgScore = quizHistory.length
    ? Math.round(quizHistory.reduce((s, q) => s + (q.max_score > 0 ? q.score / q.max_score * 100 : 0), 0) / quizHistory.length)
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Overall ring */}
      {avgScore != null && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, padding: '16px 20px' }}>
          <Ring pct={avgScore} size={72} colour={scoreColor(avgScore)} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{t('Prosječan rezultat kvizova', 'Average quiz score')}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>{quizHistory.length} {t('kvizova', 'quizzes taken')}</div>
          </div>
        </div>
      )}

      {/* Course progress bars */}
      {courses.length > 0 && (
        <div>
          <h3 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, marginTop: 0 }}>
            {t('Napredak po kolegijima', 'Course progress')}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {courses.map(c => {
              const pct = c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0;
              const hrs = Math.floor(c.time_spent_seconds / 3600);
              const mins = Math.floor((c.time_spent_seconds % 3600) / 60);
              const barColor = pct >= 80 ? '#1ec8b6' : pct >= 40 ? '#f59e0b' : 'var(--accent)';
              return (
                <div key={c.id} style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 18px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{c.title}</span>
                    <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, color: barColor }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--line)', borderRadius: 3, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: barColor, borderRadius: 3, transition: 'width .4s' }} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                    {c.completed_lessons}/{c.total_lessons} {t('lekcija', 'lessons')}
                    {c.time_spent_seconds > 0 && ` · ${hrs > 0 ? hrs + 'h ' : ''}${mins}min`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function TabQuizzes({ quizHistory }) {
  if (!quizHistory.length) {
    return <div style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>{t('Nema riješenih kvizova.', 'No quizzes taken.')}</div>;
  }
  return (
    <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      {quizHistory.map((q, i) => {
        const pct = q.max_score > 0 ? Math.round((q.score / q.max_score) * 100) : 0;
        return (
          <div key={q.id} style={{
            display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
            borderBottom: i < quizHistory.length - 1 ? '1px solid var(--line)' : 'none',
          }}>
            <span style={{
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
              color: scoreColor(pct), minWidth: 48, textAlign: 'right',
            }}>
              {pct}%
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, color: 'var(--ink)', fontWeight: 500 }}>{q.quiz_title}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>
                {q.score}/{q.max_score} {t('bodova', 'pts')} · {fmtDate(q.submitted_at)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TabHomeworks({ studentId }) {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [correcting, setCorrecting] = useState(null);

  function load() {
    setLoading(true);
    getHomeworkInbox({ student_id: studentId })
      .then(a => setAssignments(a || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [studentId]);

  if (loading) return <div style={{ color: 'var(--ink-soft)', fontFamily: 'var(--mono)', padding: '20px 0' }}>…</div>;
  if (!assignments.length) return <div style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '20px 0' }}>{t('Nema zadaća.', 'No homeworks.')}</div>;

  return (
    <>
      <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        {assignments.map((a, i) => {
          const status = hwStatus(a);
          const canCorrect = a.status === 'submitted' || a.status === 'corrected';
          return (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px',
              borderBottom: i < assignments.length - 1 ? '1px solid var(--line)' : 'none',
              flexWrap: 'wrap',
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 3 }}>{a.homework_title}</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {a.deadline ? `${t('Rok', 'Deadline')}: ${fmtDate(a.deadline)}` : t('Bez roka', 'No deadline')}
                  {a.submitted_at ? ` · ${t('Predano', 'Submitted')}: ${fmtDate(a.submitted_at)}` : ''}
                </div>
              </div>
              <StatusChip status={status} />
              {canCorrect && (
                <button
                  onClick={() => setCorrecting(a.id)}
                  style={{
                    padding: '5px 14px', borderRadius: 7, border: '1px solid var(--accent)',
                    background: 'transparent', color: 'var(--accent)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  }}
                >
                  {a.status === 'corrected' ? t('Pregledaj', 'Review') : t('Ispravi', 'Correct')}
                </button>
              )}
            </div>
          );
        })}
      </div>
      {correcting && (
        <CorrectionModal
          assignmentId={correcting}
          onClose={() => setCorrecting(null)}
          onSaved={load}
        />
      )}
    </>
  );
}

function TabSessions({ studentId }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  function load() {
    setLoading(true);
    getTeacherSessions(studentId)
      .then(s => setSessions(s || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [studentId]);

  async function remove(id) {
    if (!window.confirm(t('Obriši termin?', 'Delete session?'))) return;
    await deleteSession(id).catch(() => {});
    load();
  }

  const now = new Date();
  const upcoming = sessions.filter(s => new Date(s.scheduled_at) >= now);
  const past     = sessions.filter(s => new Date(s.scheduled_at) < now);

  function SessionCard({ s }) {
    return (
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 10, padding: '14px 16px',
        display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start',
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 3 }}>{s.title}</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            {fmtDatetime(s.scheduled_at)} · {s.duration_minutes} min
          </div>
          {s.zoom_url && (
            <a href={s.zoom_url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: 'var(--accent)', display: 'block', marginTop: 4, textDecoration: 'none' }}>
              🔗 {t('Otvori link', 'Open link')}
            </a>
          )}
          {s.prep_note && (
            <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4, fontStyle: 'italic' }}>{s.prep_note}</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => { setEditing(s); setShowModal(true); }}
            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--ink-soft)', cursor: 'pointer', fontSize: 12 }}>
            {t('Uredi', 'Edit')}
          </button>
          <button onClick={() => remove(s.id)}
            style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #dc2626', background: 'transparent', color: '#dc2626', cursor: 'pointer', fontSize: 12 }}>
            {t('Briši', 'Delete')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 14 }}>
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          style={{
            padding: '7px 18px', borderRadius: 8, border: 'none',
            background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
          }}
        >
          + {t('Zakaži termin', 'Schedule session')}
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--ink-soft)', fontFamily: 'var(--mono)', padding: '12px 0' }}>…</div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <h4 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, marginTop: 0 }}>
                {t('Nadolazeći', 'Upcoming')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(s => <SessionCard key={s.id} s={s} />)}
              </div>
            </div>
          )}
          {past.length > 0 && (
            <div>
              <h4 style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 10, marginTop: 0 }}>
                {t('Prošli', 'Past')}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: .8 }}>
                {past.map(s => <SessionCard key={s.id} s={s} />)}
              </div>
            </div>
          )}
          {!sessions.length && (
            <div style={{ color: 'var(--ink-soft)', fontSize: 14, padding: '8px 0' }}>
              {t('Nema termina.', 'No sessions.')}
            </div>
          )}
        </>
      )}

      {showModal && (
        <SessionModal
          studentId={studentId}
          session={editing}
          onClose={() => { setShowModal(false); setEditing(null); }}
          onSaved={load}
        />
      )}
    </>
  );
}

function TabReports({ student }) {
  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 12,
        padding: '24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 12,
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)' }}>
          {t('Izvještaj za roditelje', 'Parent report')}
        </div>
        <p style={{ fontSize: 14, color: 'var(--ink)', margin: 0, maxWidth: 440 }}>
          {t(
            'PDF izvještaj s napretkom, rezultatima kvizova i osobnom porukom. Dostupno uskoro.',
            'PDF report with progress, quiz results, and a personal note. Coming soon.',
          )}
        </p>
        <button disabled style={{
          padding: '8px 20px', borderRadius: 8, border: 'none',
          background: 'var(--line)', color: 'var(--ink-soft)', cursor: 'not-allowed', fontSize: 13.5, fontWeight: 600,
        }}>
          {t('Generiraj PDF', 'Generate PDF')} (uskoro)
        </button>
      </div>
    </div>
  );
}

// ─── AdminStudentDetailPage ───────────────────────────────────────────────────

const TABS = [
  { key: 'overview',   label: (hr, en) => hr === true ? 'Pregled' : 'Overview' },
  { key: 'progress',   label: (hr, en) => hr === true ? 'Napredak' : 'Progress' },
  { key: 'quizzes',    label: (hr, en) => hr === true ? 'Kvizovi' : 'Quizzes' },
  { key: 'homeworks',  label: (hr, en) => hr === true ? 'Zadaće' : 'Homeworks' },
  { key: 'sessions',   label: (hr, en) => hr === true ? 'Termini' : 'Sessions' },
  { key: 'reports',    label: (hr, en) => hr === true ? 'Izvještaji' : 'Reports' },
];

export default function AdminStudentDetailPage() {
  const { id } = useParams();
  const isHR = (localStorage.getItem('mol_lang') || 'hr') !== 'en';

  const [data,       setData]    = useState(null);
  const [loading,    setLoading] = useState(true);
  const [activeTab,  setActiveTab] = useState('overview');
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
    <div style={{ padding: '28px 28px 48px', maxWidth: 820 }}>

      {/* Back */}
      <Link to="/admin/students" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 20 }}>
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        {t('Svi studenti', 'All students')}
      </Link>

      {/* Profile header */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '18px 22px',
        display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
        marginBottom: 24,
      }}>
        <div style={{
          width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 18,
        }}>
          {student.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)', margin: '0 0 3px' }}>{student.name}</h1>
          <div style={{ fontSize: 13.5, color: 'var(--ink-soft)' }}>{student.email}</div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{
            padding: '5px 12px', borderRadius: 20, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 12,
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
              fontSize: 12, color: 'var(--accent)', background: 'none', border: '1px solid color-mix(in srgb, var(--accent) 30%, transparent)',
              borderRadius: 20, cursor: 'pointer', padding: '5px 12px', opacity: planLoading ? .5 : 1, fontWeight: 600,
            }}
          >
            {t(isPremium ? '↓ Basic' : '↑ Premium', isPremium ? '↓ Basic' : '↑ Premium')}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--line)', marginBottom: 22, overflowX: 'auto' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '9px 16px', border: 'none', background: 'none', cursor: 'pointer',
              fontSize: 13.5, fontWeight: activeTab === tab.key ? 700 : 500,
              color: activeTab === tab.key ? 'var(--accent)' : 'var(--ink-soft)',
              borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
              marginBottom: -1, whiteSpace: 'nowrap',
            }}
          >
            {tab.label(isHR, !isHR)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview'  && <TabOverview student={student} courses={courses} onProfileSaved={load} />}
      {activeTab === 'progress'  && <TabProgress courses={courses} quizHistory={quizHistory} />}
      {activeTab === 'quizzes'   && <TabQuizzes quizHistory={quizHistory} />}
      {activeTab === 'homeworks' && <TabHomeworks studentId={id} />}
      {activeTab === 'sessions'  && <TabSessions studentId={id} />}
      {activeTab === 'reports'   && <TabReports student={student} />}
    </div>
  );
}
