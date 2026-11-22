(() => {
const D = window.UF_DATA, I = window.ufIcon;
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const eur = n => n == null ? '–' : '€ ' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eurNL = n => '€ ' + n.toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = m => m == null ? '–' : `<span class="${m < 0 ? 'uf-loss' : m >= 18 ? 'uf-profit' : 'uf-warn'}">${m < 0 ? '− ' + Math.abs(m) : '+ ' + m} %</span>`;
const pill = ([k, t]) => `<span class="uf-pill uf-pill--${k}">${esc(t)}</span>`;
const MARGIN_FLOOR = 18;

/* ---------- navigation ---------- */
const NAV = [
  { items: [['today', 'Today', 'today'], ['inbox', 'Inbox', 'inbox', 'mail']] },
  { group: 'Sales', items: [['projects', 'Projects', 'projects'], ['calculations', 'Calculations', 'calc'], ['quotes', 'Quotes', 'quotes', 1]] },
  { group: 'Fulfilment', items: [['orders', 'Orders', 'orders'], ['purchasing', 'Purchasing', 'purchasing', 1], ['planning', 'Planning', 'planning']] },
  { group: 'Money', items: [['invoices', 'Invoices', 'invoices', 1]] },
  { group: 'Records', items: [['relations', 'Customers and suppliers', 'relations'], ['articles', 'Articles', 'articles']] },
  { group: 'Agent', items: [['activity', 'Agent activity', 'agent'], ['rules', 'Agent rules', 'rules']] },
];
const SECTION_OF = { project: 'projects', calculation: 'calculations', quote: 'quotes', order: 'orders', ask: 'today' };

function renderNav(active) {
  const link = ([r, label, ico, badge]) => { if (badge === 'mail') badge = window.UFMail ? window.UFMail.unread : 0; return `<a class="uf-nav" href="#/${r}" ${r === active ? 'aria-current="page"' : ''}>${I(ico)}<span>${label}</span>${badge ? `<b class="uf-nav__count" aria-label="${badge} need you">${badge}</b>` : ''}</a>`; };
  $('#nav').innerHTML = NAV.map(g => `<div class="uf-navgroup">${g.group ? `<div class="uf-sidebar__group">${g.group}</div>` : ''}${g.items.map(link).join('')}</div>`).join('')
    + `<div class="uf-navgroup uf-navgroup--end">${link(['settings', 'Settings', 'settings'])}</div>`;
}

/* ---------- shared blocks ---------- */
function head({ crumbs = [], title, status, facts = [], actions = '' }) {
  return `<header class="rec-head">
    <nav class="crumbs" aria-label="Breadcrumb">${(crumbs.length ? crumbs : [['', state.group || 'Home']]).map(([h, t]) => h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join('<span aria-hidden="true">/</span>')}</nav>
    <div class="rec-head__row"><div class="rec-head__title"><h1 class="uf-page-title">${esc(title)}</h1>${status ? pill(status) : ''}</div><div class="rec-head__actions">${actions}</div></div>
    ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
  </header>`;
}
/* Journey stepper = breadcrumb. Green liquid = how far the project is. Glass lens = the record you are looking at.
   Click a step, or drag the lens along the capsule, to open that step's record. */
function stepTarget(p, i) {
  const r = p.records[i]; if (!r || r === '–') return null;
  const id = r.split(' ')[0];
  if (/^C\d{4}-\d{3}$/.test(id)) return `#/calculation/${id}`;
  if (/^O\d{4}-\d{3}$/.test(id)) return `#/quote/${id}`;
  if (/^V\d{4}-\d{3}$/.test(id)) return `#/order/${id}`;
  if (/^F\d{4}-\d{3}$/.test(id)) return '#/invoices';
  if (i === 0 && r.startsWith('Mail')) return '#/inbox';
  return `#/project/${p.id}`;
}
function stepper(p, here) {
  here = here || p.stage;
  const from = state.lastStep && state.lastStep.p === p.id ? state.lastStep.here : here;
  state.lastStep = { p: p.id, here };
  return `<div class="steps-wrap"><div class="steps-track" data-p="${p.id}" data-here="${here}" style="--n:8;--cur:${p.stage};--pos:${from}">
    <ol class="uf-steps uf-steps--nav" aria-label="Project steps">${D.journey.map((s, i) => { const h = stepTarget(p, i), n = i + 1, r = p.records[i];
      const inner = `<span class="step-name">${s}</span><span class="step-rec">${r && r !== '–' ? esc(r) : '–'}</span>`;
      return `<li class="${n < p.stage ? 'done' : ''}${n === here ? ' here' : ''}" ${n === p.stage ? 'aria-current="step"' : ''}>${h
        ? `<a class="step-link" href="${h}" data-step="${n}" ${n === here ? 'aria-current="page"' : ''}>${inner}</a>`
        : `<button type="button" class="step-link step-link--future" data-step="${n}" data-future>${inner}</button>`}</li>`; }).join('')}</ol>
    <div class="steps-hit" aria-hidden="true"></div>
    <span class="steps-lens" role="slider" tabindex="0" aria-label="Drag to open a step" aria-valuemin="1" aria-valuemax="8" aria-valuenow="${here}" aria-valuetext="${D.journey[here - 1]}"></span>
  </div></div>`;
}
function recLink(r) {
  if (!r || r === '–') return '<span class="muted">–</span>';
  const id = r.split(' ')[0];
  const map = { C: 'calculation', O: 'quote', V: 'order', P: 'project' };
  const route = /^[COVP]\d{4}-\d{3}$/.test(id) ? map[id[0]] : null;
  return route ? `<a href="#/${route}/${id}">${esc(r)}</a>` : esc(r);
}
function tabs(list, active) {
  return `<div class="tabs" role="tablist">${list.map(([k, t, n]) => `<button role="tab" class="tab" data-tab="${k}" aria-selected="${k === active}">${t}${n != null ? ` <span class="tab__n">${n}</span>` : ''}</button>`).join('')}</div>`;
}
const DETAIL = [];
function table(cols, rows, detail) {
  return `<table class="uf-table uf-table--open"><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => { const d = !r._href && detail ? DETAIL.push({ cols, r, detail }) - 1 : -1;
    return `<tr ${r._href ? `data-href="${r._href}" tabindex="0"` : d >= 0 ? `data-detail="${d}" tabindex="0"` : ''}>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.v(r)}</td>`).join('')}</tr>`; }).join('')}
  <tr class="norows" hidden><td colspan="${cols.length}">Nothing in this view.</td></tr></tbody></table>`;
}
function tabset(list, active, panels) {
  return tabs(list, active) + `<div class="tabpanels">${list.map(([k]) => `<div class="tabpanel" data-panel="${k}" ${k === active ? '' : 'hidden'}>${panels[k] ?? '<p class="lead">Nothing here yet.</p>'}</div>`).join('')}</div>`;
}
function listPage({ title, sub, pills = [], primary, cols, rows, detail }) {
  return `${head({ title, actions: primary || '' })}
  ${sub ? `<p class="lead">${sub}</p>` : ''}
  ${pills.length ? `<div class="viewpills" role="tablist">${pills.map(([t, n, match], i) => `<button class="vpill" data-filter="${i === 0 ? '' : esc(match || t)}" aria-selected="${i === 0}">${t} <span>${n}</span></button>`).join('')}</div>` : ''}
  ${table(cols, rows, detail || { actions: ['Edit'] })}`;
}
const btn = (label, kind = 'secondary', attrs = '', ico) => `<button class="uf-pbtn uf-pbtn--${kind}" type="button" ${attrs}>${ico ? I(ico) : ''}${label}</button>`;
function agentPanel(title, body, actions = '') {
  return `<section class="agent" aria-label="Agent"><div class="agent__head">${I('agent')}<h2>${title}</h2></div><div class="agent__body">${body}</div>${actions ? `<div class="agent__actions">${actions}</div>` : ''}</section>`;
}
function tellBox(ph = 'Tell the agent what to change') {
  return `<form class="tell" data-tell><label class="sr" for="tell">Tell the agent</label><input id="tell" placeholder="${ph}" autocomplete="off"><button class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" type="submit">${I('send')}Send</button></form>`;
}
function timeline(items, more) {
  return `<section class="rail-sec"><h2 class="uf-section-title">Timeline</h2><ul class="tl">${items.map(([t, d]) => `<li><span>${esc(t)}</span><time>${d}</time></li>`).join('')}</ul>${more ? `<button class="linkbtn" data-more>${more}</button>` : ''}</section>`;
}
function details(rows) {
  return `<section class="rail-sec"><h2 class="uf-section-title">Details</h2><dl class="drows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`;
}

/* ---------- quote state: one source for the calculation and the document ---------- */
const KEY = 'uf-quote-O2611-010-v1';
let Q = load();
function load() {
  try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {}
  return JSON.parse(JSON.stringify(D.quote));
}
function save() { try { localStorage.setItem(KEY, JSON.stringify(Q)); } catch (e) {} }
const salePrice = l => Math.round(l.cost * (1 + l.margin / 100) * 100) / 100;
const lineTotal = l => Math.round(salePrice(l) * l.qty * 100) / 100;
function totals() {
  let sale = 0, cost = 0;
  Q.chapters.forEach(c => c.lines.forEach(l => { sale += lineTotal(l); cost += l.cost * l.qty; }));
  return { sale, cost, margin: sale ? Math.round((sale - cost) / sale * 1000) / 10 : 0, vat: sale * 0.21 };
}
function checks() {
  const out = [];
  Q.chapters.forEach((c, ci) => c.lines.forEach((l, li) => {
    const nr = `${ci + 1}.${li + 1}`;
    if (!l.cost) out.push({ kind: 'loss', text: `Line ${nr} "${l.desc}" has no price. Last time (P2610-004) it was € 450.00.`, fix: `data-fix="price" data-c="${ci}" data-l="${li}" data-v="450"`, label: 'Use € 450.00' });
    else if (l.margin < MARGIN_FLOOR) out.push({ kind: 'attention', text: `Line ${nr} has ${l.margin} % margin. Your floor is ${MARGIN_FLOOR} %.`, fix: `data-fix="margin" data-c="${ci}" data-l="${li}" data-v="${MARGIN_FLOOR}"`, label: `Set to ${MARGIN_FLOOR} %` });
    if (l.byYou) out.push({ kind: 'neutral', text: `You changed line ${nr}. I keep your value and will not overwrite it.` });
  }));
  return out;
}

function quoteDoc() {
  const t = totals();
  return `<article class="paper" aria-label="Quote document ${Q.id}">
    <div class="paper__top">
      <div><div class="lockup">${logo(36)}<span>UNIFRAME<br>SYSTEMS</span></div><p class="paper__tag">Universele wand-, kozijn- en deursystemen</p></div>
      <div class="paper__id"><b>OFFERTE</b><span class="strong">${Q.id}</span><span>${Q.date}</span><span>Geldig t/m ${Q.valid}</span></div>
    </div>
    <div class="paper__blocks">
      ${pblock('Opdrachtgever', [['Bedrijf', Q.client.company], ['T.a.v.', Q.client.attn], ['Adres', Q.client.address], ['E-mail', Q.client.email]])}
      ${pblock('Project', [['Nummer', Q.project_info.nr], ['Omschrijving', Q.project_info.desc], ['Levering', Q.project_info.delivery], ['Onderwerp', Q.project_info.subject]])}
      ${pblock('Uniframe Systems', [['Contact', Q.sender.contact], ['Telefoon', Q.sender.phone], ['E-mail', Q.sender.email]], true)}
    </div>
    <input class="paper__salute edit" data-q="salutation" value="${esc(Q.client.salutation)}" aria-label="Aanhef">
    <textarea class="paper__intro edit" data-q="intro" rows="2" aria-label="Inleiding">${esc(Q.intro)}</textarea>
    <table class="ptable">
      <thead><tr><th>Nr.</th><th>Omschrijving</th><th class="num">Aantal</th><th>Eenheid</th><th class="num">Prijs p/e</th><th class="num">Totaal</th></tr></thead>
      ${Q.chapters.map((c, ci) => `<tbody>
        <tr class="ptable__chap"><td>${ci + 1}.0</td><td colspan="4"><input class="edit strong" data-chap="${ci}" value="${esc(c.title)}" aria-label="Hoofdstuk ${ci + 1}"></td><td class="num">${eurNL(c.lines.reduce((s, l) => s + lineTotal(l), 0))}</td></tr>
        ${c.lines.map((l, li) => `<tr class="${!l.cost ? 'flag' : ''}">
          <td>${ci + 1}.${li + 1}</td>
          <td><div class="edit ce" contenteditable="plaintext-only" role="textbox" data-c="${ci}" data-l="${li}" data-f="desc" aria-label="Omschrijving ${ci + 1}.${li + 1}">${esc(l.desc)}</div></td>
          <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="qty" value="${l.qty}" inputmode="decimal" aria-label="Aantal"></td>
          <td>${esc(l.unit)}</td>
          <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="price" value="${salePrice(l).toFixed(2)}" inputmode="decimal" aria-label="Prijs per eenheid"></td>
          <td class="num">${eurNL(lineTotal(l))}</td></tr>`).join('')}
        <tr class="ptable__add"><td></td><td colspan="5"><button class="linkbtn" data-addline="${ci}">+ Regel toevoegen</button></td></tr>
      </tbody>`).join('')}
    </table>
    <button class="linkbtn" data-addchap>+ Hoofdstuk toevoegen</button>
    <div class="paper__total"><span><b>Totale investering</b> exclusief 21% BTW</span><b>${eurNL(t.sale)}</b></div>
    <p class="paper__foot">BTW 21 %: ${eurNL(t.vat)} · Totaal inclusief BTW: ${eurNL(t.sale + t.vat)}</p>
  </article>`;
}
const pblock = (t, rows, dark) => `<div class="pblock ${dark ? 'pblock--dark' : ''}"><h3>${t}</h3><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
const logo = s => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M0 0H36V18H18V82H68A14 14 0 0 0 82 68V18H64V0H100V68A32 32 0 0 1 68 100H0Z"/></svg>`;

function calcTable() {
  const t = totals();
  return `<table class="uf-table uf-table--open calc">
    <thead><tr><th>Nr.</th><th>Line</th><th class="num">Qty</th><th>Unit</th><th class="num">Cost p/u</th><th class="num">Margin</th><th class="num">Sale p/u</th><th class="num">Total</th></tr></thead>
    ${Q.chapters.map((c, ci) => `<tbody><tr class="chap"><td>${ci + 1}.0</td><td colspan="6"><input class="edit strong" data-chap="${ci}" value="${esc(c.title)}" aria-label="Chapter ${ci + 1}"></td><td class="num strong">${eur(c.lines.reduce((s, l) => s + lineTotal(l), 0))}</td></tr>
      ${c.lines.map((l, li) => `<tr class="${!l.cost ? 'flag' : ''}"><td>${ci + 1}.${li + 1}</td>
        <td><div class="edit ce" contenteditable="plaintext-only" role="textbox" data-c="${ci}" data-l="${li}" data-f="desc" aria-label="Line ${ci + 1}.${li + 1}">${esc(l.desc)}</div>${l.byYou ? '<span class="you">Changed by you</span>' : ''}</td>
        <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="qty" value="${l.qty}" aria-label="Quantity"></td><td>${esc(l.unit)}</td>
        <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="cost" value="${l.cost.toFixed(2)}" aria-label="Cost per unit"></td>
        <td class="num"><span class="pctcell"><input class="edit num ${l.margin < MARGIN_FLOOR ? 'warn' : ''}" data-c="${ci}" data-l="${li}" data-f="margin" value="${l.margin}" aria-label="Margin %"> %</span></td>
        <td class="num">${eur(salePrice(l))}</td><td class="num">${eur(lineTotal(l))}</td></tr>`).join('')}
      <tr class="addrow"><td></td><td colspan="7"><button class="linkbtn" data-addline="${ci}">+ Add line</button></td></tr></tbody>`).join('')}
    <tfoot><tr><td></td><td><button class="linkbtn" data-addchap>+ Add chapter</button></td><td colspan="2"></td><td class="num">${eur(t.cost)}</td><td class="num">${pct(t.margin)}</td><td></td><td class="num strong">${eur(t.sale)}</td></tr></tfoot>
  </table>`;
}

function quoteRail() {
  const c = checks(), t = totals();
  const body = `<p>I read this ${state.view === 'doc' ? 'quote document' : 'calculation'} the same way you see it. Total ${eur(t.sale)} excl. VAT, margin ${t.margin} %.</p>
    ${c.length ? `<ul class="checks">${c.map(x => `<li class="check check--${x.kind}"><span>${esc(x.text)}</span>${x.fix ? `<button class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" ${x.fix}>${x.label}</button>` : ''}</li>`).join('')}</ul>` : '<p class="ok">Nothing left to check. Ready for you to approve.</p>'}
    ${tellBox()}`;
  return agentPanel('What the agent sees', body)
    + `<section class="rail-sec"><div class="rail-sec__head"><h2 class="uf-section-title">Files</h2><label class="uf-pbtn uf-pbtn--quiet uf-pbtn--sm">${I('upload')}Add file<input type="file" id="upfile" hidden></label></div>
      <ul class="files">${Q.files.map(f => `<li><span class="files__name">${esc(f.name)}</span><span class="muted">${esc(f.from)}${f.by === 'you' ? ' · agent read it' : ''}</span></li>`).join('')}</ul></section>`
    + timeline(Q.timeline.slice(0, 3), 'Show 4 more agent events');
}

/* ---------- planning: bars you can move ---------- */
const PLAN = [['V2611-003 De Graaf', 1, 2, 'active'], ['V2611-002 Bentacera', 2, 2, 'attention'], ['P2611-009 Politie KPLD (if accepted)', 3, 2, 'neutral']];
const capOf = wk => { const i = wk - 48; return Math.min(140, 8 + PLAN.reduce((sum, [, s, l, k]) => sum + (i >= s && i < s + l ? (k === 'neutral' ? 4 : 42) : 0), 0)); };
function moveBar(i, s, quiet) {
  const [n, old, l] = PLAN[i]; s = Math.max(0, Math.min(5 - l, s));
  if (s === old) { route(); return; }
  PLAN[i][1] = s; route();
  const b = document.querySelector(`[data-bar="${i}"]`); if (b) b.focus();
  if (!quiet) toast(`${n} moved to week ${48 + s}–${47 + s + l}. Approve the plan to tell the team and the customer.`, () => { PLAN[i][1] = old; route(); });
}
let bar = null;
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('.gantt__bar'); if (!b || e.button) return;
  e.preventDefault(); b.setPointerCapture(e.pointerId); bar = { b, x0: e.clientX, left: b.offsetLeft, w: b.parentElement.clientWidth, i: +b.dataset.bar }; b.classList.add('is-drag'); });
document.addEventListener('pointermove', e => { if (!bar) return; const max = bar.w - bar.b.offsetWidth; bar.b.style.left = Math.max(0, Math.min(max, bar.left + e.clientX - bar.x0)) + 'px'; });
document.addEventListener('pointerup', e => { if (!bar) return; const { b, x0, left, w, i } = bar; bar = null; b.classList.remove('is-drag');
  if (Math.abs(e.clientX - x0) < 4) { b.focus(); return; } moveBar(i, Math.round((left + e.clientX - x0) / w * 5)); });
document.addEventListener('keydown', e => { const b = e.target.closest && e.target.closest('.gantt__bar'); if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault(); const i = +b.dataset.bar; moveBar(i, PLAN[i][1] + (e.key === 'ArrowRight' ? 1 : -1)); });

/* ---------- pages ---------- */
const state = { view: 'doc' };
const P = {
  today() {
    const needs = [
      ['attention', 'Verify', 'Quote O2611-010 for Wallsz: 1 line without price', '#/quote/O2611-010', 'Open quote'],
      ['loss', 'Money', 'F2610-011 from Wallsz is 12 days overdue, € 2,250.35', '#/invoices', 'Send reminder 2'],
      ['loss', 'Supplier', 'Glas Centrum is 4 days late for V2611-002 (Bentacera)', '#/purchasing', 'Chase supplier'],
      ['attention', 'Needs a person', 'Complaint from De Graaf about a scratched door', '#/inbox', 'Read mail'],
      ['neutral', 'Follow-up', 'O2611-008 to Hoekstra: no reply for 14 days', '#/quotes', 'Chase'],
    ];
    return `${head({ title: 'Today', actions: btn('New request', 'primary', 'data-drawer', 'plus') })}
      <p class="lead">Saturday 22 November. 5 things need you; the agent handled 23 since yesterday.</p>
      <div class="split"><div class="split__main">
        <h2 class="uf-section-title">Needs you</h2>
        <ol class="needs">${needs.map(([k, tag, t, h, a], i) => `<li><span class="needs__n">${i + 1}</span>${pill([k, tag])}<a class="needs__t" href="${h}">${t}</a><a class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" href="${h}">${a}</a></li>`).join('')}</ol>
        <h2 class="uf-section-title">Orders in progress</h2>
        ${table([{ h: 'Order', v: r => `<a href="#/order/${r.id}">${r.id}</a>` }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'Status', v: r => pill(r.status) }, { h: 'Delivery', v: r => r.delivery }, { h: 'Total', num: 1, v: r => eur(r.total) }],
          D.orders.slice(0, 2).map(r => ({ ...r, _href: `#/order/${r.id}` })))}
      </div><aside class="split__rail">
        <section class="rail-sec"><h2 class="uf-section-title">Money outstanding</h2><dl class="drows"><div><dt>Open invoices</dt><dd>${eur(4125.35)}</dd></div><div><dt>Overdue</dt><dd class="uf-loss">${eur(2250.35)}</dd></div><div><dt>Expected this month</dt><dd>${eur(14355.00)}</dd></div></dl></section>
        <section class="rail-sec"><h2 class="uf-section-title">Agent activity</h2><ul class="tl">${D.activity.slice(0, 4).map(([t, d, a]) => `<li><span>${t}</span><time>${d} · <button class="linkbtn">${a}</button></time></li>`).join('')}</ul><a class="linkbtn" href="#/activity">All activity</a></section>
      </aside></div>`;
  },
  inbox() { return window.UFMail.render(); },
  projects() {
    return listPage({ title: 'Projects', pills: [['All', 6], ['To verify', 1, 'verify'], ['Waiting on supplier', 1, 'supplier'], ['Overdue', 1, 'overdue'], ['Done', 1, 'done']], primary: btn('New project', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Project', v: r => `<a href="#/project/${r.id}">${r.id}</a> ${esc(r.name)}` }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'Stage', v: r => D.journey[r.stage - 1] }, { h: 'Next step', v: r => esc(r.next) }, { h: 'Sale value', num: 1, v: r => eur(r.value || null) }, { h: 'Still open', num: 1, v: r => eur(r.open || null) }, { h: 'Margin', num: 1, v: r => pct(r.margin) }],
      rows: D.projects.map(r => ({ ...r, _href: `#/project/${r.id}` })) });
  },
  project(id) {
    const p = D.projects.find(x => x.id === id) || D.projects[0];
    return `${head({ crumbs: [['#/projects', 'Projects'], ['', p.id]], title: `${p.customer} · ${p.name}`, status: p.stage === 3 ? ['attention', 'Quote to verify'] : ['active', D.journey[p.stage - 1]],
      facts: [['Customer', esc(p.customer)], ['Site', esc(p.site)], ['Sale value', eur(p.value || null)], ['Still to be paid', eur(p.open || null)], ['Margin', pct(p.margin)]],
      actions: btn('Edit values') + btn('More', 'quiet') + (p.stage === 3 ? `<a class="uf-pbtn uf-pbtn--primary" href="#/quote/O2611-010">Verify quote</a>` : btn('Next step', 'primary')) })}
      ${stepper(p)}
      ${tabset([['ov', 'Overview'], ['calc', 'Calculations', 1], ['q', 'Quotes', 1], ['o', 'Orders', 0], ['f', 'Invoices', 0], ['m', 'Mail', 3], ['files', 'Files', 2]], 'ov', {
        calc: table([{ h: 'Calculation', v: r => recLink(r.id) + ' ' + r.rev }, { h: 'Status', v: r => pill(r.status) }, { h: 'Made by', v: r => esc(r.by) }], D.calculations.slice(0, 1).map(r => ({ ...r, _href: '#/calculation/' + r.id }))),
        q: table([{ h: 'Quote', v: r => recLink(r.id) }, { h: 'Status', v: r => pill(r.status) }, { h: 'Total', num: 1, v: () => eur(totals().sale) }], D.quotes.slice(0, 1).map(r => ({ ...r, _href: '#/quote/' + r.id }))),
        o: '<p class="lead">No order yet. It is made when Wallsz accepts quote O2611-010.</p>',
        f: '<p class="lead">No invoices yet. The first one is made from the order.</p>',
        m: table([{ h: 'From', v: r => `<b>${r[0]}</b>` }, { h: 'Subject', v: r => r[1] }, { h: 'Date', v: r => r[2] }], [['Paul Terlouw', 'RE: Politie KPLD, deur 2.14 erbij', '19 Nov'], ['You', 'Offerte O2611-010', '12 Nov'], ['Paul Terlouw', 'Aanvraag Politie KPLD', '18 Nov']].map(r => Object.assign([...r], { _href: '#/inbox' }))),
        files: table([{ h: 'File', v: r => `<b>${esc(r.name)}</b>` }, { h: 'From', v: r => esc(r.from) }], Q.files, { actions: ['Download', 'Remove'] }),
        ov: `<div class="split"><div class="split__main">
        <h2 class="uf-section-title">Next step</h2><p>${esc(p.next)}.</p>
        <h2 class="uf-section-title">Records</h2>
        ${table([{ h: 'Record', v: r => r[0] }, { h: 'What', v: r => r[1] }, { h: 'Status', v: r => pill(r[2]) }, { h: 'Amount', num: 1, v: r => r[3] }],
          [[recLink('C2611-010 R2'), 'Calculation, 3 chapters, 8 lines', ['attention', '1 line without price'], eur(totals().sale)], [recLink('O2611-010'), 'Quote to Paul Terlouw', ['attention', 'To verify'], eur(totals().sale)]])}
      </div><aside class="split__rail">${agentPanel('Project made from a mail', '<p>I made this project from Paul\'s mail of 18 Nov, read the drawing and the door schedule, and drafted C2611-010. One price is missing.</p>', btn('Open calculation', 'secondary', 'data-go="#/calculation/C2611-010"'))}
        ${timeline([['Quote O2611-010 drafted', '20 Nov'], ['Revision R2: 9 doors', '20 Nov'], ['Project made from mail', '18 Nov']], 'Show 3 more agent events')}
        ${details([['Contact', 'Paul Terlouw'], ['Phone', '06 21 44 90 12'], ['Owner', 'Arjan Laninga'], ['Created', '18 Nov 2026']])}</aside></div>` })}`;
  },
  calculations() {
    return listPage({ title: 'Calculations', pills: [['All', 4], ['Needs a price', 1, 'without price'], ['Waiting', 1], ['Quoted', 2]], primary: btn('New calculation', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Calculation', v: r => `<a href="#/calculation/${r.id}">${r.id}</a> ${r.rev}` }, { h: 'Customer and project', v: r => `${esc(r.customer)}<div class="uf-second">${esc(r.project)}</div>` }, { h: 'Status', v: r => pill(r.status) }, { h: 'Made by', v: r => esc(r.by) }, { h: 'Quote', v: r => recLink(r.quote) }],
      rows: D.calculations.map(r => ({ ...r, _href: `#/calculation/${r.id}` })) });
  },
  calculation(id) { if (id && id !== 'C2611-010') return P.genericRecord('Calculation', id); return P.quoteRecord('calc'); },
  quote(id) { if (id && id !== 'O2611-010') return P.genericRecord('Quote', id); return P.quoteRecord('doc'); },
  quoteRecord(from) {
    if (!state.lockView) state.view = from === 'calc' ? 'calc' : 'doc';
    state.lockView = false;
    const t = totals(), isCalc = from === 'calc';
    return `${head({ crumbs: [['#/projects', 'Projects'], ['#/project/P2611-009', 'P2611-009 Politie KPLD'], ['', isCalc ? 'C2611-010 R2' : Q.id]],
      title: isCalc ? 'Calculation C2611-010 R2' : `Quote ${Q.id}`, status: Q.status === 'Sent' ? ['profit', 'Sent'] : ['attention', 'To verify'],
      facts: [['Customer', 'Wallsz · Paul Terlouw'], ['Total excl. VAT', `<span data-live="sale">${eur(t.sale)}</span>`], ['Margin', `<span data-live="margin">${pct(t.margin)}</span>`], ['Valid until', '12 Dec 2026'], [isCalc ? 'Quote' : 'Calculation', isCalc ? recLink('O2611-010') : recLink('C2611-010 R2')]],
      actions: btn('Reject', 'quiet', 'data-reject') + btn('Download PDF', 'secondary', 'data-print') + btn(Q.status === 'Sent' ? 'Sent' : 'Approve and send', 'primary', `data-send ${Q.status === 'Sent' ? 'disabled' : ''}`) })}
      ${stepper(D.projects[0], isCalc ? 2 : 3)}
      <div class="viewbar"><div class="seg" role="tablist" aria-label="View">
        <button role="tab" data-view="calc" aria-selected="${state.view === 'calc'}">Calculation</button>
        <button role="tab" data-view="doc" aria-selected="${state.view === 'doc'}">Quote document</button></div>
        <span class="uf-second">Both views edit the same lines. Change a price in one and the other follows.</span>
        <button class="linkbtn" data-reset>Reset example</button></div>
      <div class="split"><div class="split__main" id="qmain">${state.view === 'doc' ? quoteDoc() : calcTable()}</div><aside class="split__rail" id="qrail">${quoteRail()}</aside></div>`;
  },
  genericRecord(kind, id) {
    return `${head({ crumbs: [[`#/${kind.toLowerCase()}s`, kind + 's'], ['', id]], title: `${kind} ${id}`, actions: btn('Edit values') })}<p class="lead">This record is example data. The fully drawn example is <a href="#/quote/O2611-010">quote O2611-010</a>.</p>`;
  },
  quotes() {
    return listPage({ title: 'Quotes', pills: [['All', 5], ['To verify', 1], ['Sent', 1, 'no reply'], ['Accepted', 2], ['Rejected', 1]], primary: btn('New quote', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Quote', v: r => `<a href="#/quote/${r.id}">${r.id}</a>` }, { h: 'Customer and project', v: r => `${esc(r.customer)}<div class="uf-second">${esc(r.project)}</div>` }, { h: 'Status', v: r => pill(r.id === 'O2611-010' && Q.status === 'Sent' ? ['profit', 'Sent'] : r.status) }, { h: 'Sent', v: r => r.sent }, { h: 'Total', num: 1, v: r => eur(r.total ?? totals().sale) }, { h: 'Margin', num: 1, v: r => pct(r.margin ?? totals().margin) }],
      rows: D.quotes.map(r => ({ ...r, _href: `#/quote/${r.id}` })) });
  },
  orders() {
    return listPage({ title: 'Orders', pills: [['All', 4], ['In production', 1], ['Waiting', 1], ['Delivered', 1], ['Paid', 1]], primary: btn('New order', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Order', v: r => `<a href="#/order/${r.id}">${r.id}</a>` }, { h: 'Customer and project', v: r => `${esc(r.customer)}<div class="uf-second">${esc(r.project)}</div>` }, { h: 'Status', v: r => pill(r.status) }, { h: 'Delivery', v: r => r.delivery }, { h: 'Total', num: 1, v: r => eur(r.total) }, { h: 'Margin', num: 1, v: r => pct(r.margin) }],
      rows: D.orders.map(r => ({ ...r, _href: `#/order/${r.id}` })) });
  },
  order(id) {
    const o = D.orders.find(x => x.id === id) || D.orders[1];
    const p = D.projects.find(x => x.records.includes(o.id)) || D.projects[2];
    return `${head({ crumbs: [['#/orders', 'Orders'], ['', o.id]], title: `Order ${o.id}`, status: o.status, facts: [['Customer', esc(o.customer)], ['Project', recLink(p.id)], ['Delivery', o.delivery], ['Total', eur(o.total)], ['Margin', pct(o.margin)]],
      actions: btn('Edit lines') + btn('Ship in parts', 'secondary') + btn('Make delivery note', 'primary') })}
      ${stepper(p, 4)}
      ${tabset([['l', 'Lines', 4], ['p', 'Purchasing', 1], ['d', 'Deliveries', 0], ['f', 'Invoices', 0]], 'l', {
        p: table([{ h: 'Purchase order', v: r => `<b>${r.id}</b>` }, { h: 'Supplier', v: r => esc(r.supplier) }, { h: 'Status', v: r => pill(r.status) }, { h: 'Due', v: r => r.due }], D.purchasing.filter(x => x.for === o.id), { actions: ['Chase supplier', 'Goods received'] }),
        d: '<p class="lead">Nothing delivered yet. Use Make delivery note or Ship in parts.</p>',
        f: '<p class="lead">No invoices yet for this order.</p>',
        l: `<div class="split"><div class="split__main">${table([{ h: 'Line', v: r => r[0] }, { h: 'State', v: r => pill(r[1]) }, { h: 'Qty', num: 1, v: r => r[2] }, { h: 'Total', num: 1, v: r => eur(r[3]) }],
        [['Systeemwand enkel glas', ['attention', 'Waiting for glass'], '18 m1', 5520.00], ['Stalen kozijn 930 × 2315', ['profit', 'In stock'], '6 st', 2440.00], ['Opdekdeur HPL', ['active', 'Ordered'], '6 st', 1770.00], ['Montage', ['neutral', 'Planned week 50'], '48 uur', 2750.00]], { actions: ['Edit line', 'Ship this line'] })}</div>
      <aside class="split__rail">${agentPanel('Supplier is late', '<p>Glas Centrum is 4 days late. I asked for a new date this morning. If it is after 2 Dec, delivery moves to week 51.</p>', btn('Tell the customer') + btn('Re-plan', 'quiet'))}${details([['Customer ref.', 'BEN-2026-118'], ['Payment', '30 % at order, 70 % on delivery']])}</aside></div>` })}`;
  },
  purchasing() {
    return listPage({ title: 'Purchasing', pills: [['All', 3], ['Late', 1], ['Confirmed', 1], ['Received', 1]], primary: btn('Goods received', 'secondary') + btn('New purchase order', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Purchase order', v: r => `<b>${r.id}</b>` }, { h: 'Supplier', v: r => esc(r.supplier) }, { h: 'For order', v: r => recLink(r.for) }, { h: 'Status', v: r => pill(r.status) }, { h: 'Due', v: r => r.due }, { h: 'Total', num: 1, v: r => eur(r.total) }], rows: D.purchasing, detail: { actions: ['Chase supplier', 'Goods received', 'Match purchase invoice'] } });
  },
  planning() {
    const weeks = ['Week 48', 'Week 49', 'Week 50', 'Week 51', 'Week 52'];
    return `${head({ title: 'Planning', actions: btn('Re-plan') + btn('Approve plan', 'primary') })}
      <p class="lead">Proposed by the agent from order dates and supplier dates. Drag a bar, or select it and use the arrow keys, to move it a week.</p>
      <div class="gantt" style="--w:${weeks.length}"><div></div>${weeks.map(w => `<div class="gantt__h">${w}</div>`).join('')}
      ${PLAN.map(([n, s, l, k], i) => `<div class="gantt__n">${n}</div><div class="gantt__track" style="grid-column: span ${weeks.length}"><button type="button" class="gantt__bar gantt__bar--${k}" data-bar="${i}" style="left:${s * 100 / weeks.length}%;width:${l * 100 / weeks.length}%" aria-label="${esc(n)}: week ${48 + s} to ${47 + s + l}. Drag or use arrow keys to move."></button></div>`).join('')}</div>
      <h2 class="uf-section-title">Capacity</h2><dl class="drows drows--wide"><div><dt>Montage team week 50</dt><dd class="${capOf(50) > 85 ? 'uf-warn' : ''}">${capOf(50)} % booked</dd></div><div><dt>Montage team week 51</dt><dd class="${capOf(51) > 85 ? 'uf-warn' : ''}">${capOf(51)} % booked</dd></div></dl>`;
  },
  invoices() {
    return listPage({ title: 'Invoices', pills: [['All', 3], ['Open', 1], ['Overdue', 1, 'overdue'], ['Paid', 1]], primary: btn('Export to Exact', 'secondary') + btn('New invoice', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Invoice', v: r => `<b>${r.id}</b>` }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'For', v: r => recLink(r.for.split(' ')[0]) + (r.for.includes('·') ? ' · 30 %' : '') }, { h: 'Status', v: r => pill(r.status) }, { h: 'Due', v: r => r.due }, { h: 'Exact', v: r => r.exact }, { h: 'Total', num: 1, v: r => eur(r.total) }], rows: D.invoices, detail: { actions: ['Send reminder', 'Mark as paid', 'Download PDF'] } });
  },
  relations() {
    return listPage({ title: 'Customers and suppliers', pills: [['All', 5], ['Customers', 3], ['Suppliers', 2]], primary: btn('New company', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Company', v: r => `<b>${esc(r.name)}</b>` }, { h: 'Type', v: r => r.kind }, { h: 'Contact', v: r => esc(r.contact) }, { h: 'City', v: r => r.city }, { h: 'Note', v: r => r.note[1] === '–' ? '–' : pill(r.note) }], rows: D.relations, detail: { actions: ['Write an email', 'New project for this company', 'Edit company'] } });
  },
  articles() {
    return listPage({ title: 'Articles', pills: [['All', 5], ['Low stock', 1, 'low'], ['Beslag', 1]], primary: btn('New article', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Code', v: r => `<b>${r.code}</b>` }, { h: 'Article', v: r => esc(r.name) }, { h: 'Group', v: r => r.group }, { h: 'Unit', v: r => r.unit }, { h: 'Cost', num: 1, v: r => eur(r.cost) }, { h: 'Margin', num: 1, v: r => pct(r.margin) }, { h: 'Stock', num: 1, v: r => r.stock }], rows: D.articles, detail: { actions: ['Edit price', 'Correct the stock count', 'Order more'] } });
  },
  activity() {
    return listPage({ title: 'Agent activity', sub: 'Everything the agent did. Undo works for 5 minutes on mails, and always on drafts.', pills: [['All', 5], ['Calculations', 1, 'C2611'], ['Suppliers', 2, 'Glas'], ['Money', 1, 'reminder']],
      cols: [{ h: 'What the agent did', v: r => esc(r[0]) }, { h: 'When', v: r => r[1] }, { h: '', v: r => `<button class="linkbtn">${r[2]}</button>` }], rows: D.activity, detail: { actions: ['Undo', 'Tell the agent'] } });
  },
  rules() {
    const r = [['Margin floor', `${MARGIN_FLOOR} %`, 'Below this the agent asks you before a quote goes out.'], ['Price tolerance on purchase invoices', '€ 25.00', 'Bigger differences go to you.'], ['First reminder', '3 days after due date', ''], ['Undo window for mails', '5 minutes', ''], ['Send quotes without a person', 'Never', 'Level C. Every quote is verified by a person.']];
    return `${head({ title: 'Agent rules', actions: btn('Save rules', 'primary') })}<p class="lead">You decide what the agent may do alone. Example values.</p>
      <dl class="rules">${r.map(([k, v, h]) => `<div><dt>${k}${h ? `<span class="uf-second">${h}</span>` : ''}</dt><dd><input class="field" value="${v}" aria-label="${k}"></dd></div>`).join('')}</dl>`;
  },
  settings() {
    const conn = [['Exact Online', ['profit', 'Connected']], ['Gmail', window.UFMail && window.UFMail.connected ? ['profit', 'Connected'] : ['neutral', 'Not connected']], ['Outlook', ['neutral', 'Not connected']], ['WhatsApp Business', ['attention', 'Needs a new login']]];
    let cid = ''; try { cid = JSON.parse(localStorage.getItem('uf-gmail-client') || '""'); } catch (e) {}
    const field = (k, v) => `<div><dt>${k}</dt><dd><input class="field" value="${esc(v)}" aria-label="${k}"></dd></div>`;
    return `${head({ title: 'Settings', actions: btn('Save', 'primary') })}
      ${tabset([['c', 'Company'], ['d', 'Defaults'], ['con', 'Connections'], ['m', 'Automatic mails'], ['u', 'Users (planned)']], 'con', {
        c: `<dl class="rules">${field('Company name', 'Uniframe Systems')}${field('Address', 'IJsselweg 41C, 7061 XV Terborg')}${field('KvK', '42160232')}${field('Phone', '06 53 56 32 32')}</dl>`,
        d: `<dl class="rules">${field('Quote valid for', '30 days')}${field('Payment term', '14 days')}${field('Default margin', '20 %')}${field('VAT', '21 %')}</dl>`,
        con: `<dl class="rules">${conn.map(([k, st]) => `<div><dt>${k}</dt><dd>${pill(st)} ${k === 'Gmail' ? (st[1] === 'Connected' ? btn('Open inbox', 'secondary', 'data-go="#/inbox"') : btn('Connect Gmail', 'secondary', 'data-gmail')) : btn(st[1] === 'Connected' ? 'Disconnect' : 'Connect', 'secondary')}</dd></div>`).join('')}
          <div><dt>Gmail OAuth client ID<span class="uf-second">From Google Cloud. Needed to read and send real mail from the Inbox.</span></dt><dd><input class="field" id="gcid" value="${esc(cid)}" placeholder="…apps.googleusercontent.com" aria-label="Gmail OAuth client ID"></dd></div></dl>`,
        m: `<dl class="rules">${field('Quote follow-up after', '14 days')}${field('Payment reminder after', '3 days')}${field('Signature', 'Met vriendelijke groet, Arjan Laninga')}</dl>`,
        u: '<p class="lead">Users and roles are planned. For now everyone signs in with the same rights.</p>' })}`;
  },
  ask(q) {
    q = (q || '').trim();
    const form = `<form class="askbar" data-ask><input class="field" name="q" value="${esc(q)}" placeholder="For example: open quotes for Wallsz" aria-label="Question"><button class="uf-pbtn uf-pbtn--primary">Ask</button></form>`;
    if (!q) return `${head({ title: 'Ask the portal' })}${form}<p class="lead">Type a customer, record number, product or question.</p>`;
    if (/14 days|longer|no reply/i.test(q)) return `${head({ title: 'Ask the portal' })}${form}
      <p class="lead">One quote is open longer than 14 days. This is the list I used:</p>
      ${table([{ h: 'Quote', v: r => recLink(r.id) }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'Sent', v: r => r.sent }, { h: 'Total', num: 1, v: r => eur(r.total) }], D.quotes.filter(x => x.id === 'O2611-008').map(r => ({ ...r, _href: '#/quote/' + r.id })))}`;
    const SETS = [['Project', D.projects, r => `#/project/${r.id}`, r => `${r.id} ${r.name}`, r => r.customer, r => D.journey[r.stage - 1]],
      ['Quote', D.quotes, r => `#/quote/${r.id}`, r => r.id, r => `${r.customer} · ${r.project}`, r => r.status[1]],
      ['Calculation', D.calculations, r => `#/calculation/${r.id}`, r => `${r.id} ${r.rev}`, r => `${r.customer} · ${r.project}`, r => r.status[1]],
      ['Order', D.orders, r => `#/order/${r.id}`, r => r.id, r => `${r.customer} · ${r.project || ''}`, r => r.status[1]],
      ['Invoice', D.invoices, () => '#/invoices', r => r.id, r => r.customer, r => r.status[1]],
      ['Purchase order', D.purchasing, () => '#/purchasing', r => r.id, r => r.supplier, r => r.status[1]],
      ['Company', D.relations, () => '#/relations', r => r.name, r => `${r.kind} · ${r.city}`, r => r.contact],
      ['Article', D.articles, () => '#/articles', r => r.code, r => r.name, r => `${r.stock} in stock`]];
    const stop = new Set(['open', 'for', 'the', 'a', 'an', 'of', 'and', 'all', 'show', 'me', 'my', 'with', 'which', 'what', 'are', 'is', 'from', 'to', 'in', 'quotes', 'quote', 'orders', 'order', 'projects', 'project', 'invoices', 'invoice']);
    const kind = (/quote/i.test(q) && 'Quote') || (/order/i.test(q) && 'Order') || (/invoice/i.test(q) && 'Invoice') || (/project/i.test(q) && 'Project') || (/calcul/i.test(q) && 'Calculation') || null;
    const words = q.toLowerCase().split(/[^a-z0-9-]+/).filter(w => w && !stop.has(w));
    let hits = [];
    SETS.forEach(([k, rows, href, id, what, st]) => rows.forEach(r => { const text = JSON.stringify(r).toLowerCase();
      const n = words.filter(w => text.includes(w)).length; if ((words.length ? n === words.length : true) && (!kind || k === kind)) hits.push({ k, _href: href(r), id: id(r), what: what(r), st: st(r) }); }));
    if (!hits.length && kind && words.length) hits = [];
    const say = hits.length ? `I found ${hits.length} record${hits.length > 1 ? 's' : ''} for “${esc(q)}”.` : `I found nothing for “${esc(q)}”. Try a customer name, a record number such as O2611-010, or a product.`;
    return `${head({ title: 'Ask the portal' })}${form}<p class="lead">${say}</p>
      ${hits.length ? table([{ h: 'Type', v: r => r.k }, { h: 'Record', v: r => `<a href="${r._href}">${esc(r.id)}</a>` }, { h: 'What', v: r => esc(r.what) }, { h: 'Status', v: r => esc(r.st) }], hits) : ''}`;
  },
};

/* ---------- router ---------- */
function route() {
  const [, page = 'today', arg] = (location.hash || '#/today').split('/');
  const [name, query] = page.split('?');
  const fn = P[name] || P.today;
  const q = query ? decodeURIComponent((query.match(/q=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ') : '';
  const sec = SECTION_OF[name] || name;
  state.group = (NAV.find(g => g.items.some(i => i[0] === sec)) || {}).group || 'Home';
  DETAIL.length = 0;
  $('#view').innerHTML = fn(arg || q);
  renderNav(sec);
  document.title = `${$('#view h1')?.textContent || 'Portal'} · Uniframe portal`;
  const tr = $('.steps-track'); if (tr) requestAnimationFrame(() => requestAnimationFrame(() => tr.style.setProperty('--pos', tr.dataset.here)));
  $('#view').focus({ preventScroll: true });
  window.scrollTo(0, 0);
}
function refreshQuote() {
  const m = $('#qmain'), r = $('#qrail');
  if (!m) return;
  const active = document.activeElement, sel = active && active.dataset && (active.dataset.f || active.dataset.chap || active.dataset.q) ? `[data-c="${active.dataset.c}"][data-l="${active.dataset.l}"][data-f="${active.dataset.f}"]` : null;
  m.innerHTML = state.view === 'doc' ? quoteDoc() : calcTable();
  r.innerHTML = quoteRail();
  const t = totals();
  document.querySelectorAll('[data-live="sale"]').forEach(e => e.textContent = eur(t.sale));
  document.querySelectorAll('[data-live="margin"]').forEach(e => e.innerHTML = pct(t.margin));
  if (sel) { const n = $(sel); if (n) { n.focus(); } }
}
const num = v => parseFloat(String(v).replace(/\s/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0;

/* ---------- events ---------- */
document.addEventListener('change', e => {
  const el = e.target;
  if (el.id === 'upfile' && el.files[0]) {
    Q.files.unshift({ name: el.files[0].name, from: 'You, just now', by: 'you' });
    Q.timeline.unshift([`Agent read ${el.files[0].name} you added`, 'Just now']);
    save(); refreshQuote(); toast(`${el.files[0].name} added. The agent reads it with this quote.`); return;
  }
  if (el.dataset.chap != null) { Q.chapters[+el.dataset.chap].title = el.value; save(); refreshQuote(); return; }
  if (el.dataset.q) { if (el.dataset.q === 'intro') Q.intro = el.value; else Q.client.salutation = el.value; save(); return; }
  if (el.dataset.f) {
    const l = Q.chapters[+el.dataset.c].lines[+el.dataset.l], f = el.dataset.f;
    if (f === 'desc') l.desc = el.value;
    else if (f === 'price') { const p = num(el.value); if (l.cost) l.margin = Math.round((p / l.cost - 1) * 1000) / 10; else { l.cost = Math.round(p / 1.2 * 100) / 100; l.margin = 20; } }
    else l[f] = num(el.value);
    l.byYou = true; save(); refreshQuote();
  }
});
document.addEventListener('click', e => {
  const t = e.target.closest('button, a, tr[data-href], label');
  if (!t) return;
  if (t.matches('tr[data-href]') && !e.target.closest('a,button,input')) { location.hash = t.dataset.href; return; }
  if (t.dataset.go) { location.hash = t.dataset.go; return; }
  if (t.matches('[data-future]')) { stepGo(t.closest('.steps-track'), +t.dataset.step); return; }
  if (t.dataset.view) { state.view = t.dataset.view; document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', b === t)); refreshQuote(); return; }
  if (t.dataset.fix) {
    const l = Q.chapters[+t.dataset.c].lines[+t.dataset.l];
    if (t.dataset.fix === 'price') { l.cost = +t.dataset.v / 1.2; l.margin = 20; } else l.margin = +t.dataset.v;
    Q.timeline.unshift([t.dataset.fix === 'price' ? 'You accepted the agent\'s price for transport' : 'You raised a margin to the floor', 'Just now']);
    save(); refreshQuote(); return;
  }
  if (t.dataset.addline != null) { Q.chapters[+t.dataset.addline].lines.push({ desc: 'Nieuwe regel', qty: 1, unit: 'st', cost: 0, margin: 20, byYou: true }); save(); refreshQuote(); return; }
  if (t.matches('[data-addchap]')) { Q.chapters.push({ title: 'Nieuw hoofdstuk', lines: [] }); save(); refreshQuote(); return; }
  if (t.matches('[data-reset]')) { Q = JSON.parse(JSON.stringify(D.quote)); save(); state.lockView = true; route(); toast('Example restored.'); return; }
  if (t.matches('[data-print]')) { state.view = 'doc'; refreshQuote(); document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === 'doc')); setTimeout(() => window.print(), 50); return; }
  if (t.matches('[data-send]')) { const c = checks().filter(x => x.kind !== 'neutral');
    modal(`Send quote ${Q.id}?`, `<p>Wallsz gets the PDF at paul.terlouw@wallsz.nl. You can still change the quote until they accept it.</p>${c.length ? `<p class="uf-warn">The agent still has ${c.length} open point${c.length > 1 ? 's' : ''}. You can send anyway.</p>` : ''}`,
      'Send quote', () => { Q.status = 'Sent'; Q.timeline.unshift(['You approved and sent the quote', 'Just now']); save(); state.lockView = true; route(); toast(`Quote ${Q.id} sent to Wallsz`, () => { Q.status = 'To verify'; save(); state.lockView = true; route(); }); }); return; }
  if (t.matches('[data-reject]')) { modal('Reject this draft?', `<label class="fl">Reason, so the agent learns<textarea class="field" rows="3" id="why" placeholder="For example: use the 2027 glass prices"></textarea></label>`, 'Reject draft', () => toast('Draft rejected. The agent will make a new revision.')); return; }
  if (t.matches('[data-drawer]')) { createDrawer(t.textContent.trim()); return; }
  if (t.matches('[data-gmail]')) { window.UFMail.connect(); return; }
  if (t.closest('.tab')) { const bar = t.closest('.tabs'); bar.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b === t));
    const panels = bar.nextElementSibling; if (panels && panels.classList.contains('tabpanels')) panels.querySelectorAll(':scope > .tabpanel').forEach(p => p.hidden = p.dataset.panel !== t.dataset.tab); return; }
  if (t.closest('.vpill')) { const bar = t.closest('.viewpills'); bar.querySelectorAll('.vpill').forEach(b => b.setAttribute('aria-selected', b === t));
    const tb = bar.nextElementSibling && bar.nextElementSibling.querySelector('tbody'); if (tb) { const f = (t.dataset.filter || '').toLowerCase(); let n = 0;
      tb.querySelectorAll('tr:not(.norows)').forEach(r => { const show = !f || r.textContent.toLowerCase().includes(f); r.hidden = !show; n += show; }); tb.querySelector('.norows').hidden = n > 0; } return; }
  if (t.matches('[data-more]')) { const ul = t.previousElementSibling; [['Agent read the first mail and made the project', '18 Nov'], ['Agent linked the drawing to the project', '18 Nov'], ['Arjan opened the calculation', '18 Nov']].forEach(([a, d]) => ul.insertAdjacentHTML('beforeend', `<li><span>${a}</span><time>${d}</time></li>`)); t.remove(); return; }
  if (t.closest('[data-m], .mail, .compose, #modal') || t.matches('[type=submit], [data-close], label')) return;
  if (t.matches('.uf-pbtn, .linkbtn') && t.tagName === 'BUTTON') { act(t.textContent.trim()); return; }
});
document.addEventListener('click', e => {
  const tr = e.target.closest('tr[data-detail]'); if (!tr || e.target.closest('a,button,input')) return;
  const { cols, r, detail } = DETAIL[+tr.dataset.detail];
  openDrawer(tr.cells[0].innerText.trim(), `<dl class="drows">${cols.filter(c => c.h).map(c => `<div><dt>${c.h}</dt><dd>${c.v(r)}</dd></div>`).join('')}</dl>
    <div class="drawer-acts">${(detail.actions || []).map((a, i) => btn(a, i ? 'secondary' : 'primary')).join('')}</div>
    <label class="fl">Note for the agent<textarea class="field" rows="3" placeholder="For example: call them, don't mail"></textarea></label>`);
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-detail], tr[data-href]')) e.target.click(); });
document.addEventListener('change', e => { if (e.target.id === 'gcid') { try { localStorage.setItem('uf-gmail-client', JSON.stringify(e.target.value.trim())); } catch (x) {} toast('Client ID saved. Press Connect Gmail to sign in with Google.'); } });

/* Every other button does something visible, with Undo where it makes sense. */
const ACT = {
  'Edit values': () => editDrawer(), 'Edit lines': () => editDrawer(), 'Edit': () => editDrawer(), 'Edit company': () => editDrawer(), 'Edit line': () => editDrawer(), 'Edit price': () => editDrawer(),
  'More': () => openDrawer('More actions', `<div class="drawer-acts drawer-acts--col">${['Duplicate', 'Print', 'Archive', 'Share link'].map(a => btn(a)).join('')}</div>`, ''),
  'Write an email': () => { closeLayers(); location.hash = '#/inbox'; },
  'Open': () => { location.hash = '#/activity'; },
  'Tell the agent': () => openDrawer('Tell the agent', '<label class="fl">What should change?<textarea class="field" rows="4"></textarea></label>', '<button class="uf-pbtn uf-pbtn--primary" type="submit">Send to agent</button>'),
  'Print': () => { closeLayers(); window.print(); },
};
const MSG = {
  'Next step': 'Moved to the next step. The agent prepares what comes after.', 'Approve plan': 'Plan approved. Teams and suppliers get the dates.', 'Re-plan': 'The agent is making a new plan for you to approve.',
  'Save rules': 'Agent rules saved.', 'Save': 'Saved.', 'Ship in parts': 'Choose the lines for the first delivery.', 'Make delivery note': 'Delivery note made as a draft.', 'Export to Exact': 'Exported to Exact Online.',
  'Goods received': 'Goods received. The agent checks them against the purchase order.', 'Tell the customer': 'Mail to the customer drafted. Check it in the Inbox.', 'Connect': 'Connection started. Sign in in the window that opens.', 'Disconnect': 'Disconnected.',
  'Chase': 'Follow-up mail drafted for you to check.', 'Chase supplier': 'Supplier chased. The agent tells you their answer.', 'Send reminder 2': 'Reminder 2 sent to Wallsz.', 'Send reminder': 'Reminder sent.', 'Mark as paid': 'Marked as paid. Exact is updated.',
  'Undo': 'Undone.', 'Change': 'Opened for you to change.', 'Duplicate': 'Copy made.', 'Archive': 'Archived.', 'Share link': 'Link copied.', 'Download PDF': 'PDF downloaded.', 'Download': 'Download started.', 'Remove': 'File removed.',
  'New project for this company': 'Project drafted for this company.', 'Correct the stock count': 'Stock count corrected.', 'Order more': 'Purchase order drafted.', 'Match purchase invoice': 'Purchase invoice matched.', 'Ship this line': 'Line added to the next delivery.',
};
function act(label) {
  label = label.replace(/\s+/g, ' ').trim();
  if (ACT[label]) return ACT[label]();
  if (label === 'Share link') { try { navigator.clipboard.writeText(location.href); } catch (e) {} }
  closeLayers();
  toast(MSG[label] || `${label}: done.`, /^(Undo|Disconnect|Change)$/.test(label) ? null : () => toast('Undone.'));
}
document.addEventListener('submit', e => {
  const f = e.target; e.preventDefault();
  if (f.matches('[data-tell]')) { const v = f.querySelector('input').value.trim(); if (!v) return;
    Q.timeline.unshift([`You told the agent: "${v}"`, 'Just now']); save(); refreshQuote(); toast('The agent will make a new revision and show you what changed.'); return; }
  if (f.matches('[data-ask]') || f.id === 'search') { const v = (new FormData(f).get('q') || '').trim(); location.hash = `#/ask?q=${encodeURIComponent(v)}`; if (f.id === 'search') f.reset(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLayers(); if (e.key === 'Enter' && e.target.matches('.ce')) { e.preventDefault(); e.target.blur(); } });
document.addEventListener('focusout', e => {
  const el = e.target; if (!el.matches || !el.matches('.ce')) return;
  const l = Q.chapters[+el.dataset.c].lines[+el.dataset.l], v = el.textContent.trim();
  if (v && v !== l.desc) { l.desc = v; l.byYou = true; save(); setTimeout(refreshQuote, 0); }
});

/* ---------- stepper drag ---------- */
let drag = null;
const stepAt = (tr, x) => { const b = tr.getBoundingClientRect(); return Math.min(8, Math.max(1, (x - b.left) / b.width * 8 + 0.5)); };
function stepHover(tr, n) { tr.querySelectorAll('.uf-steps li').forEach((li, i) => li.classList.toggle('hover', i + 1 === n)); }
function stepGo(tr, n) {
  const here = +tr.dataset.here, li = tr.querySelectorAll('.uf-steps li')[n - 1], link = li && li.querySelector('.step-link');
  tr.classList.remove('is-drag'); stepHover(tr, 0); tr.style.setProperty('--pos', n);
  if (!link || n === here) return;
  if (link.matches('[data-future]')) {
    const p = D.projects.find(x => x.id === tr.dataset.p) || D.projects[0];
    toast(`${D.journey[n - 1]} is not reached yet. Next: ${p.next}.`);
    setTimeout(() => tr.style.setProperty('--pos', here), 380); return;
  }
  setTimeout(() => { location.hash = link.getAttribute('href'); }, 300);
}
document.addEventListener('pointerdown', e => {
  const hit = e.target.closest && e.target.closest('.steps-lens, .steps-hit'); if (!hit || e.button) return;
  const tr = hit.closest('.steps-track'); e.preventDefault(); try { getSelection().removeAllRanges(); } catch (x) {} tr.setPointerCapture(e.pointerId); tr.classList.add('is-drag');
  drag = { tr, x0: e.clientX, onLens: hit.matches('.steps-lens') }; tr.querySelector('.steps-lens').focus({ preventScroll: true });
  const v = stepAt(tr, e.clientX); if (!drag.onLens) tr.style.setProperty('--pos', v); stepHover(tr, Math.round(v));
});
document.addEventListener('dragstart', e => { if (drag) e.preventDefault(); });
document.addEventListener('pointermove', e => { if (!drag) return; const v = stepAt(drag.tr, e.clientX); drag.tr.style.setProperty('--pos', v); stepHover(drag.tr, Math.round(v)); });
document.addEventListener('pointerup', e => { if (!drag) return; const { tr, x0, onLens } = drag; drag = null;
  if (onLens && Math.abs(e.clientX - x0) < 4) { tr.classList.remove('is-drag'); stepHover(tr, 0); return; }
  stepGo(tr, Math.round(stepAt(tr, e.clientX))); });
document.addEventListener('pointercancel', () => { if (drag) { const tr = drag.tr; drag = null; stepGo(tr, +tr.dataset.here); } });
document.addEventListener('keydown', e => {
  const lens = e.target.closest && e.target.closest('.steps-lens'); if (!lens) return;
  const tr = lens.parentElement; let v = +lens.getAttribute('aria-valuenow');
  if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) { e.preventDefault();
    v = e.key === 'Home' ? 1 : e.key === 'End' ? 8 : Math.min(8, Math.max(1, v + (e.key === 'ArrowRight' ? 1 : -1)));
    tr.style.setProperty('--pos', v); stepHover(tr, v); lens.setAttribute('aria-valuenow', v); lens.setAttribute('aria-valuetext', D.journey[v - 1] + ', press Enter to open'); }
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stepGo(tr, v); }
});

/* ---------- overlays ---------- */
function toast(msg, undo) {
  const el = $('#toast'); el.innerHTML = `<span>${esc(msg)}</span>${undo ? '<button class="linkbtn" id="undo">Undo</button>' : ''}`; el.hidden = false;
  if (undo) $('#undo').onclick = () => { el.hidden = true; undo(); };
  clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 6000);
}
function modal(title, body, ok, onOk) {
  const m = $('#modal'); m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt" class="uf-section-title">${title}</h2>${body}<div class="modal__foot">${btn('Cancel', 'quiet', 'data-close')}${btn(ok, 'primary', 'id="mok"')}</div></div>`;
  m.hidden = false; $('#mok').focus();
  $('#mok').onclick = () => { closeLayers(); onOk(); };
  m.querySelector('[data-close]').onclick = closeLayers;
}
function openDrawer(title, body, foot, done) {
  const d = $('#panel');
  d.innerHTML = `<form><div class="uf-panel__head"><h2 class="uf-section-title" id="pt">${esc(title)}</h2><button class="uf-pbtn uf-pbtn--quiet uf-pbtn--icon" type="button" data-close aria-label="Close">${I('close')}</button></div>
    <div class="uf-panel__body">${body}</div>${foot === '' ? '' : `<div class="uf-panel__foot"><button class="uf-pbtn uf-pbtn--quiet" type="button" data-close>Cancel</button>${foot || '<button class="uf-pbtn uf-pbtn--primary" type="submit">Save</button>'}</div>`}</form>`;
  d.hidden = false; $('#scrim').hidden = false;
  d.querySelectorAll('[data-close]').forEach(b => b.onclick = closeLayers);
  d.querySelector('form').onsubmit = e => { e.preventDefault(); closeLayers(); toast(done || 'Saved.'); };
  const f = d.querySelector('.uf-panel__body input, .uf-panel__body textarea, .uf-panel__body button'); if (f) f.focus();
}
function createDrawer(title) {
  title = title.replace(/^\W+/, '');
  openDrawer(title, `<div class="uf-field"><label for="p1">Customer</label><input id="p1" placeholder="Search or add a customer"></div>
    <div class="uf-field"><label for="p2">What do they need?</label><textarea id="p2" class="field" rows="4" placeholder="For example: 40 m glass partition, 9 doors, delivery week 6"></textarea><span class="hint">Type it yourself or paste a mail. The agent fills in the rest and shows you before anything is sent.</span></div>
    <div class="uf-field"><label for="p3">Files</label><input id="p3" type="file"></div>`, null, `${title}: saved as a draft. The agent fills in the rest and shows you.`);
}
function editDrawer() {
  const facts = [...document.querySelectorAll('.facts > div')];
  openDrawer('Edit values', facts.length ? facts.map((f, i) => `<div class="uf-field"><label for="ev${i}">${f.querySelector('dt').textContent}</label><input id="ev${i}" value="${esc(f.querySelector('dd').innerText)}"></div>`).join('') + '<p class="hint">The agent keeps the values you set and does not overwrite them.</p>'
    : '<div class="uf-field"><label for="ev0">Value</label><input id="ev0"></div>', null, 'Saved. The agent keeps your values.');
}
function closeLayers() { $('#modal').hidden = true; $('#panel').hidden = true; $('#scrim').hidden = true; }
$('#scrim').onclick = closeLayers;
window.UF = { toast, modal, openDrawer, nav: () => renderNav('inbox') };

window.addEventListener('hashchange', route);
route();
})();
