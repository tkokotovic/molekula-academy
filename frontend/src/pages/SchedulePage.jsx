import { useState, useEffect } from 'react';
import { getMe } from '../api/client';
import { Icon } from '../components/AppShell';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('hr-HR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

// ─── Upcoming sessions (stub — replace with real API in Phase 7) ──────────────

const STUB_SESSIONS = [
  {
    id: 1,
    title: 'Termokemija — Hessov zakon',
    date: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    time: '17:00',
    duration: 60,
    zoomUrl: '#',
    status: 'confirmed',
  },
];

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session, lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;
  const isUpcoming = new Date(session.date) > new Date();

  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 14, padding: '18px 20px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      {/* Date chip */}
      <div style={{
        width: 52, flexShrink: 0, textAlign: 'center',
        background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
        borderRadius: 10, padding: '8px 4px',
      }}>
        <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 22, color: 'var(--accent)', lineHeight: 1 }}>
          {new Date(session.date).getDate()}
        </div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          {new Date(session.date).toLocaleDateString('hr-HR', { month: 'short' })}
        </div>
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {session.title}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon.cal width={13} height={13} />
            {formatDate(session.date)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
            </svg>
            {session.time} · {session.duration} {t('min', 'min')}
          </span>
        </div>
      </div>

      {/* Actions */}
      {isUpcoming && (
        <a
          href={session.zoomUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '9px 16px', borderRadius: 9,
            background: 'var(--accent)', color: '#fff',
            fontWeight: 700, fontSize: 13, textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <Icon.video width={14} height={14} />
          {t('Pridruži se', 'Join')}
        </a>
      )}
    </div>
  );
}

// ─── Basic upsell overlay ─────────────────────────────────────────────────────

function BasicUpsell({ lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 16, padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--surface)', border: '2px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-soft)',
      }}>
        <Icon.cal width={32} height={32} />
      </div>

      <div>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
          {t('Samo Premium', 'Premium only')}
        </p>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)', margin: '0 0 10px' }}>
          {t('Uživo s profesorom', 'Live with the teacher')}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)', maxWidth: 420, margin: '0 auto' }}>
          {t(
            '1-na-1 Zoom sesija s Tomislavom. Odaberi termin, dobij Zoom link automatski.',
            '1-on-1 Zoom session with Tomislav. Pick a slot, get a Zoom link automatically.',
          )}
        </p>
      </div>

      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '20px 28px', maxWidth: 360,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {[
          t('1 besplatna sesija mjesečno', '1 free session per month'),
          t('60 minuta, individualna nastava', '60 minutes, 1-on-1'),
          t('Zoom link automatski poslan emailom', 'Zoom link auto-sent by email'),
          t('Uključeno u Premium (€39/mj)', 'Included in Premium (€39/mo)'),
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
            <span style={{ color: 'var(--ink)' }}>{item}</span>
          </div>
        ))}
      </div>

      <a
        href="/settings"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '12px 28px', borderRadius: 10,
          background: 'var(--accent)', color: '#fff',
          fontWeight: 700, fontSize: 15, textDecoration: 'none',
        }}
      >
        {t('Nadogradi na Premium', 'Upgrade to Premium')}
      </a>
    </div>
  );
}

// ─── Calendly embed ───────────────────────────────────────────────────────────

// CALENDLY_URL is a placeholder — replace with Tomislav's real Calendly link at launch.
const CALENDLY_URL = 'https://calendly.com/tomislav-molekula';

function CalendlyEmbed({ lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;

  useEffect(() => {
    // Load Calendly widget script once
    if (document.getElementById('calendly-script')) return;
    const script = document.createElement('script');
    script.id = 'calendly-script';
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      // Don't remove on unmount — keep cached for re-navigation
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Info bar above embed */}
      <div style={{
        background: 'color-mix(in srgb, var(--accent) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
        borderRadius: '12px 12px 0 0',
        padding: '12px 18px',
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 13.5, color: 'var(--ink)',
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9"/><path d="M12 8v4l2 2"/>
        </svg>
        {t(
          '60-minutna individualna sesija · Zoom link stiže emailom nakon rezervacije',
          '60-minute 1-on-1 session · Zoom link sent by email after booking',
        )}
      </div>

      {/* Calendly inline widget */}
      <div
        className="calendly-inline-widget"
        data-url={`${CALENDLY_URL}?hide_gdpr_banner=1&primary_color=0f8f86&locale=${lang === 'en' ? 'en' : 'hr'}`}
        style={{
          minWidth: 320,
          height: 660,
          borderRadius: '0 0 12px 12px',
          border: '1px solid var(--line)',
          borderTop: 'none',
          overflow: 'hidden',
        }}
      />
    </div>
  );
}

// ─── SchedulePage ─────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [user, setUser]           = useState(null);
  const [loading, setLoading]     = useState(true);
  const [sessions]                = useState(STUB_SESSIONS);

  const isPremium = user?.subscription_tier === 'premium';

  useEffect(() => {
    getMe().then(setUser).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--ink-soft)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>…</span>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 24px 48px' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', margin: '0 0 6px' }}>
          {t('Raspored', 'Schedule')}
        </p>
        <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, color: 'var(--ink)', margin: 0 }}>
          {t('Zoom sesije', 'Zoom sessions')}
        </h1>
      </div>

      {isPremium ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

          {/* Upcoming sessions */}
          {sessions.length > 0 && (
            <section>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 12 }}>
                {t('Nadolazeće sesije', 'Upcoming sessions')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sessions.map(s => <SessionCard key={s.id} session={s} lang={lang} />)}
              </div>
            </section>
          )}

          {/* Monthly allowance badge */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 14, padding: '16px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
              background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <Icon.video width={20} height={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', marginBottom: 2 }}>
                {t('Tvoja mjesečna kvota', 'Your monthly allowance')}
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
                {sessions.length > 0
                  ? t('1 od 1 sesije iskorištena ovaj mjesec', '1 of 1 sessions used this month')
                  : t('1 besplatna sesija dostupna ovaj mjesec', '1 free session available this month')
                }
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20,
              color: sessions.length > 0 ? 'var(--ink-soft)' : 'var(--accent)',
            }}>
              {sessions.length > 0 ? '0/1' : '1/1'}
            </div>
          </div>

          {/* Book new section */}
          <section>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 16 }}>
              {t('Rezerviraj sesiju', 'Book a session')}
            </h2>
            <CalendlyEmbed lang={lang} />
          </section>

          {/* Help note */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '14px 18px',
            fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--ink)' }}>{t('Napomena:', 'Note:')}</strong>{' '}
            {t(
              'Nakon rezervacije dobivaš Zoom link emailom. Ako moraš otkazati, molim te to učini najmanje 24 sata unaprijed.',
              'After booking you\'ll receive the Zoom link by email. If you need to cancel, please do so at least 24 hours in advance.',
            )}
          </div>
        </div>
      ) : (
        <BasicUpsell lang={lang} />
      )}
    </div>
  );
}
