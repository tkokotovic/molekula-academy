// puppeteer 25 is ESM-only; lazy-require it inside the launch path so simply
// importing this module (e.g. under Jest, which can't transform ESM) doesn't
// pull it in. Only the actual PDF render needs a browser.

const path = require('path');
const fs   = require('fs');
const katex = require('katex');

// SmilesDrawer bundle inlined from the frontend so PDF rendering works offline.
// Lazily loaded once on first call to renderBlock with a molecule3d block.
let _smilesDrawerSrc = null;
function getSmilesDrawerSrc() {
  if (_smilesDrawerSrc !== null) return _smilesDrawerSrc;
  try {
    const p = path.resolve(__dirname, '../../../../frontend/node_modules/smiles-drawer/dist/smiles-drawer.min.js');
    _smilesDrawerSrc = fs.readFileSync(p, 'utf8');
  } catch {
    _smilesDrawerSrc = '';
  }
  return _smilesDrawerSrc;
}

// ── Brand tokens ─────────────────────────────────────────────────────────────

const B = {
  deep:         '#0b343c',
  accent:       '#0f8f86',
  accentBright: '#1ec8b6',
  accentWash:   '#e7f6f3',
  bg:           '#f5f8f7',
  ink:          '#15252b',
  inkSoft:      '#46585e',
  inkFaint:     '#7d8d92',
  line:         '#e2eae9',
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('hr-HR', { day: 'numeric', month: 'long', year: 'numeric' });
}

function scoreBadge(pct) {
  const cls = pct >= 70 ? 'bdg-hi' : pct >= 50 ? 'bdg-md' : 'bdg-lo';
  return `<span class="bdg ${cls}">${pct}%</span>`;
}

function stars(n) {
  n = Math.max(0, Math.min(5, n || 0));
  return `<span class="stars">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
}

// ── Shared CSS ────────────────────────────────────────────────────────────────

function css() {
  return `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Space+Mono:wght@700&family=Bricolage+Grotesque:wght@700;800&display=swap');
@import url('https://cdn.jsdelivr.net/npm/katex@0.16.10/dist/katex.min.css');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
@page{size:A4;margin:25mm}
html,body{background:#fff}
body{font-family:'DM Sans','Helvetica Neue',Helvetica,Arial,sans-serif;font-size:10.5pt;color:${B.ink};line-height:1.6}

/* Watermark */
.wm{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:0;pointer-events:none;opacity:.055}
.wm-hex{width:200px;height:231px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:${B.accent};display:flex;align-items:center;justify-content:center}
.wm-m{font-family:'Space Mono','Courier New',monospace;font-weight:700;font-size:108px;color:#fff;line-height:1;margin-top:6px}

/* Header */
.hdr{padding:14px 30px 13px;display:flex;align-items:center;justify-content:space-between}
.hdr-dark{background:${B.deep}}
.hdr-light{background:#fff;border-bottom:1.5px solid ${B.line}}
.logo-wrap{display:flex;align-items:center;gap:9px}
.logo-hex{width:26px;height:30px;clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%);background:${B.accent};display:flex;align-items:center;justify-content:center;flex-shrink:0}
.logo-m{font-family:'Space Mono',monospace;font-weight:700;font-size:11px;color:#fff;display:inline-block;transform:scaleX(1.3)}
.wm-dark{font-size:13px;font-weight:700;color:#eaf4f2;letter-spacing:-.02em}
.wm-light{font-size:13px;font-weight:700;color:${B.ink};letter-spacing:-.02em}
.wm-dark small,.wm-light small{display:block;font-size:8.5px;font-weight:400;letter-spacing:.06em;text-transform:uppercase;margin-top:1px}
.wm-dark small{color:#8ab5b0}
.wm-light small{color:${B.inkFaint}}
.hdr-meta{text-align:right}
.dt-dark{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${B.accentBright}}
.dt-light{font-size:9.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:${B.accent}}
.dd-dark{font-size:8.5px;color:#8ab5b0;margin-top:2px}
.dd-light{font-size:8.5px;color:${B.inkFaint};margin-top:2px}
.rule{height:3px;background:linear-gradient(90deg,${B.accent} 0%,${B.accentBright} 55%,transparent 100%)}

/* Content */
.content{padding:16px 0 48px;position:relative;z-index:1;width:100%;box-sizing:border-box}
.mol-3d{text-align:center;margin:8px 0}
.mol-3d-name{font-weight:700;font-size:10pt;color:${B.ink};margin-bottom:6px}
.mol-3d-smiles{font-family:monospace;font-size:8pt;color:${B.inkFaint};margin-top:4px}
.blk-eq-render{text-align:center;padding:10px 16px;background:${B.bg};border:1px solid ${B.line};border-radius:6px;overflow-x:auto}
h1.doc-title{font-family:'Bricolage Grotesque','Georgia',serif;font-size:20pt;font-weight:700;color:${B.ink};letter-spacing:-.02em;margin-bottom:4px}
.doc-sub{font-size:8.5pt;color:${B.inkFaint};letter-spacing:.05em;text-transform:uppercase;font-weight:600;margin-bottom:22px}
hr.div{border:none;border-top:1px solid ${B.line};margin:16px 0}

/* Stat boxes */
.stat-row{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.stat-box{flex:1;min-width:100px;background:${B.bg};border:1px solid ${B.line};border-radius:8px;padding:11px 14px}
.stat-label{font-size:7.5pt;text-transform:uppercase;letter-spacing:.07em;font-weight:700;color:${B.accent};margin-bottom:3px}
.stat-val{font-size:12pt;font-weight:700;color:${B.ink}}

/* Report fields */
.field{margin-bottom:14px}
.fl{font-size:7.5pt;text-transform:uppercase;letter-spacing:.08em;font-weight:700;color:${B.accent};margin-bottom:3px}
.fv{font-size:10.5pt;color:${B.ink};line-height:1.55}
.stars{color:${B.accent};font-size:14pt}
.prob-hi{font-weight:700;color:${B.accent}}
.prob-md{font-weight:700;color:#92650a}
.prob-lo{font-weight:700;color:#9b1c1c}

/* Progress bars */
.pr-row{display:flex;align-items:center;gap:10px;margin-bottom:9px}
.pr-lbl{font-size:9.5pt;color:${B.ink};flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pr-track{width:120px;height:7px;background:${B.line};border-radius:4px;flex-shrink:0}
.pr-fill{height:100%;background:${B.accent};border-radius:4px}
.pr-pct{font-size:8.5pt;color:${B.inkFaint};width:32px;text-align:right;flex-shrink:0}

/* Tables */
table{width:100%;border-collapse:collapse;font-size:9.5pt}
thead th{background:${B.deep};color:#eaf4f2;font-weight:600;font-size:8pt;letter-spacing:.05em;text-transform:uppercase;padding:7px 10px;text-align:left}
tbody td{padding:7px 10px;border-bottom:1px solid ${B.line};vertical-align:middle}
tbody tr:last-child td{border-bottom:none}
tbody tr:nth-child(even) td{background:#f8fbfa}
.bdg{display:inline-block;padding:2px 7px;border-radius:4px;font-size:8.5pt;font-weight:700}
.bdg-hi{background:#e7f6f3;color:${B.accent}}
.bdg-md{background:#fef3cd;color:#92650a}
.bdg-lo{background:#fde8e8;color:#9b1c1c}

/* Lesson blocks */
.blk{margin-bottom:13px}
.blk-h1{font-family:'Bricolage Grotesque',Georgia,serif;font-size:16pt;font-weight:700;color:${B.ink};margin:18px 0 8px}
.blk-h2{font-family:'Bricolage Grotesque',Georgia,serif;font-size:13pt;font-weight:700;color:${B.ink};margin:14px 0 6px}
.blk-h3{font-family:'Bricolage Grotesque',Georgia,serif;font-size:11pt;font-weight:700;color:${B.ink};margin:12px 0 5px}
.blk-text{font-size:10.5pt;line-height:1.72;color:${B.ink}}
.blk-quote{border-left:3px solid ${B.line};padding:8px 14px;color:${B.inkSoft};font-style:italic}
.blk-callout{background:${B.accentWash};border-left:3px solid ${B.accent};padding:10px 14px;border-radius:0 6px 6px 0}
.blk-exam-tip{background:#fef9e7;border-left:3px solid #f4b942;padding:10px 14px;border-radius:0 6px 6px 0}
.blk-warning{background:#fde8e8;border-left:3px solid #e53e3e;padding:10px 14px;border-radius:0 6px 6px 0}
.blk-summary{background:#eef5ff;border-left:3px solid #2563d8;padding:10px 14px;border-radius:0 6px 6px 0}
.blk-eq{font-family:'Space Mono',monospace;font-size:11pt;background:${B.bg};border:1px solid ${B.line};padding:10px 16px;border-radius:6px;text-align:center;word-break:break-all}
.blk-divider{border:none;border-top:1px solid ${B.line};margin:16px 0}
.blk-img{max-width:100%;border-radius:6px}
.blk-skip{color:${B.inkFaint};font-size:9pt;font-style:italic}

/* Footer */
.footer{position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1.5px solid ${B.line};padding:7px 30px;display:flex;align-items:center;justify-content:space-between;z-index:10}
.fl-l{font-size:7.5pt;color:${B.inkFaint}}
.fl-c{font-size:7.5pt;color:${B.accent};font-weight:700;letter-spacing:.05em}
.fl-r{font-size:7.5pt;color:${B.inkFaint}}
`;
}

// ── HTML shell ────────────────────────────────────────────────────────────────

function shell(style, docType, dateStr, body) {
  const isDark   = style === 'dark';
  const hdrCls   = isDark ? 'hdr hdr-dark' : 'hdr hdr-light';
  const wmCls    = isDark ? 'wm-dark' : 'wm-light';
  const dtCls    = isDark ? 'dt-dark' : 'dt-light';
  const ddCls    = isDark ? 'dd-dark' : 'dd-light';

  const smilesJs = getSmilesDrawerSrc();
  return `<!DOCTYPE html>
<html lang="hr">
<head>
<meta charset="UTF-8">
<style>${css()}</style>
${smilesJs ? `<script>${smilesJs}</script>` : ''}
</head>
<body>
<div class="wm"><div class="wm-hex"><span class="wm-m">M</span></div></div>
<div class="${hdrCls}">
  <div class="logo-wrap">
    <div class="logo-hex"><span class="logo-m">M</span></div>
    <div class="${wmCls}">Molekula Academy<small>Online chemistry tutoring</small></div>
  </div>
  <div class="hdr-meta">
    <div class="${dtCls}">${docType}</div>
    <div class="${ddCls}">${dateStr}</div>
  </div>
</div>
<div class="rule"></div>
<div class="content">${body}</div>
<div class="footer">
  <span class="fl-l">molekula-academy.hr</span>
  <span class="fl-c">MOLEKULA ACADEMY</span>
  <span class="fl-r">Stranica 1</span>
</div>
${smilesJs ? `<script>
(function() {
  document.querySelectorAll('svg.mol-svg[data-smiles]').forEach(function(el) {
    try {
      var drawer = new SmilesDrawer.SvgDrawer({ width: 360, height: 260 });
      SmilesDrawer.parse(el.getAttribute('data-smiles'), function(tree) {
        drawer.draw(tree, el, 'light');
      }, function() {});
    } catch(e) {}
  });
})();
</script>` : ''}
</body>
</html>`;
}

// ── Document builders ─────────────────────────────────────────────────────────

function buildParentReport(student, courses, quizHistory, fields) {
  const { effort, goal, probability, additional_effort, mock_results, personal_note } = fields;

  const courseRows = courses.map(c => {
    const pct = c.total_lessons > 0 ? Math.round(c.completed_lessons / c.total_lessons * 100) : 0;
    return `<div class="pr-row">
      <span class="pr-lbl">${esc(c.title)}</span>
      <div class="pr-track"><div class="pr-fill" style="width:${pct}%"></div></div>
      <span class="pr-pct">${pct}%</span>
    </div>`;
  }).join('');

  const quizRows = quizHistory.map(q => {
    const pct = q.max_score > 0 ? Math.round(q.score / q.max_score * 100) : 0;
    return `<tr>
      <td>${esc(q.quiz_title)}</td>
      <td>${new Date(q.submitted_at).toLocaleDateString('hr-HR')}</td>
      <td>${scoreBadge(pct)}</td>
    </tr>`;
  }).join('');

  const probClass = probability === 'Visoka' ? 'prob-hi' : probability === 'Srednja' ? 'prob-md' : 'prob-lo';
  const planName  = student.subscription_tier === 'premium' ? 'Premium' : 'Basic';

  return `
<h1 class="doc-title">${esc(student.name)}</h1>
<div class="doc-sub">Izvještaj za roditelje · ${planName} · ${fmtDate(new Date().toISOString())}</div>

<div class="field">
  <div class="fl">Zalaganje</div>
  <div class="fv">${stars(effort)}</div>
</div>
${goal ? `<div class="field"><div class="fl">Cilj studenta</div><div class="fv">${esc(goal)}</div></div>` : ''}

<hr class="div">

<div class="field">
  <div class="fl">Napredak po tečajevima</div>
  <div class="fv">${courseRows || '<em style="color:#7d8d92">Nije upisan ni u jedan tečaj.</em>'}</div>
</div>

${quizRows ? `<div class="field">
  <div class="fl">Rezultati kvizova (zadnji)</div>
  <table><thead><tr><th>Kviz</th><th>Datum</th><th>Rezultat</th></tr></thead>
  <tbody>${quizRows}</tbody></table>
</div>` : ''}

<hr class="div">

<div class="field">
  <div class="fl">Procjena vjerojatnosti uspjeha</div>
  <div class="fv"><span class="${probClass}">${esc(probability || 'Visoka')} ✓</span></div>
</div>
${additional_effort ? `<div class="field"><div class="fl">Preporučeni dodatni trud</div><div class="fv">${esc(additional_effort)}</div></div>` : ''}
${mock_results ? `<div class="field"><div class="fl">Rezultati probnih ispita</div><div class="fv">${esc(mock_results)}</div></div>` : ''}
${personal_note ? `<hr class="div"><div class="field"><div class="fl">Osobna napomena profesora</div><div class="fv">${esc(personal_note)}</div></div>` : ''}

<hr class="div">
<div style="font-size:8pt;color:#7d8d92">
  Datum ispita: ${fmtDate(student.exam_date)} · Email: ${esc(student.email)}
</div>
`;
}

function buildProgressReport(student, courses, quizHistory, homeworks) {
  const planName = student.subscription_tier === 'premium' ? 'Premium' : 'Basic';
  const submitted = homeworks.filter(h => h.status !== 'assigned').length;
  const corrected = homeworks.filter(h => h.status === 'corrected').length;
  const hwStr = homeworks.length > 0
    ? `${submitted}/${homeworks.length} predano · ${corrected} ispravljeno`
    : 'Nema zadaća';

  const avgPct = quizHistory.length > 0
    ? Math.round(quizHistory.reduce((s, q) => s + (q.max_score > 0 ? q.score / q.max_score * 100 : 0), 0) / quizHistory.length)
    : null;

  const courseRows = courses.map(c => {
    const pct = c.total_lessons > 0 ? Math.round(c.completed_lessons / c.total_lessons * 100) : 0;
    return `<div class="pr-row">
      <span class="pr-lbl">${esc(c.title)}</span>
      <div class="pr-track"><div class="pr-fill" style="width:${pct}%"></div></div>
      <span class="pr-pct">${pct}%</span>
    </div>`;
  }).join('');

  const quizRows = quizHistory.map(q => {
    const pct = q.max_score > 0 ? Math.round(q.score / q.max_score * 100) : 0;
    return `<tr>
      <td>${esc(q.quiz_title)}</td>
      <td style="text-align:center">${scoreBadge(pct)}</td>
      <td style="color:#7d8d92">${new Date(q.submitted_at).toLocaleDateString('hr-HR')}</td>
    </tr>`;
  }).join('');

  return `
<h1 class="doc-title">${esc(student.name)}</h1>
<div class="doc-sub">Interni izvještaj o napretku · ${planName} · ${fmtDate(new Date().toISOString())}</div>

<div class="stat-row">
  <div class="stat-box"><div class="stat-label">Plan</div><div class="stat-val">${planName}</div></div>
  <div class="stat-box"><div class="stat-label">Datum ispita</div><div class="stat-val" style="font-size:10pt">${student.exam_date ? fmtDate(student.exam_date) : '—'}</div></div>
  <div class="stat-box"><div class="stat-label">Kvizovi</div><div class="stat-val">${quizHistory.length}</div></div>
  ${avgPct !== null ? `<div class="stat-box"><div class="stat-label">Prosj. rezultat</div><div class="stat-val">${avgPct}%</div></div>` : ''}
  <div class="stat-box"><div class="stat-label">Zadaće</div><div class="stat-val" style="font-size:9pt">${hwStr}</div></div>
</div>

<div class="field">
  <div class="fl">Napredak po tečajevima</div>
  ${courseRows || '<div style="color:#7d8d92;font-size:9.5pt">Nije upisan ni u jedan tečaj.</div>'}
</div>

<hr class="div">

<div class="field">
  <div class="fl">Povijest kvizova</div>
  ${quizRows
    ? `<table>
        <thead><tr><th>Kviz</th><th>Rezultat</th><th>Datum</th></tr></thead>
        <tbody>${quizRows}</tbody>
      </table>`
    : '<div style="color:#7d8d92;font-size:9.5pt">Nema riješenih kvizova.</div>'}
</div>
`;
}

function buildLesson(lesson, topicTitle, courseTitle, blocks) {
  const body = blocks.map(renderBlock).join('\n');
  const sub  = [courseTitle, topicTitle].filter(Boolean).join(' · ');
  return `
<h1 class="doc-title">${esc(lesson.title || 'Lekcija')}</h1>
${sub ? `<div class="doc-sub">${esc(sub)}</div>` : ''}
${body}
`;
}

function renderBlock(b) {
  const c = b.content;
  switch (b.type) {
    case 'heading':
      return `<div class="blk blk-h${c.level === 2 ? 2 : c.level === 3 ? 3 : 1}">${c.text || ''}</div>`;
    case 'text':
      return `<div class="blk blk-text">${c.html || esc(c.text || '')}</div>`;
    case 'quote':
      return `<div class="blk blk-quote">${esc(c.text || '')}</div>`;
    case 'callout':
      return `<div class="blk blk-callout">${c.html || esc(c.text || '')}</div>`;
    case 'exam_tip':
      return `<div class="blk blk-exam-tip"><strong>📝 Naputak za ispit:</strong><br>${c.html || esc(c.text || '')}</div>`;
    case 'warning':
      return `<div class="blk blk-warning"><strong>⚠️ Upozorenje:</strong><br>${c.html || esc(c.text || '')}</div>`;
    case 'summary':
      return `<div class="blk blk-summary"><strong>📋 Sažetak:</strong><br>${c.html || esc(c.text || '')}</div>`;
    case 'equation':
    case 'formula': {
      const latex = c.latex || c.text || '';
      let rendered = '';
      if (latex) {
        try { rendered = katex.renderToString(latex, { throwOnError: false, displayMode: true }); }
        catch { rendered = `<code>${esc(latex)}</code>`; }
      }
      return `<div class="blk blk-eq-render">${rendered || esc(latex)}${c.caption ? `<div style="font-size:8.5pt;color:${B.inkFaint};margin-top:4px;font-style:italic">${esc(c.caption)}</div>` : ''}</div>`;
    }
    case 'divider':
      return `<hr class="blk-divider">`;
    case 'image':
      return c.url ? `<div class="blk"><img class="blk-img" src="${esc(c.url)}" alt="${esc(c.caption||'')}">
        ${c.caption ? `<div style="font-size:8.5pt;color:#7d8d92;margin-top:4px">${esc(c.caption)}</div>` : ''}
      </div>` : '';
    case 'list': {
      if (!c.items?.length) return '';
      const tag = c.ordered ? 'ol' : 'ul';
      return `<div class="blk blk-text"><${tag} style="padding-left:18px;line-height:1.8">${c.items.map(i => `<li>${esc(i)}</li>`).join('')}</${tag}></div>`;
    }
    case 'checklist': {
      if (!c.items?.length) return '';
      return `<div class="blk blk-text"><ul style="list-style:none;padding-left:0;line-height:1.8">${c.items.map(i =>
        `<li>${i.checked ? '☑' : '☐'} ${esc(i.text || i)}</li>`
      ).join('')}</ul></div>`;
    }
    case 'table': {
      if (!c.rows?.length) return '';
      const head = c.headers?.length
        ? `<thead><tr>${c.headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` : '';
      const body = c.rows.map(r =>
        `<tr>${r.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`
      ).join('');
      return `<div class="blk"><table>${head}<tbody>${body}</tbody></table></div>`;
    }
    case 'toggle':
      return `<div class="blk blk-text"><strong>${esc(c.title || '')}</strong><br>${c.html || esc(c.text || '')}</div>`;
    case 'columns': {
      if (!c.cols?.length) return '';
      const colsHtml = c.cols.map(col =>
        `<div style="flex:1">${col.html || esc(col.text || '')}</div>`
      ).join('');
      return `<div class="blk" style="display:flex;gap:16px">${colsHtml}</div>`;
    }
    case 'molecule3d': {
      const smiles = (c.smiles || '').trim();
      const name   = (c.name   || '').trim();
      return `<div class="blk mol-3d">
        ${name ? `<div class="mol-3d-name">${esc(name)}</div>` : ''}
        ${smiles ? `<svg class="mol-svg" data-smiles="${esc(smiles)}" width="360" height="260" style="display:block;margin:0 auto;max-width:100%"></svg>` : ''}
        ${smiles ? `<div class="mol-3d-smiles">${esc(smiles)}</div>` : ''}
        ${!smiles && !name ? '<span class="blk-skip">[Molekula — bez SMILES]</span>' : ''}
      </div>`;
    }
    default:
      // Unsupported media types
      return `<div class="blk blk-skip">[${b.type} — nepodržano u PDF izvozu]</div>`;
  }
}

// Minimal HTML escaping for plain-text values
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ── Puppeteer renderer ────────────────────────────────────────────────────────

let _browser = null;

async function getBrowser() {
  if (_browser) {
    try {
      // Ping to verify it's still alive
      await _browser.version();
      return _browser;
    } catch {
      _browser = null;
    }
  }
  const puppeteer = require('puppeteer');
  _browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
  return _browser;
}

async function renderToPDF(html) {
  const browser = await getBrowser();
  const pg = await browser.newPage();
  try {
    // networkidle2: wait for SmilesDrawer init script + KaTeX CSS (2 or fewer open connections)
    await pg.setContent(html, { waitUntil: 'networkidle2', timeout: 30000 });
    // SmilesDrawer uses async callbacks — wait for all SVG renders to complete.
    await pg.evaluate(() => new Promise(r => setTimeout(r, 600)));
    return await pg.pdf({
      format: 'A4',
      printBackground: true,
      // Margins defined via @page CSS rule; puppeteer margin here must be 0 to avoid double margins
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });
  } finally {
    await pg.close();
  }
}

module.exports = { shell, renderToPDF, buildParentReport, buildProgressReport, buildLesson, fmtDate };
