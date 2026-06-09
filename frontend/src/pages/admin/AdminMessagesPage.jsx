import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessageThreads, getMessageThread, replyToStudent } from '../../api/client';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso) {
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('hr-HR', { day: '2-digit', month: 'short' });
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

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Thread list item ─────────────────────────────────────────────────────────

function ThreadItem({ thread, isSelected, onClick }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '12px 14px', cursor: 'pointer',
        borderBottom: '1px solid var(--line)',
        background: isSelected
          ? 'color-mix(in srgb, var(--accent) 8%, transparent)'
          : hovered ? 'var(--surface)' : 'transparent',
        borderLeft: isSelected ? '3px solid var(--accent)' : '3px solid transparent',
        transition: 'background .12s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Avatar */}
        <div style={{
          width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
          background: 'color-mix(in srgb, var(--accent) 20%, var(--surface))',
          color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 13, fontFamily: 'var(--mono)',
        }}>{initials(thread.name)}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 700, fontSize: 13.5, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 140 }}>
              {thread.name}
            </span>
            <span style={{ fontSize: 11, color: 'var(--ink-soft)', flexShrink: 0, marginLeft: 6 }}>
              {formatTime(thread.last_message_at)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              fontSize: 12.5, color: 'var(--ink-soft)',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              flex: 1, fontStyle: thread.last_sender_role === 'teacher' ? 'italic' : 'normal',
            }}>
              {thread.last_sender_role === 'teacher' ? 'Ti: ' : ''}{thread.last_message}
            </span>
            {thread.unread_count > 0 && (
              <span style={{
                background: 'var(--accent)', color: '#fff',
                borderRadius: '50%', width: 18, height: 18, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10.5, fontWeight: 700,
              }}>{thread.unread_count}</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ msg }) {
  const isTeacher = msg.sender_role === 'teacher';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isTeacher ? 'row-reverse' : 'row',
      alignItems: 'flex-end', gap: 10,
    }}>
      {!isTeacher && (
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'color-mix(in srgb, var(--accent) 15%, var(--surface))',
          color: 'var(--accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 11, fontFamily: 'var(--mono)',
        }}>S</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isTeacher ? 'flex-end' : 'flex-start', maxWidth: 'min(520px, 75%)' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: isTeacher ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isTeacher ? 'var(--accent)' : 'var(--surface)',
          border: isTeacher ? 'none' : '1px solid var(--line)',
          color: isTeacher ? '#fff' : 'var(--ink)',
          fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word',
        }}>{msg.text}</div>
        <span style={{ fontSize: 11, color: 'var(--ink-soft)', marginTop: 4, paddingInline: 4 }}>
          {new Date(msg.created_at).toLocaleTimeString('hr-HR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </div>
  );
}

function DayDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '8px 0' }}>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
      <span style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--line)' }} />
    </div>
  );
}

// ─── Compose bar ──────────────────────────────────────────────────────────────

function ComposeBar({ onSend }) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const ref = useRef(null);

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  async function submit() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setText('');
    try { await onSend(trimmed); }
    catch (err) { alert(err.message); setText(trimmed); }
    finally { setSending(false); ref.current?.focus(); }
  }

  return (
    <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      <textarea
        ref={ref}
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleKey}
        disabled={sending}
        placeholder="Odgovori studentu… (Enter za slanje)"
        rows={1}
        style={{
          flex: 1, resize: 'none', border: '1px solid var(--line)',
          borderRadius: 12, padding: '10px 14px',
          background: 'var(--surface)', color: 'var(--ink)',
          fontFamily: 'var(--sans)', fontSize: 14, lineHeight: 1.5,
          outline: 'none', maxHeight: 120, overflowY: 'auto',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--accent)'; }}
        onBlur={e => { e.target.style.borderColor = 'var(--line)'; }}
      />
      <button
        onClick={submit}
        disabled={!text.trim() || sending}
        style={{
          width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
          background: text.trim() && !sending ? 'var(--accent)' : 'var(--line)',
          border: 'none', cursor: text.trim() ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
        }}
      >
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
        </svg>
      </button>
    </div>
  );
}

// ─── AdminMessagesPage ────────────────────────────────────────────────────────

export default function AdminMessagesPage() {
  const [threads,      setThreads]      = useState([]);
  const [selThread,    setSelThread]    = useState(null);  // { student, messages }
  const [selStudentId, setSelStudentId] = useState(null);
  const [loadingList,  setLoadingList]  = useState(true);
  const [loadingThread,setLoadingThread]= useState(false);
  const bottomRef = useRef(null);
  const pollRef   = useRef(null);

  const loadThreads = useCallback(() => {
    getMessageThreads()
      .then(setThreads)
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  const loadThread = useCallback(async (studentId) => {
    setLoadingThread(true);
    try {
      const data = await getMessageThread(studentId);
      setSelThread(data);
      // refresh thread list (clears unread badge)
      getMessageThreads().then(setThreads).catch(() => {});
    } catch {
      // ignore
    } finally {
      setLoadingThread(false);
    }
  }, []);

  useEffect(() => { loadThreads(); }, [loadThreads]);

  // Poll thread list every 10s
  useEffect(() => {
    pollRef.current = setInterval(loadThreads, 10_000);
    return () => clearInterval(pollRef.current);
  }, [loadThreads]);

  // Poll open thread every 10s
  useEffect(() => {
    if (!selStudentId) return;
    const tid = setInterval(() => loadThread(selStudentId), 10_000);
    return () => clearInterval(tid);
  }, [selStudentId, loadThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selThread?.messages]);

  async function selectStudent(studentId) {
    setSelStudentId(studentId);
    await loadThread(studentId);
  }

  async function handleReply(text) {
    if (!selStudentId) return;
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_role: 'teacher',
      text,
      created_at: new Date().toISOString(),
    };
    setSelThread(prev => prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev);
    try {
      const saved = await replyToStudent(selStudentId, text);
      setSelThread(prev => prev
        ? { ...prev, messages: prev.messages.map(m => m.id === optimistic.id ? saved : m) }
        : prev
      );
      loadThreads();
    } catch (err) {
      setSelThread(prev => prev
        ? { ...prev, messages: prev.messages.filter(m => m.id !== optimistic.id) }
        : prev
      );
      throw err;
    }
  }

  const totalUnread = threads.reduce((s, t) => s + (t.unread_count || 0), 0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>

      {/* ── Thread list ── */}
      <div style={{
        width: 280, flexShrink: 0,
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '16px 16px 12px', borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Poruke</span>
          {totalUnread > 0 && (
            <span style={{
              background: 'var(--accent)', color: '#fff',
              borderRadius: 10, padding: '1px 7px', fontSize: 11.5, fontWeight: 700,
            }}>{totalUnread}</span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingList
            ? <p style={{ padding: 20, color: 'var(--ink-soft)', fontSize: 13 }}>Učitavam…</p>
            : threads.length === 0
              ? <p style={{ padding: 20, color: 'var(--ink-soft)', fontSize: 13, fontStyle: 'italic' }}>Nema poruka</p>
              : threads.map(th => (
                  <ThreadItem
                    key={th.student_id}
                    thread={th}
                    isSelected={selStudentId === th.student_id}
                    onClick={() => selectStudent(th.student_id)}
                  />
                ))
          }
        </div>
      </div>

      {/* ── Thread view ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!selThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)', fontSize: 14, fontStyle: 'italic' }}>
            Odaberi razgovor
          </div>
        ) : (
          <>
            {/* Thread header */}
            <div style={{
              padding: '14px 20px', borderBottom: '1px solid var(--line)',
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'color-mix(in srgb, var(--accent) 15%, var(--surface))',
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, fontFamily: 'var(--mono)',
              }}>{initials(selThread.student?.name)}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>
                  {selThread.student?.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
                  {selThread.student?.email}
                  {' · '}
                  <span style={{
                    color: selThread.student?.subscription_tier === 'premium' ? 'var(--accent)' : 'var(--ink-soft)',
                    fontWeight: 600,
                  }}>
                    {selThread.student?.subscription_tier === 'premium' ? 'Premium' : 'Basic'}
                  </span>
                </div>
              </div>
            </div>

            {/* Messages */}
            {loadingThread
              ? <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-soft)', fontSize: 13 }}>Učitavam…</div>
              : (
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selThread.messages.length === 0 && (
                    <p style={{ color: 'var(--ink-soft)', fontSize: 14, textAlign: 'center', marginTop: 32, fontStyle: 'italic' }}>
                      Još nema poruka
                    </p>
                  )}
                  {groupByDay(selThread.messages).map((item, i) =>
                    item.type === 'divider'
                      ? <DayDivider key={i} label={item.label} />
                      : <Bubble key={item.id} msg={item} />
                  )}
                  <div ref={bottomRef} />
                </div>
              )
            }

            <ComposeBar onSend={handleReply} />
          </>
        )}
      </div>
    </div>
  );
}
