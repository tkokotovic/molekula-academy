import { useState } from 'react';
import { requestPasswordReset } from '../api/client';
import { AuthShell, labelStyle, inputStyle } from './AuthShell.jsx';

export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await requestPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Promjena lozinke">
      {sent ? (
        <div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 19, color: 'var(--ink)', margin: '0 0 10px' }}>
            Provjeri svoj email
          </h2>
          <p style={{ color: 'var(--ink-soft)', fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            Ako račun s tom adresom postoji, poslali smo poveznicu za promjenu lozinke.
            Poveznica vrijedi 60 minuta.
          </p>
          <a href="/login" className="btn btn-primary" style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}>
            Natrag na prijavu
          </a>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6, marginTop: 0, marginBottom: 20 }}>
            Unesi email adresu računa i poslat ćemo ti poveznicu za postavljanje nove lozinke.
          </p>
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

          {error && (
            <p role="alert" style={{ color: '#c0392b', fontSize: 14, marginTop: 12, marginBottom: 0 }}>
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn btn-primary"
            style={{ width: '100%', marginTop: 24, justifyContent: 'center' }}>
            {loading ? 'Slanje…' : 'Pošalji poveznicu'}
          </button>

          <p style={{ textAlign: 'center', marginTop: 16, marginBottom: 0 }}>
            <a href="/login" style={{ color: 'var(--ink-soft)', fontSize: 13, textDecoration: 'none' }}>
              Natrag na prijavu
            </a>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
