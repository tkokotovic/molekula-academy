import { useState, useEffect, useRef } from 'react';
import SmilesDrawer from 'smiles-drawer';

const CDN_3DMOL = 'https://3dmol.org/build/3Dmol-min.js';

// Load 3Dmol.js once; resolve immediately if already loaded.
function load3Dmol() {
  return new Promise((resolve, reject) => {
    if (window.$3Dmol) { resolve(window.$3Dmol); return; }
    let el = document.querySelector(`script[src="${CDN_3DMOL}"]`);
    if (!el) {
      el = document.createElement('script');
      el.src = CDN_3DMOL;
      document.head.appendChild(el);
    }
    el.addEventListener('load',  () => resolve(window.$3Dmol));
    el.addEventListener('error', reject);
  });
}

function applyStyle($3Dmol, viewer, mode) {
  viewer.removeAllSurfaces();
  viewer.setStyle({}, {});
  if      (mode === 'stick')   viewer.setStyle({}, { stick: {} });
  else if (mode === 'sphere')  viewer.setStyle({}, { sphere: { scale: 0.45 } });
  else if (mode === 'surface') {
    viewer.setStyle({}, { stick: { radius: 0.08 } });
    viewer.addSurface($3Dmol.SurfaceType.VDW, { opacity: 0.72, colorscheme: 'whiteCarbon' });
  }
}

const MODES = [
  { id: '2d',      label: '2D' },
  { id: 'stick',   label: 'Štapići' },
  { id: 'sphere',  label: 'Sfere (CPK)' },
  { id: 'surface', label: 'Površina' },
];

export default function Molecule3dViewer({ smiles: rawSmiles, name, height = 260 }) {
  const smiles = (rawSmiles || '').trim();
  const [mode, setMode] = useState('2d');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const svgRef       = useRef(null);
  const drawer2dRef  = useRef(null);
  const containerRef = useRef(null);
  const viewerRef    = useRef(null);
  const loadedSmiles = useRef(null);

  // ── 2D structural drawing ────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== '2d' || !smiles || !svgRef.current) return;
    if (!drawer2dRef.current) {
      drawer2dRef.current = new SmilesDrawer.SvgDrawer({ width: 320, height });
    }
    SmilesDrawer.parse(
      smiles,
      tree => drawer2dRef.current.draw(tree, svgRef.current, 'light'),
      () => { if (svgRef.current) svgRef.current.innerHTML = ''; }
    );
  }, [smiles, mode, height]);

  // ── 3D viewer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode === '2d' || !smiles) return;
    let alive = true;

    async function run() {
      let $3Dmol;
      try { $3Dmol = await load3Dmol(); }
      catch { if (alive) setError('Nije moguće učitati 3D preglednik'); return; }

      if (!alive || !containerRef.current) return;

      if (!viewerRef.current) {
        viewerRef.current = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'white', antialias: true,
        });
      }
      const viewer = viewerRef.current;

      // Same molecule — just switch style, no new network request
      if (loadedSmiles.current === smiles) {
        applyStyle($3Dmol, viewer, mode);
        viewer.render();
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`PubChem HTTP ${res.status}`);
        const sdf = await res.text();
        if (!alive) return;
        viewer.clear();
        viewer.removeAllSurfaces();
        viewer.addModel(sdf, 'sdf');
        loadedSmiles.current = smiles;
        applyStyle($3Dmol, viewer, mode);
        viewer.zoomTo();
        viewer.render();
        setLoading(false);
      } catch {
        if (!alive) return;
        setError('3D struktura nije dostupna za ovu molekulu — koristite 2D prikaz.');
        setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [smiles, mode]);

  // ── Auto-resize (set up once) ─────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => {
      if (viewerRef.current) viewerRef.current.resize();
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Cleanup on unmount ───────────────────────────────────────────────────
  useEffect(() => () => {
    viewerRef.current = null;
    loadedSmiles.current = null;
  }, []);

  if (!smiles && !name) return null;

  const btnBase = {
    padding: '3px 10px', fontSize: 12, borderRadius: 4, border: '1px solid',
    cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all .12s',
  };

  const is3D = mode !== '2d';

  return (
    <figure style={{ margin: '4px 0', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '16px 16px 12px' }}>

      {/* Fixed-height viewport — both layers always in DOM */}
      <div style={{ position: 'relative', width: '100%', height, background: '#fff', borderRadius: 4 }}>

        {/* 2D SVG layer: hidden in 3D mode via opacity+pointer-events */}
        <svg
          ref={svgRef}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            display: 'block',
            opacity: is3D ? 0 : 1,
            pointerEvents: is3D ? 'none' : 'auto',
            transition: 'opacity .2s',
          }}
        />

        {/* 3D container: always in DOM so WebGL context persists.
            Hidden in 2D mode via opacity+pointer-events (NOT display:none — that
            collapses dimensions and breaks 3Dmol.js measurement). */}
        <div
          ref={containerRef}
          style={{
            position: 'absolute', inset: 0, width: '100%', height: '100%',
            opacity: is3D ? 1 : 0,
            pointerEvents: is3D ? 'auto' : 'none',
            transition: 'opacity .2s',
            // Prevent scroll/select from hijacking 3Dmol.js mouse events
            userSelect: 'none',
            touchAction: 'none',
          }}
        />

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.85)', fontSize: 13, color: 'var(--ink-soft)', zIndex: 2 }}>
            ⏳ Učitavanje 3D strukture…
          </div>
        )}

        {/* No SMILES placeholder */}
        {!smiles && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 36 }}>⚗️</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>SMILES nije definiran</span>
          </div>
        )}

        {/* Error state — only shown in 3D mode */}
        {error && !loading && is3D && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', padding: 16, zIndex: 2 }}>
            <span style={{ fontSize: 28 }}>⚗️</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>{error}</span>
            {smiles && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{smiles}</span>}
          </div>
        )}
      </div>

      {/* Mode toggle buttons */}
      {smiles && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => { setError(null); setMode(m.id); }}
              style={{
                ...btnBase,
                borderColor: mode === m.id ? 'var(--teal)' : 'var(--line)',
                background:  mode === m.id ? 'var(--teal)' : 'transparent',
                color:       mode === m.id ? '#fff' : 'var(--ink-soft)',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {name && (
        <figcaption style={{ marginTop: 8, textAlign: 'center', fontSize: 14, color: 'var(--ink-soft)' }}>
          {name}
        </figcaption>
      )}

      {smiles && (
        <p style={{ margin: '4px 0 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>
          {smiles}
        </p>
      )}
    </figure>
  );
}
