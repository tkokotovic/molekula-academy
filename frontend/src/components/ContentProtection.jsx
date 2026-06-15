import { useEffect } from 'react';

// Student content protection (deterrent-level — web cannot block OS screenshots).
// Used on the student lesson reading view: a per-student tiled watermark plus
// guards against right-click, drag-save, copy/cut and the print/save shortcuts.

function escapeXml(s) {
  return String(s).replace(/[<>&'"]/g, c => (
    { '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]
  ));
}

// Diagonal, tiled name+email overlay. Rendered as a repeating inline-SVG
// background so it tiles perfectly and survives any viewport size. pointer-events
// are off so reading and clicking underneath are unaffected.
export function Watermark({ label }) {
  if (!label) return null;
  const text = escapeXml(label);
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='220'>` +
    `<text x='180' y='110' text-anchor='middle' transform='rotate(-28 180 110)' ` +
    `fill='rgba(11,52,60,0.05)' font-family='monospace' font-size='13'>${text}</text></svg>`;
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 30,
        pointerEvents: 'none',
        backgroundRepeat: 'repeat',
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      }}
    />
  );
}

// Attaches document-level guards while mounted. Scoped to the lesson view, so the
// cleanup on unmount restores normal behaviour everywhere else.
export function useContentGuards(enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const block = e => e.preventDefault();
    const onKey = e => {
      const k = (e.key || '').toLowerCase();
      // Ctrl/Cmd + C(opy) / X(ut) / P(rint) / S(ave) / U(view-source)
      if ((e.ctrlKey || e.metaKey) && ['c', 'x', 'p', 's', 'u'].includes(k)) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', block);
    document.addEventListener('copy', block);
    document.addEventListener('cut', block);
    document.addEventListener('dragstart', block);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('contextmenu', block);
      document.removeEventListener('copy', block);
      document.removeEventListener('cut', block);
      document.removeEventListener('dragstart', block);
      document.removeEventListener('keydown', onKey);
    };
  }, [enabled]);
}
