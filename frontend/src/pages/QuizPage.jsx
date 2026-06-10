import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getQuiz, getQuizAttempts, startAttempt, submitAttempt, getAttempt } from '../api/client';
import { ChemText } from '../utils/chemText';

// ─── Timer ────────────────────────────────────────────────────────────────────

function useTimer(timeLimitMinutes, onExpire) {
  const [secondsLeft, setSecondsLeft] = useState(
    timeLimitMinutes ? timeLimitMinutes * 60 : null
  );
  const expiredRef = useRef(false);

  useEffect(() => {
    if (secondsLeft === null) return;
    if (secondsLeft <= 0) {
      if (!expiredRef.current) { expiredRef.current = true; onExpire(); }
      return;
    }
    const id = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft, onExpire]);

  function fmt(s) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, '0')}`;
  }

  return { secondsLeft, display: secondsLeft !== null ? fmt(secondsLeft) : null };
}

// ─── Score ring ───────────────────────────────────────────────────────────────

function ScoreRing({ score, maxScore }) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const r = 44;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? '#0f8f86' : pct >= 50 ? '#e6a817' : '#c0392b';

  return (
    <div style={{ position: 'relative', width: 110, height: 110, margin: '0 auto' }}>
      <svg width="110" height="110" viewBox="0 0 110 110">
        <circle cx="55" cy="55" r={r} fill="none" stroke="var(--line, #e2eae9)" strokeWidth="8" />
        <circle
          cx="55" cy="55" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          transform="rotate(-90 55 55)"
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.2,.7,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color, fontFamily: 'var(--mono, monospace)', lineHeight: 1 }}>{pct}%</span>
        <span style={{ fontSize: 11, color: 'var(--ink-faint, #7d8d92)', fontFamily: 'var(--mono, monospace)' }}>{score}/{maxScore}</span>
      </div>
    </div>
  );
}

// ─── Question renderers ───────────────────────────────────────────────────────

function QuestionMCQ({ question, answer, onChange, disabled }) {
  const options = question.options || [];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map(opt => {
        const selected = answer?.selected_option_id === opt.id;
        return (
          <button
            key={opt.id}
            disabled={disabled}
            onClick={() => onChange({ selected_option_id: opt.id })}
            style={{
              textAlign: 'left', padding: '13px 16px',
              border: selected ? '2px solid var(--accent, #0f8f86)' : '1.5px solid var(--line, #e2eae9)',
              borderRadius: 'var(--radius-sm, 12px)',
              background: selected ? 'var(--accent-wash, #e7f6f3)' : 'var(--surface, #fff)',
              color: 'var(--ink, #15252b)', cursor: disabled ? 'default' : 'pointer',
              fontFamily: 'var(--body, sans-serif)', fontSize: 15, lineHeight: 1.5,
              transition: 'border-color .15s, background .15s',
            }}
          >
            <span style={{ display: 'inline-block', width: 22, height: 22, borderRadius: '50%', border: selected ? '2px solid var(--accent, #0f8f86)' : '1.5px solid var(--line-strong, #cfdcda)', marginRight: 12, verticalAlign: 'middle', background: selected ? 'var(--accent, #0f8f86)' : 'transparent', flexShrink: 0 }} />
            <ChemText text={opt.text} />
          </button>
        );
      })}
    </div>
  );
}

function QuestionTrueFalse({ answer, onChange, disabled }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {['true', 'false'].map(val => {
        const selected = answer?.value === val;
        return (
          <button
            key={val}
            disabled={disabled}
            onClick={() => onChange({ value: val })}
            style={{
              flex: 1, padding: '14px', border: selected ? '2px solid var(--accent, #0f8f86)' : '1.5px solid var(--line, #e2eae9)',
              borderRadius: 'var(--radius-sm, 12px)', background: selected ? 'var(--accent-wash, #e7f6f3)' : 'var(--surface, #fff)',
              color: selected ? 'var(--accent-ink, #064843)' : 'var(--ink, #15252b)',
              cursor: disabled ? 'default' : 'pointer', fontFamily: 'var(--body, sans-serif)',
              fontSize: 16, fontWeight: 600, transition: 'border-color .15s, background .15s',
            }}
          >
            {val === 'true' ? 'Točno ✓' : 'Netočno ✗'}
          </button>
        );
      })}
    </div>
  );
}

function QuestionFillBlank({ answer, onChange, disabled }) {
  return (
    <input
      type="text"
      value={answer?.text || ''}
      onChange={e => onChange({ text: e.target.value })}
      disabled={disabled}
      placeholder="Upišite odgovor…"
      style={{
        width: '100%', padding: '13px 16px', fontSize: 16,
        border: '1.5px solid var(--line, #e2eae9)', borderRadius: 'var(--radius-sm, 12px)',
        background: 'var(--surface, #fff)', color: 'var(--ink, #15252b)',
        fontFamily: 'var(--body, sans-serif)', boxSizing: 'border-box',
        outline: 'none',
      }}
    />
  );
}

function QuestionShortAnswer({ answer, onChange, disabled }) {
  return (
    <textarea
      value={answer?.text || ''}
      onChange={e => onChange({ text: e.target.value })}
      disabled={disabled}
      rows={5}
      placeholder="Napišite odgovor…"
      style={{
        width: '100%', padding: '13px 16px', fontSize: 15, lineHeight: 1.6,
        border: '1.5px solid var(--line, #e2eae9)', borderRadius: 'var(--radius-sm, 12px)',
        background: 'var(--surface, #fff)', color: 'var(--ink, #15252b)',
        fontFamily: 'var(--body, sans-serif)', boxSizing: 'border-box',
        resize: 'vertical', outline: 'none',
      }}
    />
  );
}

function QuestionChemEquation({ answer, onChange, disabled }) {
  return (
    <div>
      <input
        type="text"
        value={answer?.equation || ''}
        onChange={e => onChange({ equation: e.target.value })}
        disabled={disabled}
        placeholder="npr. 2H₂ + O₂ → 2H₂O"
        style={{
          width: '100%', padding: '13px 16px', fontSize: 16,
          border: '1.5px solid var(--line, #e2eae9)', borderRadius: 'var(--radius-sm, 12px)',
          background: 'var(--surface, #fff)', color: 'var(--ink, #15252b)',
          fontFamily: 'var(--mono, monospace)', boxSizing: 'border-box', outline: 'none',
        }}
      />
      <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--ink-faint, #7d8d92)' }}>
        Koristite → za strelicu · Use → for arrow, ⇌ for equilibrium
      </p>
    </div>
  );
}

function QuestionInput({ question, answer, onChange, disabled }) {
  switch (question.type) {
    case 'mcq':          return <QuestionMCQ question={question} answer={answer} onChange={onChange} disabled={disabled} />;
    case 'true_false':   return <QuestionTrueFalse answer={answer} onChange={onChange} disabled={disabled} />;
    case 'fill_blank':   return <QuestionFillBlank answer={answer} onChange={onChange} disabled={disabled} />;
    case 'short_answer': return <QuestionShortAnswer answer={answer} onChange={onChange} disabled={disabled} />;
    case 'chem_equation':return <QuestionChemEquation answer={answer} onChange={onChange} disabled={disabled} />;
    default: return <p style={{ color: 'var(--ink-faint)' }}>Nepoznat tip pitanja: {question.type}</p>;
  }
}

// ─── Results — per-question feedback ─────────────────────────────────────────

function AnswerFeedback({ qa }) {
  const { question, answer_data, is_correct, points_earned, ai_feedback, ai_suggested_points } = qa;
  const needsManual = is_correct === null;
  const borderColor = needsManual ? 'var(--line-strong, #cfdcda)' : is_correct ? '#0f8f86' : '#c0392b';
  const bgColor     = needsManual ? 'var(--surface)' : is_correct ? '#e7f6f3' : '#fde8e8';

  function renderGivenAnswer() {
    const d = answer_data || {};
    if (question.type === 'mcq') {
      const opt = (question.options || []).find(o => o.id === d.selected_option_id);
      return opt ? opt.text : '(bez odgovora)';
    }
    if (question.type === 'true_false') return d.value === 'true' ? 'Točno' : d.value === 'false' ? 'Netočno' : '(bez odgovora)';
    return d.text || d.equation || '(bez odgovora)';
  }

  function renderCorrectAnswer() {
    if (question.type === 'mcq') {
      const correct = (question.options || []).filter(o => o.is_correct);
      return correct.map(o => o.text).join(', ') || '—';
    }
    if (question.type === 'true_false') {
      const correct = (question.options || []).find(o => o.is_correct);
      return correct ? (correct.text === 'true' ? 'Točno' : 'Netočno') : '—';
    }
    return null;
  }

  const correctAnswer = renderCorrectAnswer();

  return (
    <div style={{ border: `1.5px solid ${borderColor}`, borderRadius: 'var(--radius-sm, 12px)', background: bgColor, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.4, flex: 1 }}><ChemText text={question.stem} /></p>
        <span style={{
          flexShrink: 0, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
          fontFamily: 'var(--mono)', background: needsManual ? 'var(--bg)' : is_correct ? '#d4f5f0' : '#fde8e8',
          color: needsManual ? 'var(--ink-soft)' : is_correct ? '#064843' : '#7a1515',
        }}>
          {needsManual ? `⏳ Na čekanju (${ai_suggested_points ?? '?'}pt)` : is_correct ? `✓ ${points_earned}pt` : `✗ ${points_earned ?? 0}pt`}
        </span>
      </div>

      <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span><strong>Vaš odgovor:</strong> {renderGivenAnswer()}</span>
        {!is_correct && correctAnswer && (
          <span style={{ color: '#064843' }}><strong>Točan odgovor:</strong> {correctAnswer}</span>
        )}
        {ai_feedback && (
          <span style={{ marginTop: 4, fontStyle: 'italic' }}>🤖 {ai_feedback}</span>
        )}
        {question.explanation && (
          <span style={{ marginTop: 4, color: 'var(--ink-faint)' }}>💡 {question.explanation}</span>
        )}
      </div>
    </div>
  );
}

// ─── Results screen ───────────────────────────────────────────────────────────

function ResultsScreen({ attempt, quiz, onRetry, onBack }) {
  const score    = attempt.score ?? 0;
  const maxScore = attempt.max_score ?? 0;
  const pct      = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const passed   = quiz.pass_score !== null ? pct >= quiz.pass_score : pct >= 70;
  const pendingGrading = attempt.answers?.some(a => a.is_correct === null);

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '40px 24px' }}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: 24, fontSize: 13, color: 'var(--ink-faint)' }}>
        <Link to="/quizzes" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>← Kvizovi</Link>
        {' › '}{quiz.title}
      </div>

      {/* Score summary */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <ScoreRing score={score} maxScore={maxScore} />
        <h1 style={{ margin: '18px 0 6px', fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)' }}>
          {pendingGrading ? 'Odgovori predani!' : passed ? 'Čestitamo! 🎉' : 'Pokušaj ponovo'}
        </h1>
        <p style={{ margin: 0, fontSize: 16, color: 'var(--ink-soft)' }}>
          {pendingGrading
            ? 'Neki odgovori čekaju ručno ocjenjivanje od strane nastavnika.'
            : passed
            ? `Prošao si kviz s ${pct}% — minimalni prolaz je ${quiz.pass_score ?? 70}%.`
            : `Nisi dostigao minimalni prolaz od ${quiz.pass_score ?? 70}%. Pokušaj ponovo!`
          }
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 28 }}>
        {[
          { label: 'Bodovi', value: `${score}/${maxScore}` },
          { label: 'Pokušaj br.', value: attempt.attempt_number },
          { label: quiz.time_limit_minutes ? 'Vremenski limit' : 'Pitanja', value: quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : quiz.questions?.length ?? '—' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '14px', textAlign: 'center' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{s.label}</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--ink)' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 36 }}>
        <button onClick={onBack} style={btnGhost}>← Natrag na kurs</button>
        {onRetry && <button onClick={onRetry} style={btnPrimary}>Pokušaj ponovo</button>}
      </div>

      {/* Per-question feedback */}
      {attempt.answers && attempt.answers.length > 0 && (
        <div>
          <p style={{ margin: '0 0 14px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
            Detalji · Breakdown
          </p>
          {attempt.answers.map((qa, i) => (
            <AnswerFeedback key={i} qa={qa} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quiz in progress ─────────────────────────────────────────────────────────

function QuizInProgress({ quiz, attempt, onSubmitted }) {
  const totalQ  = quiz.questions?.length ?? 0;
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState({});  // questionId → answer_data
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleExpire = useCallback(async () => {
    await doSubmit();
  }, [answers, attempt]);

  const { display: timerDisplay, secondsLeft } = useTimer(quiz.time_limit_minutes, handleExpire);
  const timerWarning = secondsLeft !== null && secondsLeft <= 60;

  async function doSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const formatted = Object.entries(answers).map(([qid, data]) => ({
        question_id: Number(qid),
        answer_data: data,
      }));
      await submitAttempt(attempt.id, formatted);
      const result = await getAttempt(attempt.id);
      onSubmitted(result);
    } catch (e) {
      setError(e.message);
      setSubmitting(false);
    }
  }

  const q = quiz.questions?.[current];
  const qAnswer = q ? answers[q.id] : null;
  const answered = totalQ > 0 ? Object.keys(answers).length : 0;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '32px 24px' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p style={{ margin: 0, fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
            {quiz.title}
          </p>
          <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-faint)' }}>
            Pitanje {current + 1} / {totalQ} · {answered} odgovoreno
          </p>
        </div>
        {timerDisplay && (
          <div style={{
            fontFamily: 'var(--mono)', fontSize: 18, fontWeight: 700, padding: '6px 14px',
            borderRadius: 'var(--radius-pill)', border: `1.5px solid ${timerWarning ? '#c0392b' : 'var(--line)'}`,
            color: timerWarning ? '#c0392b' : 'var(--ink)', background: timerWarning ? '#fde8e8' : 'var(--surface)',
          }}>
            ⏱ {timerDisplay}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--line)', borderRadius: 999, marginBottom: 28, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${totalQ > 0 ? ((current + 1) / totalQ) * 100 : 0}%`, background: 'var(--accent)', borderRadius: 999, transition: 'width .3s' }} />
      </div>

      {/* Question */}
      {q && (
        <div style={{ background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)', padding: '2px 8px', border: '1px solid var(--line)', borderRadius: 20 }}>
              {current + 1}/{totalQ}
            </span>
            <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent-ink)', background: 'var(--accent-wash)', padding: '2px 8px', borderRadius: 20 }}>
              {q.max_points} bod{q.max_points === 1 ? '' : 'a'}
            </span>
          </div>

          <p style={{ margin: '0 0 20px', fontSize: 17, lineHeight: 1.65, color: 'var(--ink)', fontWeight: 500 }}>
            <ChemText text={q.stem} />
          </p>

          <QuestionInput
            question={q}
            answer={qAnswer}
            onChange={data => setAnswers(prev => ({ ...prev, [q.id]: data }))}
            disabled={submitting}
          />
        </div>
      )}

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 10 }}>
        <button
          onClick={() => setCurrent(c => Math.max(0, c - 1))}
          disabled={current === 0 || submitting}
          style={{ ...btnGhost, opacity: current === 0 ? .4 : 1 }}
        >
          ← Prethodno
        </button>

        {/* Question dots */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', justifyContent: 'center' }}>
          {quiz.questions?.map((qq, i) => (
            <button
              key={qq.id}
              onClick={() => setCurrent(i)}
              style={{
                width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer', padding: 0,
                background: i === current ? 'var(--accent)' : answers[qq.id] ? 'var(--accent-bright)' : 'var(--line-strong)',
              }}
              title={`Pitanje ${i + 1}`}
            />
          ))}
        </div>

        {current < totalQ - 1 ? (
          <button onClick={() => setCurrent(c => c + 1)} disabled={submitting} style={btnPrimary}>
            Sljedeće →
          </button>
        ) : (
          <button onClick={doSubmit} disabled={submitting} style={{ ...btnPrimary, background: '#064843' }}>
            {submitting ? 'Predajem…' : `Predaj kviz (${answered}/${totalQ})`}
          </button>
        )}
      </div>

      {error && <p style={{ marginTop: 14, color: '#c0392b', fontSize: 14, textAlign: 'center' }}>{error}</p>}
    </div>
  );
}

// ─── Start screen ─────────────────────────────────────────────────────────────

function StartScreen({ quiz, pastAttempts, onStart, starting, error }) {
  const best = pastAttempts.reduce((b, a) => (a.score > (b?.score ?? -1) ? a : b), null);
  const canRetry = quiz.max_attempts === null || pastAttempts.length < quiz.max_attempts;

  return (
    <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 24px' }}>
      <Link to="/quizzes" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>← Kvizovi</Link>

      <div style={{ marginTop: 20, background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius)', padding: '32px' }}>
        <p style={{ margin: '0 0 6px', fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }}>
          Kviz · Quiz
        </p>
        <h1 style={{ margin: '0 0 12px', fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)', lineHeight: 1.2 }}>
          {quiz.title}
        </h1>
        {quiz.description && (
          <p style={{ margin: '0 0 20px', fontSize: 15, color: 'var(--ink-soft)', lineHeight: 1.6 }}>{quiz.description}</p>
        )}

        {/* Meta grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 24 }}>
          {[
            { label: 'Pitanja', value: quiz.questions?.length ?? '—' },
            { label: 'Minimalni prolaz', value: `${quiz.pass_score ?? 70}%` },
            { label: 'Vremenski limit', value: quiz.time_limit_minutes ? `${quiz.time_limit_minutes} min` : 'Bez limita' },
            { label: 'Max. pokušaja', value: quiz.max_attempts ?? 'Neograničeno' },
          ].map(m => (
            <div key={m.label} style={{ background: 'var(--bg)', borderRadius: 'var(--radius-tile)', padding: '10px 14px' }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{m.label}</p>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--mono)' }}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Past attempts */}
        {best && (
          <div style={{ marginBottom: 20, padding: '10px 14px', background: 'var(--accent-wash)', borderRadius: 'var(--radius-sm)', fontSize: 13, color: 'var(--accent-ink)' }}>
            Najbolji rezultat: <strong>{best.score}/{best.max_score}</strong> ({Math.round((best.score / best.max_score) * 100)}%) · Pokušaj {best.attempt_number}
          </div>
        )}

        {error && <p style={{ color: '#c0392b', fontSize: 14, marginBottom: 14 }}>{error}</p>}

        {canRetry ? (
          <button onClick={onStart} disabled={starting} style={{ ...btnPrimary, width: '100%', padding: '14px', fontSize: 16, borderRadius: 'var(--radius-sm)' }}>
            {starting ? 'Pokrećem…' : pastAttempts.length === 0 ? 'Započni kviz' : 'Novi pokušaj'}
          </button>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)', color: 'var(--ink-faint)', fontSize: 14 }}>
            Iskoristio si sve pokušaje ({quiz.max_attempts}).
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QuizPage() {
  const { quizId } = useParams();
  const navigate   = useNavigate();

  const [phase, setPhase]       = useState('loading'); // loading | start | in_progress | results
  const [quiz, setQuiz]         = useState(null);
  const [pastAttempts, setPast] = useState([]);
  const [attempt, setAttempt]   = useState(null);
  const [error, setError]       = useState('');
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [q, attempts] = await Promise.all([
          getQuiz(quizId),
          getQuizAttempts(quizId),
        ]);
        setQuiz(q);
        setPast(Array.isArray(attempts) ? attempts : []);
        setPhase('start');
      } catch (e) {
        setError(e.message);
        setPhase('error');
      }
    })();
  }, [quizId]);

  async function handleStart() {
    setStarting(true);
    setError('');
    try {
      const a = await startAttempt(quizId);
      setAttempt(a);
      setPhase('in_progress');
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  async function handleRetry() {
    setAttempt(null);
    setPhase('start');
    // refresh past attempts
    try {
      const attempts = await getQuizAttempts(quizId);
      setPast(Array.isArray(attempts) ? attempts : []);
    } catch (_) {}
  }

  // ── Render ──

  if (phase === 'loading') {
    return (
      <div style={{ padding: 60, textAlign: 'center', color: 'var(--ink-faint)' }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam kviz…</p>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div style={{ padding: 60, textAlign: 'center' }}>
        <p style={{ color: '#c0392b', marginBottom: 16 }}>{error}</p>
        <button onClick={() => navigate('/quizzes')} style={btnGhost}>← Natrag</button>
      </div>
    );
  }

  if (phase === 'start') {
    return (
      <StartScreen
        quiz={quiz}
        pastAttempts={pastAttempts}
        onStart={handleStart}
        starting={starting}
        error={error}
      />
    );
  }

  if (phase === 'in_progress') {
    return (
      <QuizInProgress
        quiz={quiz}
        attempt={attempt}
        onSubmitted={result => { setAttempt(result); setPhase('results'); }}
      />
    );
  }

  if (phase === 'results') {
    const canRetry = quiz.max_attempts === null || pastAttempts.length < quiz.max_attempts;
    return (
      <ResultsScreen
        attempt={attempt}
        quiz={quiz}
        onRetry={canRetry ? handleRetry : null}
        onBack={() => navigate(-1)}
      />
    );
  }

  return null;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const btnPrimary = {
  background: 'var(--accent)', color: 'var(--on-accent)', border: 'none',
  padding: '11px 22px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontWeight: 600, fontSize: 14, fontFamily: 'var(--body)',
};

const btnGhost = {
  background: 'transparent', color: 'var(--ink-soft)',
  border: '1.5px solid var(--line)', padding: '11px 22px',
  borderRadius: 'var(--radius-pill)', cursor: 'pointer',
  fontWeight: 600, fontSize: 14, fontFamily: 'var(--body)',
};
