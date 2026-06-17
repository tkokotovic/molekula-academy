import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api/client';
import { AuthShell, labelStyle, inputStyle } from './AuthShell.jsx';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password.length < 8) { setError('Lozinka mora imati najmanje 8 znakova.'); return; }
    if (password !== confirm) { setError('Lozinke se ne podudaraju.'); return; }
    setLoading(true);
    try {
      const { user } = await resetPassword(token, password);
      const role = user?.role;
      navigate(role === 'teacher' || role === 'owner' ? '/admin' : '/courses');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <AuthShell subtitle="Promjena lozinke">
        <p style={{ color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
          Poveznica je nevažeća. Zatraži novu na stranici za promjenu lozinke.
        </p>
        <a href="/forgot-password" className="btn btn-primary"
          style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}>
          Zatraži novu poveznicu
        </a>
      </AuthShell>
    );
  }

  return (
    <AuthShell subtitle="Postavi novu lozinku">
      <form onSubmit={handleSubmit}>
        <label style={labelStyle} htmlFor="password">Nova lozinka</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Najmanje 8 znakova"
          required
          style={inputStyle}
        />

        <label style={{ ...labelStyle, marginTop: 18 }} htmlFor="confirm">Ponovi lozinku</label>
        <input
          id="confirm"
          type="password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder="••••••••"
          required
          style={inputStyle}
        />

        {error && (
          <p role="alert" style={{ color: '#c0392b', fontSize: 14, marginTop: 12, marginBottom: 0 }}>
            {error}
          </p>
        )}

        <button type="submit" disabled={loading} className="btn btn-primary"
          style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}>
          {loading ? 'Spremanje…' : 'Spremi lozinku'}
        </button>
      </form>
    </AuthShell>
  );
}
