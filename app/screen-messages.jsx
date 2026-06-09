/* Molekula Academy — Messages screen */

function MessagesScreen({ d, go }) {
  const m = d.messages;
  const [draft, setDraft] = React.useState("");
  const [thread, setThread] = React.useState(m.thread);

  function send() {
    const text = draft.trim();
    if (!text) return;
    const now = new Date();
    const time = now.getHours().toString().padStart(2, "0") + ":" + now.getMinutes().toString().padStart(2, "0");
    setThread((prev) => [...prev, { me: true, text, time }]);
    setDraft("");
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="content" style={{ maxWidth: 720 }}>
      {/* Chat card */}
      <div className="panel" style={{ padding: 0, display: "flex", flexDirection: "column", height: "calc(100vh - 160px)", minHeight: 480 }}>

        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          padding: "16px 20px",
          borderBottom: "1px solid var(--line)",
          flexShrink: 0,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: "50%",
            background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontWeight: 700, color: "#fff", fontSize: 15, fontFamily: "var(--display)",
            flexShrink: 0,
          }}>T</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>{m.with}</div>
            <div style={{ fontSize: 12, color: "var(--ink-soft)", marginTop: 1 }}>{m.role} &middot; {m.online}</div>
          </div>
          <div style={{ flex: 1 }} />
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" title="Video call">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="1" y="4" width="11" height="10" rx="2" stroke="var(--ink-soft)" strokeWidth="1.5"/>
                <path d="M12 7.5l5-2.5v8l-5-2.5" stroke="var(--ink-soft)" strokeWidth="1.5" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Thread */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ textAlign: "center", marginBottom: 4 }}>
            <span style={{
              display: "inline-block",
              fontSize: 11,
              fontWeight: 600,
              color: "var(--ink-faint)",
              background: "var(--bg)",
              borderRadius: 99,
              padding: "3px 12px",
              letterSpacing: ".04em",
            }}>{m.today}</span>
          </div>

          {thread.map((msg, i) => (
            <div key={i} style={{
              display: "flex",
              justifyContent: msg.me ? "flex-end" : "flex-start",
              gap: 10,
              alignItems: "flex-end",
            }}>
              {!msg.me && (
                <div style={{
                  width: 30, height: 30, borderRadius: "50%",
                  background: "var(--accent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontWeight: 700, color: "#fff", fontSize: 12,
                  flexShrink: 0,
                }}>T</div>
              )}
              <div style={{ maxWidth: "72%" }}>
                <div style={{
                  background: msg.me ? "var(--accent)" : "var(--bg)",
                  color: msg.me ? "var(--on-accent)" : "var(--ink)",
                  borderRadius: msg.me ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  padding: "10px 14px",
                  fontSize: 14.5,
                  lineHeight: 1.5,
                  boxShadow: msg.me ? "var(--shadow-accent)" : "none",
                }}>
                  {msg.text}
                </div>
                <div style={{
                  fontSize: 11,
                  color: "var(--ink-faint)",
                  marginTop: 3,
                  textAlign: msg.me ? "right" : "left",
                  paddingLeft: msg.me ? 0 : 4,
                  paddingRight: msg.me ? 4 : 0,
                }}>
                  {msg.time}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Compose */}
        <div style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--line)",
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexShrink: 0,
        }}>
          <div style={{
            flex: 1,
            background: "var(--bg)",
            borderRadius: 14,
            border: "1.5px solid var(--line-strong)",
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={handleKey}
              placeholder={m.placeholder}
              rows={1}
              style={{
                flex: 1,
                border: "none",
                outline: "none",
                background: "transparent",
                resize: "none",
                fontSize: 14.5,
                color: "var(--ink)",
                fontFamily: "var(--body)",
                lineHeight: 1.5,
              }}
            />
            <button className="icon-btn" title="Attach">
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none">
                <path d="M14.5 8.5l-6 6a4 4 0 01-5.66-5.66l6.36-6.36a2.5 2.5 0 013.54 3.54L6.4 12.36a1 1 0 01-1.41-1.41l6-6" stroke="var(--ink-faint)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <button
            className={"btn btn-primary" + (draft.trim() ? "" : " disabled")}
            style={{ padding: "11px 18px", flexShrink: 0, opacity: draft.trim() ? 1 : 0.45 }}
            onClick={send}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ display: "inline", verticalAlign: "middle" }}>
              <path d="M14 2L7 9M14 2L9 14 7 9 2 7l12-5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { MessagesScreen });
