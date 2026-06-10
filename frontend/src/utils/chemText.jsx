import { useMemo } from 'react';

// Renders free text that may contain inline chemistry / math, using the global
// KaTeX + mhchem already loaded in index.html. Supported delimiters:
//   $$...$$   → display math
//   $...$     → inline math
//   \ce{...}  → mhchem chemistry (subscripts, charges, <=> equilibrium arrows…)
//   \pu{...}  → mhchem physical units
// Everything outside those segments is shown as plain (HTML-escaped) text, so a
// teacher can write "Za SO4 vrijedi: $\ce{SO4^2-}$" and only the formula renders.

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// $$...$$ | $...$ | \ce{ ... } | \pu{ ... }   (\ce/\pu allow one level of nesting)
const PATTERN = /\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$|\\ce\{((?:[^{}]|\{[^{}]*\})*)\}|\\pu\{((?:[^{}]|\{[^{}]*\})*)\}/g;

export function renderChemHtml(text) {
  if (!text) return '';
  const katex = typeof window !== 'undefined' ? window.katex : null;
  if (!katex) return escapeHtml(text); // KaTeX not ready — show raw text

  let out = '';
  let last = 0;
  let m;
  PATTERN.lastIndex = 0;
  while ((m = PATTERN.exec(text)) !== null) {
    out += escapeHtml(text.slice(last, m.index));

    let latex;
    let displayMode = false;
    if (m[1] !== undefined)      { latex = m[1]; displayMode = true; }
    else if (m[2] !== undefined) { latex = m[2]; }
    else if (m[3] !== undefined) { latex = `\\ce{${m[3]}}`; }
    else                         { latex = `\\pu{${m[4]}}`; }

    try {
      out += katex.renderToString(latex, { throwOnError: false, displayMode });
    } catch {
      out += escapeHtml(m[0]); // fall back to the literal source on render error
    }
    last = PATTERN.lastIndex;
  }
  out += escapeHtml(text.slice(last));
  return out;
}

// Inline component. Renders a <span> (so it sits naturally inside bubbles,
// buttons, paragraphs) and inherits the surrounding text colour.
export function ChemText({ text, style, className }) {
  const html = useMemo(() => renderChemHtml(text), [text]);
  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
