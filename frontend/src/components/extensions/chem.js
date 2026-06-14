import { Node, mergeAttributes } from '@tiptap/core';

// ─── Inline chemistry / math node ──────────────────────────────────────────────
// An atomic inline node that stores LaTeX (mhchem \ce{…} or plain math) and renders
// it with KaTeX. Lives inside paragraphs/headings so formulas flow with the text.
//
// Serialization: <span data-chem="<latex>" data-display="true|false" class="mol-chem">
// The span is left empty on save; hydrateChemHtml() fills it with KaTeX markup for
// the static (student / print / preview) render paths. In the editor the NodeView
// renders KaTeX live for WYSIWYG.

function katexInto(el, latex, display) {
  const k = typeof window !== 'undefined' ? window.katex : null;
  if (k) {
    try { el.innerHTML = k.renderToString(latex || '', { throwOnError: false, displayMode: !!display }); return; }
    catch { /* fall through to raw */ }
  }
  el.textContent = latex || '';
}

export const ChemNode = Node.create({
  name: 'chem',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    // rendered:false — we emit our own data-chem/data-display in renderHTML and
    // recover them in parseHTML, so don't auto-serialize raw latex/display attrs.
    return {
      latex:   { default: '', rendered: false },
      display: { default: false, rendered: false },
    };
  },

  parseHTML() {
    return [{
      tag: 'span[data-chem]',
      getAttrs: el => ({
        latex: el.getAttribute('data-chem') || '',
        display: el.getAttribute('data-display') === 'true',
      }),
    }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['span', mergeAttributes(HTMLAttributes, {
      'data-chem': node.attrs.latex || '',
      'data-display': node.attrs.display ? 'true' : 'false',
      class: 'mol-chem',
    })];
  },

  addNodeView() {
    return ({ node, editor, getPos }) => {
      const dom = document.createElement('span');
      dom.className = 'mol-chem';
      dom.contentEditable = 'false';
      dom.style.cursor = 'pointer';
      dom.setAttribute('data-chem', node.attrs.latex || '');
      katexInto(dom, node.attrs.latex, node.attrs.display);
      dom.addEventListener('click', (e) => {
        e.preventDefault();
        if (typeof getPos === 'function') {
          editor.commands.setNodeSelection(getPos());
        }
        // React layer (TiptapEditor) listens for this to open the editor popover
        editor.view.dom.dispatchEvent(new CustomEvent('mol-chem-edit', { bubbles: true }));
      });
      return {
        dom,
        update(updated) {
          if (updated.type.name !== 'chem') return false;
          dom.setAttribute('data-chem', updated.attrs.latex || '');
          katexInto(dom, updated.attrs.latex, updated.attrs.display);
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      insertChem: (attrs) => ({ chain }) =>
        chain().insertContent({ type: 'chem', attrs }).run(),
      updateChem: (attrs) => ({ commands }) =>
        commands.updateAttributes('chem', attrs),
    };
  },
});

// ─── Static hydration ──────────────────────────────────────────────────────────
// Turn saved text-block HTML (with empty <span data-chem>) into rendered KaTeX.
// Safe to call when KaTeX isn't loaded yet (returns input unchanged).
export function hydrateChemHtml(html) {
  if (!html || typeof window === 'undefined') return html || '';
  const k = window.katex;
  if (!k || !html.includes('data-chem')) return html;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  tpl.content.querySelectorAll('span[data-chem]').forEach(span => {
    const latex = span.getAttribute('data-chem') || '';
    const display = span.getAttribute('data-display') === 'true';
    try { span.innerHTML = k.renderToString(latex, { throwOnError: false, displayMode: display }); }
    catch { span.textContent = latex; }
  });
  return tpl.innerHTML;
}
