/* Molekula Academy — Lesson screen */

function Lesson({ d, go }) {
  const l = d.lesson;
  return (
    <div className="content">
      <div className="lesson-grid">
        <div className="lesson-body">
          <div className="breadcrumb">
            <b>{l.breadcrumb[0]}</b>
            <I.arrow width="13" height="13" style={{ opacity: .5 }} />
            <span>{l.breadcrumb[1]}</span>
          </div>
          <h1>{l.title}</h1>
          <div className="meta">{l.meta}</div>

          <div className="video-slot">
            <div className="play"><I.play width="26" height="26" /></div>
            <span className="lbl">{l.videoLabel}</span>
            <span className="dur">{l.videoDur}</span>
          </div>

          <div className="prose">
            {l.sections.map((sec, i) => (
              <React.Fragment key={i}>
                <h2>{sec.h}</h2>
                <p>{sec.p}</p>
              </React.Fragment>
            ))}
          </div>

          <div className="eq-strip">{l.eq}</div>

          <div className="keypoint">
            <div className="kt">{l.keypointTitle}</div>
            <p>{l.keypoint}</p>
          </div>

          <div className="lesson-nav">
            <button className="btn btn-ghost" onClick={() => go("dashboard")}><I.arrowL width="17" height="17" /> {l.prev}</button>
            <button className="btn btn-primary" onClick={() => go("quiz")}>{l.toQuiz} <I.arrow width="17" height="17" /></button>
          </div>
        </div>

        {/* outline */}
        <aside>
          <div className="outline">
            <div className="ol">{l.outlineLabel}</div>
            {l.outline.map((o) => (
              <div className={"ol-item" + (o.current ? " current" : "")} key={o.n} onClick={() => o.current ? null : go("lesson")}>
                <span className={"chk" + (o.done ? " done" : o.current ? " cur" : "")}>
                  {o.done ? <I.check width="12" height="12" /> : o.n}
                </span>
                <span className="t">{o.t}</span>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

Object.assign(window, { Lesson });
