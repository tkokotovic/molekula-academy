/* Molekula Academy — dashboard data (bilingual HR / EN) */
window.APP = {
  hr: {
    nav: { dashboard: "Naslovna", courses: "Moji tečajevi", progress: "Napredak", quizzes: "Kvizovi", schedule: "Raspored", messages: "Poruke", settings: "Postavke", logout: "Odjava" },
    topbar: { search: "Pretraži lekcije, teme…", upgrade: "Premium" },
    student: { name: "Marta Kovač", plan: "Premium", track: "IB Kemija HL", greetingAm: "Dobro jutro", greetingPm: "Dobar dan", sub: "Spremna za nastavak? Imaš 3 lekcije ovaj tjedan." },

    continue: {
      label: "Nastavi gdje si stala",
      course: "IB Kemija HL",
      topic: "Organska kemija",
      lesson: "Reakcije alkohola — oksidacija",
      progress: 62,
      meta: "Lekcija 8 od 12 · preostalo ~15 min",
      cta: "Nastavi lekciju",
    },

    coursesCard: {
      label: "Moji tečajevi",
      all: "Svi tečajevi",
      items: [
        { tag: "IB", name: "IB Kemija HL", done: 41, total: 64, pct: 64, color: "accent" },
        { tag: "Rx", name: "Prijemni — Medicina", done: 12, total: 40, pct: 30, color: "deep" },
        { tag: "Or", name: "Organska kemija", done: 18, total: 22, pct: 82, color: "bright" },
      ],
      lessonsUnit: "lekcija",
    },

    statsCard: {
      label: "Tvoj napredak",
      sub: "Rezultati kvizova, zadnjih 8 tjedana",
      avg: "Prosjek", avgVal: "84%",
      streak: "Niz", streakVal: "12 dana",
      mastered: "Savladano", masteredVal: "31 tema",
      bars: [62, 70, 58, 74, 80, 76, 88, 84],
      topics: [
        { name: "Atomska struktura", pct: 92 },
        { name: "Stehiometrija", pct: 88 },
        { name: "Organska kemija", pct: 71 },
        { name: "Termodinamika", pct: 54 },
      ],
      strong: "Najjača tema", weak: "Za poraditi",
    },

    zoomCard: {
      label: "Sljedeća live sesija",
      date: "Čet, 12. lipnja",
      time: "17:00 – 17:45",
      topic: "Priprema za Paper 2 — energetika",
      with: "s Tomislavom",
      cta: "Pridruži se",
      reschedule: "Promijeni termin",
      badge: "Premium",
    },

    quizCard: {
      label: "Nedavni kvizovi",
      all: "Svi rezultati",
      items: [
        { topic: "Kemijska kinetika", score: 90, total: 10, correct: 9, when: "jučer" },
        { topic: "Ravnoteža", score: 70, total: 10, correct: 7, when: "prije 3 dana" },
        { topic: "Kiseline i baze", score: 100, total: 8, correct: 8, when: "prošli tjedan" },
      ],
      retake: "Ponovi",
    },

    deadlines: {
      label: "Rokovi",
      items: [
        { title: "IA — prva verzija", due: "za 5 dana", urgent: true },
        { title: "Kviz: Termodinamika", due: "za 1 tjedan", urgent: false },
      ],
    },

    // ----- LESSON PAGE -----
    lesson: {
      breadcrumb: ["IB Kemija HL", "Organska kemija"],
      title: "Reakcije alkohola — oksidacija",
      meta: "Lekcija 8 od 12 · ~15 min čitanja",
      videoLabel: "video lekcija",
      videoDur: "8:24",
      progressLabel: "Tvoj napredak u temi",
      sections: [
        { h: "Što se događa pri oksidaciji alkohola?", p: "Primarni alkoholi oksidiraju se najprije u aldehide, a zatim u karboksilne kiseline. Sekundarni alkoholi daju ketone, dok tercijarni alkoholi u pravilu ne oksidiraju jer nemaju vodik na ugljiku koji nosi hidroksilnu skupinu." },
        { h: "Reagensi koje moraš znati", p: "Najčešći oksidans je zakiseljena otopina kalijeva dikromata (VI), K₂Cr₂O₇ / H₂SO₄. Promjena boje iz narančaste u zelenu klasičan je znak da je oksidacija tekla — čest detalj u Paper 2 pitanjima." },
      ],
      keypointTitle: "Ključno za ispit",
      keypoint: "Razlikuj uvjete: destilacija zaustavlja reakciju na aldehidu, dok refluks vodi do karboksilne kiseline.",
      eq: "primarni alkohol → aldehid → karboksilna kiselina",
      prev: "Prethodna", next: "Sljedeća lekcija", toQuiz: "Riješi kviz teme",
      outlineLabel: "Lekcije u temi",
      outline: [
        { n: 1, t: "Uvod u alkohole", done: true },
        { n: 2, t: "Nomenklatura", done: true },
        { n: 3, t: "Fizikalna svojstva", done: true },
        { n: 4, t: "Vodikove veze", done: true },
        { n: 5, t: "Sinteza alkohola", done: true },
        { n: 6, t: "Reakcije supstitucije", done: true },
        { n: 7, t: "Dehidratacija", done: true },
        { n: 8, t: "Oksidacija alkohola", done: false, current: true },
        { n: 9, t: "Esterifikacija", done: false },
        { n: 10, t: "Halogenalkani", done: false },
        { n: 11, t: "Ponavljanje", done: false },
        { n: 12, t: "Završni kviz", done: false },
      ],
    },

    // ----- QUIZ -----
    quiz: {
      title: "Kviz: Oksidacija alkohola",
      sub: "5 pitanja · bez vremenskog ograničenja",
      qLabel: "Pitanje",
      ofLabel: "od",
      submit: "Provjeri odgovor",
      nextQ: "Sljedeće pitanje",
      finish: "Završi kviz",
      correct: "Točno!",
      incorrect: "Nije točno",
      explain: "Objašnjenje",
      questions: [
        {
          q: "U što se najprije oksidira primarni alkohol?",
          options: ["Keton", "Aldehid", "Karboksilna kiselina", "Eter"],
          answer: 1,
          explain: "Primarni alkoholi prvo daju aldehid; daljnjom oksidacijom nastaje karboksilna kiselina.",
        },
        {
          q: "Koji se reagens najčešće koristi za oksidaciju alkohola?",
          options: ["NaOH", "Zakiseljeni K₂Cr₂O₇", "HCl", "NaCl"],
          answer: 1,
          explain: "Zakiseljeni kalijev dikromat (VI) standardni je oksidans; boja se mijenja iz narančaste u zelenu.",
        },
        {
          q: "Zašto tercijarni alkoholi u pravilu ne oksidiraju?",
          options: ["Pretežak su spoj", "Nemaju H na C s OH skupinom", "Otapaju se u vodi", "Nestabilni su"],
          answer: 1,
          explain: "Bez vodika na ugljiku koji nosi OH skupinu, nema mogućnosti za uobičajenu oksidaciju.",
        },
        {
          q: "Koji uvjet zaustavlja reakciju na aldehidu?",
          options: ["Refluks", "Destilacija", "Hlađenje na ledu", "Dodatak baze"],
          answer: 1,
          explain: "Destilacijom se aldehid uklanja iz smjese prije daljnje oksidacije u kiselinu.",
        },
        {
          q: "Sekundarni alkohol oksidacijom daje:",
          options: ["Aldehid", "Keton", "Karboksilnu kiselinu", "Ester"],
          answer: 1,
          explain: "Sekundarni alkoholi oksidiraju do ketona i tu se reakcija u pravilu zaustavlja.",
        },
      ],
      results: {
        title: "Kviz završen!",
        scoreLabel: "Tvoj rezultat",
        great: "Odličan rezultat — tema savladana.",
        good: "Dobar posao! Ponovi pokoje pitanje za sigurnost.",
        keepGoing: "Ne odustaj — pregledaj objašnjenja i pokušaj ponovno.",
        review: "Pregledaj odgovore",
        retake: "Ponovi kviz",
        back: "Natrag na lekciju",
        correctOf: "točnih odgovora",
      },
    },
  },

  en: {
    nav: { dashboard: "Home", courses: "My courses", progress: "Progress", quizzes: "Quizzes", schedule: "Schedule", messages: "Messages", settings: "Settings", logout: "Log out" },
    topbar: { search: "Search lessons, topics…", upgrade: "Premium" },
    student: { name: "Marta Kovač", plan: "Premium", track: "IB Chemistry HL", greetingAm: "Good morning", greetingPm: "Good afternoon", sub: "Ready to continue? You have 3 lessons this week." },

    continue: {
      label: "Pick up where you left off",
      course: "IB Chemistry HL",
      topic: "Organic chemistry",
      lesson: "Reactions of alcohols — oxidation",
      progress: 62,
      meta: "Lesson 8 of 12 · ~15 min left",
      cta: "Resume lesson",
    },

    coursesCard: {
      label: "My courses",
      all: "All courses",
      items: [
        { tag: "IB", name: "IB Chemistry HL", done: 41, total: 64, pct: 64, color: "accent" },
        { tag: "Rx", name: "Entrance — Medicine", done: 12, total: 40, pct: 30, color: "deep" },
        { tag: "Or", name: "Organic chemistry", done: 18, total: 22, pct: 82, color: "bright" },
      ],
      lessonsUnit: "lessons",
    },

    statsCard: {
      label: "Your progress",
      sub: "Quiz scores, last 8 weeks",
      avg: "Average", avgVal: "84%",
      streak: "Streak", streakVal: "12 days",
      mastered: "Mastered", masteredVal: "31 topics",
      bars: [62, 70, 58, 74, 80, 76, 88, 84],
      topics: [
        { name: "Atomic structure", pct: 92 },
        { name: "Stoichiometry", pct: 88 },
        { name: "Organic chemistry", pct: 71 },
        { name: "Thermodynamics", pct: 54 },
      ],
      strong: "Strongest topic", weak: "Needs work",
    },

    zoomCard: {
      label: "Next live session",
      date: "Thu, June 12",
      time: "5:00 – 5:45 PM",
      topic: "Paper 2 prep — energetics",
      with: "with Tomislav",
      cta: "Join session",
      reschedule: "Reschedule",
      badge: "Premium",
    },

    quizCard: {
      label: "Recent quizzes",
      all: "All results",
      items: [
        { topic: "Chemical kinetics", score: 90, total: 10, correct: 9, when: "yesterday" },
        { topic: "Equilibrium", score: 70, total: 10, correct: 7, when: "3 days ago" },
        { topic: "Acids & bases", score: 100, total: 8, correct: 8, when: "last week" },
      ],
      retake: "Retake",
    },

    deadlines: {
      label: "Deadlines",
      items: [
        { title: "IA — first draft", due: "in 5 days", urgent: true },
        { title: "Quiz: Thermodynamics", due: "in 1 week", urgent: false },
      ],
    },

    lesson: {
      breadcrumb: ["IB Chemistry HL", "Organic chemistry"],
      title: "Reactions of alcohols — oxidation",
      meta: "Lesson 8 of 12 · ~15 min read",
      videoLabel: "video lesson",
      videoDur: "8:24",
      progressLabel: "Your progress in this topic",
      sections: [
        { h: "What happens when an alcohol is oxidised?", p: "Primary alcohols oxidise first to aldehydes, then to carboxylic acids. Secondary alcohols give ketones, while tertiary alcohols generally don't oxidise — they have no hydrogen on the carbon bearing the hydroxyl group." },
        { h: "Reagents you need to know", p: "The most common oxidising agent is acidified potassium dichromate(VI), K₂Cr₂O₇ / H₂SO₄. The orange-to-green colour change is the classic sign that oxidation has occurred — a frequent detail in Paper 2 questions." },
      ],
      keypointTitle: "Exam-critical",
      keypoint: "Distinguish the conditions: distillation stops the reaction at the aldehyde, while reflux drives it to the carboxylic acid.",
      eq: "primary alcohol → aldehyde → carboxylic acid",
      prev: "Previous", next: "Next lesson", toQuiz: "Take the topic quiz",
      outlineLabel: "Lessons in this topic",
      outline: [
        { n: 1, t: "Intro to alcohols", done: true },
        { n: 2, t: "Nomenclature", done: true },
        { n: 3, t: "Physical properties", done: true },
        { n: 4, t: "Hydrogen bonding", done: true },
        { n: 5, t: "Synthesis of alcohols", done: true },
        { n: 6, t: "Substitution reactions", done: true },
        { n: 7, t: "Dehydration", done: true },
        { n: 8, t: "Oxidation of alcohols", done: false, current: true },
        { n: 9, t: "Esterification", done: false },
        { n: 10, t: "Haloalkanes", done: false },
        { n: 11, t: "Review", done: false },
        { n: 12, t: "Final quiz", done: false },
      ],
    },

    quiz: {
      title: "Quiz: Oxidation of alcohols",
      sub: "5 questions · no time limit",
      qLabel: "Question",
      ofLabel: "of",
      submit: "Check answer",
      nextQ: "Next question",
      finish: "Finish quiz",
      correct: "Correct!",
      incorrect: "Not quite",
      explain: "Explanation",
      questions: [
        {
          q: "What does a primary alcohol oxidise to first?",
          options: ["Ketone", "Aldehyde", "Carboxylic acid", "Ether"],
          answer: 1,
          explain: "Primary alcohols give an aldehyde first; further oxidation produces a carboxylic acid.",
        },
        {
          q: "Which reagent is most commonly used to oxidise alcohols?",
          options: ["NaOH", "Acidified K₂Cr₂O₇", "HCl", "NaCl"],
          answer: 1,
          explain: "Acidified potassium dichromate(VI) is the standard oxidant; colour changes orange to green.",
        },
        {
          q: "Why do tertiary alcohols generally not oxidise?",
          options: ["Too heavy", "No H on the C bearing the OH group", "They dissolve in water", "They're unstable"],
          answer: 1,
          explain: "With no hydrogen on the carbon carrying the OH group, ordinary oxidation can't occur.",
        },
        {
          q: "Which condition stops the reaction at the aldehyde?",
          options: ["Reflux", "Distillation", "Cooling on ice", "Adding a base"],
          answer: 1,
          explain: "Distillation removes the aldehyde from the mixture before further oxidation to the acid.",
        },
        {
          q: "A secondary alcohol oxidises to give a:",
          options: ["Aldehyde", "Ketone", "Carboxylic acid", "Ester"],
          answer: 1,
          explain: "Secondary alcohols oxidise to ketones and the reaction generally stops there.",
        },
      ],
      results: {
        title: "Quiz complete!",
        scoreLabel: "Your score",
        great: "Excellent — topic mastered.",
        good: "Good work! Review a couple of questions to be sure.",
        keepGoing: "Keep going — review the explanations and try again.",
        review: "Review answers",
        retake: "Retake quiz",
        back: "Back to lesson",
        correctOf: "correct",
      },
    },
  },
};
