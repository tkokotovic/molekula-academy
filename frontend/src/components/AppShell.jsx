import { useState, useEffect, useRef, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout, getMe, getStudentSessions, getNotifications, markNotificationRead, markAllNotificationsRead, searchStudentContent } from '../api/client';

// ─── Icons ───────────────────────────────────────────────────────────────────

const Icon = {
  home:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 10.5L12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/></svg>,
  book:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4z"/><path d="M18 7v13"/></svg>,
  chart:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>,
  quiz:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 9a3 3 0 113.9 2.9c-.9.3-1.4 1-1.4 2.1"/><circle cx="11.5" cy="18" r=".6" fill="currentColor"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>,
  cal:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  chat:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 5h16v11H8l-4 4V5z"/></svg>,
  hw:     (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M9 7h6M9 11h6M9 15h4"/></svg>,
  gear:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 14a1.6 1.6 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.6 1.6 0 00-2.7 1.1V22a2 2 0 11-4 0v-.2A1.6 1.6 0 005 20.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1A1.6 1.6 0 002.6 15H2.4a2 2 0 110-4h.2a1.6 1.6 0 001.1-2.7l-.1-.1a2 2 0 112.8-2.8l.1.1A1.6 1.6 0 009 4.6V4a2 2 0 114 0v.2a1.6 1.6 0 002.7 1.1l.1-.1a2 2 0 112.8 2.8l-.1.1A1.6 1.6 0 0019.4 11h.2a2 2 0 110 4h-.2z"/></svg>,
  search: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  bell:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>,
  sun:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>,
  menu:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  video:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10l5-3v10l-5-3"/></svg>,
  cards:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="2" y="6" width="14" height="14" rx="2"/><path d="M8 6V5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2h-1"/></svg>,
};

// ─── Logo mark ────────────────────────────────────────────────────────────────

function LogoMark() {
  return (
    <span className="mk">
      <i
        className="hex hex-accent"
        style={{
          position: 'absolute', inset: 0,
          clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
          background: 'var(--accent)',
        }}
      />
      <span style={{ position: 'relative', color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, display: 'inline-block', transform: 'scaleX(1.35)' }}>M</span>
    </span>
  );
}

// ─── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/dashboard',  label: 'Početna',  labelEn: 'Dashboard', Icon: Icon.home  },
  { to: '/courses',    label: 'Kolegiji', labelEn: 'Courses',   Icon: Icon.book  },
  { to: '/progress',   label: 'Napredak', labelEn: 'Progress',  Icon: Icon.chart },
  { to: '/quizzes',    label: 'Kvizovi',  labelEn: 'Quizzes',   Icon: Icon.quiz  },
  { to: '/flashcards', label: 'Kartice',  labelEn: 'Flashcards', Icon: Icon.cards },
  { to: '/schedule',   label: 'Raspored', labelEn: 'Schedule',  Icon: Icon.cal   },
  { to: '/messages',   label: 'Poruke',   labelEn: 'Messages',  Icon: Icon.chat  },
  { to: '/homeworks',  label: 'Zadaće',   labelEn: 'Homework',  Icon: Icon.hw    },
];

// ─── Sidebar ─────────────────────────────────────────────────────────────────

function Sidebar({ lang, onNav, nextSession }) {
  return (
    <nav className="side">
      {/* Logo */}
      <NavLink to="/" className="side-logo" onClick={onNav}>
        <LogoMark />
        Molekula
      </NavLink>

      {/* Nav links */}
      <div className="side-nav">
        {NAV_ITEMS.map(({ to, label, labelEn, Icon: Ic }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}
            onClick={onNav}
          >
            <Ic width={19} height={19} />
            {lang === 'en' ? labelEn : label}
          </NavLink>
        ))}

        <div className="side-sep" />

        <NavLink
          to="/settings"
          className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}
          onClick={onNav}
        >
          <Icon.gear width={19} height={19} />
          {lang === 'en' ? 'Settings' : 'Postavke'}
        </NavLink>
      </div>

      {/* Bottom zoom card */}
      <div className="side-foot">
        <div className="side-zoom-card">
          <h5>{lang === 'en' ? 'Next session' : 'Sljedeća sesija'}</h5>
          {nextSession ? (
            <>
              <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.9)', margin: '4px 0 2px', fontWeight: 600, lineHeight: 1.3 }}>
                {nextSession.title}
              </p>
              <p style={{ fontSize: 11.5, color: 'rgba(255,255,255,.6)', margin: '0 0 12px' }}>
                {new Date(nextSession.scheduled_at).toLocaleDateString('hr-HR', { day: '2-digit', month: 'short' })}
                {' · '}
                {new Date(nextSession.scheduled_at).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 12.5, color: 'rgba(255,255,255,.7)', margin: '4px 0 12px' }}>
              {lang === 'en' ? 'Not scheduled yet' : 'Nije zakazana'}
            </p>
          )}
          {nextSession?.zoom_url ? (
            <a
              href={nextSession.zoom_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn"
              style={{
                width: '100%', padding: '9px 14px', fontSize: 13, justifyContent: 'center',
                background: 'var(--accent-bright)', color: 'var(--deep)', border: 'none',
                fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <Icon.video width={15} height={15} />
              {lang === 'en' ? 'Join' : 'Pridruži se'}
            </a>
          ) : (
            <NavLink
              to="/schedule"
              className="btn"
              style={{
                width: '100%', padding: '9px 14px', fontSize: 13, justifyContent: 'center',
                background: 'var(--accent-bright)', color: 'var(--deep)', border: 'none',
                fontWeight: 700,
              }}
              onClick={onNav}
            >
              <Icon.video width={15} height={15} />
              {nextSession ? (lang === 'en' ? 'Schedule' : 'Raspored') : (lang === 'en' ? 'Book a session' : 'Zakaži sesiju')}
            </NavLink>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

// ─── NotifDropdown ────────────────────────────────────────────────────────────

function NotifDropdown({ lang }) {
  const [open,   setOpen]   = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setNotifs(data.notifications ?? []);
      setUnread(data.unread ?? 0);
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  async function handleClick(n) {
    if (!n.read_at) {
      await markNotificationRead(n.id);
      setNotifs(prev => prev.map(x => x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x));
      setUnread(u => Math.max(0, u - 1));
    }
    if (n.action_url) { setOpen(false); navigate(n.action_url); }
  }

  async function handleReadAll(e) {
    e.stopPropagation();
    await markAllNotificationsRead();
    setNotifs(prev => prev.map(x => ({ ...x, read_at: x.read_at ?? new Date().toISOString() })));
    setUnread(0);
  }

  function timeAgo(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)  return lang === 'en' ? 'just now'         : 'upravo';
    if (m < 60) return lang === 'en' ? `${m}m ago`        : `prije ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return lang === 'en' ? `${h}h ago`        : `prije ${h}h`;
    const d = Math.floor(h / 24);
    return lang === 'en' ? `${d}d ago` : `prije ${d}d`;
  }

  const TYPE_COLOUR = { session: '#6366f1', homework: '#f59e0b', quiz: '#1ec8b6', general: 'var(--accent)' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="icon-btn hide-sm"
        aria-label="Notifications"
        onClick={() => setOpen(o => !o)}
        style={{ position: 'relative' }}
      >
        <Icon.bell width={18} height={18} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: '#d6492f', border: '1.5px solid var(--surface)',
          }} />
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
          width: 340, maxHeight: 440, overflowY: 'auto',
          background: 'var(--surface)', border: '1.5px solid var(--line)',
          borderRadius: 14, boxShadow: '0 8px 32px rgba(0,0,0,.12)',
          zIndex: 9999,
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--line)',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
              {lang === 'en' ? 'Notifications' : 'Obavijesti'}
              {unread > 0 && (
                <span style={{
                  marginLeft: 8, padding: '1px 7px', borderRadius: 99,
                  background: '#d6492f', color: '#fff',
                  fontSize: 11, fontWeight: 700,
                }}>{unread}</span>
              )}
            </span>
            {unread > 0 && (
              <button
                onClick={handleReadAll}
                style={{
                  fontSize: 12, color: 'var(--accent-ink)', background: 'none',
                  border: 'none', cursor: 'pointer', padding: 0,
                }}
              >
                {lang === 'en' ? 'Mark all read' : 'Označi sve pročitanim'}
              </button>
            )}
          </div>

          {/* List */}
          {notifs.length === 0 ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13.5 }}>
              {lang === 'en' ? 'No notifications yet.' : 'Nema obavijesti.'}
            </div>
          ) : notifs.map(n => (
            <button
              key={n.id}
              onClick={() => handleClick(n)}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                width: '100%', padding: '12px 16px',
                background: n.read_at ? 'transparent' : 'color-mix(in srgb, var(--accent) 5%, transparent)',
                border: 'none', borderBottom: '1px solid var(--line)',
                cursor: 'pointer', textAlign: 'left',
                transition: 'background .1s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = n.read_at ? 'transparent' : 'color-mix(in srgb, var(--accent) 5%, transparent)'; }}
            >
              <div style={{
                width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                marginTop: 5,
                background: n.read_at ? 'var(--line)' : (TYPE_COLOUR[n.type] ?? 'var(--accent)'),
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: n.read_at ? 400 : 600, color: 'var(--ink)', marginBottom: 2 }}>
                  {lang === 'en' ? n.title_en : n.title_hr}
                </div>
                {(lang === 'en' ? n.body_en : n.body_hr) && (
                  <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', lineHeight: 1.4 }}>
                    {lang === 'en' ? n.body_en : n.body_hr}
                  </div>
                )}
                <div style={{ fontSize: 11, color: 'var(--ink-faint)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                  {timeAgo(n.created_at)}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function SearchBox({ lang }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef(null);
  const wrapRef  = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (query.length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const r = await searchStudentContent(query);
        setResults(r);
        setOpen(r.length > 0);
      } catch { /* ignore */ }
    }, 300);
  }, [query]);

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function pick(r) {
    setQuery(''); setResults([]); setOpen(false);
    navigate(`/lessons/${r.id}`);
  }

  return (
    <div className="topbar-search" ref={wrapRef} style={{ position: 'relative' }}>
      <Icon.search width={18} height={18} />
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder={lang === 'en' ? 'Search lessons…' : 'Pretraži lekcije…'}
      />
      {open && (
        <div className="search-dropdown">
          {results.map(r => (
            <button key={r.id} className="search-item" onMouseDown={() => pick(r)}>
              <span className="search-item-title">{r.title}</span>
              <span className="search-item-sub">{r.subtitle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Topbar({ user, lang, setLang, theme, setTheme, onMenu }) {
  const navigate  = useNavigate();
  const initials  = user
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';
  const planLabel = user?.subscription_tier === 'premium' ? 'Premium' : 'Basic';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <div className="topbar">
      {/* Mobile menu */}
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu">
        <Icon.menu width={20} height={20} />
      </button>

      {/* Search */}
      <SearchBox lang={lang} />

      <div style={{ flex: 1 }} />

      {/* Lang toggle */}
      <div className="lang-toggle hide-sm">
        {['hr', 'en'].map(L => (
          <button key={L} className={lang === L ? 'on' : ''} onClick={() => setLang(L)}>
            {L.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <button
        className="icon-btn"
        title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark'
          ? <Icon.sun  width={18} height={18} />
          : <Icon.moon width={18} height={18} />}
      </button>

      {/* Notifications */}
      <NotifDropdown lang={lang} />

      {/* Avatar / logout */}
      <button className="avatar-btn" onClick={handleLogout} title={lang === 'en' ? 'Log out' : 'Odjava'}>
        <span className="avatar-pic">{initials}</span>
        <span className="hide-sm">
          <span className="avatar-name">{user?.name ?? '…'}</span>
          <span className="avatar-plan">{planLabel}</span>
        </span>
      </button>
    </div>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [lang,    setLang]    = useState(() => localStorage.getItem('mol_lang') || 'hr');
  const [theme,   setTheme]   = useState(() => localStorage.getItem('mol_theme') || 'light');
  const [user,        setUser]        = useState(null);
  const [nextSession, setNextSession] = useState(null);

  // Persist lang
  useEffect(() => {
    localStorage.setItem('mol_lang', lang);
    document.documentElement.lang = lang;
  }, [lang]);

  // Persist + apply theme
  useEffect(() => {
    localStorage.setItem('mol_theme', theme);
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  // Load current user + next session
  useEffect(() => {
    getMe().then(u => {
      setUser(u);
      if (u.subscription_tier === 'premium') {
        getStudentSessions().then(sessions => {
          const now = new Date();
          const upcoming = sessions.filter(s => s.status === 'upcoming' && new Date(s.scheduled_at) > now);
          setNextSession(upcoming[0] ?? null);
        }).catch(() => {});
      }
    }).catch(() => {});
  }, []);

  function closeNav() { setNavOpen(false); }

  return (
    <div className={'app' + (navOpen ? ' nav-open' : '')}>
      <Sidebar lang={lang} onNav={closeNav} nextSession={nextSession} />

      {/* Mobile scrim */}
      <div className="nav-scrim" onClick={closeNav} />

      {/* Right column: topbar + page content */}
      <div>
        <Topbar
          user={user}
          lang={lang}
          setLang={setLang}
          theme={theme}
          setTheme={setTheme}
          onMenu={() => setNavOpen(o => !o)}
        />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}

// ─── Re-export icons for use in pages ────────────────────────────────────────
export { Icon };
