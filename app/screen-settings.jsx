/* Molekula Academy — Settings screen */

function SettingsRow({ label, children }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 20, padding: "14px 0", borderBottom: "1px solid var(--line)" }}>
      <label style={{ fontSize: 14.5, color: "var(--ink)", fontWeight: 500, flexShrink: 0 }}>{label}</label>
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>{children}</div>
    </div>
  );
}

function TextInput({ value, placeholder }) {
  const [v, setV] = React.useState(value || "");
  return (
    <input
      value={v}
      onChange={(e) => setV(e.target.value)}
      placeholder={placeholder}
      style={{
        border: "1.5px solid var(--line-strong)",
        borderRadius: 10,
        padding: "8px 12px",
        fontSize: 14,
        color: "var(--ink)",
        background: "var(--bg)",
        outline: "none",
        width: "100%",
        maxWidth: 260,
        fontFamily: "var(--body)",
      }}
    />
  );
}

function SettingsScreen({ d, lang, setLang, go }) {
  const s = d.settings;
  const [saved, setSaved] = React.useState(false);
  const [theme, setTheme] = React.useState("light");

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  }

  return (
    <div className="content" style={{ maxWidth: 680 }}>
      <div className="page-head">
        <h1>{s.title}</h1>
        <p>{s.sub}</p>
      </div>

      {/* Profile */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{s.profile}</h3>
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 10 }}>
          <SettingsRow label={s.name}>
            <TextInput value="Marta Kovač" />
          </SettingsRow>
          <SettingsRow label={s.email}>
            <TextInput value={s.emailVal} />
          </SettingsRow>
          <SettingsRow label={s.school}>
            <TextInput value={s.schoolVal} />
          </SettingsRow>
        </div>
      </div>

      {/* Subscription */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{s.plan}</h3>
        <div style={{
          marginTop: 14,
          padding: "16px 18px",
          background: "var(--accent-wash)",
          borderRadius: 12,
          border: "1.5px solid var(--accent)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{
                fontWeight: 700,
                fontSize: 16,
                color: "var(--accent-ink)",
                fontFamily: "var(--display)",
              }}>{s.planName}</span>
              <span className="badge-popular" style={{ fontSize: 10.5, padding: "2px 8px" }}>Active</span>
            </div>
            <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3 }}>{s.planDesc}</div>
          </div>
          <div style={{ textAlign: "right", flexShrink: 0 }}>
            <div style={{ fontFamily: "var(--mono)", fontWeight: 700, fontSize: 18, color: "var(--accent-ink)" }}>{s.planPrice}</div>
            <button className="btn btn-ghost" style={{ marginTop: 8, padding: "7px 16px", fontSize: 13 }}>{s.manage}</button>
          </div>
        </div>
      </div>

      {/* Preferences */}
      <div className="panel" style={{ marginBottom: 20 }}>
        <h3 style={{ fontFamily: "var(--display)", fontWeight: 700, fontSize: 17, marginBottom: 4 }}>{s.prefs}</h3>
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 10 }}>

          <SettingsRow label={s.language}>
            <div className="lang-toggle">
              {["hr", "en"].map((L) => (
                <button key={L} className={lang === L ? "on" : ""} onClick={() => setLang && setLang(L)}>
                  {L.toUpperCase()}
                </button>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow label={s.theme}>
            <div style={{ display: "flex", gap: 8 }}>
              {[["light", s.themeLight], ["dark", s.themeDark]].map(([val, label]) => (
                <button
                  key={val}
                  onClick={() => {
                    setTheme(val);
                    document.documentElement.dataset.theme = val;
                    document.body.dataset.theme = val;
                  }}
                  style={{
                    padding: "7px 16px",
                    borderRadius: 99,
                    border: "1.5px solid " + (theme === val ? "var(--accent)" : "var(--line-strong)"),
                    background: theme === val ? "var(--accent-wash)" : "var(--surface)",
                    color: theme === val ? "var(--accent-ink)" : "var(--ink-soft)",
                    fontWeight: theme === val ? 700 : 400,
                    fontSize: 13.5,
                    cursor: "pointer",
                    transition: "all .15s",
                  }}>
                  {label}
                </button>
              ))}
            </div>
          </SettingsRow>

          <SettingsRow label={s.accent}>
            <div style={{ display: "flex", gap: 10 }}>
              {[["teal", "#0f8f86"], ["blue", "#2563d8"], ["emerald", "#15936a"]].map(([name, hex]) => (
                <button
                  key={name}
                  onClick={() => { document.body.dataset.accent = name; }}
                  style={{
                    width: 28, height: 28,
                    borderRadius: "50%",
                    background: hex,
                    border: "2.5px solid var(--surface)",
                    boxShadow: "0 0 0 2px " + hex,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
          </SettingsRow>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          style={{ padding: "12px 28px", minWidth: 160 }}
          onClick={save}
        >
          {saved ? s.saved : s.save}
        </button>
        <button
          className="btn btn-ghost"
          style={{ color: "#d93a3a", borderColor: "#d93a3a", padding: "12px 24px" }}
        >
          {s.danger}
        </button>
      </div>
    </div>
  );
}

Object.assign(window, { SettingsScreen });
