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
  { items: [['today', 'Today', 'today'], ['inbox', 'Inbox', 'inbox', 4]] },
  { group: 'Sales', items: [['projects', 'Projects', 'projects'], ['calculations', 'Calculations', 'calc'], ['quotes', 'Quotes', 'quotes', 1]] },
  { group: 'Fulfilment', items: [['orders', 'Orders', 'orders'], ['purchasing', 'Purchasing', 'purchasing', 1], ['planning', 'Planning', 'planning']] },
  { group: 'Money', items: [['invoices', 'Invoices', 'invoices', 1]] },
  { group: 'Records', items: [['relations', 'Customers and suppliers', 'relations'], ['articles', 'Articles', 'articles']] },
  { group: 'Agent', items: [['activity', 'Agent activity', 'agent'], ['rules', 'Agent rules', 'rules']] },
];
const SECTION_OF = { project: 'projects', calculation: 'calculations', quote: 'quotes', order: 'orders', ask: 'today' };

function renderNav(active) {
  const link = ([r, label, ico, badge]) => `<a class="uf-nav" href="#/${r}" ${r === active ? 'aria-current="page"' : ''}>${I(ico)}<span>${label}</span>${badge ? `<b class="uf-nav__count" aria-label="${badge} need you">${badge}</b>` : ''}</a>`;
  $('#nav').innerHTML = NAV.map(g => `<div class="uf-navgroup">${g.group ? `<div class="uf-sidebar__group">${g.group}</div>` : ''}${g.items.map(link).join('')}</div>`).join('')
    + `<div class="uf-navgroup uf-navgroup--end">${link(['settings', 'Settings', 'settings'])}</div>`;
}

/* ---------- shared blocks ---------- */
function head({ crumbs = [], title, status, facts = [], actions = '' }) {
  return `<header class="rec-head">
    ${crumbs.length ? `<nav class="crumbs" aria-label="Breadcrumb">${crumbs.map(([h, t]) => h ? `<a href="${h}">${esc(t)}</a>` : `<span>${esc(t)}</span>`).join('<span aria-hidden="true">/</span>')}</nav>` : ''}
    <div class="rec-head__row"><div class="rec-head__title"><h1 class="uf-page-title">${esc(title)}</h1>${status ? pill(status) : ''}</div><div class="rec-head__actions">${actions}</div></div>
    ${facts.length ? `<dl class="facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>` : ''}
  </header>`;
}
function stepper(cur, records) {
  return `<div class="steps-wrap"><ol class="uf-steps" style="--n:8;--cur:${cur}" aria-label="Progress">${D.journey.map((s, i) =>
    `<li class="${i + 1 < cur ? 'done' : ''}" ${i + 1 === cur ? 'aria-current="step"' : ''}>${s}${records ? `<span class="step-rec">${recLink(records[i])}</span>` : ''}</li>`).join('')}</ol></div>`;
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
function table(cols, rows) {
  return `<table class="uf-table uf-table--open"><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => `<tr ${r._href ? `data-href="${r._href}"` : ''}>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.v(r)}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function listPage({ title, sub, pills = [], primary, cols, rows }) {
  return `${head({ title, actions: primary || '' })}
  ${sub ? `<p class="lead">${sub}</p>` : ''}
  ${pills.length ? `<div class="viewpills" role="tablist">${pills.map(([t, n], i) => `<button class="vpill" aria-selected="${i === 0}">${t} <span>${n}</span></button>`).join('')}</div>` : ''}
  ${table(cols, rows)}`;
}
const btn = (label, kind = 'secondary', attrs = '', ico) => `<button class="uf-pbtn uf-pbtn--${kind}" type="button" ${attrs}>${ico ? I(ico) : ''}${label}</button>`;
function agentPanel(title, body, actions = '') {
  return `<section class="agent" aria-label="Agent"><div class="agent__head">${I('agent')}<h2>${title}</h2></div><div class="agent__body">${body}</div>${actions ? `<div class="agent__actions">${actions}</div>` : ''}</section>`;
}
function tellBox(ph = 'Tell the agent what to change') {
  return `<form class="tell" data-tell><label class="sr" for="tell">Tell the agent</label><input id="tell" placeholder="${ph}" autocomplete="off"><button class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" type="submit">${I('send')}Send</button></form>`;
}
function timeline(items, more) {
  return `<section class="rail-sec"><h2 class="uf-section-title">Timeline</h2><ul class="tl">${items.map(([t, d]) => `<li><span>${esc(t)}</span><time>${d}</time></li>`).join('')}</ul>${more ? `<button class="linkbtn">${more}</button>` : ''}</section>`;
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
  inbox() {
    return listPage({ title: 'Inbox', sub: 'The agent sorts mail into lanes and says what it did. Open a mail to change it.', pills: [['All', 4], ['Needs a person', 1], ['New request', 1], ['Changes', 1], ['Suppliers', 1]],
      primary: btn('Log a phone request', 'secondary', 'data-drawer') + btn('New request', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'From', v: r => `<b>${esc(r.from)}</b>` }, { h: 'Subject', v: r => esc(r.subject) }, { h: 'Lane', v: r => pill(r.lane) }, { h: 'What the agent did', v: r => esc(r.done) }, { h: 'Received', v: r => r.time }], rows: D.inbox });
  },
  projects() {
    return listPage({ title: 'Projects', pills: [['Open', 5], ['Waiting for customer', 2], ['In production', 2], ['Done', 1]], primary: btn('New project', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Project', v: r => `<a href="#/project/${r.id}">${r.id}</a> ${esc(r.name)}` }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'Stage', v: r => D.journey[r.stage - 1] }, { h: 'Next step', v: r => esc(r.next) }, { h: 'Sale value', num: 1, v: r => eur(r.value || null) }, { h: 'Still open', num: 1, v: r => eur(r.open || null) }, { h: 'Margin', num: 1, v: r => pct(r.margin) }],
      rows: D.projects.map(r => ({ ...r, _href: `#/project/${r.id}` })) });
  },
  project(id) {
    const p = D.projects.find(x => x.id === id) || D.projects[0];
    return `${head({ crumbs: [['#/projects', 'Projects'], ['', p.id]], title: `${p.customer} · ${p.name}`, status: p.stage === 3 ? ['attention', 'Quote to verify'] : ['active', D.journey[p.stage - 1]],
      facts: [['Customer', esc(p.customer)], ['Site', esc(p.site)], ['Sale value', eur(p.value || null)], ['Still to be paid', eur(p.open || null)], ['Margin', pct(p.margin)]],
      actions: btn('Edit values') + btn('More', 'quiet') + (p.stage === 3 ? `<a class="uf-pbtn uf-pbtn--primary" href="#/quote/O2611-010">Verify quote</a>` : btn('Next step', 'primary')) })}
      ${stepper(p.stage, p.records)}
      ${tabs([['ov', 'Overview'], ['calc', 'Calculations', 1], ['q', 'Quotes', 1], ['o', 'Orders', 0], ['f', 'Invoices', 0], ['m', 'Mail', 3], ['files', 'Files', 2]], 'ov')}
      <div class="split"><div class="split__main">
        <h2 class="uf-section-title">Next step</h2><p>${esc(p.next)}.</p>
        <h2 class="uf-section-title">Records</h2>
        ${table([{ h: 'Record', v: r => r[0] }, { h: 'What', v: r => r[1] }, { h: 'Status', v: r => pill(r[2]) }, { h: 'Amount', num: 1, v: r => r[3] }],
          [[recLink('C2611-010 R2'), 'Calculation, 3 chapters, 8 lines', ['attention', '1 line without price'], eur(totals().sale)], [recLink('O2611-010'), 'Quote to Paul Terlouw', ['attention', 'To verify'], eur(totals().sale)]])}
      </div><aside class="split__rail">${agentPanel('Project made from a mail', '<p>I made this project from Paul\'s mail of 18 Nov, read the drawing and the door schedule, and drafted C2611-010. One price is missing.</p>', btn('Open calculation', 'secondary', 'data-go="#/calculation/C2611-010"'))}
        ${timeline([['Quote O2611-010 drafted', '20 Nov'], ['Revision R2: 9 doors', '20 Nov'], ['Project made from mail', '18 Nov']], 'Show 3 more agent events')}
        ${details([['Contact', 'Paul Terlouw'], ['Phone', '06 21 44 90 12'], ['Owner', 'Arjan Laninga'], ['Created', '18 Nov 2026']])}</aside></div>`;
  },
  calculations() {
    return listPage({ title: 'Calculations', pills: [['All', 4], ['Needs a price', 1], ['Waiting', 1], ['Quoted', 2]], primary: btn('New calculation', 'primary', 'data-drawer', 'plus'),
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
      ${stepper(3, D.projects[0].records)}
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
    return listPage({ title: 'Quotes', pills: [['All', 5], ['To verify', 1], ['Sent', 1], ['Accepted', 2], ['Rejected', 1]], primary: btn('New quote', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Quote', v: r => `<a href="#/quote/${r.id}">${r.id}</a>` }, { h: 'Customer and project', v: r => `${esc(r.customer)}<div class="uf-second">${esc(r.project)}</div>` }, { h: 'Status', v: r => pill(r.id === 'O2611-010' && Q.status === 'Sent' ? ['profit', 'Sent'] : r.status) }, { h: 'Sent', v: r => r.sent }, { h: 'Total', num: 1, v: r => eur(r.total ?? totals().sale) }, { h: 'Margin', num: 1, v: r => pct(r.margin ?? totals().margin) }],
      rows: D.quotes.map(r => ({ ...r, _href: `#/quote/${r.id}` })) });
  },
  orders() {
    return listPage({ title: 'Orders', pills: [['Open', 3], ['In production', 1], ['Waiting', 1], ['Delivered', 1]], primary: btn('New order', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Order', v: r => `<a href="#/order/${r.id}">${r.id}</a>` }, { h: 'Customer and project', v: r => `${esc(r.customer)}<div class="uf-second">${esc(r.project)}</div>` }, { h: 'Status', v: r => pill(r.status) }, { h: 'Delivery', v: r => r.delivery }, { h: 'Total', num: 1, v: r => eur(r.total) }, { h: 'Margin', num: 1, v: r => pct(r.margin) }],
      rows: D.orders.map(r => ({ ...r, _href: `#/order/${r.id}` })) });
  },
  order(id) {
    const o = D.orders.find(x => x.id === id) || D.orders[1];
    const p = D.projects.find(x => x.records.includes(o.id)) || D.projects[2];
    return `${head({ crumbs: [['#/orders', 'Orders'], ['', o.id]], title: `Order ${o.id}`, status: o.status, facts: [['Customer', esc(o.customer)], ['Project', recLink(p.id)], ['Delivery', o.delivery], ['Total', eur(o.total)], ['Margin', pct(o.margin)]],
      actions: btn('Edit lines') + btn('Ship in parts', 'secondary') + btn('Make delivery note', 'primary') })}
      ${stepper(p.stage, p.records)}
      ${tabs([['l', 'Lines', 4], ['p', 'Purchasing', 1], ['d', 'Deliveries', 0], ['f', 'Invoices', 0]], 'l')}
      <div class="split"><div class="split__main">${table([{ h: 'Line', v: r => r[0] }, { h: 'State', v: r => pill(r[1]) }, { h: 'Qty', num: 1, v: r => r[2] }, { h: 'Total', num: 1, v: r => eur(r[3]) }],
        [['Systeemwand enkel glas', ['attention', 'Waiting for glass'], '18 m1', 5520.00], ['Stalen kozijn 930 × 2315', ['profit', 'In stock'], '6 st', 2440.00], ['Opdekdeur HPL', ['active', 'Ordered'], '6 st', 1770.00], ['Montage', ['neutral', 'Planned week 50'], '48 uur', 2750.00]])}</div>
      <aside class="split__rail">${agentPanel('Supplier is late', '<p>Glas Centrum is 4 days late. I asked for a new date this morning. If it is after 2 Dec, delivery moves to week 51.</p>', btn('Tell the customer') + btn('Re-plan', 'quiet'))}${details([['Customer ref.', 'BEN-2026-118'], ['Payment', '30 % at order, 70 % on delivery']])}</aside></div>`;
  },
  purchasing() {
    return listPage({ title: 'Purchasing', pills: [['Open', 3], ['Late', 1], ['To check', 0]], primary: btn('Goods received', 'secondary') + btn('New purchase order', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Purchase order', v: r => `<b>${r.id}</b>` }, { h: 'Supplier', v: r => esc(r.supplier) }, { h: 'For order', v: r => recLink(r.for) }, { h: 'Status', v: r => pill(r.status) }, { h: 'Due', v: r => r.due }, { h: 'Total', num: 1, v: r => eur(r.total) }], rows: D.purchasing });
  },
  planning() {
    const weeks = ['Week 48', 'Week 49', 'Week 50', 'Week 51', 'Week 52'];
    const rows = [['V2611-003 De Graaf', 1, 2, 'active'], ['V2611-002 Bentacera', 2, 2, 'attention'], ['P2611-009 Politie KPLD (if accepted)', 3, 2, 'neutral']];
    return `${head({ title: 'Planning', actions: btn('Re-plan') + btn('Approve plan', 'primary') })}
      <p class="lead">Proposed by the agent from order dates and supplier dates. Drag is not in this prototype; use Re-plan.</p>
      <div class="gantt" style="--w:${weeks.length}"><div></div>${weeks.map(w => `<div class="gantt__h">${w}</div>`).join('')}
      ${rows.map(([n, s, l, k]) => `<div class="gantt__n">${n}</div><div class="gantt__track" style="grid-column: span ${weeks.length}"><span class="gantt__bar gantt__bar--${k}" style="left:${s * 100 / weeks.length}%;width:${l * 100 / weeks.length}%"></span></div>`).join('')}</div>
      <h2 class="uf-section-title">Capacity</h2><dl class="drows drows--wide"><div><dt>Montage team week 50</dt><dd class="uf-warn">92 % booked</dd></div><div><dt>Montage team week 51</dt><dd>54 % booked</dd></div></dl>`;
  },
  invoices() {
    return listPage({ title: 'Invoices', pills: [['Open', 2], ['Overdue', 1], ['Paid', 1]], primary: btn('Export to Exact', 'secondary') + btn('New invoice', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Invoice', v: r => `<b>${r.id}</b>` }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'For', v: r => recLink(r.for.split(' ')[0]) + (r.for.includes('·') ? ' · 30 %' : '') }, { h: 'Status', v: r => pill(r.status) }, { h: 'Due', v: r => r.due }, { h: 'Exact', v: r => r.exact }, { h: 'Total', num: 1, v: r => eur(r.total) }], rows: D.invoices });
  },
  relations() {
    return listPage({ title: 'Customers and suppliers', pills: [['All', 5], ['Customers', 3], ['Suppliers', 2]], primary: btn('New company', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Company', v: r => `<b>${esc(r.name)}</b>` }, { h: 'Type', v: r => r.kind }, { h: 'Contact', v: r => esc(r.contact) }, { h: 'City', v: r => r.city }, { h: 'Note', v: r => r.note[1] === '–' ? '–' : pill(r.note) }], rows: D.relations });
  },
  articles() {
    return listPage({ title: 'Articles', pills: [['All', 5], ['Low stock', 1], ['Cost changed', 0]], primary: btn('New article', 'primary', 'data-drawer', 'plus'),
      cols: [{ h: 'Code', v: r => `<b>${r.code}</b>` }, { h: 'Article', v: r => esc(r.name) }, { h: 'Group', v: r => r.group }, { h: 'Unit', v: r => r.unit }, { h: 'Cost', num: 1, v: r => eur(r.cost) }, { h: 'Margin', num: 1, v: r => pct(r.margin) }, { h: 'Stock', num: 1, v: r => r.stock }], rows: D.articles });
  },
  activity() {
    return listPage({ title: 'Agent activity', sub: 'Everything the agent did. Undo works for 5 minutes on mails, and always on drafts.', pills: [['All', 5], ['Sales', 2], ['Purchasing', 2], ['Money', 1]],
      cols: [{ h: 'What the agent did', v: r => esc(r[0]) }, { h: 'When', v: r => r[1] }, { h: '', v: r => `<button class="linkbtn">${r[2]}</button>` }], rows: D.activity });
  },
  rules() {
    const r = [['Margin floor', `${MARGIN_FLOOR} %`, 'Below this the agent asks you before a quote goes out.'], ['Price tolerance on purchase invoices', '€ 25.00', 'Bigger differences go to you.'], ['First reminder', '3 days after due date', ''], ['Undo window for mails', '5 minutes', ''], ['Send quotes without a person', 'Never', 'Level C. Every quote is verified by a person.']];
    return `${head({ title: 'Agent rules', actions: btn('Save rules', 'primary') })}<p class="lead">You decide what the agent may do alone. Example values.</p>
      <dl class="rules">${r.map(([k, v, h]) => `<div><dt>${k}${h ? `<span class="uf-second">${h}</span>` : ''}</dt><dd><input class="field" value="${v}" aria-label="${k}"></dd></div>`).join('')}</dl>`;
  },
  settings() {
    return `${head({ title: 'Settings', actions: btn('Save', 'primary') })}
      ${tabs([['c', 'Company'], ['d', 'Defaults'], ['con', 'Connections'], ['m', 'Automatic mails'], ['u', 'Users (planned)']], 'con')}
      <dl class="rules">${[['Exact Online', ['profit', 'Connected']], ['Gmail', ['profit', 'Connected']], ['Outlook', ['neutral', 'Not connected']], ['WhatsApp Business', ['attention', 'Needs a new login']]].map(([k, s]) => `<div><dt>${k}</dt><dd>${pill(s)} ${btn(s[1] === 'Connected' ? 'Disconnect' : 'Connect', 'secondary', 'class="uf-pbtn--sm"')}</dd></div>`).join('')}</dl>`;
  },
  ask(q) {
    q = q || 'Which quotes are open longer than 14 days?';
    return `${head({ title: 'Ask the portal' })}<form class="askbar" data-ask><input class="field" name="q" value="${esc(q)}" aria-label="Question"><button class="uf-pbtn uf-pbtn--primary">Ask</button></form>
      <p class="lead">One quote is open longer than 14 days. This is the list I used:</p>
      ${table([{ h: 'Quote', v: r => recLink(r.id) }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'Sent', v: r => r.sent }, { h: 'Total', num: 1, v: r => eur(r.total) }], D.quotes.filter(x => x.id === 'O2611-008'))}`;
  },
};

/* ---------- router ---------- */
function route() {
  const [, page = 'today', arg] = (location.hash || '#/today').split('/');
  const [name, query] = page.split('?');
  const fn = P[name] || P.today;
  const q = query ? decodeURIComponent((query.match(/q=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ') : '';
  $('#view').innerHTML = fn(arg || q);
  renderNav(SECTION_OF[name] || name);
  document.title = `${$('#view h1')?.textContent || 'Portal'} · Uniframe portal`;
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
  if (t.matches('[data-drawer]')) { drawer(t.textContent.trim()); return; }
  if (t.closest('.tab')) { t.closest('.tabs').querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b === t)); return; }
  if (t.closest('.vpill')) { t.closest('.viewpills').querySelectorAll('.vpill').forEach(b => b.setAttribute('aria-selected', b === t)); return; }
});
document.addEventListener('submit', e => {
  const f = e.target; e.preventDefault();
  if (f.matches('[data-tell]')) { const v = f.querySelector('input').value.trim(); if (!v) return;
    Q.timeline.unshift([`You told the agent: "${v}"`, 'Just now']); save(); refreshQuote(); toast('The agent will make a new revision and show you what changed.'); return; }
  if (f.matches('[data-ask]') || f.id === 'search') { const v = new FormData(f).get('q'); location.hash = `#/ask?q=${encodeURIComponent(v)}`; }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLayers(); if (e.key === 'Enter' && e.target.matches('.ce')) { e.preventDefault(); e.target.blur(); } });
document.addEventListener('focusout', e => {
  const el = e.target; if (!el.matches || !el.matches('.ce')) return;
  const l = Q.chapters[+el.dataset.c].lines[+el.dataset.l], v = el.textContent.trim();
  if (v && v !== l.desc) { l.desc = v; l.byYou = true; save(); setTimeout(refreshQuote, 0); }
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
function drawer(title) {
  const d = $('#panel'); $('#pt').textContent = title.replace(/^\W+/, ''); d.hidden = false; $('#scrim').hidden = false; d.querySelector('input').focus();
}
function closeLayers() { $('#modal').hidden = true; $('#panel').hidden = true; $('#scrim').hidden = true; }
$('#scrim').onclick = closeLayers;
document.querySelectorAll('#panel [data-close]').forEach(b => b.onclick = closeLayers);
$('#panel form').onsubmit = e => { e.preventDefault(); closeLayers(); toast('Saved as a draft. The agent fills in the rest and shows you.'); };

window.addEventListener('hashchange', route);
route();
})();
