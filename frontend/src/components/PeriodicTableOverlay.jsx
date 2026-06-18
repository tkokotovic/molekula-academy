import { useState, useEffect, useCallback, useRef } from 'react';
import elements from '../data/elements.json';
import './PeriodicTableOverlay.css';

const CATS = {
  'hydrogen':              '#1e4d7a',
  'alkali-metal':          '#7c2d0a',
  'alkaline-earth-metal':  '#713f12',
  'transition-metal':      '#3730a3',
  'post-transition-metal': '#374151',
  'metalloid':             '#065f46',
  'nonmetal':              '#14532d',
  'halogen':               '#7f1d1d',
  'noble-gas':             '#0c4a6e',
  'lanthanide':            '#581c87',
  'actinide':              '#4c1d95',
};

const CATBORDER = {
  'hydrogen':              '#60a5fa',
  'alkali-metal':          '#fb923c',
  'alkaline-earth-metal':  '#fbbf24',
  'transition-metal':      '#818cf8',
  'post-transition-metal': '#94a3b8',
  'metalloid':             '#34d399',
  'nonmetal':              '#4ade80',
  'halogen':               '#fca5a5',
  'noble-gas':             '#93c5fd',
  'lanthanide':            '#e879f9',
  'actinide':              '#d8b4fe',
};

const CATLABEL = {
  'hydrogen':              'Hydrogen',
  'alkali-metal':          'Alkali metals',
  'alkaline-earth-metal':  'Alkaline earth',
  'transition-metal':      'Transition metals',
  'post-transition-metal': 'Post-transition',
  'metalloid':             'Metalloids',
  'nonmetal':              'Nonmetals',
  'halogen':               'Halogens',
  'noble-gas':             'Noble gases',
  'lanthanide':            'Lanthanides',
  'actinide':              'Actinides',
};

const STATECOLOR = {
  gas:     '#93c5fd',
  liquid:  '#fbbf24',
  solid:   'transparent',
  unknown: '#6b7280',
};

function gridPos(el) {
  if (el.series === 'lanthanide') return { col: 3 + (el.number - 57), row: 9 };
  if (el.series === 'actinide')   return { col: 3 + (el.number - 89), row: 10 };
  return { col: el.group, row: el.period };
}

function StatCard({ label, value, unit }) {
  const empty = value == null || value === '';
  return (
    <div className="pto-stat">
      <div className="pto-stat-label">{label}</div>
      <div className={`pto-stat-val${empty ? ' pto-stat-val--empty' : ''}`}>
        {empty ? '—' : <>{value}<span className="pto-stat-unit"> {unit}</span></>}
      </div>
    </div>
  );
}

export default function PeriodicTableOverlay() {
  const [open, setOpen]         = useState(false);
  const [lang, setLang]         = useState('en');
  const [selected, setSelected] = useState(null);
  const [btnPos, setBtnPos]     = useState({ right: 24, bottom: 24 });

  const hasDragged = useRef(false);
  const dragStart  = useRef({ mouseX: 0, mouseY: 0, right: 24, bottom: 24 });

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key !== 'Escape') return;
      if (selected) setSelected(null);
      else setOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, selected]);

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    hasDragged.current = false;
    dragStart.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      right:  btnPos.right,
      bottom: btnPos.bottom,
    };
    const onMove = (me) => {
      const dx = me.clientX - dragStart.current.mouseX;
      const dy = me.clientY - dragStart.current.mouseY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) hasDragged.current = true;
      setBtnPos({
        right:  Math.max(8, Math.min(window.innerWidth  - 56, dragStart.current.right  - dx)),
        bottom: Math.max(8, Math.min(window.innerHeight - 56, dragStart.current.bottom - dy)),
      });
    };
    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [btnPos]);

  const onBtnClick = useCallback(() => {
    if (!hasDragged.current) setOpen(true);
  }, []);

  return (
    <>
      <button
        className="pto-trigger"
        style={{ right: btnPos.right, bottom: btnPos.bottom }}
        onMouseDown={onMouseDown}
        onClick={onBtnClick}
        title="Periodic Table / Periodni sustav"
        aria-label="Open periodic table"
      >
        ⚗
      </button>

      {open && (
        <div
          className="pto-backdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div className="pto-modal">

            {/* Header */}
            <div className="pto-header">
              <div className="pto-header-l">
                <span className="pto-flask">⚗</span>
                <span>Periodic Table — IB HL</span>
              </div>
              <div className="pto-header-r">
                <div className="pto-lang-toggle">
                  <button className={lang === 'en' ? 'active' : ''} onClick={() => setLang('en')}>EN</button>
                  <button className={lang === 'hr' ? 'active' : ''} onClick={() => setLang('hr')}>HR</button>
                </div>
                <button className="pto-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
              </div>
            </div>

            {/* Legend */}
            <div className="pto-legend">
              {Object.entries(CATLABEL).map(([cat, label]) => (
                <div key={cat} className="pto-leg">
                  <div className="pto-leg-dot" style={{ background: CATBORDER[cat] }} />
                  {label}
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="pto-scroll">
              <div className="pto-grid">
                {elements.map(el => {
                  const { col, row } = gridPos(el);
                  return (
                    <div
                      key={el.number}
                      className={`pto-el${selected?.number === el.number ? ' pto-el--sel' : ''}`}
                      style={{
                        gridColumn: col,
                        gridRow: row,
                        background: CATS[el.category],
                        borderColor: CATBORDER[el.category] + '60',
                      }}
                      onClick={() => setSelected(el)}
                    >
                      <span className="pto-num">{el.number}</span>
                      {el.electronegativity != null && (
                        <span className="pto-en">{el.electronegativity}</span>
                      )}
                      <span className="pto-sym">{el.symbol}</span>
                      <span className="pto-name">{el.name[lang]}</span>
                      <span className="pto-mass">{el.mass}</span>
                      <span className="pto-state" style={{ background: STATECOLOR[el.state] }} />
                    </div>
                  );
                })}
                <div className="pto-placeholder" style={{ gridColumn: 3, gridRow: 6 }}>57–71</div>
                <div className="pto-placeholder" style={{ gridColumn: 3, gridRow: 7 }}>89–103</div>
                <div style={{ gridColumn: '1 / -1', gridRow: 8 }} />
                <div className="pto-series-label" style={{ gridColumn: '1 / span 2', gridRow: 9 }}>
                  Lanthanides<br />57–71
                </div>
                <div className="pto-series-label" style={{ gridColumn: '1 / span 2', gridRow: 10 }}>
                  Actinides<br />89–103
                </div>
              </div>
            </div>

            {/* Detail panel */}
            {selected && (
              <div className="pto-detail">
                <div className="pto-det-header">
                  <div
                    className="pto-det-sym"
                    style={{
                      background: CATS[selected.category],
                      borderLeftColor: CATBORDER[selected.category],
                    }}
                  >
                    {selected.symbol}
                  </div>
                  <div className="pto-det-info">
                    <p className="pto-det-meta">
                      Element {selected.number} · {selected.category.replace(/-/g, ' ')} · {selected.state} at RT
                    </p>
                    <p className="pto-det-name-main">{selected.name[lang]}</p>
                    <p className="pto-det-name-alt">
                      {lang === 'en' ? `HR: ${selected.name.hr}` : `EN: ${selected.name.en}`}
                    </p>
                    <p className="pto-det-cfg">Config: {selected.config}</p>
                  </div>
                  <button
                    className="pto-det-close"
                    onClick={() => setSelected(null)}
                    aria-label="Close detail"
                  >✕</button>
                </div>

                <div className="pto-det-stats">
                  <StatCard label="Atomic mass"       value={selected.mass}              unit="u" />
                  <StatCard label="Electronegativity" value={selected.electronegativity}  unit="Pauling" />
                  <StatCard label="1st IE"            value={selected.ie1}               unit="kJ mol⁻¹" />
                  <StatCard label="Atomic radius"     value={selected.atomic_radius}      unit="pm" />
                  <StatCard
                    label="Ionic radius"
                    value={selected.ionic_radius
                      ? `${selected.ionic_radius.value} (${selected.ionic_radius.ion})`
                      : null}
                    unit="pm"
                  />
                  <StatCard label="Melting pt."       value={selected.melting_point}      unit="°C" />
                  <StatCard label="Boiling pt."       value={selected.boiling_point}      unit="°C" />
                </div>

                <div className="pto-det-fun">
                  <p>{selected.fun[lang]}</p>
                  <p className="pto-det-fun-alt">
                    {lang === 'en' ? selected.fun.hr : selected.fun.en}
                  </p>
                </div>
              </div>
            )}

          </div>
        </div>
      )}
    </>
  );
}
