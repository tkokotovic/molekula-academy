import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout, getMe } from '../api/client';

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ic = {
  students: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  revenue:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  content:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4z"/><path d="M18 7v13"/></svg>,
  questions:(p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 9a3 3 0 113.9 2.9c-.9.3-1.4 1-1.4 2.1"/><circle cx="11.5" cy="18" r=".6" fill="currentColor"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>,
  messages: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  menu:     (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  search:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  sun:      (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon:     (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>,
};

const NAV = [
  { to: '/admin/students',  label: 'Studenti',  icon: Ic.students  },
  { to: '/admin/revenue',   label: 'Prihodi',   icon: Ic.revenue   },
  { to: '/admin/content',   label: 'Sadržaj',   icon: Ic.content   },
  { to: '/admin/questions', label: 'Pitanja',   icon: Ic.questions },
  { to: '/admin/messages',  label: 'Poruke',    icon: Ic.messages  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ onNav }) {
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="side" style={{ width: 220 }}>
      {/* Logo */}
      <NavLink to="/admin/students" className="side-logo" onClick={onNav}>
        <span className="mk">
          <i style={{ position: 'absolute', inset: 0, clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', background: 'var(--accent)' }} />
          <span style={{ position: 'relative', color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, display: 'inline-block', transform: 'scaleX(1.35)' }}>M</span>
        </span>
        Molekula
      </NavLink>

      {/* Role badge */}
      <div style={{
        margin: '10px 8px 4px',
        padding: '5px 10px',
        borderRadius: 8,
        background: 'var(--accent-wash)',
        fontFamily: 'var(--mono)', fontSize: 10.5, fontWeight: 700,
        letterSpacing: '.1em', textTransform: 'uppercase',
        color: 'var(--accent-ink)',
      }}>
        Admin panel
      </div>

      {/* Nav */}
      <div className="side-nav">
        {NAV.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}
            onClick={onNav}
          >
            <Icon width={19} height={19} />
            {label}
          </NavLink>
        ))}
      </div>

      {/* Logout at bottom */}
      <div className="side-foot">
        <button
          onClick={handleLogout}
          className="side-link"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
          Odjava
        </button>
      </div>
    </nav>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ user, theme, setTheme, onMenu }) {
  const initials = user
    ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  return (
    <div className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu">
        <Ic.menu width={20} height={20} />
      </button>

      <div className="topbar-search">
        <Ic.search width={18} height={18} />
        <input placeholder="Pretraži studente, sadržaj…" />
      </div>

      <div style={{ flex: 1 }} />

      <button
        className="icon-btn"
        title={theme === 'dark' ? 'Svijetli način' : 'Tamni način'}
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Ic.sun width={18} height={18} /> : <Ic.moon width={18} height={18} />}
      </button>

      <div className="avatar-btn" style={{ cursor: 'default' }}>
        <span className="avatar-pic">{initials}</span>
        <span className="hide-sm">
          <span className="avatar-name">{user?.name ?? '…'}</span>
          <span className="avatar-plan" style={{ color: 'var(--accent-ink)' }}>Profesor</span>
        </span>
      </div>
    </div>
  );
}

// ─── TeacherShell ─────────────────────────────────────────────────────────────

export default function TeacherShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('mol_theme') || 'light');
  const [user, setUser]   = useState(null);

  useEffect(() => {
    localStorage.setItem('mol_theme', theme);
    document.documentElement.dataset.theme = theme;
    document.body.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    getMe().then(setUser).catch(() => {});
  }, []);

  return (
    <div className={'app' + (navOpen ? ' nav-open' : '')}>
      <Sidebar onNav={() => setNavOpen(false)} />

      <div className="nav-scrim" onClick={() => setNavOpen(false)} />

      <div>
        <Topbar
          user={user}
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
