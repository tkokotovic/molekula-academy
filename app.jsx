/* TopKemija — app assembly + tweaks */
const ACCENTS = {
  teal:    { accent: "#0f8f86", bright: "#1ec8b6", ink: "#064843", wash: "#e7f6f3" },
  blue:    { accent: "#2563d8", bright: "#4f9bff", ink: "#12357a", wash: "#e9eefb" },
  emerald: { accent: "#15936a", bright: "#2ed29a", ink: "#0a4a35", wash: "#e6f6ee" },
};

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "hero": "split",
  "accent": "teal",
  "motif": "subtle",
  "displayFont": "Bricolage Grotesque"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [lang, setLang] = useState(() => (typeof localStorage !== "undefined" && localStorage.getItem("tk_lang")) || "hr");
  const [scrolled, setScrolled] = useState(false);
  const c = window.CONTENT[lang];

  // language persistence + <html lang>
  useEffect(() => {
    try { localStorage.setItem("tk_lang", lang); } catch (e) {}
    document.documentElement.lang = lang;
  }, [lang]);

  // scroll state for nav
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // apply accent palette
  useEffect(() => {
    const a = ACCENTS[t.accent] || ACCENTS.teal;
    const r = document.documentElement.style;
    r.setProperty("--accent", a.accent);
    r.setProperty("--accent-bright", a.bright);
    r.setProperty("--accent-ink", a.ink);
    r.setProperty("--accent-wash", a.wash);
  }, [t.accent]);

  // motif intensity
  useEffect(() => {
    document.documentElement.style.setProperty("--motif-mult", t.motif === "bold" ? "2.1" : "1");
  }, [t.motif]);

  // display font
  useEffect(() => {
    document.documentElement.style.setProperty("--display", `"${t.displayFont}", sans-serif`);
  }, [t.displayFont]);

  return (
    <React.Fragment>
      <Nav c={c} lang={lang} setLang={setLang} scrolled={scrolled} />
      <main>
        <Hero c={c} variant={t.hero} />
        <TrustBar c={c} />
        <WhoFor c={c} />
        <HowItWorks c={c} />
        <Features c={c} />
        <Teacher c={c} />
        <Testimonials c={c} />
        <Pricing c={c} />
        <FAQ c={c} />
        <FinalCTA c={c} />
      </main>
      <Footer c={c} lang={lang} setLang={setLang} />

      <TweaksPanel>
        <TweakSection label={lang === "hr" ? "Hero" : "Hero section"} />
        <TweakRadio label={lang === "hr" ? "Smjer" : "Direction"} value={t.hero}
          options={["split", "centered", "equation"]}
          onChange={(v) => setTweak("hero", v)} />
        <TweakSection label={lang === "hr" ? "Stil" : "Style"} />
        <TweakColor label={lang === "hr" ? "Naglasak" : "Accent"} value={ACCENTS[t.accent].accent}
          options={[ACCENTS.teal.accent, ACCENTS.blue.accent, ACCENTS.emerald.accent]}
          onChange={(hex) => {
            const key = Object.keys(ACCENTS).find((k) => ACCENTS[k].accent === hex) || "teal";
            setTweak("accent", key);
          }} />
        <TweakRadio label={lang === "hr" ? "Uzorak" : "Hex motif"} value={t.motif}
          options={["subtle", "bold"]}
          onChange={(v) => setTweak("motif", v)} />
        <TweakRadio label={lang === "hr" ? "Naslovni font" : "Display font"} value={t.displayFont}
          options={["Bricolage Grotesque", "Space Grotesk"]}
          onChange={(v) => setTweak("displayFont", v)} />
      </TweaksPanel>
    </React.Fragment>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
