import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { login, isAuthenticated, getToken } from '../api/client';
import { AuthShell, labelStyle, inputStyle } from './AuthShell.jsx';

function getRoleFromToken(token) {
  try { return JSON.parse(atob(token.split('.')[1])).role; } catch { return null; }
}

export default function LoginPage() {
  const navigate = useNavigate();
  if (isAuthenticated()) {
    const role = getRoleFromToken(getToken());
    return <Navigate to={role === 'teacher' || role === 'owner' ? '/admin' : '/courses'} replace />;
  }

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, token } = await login(email, password);
      const role = getRoleFromToken(token);
      if (role === 'teacher' || role === 'owner') {
        navigate('/admin');
      } else if (!user.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate('/courses');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Prijava u akademiju">
      <form onSubmit={handleSubmit}>
            <label style={labelStyle} htmlFor="email">E-mail</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="ime@email.com"
              required
              style={inputStyle}
            />

            <label style={{ ...labelStyle, marginTop: 18 }} htmlFor="password">Lozinka</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={inputStyle}
            />

            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <a href="/forgot-password" style={{ color: 'var(--accent)', fontSize: 13, textDecoration: 'none', fontWeight: 600 }}>
                Zaboravljena lozinka?
              </a>
            </div>

            {error && (
              <p role="alert" style={{ color: '#c0392b', fontSize: 14, marginTop: 12, marginBottom: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}
            >
              {loading ? 'Prijavljivanje…' : 'Prijava'}
            </button>
      </form>
    </AuthShell>
  );
}
