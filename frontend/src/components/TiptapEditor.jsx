import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
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
import './TiptapEditor.css';

// ─── SVG icon helpers ─────────────────────────────────────────────────────────

const Icon = ({ d, ...rest }) => (
  <svg viewBox="0 0 24 24" {...rest}>
    <path d={d} />
  </svg>
);

// ─── Toolbar button ───────────────────────────────────────────────────────────

function TB({ onClick, active, disabled, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick?.(); }}
      className={`tt-btn${active ? ' active' : ''}`}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
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

// ─── Image insert dialog ──────────────────────────────────────────────────────

function ImageDialog({ editor, onClose }) {
  const [url, setUrl] = useState('');
  const [alt, setAlt] = useState('');

  function insert() {
    if (url.trim()) {
      editor.chain().focus().setImage({ src: url.trim(), alt: alt.trim() }).run();
    }
    onClose();
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.4)' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 10, padding: 20, width: 400, boxShadow: '0 16px 48px rgba(0,0,0,.22)' }}>
        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Umetni sliku / GIF</p>
        <input
          autoFocus
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none', marginBottom: 8 }}
          value={url} onChange={e => setUrl(e.target.value)}
          placeholder="https://… (URL slike ili GIF-a)"
        />
        {url && <img src={url} alt="" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 6, display: 'block', marginBottom: 8 }} onError={e => e.target.style.display = 'none'} />}
        <input
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, border: '1.5px solid var(--line)', background: 'var(--bg)', color: 'var(--ink)', fontSize: 14, outline: 'none', marginBottom: 10 }}
          value={alt} onChange={e => setAlt(e.target.value)}
          placeholder="Alt tekst (neobavezno)"
        />
        <button type="button" onClick={insert} style={{ width: '100%', padding: '8px 0', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 7, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Umetni sliku</button>
      </div>
    </div>
  );
}

// ─── Selection toolbar (select-and-tag) ────────────────────────────────────────
// Tiptap v3 removed the BubbleMenu React component, so this is a custom floating
// toolbar: select text → a dark pill appears above it to tag/format the selection.

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
  const headingVal =
    editor.isActive('heading', { level: 1 }) ? '1' :
    editor.isActive('heading', { level: 2 }) ? '2' :
    editor.isActive('heading', { level: 3 }) ? '3' : '0';

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
        value={headingVal}
        onMouseDown={e => e.stopPropagation()}
        onChange={e => {
          const lvl = Number(e.target.value);
          if (lvl === 0) editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: lvl }).run();
        }}
        title="Pretvori u…"
        style={{ height: 28, background: 'transparent', color: '#eaf3f1', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', outline: 'none' }}
      >
        <option style={{ color: '#0b343c' }} value="0">Tekst</option>
        <option style={{ color: '#0b343c' }} value="1">H1</option>
        <option style={{ color: '#0b343c' }} value="2">H2</option>
        <option style={{ color: '#0b343c' }} value="3">H3</option>
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
      {sep}
      <SelToolBtn onRun={() => onLink?.()} active={editor.isActive('link')} title="Link">🔗</SelToolBtn>
      <SelToolBtn onRun={() => editor.chain().focus().unsetAllMarks().run()} title="Ukloni formatiranje">✕</SelToolBtn>
    </div>,
    document.body
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function TiptapEditor({ value, onChange, placeholder = 'Počni pisati…', minHeight = 200 }) {
  const [linkOpen,  setLinkOpen]  = useState(false);
  const [imgOpen,   setImgOpen]   = useState(false);
  const [enumerated, setEnumerated] = useState(false);

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
      Image.configure({ inline: false, allowBase64: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        style: `min-height:${minHeight}px`,
      },
    },
  });

  // Sync external value on first mount only
  useEffect(() => {
    if (editor && value && editor.isEmpty) {
      editor.commands.setContent(value);
    }
  }, [editor]);  // eslint-disable-line

  const can = useCallback((cmd) => {
    if (!editor) return false;
    try { return editor.can().chain().focus()[cmd]().run(); }
    catch { return false; }
  }, [editor]);

  if (!editor) return null;

  // Current block type label
  function currentBlockLabel() {
    if (editor.isActive('heading', { level: 1 })) return 'H1';
    if (editor.isActive('heading', { level: 2 })) return 'H2';
    if (editor.isActive('heading', { level: 3 })) return 'H3';
    if (editor.isActive('heading', { level: 4 })) return 'H4';
    if (editor.isActive('heading', { level: 5 })) return 'H5';
    if (editor.isActive('bulletList'))  return '• Lista';
    if (editor.isActive('orderedList')) return '1. Lista';
    if (editor.isActive('taskList'))    return '☑ Zadaci';
    if (editor.isActive('blockquote'))  return '" Citat';
    if (editor.isActive('codeBlock'))   return '</> Kod';
    return 'Paragraf';
  }

  function setHeading(level) {
    if (level === 0) editor.chain().focus().setParagraph().run();
    else editor.chain().focus().toggleHeading({ level }).run();
  }

  return (
    <div className={`tiptap-shell${enumerated ? ' tiptap-enumerated' : ''}`}>
      {/* ── Toolbar ── */}
      <div className="tiptap-toolbar">

        {/* Block type */}
        <select
          className="tt-select"
          value={
            editor.isActive('heading', {level:1}) ? '1' :
            editor.isActive('heading', {level:2}) ? '2' :
            editor.isActive('heading', {level:3}) ? '3' :
            editor.isActive('heading', {level:4}) ? '4' :
            editor.isActive('heading', {level:5}) ? '5' : '0'
          }
          onChange={e => setHeading(Number(e.target.value))}
          title="Razina naslova"
        >
          <option value="0">Paragraf</option>
          <option value="1">H1 — Glavni naslov</option>
          <option value="2">H2 — Naslov poglavlja</option>
          <option value="3">H3 — Podnaslov</option>
          <option value="4">H4 — Naslov 4</option>
          <option value="5">H5 — Naslov 5</option>
        </select>

        <TB
          onClick={() => setEnumerated(e => !e)}
          active={enumerated}
          title="Numerirani naslovi (1.1, 1.2…)"
        >
          #
        </TB>

        <div className="tiptap-toolbar-sep" />

        {/* Inline formatting */}
        <TB onClick={() => editor.chain().focus().toggleBold().run()}      active={editor.isActive('bold')}      title="Podebljano (Ctrl+B)"><b>B</b></TB>
        <TB onClick={() => editor.chain().focus().toggleItalic().run()}    active={editor.isActive('italic')}    title="Kurziv (Ctrl+I)"><i>I</i></TB>
        <TB onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Podcrtano (Ctrl+U)"><u>U</u></TB>
        <TB onClick={() => editor.chain().focus().toggleStrike().run()}    active={editor.isActive('strike')}    title="Precrtan"><s>S</s></TB>

        <div className="tiptap-toolbar-sep" />

        <TB onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive('superscript')} title="Gornji indeks">x²</TB>
        <TB onClick={() => editor.chain().focus().toggleSubscript().run()}   active={editor.isActive('subscript')}   title="Donji indeks">x₂</TB>

        <div className="tiptap-toolbar-sep" />

        {/* Colour */}
        <label className="tt-btn" title="Boja teksta" style={{ padding: '2px 4px', cursor: 'pointer' }}>
          <span style={{ fontSize: 13, fontWeight: 700, borderBottom: `3px solid ${editor.getAttributes('textStyle').color || 'var(--ink)'}` }}>A</span>
          <input
            type="color"
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            onChange={e => editor.chain().focus().setColor(e.target.value).run()}
          />
        </label>

        {/* Highlight */}
        <label className="tt-btn" title="Označivač" style={{ padding: '2px 4px', cursor: 'pointer' }}>
          <span style={{ fontSize: 13, background: editor.getAttributes('highlight').color || 'var(--accent-wash)', padding: '1px 4px', borderRadius: 3 }}>H</span>
          <input
            type="color"
            defaultValue="#fef08a"
            style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
            onChange={e => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
          />
        </label>

        <div className="tiptap-toolbar-sep" />

        {/* Lists */}
        <TB onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive('bulletList')}  title="Lista s točkama">• list</TB>
        <TB onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')} title="Numerirana lista">1. list</TB>
        <TB onClick={() => editor.chain().focus().toggleTaskList().run()}    active={editor.isActive('taskList')}    title="Lista zadataka">☑</TB>

        <div className="tiptap-toolbar-sep" />

        {/* Blocks */}
        <TB onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive('blockquote')} title="Citat">"</TB>
        <TB onClick={() => editor.chain().focus().toggleCodeBlock().run()}  active={editor.isActive('codeBlock')}  title="Blok koda">&lt;/&gt;</TB>
        <TB onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontalna crta">—</TB>

        <div className="tiptap-toolbar-sep" />

        {/* Alignment */}
        <TB onClick={() => editor.chain().focus().setTextAlign('left').run()}    active={editor.isActive({textAlign:'left'})}    title="Lijevo">⬤⬤⬤</TB>
        <TB onClick={() => editor.chain().focus().setTextAlign('center').run()}  active={editor.isActive({textAlign:'center'})}  title="Sredina">≡</TB>
        <TB onClick={() => editor.chain().focus().setTextAlign('right').run()}   active={editor.isActive({textAlign:'right'})}   title="Desno">⬤⬤</TB>
        <TB onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({textAlign:'justify'})} title="Obostrano">☰</TB>

        <div className="tiptap-toolbar-sep" />

        {/* Link */}
        <TB onClick={() => setLinkOpen(true)} active={editor.isActive('link')} title="Link">🔗</TB>

        {/* Image */}
        <TB onClick={() => setImgOpen(true)} title="Umetni sliku / GIF">🖼</TB>

        <div className="tiptap-toolbar-sep" />

        {/* Undo / redo */}
        <TB onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Poništi (Ctrl+Z)">↩</TB>
        <TB onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Ponovi (Ctrl+Shift+Z)">↪</TB>

        {/* Clear formatting */}
        <TB onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Ukloni formatiranje">✕fmt</TB>
      </div>

      {/* ── Editor content ── */}
      <EditorContent editor={editor} />

      {/* ── Floating select-and-tag toolbar ── */}
      <SelectionToolbar editor={editor} onLink={() => setLinkOpen(true)} />

      {/* ── Word / char count ── */}
      <div style={{ padding: '4px 16px 6px', fontSize: 11, color: 'var(--ink-faint)', fontFamily: 'var(--mono)', borderTop: '1px solid var(--line)', display: 'flex', gap: 12 }}>
        <span>{editor.storage.characterCount?.words?.() ?? editor.getText().trim().split(/\s+/).filter(Boolean).length} riječi</span>
        <span>{editor.getText().length} znakova</span>
        <span style={{ marginLeft: 'auto' }}>{currentBlockLabel()}</span>
      </div>

      {/* ── Dialogs ── */}
      {linkOpen && <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} />}
      {imgOpen  && <ImageDialog editor={editor} onClose={() => setImgOpen(false)} />}
    </div>
  );
}
