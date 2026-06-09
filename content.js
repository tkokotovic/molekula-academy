/* Molekula Academy — bilingual content (HR primary, EN secondary) */
window.CONTENT = {
  hr: {
    nav: { home: "Početna", about: "O nama", blog: "Blog", pricing: "Cijene", login: "Prijava", start: "Počni besplatno" },

    hero: {
      eyebrow: "Online akademija kemije",
      title: "Kemija objašnjena tako da konačno ima smisla.",
      sub: "Strukturirane lekcije, kvizovi i live podrška za IB, prijemni ispit za medicinu i stomatologiju. Vodi te netko tko je bio na tvom mjestu.",
      ctaPrimary: "Počni besplatno",
      ctaSecondary: "Pogledaj planove",
      note: "Bez kartice za probni period · Otkaži bilo kada",
      eqCaption: "Stehiometrija · izjednačavanje reakcije",
      photoLabel: "fotografija učenika / lab",
    },

    trust: {
      label: "Vjeruju nam učenici diljem Hrvatske",
      stats: [
        { num: "50+", label: "aktivnih učenika" },
        { num: "95%", label: "prolaznost na ispitima" },
        { num: "4.9/5", label: "prosječna ocjena" },
        { num: "od 2008.", label: "iskustva u podučavanju" },
      ],
      tags: ["IB Diploma", "Medicinski fakultet", "Stomatološki fakultet", "Prijemni ispiti"],
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
        "Od 2008. pripremam studente medicine i stomatologije za ispite. Zadnjih 5 godina radim i s IB učenicima. Molekula Academy izgrađena je na tom iskustvu — solidni temelji, prava vježba za ispit i klinička perspektiva liječnika koji to znanje koristi svaki dan. Bez nabubanih definicija. Bez \"jer je tako\".",
      ],
      creds: ["dr. med.", "15+ godina iskustva", "200+ podučavanih učenika", "IB & prijemni specijalist"],
      photoLabel: "fotografija profesora",
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
      note: "Besplatno prvi tjedan &middot; Otkaži kad god",
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
    nav: { home: "Home", about: "About", blog: "Blog", pricing: "Pricing", login: "Log in", start: "Start free" },

    hero: {
      eyebrow: "Online chemistry academy",
      title: "Chemistry explained so it finally makes sense.",
      sub: "Structured lessons, quizzes, and live tutoring for IB and the medical & dental entrance exam. Guided by someone who's been in your seat.",
      ctaPrimary: "Start for free",
      ctaSecondary: "See plans",
      note: "No card for the trial · Cancel anytime",
      eqCaption: "Stoichiometry · balancing the equation",
      photoLabel: "student / lab photo",
    },

    trust: {
      label: "Trusted by students across Croatia",
      stats: [
        { num: "50+", label: "active students" },
        { num: "95%", label: "exam pass rate" },
        { num: "4.9/5", label: "average rating" },
        { num: "since 2008", label: "teaching experience" },
      ],
      tags: ["IB Diploma", "Medical School", "Dental School", "Entrance Exams"],
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
        "I am a practicing physician who has been teaching chemistry for over 15 years. I sat the same entrance exam your students are preparing for. I passed medical chemistry, biochemistry, clinical chemistry, and a range of specialist electives at Medical School. I know exactly what is tested, where students lose marks, and what is worth understanding deeply versus what you can safely deprioritise.",
        "Since 2008 I have been preparing medical and dentistry students for their exams. For the past 5 years I have also worked with IB Chemistry students. Molekula Academy is built on that experience — solid theoretical foundations, real exam practice, and the clinical perspective of a physician who still uses this knowledge every day. No memorised definitions. No \"because that's how it is\".",
      ],
      creds: ["MD", "15+ years experience", "200+ students taught", "IB & entrance specialist"],
      photoLabel: "teacher photo",
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
      note: "First week free &middot; Cancel anytime",
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
