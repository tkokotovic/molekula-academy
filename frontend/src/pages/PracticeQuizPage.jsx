import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  getMe, getEnrollment, getStudentCourseTopics,
  generatePracticeQuiz, submitAttempt, getAttempt,
  selfGradeAnswer, uploadAnswerImage, getPracticeHistory,
} from '../api/client';
import { ChemText } from '../utils/chemText';

// ─── Constants ────────────────────────────────────────────────────────────────

const DIFFICULTIES = [
  { id: '',       label: 'Bilo koja',  labelEn: 'Any' },
  { id: 'easy',   label: 'Lako',       labelEn: 'Easy' },
  { id: 'medium', label: 'Srednje',    labelEn: 'Medium' },
  { id: 'hard',   label: 'Teško',      labelEn: 'Hard' },
];

const QUESTION_TYPES = [
  { id: 'mcq',          label: 'Višestruki izbor' },
  { id: 'true_false',   label: 'Točno / Netočno' },
  { id: 'fill_blank',   label: 'Dopuni' },
  { id: 'short_answer', label: 'Kratki odgovor' },
  { id: 'chem_equation',label: 'Jednadžba' },
];

const OPEN_TYPES = ['short_answer', 'chem_equation'];
const pctColor = pct => (pct >= 70 ? '#0f8f86' : pct >= 50 ? '#e6a817' : '#c0392b');

// ─── Builder ──────────────────────────────────────────────────────────────────

function Builder({ topics, onGenerate, generating, error }) {
  const [selectedTopics, setSelectedTopics] = useState([]);
  const [difficulty, setDifficulty] = useState('');
  const [types, setTypes] = useState([]);
  const [count, setCount] = useState(10);

  const toggle = (arr, setArr, id) =>
    setArr(arr.includes(id) ? arr.filter(x => x !== id) : [...arr, id]);

  const canGenerate = selectedTopics.length > 0 && !generating;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Topics */}
      <Section title="Teme" subtitle="Odaberi jednu ili više tema · Pick one or more topics">
        {topics.length === 0 ? (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>Nema dostupnih tema u tvojem kolegiju.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {topics.map(t => (
              <Chip key={t.id} active={selectedTopics.includes(t.id)} onClick={() => toggle(selectedTopics, setSelectedTopics, t.id)}>
                {t.title}
              </Chip>
            ))}
          </div>
        )}
      </Section>

      {/* Difficulty */}
      <Section title="Težina">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {DIFFICULTIES.map(d => (
            <Chip key={d.id} active={difficulty === d.id} onClick={() => setDifficulty(d.id)}>
              {d.label}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Types */}
      <Section title="Tipovi pitanja" subtitle="Prazno = svi tipovi · Empty = all types">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {QUESTION_TYPES.map(qt => (
            <Chip key={qt.id} active={types.includes(qt.id)} onClick={() => toggle(types, setTypes, qt.id)}>
              {qt.label}
            </Chip>
          ))}
        </div>
      </Section>

      {/* Count */}
      <Section title="Broj pitanja" subtitle="Maksimalno 20 · Max 20">
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <input
            type="range" min={1} max={20} value={count}
            onChange={e => setCount(Number(e.target.value))}
            style={{ flex: 1, accentColor: 'var(--accent)' }}
          />
          <span style={{ fontFamily: 'var(--mono)', fontSize: 20, fontWeight: 700, color: 'var(--accent)', minWidth: 32, textAlign: 'right' }}>
            {count}
          </span>
        </div>
      </Section>

      {error && <p style={{ color: '#c0392b', fontSize: 14, margin: 0 }}>{error}</p>}

      <button
        onClick={() => onGenerate({ topic_ids: selectedTopics, difficulty, question_types: types, count })}
        disabled={!canGenerate}
        style={{ ...btnPrimary, padding: '14px', fontSize: 16, borderRadius: 'var(--radius-sm)', opacity: canGenerate ? 1 : 0.5 }}
      >
        {generating ? 'Generiram…' : 'Generiraj kviz'}
      </button>
      <p style={{ margin: '-8px 0 0', fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>
        Svaki put novi nasumični odabir · A fresh random selection every time
      </p>
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <div>
      <p style={{ margin: '0 0 2px', fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{title}</p>
      {subtitle && <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--ink-faint)' }}>{subtitle}</p>}
      {!subtitle && <div style={{ height: 8 }} />}
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--body)',
        border: active ? '1.5px solid var(--accent)' : '1.5px solid var(--line)',
        background: active ? 'var(--accent-wash)' : 'var(--surface)',
        color: active ? 'var(--accent-ink)' : 'var(--ink-soft)',
        transition: 'border-color .15s, background .15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── Question inputs (taking phase) ───────────────────────────────────────────

function QInput({ question, answer, onChange, onUpload }) {
  const set = patch => onChange({ ...answer, ...patch });

  if (question.type === 'mcq') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(question.options || []).map(opt => {
          const sel = answer?.selected_option_id === opt.id;
          return (
            <button key={opt.id} onClick={() => set({ selected_option_id: opt.id })}
              style={{ ...optBtn, border: sel ? '2px solid var(--accent)' : '1.5px solid var(--line)', background: sel ? 'var(--accent-wash)' : 'var(--surface)' }}>
              <ChemText text={opt.text} />
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === 'true_false') {
    return (
      <div style={{ display: 'flex', gap: 10 }}>
        {['true', 'false'].map(v => {
          const sel = answer?.value === v;
          return (
            <button key={v} onClick={() => set({ value: v })}
              style={{ flex: 1, padding: 13, borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 600, fontSize: 15,
                border: sel ? '2px solid var(--accent)' : '1.5px solid var(--line)', background: sel ? 'var(--accent-wash)' : 'var(--surface)', color: 'var(--ink)' }}>
              {v === 'true' ? 'Točno ✓' : 'Netočno ✗'}
            </button>
          );
        })}
      </div>
    );
  }
  if (question.type === 'fill_blank') {
    return <input type="text" value={answer?.text || ''} onChange={e => set({ text: e.target.value })} placeholder="Upišite odgovor…" style={txtInput} />;
  }
  // short_answer / chem_equation — text + optional image of working
  return (
    <div>
      {question.type === 'chem_equation'
        ? <input type="text" value={answer?.equation || ''} onChange={e => set({ equation: e.target.value })} placeholder="npr. 2H₂ + O₂ → 2H₂O" style={{ ...txtInput, fontFamily: 'var(--mono)' }} />
        : <textarea value={answer?.text || ''} onChange={e => set({ text: e.target.value })} rows={4} placeholder="Napišite odgovor…" style={{ ...txtInput, resize: 'vertical' }} />}
      <ImageUploadRow answer={answer} onUpload={onUpload} />
    </div>
  );
}

function ImageUploadRow({ answer, onUpload }) {
  const [busy, setBusy] = useState(false);
  async function handle(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try { await onUpload(file); } finally { setBusy(false); e.target.value = ''; }
  }
  return (
    <div style={{ marginTop: 8 }}>
      <label style={{ fontSize: 12, color: 'var(--accent)', cursor: 'pointer', fontWeight: 600 }}>
        {busy ? 'Učitavam…' : answer?.image_url ? '↻ Zamijeni sliku rješenja' : '📷 Dodaj sliku rješenja (rukopis/crtež)'}
        <input type="file" accept="image/*" onChange={handle} style={{ display: 'none' }} />
      </label>
      {answer?.image_url && (
        <img src={answer.image_url} alt="rješenje" style={{ display: 'block', marginTop: 8, maxWidth: '100%', maxHeight: 240, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--line)' }} />
      )}
    </div>
  );
}

// ─── Quiz taking ──────────────────────────────────────────────────────────────

function QuizTaking({ quiz, attempt, onSubmitted }) {
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function uploadFor(qid, file) {
    const url = await uploadAnswerImage(file);
    setAnswers(prev => ({ ...prev, [qid]: { ...prev[qid], image_url: url } }));
  }

  async function submit() {
    setSubmitting(true);
    setError('');
    try {
      const formatted = Object.entries(answers).map(([qid, data]) => ({ question_id: Number(qid), answer_data: data }));
      await submitAttempt(attempt.id, formatted);
      const result = await getAttempt(attempt.id);
      onSubmitted(result);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  const answered = Object.keys(answers).length;
  const total = quiz.questions?.length ?? 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)' }}>{answered}/{total} odgovoreno</p>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.1em', fontWeight: 700 }}>Bez vremenskog limita</span>
      </div>

      {quiz.questions?.map((q, i) => (
        <div key={q.id} style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', padding: '2px 8px', border: '1px solid var(--line)', borderRadius: 20 }}>{i + 1}/{total}</span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-ink)', background: 'var(--accent-wash)', padding: '2px 8px', borderRadius: 20 }}>{q.max_points} bod{q.max_points === 1 ? '' : 'a'}</span>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: 16, lineHeight: 1.6, color: 'var(--ink)', fontWeight: 500 }}><ChemText text={q.stem} /></p>
          <QInput
            question={q}
            answer={answers[q.id]}
            onChange={data => setAnswers(prev => ({ ...prev, [q.id]: data }))}
            onUpload={file => uploadFor(q.id, file)}
          />
        </div>
      ))}

      {error && <p style={{ color: '#c0392b', fontSize: 14, textAlign: 'center', margin: 0 }}>{error}</p>}

      <button onClick={submit} disabled={submitting} style={{ ...btnPrimary, padding: 14, fontSize: 16, borderRadius: 'var(--radius-sm)', background: '#064843' }}>
        {submitting ? 'Predajem…' : `Predaj i pregledaj (${answered}/${total})`}
      </button>
    </div>
  );
}

// ─── Review + self-grading ────────────────────────────────────────────────────

function Review({ initialAttempt, quiz, onNew }) {
  const [attempt, setAttempt] = useState(initialAttempt);
  const [answers, setAnswers] = useState(initialAttempt.answers || []);
  const [savingId, setSavingId] = useState(null);

  const pending = answers.filter(a => a.is_correct === null).length;
  const score = attempt.score ?? 0;
  const maxScore = attempt.max_score ?? 0;
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;

  async function selfGrade(qa, points) {
    setSavingId(qa.question_id);
    try {
      const updated = await selfGradeAnswer(attempt.id, qa.question_id, points);
      setAttempt(updated);
      setAnswers(prev => prev.map(a =>
        a.question_id === qa.question_id
          ? { ...a, points_earned: points, is_correct: points >= a.question.max_points * 0.5 }
          : a));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Score header */}
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 44, fontWeight: 700, color: pctColor(pct), lineHeight: 1 }}>{pct}%</div>
        <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--ink-soft)' }}>
          {score}/{maxScore} bodova
          {pending > 0 && <span style={{ color: '#e6a817', fontWeight: 600 }}> · {pending} za samostalno ocjenjivanje</span>}
        </p>
        {pending === 0 && <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--accent)' }}>✓ Rezultat spremljen u tvoj track record</p>}
      </div>

      {answers.map((qa, i) => (
        <ReviewCard key={i} qa={qa} saving={savingId === qa.question_id} onSelfGrade={selfGrade} />
      ))}

      <button onClick={onNew} style={{ ...btnPrimary, padding: 14, fontSize: 16, borderRadius: 'var(--radius-sm)' }}>Novi kviz</button>
    </div>
  );
}

function ReviewCard({ qa, saving, onSelfGrade }) {
  const { question, answer_data, is_correct, points_earned } = qa;
  const isOpen = OPEN_TYPES.includes(question.type);
  const pendingSelf = is_correct === null;
  const max = question.max_points;

  const borderColor = pendingSelf ? '#e6a817' : is_correct ? '#0f8f86' : '#c0392b';
  const bg = pendingSelf ? 'var(--surface)' : is_correct ? '#e7f6f3' : '#fde8e8';

  const given = (() => {
    const d = answer_data || {};
    if (question.type === 'mcq') {
      const opt = (question.options || []).find(o => o.id === d.selected_option_id);
      return opt ? opt.text : '(bez odgovora)';
    }
    if (question.type === 'true_false') return d.value === 'true' ? 'Točno' : d.value === 'false' ? 'Netočno' : '(bez odgovora)';
    return d.text || d.equation || (d.image_url ? '(slika rješenja)' : '(bez odgovora)');
  })();

  const correctAnswer = (() => {
    if (question.type === 'mcq') return (question.options || []).filter(o => o.is_correct).map(o => o.text).join(', ') || '—';
    if (question.type === 'true_false') {
      const c = (question.options || []).find(o => o.is_correct);
      return c ? (c.text === 'true' ? 'Točno' : 'Netočno') : '—';
    }
    return null;
  })();

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 'var(--radius-sm)', background: bg, padding: '16px 18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, flex: 1 }}><ChemText text={question.stem} /></p>
        <span style={{ flexShrink: 0, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)',
          background: pendingSelf ? 'var(--bg)' : is_correct ? '#d4f5f0' : '#fde8e8', color: pendingSelf ? 'var(--ink-soft)' : is_correct ? '#064843' : '#7a1515' }}>
          {pendingSelf ? `? / ${max}pt` : `${points_earned ?? 0} / ${max}pt`}
        </span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span><strong>Tvoj odgovor:</strong> <ChemText text={String(given)} /></span>
        {answer_data?.image_url && (
          <img src={answer_data.image_url} alt="rješenje" style={{ marginTop: 4, maxWidth: '100%', maxHeight: 240, borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--line)' }} />
        )}
        {!isOpen && !is_correct && correctAnswer && <span style={{ color: '#064843' }}><strong>Točan odgovor:</strong> <ChemText text={correctAnswer} /></span>}
        {isOpen && question.model_answer && <span style={{ marginTop: 4, color: '#064843' }}><strong>Model odgovor:</strong> <ChemText text={question.model_answer} /></span>}
        {question.explanation && <span style={{ marginTop: 4, color: 'var(--ink-faint)' }}>💡 <ChemText text={question.explanation} /></span>}
      </div>

      {/* Self-grading controls for open questions */}
      {isOpen && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed var(--line)' }}>
          <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>
            Usporedi s model odgovorom i sam ocijeni:
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[
              { label: `Točno (${max}pt)`, pts: max, color: '#0f8f86' },
              { label: `Djelomično (${Math.round(max / 2)}pt)`, pts: Math.round(max / 2), color: '#e6a817' },
              { label: 'Netočno (0)', pts: 0, color: '#c0392b' },
            ].map(b => {
              const active = !pendingSelf && points_earned === b.pts;
              return (
                <button key={b.label} disabled={saving} onClick={() => onSelfGrade(qa, b.pts)}
                  style={{ padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: saving ? 'default' : 'pointer', fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${b.color}`, background: active ? b.color : 'var(--surface)', color: active ? '#fff' : b.color }}>
                  {b.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── History / track record ───────────────────────────────────────────────────

function Trend({ attempts }) {
  const pts = attempts.filter(a => a.score_pct !== null).map(a => a.score_pct);
  if (pts.length < 2) return null;
  const w = 100, h = 32;
  const max = 100;
  const step = w / (pts.length - 1);
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i * step).toFixed(1)} ${(h - (p / max) * h).toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 40 }}>
      <path d={path} fill="none" stroke={pctColor(last)} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function HistoryTab() {
  const [attempts, setAttempts] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getPracticeHistory().then(setAttempts).catch(e => setError(e.message));
  }, []);

  if (error) return <p style={{ color: '#c0392b', fontSize: 14 }}>{error}</p>;
  if (!attempts) return <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam…</p>;
  if (attempts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '50px 24px' }}>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)' }}>Još nema riješenih vježbi.</p>
        <p style={{ fontSize: 13, color: 'var(--ink-faint)' }}>Generiraj svoj prvi personalizirani kviz da započneš track record.</p>
      </div>
    );
  }

  const newestFirst = [...attempts].reverse();
  const avg = Math.round(attempts.filter(a => a.score_pct !== null).reduce((s, a) => s + a.score_pct, 0) / Math.max(1, attempts.filter(a => a.score_pct !== null).length));

  // Aggregate per-topic averages across all attempts
  const topicAgg = {};
  attempts.forEach(a => a.per_topic.forEach(t => {
    if (t.pct === null) return;
    const k = t.topic_id ?? 'none';
    if (!topicAgg[k]) topicAgg[k] = { title: t.title, sum: 0, n: 0 };
    topicAgg[k].sum += t.pct; topicAgg[k].n += 1;
  }));
  const topicRows = Object.values(topicAgg).map(t => ({ title: t.title, pct: Math.round(t.sum / t.n) })).sort((a, b) => a.pct - b.pct);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <Stat label="Vježbi" value={attempts.length} />
        <Stat label="Prosjek" value={`${avg}%`} color={pctColor(avg)} />
      </div>

      {/* Trend */}
      <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
        <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Trend rezultata · Score trend</p>
        <Trend attempts={attempts} />
      </div>

      {/* Per-topic averages */}
      {topicRows.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: '14px 16px' }}>
          <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>Prosjek po temama · By topic</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topicRows.map((t, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ flex: 1, fontSize: 13, color: 'var(--ink)' }}>{t.title}</span>
                <div style={{ width: 120, height: 6, background: 'var(--line)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${t.pct}%`, background: pctColor(t.pct) }} />
                </div>
                <span style={{ fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700, color: pctColor(t.pct), minWidth: 36, textAlign: 'right' }}>{t.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Attempt list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {newestFirst.map(a => (
          <div key={a.attempt_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', background: 'var(--surface)' }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
                {a.per_topic.map(t => t.title).join(', ') || 'Vježba'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
                {(a.submitted_at || a.started_at || '').slice(0, 10)} · {a.question_count} pitanja
                {a.status === 'submitted' && <span style={{ color: '#e6a817' }}> · nedovršeno ocjenjivanje</span>}
              </p>
            </div>
            {a.score_pct !== null && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', color: pctColor(a.score_pct), background: 'var(--bg)' }}>
                {a.score_pct}%
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ flex: 1, minWidth: 120, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px', textAlign: 'center' }}>
      <p style={{ margin: '0 0 4px', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 22, fontWeight: 700, fontFamily: 'var(--mono)', color: color || 'var(--ink)' }}>{value}</p>
    </div>
  );
}

// ─── Premium gate ─────────────────────────────────────────────────────────────

function PremiumGate() {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)' }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
      <h2 style={{ margin: '0 0 8px', fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)' }}>Personalizirani kvizovi su Premium značajka</h2>
      <p style={{ margin: '0 auto 20px', fontSize: 14, color: 'var(--ink-soft)', maxWidth: 420, lineHeight: 1.6 }}>
        Sastavi vlastite kvizove po temama, težini i tipu pitanja, vježbaj bez vremenskog limita i prati svoj napredak. Dostupno uz Premium pretplatu.
      </p>
      <Link to="/settings" style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-block' }}>Saznaj više o Premiumu</Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function PracticeQuizPage() {
  const [user, setUser] = useState(undefined);
  const [topics, setTopics] = useState([]);
  const [tab, setTab] = useState('build');           // build | history
  const [phase, setPhase] = useState('builder');     // builder | quiz | review
  const [session, setSession] = useState(null);      // { quiz, attempt }
  const [reviewAttempt, setReviewAttempt] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const me = await getMe();
        setUser(me);
        if (me.subscription_tier === 'premium' || me.role !== 'student') {
          const enr = await getEnrollment().catch(() => null);
          const courseId = enr?.enrollment?.course_id;
          if (courseId) setTopics(await getStudentCourseTopics(courseId).catch(() => []));
        }
      } catch {
        setUser(null);
      }
    })();
  }, []);

  async function handleGenerate(opts) {
    setGenerating(true);
    setError('');
    try {
      const data = await generatePracticeQuiz(opts);
      setSession(data);
      setPhase('quiz');
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  }

  function resetToBuilder() {
    setSession(null);
    setReviewAttempt(null);
    setPhase('builder');
  }

  const isPremium = user && (user.subscription_tier === 'premium' || user.role !== 'student');

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)' }}>Personalizirani kvizovi</h1>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--ink-faint)' }}>
          Sastavi vlastitu vježbu i prati napredak · Build your own practice and track progress
        </p>
      </div>

      {user === undefined && <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam…</p>}

      {user !== undefined && !isPremium && <PremiumGate />}

      {isPremium && (
        <>
          {/* Tabs — only when not mid-quiz */}
          {phase === 'builder' && (
            <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid var(--line)' }}>
              {[{ id: 'build', label: 'Nova vježba' }, { id: 'history', label: 'Track record' }].map(t => (
                <button key={t.id} onClick={() => setTab(t.id)}
                  style={{ padding: '8px 18px', border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 14,
                    fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? 'var(--accent)' : 'var(--ink-soft)',
                    borderBottom: tab === t.id ? '2px solid var(--accent)' : '2px solid transparent', marginBottom: -2 }}>
                  {t.label}
                </button>
              ))}
            </div>
          )}

          {phase === 'builder' && tab === 'build' && (
            <Builder topics={topics} onGenerate={handleGenerate} generating={generating} error={error} />
          )}
          {phase === 'builder' && tab === 'history' && <HistoryTab />}

          {phase === 'quiz' && session && (
            <>
              <button onClick={resetToBuilder} style={{ ...btnGhost, marginBottom: 16 }}>← Odustani</button>
              <QuizTaking
                quiz={session.quiz}
                attempt={session.attempt}
                onSubmitted={result => { setReviewAttempt(result); setPhase('review'); }}
              />
            </>
          )}

          {phase === 'review' && reviewAttempt && session && (
            <Review initialAttempt={reviewAttempt} quiz={session.quiz} onNew={resetToBuilder} />
          )}
        </>
      )}
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary = {
  background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
  padding: '11px 22px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontWeight: 600, fontSize: 14, fontFamily: 'var(--body)',
};
const btnGhost = {
  background: 'transparent', color: 'var(--ink-soft)', border: '1.5px solid var(--line)',
  padding: '9px 18px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontWeight: 600, fontSize: 13, fontFamily: 'var(--body)',
};
const optBtn = {
  textAlign: 'left', padding: '12px 15px', borderRadius: 'var(--radius-sm)',
  color: 'var(--ink)', cursor: 'pointer', fontFamily: 'var(--body)', fontSize: 15, lineHeight: 1.5,
};
const txtInput = {
  width: '100%', padding: '12px 15px', fontSize: 15, border: '1.5px solid var(--line)',
  borderRadius: 'var(--radius-sm)', background: 'var(--surface)', color: 'var(--ink)',
  fontFamily: 'var(--body)', boxSizing: 'border-box', outline: 'none',
};
