/* Molekula Academy — Dashboard home screen */

function colorVar(key) {
  return key === "accent" ? "var(--accent)" : key === "bright" ? "var(--accent-bright)" : "var(--deep)";
}

function Dashboard({ d, go }) {
  const s = d.student;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? s.greetingAm : s.greetingPm;
  const peak = Math.max(...d.statsCard.bars);

  return (
    <div className="content">
      <div className="page-head">
        <h1>{greeting}, {s.name.split(" ")[0]}.</h1>
        <p>{s.sub}</p>
      </div>

      <div className="dash-grid">
        {/* LEFT COLUMN */}
        <div className="col">
          {/* Continue learning */}
          <div className="continue">
            <span className="kicker" style={{ color: "rgba(255,255,255,.6)" }}>{d.continue.label}</span>
            <h2>{d.continue.lesson}</h2>
            <div className="meta">{d.continue.course} · {d.continue.topic} · {d.continue.meta}</div>
            <div className="progress-track"><div className="progress-fill" style={{ width: d.continue.progress + "%" }}></div></div>
            <button className="btn btn-white" style={{ marginTop: 20 }} onClick={() => go("lesson")}>
              {d.continue.cta} <I.arrow width="17" height="17" />
            </button>
          </div>

          {/* Progress / stats */}
          <div className="panel">
            <div className="panel-head">
              <h3>{d.statsCard.label}</h3>
              <a onClick={() => go("dashboard")}>{d.statsCard.sub}</a>
            </div>
            <div className="stat-row">
              <div className="stat"><div className="v">{d.statsCard.avgVal}</div><div className="l">{d.statsCard.avg}</div></div>
              <div className="stat"><div className="v" style={{ display: "flex", alignItems: "center", gap: 6 }}><I.fire width="20" height="20" style={{ color: "#e8743b" }} />{d.statsCard.streakVal}</div><div className="l">{d.statsCard.streak}</div></div>
              <div className="stat"><div className="v">{d.statsCard.masteredVal.split(" ")[0]}</div><div className="l">{d.statsCard.mastered}</div></div>
            </div>
            <div className="chart">
              {d.statsCard.bars.map((b, i) => (
                <div className="barwrap" key={i}>
                  <i className={b === peak ? "peak" : ""} style={{ height: b + "%" }}></i>
                  <span>{i + 1}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 22, display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 24px" }}>
              {d.statsCard.topics.map((t, i) => (
                <div className="topic" key={i}>
                  <div className="tl"><b>{t.name}</b><span>{t.pct}%</span></div>
                  <div className="bar"><i style={{ width: t.pct + "%", background: scoreColor(t.pct) }}></i></div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent quizzes */}
          <div className="panel">
            <div className="panel-head">
              <h3>{d.quizCard.label}</h3>
              <a onClick={() => go("quiz")}>{d.quizCard.all}</a>
            </div>
            {d.quizCard.items.map((q, i) => (
              <div className="qr" key={i}>
                <div className="ring" style={{ background: `color-mix(in srgb, ${scoreColor(q.score)} 16%, var(--surface))`, color: scoreColor(q.score) }}>{q.score}</div>
                <div className="info">
                  <div className="nm">{q.topic}</div>
                  <div className="mt">{q.correct}/{q.total} · {q.when}</div>
                </div>
                <button className="btn btn-ghost" style={{ padding: "9px 16px", fontSize: 13.5 }} onClick={() => go("quiz")}>{d.quizCard.retake}</button>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="col">
          {/* Zoom session */}
          <div className="panel zoom">
            <div className="panel-head">
              <h3>{d.zoomCard.label}</h3>
              <span className="badge-popular" style={{ background: "rgba(255,255,255,.2)", color: "#fff" }}>{d.zoomCard.badge}</span>
            </div>
            <div className="when" style={{ marginTop: 6 }}>
              <div className="d" style={{ display: "block" }}>{d.zoomCard.date}</div>
              <div className="t" style={{ display: "block", marginTop: 2 }}>{d.zoomCard.time}</div>
            </div>
            <div className="tp">{d.zoomCard.topic}</div>
            <div className="wh">{d.zoomCard.with}</div>
            <button className="btn btn-white" style={{ width: "100%", marginTop: 18 }}><I.video width="17" height="17" /> {d.zoomCard.cta}</button>
            <button className="btn" style={{ width: "100%", marginTop: 8, color: "rgba(255,255,255,.85)", background: "transparent", fontSize: 13.5 }}>{d.zoomCard.reschedule}</button>
          </div>

          {/* My courses */}
          <div className="panel">
            <div className="panel-head">
              <h3>{d.coursesCard.label}</h3>
              <a onClick={() => go("lesson")}>{d.coursesCard.all}</a>
            </div>
            {d.coursesCard.items.map((c, i) => (
              <div className="course-row" key={i} onClick={() => go("lesson")} style={{ cursor: "pointer" }}>
                <span className="hex hex-wash" style={{ width: 40, height: 45, fontSize: 13, flexShrink: 0 }}>{c.tag}</span>
                <div className="mini-track">
                  <div className="nm">{c.name}</div>
                  <div className="bar"><i style={{ width: c.pct + "%", background: colorVar(c.color) }}></i></div>
                  <div className="ct" style={{ marginTop: 5 }}>{c.done}/{c.total} {d.coursesCard.lessonsUnit}</div>
                </div>
                <span className="pct">{c.pct}%</span>
              </div>
            ))}
          </div>

          {/* Deadlines */}
          <div className="panel">
            <div className="panel-head"><h3>{d.deadlines.label}</h3></div>
            {d.deadlines.items.map((dl, i) => (
              <div className="dl" key={i}>
                <span className={"tk" + (dl.urgent ? " urgent" : "")}></span>
                <span className="nm">{dl.title}</span>
                <span className="due">{dl.due}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { Dashboard });
