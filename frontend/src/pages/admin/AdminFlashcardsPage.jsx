import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getTeacherFlashcardDecks, getTeacherFlashcardDeck, createTeacherFlashcardDeck,
  updateTeacherFlashcardDeck, deleteTeacherFlashcardDeck, createTeacherFlashcard,
  updateTeacherFlashcard, deleteTeacherFlashcard, shareTeacherFlashcardDeck,
  getFlashcardStudents, uploadTeacherFlashcardImage,
} from '../../api/client';
import { renderChemHtml } from '../../utils/chemText';

// Teacher flashcards (#18). The teacher builds reusable card sets and shares them
// with students — either publicly (all students) or with hand-picked students.
// Students study the shared sets with their own spaced-repetition schedule.

function Chem({ text, style }) {
  const html = useMemo(() => renderChemHtml(text || ''), [text]);
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}
function imgUrl(u) { return u ? (u.startsWith('/') ? u : `/${u}`) : ''; }

const btn = (bg, fg, extra = {}) => ({
  border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-pill, 99px)',
  padding: '9px 18px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--body)', background: bg, color: fg, ...extra,
});
const ghostBtn = {
  border: '1.5px solid var(--line)', cursor: 'pointer', borderRadius: 'var(--radius-pill, 99px)',
  padding: '8px 16px', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--body)', background: 'transparent', color: 'var(--ink-soft)',
};
const lbl = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 };
const fieldInput = {
  width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 70,
  border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm, 10px)', padding: '10px 12px',
  fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)', fontFamily: 'var(--mono)', background: 'var(--bg)', outline: 'none',
};
const modalInput = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm, 10px)',
  padding: '10px 12px', fontSize: 14.5, color: 'var(--ink)', fontFamily: 'var(--body)', background: 'var(--bg)', outline: 'none',
};

// ─── Card form ─────────────────────────────────────────────────────────────────

function CardForm({ initial, onSave, onCancel, busy }) {
  const [front, setFront] = useState(initial?.front || '');
  const [back, setBack]   = useState(initial?.back || '');
  const [image, setImage] = useState(initial?.image_url || '');
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef(null);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true); setErr('');
    try { setImage(await uploadTeacherFlashcardImage(file)); }
    catch (ex) { setErr(ex.message || 'Greška pri uploadu.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }
  function submit() {
    if (!front.trim() && !back.trim() && !image) { setErr('Popuni barem jednu stranu.'); return; }
    onSave({ front, back, image_url: image || null });
  }

  return (
    <div style={{ border: '1.5px solid var(--accent)', borderRadius: 'var(--radius, 14px)', background: 'var(--surface)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div><label style={lbl}>Prednja strana (pitanje)</label><textarea value={front} onChange={e => setFront(e.target.value)} style={fieldInput} /></div>
      <div><label style={lbl}>Stražnja strana (odgovor)</label><textarea value={back} onChange={e => setBack(e.target.value)} style={fieldInput} placeholder="Npr. $\ce{H2SO4}$" /></div>
      <div>
        <label style={lbl}>Slika (opcionalno)</label>
        {image && (
          <div style={{ marginBottom: 8 }}>
            <img src={imgUrl(image)} alt="" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, border: '1px solid var(--line)' }} />
            <button onClick={() => setImage('')} style={{ ...ghostBtn, padding: '4px 12px', marginLeft: 10, fontSize: 12.5 }}>Ukloni</button>
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ fontSize: 13 }} />
        {uploading && <span style={{ marginLeft: 8, fontSize: 12.5, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Uploadam…</span>}
      </div>
      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-faint)' }}>Podržava formule: <code style={{ fontFamily: 'var(--mono)' }}>$…$</code>, <code style={{ fontFamily: 'var(--mono)' }}>\ce{'{…}'}</code></p>
      {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={ghostBtn} disabled={busy}>Odustani</button>
        <button onClick={submit} style={btn('var(--accent)', 'var(--on-accent, #fff)')} disabled={busy || uploading}>{busy ? 'Spremam…' : 'Spremi karticu'}</button>
      </div>
    </div>
  );
}

const miniLbl = { margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' };

// ─── Share modal ───────────────────────────────────────────────────────────────

function ShareModal({ deck, sharedIds, onClose, onSaved }) {
  const [isPublic, setIsPublic] = useState(Boolean(deck.is_public));
  const [students, setStudents] = useState(null);
  const [selected, setSelected] = useState(new Set(sharedIds));
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { getFlashcardStudents().then(setStudents).catch(() => setStudents([])); }, []);

  function toggle(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  async function save() {
    setBusy(true);
    try { await shareTeacherFlashcardDeck(deck.id, { is_public: isPublic, student_ids: [...selected] }); onSaved(); }
    finally { setBusy(false); }
  }

  const filtered = (students || []).filter(s =>
    !query || s.name.toLowerCase().includes(query.toLowerCase()) || s.email.toLowerCase().includes(query.toLowerCase()));

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--surface)', borderRadius: 'var(--radius, 16px)', padding: 22 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 21, color: 'var(--ink)', margin: '0 0 4px' }}>Podijeli „{deck.title}”</h2>
        <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--ink-faint)' }}>Odaberi tko može učiti ovaj set.</p>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm, 10px)', cursor: 'pointer', marginBottom: 14 }}>
          <input type="checkbox" checked={isPublic} onChange={e => setIsPublic(e.target.checked)} />
          <span style={{ fontSize: 14, color: 'var(--ink)' }}><b>Svi studenti</b> — vidljivo svima u portalu</span>
        </label>

        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Pretraži studente…"
          style={{ ...modalInput, marginBottom: 10, opacity: isPublic ? 0.5 : 1 }} disabled={isPublic} />

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 8, opacity: isPublic ? 0.5 : 1, pointerEvents: isPublic ? 'none' : 'auto' }}>
          {students === null ? (
            <p style={{ padding: 14, fontSize: 13, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>Učitavam…</p>
          ) : filtered.length === 0 ? (
            <p style={{ padding: 14, fontSize: 13, color: 'var(--ink-faint)' }}>Nema studenata.</p>
          ) : filtered.map(s => (
            <label key={s.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--line)', cursor: 'pointer' }}>
              <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, color: 'var(--ink)', fontWeight: 600 }}>{s.name}</span>
                <span style={{ display: 'block', fontSize: 12, color: 'var(--ink-faint)' }}>{s.email}</span>
              </span>
            </label>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <button onClick={onClose} style={ghostBtn} disabled={busy}>Odustani</button>
          <button onClick={save} style={btn('var(--accent)', 'var(--on-accent, #fff)')} disabled={busy}>{busy ? 'Spremam…' : 'Spremi'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Deck detail ───────────────────────────────────────────────────────────────

function DeckDetail({ deckId, onBack, onChanged }) {
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(() => { getTeacherFlashcardDeck(deckId).then(setData).catch(() => setData({ error: true })); }, [deckId]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam…</p>;
  if (data.error) return <p style={{ color: '#c0392b' }}>Set nije pronađen. <button onClick={onBack} style={ghostBtn}>Natrag</button></p>;

  const { deck, cards, shared_student_ids } = data;

  async function addCard(card) { setBusy(true); try { await createTeacherFlashcard(deck.id, card); setAdding(false); load(); onChanged?.(); } finally { setBusy(false); } }
  async function saveCard(id, card) { setBusy(true); try { await updateTeacherFlashcard(id, card); setEditingId(null); load(); } finally { setBusy(false); } }
  async function removeCard(id) { if (!window.confirm('Obrisati ovu karticu?')) return; await deleteTeacherFlashcard(id); load(); onChanged?.(); }
  async function removeDeck() { if (!window.confirm('Obrisati cijeli set i sve kartice?')) return; await deleteTeacherFlashcardDeck(deck.id); onChanged?.(); onBack(); }

  const reach = deck.is_public ? 'Svi studenti' : (shared_student_ids.length ? `${shared_student_ids.length} studenata` : 'Nije podijeljeno');

  return (
    <div>
      <button onClick={onBack} style={{ ...ghostBtn, marginBottom: 16, border: 'none', padding: '4px 0', color: 'var(--ink-faint)' }}>← Svi setovi</button>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', margin: 0 }}>{deck.title}</h1>
          {deck.description && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-faint)' }}>{deck.description}</p>}
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>{cards.length} kartica · {reach}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button onClick={() => setSharing(true)} style={btn('var(--accent)', 'var(--on-accent, #fff)')}>Podijeli</button>
          <button onClick={removeDeck} style={{ ...ghostBtn, color: '#c0392b', borderColor: '#e7b8b0' }}>Obriši set</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        {adding ? <CardForm onSave={addCard} onCancel={() => setAdding(false)} busy={busy} />
          : <button onClick={() => setAdding(true)} style={btn('var(--accent)', 'var(--on-accent, #fff)')}>+ Dodaj karticu</button>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.length === 0 && !adding && <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nema kartica — dodaj prvu iznad.</p>}
        {cards.map(card => (
          editingId === card.id
            ? <CardForm key={card.id} initial={card} onSave={c => saveCard(card.id, c)} onCancel={() => setEditingId(null)} busy={busy} />
            : (
              <div key={card.id} style={{ display: 'flex', gap: 12, border: '1.5px solid var(--line)', borderRadius: 'var(--radius, 12px)', background: 'var(--surface)', padding: 14 }}>
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minWidth: 0 }}>
                  <div style={{ minWidth: 0 }}><p style={miniLbl}>Pitanje</p><Chem text={card.front} style={{ fontSize: 14.5, color: 'var(--ink)' }} /></div>
                  <div style={{ minWidth: 0, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
                    <p style={miniLbl}>Odgovor</p><Chem text={card.back} style={{ fontSize: 14.5, color: 'var(--ink)' }} />
                    {card.image_url && <img src={imgUrl(card.image_url)} alt="" style={{ marginTop: 8, maxHeight: 80, maxWidth: '100%', borderRadius: 6 }} />}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditingId(card.id)} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 12.5 }}>Uredi</button>
                  <button onClick={() => removeCard(card.id)} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 12.5, color: '#c0392b', borderColor: '#e7b8b0' }}>Obriši</button>
                </div>
              </div>
            )
        ))}
      </div>

      {sharing && <ShareModal deck={deck} sharedIds={shared_student_ids} onClose={() => setSharing(false)} onSaved={() => { setSharing(false); load(); onChanged?.(); }} />}
    </div>
  );
}

// ─── New deck modal ──────────────────────────────────────────────────────────

function NewDeckModal({ onClose, onCreated }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function submit() {
    if (!title.trim()) { setErr('Upiši naslov.'); return; }
    setBusy(true); setErr('');
    try { onCreated(await createTeacherFlashcardDeck({ title: title.trim(), description: description.trim() })); }
    catch (ex) { setErr(ex.message || 'Greška.'); setBusy(false); }
  }
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', borderRadius: 'var(--radius, 16px)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)', margin: 0 }}>Novi set kartica</h2>
        <div><label style={lbl}>Naslov</label><input value={title} autoFocus onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={modalInput} /></div>
        <div><label style={lbl}>Opis (opcionalno)</label><input value={description} onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()} style={modalInput} /></div>
        {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={ghostBtn} disabled={busy}>Odustani</button>
          <button onClick={submit} style={btn('var(--accent)', 'var(--on-accent, #fff)')} disabled={busy}>{busy ? 'Stvaram…' : 'Stvori'}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminFlashcardsPage() {
  const [decks, setDecks] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => { getTeacherFlashcardDecks().then(setDecks).catch(() => setDecks([])); }, []);
  useEffect(() => { load(); }, [load]);

  if (openId) {
    return (
      <div style={{ maxWidth: 1000 }}>
        <DeckDetail deckId={openId} onBack={() => { setOpenId(null); load(); }} onChanged={load} />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', margin: 0 }}>Kartice</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-faint)' }}>Flashcards · kreiraj setove i podijeli sa studentima</p>
        </div>
        <button onClick={() => setCreating(true)} style={btn('var(--accent)', 'var(--on-accent, #fff)')}>+ Novi set</button>
      </div>

      {decks === null ? (
        <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam…</p>
      ) : decks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-faint)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
          <p style={{ margin: 0, fontSize: 15 }}>Još nema setova kartica.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
          {decks.map(d => (
            <button key={d.id} onClick={() => setOpenId(d.id)}
              style={{ textAlign: 'left', border: '1.5px solid var(--line)', borderRadius: 'var(--radius, 16px)', background: 'var(--surface)', padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{d.title}</p>
              {d.description && <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{d.description}</p>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', marginTop: 2 }}>
                <span>{d.card_count} kartica</span>
                <span style={{
                  padding: '1px 9px', borderRadius: 99, fontWeight: 700,
                  background: d.is_public ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : '#eef1f5',
                  color: d.is_public ? 'var(--accent-ink, var(--accent))' : '#5b6573',
                }}>
                  {d.is_public ? 'Javno' : d.shared_count ? `${d.shared_count} studenata` : 'Privatno'}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && <NewDeckModal onClose={() => setCreating(false)} onCreated={(deck) => { setCreating(false); load(); setOpenId(deck.id); }} />}
    </div>
  );
}
