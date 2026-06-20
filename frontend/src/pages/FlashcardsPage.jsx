import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  getFlashcardDecks, getFlashcardDeck, createFlashcardDeck, updateFlashcardDeck,
  deleteFlashcardDeck, createFlashcard, updateFlashcard, deleteFlashcard,
  getFlashcardStudyQueue, reviewFlashcard, uploadStudentFlashcardImage,
} from '../api/client';
import { renderChemHtml } from '../utils/chemText';

// Flashcards (#18). Students build their own study sets, study them with an
// Anki-style spaced-repetition queue, and can also study teacher-shared sets.
// Front/back support inline KaTeX / mhchem ($…$, $$…$$, \ce{…}) and one image.

// ─── Shared bits ──────────────────────────────────────────────────────────────

function Chem({ text, style }) {
  const html = useMemo(() => renderChemHtml(text || ''), [text]);
  return <span style={style} dangerouslySetInnerHTML={{ __html: html }} />;
}

function imgUrl(u) { return u ? (u.startsWith('/') ? u : `/${u}`) : ''; }

const btn = (bg, fg, extra = {}) => ({
  border: 'none', cursor: 'pointer', borderRadius: 'var(--radius-pill, 99px)',
  padding: '9px 18px', fontSize: 14, fontWeight: 700, fontFamily: 'var(--body)',
  background: bg, color: fg, ...extra,
});

const ghostBtn = {
  border: '1.5px solid var(--line)', cursor: 'pointer', borderRadius: 'var(--radius-pill, 99px)',
  padding: '8px 16px', fontSize: 13.5, fontWeight: 600, fontFamily: 'var(--body)',
  background: 'transparent', color: 'var(--ink-soft)',
};

// ─── Deck list ──────────────────────────────────────────────────────────────────

function DeckCard({ deck, onStudy, onOpen }) {
  return (
    <div
      style={{
        border: '1.5px solid var(--line)', borderRadius: 'var(--radius, 16px)',
        background: 'var(--surface)', padding: 18, display: 'flex', flexDirection: 'column', gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{deck.title}</p>
          {deck.description && (
            <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--ink-faint)', lineHeight: 1.4 }}>{deck.description}</p>
          )}
        </div>
        <span style={{
          flexShrink: 0, fontSize: 11, fontWeight: 700, fontFamily: 'var(--mono)',
          padding: '2px 9px', borderRadius: 99, textTransform: 'uppercase', letterSpacing: '.03em',
          background: deck.is_mine ? 'color-mix(in srgb, var(--accent) 14%, transparent)' : '#eef1f5',
          color: deck.is_mine ? 'var(--accent-ink, var(--accent))' : '#5b6573',
        }}>
          {deck.is_mine ? 'Moj' : 'Učitelj'}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
        <span>{deck.card_count} kartica</span>
        {deck.due_count > 0 && (
          <span style={{ color: 'var(--on-accent, #fff)', background: 'var(--accent)', padding: '1px 9px', borderRadius: 99, fontWeight: 700 }}>
            {deck.due_count} za ponoviti
          </span>
        )}
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={() => onStudy(deck)}
          disabled={deck.card_count === 0}
          style={{ ...btn(deck.card_count === 0 ? 'var(--line)' : 'var(--accent)', 'var(--on-accent, #fff)'), flex: 1, opacity: deck.card_count === 0 ? 0.6 : 1, cursor: deck.card_count === 0 ? 'default' : 'pointer' }}
        >
          Uči
        </button>
        <button onClick={() => onOpen(deck)} style={ghostBtn}>
          {deck.is_mine ? 'Uredi' : 'Pregled'}
        </button>
      </div>
    </div>
  );
}

function DeckList({ decks, onStudy, onOpen, onNew }) {
  const mine = decks.filter(d => d.is_mine);
  const shared = decks.filter(d => !d.is_mine);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 30, color: 'var(--ink)', margin: 0 }}>Kartice</h1>
          <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-faint)' }}>
            Flashcards · uči pametno uz ponavljanje u razmacima
          </p>
        </div>
        <button onClick={onNew} style={btn('var(--accent)', 'var(--on-accent, #fff)')}>+ Novi set</button>
      </div>

      {decks.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--ink-faint)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
          <p style={{ margin: 0, fontSize: 15 }}>Još nemaš nijedan set kartica.</p>
          <p style={{ margin: '4px 0 0', fontSize: 13.5 }}>Klikni „Novi set” da kreiraš prvi.</p>
        </div>
      ) : (
        <>
          {mine.length > 0 && (
            <Section title="Moji setovi">
              <Grid>{mine.map(d => <DeckCard key={d.id} deck={d} onStudy={onStudy} onOpen={onOpen} />)}</Grid>
            </Section>
          )}
          {shared.length > 0 && (
            <Section title="Od učitelja">
              <Grid>{shared.map(d => <DeckCard key={d.id} deck={d} onStudy={onStudy} onOpen={onOpen} />)}</Grid>
            </Section>
          )}
        </>
      )}
    </>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <p style={{ fontSize: 12, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-faint)', margin: '0 0 12px' }}>{title}</p>
      {children}
    </div>
  );
}
function Grid({ children }) {
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>{children}</div>;
}

// ─── Card editor form ─────────────────────────────────────────────────────────

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
    try { setImage(await uploadStudentFlashcardImage(file)); }
    catch (ex) { setErr(ex.message || 'Greška pri uploadu.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', resize: 'vertical', minHeight: 70,
    border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm, 10px)',
    padding: '10px 12px', fontSize: 14.5, lineHeight: 1.6, color: 'var(--ink)',
    fontFamily: 'var(--mono)', background: 'var(--bg)', outline: 'none',
  };

  function submit() {
    if (!front.trim() && !back.trim() && !image) { setErr('Popuni barem jednu stranu.'); return; }
    onSave({ front, back, image_url: image || null });
  }

  return (
    <div style={{ border: '1.5px solid var(--accent)', borderRadius: 'var(--radius, 14px)', background: 'var(--surface)', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={lbl}>Prednja strana (pitanje)</label>
        <textarea value={front} onChange={e => setFront(e.target.value)} style={inputStyle} placeholder="Npr. Koja je formula sumporne kiseline?" />
      </div>
      <div>
        <label style={lbl}>Stražnja strana (odgovor)</label>
        <textarea value={back} onChange={e => setBack(e.target.value)} style={inputStyle} placeholder="Npr. $\ce{H2SO4}$" />
      </div>

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

      <p style={{ margin: 0, fontSize: 11.5, color: 'var(--ink-faint)' }}>
        Podržava formule: <code style={{ fontFamily: 'var(--mono)' }}>$…$</code>, <code style={{ fontFamily: 'var(--mono)' }}>\ce{'{…}'}</code>
      </p>
      {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={ghostBtn} disabled={busy}>Odustani</button>
        <button onClick={submit} style={btn('var(--accent)', 'var(--on-accent, #fff)')} disabled={busy || uploading}>
          {busy ? 'Spremam…' : 'Spremi karticu'}
        </button>
      </div>
    </div>
  );
}

const lbl = { display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 5 };

// ─── Deck detail / editor ──────────────────────────────────────────────────────

function DeckDetail({ deckId, onBack, onStudy, onChanged }) {
  const [data, setData] = useState(null);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getFlashcardDeck(deckId).then(setData).catch(() => setData({ error: true }));
  }, [deckId]);
  useEffect(() => { load(); }, [load]);

  if (!data) return <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam…</p>;
  if (data.error) return <p style={{ color: '#c0392b' }}>Set nije pronađen. <button onClick={onBack} style={ghostBtn}>Natrag</button></p>;

  const { deck, cards } = data;
  const mine = deck.is_mine;

  async function addCard(card) {
    setBusy(true);
    try { await createFlashcard(deck.id, card); setAdding(false); load(); onChanged?.(); }
    finally { setBusy(false); }
  }
  async function saveCard(id, card) {
    setBusy(true);
    try { await updateFlashcard(id, card); setEditingId(null); load(); }
    finally { setBusy(false); }
  }
  async function removeCard(id) {
    if (!window.confirm('Obrisati ovu karticu?')) return;
    await deleteFlashcard(id); load(); onChanged?.();
  }
  async function removeDeck() {
    if (!window.confirm('Obrisati cijeli set i sve kartice?')) return;
    await deleteFlashcardDeck(deck.id); onChanged?.(); onBack();
  }

  return (
    <div>
      <button onClick={onBack} style={{ ...ghostBtn, marginBottom: 16, border: 'none', padding: '4px 0', color: 'var(--ink-faint)' }}>← Svi setovi</button>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
        <div style={{ minWidth: 0 }}>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 28, color: 'var(--ink)', margin: 0 }}>{deck.title}</h1>
          {deck.description && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--ink-faint)' }}>{deck.description}</p>}
          <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>
            {cards.length} kartica{!mine && ' · set učitelja'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          {cards.length > 0 && (
            <button onClick={() => onStudy(deck)} style={btn('var(--accent)', 'var(--on-accent, #fff)')}>Uči</button>
          )}
          {mine && <button onClick={removeDeck} style={{ ...ghostBtn, color: '#c0392b', borderColor: '#e7b8b0' }}>Obriši set</button>}
        </div>
      </div>

      {mine && (
        <div style={{ marginBottom: 16 }}>
          {adding ? (
            <CardForm onSave={addCard} onCancel={() => setAdding(false)} busy={busy} />
          ) : (
            <button onClick={() => setAdding(true)} style={btn('var(--accent)', 'var(--on-accent, #fff)')}>+ Dodaj karticu</button>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.length === 0 && !adding && (
          <p style={{ color: 'var(--ink-faint)', fontSize: 14 }}>Nema kartica{mine ? ' — dodaj prvu iznad.' : '.'}</p>
        )}
        {cards.map(card => (
          editingId === card.id ? (
            <CardForm key={card.id} initial={card} onSave={c => saveCard(card.id, c)} onCancel={() => setEditingId(null)} busy={busy} />
          ) : (
            <div key={card.id} style={{ display: 'flex', gap: 12, border: '1.5px solid var(--line)', borderRadius: 'var(--radius, 12px)', background: 'var(--surface)', padding: 14 }}>
              <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, minWidth: 0 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={miniLbl}>Pitanje</p>
                  <Chem text={card.front} style={{ fontSize: 14.5, color: 'var(--ink)' }} />
                </div>
                <div style={{ minWidth: 0, borderLeft: '1px solid var(--line)', paddingLeft: 14 }}>
                  <p style={miniLbl}>Odgovor</p>
                  <Chem text={card.back} style={{ fontSize: 14.5, color: 'var(--ink)' }} />
                  {card.image_url && <img src={imgUrl(card.image_url)} alt="" style={{ marginTop: 8, maxHeight: 80, maxWidth: '100%', borderRadius: 6 }} />}
                </div>
              </div>
              {mine && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setEditingId(card.id)} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 12.5 }}>Uredi</button>
                  <button onClick={() => removeCard(card.id)} style={{ ...ghostBtn, padding: '5px 12px', fontSize: 12.5, color: '#c0392b', borderColor: '#e7b8b0' }}>Obriši</button>
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  );
}

const miniLbl = { margin: '0 0 4px', fontSize: 10.5, fontWeight: 700, fontFamily: 'var(--mono)', letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ink-faint)' };

// ─── Study mode ─────────────────────────────────────────────────────────────────

const GRADES = [
  { key: 'again', label: 'Ponovi', bg: '#fdecea', fg: '#c0392b' },
  { key: 'hard',  label: 'Teško',  bg: '#fef3db', fg: '#b7791f' },
  { key: 'good',  label: 'Dobro',  bg: '#e7f6f3', fg: '#0f8f86' },
  { key: 'easy',  label: 'Lako',   bg: '#e8f0fe', fg: '#2c5fd6' },
];

function StudyMode({ deck, onExit }) {
  const [queue, setQueue]     = useState(null);   // array of cards
  const [flipped, setFlipped] = useState(false);
  const [done, setDone]       = useState(0);
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getFlashcardStudyQueue(deck.id)
      .then(d => { setQueue(d.cards); setFinished(d.cards.length === 0); })
      .catch(() => { setQueue([]); setFinished(true); });
  }, [deck.id]);

  const current = queue && queue.length ? queue[0] : null;

  async function grade(g) {
    if (!current || submitting) return;
    setSubmitting(true);
    try { await reviewFlashcard(current.id, g.key); } catch { /* keep going offline-tolerant */ }
    setSubmitting(false);

    setQueue(prev => {
      const [first, ...rest] = prev;
      // "Ponovi" recycles the card to the end of this session.
      const next = g.key === 'again' ? [...rest, first] : rest;
      if (next.length === 0) setFinished(true);
      return next;
    });
    if (g.key !== 'again') setDone(d => d + 1);
    setFlipped(false);
  }

  // Keyboard: space flips, 1-4 grade.
  useEffect(() => {
    function onKey(e) {
      if (finished) return;
      if (e.code === 'Space') { e.preventDefault(); setFlipped(f => !f); }
      else if (flipped && ['1', '2', '3', '4'].includes(e.key)) grade(GRADES[Number(e.key) - 1]);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [flipped, finished, current, submitting]); // eslint-disable-line

  if (queue === null) return <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam…</p>;

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <button onClick={onExit} style={{ ...ghostBtn, border: 'none', padding: '4px 0', color: 'var(--ink-faint)' }}>← Izlaz</button>
        <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>{deck.title}</span>
        <span style={{ fontSize: 13, fontFamily: 'var(--mono)', color: 'var(--ink-faint)', minWidth: 70, textAlign: 'right' }}>
          {finished ? '✓' : `${queue.length} u redu`}
        </span>
      </div>

      {finished ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', border: '1.5px solid var(--line)', borderRadius: 'var(--radius, 18px)', background: 'var(--surface)' }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>🎉</div>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 24, color: 'var(--ink)', margin: '0 0 6px' }}>Gotovo za sada!</h2>
          <p style={{ margin: 0, fontSize: 14.5, color: 'var(--ink-faint)' }}>
            {done > 0 ? `Ponovio si ${done} ${done === 1 ? 'karticu' : 'kartica'}.` : 'Nema kartica za ponoviti.'}
          </p>
          <button onClick={onExit} style={{ ...btn('var(--accent)', 'var(--on-accent, #fff)'), marginTop: 22 }}>Natrag na setove</button>
        </div>
      ) : (
        <>
          <div
            onClick={() => setFlipped(f => !f)}
            style={{
              minHeight: 280, border: '1.5px solid var(--line)', borderRadius: 'var(--radius, 18px)',
              background: 'var(--surface)', padding: '34px 28px', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              textAlign: 'center', gap: 16,
            }}
          >
            <span style={{ fontSize: 11, fontFamily: 'var(--mono)', letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--ink-faint)' }}>
              {flipped ? 'Odgovor' : 'Pitanje'}
            </span>
            <Chem text={flipped ? current.back : current.front} style={{ fontSize: 22, lineHeight: 1.5, color: 'var(--ink)' }} />
            {flipped && current.image_url && (
              <img src={imgUrl(current.image_url)} alt="" style={{ maxHeight: 200, maxWidth: '100%', borderRadius: 10 }} />
            )}
            {!flipped && current.image_url && (
              <span style={{ fontSize: 12, color: 'var(--ink-faint)', fontStyle: 'italic' }}>(slika na poleđini)</span>
            )}
          </div>

          <div style={{ marginTop: 18 }}>
            {!flipped ? (
              <button onClick={() => setFlipped(true)} style={{ ...btn('var(--accent)', 'var(--on-accent, #fff)'), width: '100%', padding: '13px' }}>
                Prikaži odgovor <span style={{ opacity: 0.7, fontWeight: 400 }}>(razmak)</span>
              </button>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {GRADES.map((g, i) => (
                  <button key={g.key} onClick={() => grade(g)} disabled={submitting}
                    style={{ ...btn(g.bg, g.fg), padding: '12px 6px', borderRadius: 'var(--radius-sm, 12px)', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span>{g.label}</span>
                    <span style={{ fontSize: 10.5, opacity: 0.6, fontFamily: 'var(--mono)' }}>{i + 1}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FlashcardsPage() {
  const [decks, setDecks]   = useState(null);
  const [view, setView]     = useState({ mode: 'list' });
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => { getFlashcardDecks().then(setDecks).catch(() => setDecks([])); }, []);
  useEffect(() => { load(); }, [load]);

  function goStudy(deck) { setView({ mode: 'study', deck }); }
  function goDeck(deck)  { setView({ mode: 'deck', id: deck.id }); }
  function goList()      { setView({ mode: 'list' }); load(); }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '8px 4px 60px' }}>
      {view.mode === 'list' && (
        decks === null
          ? <p style={{ color: 'var(--ink-faint)', fontFamily: 'var(--mono)', fontSize: 13 }}>Učitavam…</p>
          : <DeckList decks={decks} onStudy={goStudy} onOpen={goDeck} onNew={() => setCreating(true)} />
      )}

      {view.mode === 'deck' && (
        <DeckDetail deckId={view.id} onBack={goList} onStudy={goStudy} onChanged={load} />
      )}

      {view.mode === 'study' && (
        <StudyMode deck={view.deck} onExit={goList} />
      )}

      {creating && (
        <NewDeckModal
          onClose={() => setCreating(false)}
          onCreated={(deck) => { setCreating(false); load(); setView({ mode: 'deck', id: deck.id }); }}
        />
      )}
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
    try { onCreated(await createFlashcardDeck({ title: title.trim(), description: description.trim() })); }
    catch (ex) { setErr(ex.message || 'Greška.'); setBusy(false); }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)', display: 'grid', placeItems: 'center', zIndex: 1000, padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, background: 'var(--surface)', borderRadius: 'var(--radius, 16px)', padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
        <h2 style={{ fontFamily: 'var(--display)', fontSize: 22, color: 'var(--ink)', margin: 0 }}>Novi set kartica</h2>
        <div>
          <label style={lbl}>Naslov</label>
          <input value={title} autoFocus onChange={e => setTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            style={modalInput} placeholder="Npr. Organska kemija — funkcionalne skupine" />
        </div>
        <div>
          <label style={lbl}>Opis (opcionalno)</label>
          <input value={description} onChange={e => setDescription(e.target.value)} onKeyDown={e => e.key === 'Enter' && submit()}
            style={modalInput} placeholder="Kratki opis seta" />
        </div>
        {err && <p style={{ margin: 0, fontSize: 13, color: '#c0392b' }}>{err}</p>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button onClick={onClose} style={ghostBtn} disabled={busy}>Odustani</button>
          <button onClick={submit} style={btn('var(--accent)', 'var(--on-accent, #fff)')} disabled={busy}>{busy ? 'Stvaram…' : 'Stvori'}</button>
        </div>
      </div>
    </div>
  );
}

const modalInput = {
  width: '100%', boxSizing: 'border-box', border: '1.5px solid var(--line)',
  borderRadius: 'var(--radius-sm, 10px)', padding: '10px 12px', fontSize: 14.5,
  color: 'var(--ink)', fontFamily: 'var(--body)', background: 'var(--bg)', outline: 'none',
};
