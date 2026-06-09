/* Molekula Academy — Quiz flow (questions → feedback → results) */

function Quiz({ d, go }) {
  const q = d.quiz;
  const [idx, setIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState([]); // booleans
  const [done, setDone] = useState(false);

  const cur = q.questions[idx];
  const isLast = idx === q.questions.length - 1;
  const keys = ["A", "B", "C", "D"];

  function check() {
    if (selected == null) return;
    setChecked(true);
    setAnswers((a) => { const n = [...a]; n[idx] = selected === cur.answer; return n; });
  }
  function next() {
    if (isLast) { setDone(true); return; }
    setIdx(idx + 1); setSelected(null); setChecked(false);
  }
  function restart() {
    setIdx(0); setSelected(null); setChecked(false); setAnswers([]); setDone(false);
  }

  if (done) {
    const correct = answers.filter(Boolean).length;
    const total = q.questions.length;
    const pct = Math.round((correct / total) * 100);
    const msg = pct >= 85 ? q.results.great : pct >= 60 ? q.results.good : q.results.keepGoing;
    return (
      <div className="content">
        <div className="quiz-wrap">
          <div className="result-card">
            <Ring pct={pct} color={scoreColor(pct)}>
              <div className="pct">{pct}%</div>
              <div className="of">{correct}/{total} {q.results.correctOf}</div>
            </Ring>
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 30, color: "var(--ink)", letterSpacing: "-0.02em" }}>{q.results.title}</h1>
            <p style={{ color: "var(--ink-soft)", fontSize: 17, marginTop: 10 }}>{msg}</p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 28, flexWrap: "wrap" }}>
              <button className="btn btn-ghost" onClick={restart}>{q.results.retake}</button>
              <button className="btn btn-primary" onClick={() => go("lesson")}>{q.results.back}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content">
      <div className="quiz-wrap">
        <div className="quiz-top">
          <div>
            <h1 style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 24, color: "var(--ink)", letterSpacing: "-0.02em" }}>{q.title}</h1>
            <p style={{ fontFamily: "var(--mono)", fontSize: 12, color: "var(--ink-faint)", marginTop: 6 }}>{q.sub}</p>
          </div>
          <button className="btn btn-ghost" style={{ padding: "9px 16px", fontSize: 13.5 }} onClick={() => go("lesson")}><I.x width="15" height="15" /></button>
        </div>

        <div className="quiz-prog"><i style={{ width: ((idx + (checked ? 1 : 0)) / q.questions.length) * 100 + "%" }}></i></div>

        <div className="q-card">
          <div className="q-num">{q.qLabel} {idx + 1} {q.ofLabel} {q.questions.length}</div>
          <div className="q-text">{cur.q}</div>

          <div className="opts">
            {cur.options.map((opt, i) => {
              let cls = "opt";
              if (checked) {
                if (i === cur.answer) cls += " correct";
                else if (i === selected) cls += " wrong";
              } else if (i === selected) cls += " selected";
              return (
                <button key={i} className={cls} disabled={checked} onClick={() => setSelected(i)}>
                  <span className="key">{checked && i === cur.answer ? <I.check width="14" height="14" /> : (checked && i === selected ? <I.x width="14" height="14" /> : keys[i])}</span>
                  {opt}
                </button>
              );
            })}
          </div>

          {checked && (
            <div className={"feedback " + (selected === cur.answer ? "ok" : "no")}>
              <div className="ft">
                {selected === cur.answer ? <I.check width="18" height="18" /> : <I.x width="18" height="18" />}
                {selected === cur.answer ? q.correct : q.incorrect}
              </div>
              <p>{cur.explain}</p>
            </div>
          )}

          <div className="quiz-actions">
            {!checked
              ? <button className="btn btn-primary" disabled={selected == null} style={{ opacity: selected == null ? .5 : 1 }} onClick={check}>{q.submit}</button>
              : <button className="btn btn-primary" onClick={next}>{isLast ? q.finish : q.nextQ} <I.arrow width="17" height="17" /></button>}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Quiz });
