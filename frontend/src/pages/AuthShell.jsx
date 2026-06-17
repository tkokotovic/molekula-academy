// Shared chrome for the auth pages (Login, ForgotPassword, ResetPassword):
// centered logo + card + footer. Kept in its own module so each page file
// only default-exports a component (required for React Fast Refresh / HMR).

export function AuthShell({ subtitle, children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--bg)',
      padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            fontFamily: 'var(--display)', fontWeight: 800, fontSize: 26,
            letterSpacing: '-0.03em', color: 'var(--ink)',
          }}>
            <span style={{ width: 34, height: 38, position: 'relative', display: 'inline-grid', placeItems: 'center' }}>
              <span style={{
                position: 'absolute', inset: 0,
                clipPath: 'polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)',
                background: 'var(--accent)',
              }} />
              <span style={{ position: 'relative', color: '#fff', fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15 }}>M</span>
            </span>
            Molekula
          </span>
          {subtitle && (
            <p style={{ color: 'var(--ink-soft)', fontSize: 15, marginTop: 8 }}>{subtitle}</p>
          )}
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--line)',
          borderRadius: 'var(--radius)',
          padding: '36px 32px',
          boxShadow: 'var(--shadow-card)',
        }}>
          {children}
        </div>

        <p style={{ textAlign: 'center', color: 'var(--ink-faint)', fontSize: 13, marginTop: 24 }}>
          Molekula Academy &middot; © 2026 &middot;{' '}
          <a href="/privacy" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>Privatnost</a>
          {' '}&middot;{' '}
          <a href="/terms" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>Uvjeti</a>
        </p>
      </div>
    </div>
  );
}

export const labelStyle = {
  display: 'block',
  fontWeight: 600,
  fontSize: 14,
  color: 'var(--ink)',
  marginBottom: 6,
};

export const inputStyle = {
  width: '100%',
  padding: '11px 14px',
  borderRadius: 'var(--radius-sm)',
  border: '1.5px solid var(--line-strong)',
  fontSize: 15,
  fontFamily: 'var(--body)',
  color: 'var(--ink)',
  background: 'var(--bg)',
  outline: 'none',
  boxSizing: 'border-box',
};
