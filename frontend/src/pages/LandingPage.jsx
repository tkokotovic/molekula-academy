import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

// ─── Content ──────────────────────────────────────────────────────────────────

const CONTENT = {
  hr: {
    nav: { home: "Početna", about: "O nama", pricing: "Cijene", login: "Prijava", start: "Počni besplatno" },
    hero: {
      eyebrow: "Online akademija kemije",
      title: "Kemija objašnjena tako da konačno ima smisla.",
      sub: "Strukturirane lekcije, kvizovi i live podrška za IB, prijemni ispit za medicinu i stomatologiju. Vodi te netko tko je bio na tvom mjestu.",
      ctaPrimary: "Počni besplatno",
      ctaSecondary: "Pogledaj planove",
      note: "Bez kartice za probni period · Otkaži bilo kada",
      eqCaption: "Stehiometrija · izjednačavanje reakcije",
    },
    trust: {
      label: "Vjeruju nam učenici diljem Hrvatske",
      stats: [
        { num: "50+", label: "aktivnih učenika" },
        { num: "95%", label: "prolaznost na ispitima" },
        { num: "4.9/5", label: "prosječna ocjena" },
        { num: "od 2008.", label: "iskustva u podučavanju" },
      ],
    },
    who: {
      eyebrow: "Za koga je ovo",
      title: "Napravljeno za tvoj ispit, ne za prosjek.",
      sub: "Svaki put kreće od onoga što ti zaista treba — dobri temelji i fokus na razumijevanje.",
      cards: [
        { tag: "IB", title: "IB Kemija (HL i SL)", desc: "Cjeloviti syllabus, Paper 1–3 strategije i podrška za visok rezultat.", link: "Saznaj više" },
        { tag: "Rx", title: "Prijemni za medicinu i stomatologiju", desc: "Ciljana priprema za najteža pitanja kemije na prijemnim ispitima.", link: "Saznaj više" },
        { tag: "Uni", title: "Fakultetska kemija", desc: "Opća, organska i biokemija za studente medicine i stomatologije.", link: "Saznaj više" },
      ],
    },
    how: {
      eyebrow: "Kako funkcionira",
      title: "Od zbunjenosti do sigurnosti u tri koraka.",
      steps: [
        { n: "01", title: "Odaberi plan", desc: "Basic za samostalno učenje ili Premium za direktnu podršku profesora." },
        { n: "02", title: "Uči svojim tempom", desc: "Lekcije, kvizovi i probni ispiti dostupni 24/7, s bilo kojeg uređaja." },
        { n: "03", title: "Zatraži pomoć", desc: "Postavi pitanje u chatu ili rezerviraj live Zoom termin kad zapneš." },
      ],
    },
    features: {
      eyebrow: "Što dobivaš",
      title: "Sve na jednom mjestu.",
      sub: "Platforma izgrađena oko jednog cilja — da razumiješ, a ne samo zapamtiš.",
      items: [
        { el: "Li", name: "Pisane lekcije", desc: "Jasna teorija, korak po korak." },
        { el: "Vd", name: "Video lekcije", desc: "Vizualna objašnjenja teških tema." },
        { el: "Qz", name: "Vježbe i kvizovi", desc: "Trenutna povratna informacija." },
        { el: "Ex", name: "Probni ispiti", desc: "Realni uvjeti, prava priprema." },
        { el: "Pr", name: "Praćenje napretka", desc: "Vidiš gdje si i kamo ideš." },
        { el: "Ch", name: "Chat s profesorom", desc: "Pitanja kad ti trebaju odgovori." },
        { el: "Bk", name: "Rezervacija termina", desc: "Live Zoom 1-na-1 sesije." },
        { el: "Ce", name: "Certifikati", desc: "Dokaz o završenom modulu." },
      ],
    },
    teacher: {
      eyebrow: "Tvoj profesor",
      name: "Tomislav",
      role: "Instruktor",
      quote: "Dobro kemijsko obrazovanje su tri stvari: razumjeti teoriju, položiti ispit i zadržati ono što zaista vrijedi — kad jednog dana budeš liječnik. Sve tri. Nikad jedna bez druge.",
      bio: [
        "Kemiju podučavam jer se sjećam koliko je zabavno bilo kad mi je jedna osoba objasnila stvari kako treba.",
        "Liječnik sam koji kemiju predaje više od 15 godina. Sjedio sam na istom prijemnom ispitu za koji ti se pripremaš. Znam točno što se ispituje, gdje učenici gube bodove i što vrijedi duboko razumjeti — a što ne.",
        "Od 2008. pripremam studente medicine i stomatologije za ispite. Zadnjih 5 godina radim i s IB učenicima. Molekula Academy izgrađena je na tom iskustvu — solidni temelji, prava vježba za ispit i klinička perspektiva liječnika koji to znanje koristi svaki dan.",
      ],
      creds: ["dr. med.", "15+ godina iskustva", "200+ podučavanih učenika", "IB & prijemni specijalist"],
    },
    testimonials: {
      eyebrow: "Što kažu učenici",
      title: "Rezultati govore umjesto nas.",
      items: [
        { quote: "Prvi put da mi je organska kemija imala smisla. Prešla sam s 4 na 7 u IB-u.", name: "Marta K.", role: "IB Chemistry HL" },
        { quote: "Prijemni za medicinu je bio puno lakši nego što sam mislio. Probni ispiti su zlato.", name: "Luka P.", role: "Medicinski fakultet" },
        { quote: "Tomislav objasni u pet minuta ono što sam tjednima čitao iz skripte.", name: "Ana M.", role: "Stomatologija, 1. god." },
      ],
    },
    pricing: {
      eyebrow: "Cijene",
      title: "Jednostavno. Bez skrivenih troškova.",
      sub: "Mjesečna naplata. Otkaži bilo kada.",
      perMonth: "/mj",
      cta: "Odaberi plan",
      popular: "Najpopularnije",
      plans: [
        {
          name: "Basic", price: "19", tagline: "Za samostalno učenje",
          features: [
            { t: "Sve pisane lekcije i teorija", on: true },
            { t: "Sve vježbe (samoispravljanje)", on: true },
            { t: "Kvizovi s trenutnom povratnom informacijom", on: true },
            { t: "Praćenje napretka", on: true },
            { t: "Certifikati o završetku", on: true },
            { t: "Video lekcije", on: false },
            { t: "Chat s profesorom", on: false },
            { t: "Live Zoom sesije", on: false },
          ],
        },
        {
          name: "Premium", price: "39", tagline: "Za maksimalan rezultat",
          features: [
            { t: "Sve iz Basic plana", on: true },
            { t: "Video lekcije", on: true },
            { t: "Probni ispiti s pitanjima zatvorenog tipa", on: true },
            { t: "Direktan chat s profesorom", on: true },
            { t: "1 live Zoom sesija mjesečno", on: true },
            { t: "Pisani feedback na probne ispite", on: true },
            { t: "Prioritetni odgovor", on: true },
          ],
        },
      ],
    },
    faq: {
      eyebrow: "Česta pitanja",
      title: "Sve što te zanima.",
      items: [
        { q: "Je li ovo dobro za IB Kemiju HL?", a: "Da. Cijeli sadržaj prati IB syllabus za HL i SL, uključujući strategije za Paper 1, 2 i 3 te podršku za internal assessment." },
        { q: "Kako funkcioniraju live sesije?", a: "Premium uključuje jednu Zoom sesiju mjesečno. Rezerviraš termin u kalendaru, dobiješ link na email i radimo 1-na-1 na onome što ti treba." },
        { q: "Mogu li promijeniti plan?", a: "Naravno. Možeš nadograditi ili smanjiti plan u bilo kojem trenutku iz svojih postavki računa. Promjena vrijedi od sljedećeg ciklusa." },
        { q: "Što ako zaostanem?", a: "Sve lekcije su uvijek dostupne, bez rokova. Učiš svojim tempom, a napredak ti se sprema automatski." },
        { q: "Postoji li besplatna proba?", a: "Da. Možeš započeti besplatno i isprobati dio lekcija i kvizova prije nego se odlučiš za plan." },
        { q: "Na kojem je jeziku sadržaj?", a: "Sadržaj je na hrvatskom, uz stručne pojmove i na engleskom — idealno za IB učenike koji polažu na engleskom." },
      ],
    },
    finalCta: {
      title: "Spreman/na prestati se mučiti s kemijom?",
      sub: "Pridruži se učenicima koji su prestali bubati i počeli razumjeti.",
      cta: "Počni besplatno",
    },
    footer: {
      tagline: "Kemija koja konačno ima smisla.",
      colsTitle: ["Stranice", "Resursi", "Pravno"],
      cols: [
        ["Početna", "Cijene", "Blog", "O nama", "Kontakt"],
        ["IB Kemija", "Prijemni ispiti", "Fakultetska kemija", "Besplatni materijali"],
        ["Privatnost", "Uvjeti korištenja", "Kolačići"],
      ],
      rights: "© 2026 Molekula Academy. Sva prava pridržana.",
    },
  },
  en: {
    nav: { home: "Home", about: "About", pricing: "Pricing", login: "Log in", start: "Start free" },
    hero: {
      eyebrow: "Online chemistry academy",
      title: "Chemistry explained so it finally makes sense.",
      sub: "Structured lessons, quizzes, and live tutoring for IB and the medical & dental entrance exam. Guided by someone who's been in your seat.",
      ctaPrimary: "Start for free",
      ctaSecondary: "See plans",
      note: "No card for the trial · Cancel anytime",
      eqCaption: "Stoichiometry · balancing the equation",
    },
    trust: {
      label: "Trusted by students across Croatia",
      stats: [
        { num: "50+", label: "active students" },
        { num: "95%", label: "exam pass rate" },
        { num: "4.9/5", label: "average rating" },
        { num: "since 2008", label: "teaching experience" },
      ],
    },
    who: {
      eyebrow: "Who it's for",
      title: "Built for your exam, not the average.",
      sub: "Every path starts from what you actually need — solid foundations and a focus on understanding.",
      cards: [
        { tag: "IB", title: "IB Chemistry (HL & SL)", desc: "Full syllabus, Paper 1–3 strategy and support for a top score.", link: "Learn more" },
        { tag: "Rx", title: "Medical & Dental Entrance", desc: "Targeted prep for the toughest chemistry on entrance exams.", link: "Learn more" },
        { tag: "Uni", title: "University Chemistry", desc: "General, organic and biochemistry for medicine and dentistry students.", link: "Learn more" },
      ],
    },
    how: {
      eyebrow: "How it works",
      title: "From confused to confident in three steps.",
      steps: [
        { n: "01", title: "Choose your plan", desc: "Basic for self-paced study or Premium for direct teacher support." },
        { n: "02", title: "Study at your pace", desc: "Lessons, quizzes and mock exams available 24/7, on any device." },
        { n: "03", title: "Get personal help", desc: "Ask in chat or book a live Zoom session whenever you're stuck." },
      ],
    },
    features: {
      eyebrow: "What you get",
      title: "Everything in one place.",
      sub: "A platform built around a single goal — to understand, not just memorise.",
      items: [
        { el: "Li", name: "Written lessons", desc: "Clear theory, step by step." },
        { el: "Vd", name: "Video lessons", desc: "Visual takes on hard topics." },
        { el: "Qz", name: "Practice quizzes", desc: "Instant feedback as you go." },
        { el: "Ex", name: "Mock exams", desc: "Real conditions, real prep." },
        { el: "Pr", name: "Progress tracking", desc: "See where you are and where you're headed." },
        { el: "Ch", name: "Teacher chat", desc: "Questions when you need answers." },
        { el: "Bk", name: "Session booking", desc: "Live 1-on-1 Zoom sessions." },
        { el: "Ce", name: "Certificates", desc: "Proof of every module done." },
      ],
    },
    teacher: {
      eyebrow: "Your teacher",
      name: "Tomislav",
      role: "Tutor",
      quote: "Good chemistry education is three things: understanding the theory properly, passing the exam, and keeping what actually matters when you are practising medicine. All three. Not one without the others.",
      bio: [
        "I teach chemistry because I remember how fun it became once one person explained things to me properly.",
        "I am a practicing physician who has been teaching chemistry for over 15 years. I sat the same entrance exam your students are preparing for. I know exactly what is tested, where students lose marks, and what is worth understanding deeply.",
        "Since 2008 I have been preparing medical and dentistry students for their exams. For the past 5 years I have also worked with IB Chemistry students. Molekula Academy is built on that experience — solid theoretical foundations, real exam practice, and the clinical perspective of a physician who still uses this knowledge every day.",
      ],
      creds: ["MD", "15+ years experience", "200+ students taught", "IB & entrance specialist"],
    },
    testimonials: {
      eyebrow: "What students say",
      title: "The results speak for us.",
      items: [
        { quote: "First time organic chemistry actually made sense. I went from a 4 to a 7 in IB.", name: "Marta K.", role: "IB Chemistry HL" },
        { quote: "The medical entrance was far easier than I expected. The mock exams are gold.", name: "Luka P.", role: "Medical School" },
        { quote: "Tomislav explains in five minutes what I'd read for weeks from a textbook.", name: "Ana M.", role: "Dentistry, Year 1" },
      ],
    },
    pricing: {
      eyebrow: "Pricing",
      title: "Simple. No hidden costs.",
      sub: "Billed monthly. Cancel anytime.",
      perMonth: "/mo",
      cta: "Choose plan",
      popular: "Most popular",
      plans: [
        {
          name: "Basic", price: "19", tagline: "For self-paced study",
          features: [
            { t: "All written lessons & theory", on: true },
            { t: "All practice problems (self-marking)", on: true },
            { t: "Quizzes with instant feedback", on: true },
            { t: "Progress tracking", on: true },
            { t: "Completion certificates", on: true },
            { t: "Video lessons", on: false },
            { t: "Teacher chat", on: false },
            { t: "Live Zoom sessions", on: false },
          ],
        },
        {
          name: "Premium", price: "39", tagline: "For your best possible score",
          features: [
            { t: "Everything in Basic", on: true },
            { t: "Video lessons", on: true },
            { t: "Topic quizzes & mock exams", on: true },
            { t: "Direct chat with the teacher", on: true },
            { t: "1 live Zoom session per month", on: true },
            { t: "Written feedback on mock exams", on: true },
            { t: "Priority response time", on: true },
          ],
        },
      ],
    },
    faq: {
      eyebrow: "FAQ",
      title: "Everything you're wondering.",
      items: [
        { q: "Is this good for IB Chemistry HL?", a: "Yes. All content follows the IB syllabus for HL and SL, including strategy for Paper 1, 2 and 3 and internal assessment support." },
        { q: "How do live sessions work?", a: "Premium includes one Zoom session per month. You book a slot in the calendar, get a link by email, and we work 1-on-1 on whatever you need." },
        { q: "Can I switch plans?", a: "Of course. You can upgrade or downgrade anytime from your account settings. Changes apply from the next billing cycle." },
        { q: "What if I fall behind?", a: "Every lesson is always available, with no deadlines. You study at your own pace and your progress saves automatically." },
        { q: "Is there a free trial?", a: "Yes. You can start for free and try a selection of lessons and quizzes before committing to a plan." },
        { q: "What language is the content in?", a: "Content is in Croatian, with technical terms also in English — ideal for IB students sitting their exams in English." },
      ],
    },
    finalCta: {
      title: "Ready to stop struggling with chemistry?",
      sub: "Join the students who stopped cramming and started understanding.",
      cta: "Start for free",
    },
    footer: {
      tagline: "Chemistry that finally makes sense.",
      colsTitle: ["Pages", "Resources", "Legal"],
      cols: [
        ["Home", "Pricing", "Blog", "About", "Contact"],
        ["IB Chemistry", "Entrance Exams", "University Chemistry", "Free Resources"],
        ["Privacy", "Terms of Service", "Cookies"],
      ],
      rights: "© 2026 Molekula Academy. All rights reserved.",
    },
  },
};

// ─── Shared components ────────────────────────────────────────────────────────

function Reveal({ children, delay = 0, className = '', style = {} }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => { if (e.isIntersecting) { el.classList.add('in'); io.unobserve(el); } }),
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`lp-reveal ${className}`} style={{ transitionDelay: `${delay}ms`, ...style }}>
      {children}
    </div>
  );
}

function Eyebrow({ children, style }) {
  return <span className="lp-eyebrow" style={style}>{children}</span>;
}

function ElementTile({ num, sym, size = 64, accent = false }) {
  return (
    <div className={`lp-el-tile${accent ? ' accent' : ''}`} style={{ width: size, height: size }}>
      <span className="num">{num}</span>
      <span className="sym">{sym}</span>
    </div>
  );
}

function HexField({ opacity = 1, color = '%23cfdcda', style = {} }) {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='56' height='96' viewBox='0 0 56 96'><g fill='none' stroke='${color}' stroke-width='1.2'><path d='M28 0 L56 16 L56 48 L28 64 L0 48 L0 16 Z'/><path d='M28 64 L56 80 L56 112 L28 128 L0 112 L0 80 Z'/></g></svg>`;
  return (
    <div aria-hidden="true" className="lp-hexfield" style={{
      opacity,
      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      ...style,
    }} />
  );
}

const Ico = {
  arrow: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14M13 6l6 6-6 6" /></svg>,
  check: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 12.5l5 5L20 6" /></svg>,
  x: (p) => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 6l12 12M18 6L6 18" /></svg>,
  plus: (p) => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M12 5v14M5 12h14" /></svg>,
  star: (p) => <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" {...p}><path d="M12 2l2.9 6.3 6.9.7-5.1 4.6 1.4 6.8L12 17.8 5.9 20.4l1.4-6.8L2.2 9l6.9-.7z" /></svg>,
  flask: (p) => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 3h6M10 3v6L5 18a2 2 0 002 3h10a2 2 0 002-3l-5-9V3" /><path d="M7.5 14h9" /></svg>,
  menu: (p) => <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M3 6h18M3 12h18M3 18h18" /></svg>,
};

function LpLogo() {
  return (
    <span className="lp-logo">
      <span className="lp-logo-hex hex">
        <span>M</span>
      </span>
      <span>Molekula<span style={{ color: 'var(--accent)' }}>&nbsp;Academy</span></span>
    </span>
  );
}

function LangToggle({ lang, setLang }) {
  return (
    <div className="lp-lang">
      {['hr', 'en'].map((L) => (
        <button key={L} onClick={() => setLang(L)} className={lang === L ? 'on' : ''}>{L.toUpperCase()}</button>
      ))}
    </div>
  );
}

// ─── Sections ─────────────────────────────────────────────────────────────────

function LpNav({ c, lang, setLang, scrolled, onLogin, onStart }) {
  return (
    <header className={`lp-nav${scrolled ? ' scrolled' : ''}`}>
      <div className="wrap" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 76 }}>
        <LpLogo />
        <nav className="lp-desk-nav">
          <a href="#top">{c.nav.home}</a>
          <a href="#teacher">{c.nav.about}</a>
          <a href="#pricing">{c.nav.pricing}</a>
        </nav>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <LangToggle lang={lang} setLang={setLang} />
          <button onClick={onLogin} className="lp-link-btn lp-desk-nav">{c.nav.login}</button>
          <button onClick={onStart} className="btn btn-primary" style={{ padding: '11px 20px', fontSize: 15 }}>{c.nav.start}</button>
        </div>
      </div>
    </header>
  );
}

function EqChip({ caption, big = false }) {
  return (
    <div className="lp-eq-chip" style={{ padding: big ? '26px 30px' : '18px 22px' }}>
      <div className="lp-eq-formula" style={{ fontSize: big ? 30 : 22 }}>
        <span>2 H<sub style={{ fontSize: '0.62em' }}>2</sub></span>
        <span style={{ color: 'var(--ink-faint)' }}>+</span>
        <span>O<sub style={{ fontSize: '0.62em' }}>2</sub></span>
        <span style={{ color: 'var(--accent)' }}>→</span>
        <span>2 H<sub style={{ fontSize: '0.62em' }}>2</sub>O</span>
      </div>
      <div className="lp-eq-caption">{caption}</div>
    </div>
  );
}

function PhotoSlot({ label, style = {}, radius = 20 }) {
  return (
    <div className="lp-photo-slot" style={{ borderRadius: radius, ...style }}>
      <span>{label}</span>
    </div>
  );
}

function LpHero({ c, onStart }) {
  const h = c.hero;
  return (
    <section id="top" style={{ position: 'relative', paddingTop: 40, paddingBottom: 30 }}>
      <HexField opacity={0.5} style={{ height: 620 }} />
      <div className="wrap" style={{ position: 'relative' }}>
        <div className="lp-hero-split hero-split">
          <div style={{ maxWidth: 560 }}>
            <Reveal><Eyebrow>{h.eyebrow}</Eyebrow></Reveal>
            <Reveal delay={60}>
              <h1 style={{ fontSize: 'clamp(38px,5vw,62px)', marginTop: 22, fontWeight: 800 }}>{h.title}</h1>
            </Reveal>
            <Reveal delay={120}>
              <p style={{ marginTop: 22, fontSize: 20, lineHeight: 1.55, color: 'var(--ink-soft)' }}>{h.sub}</p>
            </Reveal>
            <Reveal delay={180}>
              <div style={{ display: 'flex', gap: 14, marginTop: 32, flexWrap: 'wrap' }}>
                <button onClick={onStart} className="btn btn-primary" style={{ padding: '16px 28px', fontSize: 17 }}>
                  {h.ctaPrimary} <Ico.arrow />
                </button>
                <a href="#pricing" className="btn btn-ghost" style={{ padding: '16px 28px', fontSize: 17 }}>{h.ctaSecondary}</a>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <p style={{ marginTop: 18, fontFamily: 'var(--mono)', fontSize: 12.5, letterSpacing: '.04em', color: 'var(--ink-faint)' }}>{h.note}</p>
            </Reveal>
          </div>
          <Reveal delay={140}>
            <div style={{ position: 'relative' }}>
              <PhotoSlot label={h.eqCaption} style={{ aspectRatio: '4/5', maxWidth: 420, marginLeft: 'auto' }} />
              <div style={{ position: 'absolute', left: -26, bottom: 48, transform: 'rotate(-3deg)' }}>
                <EqChip caption={h.eqCaption} />
              </div>
              <div style={{ position: 'absolute', top: 18, right: -14, display: 'flex', gap: 8 }}>
                <ElementTile num="1" sym="H" size={58} accent />
                <ElementTile num="8" sym="O" size={58} />
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function LpTrust({ c }) {
  const t = c.trust;
  return (
    <section style={{ paddingBlock: 40, borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)', background: 'var(--surface)' }}>
      <div className="wrap">
        <Reveal>
          <p style={{ textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 12.5, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>{t.label}</p>
        </Reveal>
        <Reveal delay={80}>
          <div className="trust-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 24, marginTop: 28 }}>
            {t.stats.map((s, i) => (
              <div key={i} style={{ textAlign: 'center', borderLeft: i ? '1px solid var(--line)' : 'none' }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 40, letterSpacing: '-0.03em', color: 'var(--ink)' }}>{s.num}</div>
                <div style={{ fontSize: 14, color: 'var(--ink-soft)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LpWhoFor({ c, onStart }) {
  const w = c.who;
  return (
    <section className="section">
      <div className="wrap">
        <Reveal className="lp-section-head">
          <Eyebrow>{w.eyebrow}</Eyebrow>
          <h2>{w.title}</h2>
          <p>{w.sub}</p>
        </Reveal>
        <div className="three-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, marginTop: 48 }}>
          {w.cards.map((card, i) => (
            <Reveal key={i} delay={i * 90}>
              <button onClick={onStart} className="card lp-who-card">
                <span className="hex lp-who-tag">{card.tag}</span>
                <h3 style={{ fontSize: 23, marginTop: 24 }}>{card.title}</h3>
                <p style={{ color: 'var(--ink-soft)', marginTop: 12, fontSize: 16 }}>{card.desc}</p>
                <span className="lp-who-link">{card.link} <Ico.arrow style={{ width: 16, height: 16 }} /></span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LpHow({ c }) {
  const h = c.how;
  return (
    <section className="section lp-dark-section">
      <HexField opacity={0.16} color="%23ffffff" style={{ maskImage: 'radial-gradient(110% 90% at 80% 10%, #000 20%, transparent 70%)', WebkitMaskImage: 'radial-gradient(110% 90% at 80% 10%, #000 20%, transparent 70%)' }} />
      <div className="wrap" style={{ position: 'relative' }}>
        <Reveal className="lp-section-head">
          <Eyebrow style={{ color: 'var(--accent-bright)' }}>{h.eyebrow}</Eyebrow>
          <h2 style={{ color: '#fff' }}>{h.title}</h2>
        </Reveal>
        <div className="three-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 28, marginTop: 52 }}>
          {h.steps.map((s, i) => (
            <Reveal key={i} delay={i * 110}>
              <div style={{ position: 'relative', paddingTop: 28 }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,.18)' }} />
                <span style={{ fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700, color: 'var(--accent-bright)', letterSpacing: '.1em' }}>{s.n}</span>
                <h3 style={{ color: '#fff', fontSize: 25, marginTop: 16 }}>{s.title}</h3>
                <p style={{ color: 'rgba(255,255,255,.72)', marginTop: 12, fontSize: 16.5 }}>{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LpFeatures({ c }) {
  const f = c.features;
  return (
    <section className="section">
      <div className="wrap">
        <Reveal className="lp-section-head">
          <Eyebrow>{f.eyebrow}</Eyebrow>
          <h2>{f.title}</h2>
          <p>{f.sub}</p>
        </Reveal>
        <div className="feat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 18, marginTop: 48 }}>
          {f.items.map((it, i) => (
            <Reveal key={i} delay={(i % 4) * 70}>
              <div className="card lp-feat-card">
                <ElementTile num={i + 1} sym={it.el} size={62} accent />
                <h4 style={{ fontSize: 17, marginTop: 20, letterSpacing: '-0.01em' }}>{it.name}</h4>
                <p style={{ color: 'var(--ink-soft)', marginTop: 8, fontSize: 14, lineHeight: 1.55 }}>{it.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LpTeacher({ c }) {
  const t = c.teacher;
  return (
    <section id="teacher" className="section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', borderBottom: '1px solid var(--line)' }}>
      <div className="wrap">
        <div className="teacher-grid" style={{ display: 'grid', gridTemplateColumns: '.8fr 1.2fr', gap: 56, alignItems: 'center' }}>
          <Reveal>
            <div style={{ position: 'relative' }}>
              <PhotoSlot label={t.photoLabel || 'foto'} style={{ aspectRatio: '4/5' }} radius={20} />
              <div style={{ position: 'absolute', bottom: -18, right: -18 }}>
                <ElementTile num="6" sym="C" size={62} accent />
              </div>
              <div className="hex" style={{ position: 'absolute', top: -16, left: -16, width: 48, height: 54, background: 'var(--accent-bright)', opacity: .9 }} />
            </div>
          </Reveal>
          <Reveal delay={120}>
            <Eyebrow>{t.eyebrow}</Eyebrow>
            <h2 style={{ fontSize: 'clamp(30px,4vw,46px)', marginTop: 16 }}>{t.name}</h2>
            <p style={{ fontFamily: 'var(--mono)', fontSize: 13.5, letterSpacing: '.06em', color: 'var(--accent-ink)', marginTop: 8, textTransform: 'uppercase' }}>{t.role}</p>
            {t.quote && (
              <blockquote style={{ borderLeft: '3px solid var(--accent)', margin: '22px 0 0', fontSize: 17, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1.65, background: 'var(--accent-wash)', borderRadius: '0 10px 10px 0', padding: '14px 18px 14px 20px' }}>
                &ldquo;{t.quote}&rdquo;
              </blockquote>
            )}
            {t.bio.map((para, i) => (
              <p key={i} style={{ color: 'var(--ink-soft)', fontSize: 17, marginTop: 16, lineHeight: 1.7 }}>{para}</p>
            ))}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
              {t.creds.map((cr, i) => (
                <span key={i} className="chip">{cr}</span>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function LpTestimonials({ c }) {
  const t = c.testimonials;
  return (
    <section className="section">
      <div className="wrap">
        <Reveal className="lp-section-head">
          <Eyebrow>{t.eyebrow}</Eyebrow>
          <h2>{t.title}</h2>
        </Reveal>
        <div className="three-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 22, marginTop: 48 }}>
          {t.items.map((it, i) => (
            <Reveal key={i} delay={i * 90}>
              <figure className="card" style={{ padding: 28, height: '100%', margin: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 3, color: 'var(--accent)' }}>
                  {[0, 1, 2, 3, 4].map((s) => <Ico.star key={s} />)}
                </div>
                <blockquote style={{ margin: '18px 0 0', fontSize: 18.5, lineHeight: 1.5, color: 'var(--ink)', fontFamily: 'var(--display)', fontWeight: 600, letterSpacing: '-0.01em', flex: 1 }}>
                  &ldquo;{it.quote}&rdquo;
                </blockquote>
                <figcaption style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
                  <span className="hex lp-avatar">{it.name[0]}</span>
                  <span>
                    <span style={{ display: 'block', fontWeight: 600, fontSize: 15 }}>{it.name}</span>
                    <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink-faint)' }}>{it.role}</span>
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

function LpPricing({ c, onStart }) {
  const p = c.pricing;
  return (
    <section id="pricing" className="section" style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)' }}>
      <div className="wrap">
        <Reveal className="lp-section-head" style={{ textAlign: 'center', margin: '0 auto' }}>
          <Eyebrow style={{ justifyContent: 'center' }}>{p.eyebrow}</Eyebrow>
          <h2>{p.title}</h2>
          <p style={{ marginInline: 'auto' }}>{p.sub}</p>
        </Reveal>
        <div className="price-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 24, marginTop: 48, maxWidth: 880, marginInline: 'auto' }}>
          {p.plans.map((plan, i) => {
            const popular = i === 1;
            return (
              <Reveal key={i} delay={i * 110}>
                <div className="lp-plan-card" data-popular={popular ? 'true' : 'false'}>
                  {popular && <span className="lp-popular-badge">{p.popular}</span>}
                  <h3>{plan.name}</h3>
                  <p className="lp-plan-tagline">{plan.tagline}</p>
                  <div className="lp-plan-price">
                    <span className="amount">&euro;{plan.price}</span>
                    <span className="period">{p.perMonth}</span>
                  </div>
                  <button onClick={onStart} className={popular ? 'btn btn-white' : 'btn btn-dark'} style={{ width: '100%', marginTop: 24, padding: '15px 24px' }}>{p.cta}</button>
                  <ul className="lp-feature-list">
                    {plan.features.map((ft, j) => (
                      <li key={j} className={ft.on ? 'on' : 'off'}>
                        <span className="icon">{ft.on ? <Ico.check /> : <Ico.x />}</span>
                        <span>{ft.t}</span>
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

function LpFAQ({ c }) {
  const f = c.faq;
  const [open, setOpen] = useState(0);
  return (
    <section className="section">
      <div className="wrap" style={{ maxWidth: 820 }}>
        <Reveal className="lp-section-head" style={{ textAlign: 'center', margin: '0 auto 48px' }}>
          <Eyebrow style={{ justifyContent: 'center' }}>{f.eyebrow}</Eyebrow>
          <h2>{f.title}</h2>
        </Reveal>
        <div style={{ display: 'grid', gap: 12 }}>
          {f.items.map((it, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * 50}>
                <div className={`card lp-faq-item${isOpen ? ' open' : ''}`}>
                  <button onClick={() => setOpen(isOpen ? -1 : i)} className="lp-faq-q">
                    {it.q}
                    <span className="lp-faq-icon" style={{ transform: isOpen ? 'rotate(45deg)' : 'none' }}><Ico.plus /></span>
                  </button>
                  <div className="lp-faq-a" style={{ maxHeight: isOpen ? 200 : 0 }}>
                    <p>{it.a}</p>
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

function LpFinalCTA({ c, onStart }) {
  const f = c.finalCta;
  return (
    <section className="section" style={{ paddingBottom: 110 }}>
      <div className="wrap">
        <Reveal>
          <div className="lp-final-cta">
            <HexField opacity={0.2} color="%231ec8b6" style={{ maskImage: 'radial-gradient(80% 120% at 50% 0%, #000 25%, transparent 72%)', WebkitMaskImage: 'radial-gradient(80% 120% at 50% 0%, #000 25%, transparent 72%)' }} />
            <div style={{ position: 'relative' }}>
              <h2 style={{ color: '#fff', fontSize: 'clamp(30px,4.5vw,52px)', maxWidth: 700, margin: '0 auto' }}>{f.title}</h2>
              <p style={{ color: 'rgba(255,255,255,.78)', fontSize: 19, marginTop: 18, maxWidth: 520, marginInline: 'auto' }}>{f.sub}</p>
              <button onClick={onStart} className="btn btn-white" style={{ marginTop: 34, padding: '17px 34px', fontSize: 17 }}>{f.cta} <Ico.arrow /></button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function LpFooter({ c, lang, setLang }) {
  const f = c.footer;
  return (
    <footer style={{ background: 'var(--surface)', borderTop: '1px solid var(--line)', paddingTop: 64, paddingBottom: 40 }}>
      <div className="wrap">
        <div className="footer-grid" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 32 }}>
          <div>
            <LpLogo />
            <p style={{ color: 'var(--ink-soft)', fontSize: 15.5, marginTop: 16, maxWidth: 260 }}>{f.tagline}</p>
            <div style={{ marginTop: 20 }}><LangToggle lang={lang} setLang={setLang} /></div>
          </div>
          {f.cols.map((col, i) => (
            <div key={i}>
              <h4 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--ink-faint)', fontWeight: 700 }}>{f.colsTitle[i]}</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 0', display: 'grid', gap: 11 }}>
                {col.map((link, j) => (
                  <li key={j}><a href="#" style={{ fontSize: 15, color: 'var(--ink-soft)' }}>{link}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <p style={{ fontFamily: 'var(--mono)', fontSize: 12.5, color: 'var(--ink-faint)' }}>{f.rights}</p>
          <div style={{ display: 'flex', gap: 14, color: 'var(--ink-faint)' }}>
            {['in', 'ig', 'yt'].map((s) => (
              <a key={s} href="#" style={{ width: 34, height: 34, borderRadius: 999, border: '1.5px solid var(--line-strong)', display: 'grid', placeItems: 'center', fontFamily: 'var(--mono)', fontSize: 11, fontWeight: 700 }}>{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const navigate = useNavigate();
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('tk_lang') || 'hr'; } catch { return 'hr'; }
  });
  const [scrolled, setScrolled] = useState(false);
  const c = CONTENT[lang];

  useEffect(() => {
    try { localStorage.setItem('tk_lang', lang); } catch {}
  }, [lang]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const goLogin = () => navigate('/login');

  return (
    <div className="lp-root">
      <LpNav c={c} lang={lang} setLang={setLang} scrolled={scrolled} onLogin={goLogin} onStart={goLogin} />
      <main>
        <LpHero c={c} onStart={goLogin} />
        <LpTrust c={c} />
        <LpWhoFor c={c} onStart={goLogin} />
        <LpHow c={c} />
        <LpFeatures c={c} />
        <LpTeacher c={c} />
        <LpTestimonials c={c} />
        <LpPricing c={c} onStart={goLogin} />
        <LpFAQ c={c} />
        <LpFinalCTA c={c} onStart={goLogin} />
      </main>
      <LpFooter c={c} lang={lang} setLang={setLang} />
    </div>
  );
}
