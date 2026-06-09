/* Molekula Academy — dashboard app shell + router */

const APP_TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "teal",
  "theme": "light"
}/*EDITMODE-END*/;

function Sidebar({ d, screen, go, onNav, lang, setLang }) {
  const items = [
    { k: "dashboard", icon: I.home, label: d.nav.dashboard },
    { k: "courses", icon: I.book, label: d.nav.courses, to: "lesson" },
    { k: "progress", icon: I.chart, label: d.nav.progress, to: "progress" },
    { k: "quizzes", icon: I.quiz, label: d.nav.quizzes, to: "quiz" },
    { k: "schedule", icon: I.cal, label: d.nav.schedule, to: "schedule" },
    { k: "messages", icon: I.chat, label: d.nav.messages, to: "messages" },
  ];
  const activeFor = { dashboard: "dashboard", lesson: "courses", quiz: "quizzes", progress: "progress", schedule: "schedule", messages: "messages", settings: "settings" };
  return (
    <nav className="side">
      <div className="side-logo"><Mark /> Molekula</div>
      <div className="side-nav">
        {items.map((it) => (
          <button key={it.k} className={"side-link" + (activeFor[screen] === it.k ? " active" : "")}
            onClick={() => { go(it.to || it.k === "dashboard" ? (it.to || "dashboard") : "dashboard"); onNav && onNav(); }}>
            <it.icon /> {it.label}
          </button>
        ))}
        <div className="side-sep"></div>
        <button className={"side-link" + (screen === "settings" ? " active" : "")} onClick={() => { go("settings"); onNav && onNav(); }}><I.gear /> {d.nav.settings}</button>
      </div>
      <div className="side-foot">
        <div className="side-card">
          <span className="hex hex-accent" style={{ position: "absolute", width: 70, height: 80, right: -22, top: -22, opacity: .25 }}></span>
          <h5>{d.zoomCard.label}</h5>
          <p>{d.zoomCard.date} · {d.zoomCard.time}</p>
          <button className="btn btn-white" style={{ width: "100%", padding: "9px 14px", fontSize: 13 }}><I.video width="15" height="15" /> {d.zoomCard.cta}</button>
        </div>
      </div>
    </nav>
  );
}

function Topbar({ d, lang, setLang, t, setTweak, onMenu }) {
  const s = d.student;
  return (
    <div className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu}><I.menu width="20" height="20" /></button>
      <div className="search">
        <I.search width="18" height="18" />
        <input placeholder={d.topbar.search} />
      </div>
      <div style={{ flex: 1 }}></div>
      <div className="lang-toggle hide-sm">
        {["hr", "en"].map((L) => (
          <button key={L} className={lang === L ? "on" : ""} onClick={() => setLang(L)}>{L.toUpperCase()}</button>
        ))}
      </div>
      <button className="icon-btn" title="Theme" onClick={() => setTweak("theme", t.theme === "dark" ? "light" : "dark")}>
        {t.theme === "dark" ? <I.sun width="18" height="18" /> : <I.moon width="18" height="18" />}
      </button>
      <button className="icon-btn hide-sm"><I.bell width="18" height="18" /><span className="dot"></span></button>
      <div className="avatar">
        <span className="pic">{s.name.split(" ").map((w) => w[0]).join("")}</span>
        <span className="hide-sm">
          <span className="nm" style={{ display: "block", lineHeight: 1.1 }}>{s.name}</span>
          <span className="pl">{s.plan} · {s.track}</span>
        </span>
      </div>
    </div>
  );
}

function App() {
  const [t, setTweak] = useTweaks(APP_TWEAK_DEFAULTS);
  const [lang, setLang] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem("tk_lang")) || "hr");
  const [screen, setScreen] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem("mol_screen")) || "dashboard");
  const [navOpen, setNavOpen] = useState(false);
  const d = window.APP[lang];

  useEffect(() => { try { localStorage.setItem("tk_lang", lang); } catch (e) {} document.documentElement.lang = lang; }, [lang]);
  useEffect(() => { try { localStorage.setItem("mol_screen", screen); } catch (e) {} window.scrollTo(0, 0); }, [screen]);
  useEffect(() => { document.body.dataset.accent = t.accent; }, [t.accent]);
  useEffect(() => { document.documentElement.dataset.theme = t.theme; document.body.dataset.theme = t.theme; }, [t.theme]);

  function go(s) { setScreen(s); setNavOpen(false); }

  return (
    <div className={"app" + (navOpen ? " nav-open" : "")}>
      <Sidebar d={d} screen={screen} go={go} onNav={() => setNavOpen(false)} lang={lang} setLang={setLang} />
      <div className="nav-scrim" onClick={() => setNavOpen(false)}></div>
      <div>
        <Topbar d={d} lang={lang} setLang={setLang} t={t} setTweak={setTweak} onMenu={() => setNavOpen(true)} />
        {screen === "dashboard" && <Dashboard d={d} go={go} />}
        {screen === "lesson" && <Lesson d={d} go={go} />}
        {screen === "quiz" && <Quiz d={d} go={go} />}
        {screen === "progress" && <ProgressScreen d={d} go={go} />}
        {screen === "schedule" && <ScheduleScreen d={d} go={go} />}
        {screen === "messages" && <MessagesScreen d={d} go={go} />}
        {screen === "settings" && <SettingsScreen d={d} lang={lang} setLang={setLang} go={go} />}
      </div>

      <TweaksPanel>
        <TweakSection label={lang === "hr" ? "Izgled" : "Appearance"} />
        <TweakRadio label={lang === "hr" ? "Tema" : "Theme"} value={t.theme}
          options={["light", "dark"]} onChange={(v) => setTweak("theme", v)} />
        <TweakColor label={lang === "hr" ? "Naglasak" : "Accent"} value={ACCENT_HEX[t.accent]}
          options={[ACCENT_HEX.teal, ACCENT_HEX.blue, ACCENT_HEX.emerald]}
          onChange={(hex) => setTweak("accent", Object.keys(ACCENT_HEX).find((k) => ACCENT_HEX[k] === hex) || "teal")} />
        <TweakSection label={lang === "hr" ? "Ekran" : "Screen"} />
        <TweakRadio label={lang === "hr" ? "Prikaži" : "Show"} value={screen}
          options={["dashboard", "lesson", "quiz", "progress", "schedule", "messages", "settings"]} onChange={(v) => go(v)} />
      </TweaksPanel>
    </div>
  );
}

const ACCENT_HEX = { teal: "#0f8f86", blue: "#2563d8", emerald: "#15936a" };

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
