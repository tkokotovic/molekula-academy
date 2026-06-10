import { useState, useEffect, useRef, useCallback } from 'react';
import { getMessageThreads, getMessageThread, replyToStudent } from '../../api/client';
import { ChemText } from '../../utils/chemText';

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
      groups.push({ type: 'divider', day, label: formatDay(msg.created_at) });
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

function isImage(url) {
  return /\.(jpe?g|png|gif|webp)$/i.test(url || '');
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
              {thread.last_sender_role === 'teacher' ? 'Ti: ' : ''}
              {thread.last_message || (thread.last_file_name ? `📎 ${thread.last_file_name}` : '—')}
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

// ─── Attachment preview ───────────────────────────────────────────────────────

function AttachmentPreview({ fileUrl, fileName }) {
  if (!fileUrl) return null;
  if (isImage(fileUrl)) {
    return (
      <a href={fileUrl} target="_blank" rel="noreferrer" style={{ display: 'block', marginTop: 6 }}>
        <img
          src={fileUrl}
          alt={fileName || 'prilog'}
          style={{
            maxWidth: 220, maxHeight: 180,
            borderRadius: 8, display: 'block',
            border: '1px solid rgba(0,0,0,.1)', objectFit: 'cover',
          }}
        />
      </a>
    );
  }
  return (
    <a
      href={fileUrl}
      target="_blank"
      rel="noreferrer"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 6,
        padding: '6px 10px', borderRadius: 7,
        background: 'rgba(0,0,0,.07)', color: 'inherit',
        fontSize: 12.5, textDecoration: 'none', fontWeight: 600,
        border: '1px solid rgba(0,0,0,.1)',
      }}
    >
      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
      </svg>
      {fileName || 'prilog'}
    </a>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

const MSG_TYPE_LABEL = {
  broadcast: '📢 Broadcast',
  session_summary: '📋 Sažetak sesije',
};

function Bubble({ msg }) {
  const isTeacher = msg.sender_role === 'teacher';
  const isSpecial = msg.message_type === 'broadcast' || msg.message_type === 'session_summary';
  const typeLabel = MSG_TYPE_LABEL[msg.message_type];

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
        {isTeacher && typeLabel && (
          <div style={{ fontSize: 11, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', marginBottom: 3 }}>
            {typeLabel}
          </div>
        )}
        <div style={{
          padding: '10px 14px',
          borderRadius: isTeacher ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
          background: isSpecial
            ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))'
            : isTeacher ? 'var(--accent)' : 'var(--surface)',
          border: isTeacher ? (isSpecial ? '1px solid var(--accent)' : 'none') : '1px solid var(--line)',
          color: isTeacher && !isSpecial ? '#fff' : 'var(--ink)',
          fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word',
        }}>
          {msg.text && <ChemText text={msg.text} />}
          <AttachmentPreview fileUrl={msg.file_url} fileName={msg.file_name} />
        </div>
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
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const ref = useRef(null);
  const fileInputRef = useRef(null);

  const canSend = (text.trim() || file) && !sending;

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); }
  }

  function handleFileChange(e) {
    const f = e.target.files[0];
    if (f) setFile(f);
    e.target.value = '';
  }

  async function submit() {
    if (!canSend) return;
    setSending(true);
    const sentText = text.trim();
    const sentFile = file;
    setText('');
    setFile(null);
    try { await onSend(sentText, sentFile); }
    catch (err) { alert(err.message); }
    finally { setSending(false); ref.current?.focus(); }
  }

  return (
    <div style={{ borderTop: '1px solid var(--line)' }}>
      {file && (
        <div style={{ padding: '7px 16px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '4px 9px', borderRadius: 7,
            background: 'var(--surface)', border: '1px solid var(--line)',
            fontSize: 12, color: 'var(--ink)', maxWidth: 240,
          }}>
            {isImage(file.name) ? (
              <img src={URL.createObjectURL(file)} alt="" style={{ width: 22, height: 22, borderRadius: 3, objectFit: 'cover' }} />
            ) : (
              <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
          </div>
          <button
            onClick={() => setFile(null)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--ink-soft)', padding: 2 }}
          >✕</button>
        </div>
      )}
      <div style={{ padding: '10px 16px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={sending}
          title="Priloži sliku ili PDF (max 20 MB)"
          style={{
            width: 34, height: 34, borderRadius: 8, flexShrink: 0,
            border: '1px solid var(--line)', background: 'var(--surface)',
            cursor: sending ? 'default' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--ink-soft)',
          }}
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/>
          </svg>
        </button>
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
          disabled={!canSend}
          style={{
            width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
            background: canSend ? 'var(--accent)' : 'var(--line)',
            border: 'none', cursor: canSend ? 'pointer' : 'default',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
          }}
        >
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
          </svg>
        </button>
      </div>
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

  async function handleReply(text, file) {
    if (!selStudentId) return;
    const optimistic = {
      id: `opt-${Date.now()}`,
      sender_role: 'teacher',
      text: text || null,
      file_url: file ? URL.createObjectURL(file) : null,
      file_name: file ? file.name : null,
      message_type: 'message',
      created_at: new Date().toISOString(),
    };
    setSelThread(prev => prev ? { ...prev, messages: [...prev.messages, optimistic] } : prev);
    try {
      const saved = await replyToStudent(selStudentId, text, file);
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
                  {groupByDay(selThread.messages).map(item =>
                    item.type === 'divider'
                      ? <DayDivider key={`divider-${item.day}`} label={item.label} />
                      : <Bubble key={`msg-${item.id}`} msg={item} />
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
