import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { logout, getMe } from '../api/client';

// ─── Icons ────────────────────────────────────────────────────────────────────

const Ic = {
  dashboard:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  students:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>,
  groups:     (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75M21 21v-2a4 4 0 00-3-3.87"/></svg>,
  courses:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M4 4h11a3 3 0 013 3v13H7a3 3 0 01-3-3V4z"/><path d="M18 7v13"/></svg>,
  questions:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 9a3 3 0 113.9 2.9c-.9.3-1.4 1-1.4 2.1"/><circle cx="11.5" cy="18" r=".6" fill="currentColor"/><rect x="3" y="3" width="18" height="18" rx="4"/></svg>,
  homeworks:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  messages:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>,
  broadcasts: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M22 8.5c0 2.5-1.2 4.7-3 6.1"/><path d="M2 8.5c0 2.5 1.2 4.7 3 6.1"/><path d="M18 8.5a6 6 0 10-12 0"/><circle cx="12" cy="8.5" r="2"/><path d="M12 10.5v5"/><path d="M10 19h4"/></svg>,
  sessions:   (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 9h18M8 3v4M16 3v4"/></svg>,
  revenue:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
  reports:    (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/></svg>,
  chemtools:  (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 3v7l-4 7a2 2 0 001.8 3h10.4a2 2 0 001.8-3l-4-7V3"/><path d="M6 3h12"/></svg>,
  menu:       (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" {...p}><path d="M3 6h18M3 12h18M3 18h18"/></svg>,
  search:     (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></svg>,
  sun:        (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>,
  moon:       (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>,
  bell:       (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 01-3.4 0"/></svg>,
  logout:     (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
};

// ─── Nav groups ───────────────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Pregled',
    items: [
      { to: '/admin/dashboard', label: 'Nadzorna ploča', icon: Ic.dashboard },
    ],
  },
  {
    label: 'Studenti',
    items: [
      { to: '/admin/students',  label: 'Svi studenti',  icon: Ic.students  },
      { to: '/admin/groups',    label: 'Grupe',          icon: Ic.groups    },
    ],
  },
  {
    label: 'Sadržaj',
    items: [
      { to: '/admin/courses',    label: 'Kolegiji i lekcije', icon: Ic.courses   },
      { to: '/admin/questions',  label: 'Baza pitanja',        icon: Ic.questions },
      { to: '/admin/homeworks',  label: 'Domaće zadaće',       icon: Ic.homeworks },
      { to: '/admin/chem-tools', label: 'Kemijski alati',      icon: Ic.chemtools },
    ],
  },
  {
    label: 'Komunikacija',
    items: [
      { to: '/admin/messages',   label: 'Poruke',       icon: Ic.messages   },
      { to: '/admin/broadcasts', label: 'Obavijesti',   icon: Ic.broadcasts },
      { to: '/admin/sessions',   label: 'Sesije',       icon: Ic.sessions   },
    ],
  },
  {
    label: 'Poslovanje',
    items: [
      { to: '/admin/revenue', label: 'Prihodi',  icon: Ic.revenue },
      { to: '/admin/reports', label: 'Izvještaji', icon: Ic.reports },
    ],
  },
];

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ onNav, user }) {
  const navigate = useNavigate();
  const initials = user ? user.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <nav className="side" style={{ width: 228 }}>
      {/* Logo */}
      <NavLink to="/" className="side-logo" onClick={onNav}>
        <span className="mk">
          <i style={{ position: 'absolute', inset: 0, clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)', background: 'var(--accent)' }} />
          <span style={{ position: 'relative', color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 14, display: 'inline-block', transform: 'scaleX(1.35)' }}>M</span>
        </span>
        Molekula
      </NavLink>

      {/* Role badge */}
      <div style={{
        margin: '8px 10px 6px',
        padding: '5px 10px',
        borderRadius: 8,
        background: 'var(--accent-wash)',
        fontFamily: 'var(--mono)', fontSize: 10, fontWeight: 700,
        letterSpacing: '.1em', textTransform: 'uppercase',
        color: 'var(--accent-ink)',
      }}>
        Admin panel
      </div>

      {/* Nav groups */}
      <div className="side-nav" style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
        {NAV_GROUPS.map(({ label, items }) => (
          <div key={label} style={{ marginBottom: 4 }}>
            <div style={{
              padding: '10px 12px 4px',
              fontSize: 10, fontWeight: 700,
              letterSpacing: '.1em', textTransform: 'uppercase',
              color: 'var(--ink-faint, color-mix(in srgb, var(--ink-soft) 60%, transparent))',
              fontFamily: 'var(--mono)',
            }}>
              {label}
            </div>
            {items.map(({ to, label: lbl, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) => 'side-link' + (isActive ? ' active' : '')}
                onClick={onNav}
              >
                <Icon width={17} height={17} />
                {lbl}
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* Teacher profile + logout at bottom */}
      <div className="side-foot" style={{ borderTop: '1px solid var(--line)', padding: '10px 10px 8px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '6px 8px', borderRadius: 8,
          marginBottom: 4,
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
            background: 'var(--accent-wash)', color: 'var(--accent-ink)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 11,
          }}>
            {initials}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name ?? '…'}
            </div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-soft)', fontFamily: 'var(--mono)' }}>Profesor</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="side-link"
          style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}
        >
          <Ic.logout width={16} height={16} />
          Odjava
        </button>
      </div>
    </nav>
  );
}

// ─── Topbar ───────────────────────────────────────────────────────────────────

function Topbar({ theme, setTheme, onMenu, notifCount }) {
  return (
    <div className="topbar">
      <button className="icon-btn menu-btn" onClick={onMenu} aria-label="Menu">
        <Ic.menu width={20} height={20} />
      </button>

      <div className="topbar-search">
        <Ic.search width={18} height={18} />
        <input placeholder="Pretraži studente, sadržaj, pitanja…" />
      </div>

      <div style={{ flex: 1 }} />

      <button
        className="icon-btn"
        title={theme === 'dark' ? 'Svijetli način' : 'Tamni način'}
        onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Ic.sun width={18} height={18} /> : <Ic.moon width={18} height={18} />}
      </button>

      <button className="icon-btn" aria-label="Obavijesti" style={{ position: 'relative' }}>
        <Ic.bell width={18} height={18} />
        {notifCount > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--accent)', border: '2px solid var(--surface)',
          }} />
        )}
      </button>
    </div>
  );
}

// ─── TeacherShell ─────────────────────────────────────────────────────────────

export default function TeacherShell({ children }) {
  const [navOpen, setNavOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('mol_theme') || 'light');
  const [user, setUser] = useState(null);

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
      <Sidebar onNav={() => setNavOpen(false)} user={user} />
      <div className="nav-scrim" onClick={() => setNavOpen(false)} />
      <div>
        <Topbar
          theme={theme}
          setTheme={setTheme}
          onMenu={() => setNavOpen(o => !o)}
          notifCount={0}
        />
        <main className="content">
          {children}
        </main>
      </div>
    </div>
  );
}
