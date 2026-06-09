import { useState, useEffect } from 'react';
import { getMe, updateProfile, logout } from '../api/client';
import { useNavigate } from 'react-router-dom';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 14, overflow: 'hidden', marginBottom: 20,
    }}>
      <div style={{
        padding: '14px 20px', borderBottom: '1px solid var(--line)',
        fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.08em',
        textTransform: 'uppercase', color: 'var(--ink-soft)',
      }}>
        {title}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, type = 'text', placeholder, disabled }) {
  const [focused, setFocused] = useState(false);
  return (
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={{
        width: '100%', boxSizing: 'border-box',
        padding: '10px 14px', borderRadius: 9,
        border: `1px solid ${focused ? 'var(--accent)' : 'var(--line)'}`,
        background: disabled ? 'var(--bg)' : 'var(--surface)',
        color: disabled ? 'var(--ink-soft)' : 'var(--ink)',
        fontFamily: 'var(--sans)', fontSize: 14,
        outline: 'none', transition: 'border-color .15s',
      }}
    />
  );
}

function SaveButton({ loading, label }) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        padding: '10px 22px', borderRadius: 9,
        background: 'var(--accent)', color: '#fff',
        fontWeight: 700, fontSize: 14, border: 'none',
        cursor: loading ? 'default' : 'pointer',
        opacity: loading ? .6 : 1, transition: 'opacity .15s',
      }}
    >
      {loading ? '…' : label}
    </button>
  );
}

function StatusBanner({ type, message }) {
  if (!message) return null;
  const colours = {
    success: { bg: 'color-mix(in srgb, #1ec8b6 12%, transparent)', border: 'color-mix(in srgb, #1ec8b6 30%, transparent)', text: '#0a7a6e' },
    error:   { bg: 'color-mix(in srgb, #d6492f 10%, transparent)', border: 'color-mix(in srgb, #d6492f 25%, transparent)', text: '#b83820' },
  };
  const c = colours[type] || colours.error;
  return (
    <div style={{
      padding: '10px 14px', borderRadius: 8, marginBottom: 16,
      background: c.bg, border: `1px solid ${c.border}`,
      fontSize: 13.5, color: c.text,
    }}>
      {message}
    </div>
  );
}

// ─── Profile section ──────────────────────────────────────────────────────────

function ProfileSection({ user, onUpdate, t }) {
  const [name,    setName]    = useState(user.name);
  const [email,   setEmail]   = useState(user.email);
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const updated = await updateProfile({ name, email });
      onUpdate(updated);
      setStatus({ type: 'success', message: t('Profil uspješno ažuriran.', 'Profile updated successfully.') });
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title={t('Profil', 'Profile')}>
      <form onSubmit={handleSubmit}>
        <StatusBanner {...(status || {})} />
        <Field label={t('Ime i prezime', 'Full name')}>
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ana Kovači" />
        </Field>
        <Field label="E-mail">
          <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="ana@email.com" />
        </Field>
        <SaveButton loading={loading} label={t('Spremi promjene', 'Save changes')} />
      </form>
    </Section>
  );
}

// ─── Password section ─────────────────────────────────────────────────────────

function PasswordSection({ t }) {
  const [current, setCurrent] = useState('');
  const [next,    setNext]    = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [status,  setStatus]  = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus(null);
    if (next !== confirm) {
      setStatus({ type: 'error', message: t('Nove lozinke se ne podudaraju.', 'New passwords do not match.') });
      return;
    }
    setLoading(true);
    try {
      await updateProfile({ current_password: current, new_password: next });
      setStatus({ type: 'success', message: t('Lozinka uspješno promijenjena.', 'Password changed successfully.') });
      setCurrent(''); setNext(''); setConfirm('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Section title={t('Promjena lozinke', 'Change password')}>
      <form onSubmit={handleSubmit}>
        <StatusBanner {...(status || {})} />
        <Field label={t('Trenutna lozinka', 'Current password')}>
          <Input type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label={t('Nova lozinka', 'New password')}>
          <Input type="password" value={next} onChange={e => setNext(e.target.value)} placeholder="••••••••" />
        </Field>
        <Field label={t('Potvrdi novu lozinku', 'Confirm new password')}>
          <Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="••••••••" />
        </Field>
        <SaveButton loading={loading} label={t('Promijeni lozinku', 'Change password')} />
      </form>
    </Section>
  );
}

// ─── Subscription section ─────────────────────────────────────────────────────

function SubscriptionSection({ user, t }) {
  const isPremium = user.subscription_tier === 'premium';

  return (
    <Section title={t('Pretplata', 'Subscription')}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: isPremium ? 20 : 0 }}>
        {/* Plan badge */}
        <div style={{
          padding: '10px 18px', borderRadius: 10,
          background: isPremium
            ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
            : 'var(--bg)',
          border: `1px solid ${isPremium ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)'}`,
        }}>
          <div style={{
            fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 15,
            color: isPremium ? 'var(--accent)' : 'var(--ink)',
          }}>
            {isPremium ? 'Premium' : 'Basic'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 2 }}>
            {isPremium ? '€39 / ' + t('mjesec', 'month') : '€19 / ' + t('mjesec', 'month')}
          </div>
        </div>

        <div style={{ flex: 1 }}>
          {isPremium ? (
            <>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, marginBottom: 2 }}>
                {t('Premium plan aktivan', 'Premium plan active')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {t('Obnavlja se automatski svakog mjeseca.', 'Renews automatically each month.')}
              </div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, marginBottom: 2 }}>
                {t('Basic plan', 'Basic plan')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {t('Nadogradi za video lekcije, kvizove, chat i Zoom sesije.', 'Upgrade for video lessons, quizzes, chat and Zoom sessions.')}
              </div>
            </>
          )}
        </div>
      </div>

      {isPremium ? (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button
            disabled
            title={t('Upravljanje naplatom dolazi uskoro (Stripe integracija)', 'Billing management coming soon (Stripe integration)')}
            style={{
              padding: '9px 18px', borderRadius: 9,
              border: '1px solid var(--line)', background: 'transparent',
              color: 'var(--ink-soft)', fontSize: 13.5, cursor: 'not-allowed',
            }}
          >
            {t('Otkaži pretplatu', 'Cancel subscription')}
          </button>
          <span style={{ fontSize: 12, color: 'var(--ink-soft)', alignSelf: 'center' }}>
            {t('Naplata putem Stripea — dolazi uskoro', 'Billing via Stripe — coming soon')}
          </span>
        </div>
      ) : (
        <button
          disabled
          title={t('Stripe plaćanje dolazi uskoro', 'Stripe payments coming soon')}
          style={{
            padding: '10px 22px', borderRadius: 9,
            background: 'var(--accent)', color: '#fff',
            fontWeight: 700, fontSize: 14, border: 'none',
            cursor: 'not-allowed', opacity: .7,
          }}
        >
          {t('Nadogradi na Premium', 'Upgrade to Premium')}
        </button>
      )}
    </Section>
  );
}

// ─── Preferences section ──────────────────────────────────────────────────────

function ToggleRow({ label, desc, value, onChange }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 16,
      padding: '12px 0', borderBottom: '1px solid var(--line)',
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{label}</div>
        {desc && <div style={{ fontSize: 12.5, color: 'var(--ink-soft)', marginTop: 2 }}>{desc}</div>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 44, height: 24, borderRadius: 12, border: 'none', padding: 0,
          background: value ? 'var(--accent)' : 'var(--line)',
          cursor: 'pointer', position: 'relative', transition: 'background .2s', flexShrink: 0,
        }}
      >
        <span style={{
          position: 'absolute', top: 3, left: value ? 23 : 3,
          width: 18, height: 18, borderRadius: '50%',
          background: '#fff', transition: 'left .2s',
          boxShadow: '0 1px 3px rgba(0,0,0,.25)',
        }} />
      </button>
    </div>
  );
}

function PreferencesSection({ t }) {
  const [lang,  setLangState]  = useState(() => localStorage.getItem('mol_lang')  || 'hr');
  const [theme, setThemeState] = useState(() => localStorage.getItem('mol_theme') || 'light');

  function toggleLang() {
    const next = lang === 'hr' ? 'en' : 'hr';
    setLangState(next);
    localStorage.setItem('mol_lang', next);
    document.documentElement.lang = next;
    // Trigger a full page refresh so AppShell re-reads the stored lang
    window.location.reload();
  }

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setThemeState(next);
    localStorage.setItem('mol_theme', next);
    document.documentElement.dataset.theme = next;
    document.body.dataset.theme = next;
  }

  return (
    <Section title={t('Postavke sučelja', 'Interface preferences')}>
      <ToggleRow
        label={t('Engleski jezik', 'English language')}
        desc={t('Prikazuje sučelje na engleskom', 'Displays the interface in English')}
        value={lang === 'en'}
        onChange={toggleLang}
      />
      <ToggleRow
        label={t('Tamni način rada', 'Dark mode')}
        desc={t('Tamna pozadina, manje naprezanje očiju', 'Dark background, easier on the eyes')}
        value={theme === 'dark'}
        onChange={toggleTheme}
      />
    </Section>
  );
}

// ─── Danger zone ──────────────────────────────────────────────────────────────

function DangerSection({ t, onLogout }) {
  return (
    <Section title={t('Odjava', 'Account')}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)', marginBottom: 2 }}>
            {t('Odjava s računa', 'Log out')}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
            {t('Ostat ćeš odjavljeni na ovom uređaju.', 'You will be logged out on this device.')}
          </div>
        </div>
        <button
          onClick={onLogout}
          style={{
            padding: '9px 20px', borderRadius: 9,
            border: '1px solid var(--line)', background: 'transparent',
            color: 'var(--ink)', fontSize: 14, fontWeight: 600, cursor: 'pointer',
          }}
        >
          {t('Odjava', 'Log out')}
        </button>
      </div>
    </Section>
  );
}

// ─── SettingsPage ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getMe().then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--ink-soft)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>…</span>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '32px 24px 48px' }}>
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 6px' }}>
          {t('Postavke', 'Settings')}
        </p>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, color: 'var(--ink)', margin: 0 }}>
          {t('Moj račun', 'My account')}
        </h1>
      </div>

      <ProfileSection      user={user} onUpdate={setUser} t={t} />
      <PasswordSection     t={t} />
      <SubscriptionSection user={user} t={t} />
      <PreferencesSection  t={t} />
      <DangerSection       t={t} onLogout={handleLogout} />

      {/* Legal links */}
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 13, color: 'var(--ink-soft)' }}>
        <a href="/privacy" style={{ color: 'var(--ink-soft)', textDecoration: 'none', marginRight: 16 }}>
          {t('Politika privatnosti', 'Privacy Policy')}
        </a>
        <a href="/terms" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
          {t('Uvjeti korištenja', 'Terms of Service')}
        </a>
      </div>
    </div>
  );
}
