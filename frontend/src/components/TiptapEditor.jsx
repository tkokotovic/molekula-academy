import { useEffect, useState } from 'react';
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

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function TiptapEditor({ value, onChange, placeholder = 'Počni pisati… (Markdown: # naslov, - lista, > citat)', minHeight = 200 }) {
  const [linkOpen, setLinkOpen] = useState(false);

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

  if (!editor) return null;

  return (
    <div className="tiptap-shell">
      {/* No always-on toolbar (Notion model): markdown shortcuts to create blocks,
          floating SelectionToolbar to format / convert / colour / align / link. */}
      <EditorContent editor={editor} />

      {/* ── Floating select-and-tag toolbar ── */}
      <SelectionToolbar editor={editor} onLink={() => setLinkOpen(true)} />

      {/* ── Dialogs ── */}
      {linkOpen && <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} />}
    </div>
  );
}
