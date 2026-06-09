/* TopKemija — sections B: Teacher, Testimonials, Pricing, FAQ, FinalCTA, Footer */

/* ============ TEACHER ============ */
function Teacher({ c }) {
  const t = c.teacher;
  return (
    <section id="teacher" className="section" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: ".8fr 1.2fr", gap: 56, alignItems: "center" }} className="teacher-grid">
          <Reveal>
            <div style={{ position: "relative" }}>
              <PhotoSlot label={t.photoLabel} style={{ aspectRatio: "4/5" }} radius={20} />
              <div style={{ position: "absolute", bottom: -18, right: -18, display: "flex", gap: 8 }}>
                <ElementTile num="6" sym="C" size={62} accent />
              </div>
              <div className="hex" style={{ position: "absolute", top: -16, left: -16, width: 48, height: 54, background: "var(--accent-bright)", opacity: .9 }} />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2 style={{ fontSize: "clamp(30px,4vw,46px)", marginTop: 16 }}>{t.name}</h2>
            <p style={{ fontFamily: "var(--mono)", fontSize: 13.5, letterSpacing: ".06em", color: "var(--accent-ink)", marginTop: 8, textTransform: "uppercase" }}>{t.role}</p>
            {t.quote && (
              <blockquote style={{ borderLeft: "3px solid var(--accent)", paddingLeft: 18, margin: "22px 0 0", fontSize: 17, fontStyle: "italic", color: "var(--ink)", lineHeight: 1.65, background: "var(--accent-wash)", borderRadius: "0 10px 10px 0", padding: "14px 18px 14px 20px" }}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
            )}
            {t.bio.map((para, i) => (
              <p key={i} style={{ color: "var(--ink-soft)", fontSize: 17, marginTop: 16, lineHeight: 1.7 }}>{para}</p>
            ))}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 26 }}>
              {t.creds.map((cr, i) => (
                <span key={i} style={{ fontFamily: "var(--mono)", fontSize: 12.5, padding: "8px 14px", borderRadius: 999, border: "1.5px solid var(--line-strong)", color: "var(--ink-soft)" }}>{cr}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ============ TESTIMONIALS ============ */
function Testimonials({ c }) {
  const t = c.testimonials;
  return (
    <section className="section">
      <div className="wrap">
        <Reveal className="section-head">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2>{t.title}</h2>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 22, marginTop: 48 }} className="three-grid">
          {t.items.map((it, i) => (
            <Reveal key={i} delay={i * 90}>
              <figure className="card" style={{ padding: 28, height: "100%", margin: 0, display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", gap: 3, color: "var(--accent)" }}>
                  {[0,1,2,3,4].map((s) => <Icon.star key={s} />)}
                </div>
                <blockquote style={{ margin: "18px 0 0", fontSize: 18.5, lineHeight: 1.5, color: "var(--ink)", fontFamily: "var(--display)", fontWeight: 600, letterSpacing: "-0.01em", flex: 1 }}>
                  &ldquo;{it.quote}&rdquo;
                </blockquote>
                <figcaption style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
                  <span className="hex" style={{ width: 40, height: 45, background: "var(--accent-wash)", display: "grid", placeItems: "center", color: "var(--accent-ink)", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 15 }}>{it.name[0]}</span>
                  <span>
                    <span style={{ display: "block", fontWeight: 600, fontSize: 15 }}>{it.name}</span>
                    <span style={{ display: "block", fontSize: 13.5, color: "var(--ink-faint)" }}>{it.role}</span>
                  </span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ============ PRICING ============ */
function Pricing({ c }) {
  const p = c.pricing;
  return (
    <section id="pricing" className="section" style={{ background: "var(--surface)", borderTop: "1px solid var(--line)" }}>
      <div className="wrap">
        <Reveal className="section-head" style={{ textAlign: "center", margin: "0 auto" }}>
          <Eyebrow style={{ justifyContent: "center" }}>{p.eyebrow}</Eyebrow>
          <h2>{p.title}</h2>
          <p style={{ marginInline: "auto" }}>{p.sub}</p>
        </Reveal>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 24, marginTop: 48, maxWidth: 880, marginInline: "auto" }} className="price-grid">
          {p.plans.map((plan, i) => {
            const popular = i === 1;
            return (
              <Reveal key={i} delay={i * 110}>
                <div style={{
                  position: "relative", borderRadius: 22, padding: "34px 30px", height: "100%",
                  background: popular ? "var(--deep)" : "var(--surface)",
                  color: popular ? "#fff" : "var(--ink)",
                  border: `1.5px solid ${popular ? "var(--deep)" : "var(--line-strong)"}`,
                  boxShadow: popular ? "0 30px 60px -34px rgba(11,52,60,.6)" : "none",
                }}>
                  {popular && (
                    <span style={{ position: "absolute", top: -13, left: "50%", transform: "translateX(-50%)", background: "var(--accent-bright)", color: "var(--deep)", fontFamily: "var(--mono)", fontSize: 11.5, fontWeight: 700, letterSpacing: ".08em", textTransform: "uppercase", padding: "6px 14px", borderRadius: 999, whiteSpace: "nowrap" }}>{p.popular}</span>
                  )}
                  <h3 style={{ fontSize: 24, color: popular ? "#fff" : "var(--ink)" }}>{plan.name}</h3>
                  <p style={{ fontSize: 14.5, color: popular ? "rgba(255,255,255,.7)" : "var(--ink-faint)", marginTop: 4 }}>{plan.tagline}</p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginTop: 22 }}>
                    <span style={{ fontFamily: "var(--display)", fontWeight: 800, fontSize: 54, letterSpacing: "-0.04em" }}>&euro;{plan.price}</span>
                    <span style={{ fontFamily: "var(--mono)", fontSize: 15, color: popular ? "rgba(255,255,255,.65)" : "var(--ink-faint)" }}>{p.perMonth}</span>
                  </div>
                  <a href="#" className={popular ? "btn btn-white" : "btn btn-dark"} style={{ width: "100%", marginTop: 24, padding: "15px 24px" }}>{p.cta}</a>
                  <ul style={{ listStyle: "none", padding: 0, margin: "26px 0 0", display: "grid", gap: 13 }}>
                    {plan.features.map((ft, j) => (
                      <li key={j} style={{ display: "flex", gap: 11, alignItems: "flex-start", fontSize: 15.5, color: ft.on ? (popular ? "rgba(255,255,255,.92)" : "var(--ink)") : (popular ? "rgba(255,255,255,.4)" : "var(--ink-faint)") }}>
                        <span style={{ color: ft.on ? (popular ? "var(--accent-bright)" : "var(--accent)") : (popular ? "rgba(255,255,255,.35)" : "var(--line-strong)"), flexShrink: 0, marginTop: 1 }}>
                          {ft.on ? <Icon.check /> : <Icon.x />}
                        </span>
                        <span style={{ textDecoration: ft.on ? "none" : "line-through", textDecorationColor: "var(--line-strong)" }}>{ft.t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============ FAQ ============ */
function FAQ({ c }) {
  const f = c.faq;
  const [open, setOpen] = useState(0);
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <Reveal className="section-head" style={{ textAlign: "center", margin: "0 auto 48px" }}>
          <Eyebrow style={{ justifyContent: "center" }}>{f.eyebrow}</Eyebrow>
          <h2>{f.title}</h2>
        </Reveal>
        <div style={{ display: "grid", gap: 12 }}>
          {f.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 50}>
                <div className="card" style={{ overflow: "hidden", borderColor: isOpen ? "var(--line-strong)" : "var(--line)" }}>
                  <button onClick={() => setOpen(isOpen ? -1 : i)} style={{
                    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    background: "transparent", border: "none", padding: "22px 26px", textAlign: "left",
                    fontFamily: "var(--display)", fontWeight: 600, fontSize: 19, color: "var(--ink)", letterSpacing: "-0.01em",
                  }}>
                    {it.q}
                    <span style={{ flexShrink: 0, color: "var(--accent)", transition: "transform .25s ease", transform: isOpen ? "rotate(45deg)" : "none" }}><Icon.plus /></span>
                  </button>
                  <div style={{ maxHeight: isOpen ? 200 : 0, overflow: "hidden", transition: "max-height .32s cubic-bezier(.2,.7,.2,1)" }}>
                    <p style={{ padding: "0 26px 24px", color: "var(--ink-soft)", fontSize: 16.5, lineHeight: 1.6 }}>{it.a}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ============ FINAL CTA ============ */
function FinalCTA({ c }) {
  const f = c.finalCta;
  return (
    <section className="section" style={{ paddingBottom: 110 }}>
      <div className="wrap">
        <Reveal>
          <div style={{ position: "relative", overflow: "hidden", borderRadius: 28, background: "var(--deep)", color: "#fff", padding: "76px 40px", textAlign: "center" }}>
            <HexField opacity={0.2} color="%231ec8b6" style={{ maskImage: "radial-gradient(80% 120% at 50% 0%, #000 25%, transparent 72%)", WebkitMaskImage: "radial-gradient(80% 120% at 50% 0%, #000 25%, transparent 72%)" }} />
            <div style={{ position: "relative" }}>
              <h2 style={{ color: "#fff", fontSize: "clamp(30px,4.5vw,52px)", maxWidth: 700, margin: "0 auto" }}>{f.title}</h2>
              <p style={{ color: "rgba(255,255,255,.78)", fontSize: 19, marginTop: 18, maxWidth: 520, marginInline: "auto" }}>{f.sub}</p>
              <a href="#pricing" className="btn btn-white" style={{ marginTop: 34, padding: "17px 34px", fontSize: 17 }}>{f.cta} <Icon.arrow /></a>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ============ FOOTER ============ */
function Footer({ c, lang, setLang }) {
  const f = c.footer;
  return (
    <footer style={{ background: "var(--surface)", borderTop: "1px solid var(--line)", paddingTop: 64, paddingBottom: 40 }}>
      <div className="wrap">
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }} className="footer-grid">
          <div>
            <Logo />
            <p style={{ color: "var(--ink-soft)", fontSize: 15.5, marginTop: 16, maxWidth: 260 }}>{f.tagline}</p>
            <div style={{ marginTop: 20 }}><LangToggle lang={lang} setLang={setLang} /></div>
          </div>
          {f.cols.map((col, i) => (
            <div key={i}>
              <h4 style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".1em", textTransform: "uppercase", color: "var(--ink-faint)", fontWeight: 700 }}>{f.colsTitle[i]}</h4>
              <ul style={{ listStyle: "none", padding: 0, margin: "16px 0 0", display: "grid", gap: 11 }}>
                {col.map((link, j) => (
                  <li key={j}><a href="#" style={{ fontSize: 15, color: "var(--ink-soft)" }} onMouseEnter={(e)=>e.currentTarget.style.color="var(--accent-ink)"} onMouseLeave={(e)=>e.currentTarget.style.color="var(--ink-soft)"}>{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <p style={{ fontFamily: "var(--mono)", fontSize: 12.5, color: "var(--ink-faint)" }}>{f.rights}</p>
          <div style={{ display: "flex", gap: 14, color: "var(--ink-faint)" }}>
            {["in", "ig", "yt"].map((s) => (
              <a key={s} href="#" style={{ width: 34, height: 34, borderRadius: 999, border: "1.5px solid var(--line-strong)", display: "grid", placeItems: "center", fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700 }}>{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

Object.assign(window, { Teacher, Testimonials, Pricing, FAQ, FinalCTA, Footer });
