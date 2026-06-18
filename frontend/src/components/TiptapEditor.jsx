import { useEffect, useState, useRef, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import { ActiveEditorContext } from '../contexts/ActiveEditorContext';
import { ChemNode } from './extensions/chem';
import ChemPicker from './ChemPicker';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Superscript from '@tiptap/extension-superscript';
import Subscript from '@tiptap/extension-subscript';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import { TableKit } from '@tiptap/extension-table';
import { uploadImage } from '../api/client';
import './TiptapEditor.css';

// ─── Smart-paste helpers ────────────────────────────────────────────────────────

// Tags we can't represent in a text block — used for the "what dropped" notice.
const UNSUPPORTED_PASTE = ['iframe', 'video', 'audio', 'object', 'embed', 'form'];

function describeDropped(html) {
  if (!html) return null;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const found = new Set();
  UNSUPPORTED_PASTE.forEach(tag => { if (doc.querySelector(tag)) found.add(tag); });
  if (found.size === 0) return null;
  const labels = { iframe: 'ugrađeni okviri', video: 'video', audio: 'audio', object: 'objekti', embed: 'ugrađeni mediji', form: 'obrasci' };
  return [...found].map(t => labels[t] || t).join(', ');
}

// Upload any base64/blob images that landed in the doc after a paste, swapping
// their src for the server URL. Matches nodes by src so positions can shift.
async function uploadPastedImages(editor, onBusy) {
  const srcs = [];
  editor.state.doc.descendants(node => {
    if (node.type.name === 'image' && /^(data:|blob:)/.test(node.attrs.src || '')) srcs.push(node.attrs.src);
  });
  if (srcs.length === 0) return;
  onBusy?.(true);
  for (const src of srcs) {
    try {
      const blob = await (await fetch(src)).blob();
      const file = new File([blob], 'pasted.png', { type: blob.type || 'image/png' });
      const url = await uploadImage(file);
      if (url) {
        editor.state.doc.descendants((n, p) => {
          if (n.type.name === 'image' && n.attrs.src === src) {
            editor.chain().setNodeSelection(p).updateAttributes('image', { src: url }).run();
            return false;
          }
        });
      }
    } catch { /* leave the original src on failure */ }
  }
  onBusy?.(false);
}

// ─── Link dialog ──────────────────────────────────────────────────────────────

function LinkDialog({ editor, onClose }) {
  const [url, setUrl] = useState(editor.getAttributes('link').href || '');

  function apply() {
    if (url.trim()) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url.trim() }).run();
    } else {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    }
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.4)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 20, width: 380, boxShadow: '0 16px 48px rgba(0,0,0,.22)' }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Dodaj / uredi link</p>
        <input
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none', marginBottom: 10 }}
          value={url}
          onChange={e => setUrl(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') apply(); if (e.key === 'Escape') onClose(); }}
          placeholder="https://…"
        />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={apply} style={{ flex: 1, padding: '7px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Spremi</button>
          <button type="button" onClick={() => { editor.chain().focus().unsetLink().run(); onClose(); }} style={{ padding: '7px 14px', background: 'none', border: '1px solid var(--line)', borderRadius: 7, color: '#ef4444', fontSize: 13, cursor: 'pointer' }}>Ukloni</button>
        </div>
      </div>
    </div>
  );
}

// ─── Selection toolbar (select-and-tag) ────────────────────────────────────────
// Notion model: no always-on toolbar. Select text → a dark floating pill appears
// above it to convert the block, format the selection, colour, align, or link.
// Tiptap v3 removed the BubbleMenu React component, so this is a custom portal.

function SelToolBtn({ onRun, active, title, children }) {
  return (
    <button
      type="button"
      title={title}
      onMouseDown={e => e.preventDefault()}   // keep the editor selection alive
      onClick={onRun}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        minWidth: 28, height: 28, padding: '0 7px', border: 'none', cursor: 'pointer',
        background: active ? 'rgba(30,200,182,.22)' : 'transparent',
        color: active ? '#1ec8b6' : '#eaf3f1', borderRadius: 6,
        fontSize: 13, fontWeight: 600, fontFamily: 'var(--body, sans-serif)', lineHeight: 1,
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,.10)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
    >{children}</button>
  );
}

function SelectionToolbar({ editor, onLink }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { state, view } = editor;
      const { from, to, empty } = state.selection;
      // Only for non-empty text selections (skip node/image selections)
      if (empty || from === to || !editor.isEditable || !state.doc.textBetween(from, to).trim()) {
        setPos(null);
        return;
      }
      const start = view.coordsAtPos(from);
      const end = view.coordsAtPos(to);
      setPos({ top: Math.min(start.top, end.top), left: (start.left + end.left) / 2 });
    };
    editor.on('selectionUpdate', update);
    editor.on('transaction', update);
    const onScroll = () => setPos(null);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      editor.off('selectionUpdate', update);
      editor.off('transaction', update);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [editor]);

  if (!pos || !editor) return null;

  const sep = <span style={{ width: 1, height: 18, background: 'rgba(255,255,255,.16)', margin: '0 3px' }} />;

  // Current block type for the convert dropdown
  const blockVal =
    editor.isActive('heading', { level: 1 }) ? 'h1' :
    editor.isActive('heading', { level: 2 }) ? 'h2' :
    editor.isActive('heading', { level: 3 }) ? 'h3' :
    editor.isActive('bulletList')  ? 'ul' :
    editor.isActive('orderedList') ? 'ol' :
    editor.isActive('taskList')    ? 'tl' :
    editor.isActive('blockquote')  ? 'bq' :
    editor.isActive('codeBlock')   ? 'cb' : 'p';

  function convert(v) {
    const c = editor.chain().focus();
    switch (v) {
      case 'p':  c.setParagraph().run(); break;
      case 'h1': c.setHeading({ level: 1 }).run(); break;
      case 'h2': c.setHeading({ level: 2 }).run(); break;
      case 'h3': c.setHeading({ level: 3 }).run(); break;
      case 'ul': c.toggleBulletList().run(); break;
      case 'ol': c.toggleOrderedList().run(); break;
      case 'tl': c.toggleTaskList().run(); break;
      case 'bq': c.toggleBlockquote().run(); break;
      case 'cb': c.toggleCodeBlock().run(); break;
      default: break;
    }
  }

  const align = editor.isActive({ textAlign: 'center' }) ? 'center'
    : editor.isActive({ textAlign: 'right' }) ? 'right'
    : editor.isActive({ textAlign: 'justify' }) ? 'justify' : 'left';
  // Cycle left → center → right → left
  const nextAlign = { left: 'center', center: 'right', right: 'left', justify: 'left' }[align];
  const alignIcon = { left: '⬅', center: '↔', right: '➡', justify: '☰' }[align];

  return createPortal(
    <div
      style={{
        position: 'fixed', top: pos.top - 46, left: pos.left, transform: 'translateX(-50%)',
        zIndex: 500, display: 'flex', alignItems: 'center', gap: 1,
        background: '#0b343c', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10,
        padding: '4px 5px', boxShadow: '0 10px 30px rgba(11,52,60,.35)',
      }}
    >
      <select
        value={blockVal}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => convert(e.target.value)}
        title="Pretvori u…"
        style={{ height: 28, background: 'transparent', color: '#eaf3f1', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
      >
        <option style={{ color: '#0b343c' }} value="p">Tekst</option>
        <option style={{ color: '#0b343c' }} value="h1">H1</option>
        <option style={{ color: '#0b343c' }} value="h2">H2</option>
        <option style={{ color: '#0b343c' }} value="h3">H3</option>
        <option style={{ color: '#0b343c' }} value="ul">• Lista</option>
        <option style={{ color: '#0b343c' }} value="ol">1. Lista</option>
        <option style={{ color: '#0b343c' }} value="tl">☑ Zadaci</option>
        <option style={{ color: '#0b343c' }} value="bq">❝ Citat</option>
        <option style={{ color: '#0b343c' }} value="cb">{'</> Kod'}</option>
      </select>
      {sep}
      <SelToolBtn onRun={() => editor.chain().focus().toggleBold().run()}        active={editor.isActive('bold')}        title="Podebljano"><b>B</b></SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().toggleItalic().run()}      active={editor.isActive('italic')}      title="Kurziv"><i>I</i></SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().toggleUnderline().run()}   active={editor.isActive('underline')}   title="Podcrtano"><u>U</u></SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().toggleStrike().run()}      active={editor.isActive('strike')}      title="Precrtano"><s>S</s></SelToolBtn>
      {sep}
      <SelToolBtn onRun={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Gornji indeks">x²</SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().toggleSubscript().run()}   active={editor.isActive('subscript')}   title="Donji indeks">x₂</SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().toggleCode().run()}        active={editor.isActive('code')}        title="Kod">{'</>'}</SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()} active={editor.isActive('highlight')} title="Označivač"><span style={{ background: '#fef08a', color: '#0b343c', borderRadius: 2, padding: '0 3px' }}>H</span></SelToolBtn>
      {/* Text colour */}
      <label
        title="Boja teksta"
        onMouseDown={e => e.preventDefault()}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 28, height: 28, borderRadius: 6, cursor: 'pointer' }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: '#eaf3f1', borderBottom: `3px solid ${editor.getAttributes('textStyle').color || '#1ec8b6'}`, lineHeight: 1 }}>A</span>
        <input
          type="color"
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
          onChange={e => editor.chain().focus().setColor(e.target.value).run()}
        />
      </label>
      {sep}
      <SelToolBtn onRun={() => editor.chain().focus().setTextAlign(nextAlign).run()} title={`Poravnanje: ${align}`}>{alignIcon}</SelToolBtn>
      <SelToolBtn onRun={() => onLink?.()} active={editor.isActive('link')} title="Link">🔗</SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().unsetAllMarks().run()} title="Ukloni formatiranje">✕</SelToolBtn>
    </div>,
    document.body
  );
}

// ─── In-editor slash menu ───────────────────────────────────────────────────────
// Typing "/" inside a text block opens one menu: inline chem/math + block conversions.

const SLASH_ITEMS = [
  { key: 'ch',    icon: '🧪',  label: 'Kemija (inline)',     kind: 'chem',  tab: 'search', keywords: 'ch kemija chem formula spoj' },
  { key: 'eq',    icon: '∑',   label: 'Jednadžba (math)',    kind: 'chem',  tab: 'manual', math: true, keywords: 'eq math jednadzba formula' },
  { key: 'h1',    icon: 'H1',  label: 'Naslov 1',            run: e => e.chain().focus().setHeading({ level: 1 }).run(), keywords: 'h1 naslov heading' },
  { key: 'h2',    icon: 'H2',  label: 'Naslov 2',            run: e => e.chain().focus().setHeading({ level: 2 }).run(), keywords: 'h2 naslov heading' },
  { key: 'h3',    icon: 'H3',  label: 'Naslov 3',            run: e => e.chain().focus().setHeading({ level: 3 }).run(), keywords: 'h3 naslov heading' },
  { key: 'ul',    icon: '•',   label: 'Lista',               run: e => e.chain().focus().toggleBulletList().run(),     keywords: 'ul lista bullet' },
  { key: 'ol',    icon: '1.',  label: 'Numerirana lista',    run: e => e.chain().focus().toggleOrderedList().run(),    keywords: 'ol numerirana lista numbered' },
  { key: 'task',  icon: '☑',   label: 'Zadaci (checklist)',  run: e => e.chain().focus().toggleTaskList().run(),       keywords: 'task zadaci checklist' },
  { key: 'quote', icon: '❝',   label: 'Citat',               run: e => e.chain().focus().toggleBlockquote().run(),     keywords: 'quote citat' },
  { key: 'code',  icon: '</>', label: 'Blok koda',           run: e => e.chain().focus().toggleCodeBlock().run(),      keywords: 'code kod' },
];

function filterSlash(q) {
  const s = (q || '').trim().toLowerCase();
  if (!s) return SLASH_ITEMS;
  return SLASH_ITEMS.filter(it => it.key.startsWith(s) || it.label.toLowerCase().includes(s) || it.keywords.includes(s));
}

// Detect a "/query" being typed at a word boundary in the current text block.
function detectSlash(editor) {
  const { state } = editor;
  const { from, empty } = state.selection;
  if (!empty) return null;
  const $from = state.selection.$from;
  if (!$from.parent.isTextblock) return null;
  const textBefore = $from.parent.textBetween(0, $from.parentOffset, undefined, '￼');
  const m = /(?:^|\s)\/(\w*)$/.exec(textBefore);
  if (!m) return null;
  return { query: m[1], from: from - m[1].length - 1 };
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function TiptapEditor({ value, onChange, placeholder = 'Počni pisati… ( “/” za blok ili formulu )', minHeight = 200 }) {
  const [linkOpen, setLinkOpen] = useState(false);
  const [slash, setSlash]       = useState(null);  // { query, from, coords }
  const [activeIdx, setActiveIdx] = useState(0);
  const [picker, setPicker]     = useState(null);  // { mode, latex, tab, math }
  const [pasteNote, setPasteNote] = useState(null); // transient toast
  const [uploading, setUploading] = useState(false);

  // Register this editor instance with the sidebar's ActiveEditorContext on focus.
  const activeCtx = useContext(ActiveEditorContext);
  const activeCtxRef = useRef(activeCtx);
  useEffect(() => { activeCtxRef.current = activeCtx; }, [activeCtx]);

  function flashNote(msg) {
    setPasteNote(msg);
    clearTimeout(flashNote._t);
    flashNote._t = setTimeout(() => setPasteNote(null), 6000);
  }

  // refs for keyboard/paste handling inside editorProps (created once)
  const openRef   = useRef(false);
  const itemsRef  = useRef([]);
  const idxRef    = useRef(0);
  const chooseRef = useRef(() => {});
  const editorRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3, 4, 5] },
        code: {},
        codeBlock: {},
        blockquote: {},
        bulletList: {},
        orderedList: {},
        listItem: {},
        horizontalRule: {},
        history: {},
      }),
      Underline,
      Superscript,
      Subscript,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, autolink: true }),
      // allowBase64 so pasted inline images survive into the doc; uploadPastedImages
      // then swaps each data:/blob: src for a server URL.
      Image.configure({ inline: false, allowBase64: true }),
      TaskList,
      TaskItem.configure({ nested: true }),
      TableKit.configure({ table: { resizable: false } }),
      ChemNode,
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    onFocus: ({ editor: ed }) => { activeCtxRef.current?.setActive(ed); },
    onBlur:  ()              => { activeCtxRef.current?.setActive(null); },
    editorProps: {
      attributes: { style: `min-height:${minHeight}px` },
      handlePaste(view, event) {
        const cd = event.clipboardData;
        if (!cd) return false;
        const html = cd.getData('text/html');
        const imageFiles = Array.from(cd.files || []).filter(f => f.type.startsWith('image/'));
        // Pure image paste (screenshot / copied image, no rich text): upload + insert.
        if (imageFiles.length && !html) {
          event.preventDefault();
          setUploading(true);
          (async () => {
            for (const f of imageFiles) {
              try { const url = await uploadImage(f); if (url) editorRef.current?.chain().focus().setImage({ src: url }).run(); }
              catch { /* skip */ }
            }
            setUploading(false);
          })();
          return true;
        }
        // Rich paste: let ProseMirror map the HTML, then upload embedded images
        // and surface a notice for anything we couldn't keep.
        if (html) {
          const dropped = describeDropped(html);
          setTimeout(() => {
            const ed = editorRef.current;
            if (ed) uploadPastedImages(ed, setUploading);
            if (dropped) flashNote(`Zalijepljeno uz formatiranje. Izostavljeno (nije podržano): ${dropped}.`);
          }, 0);
        }
        return false;
      },
      handleDrop(view, event) {
        const files = Array.from(event.dataTransfer?.files || []).filter(f => f.type.startsWith('image/'));
        if (!files.length) return false;
        event.preventDefault();
        setUploading(true);
        (async () => {
          for (const f of files) {
            try { const url = await uploadImage(f); if (url) editorRef.current?.chain().focus().setImage({ src: url }).run(); }
            catch { /* skip */ }
          }
          setUploading(false);
        })();
        return true;
      },
      handleKeyDown(view, event) {
        if (!openRef.current) return false;
        const items = itemsRef.current;
        if (event.key === 'ArrowDown') { setActiveIdx(i => Math.min(i + 1, items.length - 1)); return true; }
        if (event.key === 'ArrowUp')   { setActiveIdx(i => Math.max(i - 1, 0)); return true; }
        if (event.key === 'Enter')     { const it = items[idxRef.current]; if (it) chooseRef.current(it); return true; }
        if (event.key === 'Escape')    { setSlash(null); return true; }
        return false;
      },
    },
  });

  // Sync external value on first mount only
  useEffect(() => {
    if (editor && value && editor.isEmpty) {
      editor.commands.setContent(value);
    }
  }, [editor]);  // eslint-disable-line

  // Detect "/" slash trigger as the user types / moves
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const s = detectSlash(editor);
      if (!s) { setSlash(null); return; }
      let coords = null;
      try { coords = editor.view.coordsAtPos(editor.state.selection.from); } catch { /* */ }
      setSlash({ ...s, coords });
      setActiveIdx(0);
    };
    editor.on('selectionUpdate', update);
    editor.on('update', update);
    return () => { editor.off('selectionUpdate', update); editor.off('update', update); };
  }, [editor]);

  // Open the picker when an existing chem node is clicked
  useEffect(() => {
    if (!editor) return;
    const dom = editor.view.dom;
    const onEdit = () => {
      const attrs = editor.getAttributes('chem');
      setPicker({ mode: 'edit', latex: attrs.latex || '', tab: 'manual' });
    };
    dom.addEventListener('mol-chem-edit', onEdit);
    return () => dom.removeEventListener('mol-chem-edit', onEdit);
  }, [editor]);

  const items = slash ? filterSlash(slash.query) : [];

  function chooseItem(item) {
    if (!editor) return;
    const to = editor.state.selection.from;
    const from = slash?.from;
    if (from != null) editor.chain().focus().deleteRange({ from, to }).run();
    setSlash(null);
    if (item.kind === 'chem') setPicker({ mode: 'insert', tab: item.tab, math: !!item.math });
    else item.run?.(editor);
  }

  // keep refs current for the static handleKeyDown / paste handlers
  openRef.current   = !!slash;
  itemsRef.current  = items;
  idxRef.current    = activeIdx;
  chooseRef.current = chooseItem;
  editorRef.current = editor;

  if (!editor) return null;

  return (
    <div className="tiptap-shell">
      {/* No always-on toolbar (Notion model): "/" slash menu + markdown shortcuts to
          create blocks; floating SelectionToolbar to format / convert / colour / link. */}
      <EditorContent editor={editor} />

      {/* ── Floating select-and-tag toolbar ── */}
      <SelectionToolbar editor={editor} onLink={() => setLinkOpen(true)} />

      {/* ── Slash menu ── */}
      {slash && slash.coords && items.length > 0 && createPortal(
        <div style={{ position: 'fixed', top: slash.coords.bottom + 4, left: slash.coords.left, zIndex: 600, width: 250, maxHeight: 320, overflowY: 'auto', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: '0 16px 48px rgba(11,52,60,.20)', padding: 6 }}>
          {items.map((it, i) => (
            <button key={it.key} type="button"
              onMouseEnter={() => setActiveIdx(i)}
              onMouseDown={e => { e.preventDefault(); chooseItem(it); }}
              style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '8px 11px', border: 'none', borderRadius: 8, cursor: 'pointer', background: i === activeIdx ? 'var(--accent-wash)' : 'transparent', color: 'var(--ink)', fontSize: 14, fontFamily: 'inherit' }}>
              <span style={{ width: 24, textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--ink-soft)' }}>{it.icon}</span>
              <span style={{ flex: 1 }}>{it.label}</span>
              <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--ink-faint)' }}>/{it.key}</span>
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* ── Paste feedback ── */}
      {(uploading || pasteNote) && (
        <div style={{ position: 'sticky', bottom: 8, display: 'flex', justifyContent: 'center', pointerEvents: 'none', zIndex: 50 }}>
          <div style={{ pointerEvents: 'auto', display: 'flex', alignItems: 'center', gap: 8, maxWidth: '90%', background: '#0b343c', color: '#eaf3f1', borderRadius: 10, padding: '8px 14px', fontSize: 13, boxShadow: '0 10px 30px rgba(11,52,60,.3)' }}>
            {uploading
              ? <>⏳ Učitavam slike…</>
              : <><span>ℹ️ {pasteNote}</span><button type="button" onClick={() => setPasteNote(null)} style={{ background: 'none', border: 'none', color: '#9fd5cd', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button></>}
          </div>
        </div>
      )}

      {/* ── Dialogs ── */}
      {linkOpen && <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} />}
      {picker && (
        <ChemPicker
          mode={picker.mode}
          initialLatex={picker.latex || ''}
          initialTab={picker.tab}
          mathDefault={picker.math}
          onInsert={(latex, display) => {
            if (picker.mode === 'edit') editor.chain().focus().updateChem({ latex, display }).run();
            else editor.chain().focus().insertChem({ latex, display }).run();
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  );
}
