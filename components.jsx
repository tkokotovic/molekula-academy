/* TopKemija — shared components */
const { useState, useEffect, useRef } = React;

/* ---- Reveal: fade/slide in on scroll ---- */
function Reveal({ children, delay = 0, as = "div", className = "", style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { el.classList.add("in"); io.unobserve(el); } }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const Tag = as;
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </Tag>
  );
}

/* ---- Eyebrow label ---- */
function Eyebrow({ children, style }) {
  return <span className="eyebrow" style={style}>{children}</span>;
}

/* ---- Periodic-style element tile ---- */
function ElementTile({ num, sym, size = 64, style = {}, accent = false }) {
  return (
    <div className="el-tile" style={{
      width: size, height: size,
      ...(accent ? { borderColor: "var(--accent)", color: "var(--accent-ink)", background: "var(--accent-wash)" } : {}),
      ...style,
    }}>
      <span className="num">{num}</span>
      <span className="sym">{sym}</span>
    </div>
  );
}

/* ---- Single hexagon (decorative) ---- */
function Hexagon({ size = 80, stroke = "var(--accent)", fill = "none", strokeWidth = 1.5, style = {} }) {
  return (
    <svg width={size} height={size * 1.1547} viewBox="0 0 100 115.47" style={style} aria-hidden="true">
      <polygon points="50,2 98,29 98,87 50,114 2,87 2,29"
        fill={fill} stroke={stroke} strokeWidth={strokeWidth} />
    </svg>
  );
}

/* ---- Hex lattice field (background texture) ---- */
function HexField({ opacity = 1, color = "var(--line-strong)", style = {} }) {
  // tiling honeycomb via repeating SVG
  const svg = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='96' viewBox='0 0 56 96'>
      <g fill='none' stroke='${color === "var(--line-strong)" ? "%23cfdcda" : color}' stroke-width='1.2'>
        <path d='M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z'/>
        <path d='M28 64 L56 80 L56 112 L28 128 L0 112 L0 80 Z'/>
      </g>
    </svg>`
  );
  return (
    <div aria-hidden="true" style={{
      position: "absolute", inset: 0, opacity: `calc(var(--motif-mult, 1) * ${opacity})`,
      backgroundImage: `url("data:image/svg+xml,${svg}")`,
      backgroundSize: "56px 96px",
      maskImage: "radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 78%)",
      WebkitMaskImage: "radial-gradient(120% 100% at 50% 0%, #000 35%, transparent 78%)",
      ...style,
    }} />
  );
}

/* ---- Simple stroked icons (24x24) ---- */
const Icon = {
  arrow: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6"/></svg>),
  check: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5l5 5L20 6"/></svg>),
  x: (p) => (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6L6 18"/></svg>),
  plus: (p) => (<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14"/></svg>),
  star: (p) => (<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z"/></svg>),
  menu: (p) => (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>),
  flask: (p) => (<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 3h6M10 3v6L5 18a2 2 0 002 3h10a2 2 0 002-3l-5-9V3"/><path d="M7.5 14h9"/></svg>),
};

/* ---- Wordmark / logo ---- */
function Logo({ dark = false, size = 1 }) {
  const ink = dark ? "#fff" : "var(--ink)";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 * size, fontFamily: "var(--display)", fontWeight: 800, fontSize: 21 * size, letterSpacing: "-0.03em", color: ink }}>
      <span style={{ position: "relative", width: 30 * size, height: 34 * size, display: "inline-grid", placeItems: "center" }}>
        <span className="hex" style={{ position: "absolute", inset: 0, background: "var(--accent)" }}></span>
        <span style={{ position: "relative", color: "#fff", fontFamily: "var(--mono)", fontWeight: 700, fontSize: 14 * size, display: "inline-block", transform: "scaleX(1.35)" }}>M</span>
      </span>
      <span>Molekula<span style={{ color: "var(--accent)" }}>&nbsp;Academy</span></span>
    </span>
  );
}

Object.assign(window, { Reveal, Eyebrow, ElementTile, Hexagon, HexField, Icon, Logo });
