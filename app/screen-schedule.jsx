/* Molekula Academy — Schedule screen */

function CalendarGrid({ sc }) {
  // sc.startOffset: 0=Mon, ..., 6=Sun for the first day of the month (Mon-first grid)
  const cells = [];
  for (let i = 0; i < sc.startOffset; i++) cells.push(null);
  for (let d = 1; d <= sc.daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
        {sc.weekdays.map((wd) => (
          <div key={wd} style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--ink-faint)", fontFamily: "var(--mono)", textTransform: "uppercase", letterSpacing: ".05em", padding: "4px 0" }}>
            {wd}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const isToday = day === sc.today;
          const isSession = sc.sessionDays.includes(day);
          return (
            <div key={i} style={{
              aspectRatio: "1",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: isToday || isSession ? 700 : 400,
              background: isToday
                ? "var(--accent)"
                : isSession
                  ? "var(--accent-wash)"
                  : "transparent",
              color: isToday
                ? "var(--on-accent)"
                : isSession
                  ? "var(--accent-ink)"
                  : "var(--ink)",
              border: isSession && !isToday ? "1.5px solid var(--accent)" : "none",
              cursor: isSession ? "pointer" : "default",
              position: "relative",
            }}>
              {day}
              {isSession && !isToday && (
                <span style={{
                  position: "absolute",
                  bottom: 3,
                  width: 4,
                  height: 4,
                  borderRadius: "50%",
                  background: "var(--accent)",
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ScheduleScreen({ d, go }) {
  const sc = d.schedule;

  return (
    <div className="content">
      <div className="page-head" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1>{sc.title}</h1>
          <p>{sc.sub}</p>
        </div>
        <button className="btn btn-primary" style={{ flexShrink: 0 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 6 }}>
            <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M5 2v2M11 2v2M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M5.5 10h5M8 8.5v3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          {sc.book}
        </button>
      </div>

      <div className="dash-grid">
        {/* LEFT — Calendar */}
        <div className="col">
          <div className="panel">
            <div className="panel-head">
              <h3 style={{ fontFamily: "var(--display)", fontWeight: 700 }}>{sc.monthName}</h3>
            </div>
            <CalendarGrid sc={sc} />
          </div>

          {/* Past sessions */}
          <div className="panel">
            <div className="panel-head"><h3>{sc.pastLabel}</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              {sc.past.map((s, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  background: "var(--bg)",
                  borderRadius: 12,
                  border: "1px solid var(--line)",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%",
                    background: "var(--line-strong)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <rect x="2" y="3" width="12" height="11" rx="2" stroke="var(--ink-faint)" strokeWidth="1.5"/>
                      <path d="M5 2v2M11 2v2M2 7h12" stroke="var(--ink-faint)" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{s.topic}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{s.day}</div>
                  </div>
                  <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }}>
                    {sc.notes}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT — Upcoming sessions */}
        <div className="col">
          <div className="panel">
            <div className="panel-head"><h3>{sc.upcomingLabel}</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
              {sc.upcoming.map((s, i) => (
                <div key={i} style={{
                  borderRadius: 14,
                  border: s.soon ? "1.5px solid var(--accent)" : "1.5px solid var(--line)",
                  background: s.soon ? "var(--accent-wash)" : "var(--surface)",
                  overflow: "hidden",
                }}>
                  {s.soon && (
                    <div style={{
                      background: "var(--accent)",
                      color: "var(--on-accent)",
                      fontSize: 11,
                      fontWeight: 700,
                      fontFamily: "var(--mono)",
                      letterSpacing: ".06em",
                      textTransform: "uppercase",
                      padding: "5px 14px",
                    }}>
                      Sljedeća sesija · Next up
                    </div>
                  )}
                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{s.topic}</div>
                        <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 4 }}>
                          {s.day} &middot; {s.time}
                        </div>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                        {s.soon && (
                          <button className="btn btn-primary" style={{ padding: "8px 16px", fontSize: 13 }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ display: "inline", verticalAlign: "middle", marginRight: 5 }}>
                              <rect x="1" y="2" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                              <path d="M5 2v9M9 5l-4 2 4 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {sc.join}
                          </button>
                        )}
                        <button className="btn btn-ghost" style={{ padding: "8px 16px", fontSize: 13 }}>
                          {sc.reschedule}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ScheduleScreen });
