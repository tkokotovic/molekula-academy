import { useState, useEffect, useRef, useCallback } from 'react';
import { getChemCompounds, saveChemCompound } from '../api/client';

// Common reaction symbols / states (mhchem source)
const SYMBOLS = [
  ['→',    '\\ce{->}',   'reakcija'],
  ['⇌',    '\\ce{<=>}',  'ravnoteža'],
  ['+',    '\\ce{ + }',  'plus'],
  ['(s)',  '\\ce{(s)}',  'kruto'],
  ['(l)',  '\\ce{(l)}',  'tekuće'],
  ['(g)',  '\\ce{(g)}',  'plin'],
  ['(aq)', '\\ce{(aq)}', 'otopina'],
  ['Δ',    '\\Delta',    'toplina'],
  ['°C',   '^\\circ\\mathrm{C}', 'stupnjevi'],
  ['½',    '\\frac{1}{2}', 'razlomak'],
];

function Preview({ latex, big }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return;
    const k = window.katex;
    if (k && latex) {
      try { k.render(latex, ref.current, { throwOnError: false, displayMode: false }); return; }
      catch { /* fall through */ }
    }
    ref.current.textContent = latex || '';
  }, [latex]);
  return <span ref={ref} style={{ fontSize: big ? 22 : 16, color: 'var(--ink)' }} />;
}

const TABS = [
  { key: 'search', label: 'Spojevi' },
  { key: 'symbols', label: 'Simboli' },
  { key: 'manual', label: 'Ručno' },
];

export default function ChemPicker({ mode = 'insert', initialLatex = '', initialTab, mathDefault = false, onInsert, onClose }) {
  const [tab, setTab]       = useState(initialTab || (mode === 'edit' ? 'manual' : 'search'));
  const [query, setQuery]   = useState('');
  const [results, setResults] = useState([]);
  const [manual, setManual] = useState(initialLatex.replace(/^\\ce\{|\}$/g, () => '') || '');
  const [isChem, setIsChem] = useState(mathDefault ? false : (!initialLatex || initialLatex.includes('\\ce')));
  const [saveName, setSaveName] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);

  // Build final latex from the manual field + chem/math toggle
  const manualLatex = isChem ? `\\ce{${manual}}` : manual;

  // Debounced compound search
  useEffect(() => {
    if (tab !== 'search') return;
    let alive = true;
    const t = setTimeout(async () => {
      try { const r = await getChemCompounds(query); if (alive) { setResults(r); setActiveIdx(0); } }
      catch { if (alive) setResults([]); }
    }, 180);
    return () => { alive = false; clearTimeout(t); };
  }, [query, tab]);

  const insert = useCallback((latex) => {
    if (!latex || !latex.trim()) return;
    onInsert(latex, false);
    onClose();
  }, [onInsert, onClose]);

  function handleSearchKey(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const c = results[activeIdx]; if (c) insert(`\\ce{${c.formula}}`); }
    else if (e.key === 'Escape') { onClose(); }
  }

  async function saveCustom() {
    if (!saveName.trim() || !manual.trim()) return;
    try { await saveChemCompound({ name_hr: saveName.trim(), formula: manual.trim() }); }
    catch { /* non-fatal */ }
    insert(manualLatex);
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(11,52,60,.35)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '14vh' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 14, width: 460, maxWidth: 'calc(100vw - 32px)', boxShadow: '0 24px 64px rgba(11,52,60,.28)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--line)' }}>
          {TABS.map(t => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              style={{ flex: 1, padding: '11px 0', border: 'none', background: tab === t.key ? 'var(--accent-wash)' : 'transparent', color: tab === t.key ? 'var(--accent-ink)' : 'var(--ink-soft)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t.label}
            </button>
          ))}
          <button type="button" onClick={onClose} title="Zatvori" style={{ padding: '0 14px', border: 'none', background: 'transparent', color: 'var(--ink-faint)', fontSize: 20, cursor: 'pointer' }}>×</button>
        </div>

        {/* Search tab */}
        {tab === 'search' && (
          <div style={{ padding: 10 }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} onKeyDown={handleSearchKey}
              placeholder="Traži spoj po imenu… (npr. sumporna kiselina, water, H2SO4)"
              style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none', marginBottom: 8 }} />
            <div style={{ maxHeight: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1 }}>
              {results.length === 0 && <div style={{ padding: '14px 8px', color: 'var(--ink-faint)', fontSize: 13 }}>Nema rezultata. Probaj karticu “Ručno”.</div>}
              {results.map((c, i) => (
                <button key={c.id} type="button" onMouseEnter={() => setActiveIdx(i)} onClick={() => insert(`\\ce{${c.formula}}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', padding: '8px 10px', border: 'none', borderRadius: 8, cursor: 'pointer', background: i === activeIdx ? 'var(--accent-wash)' : 'transparent' }}>
                  <span style={{ minWidth: 70 }}><Preview latex={`\\ce{${c.formula}}`} /></span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 14, color: 'var(--ink)', textTransform: 'capitalize' }}>{c.name_hr}</span>
                    {c.name_en && <span style={{ display: 'block', fontSize: 11, color: 'var(--ink-faint)' }}>{c.name_en}</span>}
                  </span>
                  {c.owner_id == null
                    ? <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>ugrađeno</span>
                    : <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent-ink)' }}>moje</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Symbols tab */}
        {tab === 'symbols' && (
          <div style={{ padding: 12, display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {SYMBOLS.map(([label, latex, hint]) => (
              <button key={latex} type="button" onClick={() => insert(latex)} title={hint}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '10px 4px', border: '1px solid var(--line)', borderRadius: 9, background: 'var(--bg)', cursor: 'pointer' }}>
                <Preview latex={latex} big />
                <span style={{ fontSize: 9, color: 'var(--ink-faint)', fontFamily: 'var(--mono)' }}>{hint}</span>
              </button>
            ))}
          </div>
        )}

        {/* Manual tab */}
        {tab === 'manual' && (
          <div style={{ padding: 12 }}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <button type="button" onClick={() => setIsChem(true)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: `1.5px solid ${isChem ? 'var(--accent)' : 'var(--line)'}`, background: isChem ? 'var(--accent-wash)' : 'var(--bg)', color: isChem ? 'var(--accent-ink)' : 'var(--ink-soft)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>🧪 Kemija \ce{'{…}'}</button>
              <button type="button" onClick={() => setIsChem(false)} style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: `1.5px solid ${!isChem ? 'var(--accent)' : 'var(--line)'}`, background: !isChem ? 'var(--accent-wash)' : 'var(--bg)', color: !isChem ? 'var(--accent-ink)' : 'var(--ink-soft)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>∑ Matematika</button>
            </div>
            <textarea autoFocus value={manual} onChange={e => setManual(e.target.value)}
              placeholder={isChem ? 'H2SO4 + 2NaOH -> Na2SO4 + 2H2O' : '\\frac{1}{2}mv^2'}
              spellCheck={false}
              style={{ width: '100%', boxSizing: 'border-box', minHeight: 64, resize: 'vertical', padding: '9px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 13, fontFamily: 'var(--mono)', outline: 'none' }} />
            <div style={{ background: 'var(--bg)', border: '1px solid var(--line)', borderRadius: 8, padding: '12px 14px', margin: '8px 0', textAlign: 'center', minHeight: 24 }}>
              <Preview latex={manualLatex} big />
            </div>
            <button type="button" onClick={() => insert(manualLatex)} disabled={!manual.trim()}
              style={{ width: '100%', padding: '9px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 14, cursor: manual.trim() ? 'pointer' : 'default', opacity: manual.trim() ? 1 : 0.5 }}>
              {mode === 'edit' ? 'Spremi promjene' : 'Umetni'}
            </button>
            {isChem && mode !== 'edit' && (
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="Spremi u biblioteku kao… (ime spoja)"
                  style={{ flex: 1, boxSizing: 'border-box', padding: '7px 10px', borderRadius: 7, border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 12, outline: 'none' }} />
                <button type="button" onClick={saveCustom} disabled={!saveName.trim() || !manual.trim()}
                  style={{ padding: '7px 12px', border: '1px solid var(--accent)', borderRadius: 7, background: 'var(--bg)', color: 'var(--accent-ink)', fontSize: 12, fontWeight: 700, cursor: (saveName.trim() && manual.trim()) ? 'pointer' : 'default', opacity: (saveName.trim() && manual.trim()) ? 1 : 0.5, whiteSpace: 'nowrap' }}>
                  + Spremi i umetni
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
