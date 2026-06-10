import { useState, useEffect } from 'react';
import { getMe, getStudentSessions } from '../api/client';
import { Icon } from '../components/AppShell';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString('hr-HR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
}

function fmtShort(iso) {
  return new Date(iso).toLocaleDateString('hr-HR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ─── Next session card ────────────────────────────────────────────────────────

function NextSessionCard({ session, lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;
  const d = new Date(session.scheduled_at);
  const now = new Date();
  const diffMs = d - now;
  const diffDays = Math.ceil(diffMs / 86400000);
  const isSoon = diffDays <= 1;

  return (
    <div style={{
      background: 'var(--surface)',
      border: `1.5px solid ${isSoon ? 'var(--accent)' : 'var(--line)'}`,
      borderRadius: 16, padding: '20px 24px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
        {/* Date chip */}
        <div style={{
          width: 56, flexShrink: 0, textAlign: 'center',
          background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          borderRadius: 12, padding: '10px 4px',
        }}>
          <div style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 24, color: 'var(--accent)', lineHeight: 1 }}>
            {d.getDate()}
          </div>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 2 }}>
            {d.toLocaleDateString('hr-HR', { month: 'short' })}
          </div>
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4 }}>
            {session.title}
          </div>
          <div style={{ fontSize: 13, color: 'var(--ink-soft)', display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <Icon.cal width={13} height={13} />
              {fmtDate(session.scheduled_at)}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/>
              </svg>
              {fmtTime(session.scheduled_at)} · {session.duration_minutes} {t('min', 'min')}
            </span>
          </div>
          {isSoon && (
            <div style={{
              marginTop: 6, display: 'inline-block',
              padding: '2px 9px', borderRadius: 20,
              background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
              color: 'var(--accent)', fontSize: 11.5, fontWeight: 700,
              fontFamily: 'var(--mono)',
            }}>
              {diffDays <= 0 ? t('Danas!', 'Today!') : t('Sutra', 'Tomorrow')}
            </div>
          )}
        </div>
      </div>

      {/* Prep note */}
      {session.prep_note && (
        <div style={{
          background: 'color-mix(in srgb, var(--accent) 6%, var(--bg))',
          border: '1px solid color-mix(in srgb, var(--accent) 18%, transparent)',
          borderRadius: 10, padding: '12px 14px',
          fontSize: 13.5, color: 'var(--ink)', lineHeight: 1.5,
          display: 'flex', gap: 10,
        }}>
          <span style={{ flexShrink: 0, fontSize: 16 }}>📋</span>
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
              {t('Priprema', 'Prep note')}
            </div>
            {session.prep_note}
          </div>
        </div>
      )}

      {/* Zoom button */}
      {session.zoom_url ? (
        <a
          href={session.zoom_url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '11px 20px', borderRadius: 10,
            background: 'var(--accent)', color: '#fff',
            fontWeight: 700, fontSize: 14, textDecoration: 'none',
          }}
        >
          <Icon.video width={16} height={16} />
          {t('Pridruži se Zoom sesiji', 'Join Zoom session')}
        </a>
      ) : (
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', fontStyle: 'italic' }}>
          {t('Zoom link bit će dodan uskoro.', 'Zoom link will be added soon.')}
        </div>
      )}
    </div>
  );
}

// ─── Session history row ──────────────────────────────────────────────────────

function HistoryRow({ session, lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;
  const isCancelled = session.status === 'cancelled';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      padding: '14px 18px',
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 12,
      opacity: isCancelled ? 0.55 : 1,
    }}>
      {/* Status dot */}
      <div style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        background: isCancelled ? 'var(--ink-soft)' : 'color-mix(in srgb, #22c55e 80%, transparent)',
      }} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
          {session.title}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
          {fmtShort(session.scheduled_at)} · {session.duration_minutes} {t('min', 'min')}
          {isCancelled && <span style={{ marginLeft: 8, color: 'var(--ink-soft)', fontStyle: 'italic' }}>({t('otkazano', 'cancelled')})</span>}
        </div>
      </div>

      {/* Link to session summary message */}
      {session.summary_message_id && (
        <a
          href="/messages"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 12px', borderRadius: 8,
            background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
            color: 'var(--accent)', fontSize: 12.5, fontWeight: 600,
            textDecoration: 'none', flexShrink: 0,
          }}
        >
          📋 {t('Sažetak', 'Summary')}
        </a>
      )}
    </div>
  );
}

// ─── No sessions placeholder ──────────────────────────────────────────────────

function NoUpcoming({ lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;
  return (
    <div style={{
      background: 'var(--surface)', border: '1.5px dashed var(--line)',
      borderRadius: 16, padding: '28px 24px',
      display: 'flex', alignItems: 'center', gap: 16,
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12, flexShrink: 0,
        background: 'color-mix(in srgb, var(--accent) 10%, transparent)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <Icon.video width={22} height={22} />
      </div>
      <div>
        <div style={{ fontWeight: 700, fontSize: 14.5, color: 'var(--ink)', marginBottom: 4 }}>
          {t('Nije zakazana sesija', 'No session booked')}
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
          {t('Rezerviraj termin u kalendaru ispod.', 'Book a slot in the calendar below.')}
        </div>
      </div>
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

// CALENDLY_URL: replace with Tomislav's real link at launch.
const CALENDLY_URL = 'https://calendly.com/tomislav-molekula';

function CalendlyEmbed({ lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;

  useEffect(() => {
    if (document.getElementById('calendly-script')) return;
    const script = document.createElement('script');
    script.id = 'calendly-script';
    script.src = 'https://assets.calendly.com/assets/external/widget.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
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
      <div
        className="calendly-inline-widget"
        data-url={`${CALENDLY_URL}?hide_gdpr_banner=1&primary_color=0f8f86&locale=${lang === 'en' ? 'en' : 'hr'}`}
        style={{
          minWidth: 320, height: 660,
          borderRadius: '0 0 12px 12px',
          border: '1px solid var(--line)', borderTop: 'none',
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

  const [user, setUser]       = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const isPremium = user?.subscription_tier === 'premium';

  useEffect(() => {
    getMe()
      .then(async u => {
        setUser(u);
        if (u.subscription_tier === 'premium') {
          const s = await getStudentSessions().catch(() => []);
          setSessions(s);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--ink-soft)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>…</span>
      </div>
    );
  }

  const now = new Date();
  const upcoming = sessions.filter(s => s.status === 'upcoming' && new Date(s.scheduled_at) > now);
  const past = sessions.filter(s => s.status !== 'upcoming' || new Date(s.scheduled_at) <= now);
  const nextSession = upcoming[0] ?? null;

  // Monthly allowance: sessions booked this calendar month
  const thisMonth = upcoming.filter(s => {
    const d = new Date(s.scheduled_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

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

          {/* Next session */}
          <section>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 12 }}>
              {t('Sljedeća sesija', 'Next session')}
            </h2>
            {nextSession
              ? <NextSessionCard session={nextSession} lang={lang} />
              : <NoUpcoming lang={lang} />
            }
          </section>

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
                {thisMonth.length > 0
                  ? t(`${thisMonth.length} od 1 sesije rezervirana ovaj mjesec`, `${thisMonth.length} of 1 sessions booked this month`)
                  : t('1 besplatna sesija dostupna ovaj mjesec', '1 free session available this month')
                }
              </div>
            </div>
            <div style={{
              fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 20,
              color: thisMonth.length > 0 ? 'var(--ink-soft)' : 'var(--accent)',
            }}>
              {thisMonth.length > 0 ? '0/1' : '1/1'}
            </div>
          </div>

          {/* Book new session */}
          <section>
            <h2 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 16 }}>
              {t('Rezerviraj sesiju', 'Book a session')}
            </h2>
            <CalendlyEmbed lang={lang} />
          </section>

          {/* Session history */}
          {past.length > 0 && (
            <section>
              <h2 style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-soft)', marginBottom: 12 }}>
                {t('Prethodne sesije', 'Past sessions')}
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...past].reverse().map(s => (
                  <HistoryRow key={s.id} session={s} lang={lang} />
                ))}
              </div>
            </section>
          )}

          {/* Help note */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: '14px 18px',
            fontSize: 13.5, color: 'var(--ink-soft)', lineHeight: 1.5,
          }}>
            <strong style={{ color: 'var(--ink)' }}>{t('Napomena:', 'Note:')}</strong>{' '}
            {t(
              'Nakon rezervacije dobivaš Zoom link emailom. Ako moraš otkazati, molim te to učini najmanje 24 sata unaprijed.',
              "After booking you'll receive the Zoom link by email. If you need to cancel, please do so at least 24 hours in advance.",
            )}
          </div>
        </div>
      ) : (
        <BasicUpsell lang={lang} />
      )}
    </div>
  );
}
