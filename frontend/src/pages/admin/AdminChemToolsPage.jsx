import { useState, useCallback } from 'react';

// ─── Atomic masses (IUPAC 2021 standard values, g/mol) ────────────────────────

const ELEMENTS = {
  H:  { name: 'Vodik',       nameEn: 'Hydrogen',      mass: 1.008   },
  He: { name: 'Helij',       nameEn: 'Helium',        mass: 4.003   },
  Li: { name: 'Litij',       nameEn: 'Lithium',       mass: 6.941   },
  Be: { name: 'Berilij',     nameEn: 'Beryllium',     mass: 9.012   },
  B:  { name: 'Bor',         nameEn: 'Boron',         mass: 10.81   },
  C:  { name: 'Ugljik',      nameEn: 'Carbon',        mass: 12.011  },
  N:  { name: 'Dušik',       nameEn: 'Nitrogen',      mass: 14.007  },
  O:  { name: 'Kisik',       nameEn: 'Oxygen',        mass: 15.999  },
  F:  { name: 'Fluor',       nameEn: 'Fluorine',      mass: 18.998  },
  Ne: { name: 'Neon',        nameEn: 'Neon',          mass: 20.18   },
  Na: { name: 'Natrij',      nameEn: 'Sodium',        mass: 22.99   },
  Mg: { name: 'Magnezij',    nameEn: 'Magnesium',     mass: 24.305  },
  Al: { name: 'Aluminij',    nameEn: 'Aluminium',     mass: 26.982  },
  Si: { name: 'Silicij',     nameEn: 'Silicon',       mass: 28.086  },
  P:  { name: 'Fosfor',      nameEn: 'Phosphorus',    mass: 30.974  },
  S:  { name: 'Sumpor',      nameEn: 'Sulfur',        mass: 32.06   },
  Cl: { name: 'Klor',        nameEn: 'Chlorine',      mass: 35.45   },
  Ar: { name: 'Argon',       nameEn: 'Argon',         mass: 39.948  },
  K:  { name: 'Kalij',       nameEn: 'Potassium',     mass: 39.098  },
  Ca: { name: 'Kalcij',      nameEn: 'Calcium',       mass: 40.078  },
  Sc: { name: 'Skandij',     nameEn: 'Scandium',      mass: 44.956  },
  Ti: { name: 'Titanij',     nameEn: 'Titanium',      mass: 47.867  },
  V:  { name: 'Vanadij',     nameEn: 'Vanadium',      mass: 50.942  },
  Cr: { name: 'Krom',        nameEn: 'Chromium',      mass: 51.996  },
  Mn: { name: 'Mangan',      nameEn: 'Manganese',     mass: 54.938  },
  Fe: { name: 'Željezo',     nameEn: 'Iron',          mass: 55.845  },
  Co: { name: 'Kobalt',      nameEn: 'Cobalt',        mass: 58.933  },
  Ni: { name: 'Nikal',       nameEn: 'Nickel',        mass: 58.693  },
  Cu: { name: 'Bakar',       nameEn: 'Copper',        mass: 63.546  },
  Zn: { name: 'Cink',        nameEn: 'Zinc',          mass: 65.38   },
  Ga: { name: 'Galij',       nameEn: 'Gallium',       mass: 69.723  },
  Ge: { name: 'Germanij',    nameEn: 'Germanium',     mass: 72.63   },
  As: { name: 'Arsen',       nameEn: 'Arsenic',       mass: 74.922  },
  Se: { name: 'Selen',       nameEn: 'Selenium',      mass: 78.971  },
  Br: { name: 'Brom',        nameEn: 'Bromine',       mass: 79.904  },
  Kr: { name: 'Kripton',     nameEn: 'Krypton',       mass: 83.798  },
  Rb: { name: 'Rubidij',     nameEn: 'Rubidium',      mass: 85.468  },
  Sr: { name: 'Stroncij',    nameEn: 'Strontium',     mass: 87.62   },
  Y:  { name: 'Itrij',       nameEn: 'Yttrium',       mass: 88.906  },
  Zr: { name: 'Cirkonij',    nameEn: 'Zirconium',     mass: 91.224  },
  Nb: { name: 'Niobij',      nameEn: 'Niobium',       mass: 92.906  },
  Mo: { name: 'Molibden',    nameEn: 'Molybdenum',    mass: 95.95   },
  Tc: { name: 'Tehnecij',    nameEn: 'Technetium',    mass: 98      },
  Ru: { name: 'Rutenij',     nameEn: 'Ruthenium',     mass: 101.07  },
  Rh: { name: 'Rodij',       nameEn: 'Rhodium',       mass: 102.906 },
  Pd: { name: 'Paladij',     nameEn: 'Palladium',     mass: 106.42  },
  Ag: { name: 'Srebro',      nameEn: 'Silver',        mass: 107.868 },
  Cd: { name: 'Kadmij',      nameEn: 'Cadmium',       mass: 112.414 },
  In: { name: 'Indij',       nameEn: 'Indium',        mass: 114.818 },
  Sn: { name: 'Kositar',     nameEn: 'Tin',           mass: 118.71  },
  Sb: { name: 'Antimon',     nameEn: 'Antimony',      mass: 121.76  },
  Te: { name: 'Telur',       nameEn: 'Tellurium',     mass: 127.6   },
  I:  { name: 'Jod',         nameEn: 'Iodine',        mass: 126.904 },
  Xe: { name: 'Ksenon',      nameEn: 'Xenon',         mass: 131.293 },
  Cs: { name: 'Cezij',       nameEn: 'Caesium',       mass: 132.905 },
  Ba: { name: 'Barij',       nameEn: 'Barium',        mass: 137.327 },
  La: { name: 'Lantan',      nameEn: 'Lanthanum',     mass: 138.905 },
  Ce: { name: 'Cerij',       nameEn: 'Cerium',        mass: 140.116 },
  Pr: { name: 'Prazeodimij', nameEn: 'Praseodymium',  mass: 140.908 },
  Nd: { name: 'Neodimij',    nameEn: 'Neodymium',     mass: 144.242 },
  Pm: { name: 'Prometij',    nameEn: 'Promethium',    mass: 145     },
  Sm: { name: 'Samarij',     nameEn: 'Samarium',      mass: 150.36  },
  Eu: { name: 'Europij',     nameEn: 'Europium',      mass: 151.964 },
  Gd: { name: 'Gadolinij',   nameEn: 'Gadolinium',    mass: 157.25  },
  Tb: { name: 'Terbij',      nameEn: 'Terbium',       mass: 158.925 },
  Dy: { name: 'Disprozij',   nameEn: 'Dysprosium',    mass: 162.5   },
  Ho: { name: 'Holmij',      nameEn: 'Holmium',       mass: 164.93  },
  Er: { name: 'Erbij',       nameEn: 'Erbium',        mass: 167.259 },
  Tm: { name: 'Tulij',       nameEn: 'Thulium',       mass: 168.934 },
  Yb: { name: 'Iterbij',     nameEn: 'Ytterbium',     mass: 173.045 },
  Lu: { name: 'Lutecij',     nameEn: 'Lutetium',      mass: 174.967 },
  Hf: { name: 'Hafnij',      nameEn: 'Hafnium',       mass: 178.49  },
  Ta: { name: 'Tantal',      nameEn: 'Tantalum',      mass: 180.948 },
  W:  { name: 'Volfram',     nameEn: 'Tungsten',      mass: 183.84  },
  Re: { name: 'Renij',       nameEn: 'Rhenium',       mass: 186.207 },
  Os: { name: 'Osmij',       nameEn: 'Osmium',        mass: 190.23  },
  Ir: { name: 'Iridij',      nameEn: 'Iridium',       mass: 192.217 },
  Pt: { name: 'Platina',     nameEn: 'Platinum',      mass: 195.084 },
  Au: { name: 'Zlato',       nameEn: 'Gold',          mass: 196.967 },
  Hg: { name: 'Živa',        nameEn: 'Mercury',       mass: 200.592 },
  Tl: { name: 'Talij',       nameEn: 'Thallium',      mass: 204.38  },
  Pb: { name: 'Olovo',       nameEn: 'Lead',          mass: 207.2   },
  Bi: { name: 'Bizmut',      nameEn: 'Bismuth',       mass: 208.98  },
  Po: { name: 'Polonij',     nameEn: 'Polonium',      mass: 209     },
  At: { name: 'Astat',       nameEn: 'Astatine',      mass: 210     },
  Rn: { name: 'Radon',       nameEn: 'Radon',         mass: 222     },
  Fr: { name: 'Francij',     nameEn: 'Francium',      mass: 223     },
  Ra: { name: 'Radij',       nameEn: 'Radium',        mass: 226     },
  Ac: { name: 'Aktinij',     nameEn: 'Actinium',      mass: 227     },
  Th: { name: 'Torij',       nameEn: 'Thorium',       mass: 232.038 },
  Pa: { name: 'Protaktinij', nameEn: 'Protactinium',  mass: 231.036 },
  U:  { name: 'Uranij',      nameEn: 'Uranium',       mass: 238.029 },
  Np: { name: 'Neptunij',    nameEn: 'Neptunium',     mass: 237     },
  Pu: { name: 'Plutonij',    nameEn: 'Plutonium',     mass: 244     },
  Am: { name: 'Americij',    nameEn: 'Americium',     mass: 243     },
  Cm: { name: 'Kurij',       nameEn: 'Curium',        mass: 247     },
  Bk: { name: 'Berkelijev',  nameEn: 'Berkelium',     mass: 247     },
  Cf: { name: 'Kalifornij',  nameEn: 'Californium',   mass: 251     },
  Es: { name: 'Ajnštajnij',  nameEn: 'Einsteinium',   mass: 252     },
  Fm: { name: 'Fermij',      nameEn: 'Fermium',       mass: 257     },
  Md: { name: 'Mendelijevij',nameEn: 'Mendelevium',   mass: 258     },
  No: { name: 'Nobelij',     nameEn: 'Nobelium',      mass: 259     },
  Lr: { name: 'Lorencij',    nameEn: 'Lawrencium',    mass: 262     },
};

// ─── Formula parser ───────────────────────────────────────────────────────────

function parseFormula(formula) {
  // Normalise: replace [ ] with ( )
  const f = formula.replace(/\[/g, '(').replace(/\]/g, ')').replace(/\s/g, '');
  let pos = 0;

  function parseGroup() {
    const counts = {};

    while (pos < f.length && f[pos] !== ')') {
      if (f[pos] === '(') {
        pos++; // skip '('
        const inner = parseGroup();
        if (f[pos] !== ')') throw new Error('Neusklađena zagrada');
        pos++; // skip ')'
        const n = parseNum();
        for (const [el, cnt] of Object.entries(inner)) {
          counts[el] = (counts[el] || 0) + cnt * n;
        }
      } else if (/[A-Z]/.test(f[pos])) {
        const el = parseEl();
        if (!(el in ELEMENTS)) throw new Error(`Nepoznati element: ${el}`);
        const n = parseNum();
        counts[el] = (counts[el] || 0) + n;
      } else {
        throw new Error(`Neočekivani znak: "${f[pos]}"`);
      }
    }

    return counts;
  }

  function parseEl() {
    let el = f[pos++];
    while (pos < f.length && /[a-z]/.test(f[pos])) el += f[pos++];
    return el;
  }

  function parseNum() {
    let num = '';
    while (pos < f.length && /[0-9]/.test(f[pos])) num += f[pos++];
    return num ? parseInt(num, 10) : 1;
  }

  const result = parseGroup();
  if (pos !== f.length) throw new Error(`Neočekivani znak: "${f[pos]}"`);
  return result;
}

// ─── Calculation ──────────────────────────────────────────────────────────────

function calculate(formula) {
  if (!formula.trim()) return null;
  const counts = parseFormula(formula.trim());
  const totalAtoms = Object.values(counts).reduce((s, n) => s + n, 0);
  const molarMass = Object.entries(counts).reduce(
    (s, [el, n]) => s + ELEMENTS[el].mass * n, 0
  );
  const rows = Object.entries(counts).map(([el, n]) => {
    const mass = ELEMENTS[el].mass * n;
    return { el, name: ELEMENTS[el].name, nameEn: ELEMENTS[el].nameEn, n, atomicMass: ELEMENTS[el].mass, mass, pct: (mass / molarMass) * 100 };
  });
  return { molarMass, totalAtoms, rows };
}

// ─── Quick examples ───────────────────────────────────────────────────────────

const EXAMPLES = [
  { label: 'Voda', formula: 'H2O' },
  { label: 'NaCl', formula: 'NaCl' },
  { label: 'Glukoza', formula: 'C6H12O6' },
  { label: 'Sumporna kis.', formula: 'H2SO4' },
  { label: 'Ca(OH)₂', formula: 'Ca(OH)2' },
  { label: 'Al₂(SO₄)₃', formula: 'Al2(SO4)3' },
  { label: 'CuSO₄·5H₂O', formula: 'CuSO4' },
  { label: 'Fe₂O₃', formula: 'Fe2O3' },
];

// ─── Styles ───────────────────────────────────────────────────────────────────

const inp = {
  width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 9,
  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)',
  fontSize: 15, fontFamily: 'var(--mono)', outline: 'none',
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminChemToolsPage() {
  const [formula, setFormula] = useState('');
  const [result,  setResult]  = useState(null);
  const [err,     setErr]     = useState('');

  const run = useCallback((f) => {
    const val = f ?? formula;
    if (!val.trim()) { setResult(null); setErr(''); return; }
    try {
      const r = calculate(val);
      setResult(r);
      setErr('');
    } catch (e) {
      setResult(null);
      setErr(e.message);
    }
  }, [formula]);

  function handleKey(e) {
    if (e.key === 'Enter') run();
  }

  function setExample(f) {
    setFormula(f);
    run(f);
  }

  return (
    <div style={{ padding: '32px 40px', maxWidth: 860 }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)', marginBottom: 6 }}>
        Kemijski alati
      </div>
      <div style={{ fontSize: 13.5, color: 'var(--ink-soft)', marginBottom: 28 }}>
        Alati za pripremu nastave i sadržaja.
      </div>

      {/* ── Molar mass calculator ── */}
      <div style={{ background: 'var(--surface)', borderRadius: 14, border: '1px solid var(--line)', padding: 28, marginBottom: 24 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', fontFamily: 'var(--display)', marginBottom: 4 }}>
          Kalkulator molarne mase
        </div>
        <div style={{ fontSize: 13, color: 'var(--ink-soft)', marginBottom: 18 }}>
          Unesi kemijsku formulu molekule ili spoja. Podržani su okrugle i uglate zagrade.
        </div>

        {/* Input row */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            style={{ ...inp, flex: 1, fontSize: 18, padding: '12px 16px', letterSpacing: '.03em' }}
            placeholder="npr. Ca(OH)2 ili Al2(SO4)3"
            value={formula}
            onChange={e => { setFormula(e.target.value); run(e.target.value); }}
            onKeyDown={handleKey}
            autoFocus
            spellCheck={false}
          />
          <button
            onClick={() => run()}
            style={{ padding: '12px 24px', borderRadius: 9, border: 'none', background: 'var(--accent)', color: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }}
          >
            Izračunaj
          </button>
        </div>

        {/* Quick examples */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: result || err ? 20 : 0 }}>
          {EXAMPLES.map(({ label, formula: f }) => (
            <button
              key={f}
              onClick={() => setExample(f)}
              style={{
                padding: '4px 11px', borderRadius: 20, border: '1px solid var(--line)',
                background: formula === f ? 'color-mix(in srgb, var(--accent) 10%, transparent)' : 'var(--bg)',
                color: formula === f ? 'var(--accent)' : 'var(--ink-soft)',
                borderColor: formula === f ? 'color-mix(in srgb, var(--accent) 30%, transparent)' : 'var(--line)',
                cursor: 'pointer', fontSize: 12, fontFamily: 'var(--mono)', fontWeight: 500,
              }}
            >{label} ({f})</button>
          ))}
        </div>

        {/* Error */}
        {err && (
          <div style={{ padding: '10px 14px', background: '#fee2e2', borderRadius: 9, color: '#dc2626', fontSize: 13.5, marginTop: 4 }}>
            Greška: {err}
          </div>
        )}

        {/* Result */}
        {result && (
          <div style={{ marginTop: 4 }}>
            {/* Main number */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '18px 20px', background: 'color-mix(in srgb, var(--accent) 7%, transparent)', borderRadius: 12, border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)', marginBottom: 16 }}>
              <div style={{ fontSize: 38, fontWeight: 800, fontFamily: 'var(--mono)', color: 'var(--accent)', letterSpacing: '-.01em' }}>
                {result.molarMass.toFixed(3)}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>g/mol</div>
                <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Molarna masa · {result.totalAtoms} atoma po molekuli</div>
              </div>
            </div>

            {/* Element breakdown table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--line)' }}>
                  {['Element', 'Naziv', 'Atoma', 'At. masa (g/mol)', 'Doprinos (g/mol)', '% mase'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '7px 10px', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.rows.map(r => (
                  <tr key={r.el} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>{r.el}</td>
                    <td style={{ padding: '9px 10px', color: 'var(--ink)' }}>{r.name} <span style={{ color: 'var(--ink-faint)', fontSize: 12 }}>/ {r.nameEn}</span></td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--ink)' }}>{r.n}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--ink-soft)' }}>{r.atomicMass.toFixed(3)}</td>
                    <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', textAlign: 'right', color: 'var(--ink)', fontWeight: 600 }}>{r.mass.toFixed(3)}</td>
                    <td style={{ padding: '9px 10px', textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                        <div style={{ width: 60, height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
                          <div style={{ width: `${r.pct}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                        </div>
                        <span style={{ fontFamily: 'var(--mono)', color: 'var(--ink-soft)', fontSize: 12.5, minWidth: 42, textAlign: 'right' }}>{r.pct.toFixed(1)}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: 'var(--bg)' }}>
                  <td colSpan={2} style={{ padding: '9px 10px', fontWeight: 700, color: 'var(--ink)', fontSize: 13 }}>Ukupno</td>
                  <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 700, color: 'var(--ink)' }}>
                    {result.totalAtoms}
                  </td>
                  <td />
                  <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 700, color: 'var(--accent)', fontSize: 14 }}>
                    {result.molarMass.toFixed(3)}
                  </td>
                  <td style={{ padding: '9px 10px', fontFamily: 'var(--mono)', textAlign: 'right', fontWeight: 700, color: 'var(--ink-soft)' }}>100.0%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
