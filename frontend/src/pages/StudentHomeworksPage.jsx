import { useState, useEffect } from 'react';
import { getStudentHomework, submitHomework } from '../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(str) {
  if (!str) return '';
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  return d.toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function deadlineInfo(str) {
  if (!str) return null;
  const d = new Date(str.includes('T') ? str : str.replace(' ', 'T') + 'Z');
  const diff = Math.ceil((d - new Date()) / 86400000);
  if (diff < 0)  return { label: `Rok je prošao`,              color: '#dc2626', urgent: true };
  if (diff === 0) return { label: 'Rok je danas',              color: '#d97706', urgent: true };
  if (diff === 1) return { label: 'Rok je sutra',              color: '#d97706', urgent: false };
  return          { label: `Rok: ${fmtDate(str)} (${diff}d)`, color: 'var(--ink-soft)', urgent: false };
}

const STATUS_META = {
  assigned:   { label: 'Čeka predaju',    bg: '#e0f2fe', color: '#0369a1' },
  submitted:  { label: 'Predano',         bg: '#fef3c7', color: '#b45309' },
  corrected:  { label: 'Ispravljeno',     bg: '#dcfce7', color: '#15803d' },
  overdue:    { label: 'Kasni',           bg: '#fee2e2', color: '#dc2626' },
};

const TYPE_LABELS = { mcq: 'MCQ', true_false: 'T/F', short_answer: 'Kratki odgovor', calculation: 'Računanje', essay: 'Esej' };

function computeStatus(a) {
  if (a.status === 'corrected') return 'corrected';
  if (a.status === 'submitted') return 'submitted';
  if (a.deadline) {
    const d = new Date(a.deadline.includes('T') ? a.deadline : a.deadline.replace(' ', 'T') + 'Z');
    if (d < new Date()) return 'overdue';
  }
  return 'assigned';
}

// ─── Homework detail / answer form ────────────────────────────────────────────

function HomeworkDetail({ assignment, onClose, onSubmitted }) {
  const hw    = assignment;
  const sub   = hw.submission;
  const qs    = hw.homework?.questions || hw.questions || [];
  const done  = hw.status === 'corrected' || hw.status === 'submitted';

  const [answers,  setAnswers]  = useState(() => {
    const init = {};
    for (const q of qs) init[q.id] = '';
    return init;
  });
  const [saving,   setSaving]   = useState(false);
  const [err,      setErr]      = useState('');

  function setAnswer(qid, val) {
    setAnswers(a => ({ ...a, [qid]: val }));
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      const payload = qs.map(q => ({
        question_id:  q.id,
        answer_text:  answers[q.id] || null,
      }));
      await submitHomework(hw.id, payload);
      onSubmitted();
    } catch (ex) {
      setErr(ex.message);
      setSaving(false);
    }
  }

  const status = computeStatus(hw);
  const statusMeta = STATUS_META[status] || STATUS_META.assigned;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', width: 680, maxWidth: 'calc(100vw - 24px)', maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.22)' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)' }}>{hw.homework_title}</h2>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 9px', borderRadius: 20, background: statusMeta.bg, color: statusMeta.color }}>{statusMeta.label}</span>
                {hw.deadline && (() => { const dl = deadlineInfo(hw.deadline); return dl ? <span style={{ fontSize: 12, color: dl.color }}>{dl.label}</span> : null; })()}
              </div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: 'var(--ink-soft)', lineHeight: 1, flexShrink: 0 }}>×</button>
          </div>
          {hw.instruction_html && (
            <div style={{ marginTop: 12, fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.6, background: 'var(--bg)', borderRadius: 8, padding: '10px 14px' }}
              dangerouslySetInnerHTML={{ __html: hw.instruction_html }}
            />
          )}
        </div>

        {/* Questions / answers */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {qs.length === 0 && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Nema pitanja u ovoj zadaći.</div>}

          {qs.map((q, qi) => {
            const isMcqOrTF = q.type === 'mcq' || q.type === 'true_false';
            const isTextual  = !isMcqOrTF;

            let studentAnswer = '';
            if (sub) {
              const a = sub.answers?.find(a => a.question_id === q.id);
              studentAnswer = a?.answer_text || '';
            }

            let teacherNote = '';
            let answerScore = null;
            if (sub) {
              const a = sub.answers?.find(a => a.question_id === q.id);
              teacherNote = a?.teacher_note || '';
              answerScore = a?.score ?? null;
            }

            return (
              <div key={q.id} style={{ marginBottom: 24, padding: '16px 18px', background: 'var(--bg)', borderRadius: 10, border: '1px solid var(--line)' }}>
                {/* Question stem */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', width: 22, flexShrink: 0, paddingTop: 2 }}>{qi + 1}.</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.5, marginBottom: 6 }}
                      dangerouslySetInnerHTML={{ __html: q.stem }}
                    />
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>{TYPE_LABELS[q.type] || q.type}</span>
                      <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', background: 'var(--surface)', padding: '1px 6px', borderRadius: 4 }}>{q.max_points ?? 1} bod</span>
                    </div>
                  </div>
                </div>

                {/* Answer area */}
                {done ? (
                  // Show submitted answer (read-only)
                  <div style={{ marginLeft: 32 }}>
                    {studentAnswer ? (
                      <div style={{ fontSize: 13.5, color: 'var(--ink)', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 }}>
                        {studentAnswer}
                      </div>
                    ) : (
                      <div style={{ fontSize: 13, color: 'var(--ink-faint)', fontStyle: 'italic' }}>Nema odgovora</div>
                    )}
                    {/* Teacher feedback (after correction) */}
                    {hw.status === 'corrected' && (
                      <div style={{ marginTop: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {answerScore !== null && (
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '5px 10px' }}>
                            {answerScore} / {q.max_points ?? 1} bod
                          </div>
                        )}
                        {teacherNote && (
                          <div style={{ fontSize: 12.5, color: 'var(--ink)', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '5px 10px', flex: 1 }}>
                            {teacherNote}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : isTextual ? (
                  <div style={{ marginLeft: 32 }}>
                    <textarea
                      rows={4}
                      style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--surface)', color: 'var(--ink)', fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', outline: 'none' }}
                      placeholder="Upiši odgovor…"
                      value={answers[q.id] || ''}
                      onChange={e => setAnswer(q.id, e.target.value)}
                    />
                  </div>
                ) : (
                  // MCQ / True-False: options
                  <div style={{ marginLeft: 32, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {q.type === 'true_false'
                      ? ['Točno', 'Netočno'].map(opt => (
                          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: answers[q.id] === opt ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)', border: `1px solid ${answers[q.id] === opt ? 'var(--accent)' : 'var(--line)'}`, transition: 'all .1s' }}>
                            <input type="radio" name={`q_${q.id}`} value={opt} checked={answers[q.id] === opt} onChange={() => setAnswer(q.id, opt)} style={{ accentColor: 'var(--accent)' }} />
                            <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{opt}</span>
                          </label>
                        ))
                      : (q.options || []).map((opt, oi) => (
                          <label key={oi} style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: answers[q.id] === opt.text ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--surface)', border: `1px solid ${answers[q.id] === opt.text ? 'var(--accent)' : 'var(--line)'}`, transition: 'all .1s' }}>
                            <input type="radio" name={`q_${q.id}`} value={opt.text} checked={answers[q.id] === opt.text} onChange={() => setAnswer(q.id, opt.text)} style={{ accentColor: 'var(--accent)' }} />
                            <span style={{ fontSize: 13.5, color: 'var(--ink)' }}>{opt.text}</span>
                          </label>
                        ))
                    }
                  </div>
                )}
              </div>
            );
          })}

          {/* Overall teacher comment after correction */}
          {hw.status === 'corrected' && sub?.teacher_comment && (
            <div style={{ marginTop: 8, padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#b45309', marginBottom: 6, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Komentar profesora</div>
              <div style={{ fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.6 }}>{sub.teacher_comment}</div>
            </div>
          )}

          {err && <div style={{ marginTop: 12, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, color: '#dc2626', fontSize: 13 }}>{err}</div>}
        </div>

        {/* Footer */}
        {!done && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontSize: 13.5 }}>Spremi za kasnije</button>
            <button onClick={submit} disabled={saving} style={{ padding: '9px 22px', borderRadius: 8, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 13.5, fontWeight: 600, opacity: saving ? .6 : 1 }}>
              {saving ? 'Predaje se…' : 'Predaj zadaću'}
            </button>
          </div>
        )}
        {done && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', cursor: 'pointer', fontSize: 13.5 }}>Zatvori</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentHomeworksPage() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [assignments, setAssignments] = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [open,        setOpen]        = useState(null);

  function load() {
    setLoading(true);
    getStudentHomework()
      .then(a => { setAssignments(a || []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const pending   = assignments.filter(a => a.status !== 'corrected');
  const corrected = assignments.filter(a => a.status === 'corrected');

  function renderCard(a) {
    const status = computeStatus(a);
    const meta   = STATUS_META[status] || STATUS_META.assigned;
    const dl     = deadlineInfo(a.deadline);

    return (
      <div
        key={a.id}
        onClick={() => setOpen(a)}
        style={{
          display: 'flex', alignItems: 'center', gap: 14,
          padding: '16px 20px', background: 'var(--surface)',
          borderRadius: 12, border: `1px solid ${dl?.urgent ? '#fca5a5' : 'var(--line)'}`,
          marginBottom: 10, cursor: 'pointer', transition: 'box-shadow .12s',
        }}
        onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 5 }}>{a.homework_title}</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 20, background: meta.bg, color: meta.color }}>{meta.label}</span>
            {dl && <span style={{ fontSize: 12, color: dl.color }}>{dl.label}</span>}
          </div>
        </div>
        <div style={{ fontSize: 22, color: 'var(--ink-faint)' }}>›</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px 24px', maxWidth: 680, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
          {t('Domaće zadaće', 'Homework')}
        </div>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
          {t('Zadaće', 'Homework')}
        </h1>
      </div>

      {loading && <div style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Učitavanje…</div>}

      {!loading && assignments.length === 0 && (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14 }}>
          {t('Nema dodijeljenih zadaća.', 'No assignments yet.')}
        </div>
      )}

      {pending.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
            {t('Aktivne', 'Active')}
          </div>
          {pending.map(renderCard)}
        </div>
      )}

      {corrected.length > 0 && (
        <div>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 12 }}>
            {t('Ispravljene', 'Corrected')}
          </div>
          {corrected.map(renderCard)}
        </div>
      )}

      {open && (
        <HomeworkDetail
          assignment={open}
          onClose={() => setOpen(null)}
          onSubmitted={() => { setOpen(null); load(); }}
        />
      )}
    </div>
  );
}
