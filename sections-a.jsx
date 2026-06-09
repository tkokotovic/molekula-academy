/* TopKemija — sections A: Nav, Hero (3 variants), Trust, Who, How, Features */

/* ============ NAV ============ */
function Nav({ c, lang, setLang, scrolled }) {
  const [open, setOpen] = useState(false);
  const links = [
    { k: "home", href: "#top" },
    { k: "about", href: "#teacher" },
    { k: "blog", href: "#" },
    { k: "pricing", href: "#pricing" },
  ];
  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 50,
      background: scrolled ? "rgba(245,248,247,.82)" : "transparent",
      backdropFilter: scrolled ? "saturate(180%) blur(14px)" : "none",
      borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`,
      transition: "background .3s ease, border-color .3s ease",
    }}>
      <div className="wrap" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 76 }}>
        <a href="#top"><Logo /></a>

        <nav style={{ display: "flex", alignItems: "center", gap: 30 }} className="desk-nav">
          {links.map((l) => (
            <a key={l.k} href={l.href} style={{ fontSize: 15.5, fontWeight: 500, color: "var(--ink-soft)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--ink)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--ink-soft)")}>
              {c.nav[l.k]}
            </a>
          ))}
        </nav>

        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <LangToggle lang={lang} setLang={setLang} />
          <a href="#" style={{ fontSize: 15.5, fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap" }} className="desk-nav">{c.nav.login}</a>
          <a href="#pricing" className="btn btn-primary" style={{ padding: "11px 20px", fontSize: 15 }}>{c.nav.start}</a>
        </div>
      </div>
    </header>
  );
}

function LangToggle({ lang, setLang }) {
  return (
    <div style={{
      display: "inline-flex", border: "1.5px solid var(--line-strong)", borderRadius: 999,
      padding: 3, background: "var(--surface)", fontFamily: "var(--mono)", fontSize: 12.5, fontWeight: 700,
    }}>
      {["hr", "en"].map((L) => (
        <button key={L} onClick={() => setLang(L)} style={{
          border: "none", borderRadius: 999, padding: "5px 11px", letterSpacing: ".06em",
          background: lang === L ? "var(--accent)" : "transparent",
          color: lang === L ? "#fff" : "var(--ink-faint)",
          transition: "background .2s, color .2s",
        }}>{L.toUpperCase()}</button>
      ))}
    </div>
  );
}

/* ============ HERO ============ */
function Hero({ c, variant }) {
  const h = c.hero;
  return (
    <section id="top" style={{ position: "relative", paddingTop: 40, paddingBottom: 30 }}>
      {variant === "centered" && <HexField opacity={0.5} style={{ height: 620 }} />}
      <div className="wrap" style={{ position: "relative" }}>
        {variant === "split" && <HeroSplit h={h} />}
        {variant === "centered" && <HeroCentered h={h} />}
        {variant === "equation" && <HeroEquation h={h} />}
      </div>
    </section>
  );
}

function HeroText({ h, center = false }) {
  return (
    <div style={{ textAlign: center ? "center" : "left", maxWidth: center ? 760 : 560, margin: center ? "0 auto" : 0 }}>
      <Reveal><Eyebrow style={center ? { justifyContent: "center" } : {}}>{h.eyebrow}</Eyebrow></Reveal>
      <Reveal delay={60}>
        <h1 style={{ fontSize: center ? "clamp(40px,6vw,76px)" : "clamp(38px,5vw,62px)", marginTop: 22, fontWeight: 800 }}>
          {h.title}
        </h1>
      </Reveal>
      <Reveal delay={120}>
        <p style={{ marginTop: 22, fontSize: 20, lineHeight: 1.55, color: "var(--ink-soft)", maxWidth: center ? 620 : "none", marginInline: center ? "auto" : 0 }}>
          {h.sub}
        </p>
      </Reveal>
      <Reveal delay={180}>
        <div style={{ display: "flex", gap: 14, marginTop: 32, justifyContent: center ? "center" : "flex-start", flexWrap: "wrap" }}>
          <a href="#pricing" className="btn btn-primary" style={{ padding: "16px 28px", fontSize: 17 }}>
            {h.ctaPrimary} <Icon.arrow />
          </a>
          <a href="#pricing" className="btn btn-ghost" style={{ padding: "16px 28px", fontSize: 17 }}>{h.ctaSecondary}</a>
        </div>
      </Reveal>
      <Reveal delay={240}>
        <p style={{ marginTop: 18, fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: ".04em", color: "var(--ink-faint)" }}>
          {h.note}
        </p>
      </Reveal>
    </div>
  );
}

/* photo placeholder with stripes */
function PhotoSlot({ label, style = {}, radius = 20 }) {
  return (
    <div style={{
      position: "relative", borderRadius: radius, overflow: "hidden",
      background: "repeating-linear-gradient(135deg, #e9f1ef 0 14px, #eef5f3 14px 28px)",
      border: "1.5px solid var(--line-strong)", display: "grid", placeItems: "center", ...style,
    }}>
      <span style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".06em", color: "var(--ink-faint)", textTransform: "uppercase" }}>{label}</span>
    </div>
  );
}

/* equation chip — styled chemistry formula */
function EqChip({ caption, big = false }) {
  const S = ({ children }) => <sub style={{ fontSize: "0.62em" }}>{children}</sub>;
  return (
    <div style={{
      background: "var(--surface)", border: "1.5px solid var(--line)", borderRadius: 16,
      padding: big ? "26px 30px" : "18px 22px", boxShadow: "0 24px 50px -34px rgba(11,52,60,.5)",
    }}>
      <div style={{ fontFamily: "var(--mono)", fontSize: big ? 30 : 22, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span>2 H<S>2</S></span><span style={{ color: "var(--ink-faint)" }}>+</span>
        <span>O<S>2</S></span>
        <span style={{ color: "var(--accent)" }}>&rarr;</span>
        <span>2 H<S>2</S>O</span>
      </div>
      <div style={{ marginTop: 10, fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: ".04em", color: "var(--ink-faint)", textTransform: "uppercase" }}>{caption}</div>
    </div>
  );
}

/* Variant 1: split */
function HeroSplit({ h }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.05fr .95fr", gap: 56, alignItems: "center", paddingBlock: 48 }} className="hero-split">
      <HeroText h={h} />
      <Reveal delay={140}>
        <div style={{ position: "relative" }}>
          <HexField opacity={0.6} style={{ inset: "-40px -20px auto auto", height: 320, width: 340, maskImage: "radial-gradient(80% 80% at 70% 30%, #000 30%, transparent 75%)", WebkitMaskImage: "radial-gradient(80% 80% at 70% 30%, #000 30%, transparent 75%)" }} />
          <PhotoSlot label={h.photoLabel} style={{ aspectRatio: "4/5", maxWidth: 420, marginLeft: "auto" }} />
          <div style={{ position: "absolute", left: -26, bottom: 48, transform: "rotate(-3deg)" }}>
            <EqChip caption={h.eqCaption} />
          </div>
          <div style={{ position: "absolute", top: 18, right: -14, display: "flex", gap: 8 }}>
            <ElementTile num="1" sym="H" size={58} accent />
            <ElementTile num="8" sym="O" size={58} />
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* Variant 2: centered */
function HeroCentered({ h }) {
  const tiles = [{ n: "6", s: "C" }, { n: "1", s: "H" }, { n: "8", s: "O" }, { n: "7", s: "N" }, { n: "11", s: "Na" }, { n: "17", s: "Cl" }];
  return (
    <div style={{ paddingTop: 54, paddingBottom: 30, position: "relative" }}>
      {/* floating tiles */}
      {[
        { ...tiles[0], top: 30, left: "6%", r: -8 }, { ...tiles[1], top: 120, left: "16%", r: 6 },
        { ...tiles[2], top: 30, right: "7%", r: 7 }, { ...tiles[3], top: 130, right: "15%", r: -6 },
      ].map((t, i) => (
        <Reveal key={i} delay={200 + i * 70} style={{ position: "absolute", top: t.top, left: t.left, right: t.right }}>
          <div style={{ transform: `rotate(${t.r}deg)` }}><ElementTile num={t.n} sym={t.s} size={62} accent={i % 2 === 0} /></div>
        </Reveal>
      ))}
      <HeroText h={h} center />
      <Reveal delay={300}>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 42 }}>
          <EqChip caption={h.eqCaption} big />
        </div>
      </Reveal>
    </div>
  );
}

/* Variant 3: equation-forward */
function HeroEquation({ h }) {
  const Step = ({ n, label, eq, active }) => {
    const S = ({ children }) => <sub style={{ fontSize: "0.62em" }}>{children}</sub>;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", borderRadius: 14, background: active ? "var(--accent-wash)" : "transparent", border: `1.5px solid ${active ? "var(--accent)" : "var(--line)"}` }}>
        <span style={{ fontFamily: "var(--mono)", fontSize: 12, fontWeight: 700, color: active ? "var(--accent-ink)" : "var(--ink-faint)" }}>{n}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "var(--mono)", fontSize: 19, fontWeight: 700, color: "var(--ink)" }}>{eq}</div>
          <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>{label}</div>
        </div>
        {active && <span style={{ color: "var(--accent)" }}><Icon.check /></span>}
      </div>
    );
  };
  const S = ({ children }) => <sub style={{ fontSize: "0.62em" }}>{children}</sub>;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 56, alignItems: "center", paddingBlock: 48 }} className="hero-split">
      <HeroText h={h} />
      <Reveal delay={140}>
        <div style={{ position: "relative", background: "var(--surface)", borderRadius: 22, border: "1.5px solid var(--line)", padding: 26, boxShadow: "0 30px 60px -40px rgba(11,52,60,.55)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: 11.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>Worked example · 03</span>
            <span style={{ color: "var(--accent)" }}><Icon.flask /></span>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <Step n="1" eq={<span>C<S>3</S>H<S>8</S> + O<S>2</S></span>} label="Unbalanced — count each atom" />
            <Step n="2" eq={<span>C<S>3</S>H<S>8</S> + 5 O<S>2</S></span>} label="Balance carbon, then hydrogen" />
            <Step n="3" eq={<span>C<S>3</S>H<S>8</S> + 5 O<S>2</S> &rarr; 3 CO<S>2</S> + 4 H<S>2</S>O</span>} label="Balanced ✓" active />
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/* ============ TRUST BAR ============ */
function TrustBar({ c }) {
  const t = c.trust;
  return (
    <section style={{ paddingBlock: 40, borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)", background: "var(--surface)" }}>
      <div className="wrap">
        <Reveal><p style={{ textAlign: "center", fontFamily: "var(--mono)", fontSize: 12.5, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)" }}>{t.label}</p></Reveal>
        <Reveal delay={80}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 24, marginTop: 28 }} className="trust-grid">
            {t.stats.map((s, i) => (
              <div key={i} style={{ textAlign: "center", borderLeft: i ? "1px solid var(--line)" : "none" }}>
                <div style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 40, letterSpacing: "-0.03em", color: "var(--ink)" }}>{s.num}</div>
                <div style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ WHO IT'S FOR ============ */
function WhoFor({ c }) {
  const w = c.who;
  return (
    <section className="section">
      <div className="wrap">
        <Reveal className="section-head">
          <Eyebrow>{w.eyebrow}</Eyebrow>
          <h2>{w.title}</h2>
          <p>{w.sub}</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, marginTop: 48 }} className="three-grid">
          {w.cards.map((card, i) => (
            <Reveal key={i} delay={i * 90}>
              <a href="#pricing" className="card" style={{ display: "block", padding: 30, height: "100%" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <span className="hex" style={{ width: 52, height: 58, background: "var(--accent-wash)", display: "grid", placeItems: "center", color: "var(--accent-ink)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 17 }}>{card.tag}</span>
                </div>
                <h3 style={{ fontSize: 23, marginTop: 24 }}>{card.title}</h3>
                <p style={{ color: "var(--ink-soft)", marginTop: 12, fontSize: 16 }}>{card.desc}</p>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 7, marginTop: 22, fontWeight: 600, color: "var(--accent-ink)", fontSize: 15, whiteSpace: "nowrap" }}>
                  {card.link} <Icon.arrow style={{ width: 16, height: 16 }} />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ HOW IT WORKS ============ */
function HowItWorks({ c }) {
  const h = c.how;
  return (
    <section className="section" style={{ background: "var(--deep)", color: "#fff", position: "relative", overflow: "hidden" }}>
      <HexField opacity={0.16} color="%23ffffff" style={{ maskImage: "radial-gradient(110% 90% at 80% 10%, #000 20%, transparent 70%)", WebkitMaskImage: "radial-gradient(110% 90% at 80% 10%, #000 20%, transparent 70%)" }} />
      <div className="wrap" style={{ position: "relative" }}>
        <Reveal className="section-head">
          <Eyebrow style={{ color: "var(--accent-bright)" }}>{h.eyebrow}</Eyebrow>
          <h2 style={{ color: "#fff" }}>{h.title}</h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 28, marginTop: 52 }} className="three-grid">
          {h.steps.map((s, i) => (
            <Reveal key={i} delay={i * 110}>
              <div style={{ position: "relative", paddingTop: 28 }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: "rgba(255,255,255,.18)" }} />
                <span style={{ fontFamily: "var(--mono)", fontSize: 14, fontWeight: 700, color: "var(--accent-bright)", letterSpacing: ".1em" }}>{s.n}</span>
                <h3 style={{ color: "#fff", fontSize: 25, marginTop: 16 }}>{s.title}</h3>
                <p style={{ color: "rgba(255,255,255,.72)", marginTop: 12, fontSize: 16.5 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ FEATURES ============ */
function Features({ c }) {
  const f = c.features;
  return (
    <section className="section">
      <div className="wrap">
        <Reveal className="section-head">
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <h2>{f.title}</h2>
          <p>{f.sub}</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 18, marginTop: 48 }} className="feat-grid">
          {f.items.map((it, i) => (
            <Reveal key={i} delay={(i % 4) * 70}>
              <div className="card" style={{ padding: 24, height: "100%" }}>
                <ElementTile num={i + 1} sym={it.el} size={52} accent={i % 4 === 0} />
                <h4 style={{ fontSize: 18, marginTop: 18 }}>{it.name}</h4>
                <p style={{ color: "var(--ink-soft)", marginTop: 7, fontSize: 14.5 }}>{it.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

Object.assign(window, { Nav, Hero, TrustBar, WhoFor, HowItWorks, Features });
