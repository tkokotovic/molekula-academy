import { useState, useEffect, useRef } from 'react';
import SmilesDrawer from 'smiles-drawer';

const CDN_3DMOL = 'https://3dmol.org/build/3Dmol-min.js';

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

export default function Molecule3dViewer({ smiles: rawSmiles, name, height = 280 }) {
  const smiles = (rawSmiles || '').trim();
  const [mode, setMode] = useState('2d');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const svgRef          = useRef(null);
  const drawer2dRef     = useRef(null);
  const containerRef    = useRef(null);
  const viewerRef       = useRef(null);
  const loadedSmiles    = useRef(null);

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

      // Create viewer once
      if (!viewerRef.current) {
        viewerRef.current = $3Dmol.createViewer(containerRef.current, {
          backgroundColor: 'white', antialias: true,
        });
      }
      const viewer = viewerRef.current;

      if (loadedSmiles.current === smiles) {
        // Same molecule — just update style
        applyStyle($3Dmol, viewer, mode);
        viewer.render();
        return;
      }

      // Fetch 3D SDF from PubChem
      setLoading(true);
      setError(null);
      try {
        const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/smiles/${encodeURIComponent(smiles)}/SDF?record_type=3d`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
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
        setError('3D struktura nije dostupna za ovu molekulu — pokušajte 2D prikaz.');
        setLoading(false);
      }
    }

    run();
    return () => { alive = false; };
  }, [smiles, mode]);

  // ── Auto-resize ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(() => { if (viewerRef.current && mode !== '2d') viewerRef.current.resize(); });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [mode]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => () => { viewerRef.current = null; loadedSmiles.current = null; }, []);

  if (!smiles && !name) return null;

  const btnBase = {
    padding: '3px 10px', fontSize: 12, borderRadius: 4, border: '1px solid',
    cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'all .12s',
  };

  return (
    <figure style={{ margin: '4px 0', background: 'var(--surface)', border: '1.5px solid var(--line)', borderRadius: 'var(--radius-sm)', padding: '16px 16px 12px' }}>

      <div style={{ position: 'relative', width: '100%', height, background: '#fff', borderRadius: 4, overflow: 'hidden' }}>

        {/* 2D SVG — always in DOM, visibility toggled */}
        <svg
          ref={svgRef}
          width="100%" height={height}
          style={{ display: 'block', position: 'absolute', inset: 0, visibility: mode === '2d' ? 'visible' : 'hidden' }}
        />

        {/* 3D container — always in DOM so viewer persists across mode switches */}
        <div
          ref={containerRef}
          style={{ position: 'absolute', inset: 0, visibility: mode !== '2d' ? 'visible' : 'hidden' }}
        />

        {/* Loading overlay */}
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.85)', fontSize: 13, color: 'var(--ink-soft)', zIndex: 2 }}>
            ⏳ Učitavanje 3D strukture…
          </div>
        )}

        {/* Error / no-SMILES placeholder */}
        {!smiles && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <span style={{ fontSize: 36 }}>⚗️</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)' }}>SMILES nije definiran</span>
          </div>
        )}
        {error && !loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, background: '#fff', padding: 16, zIndex: 2 }}>
            <span style={{ fontSize: 28 }}>⚗️</span>
            <span style={{ fontSize: 12, color: 'var(--ink-faint)', textAlign: 'center' }}>{error}</span>
            {smiles && <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink-faint)' }}>{smiles}</span>}
          </div>
        )}
      </div>

      {/* Mode toggle */}
      {smiles && (
        <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
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
