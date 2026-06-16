// Branded DOCX export for lessons — mirrors the on-screen lesson canvas as
// closely as Word allows: brand-teal palette, signal-block colour boxes,
// rich text from text blocks (bold/italic/lists/inline chem), a logo header,
// a faint molecule watermark behind every page, and a teacher-attribution
// footer for traceability. Kept in sync with the editor SIGNAL palette and
// the student LessonPage renderer.

const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, BorderStyle, AlignmentType, ShadingType, ImageRun, ExternalHyperlink,
  Header, Footer, PageNumber,
} = require('docx');
const sharp = require('sharp');

// ─── Brand palette (hex without #, as docx wants) ────────────────────────────
const DEEP = '0B343C';
const TEAL = '0F8F86';
const INK  = '25302F';
const FAINT = '7A8A86';

// Signal palette — matches editor SIGNAL + student BlockSignal.
const SIGNAL = {
  callout:  { accent: '0F8F86', wash: 'E7F4F0', label: '0F6E56', body: '0B343C', icon: '💡', title: 'Ključna točka' },
  exam_tip: { accent: 'BA7517', wash: 'FAEEDA', label: '854F0B', body: '412402', icon: '🎓', title: 'Savjet za ispit' },
  warning:  { accent: 'D85A30', wash: 'FAECE7', label: '993C1D', body: '4A1B0C', icon: '⚠️', title: 'Upozorenje / česta greška' },
  summary:  { accent: '639922', wash: 'EAF3DE', label: '3B6D11', body: '173404', icon: '📋', title: 'Sažetak' },
};

// ─── Logo / watermark SVGs (locked MolekulaMark geometry) ────────────────────
const HEX = '50,10 84.6,30 84.6,70 50,90 15.4,70 15.4,30';
const M   = '32,68 32,36 50,54 68,36 68,68';

function markSvg(variant) {
  // 'light' = deep hexagon + paper M (for white header); 'watermark' = outline only.
  if (variant === 'watermark') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">`
      + `<polygon points="${HEX}" fill="none" stroke="#0b343c" stroke-width="5"/>`
      + `<polyline points="${M}" fill="none" stroke="#0b343c" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">`
    + `<polygon points="${HEX}" fill="#0b343c"/>`
    + `<polyline points="${M}" fill="none" stroke="#fbfaf6" stroke-width="7.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

async function rasterize(svg, px) {
  return sharp(Buffer.from(svg)).resize(px, px).png().toBuffer();
}

// ─── HTML → docx (rich text) ─────────────────────────────────────────────────

function decodeEntities(s) {
  return (s || '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

// Turn an inline HTML fragment into TextRun[] preserving bold/italic/underline/
// strike/sup/sub/code/highlight + inline chem spans (rendered from data-latex).
function inlineRuns(html, base = {}) {
  const runs = [];
  const style = { bold: false, italics: false, underline: undefined, strike: false,
                  superScript: false, subScript: false, code: false, color: undefined };
  let i = 0;
  const len = html.length;

  const pushText = (txt) => {
    const text = decodeEntities(txt);
    if (!text) return;
    runs.push(new TextRun({
      text, ...base,
      bold: style.bold || base.bold,
      italics: style.italics || base.italics,
      underline: style.underline,
      strike: style.strike,
      superScript: style.superScript,
      subScript: style.subScript,
      color: style.color || base.color,
      font: style.code ? 'Courier New' : base.font,
      shading: style.code ? { type: ShadingType.CLEAR, fill: 'F3F4F6' } : undefined,
    }));
  };

  while (i < len) {
    if (html[i] === '<') {
      const close = html.indexOf('>', i);
      if (close === -1) break;
      const raw = html.slice(i + 1, close).trim();
      i = close + 1;
      const isEnd = raw.startsWith('/');
      const name = raw.replace(/^\//, '').split(/[\s>]/)[0].toLowerCase();

      // Inline chem span → emit its formula (from data-latex) and swallow inner.
      if (!isEnd && name === 'span' && /data-chem/i.test(raw)) {
        const m = raw.match(/data-latex="([^"]*)"/i);
        let formula = m ? decodeEntities(m[1]) : '';
        formula = formula.replace(/\\ce\{([^}]*)\}/g, '$1').replace(/[{}$]/g, '').trim();
        if (formula) runs.push(new TextRun({ text: formula, ...base, font: 'Cambria Math' }));
        // skip to matching </span> accounting for nesting
        let depth = 1;
        while (i < len && depth > 0) {
          const nx = html.indexOf('<', i);
          if (nx === -1) { i = len; break; }
          const cl = html.indexOf('>', nx);
          if (cl === -1) { i = len; break; }
          const t = html.slice(nx + 1, cl).trim();
          if (/^span/i.test(t)) depth++;
          else if (/^\/span/i.test(t)) depth--;
          i = cl + 1;
        }
        continue;
      }

      switch (name) {
        case 'strong': case 'b':       style.bold = !isEnd; break;
        case 'em': case 'i':           style.italics = !isEnd; break;
        case 'u':                      style.underline = isEnd ? undefined : {}; break;
        case 's': case 'strike': case 'del': style.strike = !isEnd; break;
        case 'sup':                    style.superScript = !isEnd; break;
        case 'sub':                    style.subScript = !isEnd; break;
        case 'code':                   style.code = !isEnd; break;
        case 'mark':                   style.color = isEnd ? undefined : '854F0B'; break;
        case 'br':                     runs.push(new TextRun({ break: 1 })); break;
        default: break; // a, span (non-chem), etc. — keep text, drop styling
      }
    } else {
      const nx = html.indexOf('<', i);
      const chunk = nx === -1 ? html.slice(i) : html.slice(i, nx);
      pushText(chunk);
      i = nx === -1 ? len : nx;
    }
  }
  return runs.length ? runs : [new TextRun({ text: '', ...base })];
}

// Turn a text block's full HTML into block-level Paragraphs (p / lists / headings).
function htmlToParagraphs(html) {
  const out = [];
  const blockRe = /<(p|h[1-6]|ul|ol|blockquote|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m, matched = false;
  while ((m = blockRe.exec(html)) !== null) {
    matched = true;
    const tag = m[1].toLowerCase();
    const inner = m[2];
    if (tag === 'ul' || tag === 'ol') {
      const liRe = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;
      let li, idx = 0;
      while ((li = liRe.exec(inner)) !== null) {
        idx++;
        if (tag === 'ul') {
          out.push(new Paragraph({ children: inlineRuns(li[1]), bullet: { level: 0 } }));
        } else {
          out.push(new Paragraph({ children: [new TextRun({ text: `${idx}. `, bold: true }), ...inlineRuns(li[1])], indent: { left: 360 } }));
        }
      }
    } else if (/^h[1-6]$/.test(tag)) {
      const lvl = { h1: HeadingLevel.HEADING_2, h2: HeadingLevel.HEADING_3, h3: HeadingLevel.HEADING_4 }[tag] || HeadingLevel.HEADING_4;
      out.push(new Paragraph({ heading: lvl, children: inlineRuns(inner) }));
    } else if (tag === 'blockquote') {
      out.push(new Paragraph({ children: inlineRuns(inner, { italics: true }), indent: { left: 600 }, border: { left: { style: BorderStyle.THICK, size: 6, color: TEAL } } }));
    } else if (tag === 'pre') {
      out.push(new Paragraph({ children: inlineRuns(inner.replace(/<\/?code[^>]*>/gi, ''), { font: 'Courier New', size: 18 }), shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' } }));
    } else {
      out.push(new Paragraph({ children: inlineRuns(inner) }));
    }
  }
  if (!matched) {
    const txt = html.replace(/<[^>]+>/g, '').trim();
    if (txt) out.push(new Paragraph({ children: inlineRuns(html) }));
  }
  return out;
}

// ─── Signal box (callout / exam_tip / warning / summary) ─────────────────────
function signalBox(type, lines) {
  const s = SIGNAL[type];
  const shading = { type: ShadingType.CLEAR, fill: s.wash };
  const leftBar = { left: { style: BorderStyle.THICK, size: 18, color: s.accent } };
  const paras = [];
  paras.push(new Paragraph({
    shading, border: leftBar,
    spacing: { before: 80 },
    children: [new TextRun({ text: `${s.icon} ${s.title.toUpperCase()}`, bold: true, color: s.label, size: 18 })],
  }));
  lines.forEach((line, idx) => {
    paras.push(new Paragraph({
      shading, border: leftBar,
      spacing: idx === lines.length - 1 ? { after: 80 } : {},
      bullet: line.bullet ? { level: 0 } : undefined,
      children: [new TextRun({ text: line.text, color: s.body })],
    }));
  });
  return paras;
}

// ─── Per-block → Paragraphs ──────────────────────────────────────────────────
function blockToParagraphs(block, allBlocks) {
  const c = typeof block.content === 'string' ? JSON.parse(block.content) : (block.content || {});
  const paras = [];
  const body = (text, opts = {}) => new Paragraph({ children: [new TextRun({ text: String(text || ''), ...opts })] });
  const codeBox = (text) => new Paragraph({
    children: [new TextRun({ text: String(text || ''), font: 'Courier New', size: 18 })],
    border: { left: { style: BorderStyle.THICK, size: 12, color: TEAL } },
    shading: { type: ShadingType.CLEAR, fill: 'F3F4F6' }, indent: { left: 240 },
  });

  switch (block.type) {
    case 'heading': {
      const lvlMap = { 1: HeadingLevel.HEADING_1, 2: HeadingLevel.HEADING_2, 3: HeadingLevel.HEADING_3, 4: HeadingLevel.HEADING_4, 5: HeadingLevel.HEADING_5 };
      paras.push(new Paragraph({ text: c.text || '', heading: lvlMap[c.level || 2] || HeadingLevel.HEADING_2 }));
      break;
    }
    case 'text':
      paras.push(...htmlToParagraphs(c.html || ''));
      break;
    case 'quote':
      paras.push(new Paragraph({ children: [new TextRun({ text: c.text || '', italics: true })], indent: { left: 600 }, border: { left: { style: BorderStyle.THICK, size: 18, color: TEAL } } }));
      if (c.attribution) paras.push(body(`— ${c.attribution}`, { italics: true, color: '6B7280' }));
      break;
    case 'callout': case 'keypoint':
      paras.push(...signalBox('callout', [{ text: c.text || '' }]));
      break;
    case 'exam_tip':
      paras.push(...signalBox('exam_tip', [{ text: c.text || '' }]));
      break;
    case 'warning':
      paras.push(...signalBox('warning', [{ text: c.text || '' }]));
      break;
    case 'summary':
      paras.push(...signalBox('summary', (c.items || []).filter(Boolean).map(t => ({ text: t, bullet: true }))));
      break;
    case 'list': {
      const items = (c.items || []).filter(Boolean);
      items.forEach((it, idx) => {
        if (c.ordered) paras.push(new Paragraph({ children: [new TextRun({ text: `${idx + 1}. `, bold: true }), new TextRun({ text: it })], indent: { left: 360 } }));
        else paras.push(new Paragraph({ text: it, bullet: { level: 0 } }));
      });
      break;
    }
    case 'checklist':
      (c.items || []).forEach(it =>
        paras.push(new Paragraph({ children: [new TextRun({ text: `${it.checked ? '☑' : '☐'} `, color: it.checked ? TEAL : '9CA3AF' }), new TextRun({ text: it.text || '', strike: !!it.checked, color: it.checked ? '6B7280' : INK })] }))
      );
      break;
    case 'toggle':
      paras.push(body(`▸ ${c.title || ''}`, { bold: true, color: DEEP }));
      paras.push(...htmlToParagraphs(c.html || ''));
      break;
    case 'columns': {
      const cols = (c.cols || []);
      if (cols.length) {
        paras.push(new Table({
          width: { size: 9000, type: WidthType.DXA },
          borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE }, insideHorizontal: { style: BorderStyle.NONE }, insideVertical: { style: BorderStyle.NONE } },
          rows: [new TableRow({
            children: cols.map(col => new TableCell({
              width: { size: Math.floor(9000 / cols.length), type: WidthType.DXA },
              margins: { right: 200, left: 0 },
              children: htmlToParagraphs(col?.html || '') .length ? htmlToParagraphs(col?.html || '') : [new Paragraph({})],
            })),
          })],
        }));
      }
      break;
    }
    case 'toc': {
      const headings = (allBlocks || []).filter(b => b.type === 'heading' && (parseContent(b).text || '').trim());
      if (headings.length) {
        paras.push(body('☰ Sadržaj', { bold: true, color: FAINT, size: 18 }));
        headings.forEach(h => {
          const hc = parseContent(h);
          paras.push(new Paragraph({ children: [new TextRun({ text: hc.text })], indent: { left: ((hc.level || 2) - 1) * 300 } }));
        });
      }
      break;
    }
    case 'embed':
      paras.push(new Paragraph({ children: [
        new TextRun({ text: '🔌 Ugradnja: ', bold: true }),
        c.url ? new ExternalHyperlink({ link: c.url, children: [new TextRun({ text: c.caption || c.url, color: TEAL, underline: {} })] }) : new TextRun({ text: c.caption || '' }),
      ] }));
      break;
    case 'divider':
      paras.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'D1D5DB' } } }));
      break;
    case 'equation':
      paras.push(body('Jednadžba (LaTeX):', { bold: true, size: 18, color: DEEP }));
      paras.push(codeBox(c.latex || ''));
      if (c.caption) paras.push(body(c.caption, { italics: true, color: '6B7280', size: 18 }));
      break;
    case 'molecule3d':
      paras.push(body(`Molekula: ${c.name || ''}`, { bold: true, color: DEEP }));
      paras.push(codeBox(`SMILES: ${c.smiles || ''}`));
      break;
    case 'image': case 'gif':
      paras.push(body(`[${block.type === 'gif' ? 'GIF' : 'Slika'}${c.caption ? ': ' + c.caption : ''}]`, { color: '6B7280', italics: true }));
      if (c.url) paras.push(body(c.url, { color: TEAL, size: 18 }));
      break;
    case 'video':
      paras.push(body(`[Video${c.title ? ': ' + c.title : ''}]`, { color: '6B7280', italics: true }));
      if (c.url) paras.push(body(c.url, { color: TEAL, size: 18 }));
      break;
    case 'table': {
      const headers = c.headers || [];
      const rows = c.rows || [];
      if (headers.length > 0) {
        const tableRows = [new TableRow({
          children: headers.map(h => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, color: 'FFFFFF' })] })], shading: { type: ShadingType.CLEAR, fill: TEAL } })),
        })];
        rows.forEach(row => tableRows.push(new TableRow({
          children: (row || []).map(cell => new TableCell({ children: [new Paragraph({ text: String(cell ?? '') })], width: { size: Math.floor(9000 / Math.max(headers.length, 1)), type: WidthType.DXA } })),
        })));
        paras.push(new Table({ rows: tableRows, width: { size: 9000, type: WidthType.DXA } }));
        if (c.caption) paras.push(body(c.caption, { italics: true, color: '6B7280', size: 18 }));
      }
      break;
    }
    case 'link':
      paras.push(new Paragraph({ children: [
        new TextRun({ text: '🔗 ', bold: true }),
        c.url ? new ExternalHyperlink({ link: c.url, children: [new TextRun({ text: c.title || c.url, color: TEAL, underline: {}, bold: true })] }) : new TextRun({ text: c.title || 'Link', bold: true }),
      ] }));
      if (c.description) paras.push(body(c.description, { color: '6B7280', size: 18 }));
      break;
    case 'quiz_link':
      paras.push(body(`🧪 Kviz: ${c.label || ''}`, { bold: true }));
      if (c.description) paras.push(body(c.description, { color: '6B7280', size: 18 }));
      break;
    case 'pdf':
      paras.push(body(`📄 ${c.label || 'PDF dokument'}`, { bold: true }));
      if (c.url) paras.push(body(c.url, { color: TEAL, size: 18 }));
      break;
    case 'python': case 'graph':
      paras.push(body(block.type === 'graph' ? 'Graf:' : 'Python kod:', { bold: true, size: 18, color: DEEP }));
      if (c.code) paras.push(codeBox(c.code));
      if (c.caption) paras.push(body(c.caption, { italics: true, color: '6B7280', size: 18 }));
      break;
    default:
      paras.push(body(`[${block.type}]`, { color: '9CA3AF' }));
  }
  return paras;
}

function parseContent(b) {
  return typeof b.content === 'string' ? JSON.parse(b.content) : (b.content || {});
}

// ─── Document assembly ───────────────────────────────────────────────────────
async function buildLessonDocx(lesson, blocks, teacher) {
  const [logoPng, wmPng] = await Promise.all([
    rasterize(markSvg('light'), 64),
    rasterize(markSvg('watermark'), 600),
  ]);

  // Faint molecule watermark, floating behind text, repeated via the header.
  const watermark = new Paragraph({
    children: [new ImageRun({
      data: wmPng, type: 'png',
      transformation: { width: 380, height: 380 },
      floating: {
        horizontalPosition: { relative: 'page', offset: 1900000 },
        verticalPosition: { relative: 'page', offset: 2400000 },
        behindDocument: true, allowOverlap: true,
      },
    })],
  });

  const header = new Header({
    children: [
      watermark,
      new Paragraph({
        spacing: { after: 60 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DEEP } },
        children: [
          new ImageRun({ data: logoPng, type: 'png', transformation: { width: 16, height: 16 } }),
          new TextRun({ text: '  Molekula Academy', bold: true, color: DEEP, size: 18 }),
        ],
      }),
    ],
  });

  const who = [teacher?.name, teacher?.email].filter(Boolean).join(' · ');
  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { top: { style: BorderStyle.SINGLE, size: 2, color: 'E7E3D7' } },
      children: [new TextRun({
        text: `© Molekula Academy · molekula.academy${who ? '  ·  Izvezao/la: ' + who : ''}  ·  `,
        color: FAINT, size: 16,
      }), new TextRun({ children: ['Str. ', PageNumber.CURRENT], color: FAINT, size: 16 })],
    })],
  });

  const children = [];
  children.push(new Paragraph({ text: lesson.title, heading: HeadingLevel.TITLE }));
  if (lesson.summary) children.push(new Paragraph({ children: [new TextRun({ text: lesson.summary, italics: true, color: '4B5563' })] }));
  children.push(new Paragraph({ border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: DEEP } }, spacing: { after: 160 } }));

  for (const block of blocks) {
    blockToParagraphs(block, blocks).forEach(p => children.push(p));
    children.push(new Paragraph({ spacing: { after: 40 } }));
  }

  const doc = new Document({
    creator: 'Molekula Academy',
    title: lesson.title,
    styles: {
      default: {
        document: { run: { font: 'Calibri', color: INK } },
        title: { run: { font: 'Cambria', size: 52, bold: true, color: DEEP } },
        heading1: { run: { font: 'Cambria', size: 36, bold: true, color: DEEP } },
        heading2: { run: { font: 'Cambria', size: 30, bold: true, color: DEEP } },
        heading3: { run: { font: 'Cambria', size: 26, bold: true, color: DEEP } },
        heading4: { run: { font: 'Cambria', size: 22, bold: true, color: DEEP } },
      },
    },
    sections: [{ properties: {}, headers: { default: header }, footers: { default: footer }, children }],
  });

  return Packer.toBuffer(doc);
}

module.exports = { buildLessonDocx };
