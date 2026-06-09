import { NavLink } from 'react-router-dom';
import { Icon } from './AppShell';

const NAV = [
  { to: '/admin/students', label: 'Studenti',  labelEn: 'Students',  icon: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg> },
  { to: '/admin/revenue',  label: 'Prihodi',   labelEn: 'Revenue',   icon: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg> },
  { to: '/admin/content',  label: 'Sadržaj',   labelEn: 'Content',   icon: Icon.book },
  { to: '/admin/messages', label: 'Poruke',    labelEn: 'Messages',  icon: (p) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg> },
];

export default function AdminShell({ children }) {
  const lang = localStorage.getItem('mol_lang') || 'hr';

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 64px)' }}>
      {/* Admin sidebar */}
      <nav style={{
        width: 200, flexShrink: 0,
        borderRight: '1px solid var(--line)',
        padding: '20px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.12em',
          textTransform: 'uppercase', color: 'var(--ink-soft)',
          padding: '4px 10px', marginBottom: 8,
        }}>
          Admin panel
        </div>

        {NAV.map(({ to, label, labelEn, icon: Ic }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', borderRadius: 8,
              fontSize: 13.5, fontWeight: 600, textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--ink-soft)',
              background: isActive ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'transparent',
              transition: 'background .15s, color .15s',
            })}
          >
            <Ic width={16} height={16} />
            {lang === 'en' ? labelEn : label}
          </NavLink>
        ))}
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
