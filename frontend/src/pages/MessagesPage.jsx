import { useState, useEffect, useRef, useCallback } from 'react';
import { getMe, getMessages, sendMessage } from '../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso) {
  const d = new Date(iso);
  return d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Danas';
  if (d.toDateString() === yesterday.toDateString()) return 'Jučer';
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function groupByDay(messages) {
  const groups = [];
  let lastDay = null;
  for (const msg of messages) {
    const day = new Date(msg.created_at).toDateString();
    if (day !== lastDay) {
      groups.push({ type: 'divider', label: formatDay(msg.created_at) });
      lastDay = day;
    }
    groups.push({ type: 'message', ...msg });
  }
  return groups;
}

// ─── Premium lock overlay ─────────────────────────────────────────────────────

function PremiumGate({ lang }) {
  const t = (hr, en) => lang === 'en' ? en : hr;
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      flex: 1, gap: 16, padding: '48px 24px', textAlign: 'center',
    }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--surface)', border: '2px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-soft)',
      }}>
        <svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      </div>
      <div>
        <p style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
          {t('Samo Premium', 'Premium only')}
        </p>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 26, color: 'var(--ink)', margin: '0 0 10px' }}>
          {t('Izravni razgovor s profesorom', 'Direct chat with the teacher')}
        </h2>
        <p style={{ fontSize: 15, color: 'var(--ink-soft)', maxWidth: 420, margin: '0 auto' }}>
          {t(
            'Postavi pitanje, dobij odgovor unutar 24 sata. Dostupno uz Premium pretplatu.',
            'Ask a question, get an answer within 24 hours. Available with Premium subscription.',
          )}
        </p>
      </div>
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)',
        borderRadius: 14, padding: '20px 28px', maxWidth: 360,
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        {[
          t('Neograničena pitanja profesoru', 'Unlimited questions to teacher'),
          t('Odgovor unutar 24 sata', 'Response within 24 hours'),
          t('Povijest razgovora trajno sačuvana', 'Conversation history permanently saved'),
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

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }) {
  const isStudent = msg.sender_role === 'student';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isStudent ? 'row-reverse' : 'row',
      alignItems: 'flex-end',
      gap: 10,
    }}>
      {!isStudent && (
        <div style={{
          width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 13,
        }}>T</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isStudent ? 'flex-end' : 'flex-start', maxWidth: 'min(520px, 75%)' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isStudent ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isStudent ? 'var(--accent)' : 'var(--surface)',
          border: isStudent ? 'none' : '1px solid var(--line)',
          color: isStudent ? '#fff' : 'var(--ink)',
          fontSize: 14.5, lineHeight: 1.55, wordBreak: 'break-word',
        }}>
          {msg.text}
        </div>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, paddingInline: 4 }}>
          {formatTime(msg.created_at)}
        </span>
      </div>
    </div>
  );
}

// ─── Day divider ──────────────────────────────────────────────────────────────

function DayDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      <span style={{ fontSize: 11.5, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', letterSpacing: '.05em', whiteSpace: 'nowrap' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

// ─── Compose bar ──────────────────────────────────────────────────────────────

function ComposeBar({ onSend, lang, disabled }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const textareaRef = useRef(null);
  const t = (hr, en) => lang === 'en' ? en : hr;

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || disabled || sending) return;
    setSending(true);
    const optimisticText = trimmed;
    setText('');
    try {
      await onSend(optimisticText);
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  return (
    <div style={{
      padding: '12px 16px', borderTop: '1px solid var(--line)',
      background: 'var(--bg)', display: 'flex', alignItems: 'flex-end', gap: 10,
    }}>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={disabled || sending}
        placeholder={t('Napiši poruku… (Enter za slanje, Shift+Enter za novi red)', 'Write a message… (Enter to send, Shift+Enter for new line)')}
        rows={1}
        style={{
          flex: 1, resize: 'none', border: '1px solid var(--line)',
          borderRadius: 12, padding: '10px 14px',
          background: 'var(--surface)', color: 'var(--ink)',
          fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.5,
          outline: 'none', maxHeight: 120, overflowY: 'auto',
          transition: 'border-color .15s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--line)'; }}
      />
      <button
        onClick={submit}
        disabled={!text.trim() || disabled || sending}
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: text.trim() && !disabled && !sending ? 'var(--accent)' : 'var(--line)',
          border: 'none', cursor: text.trim() && !disabled ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', transition: 'background .15s',
        }}
        aria-label={t('Pošalji', 'Send')}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  );
}

// ─── MessagesPage ─────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const lang = localStorage.getItem('mol_lang') || 'hr';
  const t = (hr, en) => lang === 'en' ? en : hr;

  const [user,     setUser]     = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const isPremium = user?.subscription_tier === 'premium';

  // Load messages from API
  const loadMessages = useCallback(async () => {
    try {
      const msgs = await getMessages();
      setMessages(msgs);
    } catch {
      // silently ignore — user may not be premium or network blip
    }
  }, []);

  // Initial load
  useEffect(() => {
    getMe()
      .then(u => {
        setUser(u);
        if (u.subscription_tier === 'premium') {
          return loadMessages();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [loadMessages]);

  // Poll every 10s for new messages when premium
  useEffect(() => {
    if (!isPremium) return;
    pollRef.current = setInterval(loadMessages, 10_000);
    return () => clearInterval(pollRef.current);
  }, [isPremium, loadMessages]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text) {
    // Optimistic insert
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_role: 'student',
      text,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    try {
      const saved = await sendMessage(text);
      // Replace optimistic with saved
      setMessages(prev => prev.map(m => m.id === optimistic.id ? saved : m));
    } catch (err) {
      // Remove optimistic on failure and show inline error
      setMessages(prev => prev.filter(m => m.id !== optimistic.id));
      alert(err.message);
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 320, color: 'var(--ink-soft)' }}>
        <span style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>…</span>
      </div>
    );
  }

  const items = groupByDay(messages);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      height: 'calc(100vh - 64px)',
      maxWidth: 800, margin: '0 auto', width: '100%',
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px 16px', borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'var(--accent)', color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16, flexShrink: 0,
        }}>T</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>Tomislav</div>
          <div style={{ fontSize: 12.5, color: 'var(--ink-soft)' }}>
            {t('Professor · odgovara unutar 24h', 'Professor · replies within 24h')}
          </div>
        </div>
        {!isPremium && (
          <span style={{
            padding: '4px 10px', borderRadius: 20,
            background: 'color-mix(in srgb, var(--accent) 12%, transparent)',
            color: 'var(--accent)', fontSize: 11.5, fontWeight: 700,
            fontFamily: 'var(--mono)', letterSpacing: '.05em',
          }}>PREMIUM</span>
        )}
      </div>

      {isPremium ? (
        <>
          {/* Thread */}
          <div style={{
            flex: 1, overflowY: 'auto', padding: '20px 24px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--line)',
              borderRadius: 12, padding: '12px 16px',
              fontSize: 13, color: 'var(--ink-soft)', textAlign: 'center',
            }}>
              {t(
                'Poruke su trajno sačuvane. Tomislav odgovara unutar 24 sata.',
                'Messages are permanently saved. Tomislav replies within 24 hours.',
              )}
            </div>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink-soft)', fontSize: 14, marginTop: 24 }}>
                {t('Još nema poruka. Postavi svoje prvo pitanje!', 'No messages yet. Ask your first question!')}
              </div>
            )}
            {items.map((item, i) =>
              item.type === 'divider'
                ? <DayDivider key={i} label={item.label} />
                : <Bubble key={item.id} msg={item} />
            )}
            <div ref={bottomRef} />
          </div>

          <ComposeBar onSend={handleSend} lang={lang} disabled={false} />
        </>
      ) : (
        <PremiumGate lang={lang} />
      )}
    </div>
  );
}
