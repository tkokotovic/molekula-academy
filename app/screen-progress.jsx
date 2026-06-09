/* Molekula Academy — Progress screen */

function Sparkline({ values, width = 320, height = 80, color = "var(--accent)" }) {
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 12) - 4;
    return `${x},${y}`;
  });
  const area = `M${pts[0]} ${pts.slice(1).map((p) => "L" + p).join(" ")} L${width},${height} L0,${height} Z`;
  const line = `M${pts[0]} ${pts.slice(1).map((p) => "L" + p).join(" ")}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: height, display: "block" }}>
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => {
        const [x, y] = p.split(",");
        return <circle key={i} cx={x} cy={y} r="3.5" fill={color} opacity={i === values.length - 1 ? 1 : 0.35} />;
      })}
    </svg>
  );
}

function HeatCell({ topic, value }) {
  const opacity = 0.12 + (value / 100) * 0.88;
  const bg = `color-mix(in srgb, var(--accent) ${Math.round(opacity * 100)}%, var(--surface))`;
  const textColor = value >= 65 ? "var(--on-accent)" : "var(--ink)";
  return (
    <div style={{
      background: bg,
      borderRadius: 10,
      padding: "10px 12px",
      display: "flex",
      flexDirection: "column",
      gap: 2,
    }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: value >= 65 ? "rgba(255,255,255,.75)" : "var(--ink-soft)", lineHeight: 1.2 }}>{topic}</span>
      <span style={{ fontSize: 17, fontWeight: 700, color: textColor, fontFamily: "var(--mono)" }}>{value}%</span>
    </div>
  );
}

function ProgressScreen({ d, go }) {
  const p = d.progress;

  return (
    <div className="content">
      <div className="page-head">
        <h1>{p.title}</h1>
        <p>{p.sub}</p>
      </div>

      <div className="dash-grid">
        {/* LEFT */}
        <div className="col">
          {/* Overall completion */}
          <div className="panel" style={{ textAlign: "center", padding: "32px 28px" }}>
            <Ring pct={p.completionVal} size={140} stroke={12} color="var(--accent)">
              <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 28, color: "var(--ink)" }}>{p.completionVal}%</div>
              <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2 }}>{p.completion}</div>
            </Ring>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px 20px", marginTop: 28 }}>
              {p.stats.map((s, i) => (
                <div key={i} style={{ background: "var(--bg)", borderRadius: 12, padding: "14px 12px" }}>
                  <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 22, color: "var(--ink)" }}>{s.v}</div>
                  <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 2 }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Trend chart */}
          <div className="panel">
            <div className="panel-head">
              <h3>{p.trendLabel}</h3>
              <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{p.trendSub}</span>
            </div>
            <div style={{ marginTop: 8 }}>
              <Sparkline values={p.trend} height={72} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                {p.trend.map((v, i) => (
                  <span key={i} style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--mono)" }}>{v}%</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div className="col">
          {/* Heat grid */}
          <div className="panel">
            <div className="panel-head">
              <h3>{p.heatLabel}</h3>
              <span style={{ fontSize: 13, color: "var(--ink-faint)" }}>{p.heatSub}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
              {p.heat.map((h, i) => (
                <HeatCell key={i} topic={h.t} value={h.v} />
              ))}
            </div>
          </div>

          {/* Certificates */}
          <div className="panel">
            <div className="panel-head"><h3>{p.certLabel}</h3></div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
              {p.certs.map((c, i) => (
                <div key={i} style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  padding: "12px 14px",
                  background: c.done ? "var(--accent-wash)" : "var(--bg)",
                  borderRadius: 12,
                  border: c.done ? "1px solid var(--accent)" : "1px solid var(--line)",
                  opacity: c.done ? 1 : 0.7,
                }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: "50%",
                    background: c.done ? "var(--accent)" : "var(--line)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0,
                  }}>
                    {c.done
                      ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5" stroke="var(--ink-faint)" strokeWidth="1.5"/></svg>
                    }
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{c.t}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{c.d}</div>
                  </div>
                  {c.done && (
                    <button className="btn btn-ghost" style={{ padding: "7px 14px", fontSize: 12.5 }}>
                      {p.download}
                    </button>
                  )}
                  {!c.done && (
                    <span style={{ fontSize: 12, color: "var(--ink-faint)", fontStyle: "italic" }}>{p.inProgress}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProgressScreen });
