/* Uniframe portal prototype. One linked store (projects → request → calculation/quote → order → delivery note
   → invoices, and purchase orders per order). Every action changes the store, logs it, and can be undone. */
(() => {
const D0 = window.UF_DATA, I = window.ufIcon;
const KEY = 'uf-store-v4';
const clone = o => JSON.parse(JSON.stringify(o));
let S = load();
function load() { try { const s = localStorage.getItem(KEY); if (s) return JSON.parse(s); } catch (e) {} return clone(D0); }
function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }
const J = D0.journey, PST = D0.purchaseSteps, TODAY = D0.today;
/* Agent rules: saved with the store, read everywhere the agent decides something. */
const RULE0 = { marginFloor: 18, tolerance: 25, reminderAfter: 3, followUpAfter: 14, paymentTerm: 14, quoteValid: 30, depositPct: 30, autoInvoice: true };
const R = () => Object.assign({}, RULE0, S.rules || {});

/* ---------- small helpers ---------- */
const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const eur = n => n == null ? '–' : (n < 0 ? '− € ' : '€ ') + Math.abs(n).toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const eurNL = n => (n < 0 ? '− € ' : '€ ') + Math.abs(n).toLocaleString('nl-NL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = m => m == null || isNaN(m) ? '–' : `<span class="${m < 0 ? 'uf-loss' : m >= R().marginFloor ? 'uf-profit' : 'uf-warn'}">${m < 0 ? '− ' + Math.abs(m) : '+ ' + m} %</span>`;
const pill = ([k, t]) => `<span class="uf-pill uf-pill--${k}">${esc(t)}</span>`;
const dt = iso => new Date(iso + 'T12:00:00Z');
const fmt = iso => iso ? dt(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '–';
const fmtNL = iso => iso ? dt(iso).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }) : '–';
const addDays = (iso, n) => { const d = dt(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const daysFrom = (a, b) => Math.round((dt(b) - dt(a)) / 864e5);
const now = () => `${fmt(TODAY)} ${new Date().toTimeString().slice(0, 5)}`;
const num = v => parseFloat(String(v).replace(/[€\s]/g, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')) || 0;

/* ---------- lookups ---------- */
const P_ = id => S.projects.find(x => x.id === id);
const Qt = id => S.quotes[id];
const QbyC = c => Object.values(S.quotes).find(q => q.calc === c);
const O_ = id => S.orders.find(x => x.id === id);
const L_ = id => S.deliveries.find(x => x.id === id);
const F_ = id => S.invoices.find(x => x.id === id);
const I_ = id => S.purchases.find(x => x.id === id);
const invsOf = oid => S.invoices.filter(i => i.order === oid);
const finalOf = oid => invsOf(oid).find(i => i.kind === 'Final');
const pursOf = oid => S.purchases.filter(x => x.order === oid);
const custOfOrder = o => P_(o.project).customer;
const kw = d => new Set((d.toLowerCase().match(/glas|kozijn|deur|hang|dicht/g) || []));
const covers = (x, l) => { const k = kw(l.desc); return x.lines.some(pl => pl.desc === l.desc || [...kw(pl.desc)].some(w => k.has(w))); };

/* ---------- money ---------- */
const salePrice = l => Math.round(l.cost * (1 + l.margin / 100) * 100) / 100;
const lineTotal = l => Math.round(salePrice(l) * l.qty * 100) / 100;
function totals(q) {
  let sale = 0, cost = 0;
  q.chapters.forEach(c => c.lines.forEach(l => { sale += lineTotal(l); cost += l.cost * l.qty; }));
  return { sale, cost, margin: sale ? Math.round((sale - cost) / sale * 1000) / 10 : 0, vat: sale * 0.21 };
}
const orderTotal = o => totals(Qt(o.quote)).sale;
function invAmount(i) {
  const o = O_(i.order), t = orderTotal(o);
  if (i.kind === 'Deposit') return Math.round(t * i.pct) / 100;
  return Math.round((t - invsOf(o.id).filter(x => x.kind === 'Deposit').reduce((s, x) => s + invAmount(x), 0)) * 100) / 100;
}
const gross = i => Math.round(invAmount(i) * 121) / 100;
function invState(i) {
  if (i.status === 'Paid') return ['profit', 'Paid'];
  if (i.status === 'Draft') return ['neutral', 'Draft, not sent'];
  const late = daysFrom(i.due, TODAY);
  return late > 0 ? ['loss', `${late} days overdue`] : ['active', `Open, due ${fmt(i.due)}`];
}
const purTotal = x => Math.round(x.lines.reduce((s, l) => s + l.qty * l.price, 0) * 100) / 100;
function purState(x) {
  if (x.step >= 3) return ['profit', PST[x.step]];
  if (x.step >= 1 && daysFrom(x.due, TODAY) > 0) return ['loss', `${daysFrom(x.due, TODAY)} days late`];
  return [x.step === 0 ? 'neutral' : 'active', x.step === 0 ? 'Draft, not sent' : PST[x.step]];
}
function quoteState(q) {
  if (q.status === 'Sent') { const d = daysFrom(q.sent, TODAY); return d >= R().followUpAfter ? ['attention', `Sent, no reply ${d} days`] : ['active', 'Sent']; }
  return { Calculating: ['neutral', 'Calculating'], 'To verify': ['attention', 'To verify'], Accepted: ['profit', 'Accepted'], Rejected: ['loss', 'Rejected'] }[q.status];
}

/* Money in and out. Today and Invoices read the same figures. */
const reminderDue = i => i.status === 'Sent' && daysFrom(i.due, TODAY) >= R().reminderAfter && daysFrom(i.due, TODAY) - 7 * i.reminders >= R().reminderAfter;
function toInvoiceOf(o) { return Math.round((orderTotal(o) * 1.21 - invsOf(o.id).filter(i => i.status !== 'Draft').reduce((a, i) => a + gross(i), 0)) * 100) / 100; }
function money() {
  const open = S.invoices.filter(i => i.status === 'Sent'), overdue = open.filter(i => invState(i)[0] === 'loss');
  const uninv = S.orders.filter(o => o.project && P_(o.project) && [4, 5, 6].includes(stage(P_(o.project))) && toInvoiceOf(o) > 0.005);
  const payable = S.purchases.filter(x => x.step === 4), drafts = S.invoices.filter(i => i.status === 'Draft');
  const sum = (a, f) => Math.round(a.reduce((s, x) => s + f(x), 0) * 100) / 100;
  return { open, overdue, uninv, payable, drafts, openSum: sum(open, gross), overdueSum: sum(overdue, gross), toInvoice: sum(uninv, toInvoiceOf), toPay: sum(payable, x => purTotal(x) * 1.21), draftSum: sum(drafts, gross) };
}

/* ---------- the journey ---------- */
function stage(p) {
  const q = p.quote && Qt(p.quote), o = p.order && O_(p.order), d = o && o.delivery && L_(o.delivery), f = o && finalOf(o.id);
  if (f && f.status === 'Paid') return 8;
  if (f && f.status !== 'Draft') return 7;
  if (d && d.delivered) return 6;
  if (d) return 5;
  if (o) return 4;
  if (q && q.status !== 'Calculating') return 3;
  if (q) return 2;
  return 1;
}
function steps(p) {
  const q = p.quote && Qt(p.quote), o = p.order && O_(p.order), d = o && o.delivery && L_(o.delivery), f = o && finalOf(o.id);
  return [
    { rec: `${p.request.via} ${fmt(p.request.date)}`, href: `#/request/${p.id}` },
    q ? { rec: `${q.calc} ${q.rev}`, href: `#/calculation/${q.calc}` } : null,
    q && q.status !== 'Calculating' ? { rec: q.id, href: `#/quote/${q.id}` } : null,
    o ? { rec: o.id, href: `#/order/${o.id}` } : null,
    d ? { rec: d.id, href: `#/delivery/${d.id}` } : null,
    d && d.delivered ? { rec: `Signed ${fmt(d.delivered)}`, href: `#/delivery/${d.id}` } : null,
    f && f.status !== 'Draft' ? { rec: f.id, href: `#/invoice/${f.id}` } : null,
    f && f.status === 'Paid' ? { rec: `Paid ${fmt(f.paid)}`, href: `#/invoice/${f.id}` } : null,
  ];
}
function next(p) {
  const s = stage(p), q = p.quote && Qt(p.quote), o = p.order && O_(p.order), d = o && o.delivery && L_(o.delivery), f = o && finalOf(o.id);
  switch (s) {
    case 1: return { label: 'Make calculation', act: 'calc', arg: p.id, text: p.request.asked ? `Waiting for ${p.customer} to provide the missing details` : p.request.read ? 'Verify the extracted details, then make the calculation' : 'Extract the details and make the calculation', href: `#/request/${p.id}` };
    case 2: return { label: 'Make quote', act: 'toquote', arg: q.id, text: `Check ${q.calc}, then make the quote`, href: `#/calculation/${q.calc}` };
    case 3:
      if (q.status === 'To verify') return { label: 'Approve and send', act: 'sendquote', arg: q.id, text: `Verify quote ${q.id} and send it`, href: `#/quote/${q.id}` };
      if (q.status === 'Sent') return { label: 'Customer accepted', act: 'accept', arg: q.id, text: `Waiting for ${p.customer} to accept ${q.id}`, href: `#/quote/${q.id}` };
      return { label: 'Make new revision', act: 'revise', arg: q.id, text: `Quote ${q.id} was rejected`, href: `#/quote/${q.id}` };
    case 4: return { label: 'Make delivery note', act: 'note', arg: o.id, text: pursOf(o.id).some(x => x.step < 3) ? 'Materials on the way, then the delivery note' : 'Make the delivery note', href: `#/order/${o.id}` };
    case 5: return { label: 'Confirm delivery', act: 'delivered', arg: d.id, text: `Deliver ${d.id} and get it signed`, href: `#/delivery/${d.id}` };
    case 6: return f ? { label: 'Send invoice', act: 'sendinv', arg: f.id, text: `Send invoice ${f.id}`, href: `#/invoice/${f.id}` } : { label: 'Make invoice', act: 'makeinv', arg: o.id, text: 'Make the final invoice', href: `#/delivery/${d.id}` };
    case 7: return { label: 'Register payment', act: 'pay', arg: f.id, text: invState(f)[0] === 'loss' ? `${f.id} is ${invState(f)[1]}` : `Waiting for payment of ${f.id}`, href: `#/invoice/${f.id}` };
    default: return null;
  }
}
function orderState(o) {
  const p = P_(o.project), s = stage(p);
  if (s === 4) return pursOf(o.id).some(x => purState(x)[0] === 'loss') ? ['attention', 'Waiting for supplier'] : ['active', 'In production'];
  if (s === 5) return ['active', 'Ready to ship'];
  if (s === 6) return ['neutral', 'Delivered, to invoice'];
  if (s === 7) return invState(finalOf(o.id));
  return ['profit', 'Paid'];
}

/* ---------- navigation ---------- */
const NAV = [
  { items: [['today', 'Today', 'today'], ['inbox', 'Inbox', 'inbox', () => window.UFMail ? window.UFMail.unread : 0], ['whatsapp', 'WhatsApp', 'chat', () => window.UFWhatsApp ? window.UFWhatsApp.unread : 0]] },
  { group: 'Sales', items: [['projects', 'Projects', 'projects'], ['calculations', 'Calculations', 'calc'], ['quotes', 'Quotes', 'quotes', () => Object.values(S.quotes).filter(q => q.status === 'To verify').length]] },
  { group: 'Fulfilment', items: [['orders', 'Orders', 'orders'], ['purchasing', 'Purchasing', 'purchasing', () => S.purchases.filter(x => purState(x)[0] === 'loss').length], ['planning', 'Planning', 'planning']] },
  { group: 'Money', items: [['invoices', 'Invoices', 'invoices', () => S.invoices.filter(i => invState(i)[0] === 'loss').length]] },
  { group: 'Records', items: [['relations', 'Customers and suppliers', 'relations'], ['articles', 'Articles', 'articles']] },
  { group: 'Agent', items: [['activity', 'Agent activity', 'agent'], ['rules', 'Agent rules', 'rules']] },
];
const SECTION_OF = { project: 'projects', request: 'projects', calculation: 'calculations', quote: 'quotes', order: 'orders', delivery: 'orders', invoice: 'invoices', purchase: 'purchasing', ask: 'today' };
function renderNav(active) {
  const link = ([r, label, ico, badge]) => { const n = typeof badge === 'function' ? badge() : 0;
    return `<a class="uf-nav" href="#/${r}" ${r === active ? 'aria-current="page"' : ''}>${I(ico)}<span>${label}</span>${n ? `<b class="uf-nav__count" aria-label="${n} need you">${n}</b>` : ''}</a>`; };
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
const ROUTE_OF = { P: 'project', C: 'calculation', O: 'quote', V: 'order', L: 'delivery', F: 'invoice', I: 'purchase' };
function recLink(id, text) {
  if (!id || id === '–') return '<span class="muted">–</span>';
  const k = String(id).split(' ')[0];
  return /^[PCOVLFI]\d{4}-\d{3}$/.test(k) ? `<a href="#/${ROUTE_OF[k[0]]}/${k}">${esc(text || id)}</a>` : esc(id);
}
const btn = (label, kind = 'secondary', attrs = '', ico) => `<button class="uf-pbtn uf-pbtn--${kind}" type="button" ${attrs}>${ico ? I(ico) : ''}${label}</button>`;
const actBtn = (n, kind = 'primary') => n ? btn(n.label, kind, `data-act="${n.act}" data-arg="${n.arg}"`) : '';
const doBtn = (label, act, arg, kind = 'secondary') => btn(label, kind, `data-act="${act}" data-arg="${arg}"`);
function agentPanel(title, body, actions = '') {
  return `<section class="agent" aria-label="Agent"><div class="agent__head">${I('agent')}<h2>${title}</h2></div><div class="agent__body">${body}</div>${actions ? `<div class="agent__actions">${actions}</div>` : ''}</section>`;
}
function timeline(items) {
  const first = items.slice(0, 4), rest = items.slice(4);
  return `<section class="rail-sec"><h2 class="uf-section-title">Timeline</h2><ul class="tl">${first.map(([t, d]) => `<li><span>${esc(t)}</span><time>${esc(d)}</time></li>`).join('')}${rest.map(([t, d]) => `<li hidden><span>${esc(t)}</span><time>${esc(d)}</time></li>`).join('')}</ul>${rest.length ? `<button class="linkbtn" data-more>Show ${rest.length} more</button>` : ''}</section>`;
}
function details(rows, title = 'Details') { return `<section class="rail-sec"><h2 class="uf-section-title">${title}</h2><dl class="drows">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl></section>`; }
function tabs(list, active) { return `<div class="tabs" role="tablist">${list.map(([k, t, n]) => `<button role="tab" class="tab" data-tab="${k}" aria-selected="${k === active}">${t}${n != null ? ` <span class="tab__n">${n}</span>` : ''}</button>`).join('')}</div>`; }
function tabset(list, active, panels) { return tabs(list, active) + `<div class="tabpanels">${list.map(([k]) => `<div class="tabpanel" data-panel="${k}" ${k === active ? '' : 'hidden'}>${panels[k] ?? '<p class="lead">Nothing here yet.</p>'}</div>`).join('')}</div>`; }
const DETAIL = [];
function table(cols, rows, detail) {
  return `<table class="uf-table uf-table--open"><thead><tr>${cols.map(c => `<th class="${c.num ? 'num' : ''}">${c.h}</th>`).join('')}</tr></thead>
  <tbody>${rows.map(r => { const d = !r._href && detail ? DETAIL.push({ cols, r, detail }) - 1 : -1;
    return `<tr ${r._hide ? 'hidden' : ''} ${r._cat ? `data-cat="${esc(r._cat)}"` : ''} ${r._href ? `data-href="${r._href}" tabindex="0"` : d >= 0 ? `data-detail="${d}" tabindex="0"` : ''}>${cols.map(c => `<td class="${c.num ? 'num' : ''}">${c.v(r)}</td>`).join('')}</tr>`; }).join('')}
  <tr class="norows" ${rows.some(r => !r._hide) ? 'hidden' : ''}><td colspan="${cols.length}">Nothing in this view.</td></tr></tbody></table>`;
}
function listPage({ title, sub, cats = [], primary, cols, rows, detail }) {
  const counts = {}; rows.forEach(r => (r._cat || '').split('|').forEach(c => { if (c) counts[c] = (counts[c] || 0) + 1; }));
  const pills = [['All', rows.length, '']].concat(cats.filter(c => counts[c]).map(c => [c, counts[c], c]));
  return `${head({ title, actions: primary || '' })}
  ${sub ? `<p class="lead">${sub}</p>` : ''}
  ${pills.length > 1 ? `<div class="viewpills" role="tablist">${pills.map(([t, n, f], i) => `<button class="vpill" data-filter="${esc(f)}" aria-selected="${i === 0}">${t} <span>${n}</span></button>`).join('')}</div>` : ''}
  ${table(cols, rows, detail)}`;
}

/* Journey stepper = breadcrumb. Green liquid = how far the project is; glass lens = the record you are on. Click a step to open it. */
function stepper(p, here) {
  const st = stage(p), sp = steps(p); here = here || st;
  const from = state.lastStep && state.lastStep.p === p.id ? state.lastStep.here : here;
  state.lastStep = { p: p.id, here };
  return `<div class="steps-wrap"><div class="steps-track" data-p="${p.id}" data-here="${here}" style="--n:8;--cur:${st};--pos:${from}">
    <ol class="uf-steps uf-steps--nav" aria-label="Project steps">${J.map((s, i) => { const x = sp[i], n = i + 1;
      const inner = `<span class="step-name">${s}</span><span class="step-rec">${x ? esc(x.rec) : '–'}</span>`;
      return `<li class="${n < st ? 'done' : ''}${n === here ? ' here' : ''}" ${n === st ? 'aria-current="step"' : ''}>${x
        ? `<a class="step-link" href="${x.href}" ${n === here ? 'aria-current="page"' : ''}>${inner}</a>`
        : `<button type="button" class="step-link step-link--future" data-future="${n}">${inner}</button>`}</li>`; }).join('')}</ol>
    <span class="steps-lens" aria-hidden="true"></span></div></div>`;
}
function pstepper(x) {
  return `<div class="steps-wrap"><ol class="uf-steps" style="--n:6;--cur:${x.step + 1}" aria-label="Purchase steps">${PST.map((s, i) => `<li class="${i < x.step ? 'done' : ''}" ${i === x.step ? 'aria-current="step"' : ''}>${s}</li>`).join('')}</ol></div>`;
}
const logo = s => `<svg width="${s}" height="${s}" viewBox="0 0 100 100" aria-hidden="true"><path fill="currentColor" d="M0 0H36V18H18V82H68A14 14 0 0 0 82 68V18H64V0H100V68A32 32 0 0 1 68 100H0Z"/></svg>`;
const pblock = (t, rows, dark) => `<div class="pblock ${dark ? 'pblock--dark' : ''}"><h3>${t}</h3><dl>${rows.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div>`;
const SENDER = [['Contact', 'Arjan Laninga'], ['Telefoon', '06 53 62 86 14'], ['E-mail', 'arjan@uniframe.nl']];
function paperTop(kind, id, lines) {
  return `<div class="paper__top"><div><div class="lockup">${logo(36)}<span>UNIFRAME<br>SYSTEMS</span></div><p class="paper__tag">Universele wand-, kozijn- en deursystemen</p></div>
    <div class="paper__id"><b>${kind}</b><span class="strong">${id}</span>${lines.map(l => `<span>${l}</span>`).join('')}</div></div>`;
}

/* ---------- quote and calculation (one record, two views) ---------- */
const state = { view: 'doc', qid: null };
const cq = () => S.quotes[state.qid];
const editable = q => q.status === 'Calculating' || q.status === 'To verify';
function checks(q) {
  const out = [];
  q.chapters.forEach((c, ci) => c.lines.forEach((l, li) => {
    const nr = `${ci + 1}.${li + 1}`;
    if (!l.cost) out.push({ kind: 'loss', text: `Line ${nr} "${l.desc}" has no price. ${l.hint ? `Last time (${l.hint.from}) it was ${eur(l.hint.price)}.` : 'It is not in the catalogue: enter a price. The agent does not set prices.'}`, ...(l.hint ? { fix: `data-fix="price" data-c="${ci}" data-l="${li}" data-v="${l.hint.price}"`, label: `Use ${eur(l.hint.price)}` } : {}) });
    else if (l.margin < R().marginFloor) out.push({ kind: 'attention', text: `Line ${nr} has ${l.margin} % margin. Your floor is ${R().marginFloor} %.`, fix: `data-fix="margin" data-c="${ci}" data-l="${li}" data-v="${R().marginFloor}"`, label: `Set to ${R().marginFloor} %` });
    if (l.src === 'missing' || (l.cost && !(l.qty > 0))) out.push({ kind: 'loss', text: `Line ${nr} has no quantity because the request does not state it. Request it from the customer or enter it.` });
    if (l.src === 'attachment') out.push({ kind: 'attention', text: `Line ${nr}: the quantity comes from a drawing or schedule. Verify it.` });
    if (l.check && l.note) out.push({ kind: 'attention', text: `Line ${nr}: ${l.note} Check the price.` });
    if (l.src === 'estimate') out.push({ kind: 'neutral', text: `Line ${nr} is an estimate. ${l.note || ''}` });
    if (l.byYou) out.push({ kind: 'neutral', text: `You changed line ${nr}. I keep your value and will not overwrite it.` });
  }));
  return out;
}
function quoteDoc(q) {
  const t = totals(q), ed = editable(q), ro = ed ? '' : 'readonly';
  return `<article class="paper ${ed ? '' : 'is-locked'}" aria-label="Quote document ${q.id}">
    ${paperTop('OFFERTE', q.id, [fmtNL(q.date), `Geldig t/m ${fmtNL(q.valid)}`])}
    <div class="paper__blocks">
      ${pblock('Opdrachtgever', [['Bedrijf', q.client.company], ['T.a.v.', q.client.attn], ['Adres', q.client.address], ['E-mail', q.client.email]])}
      ${pblock('Project', [['Nummer', q.project_info.nr], ['Omschrijving', q.project_info.desc], ['Levering', q.project_info.delivery], ['Onderwerp', q.project_info.subject]])}
      ${pblock('Uniframe Systems', SENDER, true)}
    </div>
    <input class="paper__salute edit" data-q="salutation" value="${esc(q.client.salutation)}" aria-label="Aanhef" ${ro}>
    <textarea class="paper__intro edit" data-q="intro" rows="2" aria-label="Inleiding" ${ro}>${esc(q.intro)}</textarea>
    <table class="ptable">
      <thead><tr><th>Nr.</th><th>Omschrijving</th><th class="num">Aantal</th><th>Eenheid</th><th class="num">Prijs p/e</th><th class="num">Totaal</th></tr></thead>
      ${q.chapters.map((c, ci) => `<tbody>
        <tr class="ptable__chap"><td>${ci + 1}.0</td><td colspan="4"><input class="edit strong" data-chap="${ci}" value="${esc(c.title)}" aria-label="Hoofdstuk ${ci + 1}" ${ro}></td><td class="num">${eurNL(c.lines.reduce((s, l) => s + lineTotal(l), 0))}</td></tr>
        ${c.lines.map((l, li) => `<tr class="${!l.cost ? 'flag' : ''}">
          <td>${ci + 1}.${li + 1}</td>
          <td><div class="edit ce" ${ed ? 'contenteditable="plaintext-only"' : ''} role="textbox" data-c="${ci}" data-l="${li}" data-f="desc" aria-label="Omschrijving ${ci + 1}.${li + 1}">${esc(l.desc)}</div></td>
          <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="qty" value="${l.qty}" inputmode="decimal" aria-label="Aantal" ${ro}></td>
          <td>${esc(l.unit)}</td>
          <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="price" value="${salePrice(l).toFixed(2)}" inputmode="decimal" aria-label="Prijs per eenheid" ${ro}></td>
          <td class="num">${eurNL(lineTotal(l))}</td></tr>`).join('')}
        ${ed ? `<tr class="ptable__add"><td></td><td colspan="5"><button class="linkbtn" data-addline="${ci}">+ Regel toevoegen</button></td></tr>` : ''}
      </tbody>`).join('')}
    </table>
    ${ed ? '<button class="linkbtn" data-addchap>+ Hoofdstuk toevoegen</button>' : ''}
    <div class="paper__total"><span><b>Totale investering</b> exclusief 21% BTW</span><b>${eurNL(t.sale)}</b></div>
    <p class="paper__foot">BTW 21 %: ${eurNL(t.vat)} · Totaal inclusief BTW: ${eurNL(t.sale + t.vat)}</p>
  </article>`;
}
function calcTable(q) {
  const t = totals(q), ed = editable(q), ro = ed ? '' : 'readonly';
  return `<table class="uf-table uf-table--open calc ${ed ? '' : 'is-locked'}">
    <thead><tr><th>Nr.</th><th>Line</th><th>Source</th><th class="num">Qty</th><th>Unit</th><th class="num">Cost p/u</th><th class="num">Margin</th><th class="num">Sale p/u</th><th class="num">Total</th></tr></thead>
    ${q.chapters.map((c, ci) => `<tbody><tr class="chap"><td>${ci + 1}.0</td><td colspan="7"><input class="edit strong" data-chap="${ci}" value="${esc(c.title)}" aria-label="Chapter ${ci + 1}" ${ro}></td><td class="num strong">${eur(c.lines.reduce((s, l) => s + lineTotal(l), 0))}</td></tr>
      ${c.lines.map((l, li) => `<tr class="${!l.cost || l.src === 'missing' ? 'flag' : ''}"><td>${ci + 1}.${li + 1}</td>
        <td><div class="edit ce" ${ed ? 'contenteditable="plaintext-only"' : ''} role="textbox" data-c="${ci}" data-l="${li}" data-f="desc" aria-label="Line ${ci + 1}.${li + 1}">${esc(l.desc)}</div>${l.art ? `<span class="uf-second">Article ${esc(l.art)}</span>` : ''}${l.note ? `<span class="uf-second">${esc(l.note)}</span>` : ''}</td>
        <td class="srcc">${srcLabel(l)}</td>
        <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="qty" value="${l.qty}" aria-label="Quantity" ${ro}></td><td>${esc(l.unit)}</td>
        <td class="num"><input class="edit num" data-c="${ci}" data-l="${li}" data-f="cost" value="${l.cost.toFixed(2)}" aria-label="Cost per unit" ${ro}></td>
        <td class="num"><span class="pctcell"><input class="edit num ${l.margin < R().marginFloor ? 'warn' : ''}" data-c="${ci}" data-l="${li}" data-f="margin" value="${l.margin}" aria-label="Margin %" ${ro}> %</span></td>
        <td class="num">${eur(salePrice(l))}</td><td class="num">${eur(lineTotal(l))}</td></tr>`).join('')}
      ${ed ? `<tr class="addrow"><td></td><td colspan="8"><button class="linkbtn" data-addline="${ci}">+ Add line</button></td></tr>` : ''}</tbody>`).join('')}
    <tfoot><tr><td></td><td>${ed ? '<button class="linkbtn" data-addchap>+ Add chapter</button>' : ''}</td><td colspan="3"></td><td class="num">${eur(t.cost)}</td><td class="num">${pct(t.margin)}</td><td></td><td class="num strong">${eur(t.sale)}</td></tr></tfoot>
  </table>`;
}
function quoteRail(q) {
  const c = checks(q), t = totals(q), ed = editable(q);
  const body = `<p>I read this ${state.view === 'doc' ? 'quote document' : 'calculation'} the same way you see it. Total ${eur(t.sale)} excl. VAT, margin ${t.margin} %.</p>
    ${!ed ? `<p class="muted">This quote is ${q.status.toLowerCase()}, so the lines are locked.${q.status === 'Rejected' ? ` Reason: ${esc(q.rejected || '–')}.` : ''}</p>` : c.length ? `<ul class="checks">${c.map(x => `<li class="check check--${x.kind}"><span>${esc(x.text)}</span>${x.fix ? `<button class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" ${x.fix}>${x.label}</button>` : ''}</li>`).join('')}</ul>` : '<p class="ok">Nothing left to check. Ready for you to approve.</p>'}
    <form class="tell" data-tell><label class="sr" for="tell">Tell the agent</label><input id="tell" placeholder="Tell the agent what to change" autocomplete="off"><button class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" type="submit">${I('send')}Send</button></form>`;
  return agentPanel('What the agent sees', body)
    + `<section class="rail-sec"><div class="rail-sec__head"><h2 class="uf-section-title">Files</h2><label class="uf-pbtn uf-pbtn--quiet uf-pbtn--sm">${I('upload')}Add file<input type="file" id="upfile" hidden></label></div>
      <ul class="files">${q.files.length ? q.files.map(f => `<li><button class="files__name linkbtn" data-file="${esc(f.name)}">${esc(f.name)}</button><span class="muted">${esc(f.from)}</span></li>`).join('') : '<li class="muted">No files yet.</li>'}</ul></section>`
    + timeline(q.timeline);
}
function quoteActions(q) {
  const p = P_(q.project), pdf = btn('Download PDF', 'secondary', 'data-print');
  if (q.status === 'Calculating') return doBtn('Make quote', 'toquote', q.id, 'primary');
  if (q.status === 'To verify') return doBtn('Reject draft', 'rejectdraft', q.id, 'quiet') + pdf + doBtn('Approve and send', 'sendquote', q.id, 'primary');
  if (q.status === 'Sent') return doBtn('Send follow-up', 'followup', q.id, 'quiet') + doBtn('Customer rejected', 'rejectq', q.id) + pdf + doBtn('Customer accepted', 'accept', q.id, 'primary');
  if (q.status === 'Accepted') return pdf + `<a class="uf-pbtn uf-pbtn--primary" href="#/order/${p.order}">Open order ${p.order}</a>`;
  return pdf + doBtn('Make new revision', 'revise', q.id, 'primary');
}

/* ---------- pages ---------- */
const P = {
  today() {
    const needs = [];
    Object.values(S.quotes).filter(q => q.status === 'To verify').forEach(q => { const n = checks(q).filter(c => c.kind !== 'neutral').length; needs.push(['attention', 'Verify', `Quote ${q.id} for ${q.client.company}${n ? `: ${n} point${n > 1 ? 's' : ''} to check` : ''}`, `#/quote/${q.id}`, 'Open quote']); });
    Object.values(S.quotes).filter(q => q.status === 'Calculating').forEach(q => { const n = checks(q).filter(c => c.kind === 'loss').length; if (n) needs.push(['loss', 'Needs a person', `Calculation ${q.calc} for ${q.client.company}: ${n} line${n > 1 ? 's need' : ' needs'} a price or quantity`, `#/calculation/${q.calc}`, 'Open calculation']); });
    S.relations.filter(r => r.toConfirm).forEach(r => needs.push(['attention', 'Confirm', `New customer ${r.name}: check the contact details`, '#/relations', 'Open customers']));
    S.invoices.filter(i => invState(i)[0] === 'loss').forEach(i => needs.push(['loss', 'Money', `${i.id} from ${custOfOrder(O_(i.order))} is ${invState(i)[1]}, ${eur(gross(i))}${reminderDue(i) ? `. Reminder ${i.reminders + 1} is due` : i.reminders ? `. Reminder ${i.reminders} sent` : ''}`, `#/invoice/${i.id}`, 'Open invoice']));
    S.purchases.filter(x => purState(x)[0] === 'loss').forEach(x => needs.push(['loss', 'Supplier', `${x.supplier} is ${purState(x)[1]} for ${x.order} (${custOfOrder(O_(x.order))})`, `#/purchase/${x.id}`, 'Open purchase']));
    if (window.UFMail && window.UFMail.isUnread('d4')) needs.push(['attention', 'Needs a person', 'Complaint from De Graaf about a scratched door', '#/inbox/d4', 'Read mail']);
    S.projects.forEach(p => { const s = stage(p), n = next(p);
      if (s === 1) { const rd = p.request.read, chk = rd ? Object.values(rd.fields).filter(f => f.status === 'check').length : 0, ms = rd ? rd.missing.length : 0;
        if (p.request.asked) needs.push(['neutral', 'Waiting', `${p.customer}: asked ${daysFrom(p.request.asked, TODAY)} days ago for ${ms || 'the missing'} detail${ms === 1 ? '' : 's'}`, n.href, 'Open request']);
        else needs.push(['active', 'New request', `${p.customer}: ${p.name}${rd ? ` (${chk ? chk + ' to verify' : 'details extracted'}${ms ? ', ' + ms + ' missing' : ''})` : ''}`, n.href, 'Open request']); }
      if (s === 2) needs.push(['neutral', 'Calculation', `${p.customer}: ${n.text}`, n.href, 'Open calculation']);
      if (s === 5) needs.push(['active', 'Delivery', `${p.customer}: ${n.text}`, n.href, 'Open delivery note']);
      if (s === 6) needs.push(['neutral', 'Money', `${p.customer}: ${n.text}`, n.href, 'Open']); });
    S.invoices.filter(i => i.status === 'Draft' && i.kind === 'Deposit').forEach(i => needs.push(['neutral', 'Money', `Deposit invoice ${i.id} is ready to send`, `#/invoice/${i.id}`, 'Open invoice']));
    S.purchases.filter(x => x.step === 0).forEach(x => needs.push(['neutral', 'Purchase', `${x.id} to ${x.supplier} is not sent yet`, `#/purchase/${x.id}`, 'Open purchase']));
    Object.values(S.quotes).filter(q => q.status === 'Sent' && daysFrom(q.sent, TODAY) >= R().followUpAfter).forEach(q => needs.push(['neutral', 'Follow-up', `${q.id} to ${q.client.company}: no reply for ${daysFrom(q.sent, TODAY)} days`, `#/quote/${q.id}`, 'Open quote']));
    const M = money();
    return `${head({ title: 'Today', actions: btn('New request', 'primary', 'data-new="project"', 'plus') })}
      <p class="lead">Sunday 22 November. ${needs.length ? `${needs.length} thing${needs.length > 1 ? 's' : ''} need${needs.length > 1 ? '' : 's'} you` : 'Nothing needs you'}; the agent handled 23 since yesterday.</p>
      <div class="split"><div class="split__main">
        <h2 class="uf-section-title">Needs you</h2>
        ${needs.length ? `<ol class="needs">${needs.map(([k, tag, t, h, a], i) => `<li><span class="needs__n">${i + 1}</span>${pill([k, tag])}<a class="needs__t" href="${h}">${esc(t)}</a><a class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" href="${h}">${a}</a></li>`).join('')}</ol>` : '<p class="ok">All done for today.</p>'}
        <h2 class="uf-section-title">Orders in progress</h2>
        ${table([{ h: 'Order', v: r => recLink(r.id) }, { h: 'Customer', v: r => esc(custOfOrder(r)) }, { h: 'Status', v: r => pill(orderState(r)) }, { h: 'Delivery', v: r => `Week ${r.week}` }, { h: 'Total', num: 1, v: r => eur(orderTotal(r)) }],
          S.orders.filter(o => stage(P_(o.project)) < 7).map(r => ({ ...r, _href: `#/order/${r.id}` })))}
      </div><aside class="split__rail">
        <section class="rail-sec"><h2 class="uf-section-title">Money outstanding</h2><dl class="drows"><div><dt><a href="#/invoices/Open">Open invoices</a></dt><dd>${eur(M.openSum)}</dd></div><div><dt><a href="#/invoices/Overdue">Overdue</a></dt><dd class="${M.overdue.length ? 'uf-loss' : ''}">${eur(M.overdueSum)}</dd></div><div><dt><a href="#/invoices/Still to invoice">Still to invoice</a></dt><dd>${eur(M.toInvoice)}</dd></div><div><dt><a href="#/invoices/To pay suppliers">To pay suppliers</a></dt><dd>${eur(M.toPay)}</dd></div></dl></section>
        <section class="rail-sec"><h2 class="uf-section-title">Agent activity</h2><ul class="tl">${S.activity.slice(0, 4).map(([t, d]) => `<li><span>${esc(t)}</span><time>${esc(d)}</time></li>`).join('')}</ul><a class="linkbtn" href="#/activity">All activity</a></section>
      </aside></div>`;
  },
  inbox(id) { return window.UFMail.render(id); },
  whatsapp(id) { return window.UFWhatsApp.render(id); },
  projects() {
    return listPage({ title: 'Projects', cats: J, primary: btn('New project', 'primary', 'data-new="project"', 'plus'),
      cols: [{ h: 'Project', v: r => `${recLink(r.id)} ${esc(r.name)}` }, { h: 'Customer', v: r => esc(r.customer) }, { h: 'Stage', v: r => J[stage(r) - 1] }, { h: 'Next step', v: r => esc(next(r)?.text || 'Done') },
        { h: 'Sale value', num: 1, v: r => r.quote ? eur(totals(Qt(r.quote)).sale) : '–' }, { h: 'Margin', num: 1, v: r => r.quote ? pct(totals(Qt(r.quote)).margin) : '–' }],
      rows: S.projects.map(r => ({ ...r, _href: `#/project/${r.id}`, _cat: J[stage(r) - 1] })) });
  },
  project(id) {
    const p = P_(id); if (!p) return notFound('Project', id);
    const q = p.quote && Qt(p.quote), o = p.order && O_(p.order), n = next(p), s = stage(p), t = q ? totals(q) : null;
    const paid = o ? invsOf(o.id).filter(i => i.status === 'Paid').reduce((a, i) => a + gross(i), 0) : 0;
    const recs = [[`<a href="#/request/${p.id}">Request</a>`, `${p.request.via} from ${esc(p.contact)}, ${fmt(p.request.date)}`, pill(['profit', 'Received']), '–']];
    if (q) recs.push([recLink(q.calc, `${q.calc} ${q.rev}`), `Calculation, ${q.chapters.length} chapters`, pill(q.status === 'Calculating' ? ['neutral', 'Calculating'] : ['profit', 'Done']), eur(t.sale)]);
    if (q && q.status !== 'Calculating') recs.push([recLink(q.id), `Quote to ${esc(q.client.attn)}`, pill(quoteState(q)), eur(t.sale)]);
    if (o) { recs.push([recLink(o.id), `Order, delivery week ${o.week}`, pill(orderState(o)), eur(orderTotal(o))]);
      pursOf(o.id).forEach(x => recs.push([recLink(x.id), `Purchase from ${esc(x.supplier)}`, pill(purState(x)), eur(purTotal(x))]));
      if (o.delivery) { const d = L_(o.delivery); recs.push([recLink(d.id), 'Delivery note', pill(d.delivered ? ['profit', `Delivered ${fmt(d.delivered)}`] : ['active', 'Ready to ship']), '–']); }
      invsOf(o.id).forEach(i => recs.push([recLink(i.id), `${i.kind} invoice`, pill(invState(i)), eur(gross(i))])); }
    const mails = window.UFMail.all().filter(m => m.email === p.email || m.to === p.email);
    return `${head({ crumbs: [['#/projects', 'Projects'], ['', p.id]], title: `${p.customer} · ${p.name}`, status: s === 8 ? ['profit', 'Done'] : ['active', J[s - 1]],
      facts: [['Customer', esc(p.customer)], ['Site', esc(p.site)], ['Sale value', t ? eur(t.sale) : '–'], ['Paid incl. VAT', eur(paid)], ['Margin', t ? pct(t.margin) : '–']],
      actions: btn('Edit values', 'secondary', `data-editproject="${p.id}"`) + btn('More', 'quiet', 'data-more-menu') + (n ? actBtn(n) : '') })}
      ${stepper(p)}
      ${tabset([['ov', 'Overview'], ['m', 'Mail', mails.length], ['files', 'Files', q ? q.files.length : 0]], 'ov', {
        ov: `<div class="split"><div class="split__main">
          <h2 class="uf-section-title">Next step</h2><p>${n ? `${esc(n.text)}. <a href="${n.href}">Go there</a>` : 'Everything is done: delivered, invoiced and paid.'}</p>
          <h2 class="uf-section-title">Records</h2>
          ${table([{ h: 'Record', v: r => r[0] }, { h: 'What', v: r => r[1] }, { h: 'Status', v: r => r[2] }, { h: 'Amount', num: 1, v: r => r[3] }], recs)}
        </div><aside class="split__rail">${agentPanel(s === 8 ? 'Project complete' : 'What happens next', `<p>${n ? esc(n.text) + '.' : 'All 8 steps are done. I archived the mails with the project.'}</p>`, n ? actBtn(n, 'secondary') : '')}
          ${details([['Contact', esc(p.contact)], ['E-mail', p.email ? `<a href="#" data-mailto="${esc(p.email)}">${esc(p.email)}</a>` : '–'], ['Owner', 'Arjan Laninga'], ['Created', fmt(p.created)]])}</aside></div>`,
        m: mails.length ? table([{ h: 'From', v: r => `<b>${esc(r.folder === 'sent' ? 'You' : r.from)}</b>` }, { h: 'Subject', v: r => esc(r.subject) }, { h: 'Date', v: r => esc(r.date) }], mails.map(m => ({ ...m, _href: `#/inbox/${m.id}` }))) : '<p class="lead">No mail with this customer yet.</p>',
        files: q && q.files.length ? table([{ h: 'File', v: r => `<button class="linkbtn" data-file="${esc(r.name)}">${esc(r.name)}</button>` }, { h: 'From', v: r => esc(r.from) }], q.files) : '<p class="lead">No files yet. Add them on the quote.</p>' })}`;
  },
  request(id) {
    const p = P_(id); if (!p) return notFound('Request', id);
    const q = p.quote && Qt(p.quote), r = p.request, rd = r.read, C = AG().CHECK;
    const ST = { found: ['profit', 'Found'], check: ['attention', 'Verify'], assumed: ['neutral', 'Default'], missing: ['loss', 'Missing'], optional: ['neutral', 'Optional'] };
    const need = rd ? C.filter(c => rd.fields[c.key].status === 'check').length : 0, miss = rd ? rd.missing.length : 0;
    const rows = rd ? C.map(c => { const f = rd.fields[c.key]; return `<tr><td><b>${c.label}</b></td><td><input class="edit rf" data-rf="${c.key}" data-p="${p.id}" value="${esc(f.value)}" placeholder="${c.req ? 'Not stated' : '–'}" aria-label="${c.label}">${c.unit ? `<span class="muted"> ${c.unit}</span>` : ''}${f.note ? `<span class="uf-second">${esc(f.note)}</span>` : ''}</td><td>${f.source ? esc(AG().SRC[f.source] || f.source) : '<span class="muted">–</span>'}</td><td>${pill(ST[f.status])}</td></tr>`; }).join('') : '';
    const conf = rd ? rd.conflicts.map(k => { const c = C.find(x => x.key === k.key); return `<li class="check check--attention"><span><b>${c.label}:</b> ${k.options.map(o => `${esc(AG().SRC[o.source] || o.source)} says ${esc(o.value)}`).join(', ')}. Select the correct value.</span><span class="rowbtns">${k.options.map(o => `<button class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" data-pick="${p.id}|${k.key}|${esc(o.value)}">Use ${esc(o.value)}</button>`).join('')}</span></li>`; }).join('') : '';
    const actions = (r.mail ? `<a class="uf-pbtn uf-pbtn--secondary" href="#/inbox/${r.mail}">Open e-mail</a>` : '') + (r.wa ? `<a class="uf-pbtn uf-pbtn--secondary" href="#/whatsapp/${r.wa}">Open conversation</a>` : '')
      + (rd && miss && !q ? doBtn('Request missing details', 'askcustomer', p.id) : '') + (q ? `<a class="uf-pbtn uf-pbtn--primary" href="#/calculation/${q.calc}">Open calculation ${q.calc}</a>` : doBtn('Make calculation', 'calc', p.id, 'primary'));
    const engine = rd ? `<p>${esc(engineLine(rd))}</p>${rd.summary ? `<p>${esc(rd.summary)}</p>` : ''}<p class="muted">${need ? `${need} value${need > 1 ? 's' : ''} to verify` : 'No values to verify'}${miss ? `, ${miss} missing` : ''}. Every value can be edited. Edited values are locked and never overwritten by the agent.</p>${rd.engine !== 'google' && !AG().cfg().key ? '<p class="muted">For the full agent, add a Google API key in <a href="#/settings">Settings → Agent</a>.</p>' : ''}${(rd.flags || []).map(f => `<p class="check check--attention"><span>${esc(f)}</span></p>`).join('')}`
      : '<p>The details of this request have not been extracted yet. Extract them now, or make the calculation yourself.</p>';
    return `${head({ crumbs: [['#/projects', 'Projects'], [`#/project/${p.id}`, `${p.id} ${p.name}`], ['', 'Request']], title: `Request from ${p.customer}`, status: r.asked && !q ? ['attention', `Waiting for customer since ${fmt(r.asked)}`] : ['profit', `${VIA[r.via] || r.via}, ${fmt(r.date)}`],
      facts: [['From', esc(p.contact)], ['E-mail', esc(p.email || '–')], ['Site', esc(p.site)], ['Received', fmtNL(r.date)]], actions })}
      ${stepper(p, 1)}
      <div class="split"><div class="split__main">
        ${p.newCustomer ? `<p class="check check--attention"><span>New customer created from this request. Verify the company details in <a href="#/relations">Customers and suppliers</a>.</span></p>` : ''}
        <article class="reqcard"><div class="reqcard__head"><b>${esc(p.contact)}, ${esc(p.customer)}</b><span class="muted">${r.via === 'Mail' ? esc(p.email) : r.via === 'WhatsApp' ? `WhatsApp${rd && rd.fields.phone && rd.fields.phone.value ? ', ' + esc(rd.fields.phone.value) : ''}` : `${esc(VIA[r.via] || r.via)}, recorded by Arjan Laninga`} · ${fmt(r.date)}</span></div><p>${esc(r.text).replace(/\n/g, '<br>')}</p>${(r.files || []).length ? `<p class="attach">${I('upload')}${esc(r.files.join(', '))}</p>` : ''}</article>
        ${rd ? `<h2 class="uf-section-title">Extracted details</h2>
          ${conf ? `<ul class="checks">${conf}</ul>` : ''}
          <table class="uf-table uf-table--open reqt"><thead><tr><th>Field</th><th>Value</th><th>Source</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table>
          ${rd.extras.length ? `<h2 class="uf-section-title">Additional items</h2><ul class="plain">${rd.extras.map(x => `<li>${esc(x.desc)}${x.qty ? `, ${x.qty} ${esc(x.unit)}` : ''}<span class="uf-second">Added to the calculation. Items that are not in the catalogue need a price.</span></li>`).join('')}</ul>` : ''}`
        : `<div>${doBtn('Extract details', 'readreq', p.id, 'secondary')}</div>`}
      </div><aside class="split__rail">${agentPanel('Agent summary', engine)}</aside></div>`;
  },
  calculations() {
    return listPage({ title: 'Calculations', cats: ['Calculating', 'Quoted'], primary: btn('New calculation', 'primary', 'data-new="calc"', 'plus'),
      cols: [{ h: 'Calculation', v: r => recLink(r.calc, `${r.calc} ${r.rev}`) }, { h: 'Customer and project', v: r => `${esc(r.client.company)}<div class="uf-second">${r.project} · ${esc(P_(r.project).name)}</div>` }, { h: 'Status', v: r => pill(r.status === 'Calculating' ? ['neutral', 'Calculating'] : ['profit', 'Quoted']) }, { h: 'Total', num: 1, v: r => eur(totals(r).sale) }, { h: 'Quote', v: r => r.status === 'Calculating' ? '–' : recLink(r.id) }],
      rows: Object.values(S.quotes).map(r => ({ ...r, _href: `#/calculation/${r.calc}`, _cat: r.status === 'Calculating' ? 'Calculating' : 'Quoted' })) });
  },
  calculation(id) { const q = QbyC(id); return q ? P.quoteRecord(q, 'calc') : notFound('Calculation', id); },
  quote(id) { const q = Qt(id); return q ? P.quoteRecord(q, q.status === 'Calculating' ? 'calc' : 'doc') : notFound('Quote', id); },
  quoteRecord(q, from) {
    if (state.qid !== q.id || !state.lockView) state.view = from === 'calc' ? 'calc' : 'doc';
    state.lockView = false; state.qid = q.id;
    const t = totals(q), isCalc = from === 'calc', p = P_(q.project);
    return `${head({ crumbs: [['#/projects', 'Projects'], [`#/project/${p.id}`, `${p.id} ${p.name}`], ['', isCalc ? `${q.calc} ${q.rev}` : q.id]],
      title: isCalc ? `Calculation ${q.calc} ${q.rev}` : `Quote ${q.id}`, status: quoteState(q),
      facts: [['Customer', `${esc(q.client.company)} · ${esc(p.contact)}`], ['Total excl. VAT', `<span data-live="sale">${eur(t.sale)}</span>`], ['Margin', `<span data-live="margin">${pct(t.margin)}</span>`], ['Valid until', fmt(q.valid)], [isCalc ? 'Quote' : 'Calculation', isCalc ? (q.status === 'Calculating' ? 'Not made yet' : recLink(q.id)) : recLink(q.calc, `${q.calc} ${q.rev}`)]],
      actions: quoteActions(q) })}
      ${stepper(p, isCalc ? 2 : 3)}
      <div class="viewbar"><div class="seg" role="tablist" aria-label="View">
        <button role="tab" data-view="calc" aria-selected="${state.view === 'calc'}">Calculation</button>
        <button role="tab" data-view="doc" aria-selected="${state.view === 'doc'}">Quote document</button></div>
        <span class="uf-second">${editable(q) ? 'Both views edit the same lines. Change a price in one and the other follows.' : 'Locked: this quote has gone to the customer.'}</span></div>
      <div class="split"><div class="split__main" id="qmain">${state.view === 'doc' ? quoteDoc(q) : calcTable(q)}</div><aside class="split__rail" id="qrail">${quoteRail(q)}</aside></div>`;
  },
  quotes() {
    return listPage({ title: 'Quotes', cats: ['To verify', 'Sent', 'Accepted', 'Rejected'], primary: btn('New quote', 'primary', 'data-new="calc"', 'plus'),
      cols: [{ h: 'Quote', v: r => recLink(r.id) }, { h: 'Customer and project', v: r => `${esc(r.client.company)}<div class="uf-second">${r.project} · ${esc(P_(r.project).name)}</div>` }, { h: 'Status', v: r => pill(quoteState(r)) }, { h: 'Sent', v: r => fmt(r.sent) }, { h: 'Total', num: 1, v: r => eur(totals(r).sale) }, { h: 'Margin', num: 1, v: r => pct(totals(r).margin) }],
      rows: Object.values(S.quotes).filter(q => q.status !== 'Calculating').map(r => ({ ...r, _href: `#/quote/${r.id}`, _cat: r.status })) });
  },
  orders() {
    return listPage({ title: 'Orders', cats: ['In production', 'Waiting for supplier', 'Ready to ship', 'Delivered', 'Invoiced', 'Paid'], primary: btn('New order', 'primary', 'data-new="order"', 'plus'),
      cols: [{ h: 'Order', v: r => recLink(r.id) }, { h: 'Customer and project', v: r => `${esc(custOfOrder(r))}<div class="uf-second">${r.project} · ${esc(P_(r.project).name)}</div>` }, { h: 'Status', v: r => pill(orderState(r)) }, { h: 'Delivery', v: r => r.delivery && L_(r.delivery).delivered ? fmt(L_(r.delivery).delivered) : `Week ${r.week}` }, { h: 'Total', num: 1, v: r => eur(orderTotal(r)) }, { h: 'Margin', num: 1, v: r => pct(totals(Qt(r.quote)).margin) }],
      rows: S.orders.map(r => { const s = stage(P_(r.project)); return { ...r, _href: `#/order/${r.id}`, _cat: s === 4 ? orderState(r)[1] : s === 5 ? 'Ready to ship' : s === 6 ? 'Delivered' : s === 7 ? 'Invoiced' : 'Paid' }; }) });
  },
  order(id) {
    const o = O_(id); if (!o) return notFound('Order', id);
    const p = P_(o.project), q = Qt(o.quote), n = next(p), s = stage(p), purs = pursOf(o.id), d = o.delivery && L_(o.delivery), late = purs.filter(x => purState(x)[0] === 'loss');
    const material = q.chapters.flatMap(c => c.lines).filter(l => l.unit !== 'uur' && l.unit !== 'post');
    const lineState = l => { if (s >= 6) return ['profit', 'Delivered']; if (s === 5) return ['profit', 'Packed']; if (l.unit === 'uur') return ['neutral', `Planned week ${o.week}`]; if (l.unit === 'post') return ['neutral', 'With delivery'];
      const x = purs.find(x => covers(x, l));
      return x ? (x.step >= 3 ? ['profit', 'In stock'] : purState(x)[0] === 'loss' ? ['attention', 'Waiting for supplier'] : ['active', x.step === 0 ? 'To order' : `Ordered, ${x.id}`]) : ['neutral', 'To order']; };
    const orderActs = (s === 4 ? doBtn('Order materials', 'materials', o.id) : '') + (n && s >= 4 && s <= 7 ? actBtn(n) : '');
    return `${head({ crumbs: [['#/orders', 'Orders'], ['', o.id]], title: `Order ${o.id}`, status: orderState(o), facts: [['Customer', esc(p.customer)], ['Project', recLink(p.id, `${p.id} ${p.name}`)], ['Delivery', d && d.delivered ? fmt(d.delivered) : `Week ${o.week}`], ['Total', eur(orderTotal(o))], ['Margin', pct(totals(q).margin)]],
      actions: orderActs || `<span class="uf-pill uf-pill--profit">Complete</span>` })}
      ${stepper(p, 4)}
      ${tabset([['l', 'Lines', q.chapters.reduce((a, c) => a + c.lines.length, 0)], ['p', 'Purchasing', purs.length], ['d', 'Delivery', d ? 1 : 0], ['f', 'Invoices', invsOf(o.id).length]], 'l', {
        l: `<div class="split"><div class="split__main">${table([{ h: 'Line', v: r => esc(r.desc) }, { h: 'Source', v: r => esc(lineSrc(r, purs)) }, { h: 'State', v: r => pill(lineState(r)) }, { h: 'Qty', num: 1, v: r => `${r.qty} ${r.unit}` }, { h: 'Total', num: 1, v: r => eur(lineTotal(r)) }], q.chapters.flatMap(c => c.lines))}</div>
          <aside class="split__rail">${late.length ? agentPanel('Supplier is late', `<p>${esc(late[0].supplier)} is ${purState(late[0])[1]} for ${late[0].id}. I asked for a new date this morning. Delivery may move a week.</p>`, `<a class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" href="#/purchase/${late[0].id}">Open ${late[0].id}</a>` + doBtn('Tell the customer', 'tellcustomer', o.id))
            : agentPanel(s === 8 ? 'Order complete' : 'What happens next', `<p>${n ? esc(n.text) + '.' : 'Delivered, invoiced and paid.'}</p>${s === 4 && !purs.length && material.length ? '<p>No materials ordered yet. Order materials makes a purchase order you check before it goes out.</p>' : ''}`)}
            ${details([['Customer ref.', esc(o.ref)], ['Payment', esc(o.payment)], ['Quote', recLink(o.quote)], ['Ordered', fmt(o.created)]])}</aside></div>`,
        p: (purs.length ? table([{ h: 'Purchase order', v: r => recLink(r.id) }, { h: 'Supplier', v: r => esc(r.supplier) }, { h: 'Status', v: r => pill(purState(r)) }, { h: 'Due', v: r => fmt(r.due) }, { h: 'Total', num: 1, v: r => eur(purTotal(r)) }], purs.map(r => ({ ...r, _href: `#/purchase/${r.id}` }))) : '<p class="lead">Nothing ordered for this order yet.</p>') + (s === 4 ? `<div>${doBtn('Order materials', 'materials', o.id)}</div>` : ''),
        d: d ? table([{ h: 'Delivery note', v: r => recLink(r.id) }, { h: 'Ready', v: r => fmt(r.ready) }, { h: 'Delivered', v: r => r.delivered ? `${fmt(r.delivered)}, signed by ${esc(r.signedBy)}` : 'Not yet' }], [{ ...d, _href: `#/delivery/${d.id}` }]) : `<p class="lead">No delivery note yet.</p>${s === 4 ? `<div>${doBtn('Make delivery note', 'note', o.id)}</div>` : ''}`,
        f: invsOf(o.id).length ? table([{ h: 'Invoice', v: r => recLink(r.id) }, { h: 'Kind', v: r => r.kind === 'Deposit' ? `Deposit ${r.pct} %` : 'Final' }, { h: 'Status', v: r => pill(invState(r)) }, { h: 'Total incl. VAT', num: 1, v: r => eur(gross(r)) }], invsOf(o.id).map(r => ({ ...r, _href: `#/invoice/${r.id}` }))) : `<p class="lead">No invoices yet.</p>`,
      })}`;
  },
  delivery(id) {
    const d = L_(id); if (!d) return notFound('Delivery note', id);
    const o = O_(d.order), p = P_(o.project), q = Qt(o.quote), f = finalOf(o.id);
    const lines = q.chapters.flatMap(c => c.lines).filter(l => l.unit !== 'uur' && l.unit !== 'post');
    const acts = btn('Download PDF', 'secondary', 'data-print') + (!d.delivered ? doBtn('Confirm delivery', 'delivered', d.id, 'primary') : f ? `<a class="uf-pbtn uf-pbtn--primary" href="#/invoice/${f.id}">Open invoice ${f.id}</a>` : doBtn('Make invoice', 'makeinv', o.id, 'primary'));
    return `${head({ crumbs: [['#/orders', 'Orders'], [`#/order/${o.id}`, o.id], ['', d.id]], title: `Delivery note ${d.id}`, status: d.delivered ? ['profit', `Delivered ${fmt(d.delivered)}`] : ['active', 'Ready to ship'],
      facts: [['Customer', esc(p.customer)], ['Deliver to', esc(p.site)], ['Ready', fmt(d.ready)], ['Signed by', d.delivered ? esc(d.signedBy) : '–']], actions: acts })}
      ${stepper(p, d.delivered ? 6 : 5)}
      <div class="split"><div class="split__main"><article class="paper" aria-label="Delivery note ${d.id}">
        ${paperTop('PAKBON', d.id, [fmtNL(d.ready), `Order ${o.id}`])}
        <div class="paper__blocks">${pblock('Afleveradres', [['Bedrijf', p.customer], ['T.a.v.', p.contact], ['Adres', p.site]])}${pblock('Order', [['Order', o.id], ['Project', `${p.id} ${p.name}`], ['Uw ref.', o.ref]])}${pblock('Uniframe Systems', SENDER, true)}</div>
        <table class="ptable"><thead><tr><th>Nr.</th><th>Omschrijving</th><th class="num">Aantal</th><th>Eenheid</th><th>Gecontroleerd</th></tr></thead><tbody>
          ${lines.map((l, i) => `<tr><td>${i + 1}</td><td>${esc(l.desc)}</td><td class="num">${l.qty}</td><td>${esc(l.unit)}</td><td>${d.delivered ? '✓' : '☐'}</td></tr>`).join('')}</tbody></table>
        <div class="sigbox"><div><span>Afgeleverd op</span><b>${d.delivered ? fmtNL(d.delivered) : ''}</b></div><div><span>Handtekening ontvanger</span><b class="sig">${d.delivered ? esc(d.signedBy) : ''}</b></div></div>
      </article></div><aside class="split__rail">${agentPanel(d.delivered ? 'Delivered' : 'Ready to ship', `<p>${d.delivered ? `${esc(d.signedBy)} signed for ${lines.length} lines. ${f ? `Invoice ${f.id} is made.` : 'Make the final invoice next.'}` : 'Everything is packed. When the team is back, press Confirm delivery and type who signed.'}</p>`)}
        ${details([['Order', recLink(o.id)], ['Project', recLink(p.id)], ['Montage', `Week ${o.week}`]])}</aside></div>`;
  },
  invoices(start) { start = decodeURIComponent(start || "");
    const M = money(), cats = ['Overdue', 'Open', 'Draft', 'Still to invoice', 'To pay suppliers', 'Paid'];
    const inv = S.invoices.map(r => ({ _href: `#/invoice/${r.id}`, id: r.id, who: custOfOrder(O_(r.order)), what: `${recLink(r.order)} · ${r.kind === 'Deposit' ? `deposit ${r.pct} %` : 'final invoice'}`, st: pill(invState(r)) + (r.status === 'Sent' && r.reminders ? ` <span class="muted">${r.reminders} reminder${r.reminders > 1 ? 's' : ''}</span>` : ''), due: fmt(r.due), amt: gross(r),
      _cat: r.status === 'Paid' ? 'Paid' : r.status === 'Draft' ? 'Draft' : invState(r)[0] === 'loss' ? 'Overdue|Open' : 'Open' }));
    const uninv = M.uninv.map(o => { const s = stage(P_(o.project)); return { _href: `#/order/${o.id}`, id: o.id, who: custOfOrder(o), what: s === 6 ? 'Delivered, final invoice not sent' : s === 5 ? 'Ready to ship' : 'In production', st: pill(['neutral', invsOf(o.id).some(i => i.status === 'Draft') ? 'Invoice drafted' : 'Not invoiced']), due: `Week ${o.week}`, amt: toInvoiceOf(o), _cat: 'Still to invoice' }; });
    const pay = M.payable.map(x => ({ _href: `#/purchase/${x.id}`, id: x.id, who: x.supplier, what: `Purchase for ${recLink(x.order)}`, st: pill(['attention', 'Invoice matched, to pay']), due: fmt(x.due), amt: -Math.round(purTotal(x) * 121) / 100, _cat: 'To pay suppliers' }));
    const rows = inv.concat(uninv, pay), counts = {}; rows.forEach(r => r._cat.split('|').forEach(c => { counts[c] = (counts[c] || 0) + 1; }));
    const pick = cats.includes(start) && counts[start] ? start : '';
    const pills = [['All', rows.length, '']].concat(cats.filter(c => counts[c]).map(c => [c, counts[c], c]));
    return `${head({ title: 'Invoices', actions: btn('Export to Exact', 'secondary', 'data-exact') + btn('New invoice', 'primary', 'data-new="invoice"', 'plus'),
      facts: [['Open invoices', eur(M.openSum)], ['Overdue', `<span class="${M.overdue.length ? 'uf-loss' : ''}">${eur(M.overdueSum)}</span>`], ['Still to invoice', eur(M.toInvoice)], ['To pay suppliers', eur(M.toPay)]] })}
      <div class="viewpills" role="tablist">${pills.map(([t, n, f]) => `<button class="vpill" data-filter="${esc(f)}" aria-selected="${f === pick}">${t} <span>${n}</span></button>`).join('')}</div>
      ${table([{ h: 'Record', v: r => recLink(r.id) }, { h: 'Customer or supplier', v: r => esc(r.who) }, { h: 'For', v: r => r.what }, { h: 'Status', v: r => r.st }, { h: 'Due', v: r => r.due }, { h: 'Amount incl. VAT', num: 1, v: r => `<span class="${r.amt < 0 ? 'uf-loss' : ''}">${eur(r.amt)}</span>` }],
        rows.map(r => pick && !r._cat.split('|').includes(pick) ? { ...r, _hide: 1 } : r))}
      <p class="muted">Amounts going out to suppliers are shown with a minus sign. Still to invoice is the order value including VAT minus what has been invoiced.</p>`;
  },
  invoice(id) {
    const i = F_(id); if (!i) return notFound('Invoice', id);
    const o = O_(i.order), p = P_(o.project), q = Qt(o.quote), amt = invAmount(i), st = invState(i);
    const deps = i.kind === 'Final' ? invsOf(o.id).filter(x => x.kind === 'Deposit') : [];
    const rows = i.kind === 'Deposit' ? [[`Aanbetaling ${i.pct} % op order ${o.id}, ${q.project_info.subject}`, amt]]
      : q.chapters.map(c => [c.title, c.lines.reduce((s, l) => s + lineTotal(l), 0)]).concat(deps.map(x => [`Af: aanbetaling ${x.id}`, -invAmount(x)]));
    const acts = btn('Download PDF', 'secondary', 'data-print') + (i.status === 'Draft' ? doBtn('Send invoice', 'sendinv', i.id, 'primary')
      : i.status === 'Sent' ? (st[0] === 'loss' ? doBtn(`Send reminder ${i.reminders + 1}`, 'reminder', i.id, reminderDue(i) ? 'secondary' : 'quiet') : '') + doBtn('Register payment', 'pay', i.id, 'primary') : '');
    return `${head({ crumbs: [['#/invoices', 'Invoices'], ['', i.id]], title: `Invoice ${i.id}`, status: st,
      facts: [['Customer', esc(p.customer)], ['Order', recLink(o.id)], ['Total incl. VAT', eur(gross(i))], ['Due', fmt(i.due)], ['Exact', i.status === 'Draft' ? 'Not booked' : 'Booked']], actions: acts })}
      ${stepper(p, i.kind === 'Final' ? (i.status === 'Paid' ? 8 : 7) : 4)}
      <div class="split"><div class="split__main"><article class="paper" aria-label="Invoice ${i.id}">
        ${paperTop('FACTUUR', i.id, [`Factuurdatum ${fmtNL(i.date)}`, `Vervaldatum ${fmtNL(i.due)}`])}
        <div class="paper__blocks">${pblock('Factuuradres', [['Bedrijf', p.customer], ['T.a.v.', p.contact], ['E-mail', p.email]])}${pblock('Betreft', [['Order', o.id], ['Project', `${p.id} ${p.name}`], ['Uw ref.', o.ref]])}${pblock('Uniframe Systems', [['IBAN', 'NL12 RABO 0123 4567 89'], ['KvK', '42160232'], ['BTW', 'NL0021.60.232.B01']], true)}</div>
        <table class="ptable"><thead><tr><th>Nr.</th><th>Omschrijving</th><th class="num">Bedrag</th></tr></thead><tbody>
          ${rows.map(([t, a], k) => `<tr><td>${k + 1}</td><td>${esc(t)}</td><td class="num">${eurNL(a)}</td></tr>`).join('')}</tbody></table>
        <div class="paper__total"><span><b>Te betalen</b> inclusief 21% BTW</span><b>${eurNL(gross(i))}</b></div>
        <p class="paper__foot">Subtotaal ${eurNL(amt)} · BTW 21 % ${eurNL(gross(i) - amt)} · Graag betalen voor ${fmtNL(i.due)} onder vermelding van ${i.id}</p>
        ${i.status === 'Paid' ? `<p class="paidstamp">BETAALD ${fmtNL(i.paid)}</p>` : ''}
      </article></div><aside class="split__rail">${agentPanel(i.status === 'Paid' ? 'Paid' : 'Payment', `<p>${i.status === 'Paid' ? `Paid on ${fmt(i.paid)}. Booked in Exact.${i.kind === 'Final' ? ' This closes the project.' : ''}` : i.status === 'Draft' ? 'This invoice is ready. Send it and I book it in Exact.' : st[0] === 'loss' ? `It is ${st[1]}. ${i.reminders ? `Reminder ${i.reminders} was sent.` : ''} ${reminderDue(i) ? `Your rule is a reminder ${R().reminderAfter} days after the due date, so reminder ${i.reminders + 1} is due now.` : `The next reminder is due ${R().reminderAfter} days after the ${i.reminders ? 'last reminder' : 'due date'} (Agent rules).`} Register the payment when it comes in.` : `Sent on ${fmt(i.date)}. I watch the bank and tell you when it is paid.`}</p>`)}
        ${details([['Kind', i.kind === 'Deposit' ? `Deposit ${i.pct} %` : 'Final invoice'], ['Reminders sent', i.reminders], ['Project', recLink(p.id)]])}</aside></div>`;
  },
  purchasing() {
    return listPage({ title: 'Purchasing', cats: ['Draft', 'Sent', 'Confirmed', 'Late', 'Received', 'Invoice matched', 'Paid'], primary: btn('New purchase order', 'primary', 'data-new="purchase"', 'plus'),
      cols: [{ h: 'Purchase order', v: r => recLink(r.id) }, { h: 'Supplier', v: r => esc(r.supplier) }, { h: 'For order', v: r => recLink(r.order) }, { h: 'Status', v: r => pill(purState(r)) }, { h: 'Due', v: r => fmt(r.due) }, { h: 'Total', num: 1, v: r => eur(purTotal(r)) }],
      rows: S.purchases.map(r => ({ ...r, _href: `#/purchase/${r.id}`, _cat: PST[r.step] + (purState(r)[0] === 'loss' ? '|Late' : '') })) });
  },
  purchase(id) {
    const x = I_(id); if (!x) return notFound('Purchase order', id);
    const o = O_(x.order), st = purState(x);
    const A = [doBtn('Send to supplier', 'psend', x.id, 'primary'), doBtn('Supplier confirmed', 'pconfirm', x.id, 'primary'), doBtn('Goods received', 'preceive', x.id, 'primary'), doBtn('Match purchase invoice', 'pmatch', x.id, 'primary'), doBtn('Mark as paid', 'ppay', x.id, 'primary'), ''][x.step];
    const extra = (x.step === 1 || x.step === 2 ? doBtn('Chase supplier', 'pchase', x.id) : '') + (x.step === 0 ? doBtn('Delete draft', 'pdelete', x.id, 'quiet') : '') + btn('Download PDF', 'secondary', 'data-print');
    const next = ['Check the lines, then send it. I write the mail to ' + esc(x.supplier) + '.', st[0] === 'loss' ? `${esc(x.supplier)} is ${st[1]}. Chase them or wait for their new date.` : 'Waiting for the supplier to confirm a date.', st[0] === 'loss' ? `${esc(x.supplier)} is ${st[1]}. Chase them, or register the goods when they arrive.` : `Confirmed for ${fmt(x.due)}. Register the goods when they arrive.`, 'Goods are in. Match the purchase invoice when it comes in.', 'Invoice matched within the tolerance. Pay it on the due date.', 'Paid and booked. This purchase is complete.'][x.step];
    return `${head({ crumbs: [['#/purchasing', 'Purchasing'], ['', x.id]], title: `Purchase order ${x.id}`, status: st,
      facts: [['Supplier', esc(x.supplier)], ['For order', recLink(o.id)], ['Customer', esc(custOfOrder(o))], ['Due', fmt(x.due)], ['Total excl. VAT', eur(purTotal(x))]], actions: extra + (A || '<span class="uf-pill uf-pill--profit">Complete</span>') })}
      ${pstepper(x)}
      <div class="split"><div class="split__main"><article class="paper" aria-label="Purchase order ${x.id}">
        ${paperTop('INKOOPORDER', x.id, [fmtNL(x.created), `Leveren ${fmtNL(x.due)}`])}
        <div class="paper__blocks">${pblock('Leverancier', [['Bedrijf', x.supplier], ['E-mail', D0.supplierMail[x.supplier] || '–']])}${pblock('Voor', [['Order', o.id], ['Klant', custOfOrder(o)]])}${pblock('Afleveren', [['Adres', 'IJsselweg 41C, 7061 XV Terborg'], ['Contact', 'Arjan Laninga']], true)}</div>
        <table class="ptable"><thead><tr><th>Nr.</th><th>Omschrijving</th><th class="num">Aantal</th><th>Eenheid</th><th class="num">Prijs</th><th class="num">Totaal</th></tr></thead><tbody>
          ${x.lines.map((l, k) => `<tr><td>${k + 1}</td><td>${esc(l.desc)}${x.step >= 3 ? ' <span class="ok">✓ received</span>' : ''}</td><td class="num">${l.qty}</td><td>${esc(l.unit)}</td><td class="num">${eurNL(l.price)}</td><td class="num">${eurNL(l.qty * l.price)}</td></tr>`).join('')}</tbody></table>
        <div class="paper__total"><span><b>Totaal</b> exclusief BTW</span><b>${eurNL(purTotal(x))}</b></div>
      </article></div><aside class="split__rail">${agentPanel('What happens next', `<p>${next}</p>`)}
        ${timeline(x.log.slice().reverse())}${details([['Supplier mail', esc(D0.supplierMail[x.supplier] || '–')], ['Created', fmt(x.created)]])}</aside></div>`;
  },
  planning() {
    const weeks = [48, 49, 50, 51, 52];
    const rows = S.orders.filter(o => stage(P_(o.project)) < 6).map(o => ({ id: o.id, n: `${o.id} ${custOfOrder(o)}`, w: o.week, k: orderState(o)[0] === 'attention' ? 'attention' : 'active', href: `#/order/${o.id}` }))
      .concat(Object.values(S.quotes).filter(q => q.status === 'Sent' || q.status === 'To verify').map(q => ({ id: q.id, n: `${q.project} ${P_(q.project).name} (if accepted)`, w: q.week || 51, k: 'neutral', href: `#/quote/${q.id}` })));
    state.planRows = rows;
    const cap = wk => Math.min(140, 8 + rows.reduce((s, r) => s + (wk >= r.w - 1 && wk <= r.w ? (r.k === 'neutral' ? 4 : 42) : 0), 0));
    return `${head({ title: 'Planning', actions: btn('Re-plan', 'secondary', 'data-replan') + btn('Approve plan', 'primary', 'data-approveplan') })}
      <p class="lead">Each bar is production and montage, ending in the delivery week. Drag a bar, or select it and use the arrow keys, to move it a week.</p>
      <div class="gantt" style="--w:${weeks.length}"><div></div>${weeks.map(w => `<div class="gantt__h">Week ${w}</div>`).join('')}
      ${rows.map((r, i) => { const s = Math.max(0, r.w - 1 - 48); return `<div class="gantt__n"><a href="${r.href}">${esc(r.n)}</a></div><div class="gantt__track" style="grid-column: span ${weeks.length}"><button type="button" class="gantt__bar gantt__bar--${r.k}" data-bar="${i}" style="left:${s * 20}%;width:${Math.min(2, 5 - s) * 20}%" aria-label="${esc(r.n)}: delivery week ${r.w}. Drag or use arrow keys to move."></button></div>`; }).join('')}</div>
      <h2 class="uf-section-title">Capacity</h2><dl class="drows drows--wide">${weeks.map(w => `<div><dt>Montage team week ${w}</dt><dd class="${cap(w) > 85 ? 'uf-warn' : ''}">${cap(w)} % booked</dd></div>`).join('')}</dl>`;
  },
  relations() {
    return listPage({ title: 'Customers and suppliers', cats: ['Customer', 'Supplier'], primary: btn('New customer or supplier', 'primary', 'data-new="company"', 'plus'),
      cols: [{ h: 'Company', v: r => `<b>${esc(r.name)}</b>${r.toConfirm ? ' <span class="uf-pill uf-pill--attention">Confirm</span>' : ''}` }, { h: 'Type', v: r => r.kind }, { h: 'Contact', v: r => esc(r.contact) }, { h: 'E-mail', v: r => esc(r.email || '–') }, { h: 'City', v: r => esc(r.city) },
        { h: 'Open', v: r => { const n = r.kind === 'Customer' ? S.projects.filter(p => p.customer === r.name && stage(p) < 8).length : S.purchases.filter(x => x.supplier === r.name && x.step < 5).length; return n ? `${n} ${r.kind === 'Customer' ? 'project' : 'purchase'}${n > 1 ? 's' : ''}` : '–'; } }],
      rows: S.relations.map(r => ({ ...r, _cat: r.kind })), detail: { actions: ['Write an email', 'New project for this company', 'Edit company'] } });
  },
  articles() {
    return listPage({ title: 'Articles', cats: ['Low stock'], primary: btn('New article', 'primary', 'data-new="article"', 'plus'),
      cols: [{ h: 'Code', v: r => `<b>${esc(r.code)}</b>` }, { h: 'Article', v: r => esc(r.name) }, { h: 'Group', v: r => esc(r.group) }, { h: 'Unit', v: r => r.unit }, { h: 'Source', v: r => esc(r.source ? (r.supplier ? `${r.source}: ${r.supplier}` : r.source) : '–') }, { h: 'Cost', num: 1, v: r => eur(r.cost) }, { h: 'Margin', num: 1, v: r => pct(r.margin) }, { h: 'Stock', num: 1, v: r => ['m1', 'uur', 'post'].includes(r.unit) ? 'Made to order' : `${r.stock}${r.stock < 5 ? ' (low)' : ''}` }],
      rows: S.articles.map(r => ({ ...r, _cat: !['m1', 'uur', 'post'].includes(r.unit) && r.stock < 5 ? 'Low stock' : '' })), detail: { actions: ['Edit price', 'Correct the stock count', 'Order more'] } });
  },
  activity() {
    return listPage({ title: 'Agent activity', sub: 'Everything the agent and you did. Undo is on the message right after each action. Select a row to correct the agent.', cats: ['By the agent', 'By you', 'Rule changes'],
      primary: btn('Agent rules', 'secondary', 'data-go="#/rules"') + btn('Tell the agent', 'primary', 'data-tellagent'),
      cols: [{ h: 'What happened', v: r => esc(r[0]) }, { h: 'Who', v: r => r[2] === 'agent' ? 'Agent' : 'You' }, { h: 'When', v: r => esc(r[1]) }],
      rows: S.activity.map(r => Object.assign([...r], { _cat: (r[2] === 'agent' ? 'By the agent' : 'By you') + (/^Rule changed|^You told the agent/.test(r[0]) ? '|Rule changes' : '') })), detail: { actions: ['Tell the agent'] } });
  },
  rules() {
    const v = R(), row = (key, label, unit, help, min, max) => `<div><dt><label for="r-${key}">${label}</label><span class="uf-second">${help}</span></dt><dd><input class="field field--num" type="number" id="r-${key}" data-rule="${key}" value="${v[key]}" min="${min}" max="${max}" step="1"> <span class="muted">${unit}</span></dd></div>`;
    const changed = S.activity.filter(a => /^Rule changed|^You told the agent/.test(a[0])).slice(0, 5);
    return `${head({ title: 'Agent rules', actions: btn('Tell the agent', 'secondary', 'data-tellagent') + btn('Reset to defaults', 'quiet', 'data-rulereset') + btn('Save rules', 'primary', 'data-saverules') })}
      <p class="lead">You decide what the agent may do alone. The portal uses these values everywhere: on quotes, invoices, purchases and Today.</p>
      <h2 class="uf-section-title">Quotes</h2>
      <dl class="rules">${row('marginFloor', 'Margin floor', '%', 'Lines below this are flagged and the agent asks you before the quote goes out.', 0, 60)}${row('quoteValid', 'Quote valid for', 'days', 'Set on every new calculation.', 7, 120)}${row('followUpAfter', 'Follow up a quote after', 'days', 'After this many days without a reply, the quote appears on Today.', 3, 60)}</dl>
      <h2 class="uf-section-title">Invoices</h2>
      <dl class="rules">${row('paymentTerm', 'Payment term', 'days', 'Due date of every new invoice.', 7, 60)}${row('reminderAfter', 'Reminder after the due date', 'days', 'When an invoice is this late, the agent puts a reminder on Today. The next one follows a week later.', 0, 30)}${row('depositPct', 'Deposit at order', '%', 'Used when the customer pays a deposit.', 10, 90)}
        <div><dt><label for="r-autoInvoice">Draft the final invoice when a delivery is signed</label><span class="uf-second">The agent makes the draft. You still check it and press Send.</span></dt><dd><select class="field" id="r-autoInvoice" data-rule="autoInvoice"><option value="1" ${v.autoInvoice ? 'selected' : ''}>Yes</option><option value="0" ${v.autoInvoice ? '' : 'selected'}>No, I make it myself</option></select></dd></div></dl>
      <h2 class="uf-section-title">Purchasing</h2>
      <dl class="rules">${row('tolerance', 'Price tolerance on purchase invoices', '€', 'Differences up to this amount are accepted. Bigger differences go to you.', 0, 500)}</dl>
      <h2 class="uf-section-title">Fixed</h2>
      <dl class="rules"><div><dt>Send quotes without a person<span class="uf-second">Every quote is verified and sent by a person. This cannot be changed.</span></dt><dd>Never</dd></div><div><dt>Set prices<span class="uf-second">The agent never invents a price. Lines that are not in the catalogue wait for you.</span></dt><dd>Never</dd></div></dl>
      ${changed.length ? `<h2 class="uf-section-title">Recent changes</h2><ul class="tl">${changed.map(([t, d]) => `<li><span>${esc(t)}</span><time>${esc(d)}</time></li>`).join('')}</ul>` : ''}`;
  },
  settings() {
    const conn = [['Exact Online', ['profit', 'Connected']], ['Gmail', window.UFMail && window.UFMail.connected ? ['profit', 'Connected'] : ['neutral', 'Example mode']], ['Outlook', ['neutral', 'Not connected']], ['WhatsApp Business', ['neutral', 'Example conversations']]];
    let cid = ''; try { cid = JSON.parse(localStorage.getItem('uf-gmail-client') || '""'); } catch (e) {}
    const field = (k, v) => `<div><dt>${k}</dt><dd><input class="field" value="${esc(v)}" aria-label="${k}"></dd></div>`;
    return `${head({ title: 'Settings', actions: btn('Save', 'primary', 'data-save="Settings saved."') })}
      ${tabset([['ag', 'Agent'], ['c', 'Company'], ['d', 'Defaults'], ['con', 'Connections'], ['m', 'Automatic mails'], ['x', 'Example data']], 'ag', {
        ag: agentTab(),
        c: `<dl class="rules">${field('Company name', 'Uniframe Systems')}${field('Address', 'IJsselweg 41C, 7061 XV Terborg')}${field('KvK', '42160232')}${field('Phone', '06 53 56 32 32')}</dl>`,
        d: `<dl class="rules">${field('Quote valid for', '30 days')}${field('Payment term', '14 days')}${field('Default margin', '20 %')}${field('VAT', '21 %')}</dl>`,
        con: `<dl class="rules">${conn.map(([k, st]) => `<div><dt>${k}</dt><dd>${pill(st)} ${k === 'WhatsApp Business' ? btn('How to connect', 'secondary', 'data-wahelp') : k === 'Gmail' ? (window.UFMail.connected ? btn('Open inbox', 'secondary', 'data-go="#/inbox"') : btn('Connect Gmail', 'secondary', 'data-gmail')) : btn(st[1] === 'Connected' ? 'Disconnect' : 'Connect', 'secondary')}</dd></div>`).join('')}
          <div><dt>Gmail OAuth client ID<span class="uf-second">From Google Cloud. Needed to read and send real mail. Without it, mail is sent in example mode: saved in Sent, not delivered.</span></dt><dd><input class="field" id="gcid" value="${esc(cid)}" placeholder="…apps.googleusercontent.com" aria-label="Gmail OAuth client ID"></dd></div></dl>`,
        m: `<dl class="rules">${field('Quote follow-up after', '14 days')}${field('Payment reminder after', '3 days')}${field('Signature', 'Met vriendelijke groet, Arjan Laninga')}</dl>`,
        x: `<p class="lead">Everything you do in this prototype is saved in this browser only. Reset puts all projects, orders, purchases, invoices and mail back to the example.</p><div>${btn('Reset example data', 'secondary', 'data-resetall')}</div>` })}`;
  },
  ask(qs) {
    qs = (qs || '').trim();
    const form = `<form class="askbar" data-ask><input class="field" name="q" value="${esc(qs)}" placeholder="For example: open quotes for Wallsz" aria-label="Question"><button class="uf-pbtn uf-pbtn--primary" type="submit">Ask</button></form>`;
    if (!qs) return `${head({ title: 'Ask the portal' })}${form}<p class="lead">Type a customer, record number, product or question.</p>`;
    const SETS = [['Project', S.projects, r => `#/project/${r.id}`, r => `${r.id} ${r.name}`, r => r.customer, r => J[stage(r) - 1]],
      ['Quote', Object.values(S.quotes).filter(q => q.status !== 'Calculating'), r => `#/quote/${r.id}`, r => r.id, r => r.client.company, r => quoteState(r)[1]],
      ['Calculation', Object.values(S.quotes), r => `#/calculation/${r.calc}`, r => r.calc, r => r.client.company, r => r.status === 'Calculating' ? 'Calculating' : 'Quoted'],
      ['Order', S.orders, r => `#/order/${r.id}`, r => r.id, r => custOfOrder(r), r => orderState(r)[1]],
      ['Delivery note', S.deliveries, r => `#/delivery/${r.id}`, r => r.id, r => custOfOrder(O_(r.order)), r => r.delivered ? 'Delivered' : 'Ready'],
      ['Invoice', S.invoices, r => `#/invoice/${r.id}`, r => r.id, r => custOfOrder(O_(r.order)), r => invState(r)[1]],
      ['Purchase order', S.purchases, r => `#/purchase/${r.id}`, r => r.id, r => r.supplier, r => purState(r)[1]],
      ['Company', S.relations, () => '#/relations', r => r.name, r => r.kind, r => r.contact],
      ['Article', S.articles, () => '#/articles', r => r.code, r => r.name, r => `${r.stock} in stock`]];
    const stop = new Set(['open', 'for', 'the', 'a', 'an', 'of', 'and', 'all', 'show', 'me', 'my', 'with', 'which', 'what', 'are', 'is', 'from', 'to', 'in', 'quotes', 'quote', 'orders', 'order', 'projects', 'project', 'invoices', 'invoice', 'purchase', 'purchases']);
    let hits = [];
    if (/14 days|longer|no reply/i.test(qs)) hits = Object.values(S.quotes).filter(q => q.status === 'Sent' && daysFrom(q.sent, TODAY) >= R().followUpAfter).map(r => ({ k: 'Quote', _href: `#/quote/${r.id}`, id: r.id, what: r.client.company, st: quoteState(r)[1] }));
    else {
      const kind = (/quote/i.test(qs) && 'Quote') || (/invoice/i.test(qs) && 'Invoice') || (/purchase/i.test(qs) && 'Purchase order') || (/order/i.test(qs) && 'Order') || (/project/i.test(qs) && 'Project') || null;
      const words = qs.toLowerCase().split(/[^a-z0-9-]+/).filter(w => w && !stop.has(w));
      SETS.forEach(([k, rows, href, id, what, st]) => rows.forEach(r => { const text = (JSON.stringify(r) + ' ' + what(r) + ' ' + st(r)).toLowerCase();
        if (words.every(w => text.includes(w)) && (!kind || k === kind) && (words.length || kind)) hits.push({ k, _href: href(r), id: id(r), what: what(r), st: st(r) }); }));
    }
    const say = hits.length ? `I found ${hits.length} record${hits.length > 1 ? 's' : ''} for “${esc(qs)}”.` : `I found nothing for “${esc(qs)}”. Try a customer name, a record number such as O2611-010, or a product.`;
    return `${head({ title: 'Ask the portal' })}${form}<p class="lead">${say}</p>
      ${hits.length ? table([{ h: 'Type', v: r => r.k }, { h: 'Record', v: r => `<a href="${r._href}">${esc(r.id)}</a>` }, { h: 'What', v: r => esc(r.what) }, { h: 'Status', v: r => esc(r.st) }], hits) : ''}`;
  },
};
function notFound(kind, id) { return `${head({ title: `${kind} not found` })}<p class="lead">There is no ${kind.toLowerCase()} ${esc(id)}. It may have been removed with Undo or a reset. <a href="#/today">Back to Today</a></p>`; }

/* ---------- actions: each one changes the store, logs it, and offers Undo ---------- */
const logA = (t, who = 'you') => S.activity.unshift([t, now(), who]);

/* Agent rules: change, log, and say what the change does to the records that are open now. */
const RULE_TXT = { marginFloor: ['Margin floor', v => `${v} %`], quoteValid: ['Quote valid for', v => `${v} days`], followUpAfter: ['Follow up a quote after', v => `${v} days`], paymentTerm: ['Payment term', v => `${v} days`],
  reminderAfter: ['Reminder after the due date', v => `${v} days`], depositPct: ['Deposit at order', v => `${v} %`], tolerance: ['Price tolerance', v => eur(v)], autoInvoice: ['Draft the final invoice on delivery', v => v ? 'yes' : 'no'] };
const RULE_RANGE = { marginFloor: [0, 60], quoteValid: [7, 120], followUpAfter: [3, 60], paymentTerm: [7, 60], reminderAfter: [0, 30], depositPct: [10, 90], tolerance: [0, 500] };
function ruleImpact(k, v) {
  const openQ = Object.values(S.quotes).filter(editable);
  if (k === 'marginFloor') { const n = openQ.reduce((a, q) => a + q.chapters.flatMap(c => c.lines).filter(l => l.cost && l.margin < v).length, 0); return n ? `${n} line${n > 1 ? 's' : ''} on open quotes ${n > 1 ? 'are' : 'is'} now below the floor and flagged` : 'No line on an open quote is below the new floor'; }
  if (k === 'followUpAfter') { const n = Object.values(S.quotes).filter(q => q.status === 'Sent' && daysFrom(q.sent, TODAY) >= v).length; return n ? `${n} quote${n > 1 ? 's' : ''} now need${n > 1 ? '' : 's'} a follow-up on Today` : 'No quote needs a follow-up yet'; }
  if (k === 'reminderAfter') { const n = S.invoices.filter(reminderDue).length; return n ? `${n} invoice${n > 1 ? 's' : ''} now need${n > 1 ? '' : 's'} a reminder on Today` : 'No invoice needs a reminder yet'; }
  if (k === 'paymentTerm') return `New invoices are due after ${v} days. Invoices already sent keep their due date`;
  if (k === 'quoteValid') return `New calculations are valid for ${v} days`;
  if (k === 'depositPct') return `New orders with a deposit ask ${v} % at order`;
  if (k === 'tolerance') return `Purchase invoices are accepted up to ${eur(v)} difference`;
  if (k === 'autoInvoice') return v ? 'The agent drafts the final invoice when a delivery is signed' : 'You make the final invoice yourself after delivery';
  return '';
}
function setRules(next, how, said) {
  const old = R(), ch = [];
  Object.keys(next).forEach(k => { let v = next[k]; if (k !== 'autoInvoice') { if (!isFinite(v)) return; const [lo, hi] = RULE_RANGE[k]; v = Math.min(hi, Math.max(lo, v)); next[k] = v; } if (v !== old[k]) ch.push(k); });
  if (!ch.length) { if (said) run(() => { logA(`You told the agent: ${said}`); return ['Noted. Your rules already say this, so nothing changed.']; }); else toast('Nothing changed.'); return; }
  run(() => { S.rules = { ...old }; ch.forEach(k => { S.rules[k] = next[k]; });
    if (said) logA(`You told the agent: ${said}`);
    ch.forEach(k => logA(`Rule changed: ${RULE_TXT[k][0]} ${RULE_TXT[k][1](old[k])} → ${RULE_TXT[k][1](S.rules[k])}`));
    return [`${how}: ${ch.map(k => `${RULE_TXT[k][0].toLowerCase()} is now ${RULE_TXT[k][1](S.rules[k])}`).join(', ')}. ${ch.map(k => ruleImpact(k, S.rules[k])).join('. ')}.`]; });
}
/* Reads an instruction in English or Dutch and turns it into rule changes. Anything it cannot map is logged and left to you. */
function parseRules(text, context = '') {
  const out = {}, clauses = text.toLowerCase().split(/[.;\n]|\band\b|\ben\b/);
  clauses.forEach(c => { const m = c.match(/(\d+(?:[.,]\d+)?)/), v = m ? num(m[1]) : null;
    if (/factu|invoice/.test(c) && /(deliver|lever|sign|getekend|after the|na de)/.test(c) && !v) { out.autoInvoice = !/(don'?t|do not|stop|never|niet|geen|no longer|myself|zelf)/.test(c); return; }
    if (v == null) return;
    if (/marge|margin/.test(c)) out.marginFloor = v;
    else if (/toleran|verschil|difference/.test(c)) out.tolerance = v;
    else if (/remind|herinner|aanman/.test(c)) out.reminderAfter = v;
    else if (/follow|opvolg|nabel|no reply|geen reactie/.test(c)) out.followUpAfter = v;
    else if (/deposit|aanbetal/.test(c)) out.depositPct = v;
    else if (/valid|geldig/.test(c)) out.quoteValid = v;
    else if (/payment term|pay within|betaaltermijn|betalen binnen|due|vervaldatum/.test(c)) out.paymentTerm = v; });
  if (!Object.keys(out).length && /^(don'?t|do not|stop|never|niet|no longer)/i.test(text.trim()) && /final invoice/i.test(context)) out.autoInvoice = false;
  return out;
}
function tellAgent(context) {
  openDrawer('Tell the agent', `${context ? `<p class="muted">About: ${esc(context)}</p>` : ''}<label class="fl">What should the agent do differently?<textarea class="field" rows="4" id="tta" placeholder="For example: send a reminder 7 days after the due date. Or: keep the margin at least 22 %."></textarea></label>
    <p class="hint">The agent changes its rules from what you write and shows you what changed. You can always undo, or change them in Agent rules.</p>`,
    '<button class="uf-pbtn uf-pbtn--primary" type="submit">Send to agent</button>', f => {
      const said = $('#tta', f).value.trim(); if (!said) { toast('Write what the agent should do differently.'); return false; }
      const next = parseRules(said, context);
      if (Object.keys(next).length) { setRules(next, 'Rules updated', said); return; }
      run(() => { logA(`You told the agent: ${said}${context ? ` (about: ${context})` : ''}`); return ['Noted in the activity. This does not match one of the agent rules, so nothing changes automatically. The rules are on Agent rules.']; }); });
}
function nextNum() {
  const ids = [...S.projects.map(x => x.id), ...Object.keys(S.quotes), ...S.orders.map(x => x.id), ...S.deliveries.map(x => x.id), ...S.invoices.map(x => x.id), ...S.purchases.map(x => x.id)];
  const n = Math.max(12, ...ids.map(i => /^[A-Z]2611-(\d{3})$/.test(i) ? +i.slice(-3) : 0)) + 1;
  return String(n).padStart(3, '0');
}
function run(fn) {
  const snap = JSON.stringify(S), mail = window.UFMail.dump(), wa = window.UFWhatsApp ? window.UFWhatsApp.dump() : null, from = location.hash;
  const r = fn(); if (!r) return;
  const [msg, go] = r; save();
  const undo = () => { S = JSON.parse(snap); window.UFMail.restore(mail); if (wa) window.UFWhatsApp.restore(wa); save(); state.lockView = true;
    if (location.hash !== from) location.hash = from; else { state.keepScroll = true; route(); } toast('Undone.'); };
  closeLayers();
  if (go && location.hash !== go) location.hash = go; else { state.lockView = true; state.keepScroll = true; route(); }
  toast(msg, undo);
}
function mailModal({ title, to, subject, body, attach, ok }, then) {
  modal(title, `<div class="mailprev"><label class="fl">To<input class="field" id="mm-to" value="${esc(to)}"></label><label class="fl">Subject<input class="field" id="mm-su" value="${esc(subject)}"></label>
    <label class="fl">Message<textarea class="field" id="mm-bo" rows="8">${esc(body)}</textarea></label>${attach ? `<p class="attach">${I('upload')}${esc(attach)}</p>` : ''}
    <p class="hint">${window.UFMail.connected ? 'Sends from your connected Gmail.' : 'Example mode: the mail is saved in Inbox → Sent and is not delivered.'}</p></div>`, ok || 'Send', m => {
    const mail = { to: $('#mm-to', m).value.trim(), subject: $('#mm-su', m).value, body: $('#mm-bo', m).value, attach };
    if (!/\S+@\S+\.\S+/.test(mail.to)) { toast('Add a valid e-mail address in To.'); return false; }
    run(() => { window.UFMail.send(mail); return then(mail); });
  });
}
const greet = p => /^(afdeling|planning|verkoop|contact|inkoop)/i.test(p.contact) || !p.contact.includes(' ') ? 'Geachte heer, mevrouw,' : `Beste ${p.contact.split(' ')[0]},`;
const sig = '\n\nMet vriendelijke groet,\nArjan Laninga\nUniframe Systems · 06 53 62 86 14';
/* ---------- the agent's work: customer, project, calculation lines, changes ---------- */
const AG = () => window.UFAgent;
const VIA = { Mail: 'E-mail', Phone: 'Phone call', Visit: 'Site visit', Meeting: 'Meeting', WhatsApp: 'WhatsApp', 'By hand': 'Entered manually' };
/* Where an order line comes from: a supplier, the factory, or our own team */
const lineSrc = (l, purs) => { const k = keyOf(l), a = (l.art && S.articles.find(x => x.code === l.art)) || (k && S.articles.find(x => x.key === k)); if (a) return a.supplier ? `Supplier: ${a.supplier}` : a.source;
  const x = purs.find(p => covers(p, l)); return x ? `Supplier: ${x.supplier}` : (l.unit === 'uur' || l.unit === 'post') ? 'Own team' : 'Own factory'; };
const srcLabel = l => l.src === 'missing' ? '<span class="src src--missing">Missing</span>' : l.src ? `<span class="src src--${l.src}">${esc(({ mail: 'E-mail', whatsapp: 'WhatsApp', attachment: 'Drawing', notes: 'Call notes', default: 'Default', person: 'Entered by you', estimate: 'Estimate', match: 'Customer record' })[l.src] || l.src)}</span>` : '<span class="muted">–</span>';
const engineLine = r => !r ? '' : r.engine === 'google' ? `Read by the Google model ${r.model} in ${(r.ms / 1000).toFixed(1)} s.` : `Read by the basic reader${r.reason ? ` (the Google request failed: ${r.reason})` : ''}.`;
const A_ = k => S.articles.find(a => a.key === k);
const keyOf = l => l.key || (/systeemwand dicht/i.test(l.desc) ? 'wall-solid' : /systeemwand (enkel|dubbel)/i.test(l.desc) ? 'wall' : /kozijn/i.test(l.desc) ? 'frame' : /hang- en sluit/i.test(l.desc) ? 'hw' : /opdekdeur|^deur/i.test(l.desc) ? 'door' : /montage/i.test(l.desc) ? 'install' : /transport/i.test(l.desc) ? 'transport' : '');
const lineFrom = (a, qty, src, note, extra = {}) => ({ key: a.key, art: a.code, desc: a.desc || a.name, qty: qty ?? 0, unit: a.unit, cost: a.cost, margin: a.margin, src: qty == null ? 'missing' : src, ...(note ? { note } : {}), ...extra });
const SYN = [[/systeemwand dicht|dichte wand|solid wall/i, 'wall-solid'], [/kozijn/i, 'frame'], [/hang- en sluit|cilinder/i, 'hw']];
function buildLines(rd) {
  const v = k => { const f = rd.fields[k]; return f && f.value !== '' ? +f.value : null; }, src = k => (rd.fields[k] || {}).source || 'default';
  const L = v('length'), H = v('height'), D = v('doors'), K = v('frames'), dbl = (rd.fields.glass || {}).value === 'double';
  const ch = [], tbc = 'Not in the catalogue, so a person prices it.';
  ch.push({ title: 'Systeemwanden', lines: [dbl ? { key: 'wall-double', desc: 'Systeemwand dubbel glas', qty: L ?? 0, unit: 'm1', cost: 0, margin: 20, src: L == null ? 'missing' : src('length'), note: tbc }
    : lineFrom(A_('wall'), L, src('length'), H && H !== 3000 ? `The article is 3000 mm high. The request says ${H} mm.` : '', H && H !== 3000 ? { check: true } : {})] });
  if (K) ch.push({ title: 'Kozijnen', lines: [lineFrom(A_('frame'), K, src('frames'))] });
  if (D !== 0) ch.push({ title: 'Deuren', lines: [lineFrom(A_('door'), D, src('doors')), lineFrom(A_('hw'), D, src('doors'))] });
  const extra = (rd.extras || []).map(x => { const hit = SYN.find(([re]) => re.test(x.desc)), a = hit && A_(hit[1]);
    return a ? lineFrom(a, x.qty, 'mail') : { key: 'extra', desc: x.desc, qty: x.qty ?? 0, unit: x.unit || 'm1', cost: 0, margin: 20, src: x.qty == null ? 'missing' : 'mail', note: tbc }; });
  if (extra.length) ch.push({ title: 'Aanvullend', lines: extra });
  const hrs = Math.round((L || 0) * 1.2 + (D || 0) * 2 + (K || 0) * 1.5);
  ch.push({ title: 'Montage en transport', lines: [lineFrom(A_('install'), hrs, 'estimate', 'Estimate: 1.2 hours per metre of wall, 2 per door, 1.5 per frame.'), lineFrom(A_('transport'), 1, 'default')] });
  return ch;
}
const lineBy = (q, key) => { for (const c of q.chapters) for (const l of c.lines) if (keyOf(l) === key) return l; return null; };
const qtySnap = q => { const o = {}; q.chapters.forEach(c => c.lines.forEach(l => { const k = keyOf(l); if (k) o[k] = (o[k] || 0) + l.qty; })); return o; };
const LBL = { wall: 'Wall length', 'wall-double': 'Wall length', frame: 'Frames', door: 'Doors', install: 'Installation hours' };
/* A change from a customer's reply or from a person. A value a person set is never overwritten by the customer's side. */
function applyChange(q, ch, by) {
  const keys = { doors: ['door', 'hw'], length: ['wall', 'wall-double'], frames: ['frame'] }[ch.target], before = qtySnap(q), skipped = [];
  const main = keys.map(k => lineBy(q, k)).find(Boolean);
  if (!main && ch.target === 'doors') { const rows = [lineFrom(A_('door'), ch.value, 'person'), lineFrom(A_('hw'), ch.value, 'person')]; q.chapters.splice(Math.max(0, q.chapters.length - 1), 0, { title: 'Deuren', lines: rows }); }
  else if (!main && ch.target === 'frames') q.chapters.splice(Math.max(0, q.chapters.length - 1), 0, { title: 'Kozijnen', lines: [lineFrom(A_('frame'), ch.value, 'person')] });
  else if (main) { const nv = ch.mode === 'add' ? main.qty + ch.value : ch.value;
    if (by === 'customer' && main.byYou) skipped.push(`${LBL[keyOf(main)] || main.desc}: you set this value yourself, so I did not change it.`);
    else keys.forEach(k => { const l = lineBy(q, k); if (l) { l.qty = nv; l.src = by === 'person' ? 'person' : 'mail'; if (by === 'person') l.byYou = true; delete l.check; } }); }
  const s = qtySnap(q), L = (lineBy(q, 'wall') || lineBy(q, 'wall-double') || { qty: 0 }).qty, D = (lineBy(q, 'door') || { qty: 0 }).qty, K = (lineBy(q, 'frame') || { qty: 0 }).qty, ins = lineBy(q, 'install');
  if (ins && !ins.byYou && ins.src === 'estimate') ins.qty = Math.round(L * 1.2 + D * 2 + K * 1.5);
  const after = qtySnap(q), diff = Object.keys(after).filter(k => LBL[k] && after[k] !== (before[k] || 0)).map(k => `${LBL[k]} ${before[k] || 0} → ${after[k]}`);
  return { diff, skipped };
}
const domainName = em => String(em || '').split('@')[1] ? cap1(em.split('@')[1].split('.')[0].replace(/[-_]/g, ' ')) : 'Unknown customer';
const cap1 = s => s.replace(/\b\w/g, c => c.toUpperCase());
function matchCustomer(rd) {
  const em = (rd.fields.email.value || '').toLowerCase(), dom = em.split('@')[1], cust = S.relations.filter(x => x.kind === 'Customer'), nm = (rd.fields.customer.value || '').toLowerCase();
  const ph = String(rd.fields.phone && rd.fields.phone.value || '').replace(/\D/g, '').slice(-9);
  return (ph.length === 9 && cust.find(x => String(x.phone || '').replace(/\D/g, '').slice(-9) === ph)) || (dom && cust.find(x => (x.email || '').toLowerCase().endsWith('@' + dom))) || (nm && cust.find(x => x.name.toLowerCase().includes(nm) || nm.includes(x.name.toLowerCase()))) || null;
}
function newProject(rd, { via, text, files = [], mail, wa }) {
  const f = k => rd.fields[k].value; let rel = matchCustomer(rd), isNew = false;
  if (rel && !f('customer')) rd.fields.customer = { value: rel.name, source: 'match', status: 'found' };
  if (!rel) { rel = { name: f('customer') || (f('email') ? domainName(f('email')) : f('contact') || 'Unknown customer'), kind: 'Customer', contact: f('contact') || 'Contact', email: f('email') || '', phone: f('phone') || '', city: '–', toConfirm: true }; S.relations.push(rel); isNew = true; }
  const id = `P2611-${nextNum()}`;
  S.projects.unshift({ id, name: f('project') || f('site') || 'New project', customer: rel.name, contact: f('contact') || rel.contact, email: f('email') || rel.email, site: f('site') || '–', created: TODAY, newCustomer: isNew,
    request: { via, date: TODAY, text, ...(mail ? { mail } : {}), ...(wa ? { wa } : {}), files: files.map(x => x.name), read: rd } });
  logA(`${rd.engine === 'google' ? 'Google model' : 'Basic reader'} read ${via === 'Mail' ? 'an e-mail' : via === 'WhatsApp' ? 'a WhatsApp conversation' : 'call notes'} from ${f('contact') || rel.name} and created request ${id}`, 'agent');
  return id;
}
/* A person edits or picks a value on the request. It is locked (source: person) and follows into the calculation. */
function setField(p, key, val) {
  const rd = p.request.read, f = rd.fields[key]; f.value = val; f.source = val ? 'person' : ''; delete f.note; AG().restatus(rd); rd.conflicts = rd.conflicts.filter(k => k.key !== key);
  const m = { contact: 'contact', email: 'email', site: 'site', project: 'name', customer: 'customer' }[key]; if (m && val) p[m] = val;
  const tg = { length: 'length', doors: 'doors', frames: 'frames' }[key], cq_ = p.quote && Qt(p.quote), n = num(val);
  if (tg && cq_ && editable(cq_) && val !== '' && isFinite(n)) applyChange(cq_, { target: tg, mode: 'set', value: n }, 'person');
  save();
}
function draftLines(p) { return buildLines(p.request.read || AG()._normalize(AG()._example(p.request.text, p.request.via), 'mail')); }
const purchasePrice = l => Math.round(l.cost * 0.65 * 100) / 100;
const ASKQ = { length: 'Hoe lang is de wand? (in meters)', height: 'Wat is de hoogte van de wand? (2600 / 3000 / 3200 mm / anders)', doors: 'Hoeveel deuren zijn er nodig?', site: 'Wat is het adres van de locatie?' };
const DO = {
  readreq(pid) { const p = P_(pid); toast('Extracting the details…');
    AG().read({ text: p.request.text, via: p.request.via === 'Mail' ? 'Mail' : 'Phone' }).then(rd => run(() => { p.request.read = rd;
      [['customer', p.customer], ['contact', p.contact], ['email', p.email], ['site', p.site === '–' ? '' : p.site]].forEach(([k, v]) => { if (v && !rd.fields[k].value) rd.fields[k] = { value: v, source: 'match', status: 'found' }; }); logA(`${rd.engine === 'google' ? 'Google model' : 'Example reader'} read the request of ${p.customer}`, 'agent');
      return [`Details extracted.${rd.missing.length ? ` ${rd.missing.length} required detail${rd.missing.length > 1 ? 's are' : ' is'} missing.` : ' All required details were found.'}`]; })); },
  askcustomer(pid) { const p = P_(pid), rd = p.request.read, ask = rd.missing.filter(k => ASKQ[k]);
    if (!ask.length) { toast('Nothing is missing, so there is nothing to ask.'); return; }
    mailModal({ title: 'Ask the customer', to: p.email, subject: `Uw aanvraag: ${p.name}`, body: `${greet(p)}\n\nDank voor uw aanvraag. Om een goede prijs te maken hebben we nog ${ask.length === 1 ? 'één gegeven' : 'een paar gegevens'} nodig:\n\n${ask.map((k, i) => `${i + 1}. ${ASKQ[k]}`).join('\n')}\n\nWeet u iets nog niet? Laat het ons weten. Dan rekenen we met een standaardwaarde en vermelden dat in de offerte.${sig}` }, () => {
      p.request.asked = TODAY; logA(`Asked ${p.customer} for ${ask.length} missing detail${ask.length > 1 ? 's' : ''}`); return [`Questions sent to ${p.customer}. The request now waits for the customer.`]; }); },
  calc(pid) { run(() => { const p = P_(pid), n = nextNum(), id = `O2611-${n}`, calc = `C2611-${n}`;
    S.quotes[id] = { id, calc, rev: 'R1', project: pid, date: TODAY, valid: addDays(TODAY, R().quoteValid), status: 'Calculating', intro: D0.quotes['O2611-010'].intro, files: [], timeline: [['Agent drafted the calculation from the request', now()]],
      client: { company: p.customer, attn: p.contact, address: p.site, email: p.email, salutation: 'Geachte heer, mevrouw,' }, project_info: { nr: p.id, desc: p.name, delivery: p.site, subject: 'Levering systeemwanden, kozijnen en deuren' }, chapters: draftLines(p) };
    p.quote = id; logA(`Drafted calculation ${calc} for ${p.customer} from the request`, 'agent');
    const open = checks(S.quotes[id]).filter(c => c.kind === 'loss').length;
    return [`The agent drafted calculation ${calc} from the catalogue.${open ? ` ${open} line${open > 1 ? 's' : ''} still need${open > 1 ? '' : 's'} a price or quantity.` : ' Check the lines, then press Make quote.'}`, `#/calculation/${calc}`]; }); },
  toquote(qid) { const blockers = checks(Qt(qid)).filter(c => c.kind === 'loss'); if (blockers.length) { toast(`Not yet: ${blockers.length} line${blockers.length > 1 ? 's need' : ' needs'} a price or quantity. They are listed under “What the agent sees”.`); return; }
    run(() => { const q = Qt(qid); q.status = 'To verify'; q.timeline.unshift(['You turned the calculation into a quote', now()]); logA(`Made quote ${q.id} from ${q.calc}`);
    return [`Quote ${q.id} made. Verify it and press Approve and send.`, `#/quote/${q.id}`]; }); },
  rejectdraft(qid) { const q = Qt(qid); modal('Reject this draft?', `<label class="fl">Reason, so the agent learns<textarea class="field" rows="3" id="why" placeholder="For example: use the 2027 glass prices"></textarea></label>`, 'Reject draft', m => run(() => {
    const why = $('#why', m).value.trim() || 'no reason given'; q.status = 'Calculating'; q.timeline.unshift([`You rejected the draft: ${why}`, now()]); logA(`Rejected draft ${q.id}: ${why}`);
    return ['Draft sent back to the calculation. Change the lines, then make the quote again.', `#/calculation/${q.calc}`]; })); },
  sendquote(qid) { const q = Qt(qid), t = totals(q), open = checks(q).filter(c => c.kind !== 'neutral').length, blockers = checks(q).filter(c => c.kind === 'loss');
    if (blockers.length) { toast(`This quote cannot be sent yet: ${blockers.length} line${blockers.length > 1 ? 's need' : ' needs'} a price or quantity. Nothing is sent without them.`); return; }
    mailModal({ title: `Send quote ${q.id}${open ? ` (${open} open point${open > 1 ? 's' : ''})` : ''}`, to: q.client.email, subject: `Offerte ${q.id} · ${q.project_info.desc}`, attach: `Offerte ${q.id}.pdf`,
      body: `${q.client.salutation}\n\nIn de bijlage vindt u onze offerte ${q.id} voor ${q.project_info.desc}, totaal ${eurNL(t.sale)} exclusief BTW. De offerte is geldig tot ${fmtNL(q.valid)}.${sig}` }, () => {
      q.status = 'Sent'; q.sent = TODAY; q.timeline.unshift(['You approved and sent the quote', now()]); logA(`Sent quote ${q.id} to ${q.client.company}`);
      const pa = q.pendingAccept; delete q.pendingAccept;
      return [pa ? `Quote ${q.id} ${q.rev} sent. ${q.client.company} already accepted it by mail, so press Customer accepted to make the order.` : `Quote ${q.id} sent to ${q.client.company}. The mail is in Inbox → Sent.`]; }); },
  followup(qid) { const q = Qt(qid);
    mailModal({ title: 'Send a follow-up', to: q.client.email, subject: `RE: Offerte ${q.id}`, body: `${q.client.salutation}\n\nOp ${fmtNL(q.sent)} stuurden we offerte ${q.id}. Heeft u nog vragen, of kunnen we de opdracht inplannen?${sig}` }, () => {
      q.timeline.unshift(['You sent a follow-up', now()]); logA(`Followed up on ${q.id}`); return ['Follow-up sent. It is in Inbox → Sent.']; }); },
  accept(qid) { const q = Qt(qid), p = P_(q.project);
    modal(`${q.client.company} accepted ${q.id}?`, `<p>This makes the order. You can change the delivery week later in Planning.</p>
      <label class="fl">Customer reference<input class="field" id="ref" placeholder="Their PO number, if any"></label>
      <label class="fl">Delivery week<select class="field" id="wk">${[49, 50, 51, 52].map(w => `<option ${w === 51 ? 'selected' : ''}>${w}</option>`).join('')}</select></label>
      <label class="fl">Payment<select class="field" id="pay"><option>${R().paymentTerm} days after delivery</option><option value="deposit">${R().depositPct} % at order, ${100 - R().depositPct} % on delivery</option><option>30 days after delivery</option></select></label>`, 'Make order', m => run(() => {
      const id = `V2611-${nextNum()}`, pay = $('#pay', m).value, payTxt = $('#pay', m).selectedOptions[0].textContent;
      S.orders.push({ id, project: p.id, quote: q.id, created: TODAY, week: +$('#wk', m).value, ref: $('#ref', m).value.trim() || '–', payment: payTxt });
      p.order = id; q.status = 'Accepted'; q.accepted = TODAY; q.timeline.unshift([`${q.client.company} accepted; order ${id} made`, now()]); logA(`Made order ${id} from quote ${q.id}`);
      if (pay === 'deposit') S.invoices.push({ id: `F2611-${nextNum()}`, order: id, kind: 'Deposit', pct: R().depositPct, date: TODAY, due: addDays(TODAY, R().paymentTerm), status: 'Draft', reminders: 0 });
      return [`Order ${id} made. Next: order the materials.`, `#/order/${id}`]; })); },
  rejectq(qid) { const q = Qt(qid); modal(`${q.client.company} said no?`, `<label class="fl">Why<input class="field" id="why" placeholder="For example: price"></label>`, 'Mark as rejected', m => run(() => {
    q.status = 'Rejected'; q.rejected = $('#why', m).value.trim() || 'No reason given'; q.timeline.unshift([`Customer rejected: ${q.rejected}`, now()]); logA(`${q.id} rejected by ${q.client.company}`); return [`${q.id} marked as rejected.`]; })); },
  revise(qid) { run(() => { const q = Qt(qid); q.rev = 'R' + (+q.rev.slice(1) + 1); q.status = 'To verify'; delete q.rejected; q.timeline.unshift([`You made revision ${q.rev}`, now()]); logA(`Made revision ${q.rev} of ${q.id}`);
    return [`Revision ${q.rev} is open to edit. Change the lines, then send it again.`, `#/calculation/${q.calc}`]; }); },
  materials(oid) { const o = O_(oid), q = Qt(o.quote), lines = q.chapters.flatMap(c => c.lines).filter(l => l.unit !== 'uur' && l.unit !== 'post');
    const guess = l => /glas/i.test(l.desc) ? 'Glas Centrum Nederland' : /kozijn|profiel|dicht/i.test(l.desc) ? 'Metaalwerk Veenendaal' : 'Deurenfabriek Oost';
    const done = new Set(lines.filter(l => pursOf(oid).some(x => covers(x, l))).map(l => l.desc));
    const first = guess(lines.find(l => !done.has(l.desc)) || lines[0] || { desc: '' });
    openDrawer(`Order materials for ${o.id}`, `<div class="uf-field"><label for="sup">Supplier</label><select class="field" id="sup">${D0.suppliers.map(s => `<option ${s === first ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
      <fieldset class="picklines"><legend>Lines to order, at purchase price</legend>${lines.map((l, i) => `<label><input type="checkbox" name="ln" value="${i}" data-sup="${guess(l)}" ${done.has(l.desc) ? 'data-done' : ''} ${!done.has(l.desc) && guess(l) === first ? 'checked' : ''}> ${esc(l.desc)} <span class="muted">${l.qty} ${l.unit} × ${eur(purchasePrice(l))}${done.has(l.desc) ? ' · already ordered' : ` · usually ${guess(l).split(' ')[0]}`}</span></label>`).join('')}</fieldset>
      <div class="uf-field"><label for="due">Needed by</label><input class="field" type="date" id="due" value="${addDays(TODAY, 10)}"></div><p class="hint">This makes a draft. Nothing goes to the supplier until you press Send to supplier.</p>`,
      '<button class="uf-pbtn uf-pbtn--primary" type="submit">Make purchase order</button>', f => {
        const pick = [...f.querySelectorAll('[name=ln]:checked')].map(c => lines[+c.value]); if (!pick.length) { toast('Tick at least one line.'); return false; }
        run(() => { const id = `I2611-${nextNum()}`, sup = $('#sup', f).value;
          S.purchases.push({ id, supplier: sup, order: o.id, step: 0, due: $('#due', f).value || addDays(TODAY, 10), created: TODAY, lines: pick.map(l => ({ desc: l.desc, qty: l.qty, unit: l.unit, price: purchasePrice(l) })), log: [['Draft made', now()]] });
          logA(`Drafted purchase order ${id} to ${sup}`); return [`Purchase order ${id} drafted. Check it and send it.`, `#/purchase/${id}`]; }); });
    $('#sup').onchange = e => document.querySelectorAll('#panel [name=ln]').forEach(c => { c.checked = !c.hasAttribute('data-done') && c.dataset.sup === e.target.value; }); },
  note(oid) { const o = O_(oid), open = pursOf(oid).filter(x => x.step < 3);
    const go = () => run(() => { const id = `L2611-${nextNum()}`; S.deliveries.push({ id, order: oid, ready: TODAY }); o.delivery = id; logA(`Made delivery note ${id} for ${oid}`); return [`Delivery note ${id} made. Ready to ship.`, `#/delivery/${id}`]; });
    const notOrdered = Qt(o.quote).chapters.flatMap(c => c.lines).filter(l => l.unit !== 'uur' && l.unit !== 'post' && !pursOf(oid).some(x => covers(x, l)));
    if (open.length || notOrdered.length) modal('Materials not all in', `${open.length ? `<p>${open.map(x => `${x.id} (${esc(x.supplier)})`).join(', ')} ${open.length > 1 ? 'are' : 'is'} not received yet.</p>` : ''}${notOrdered.length ? `<p>${notOrdered.length} line${notOrdered.length > 1 ? 's are' : ' is'} not ordered: ${notOrdered.map(l => esc(l.desc.split(',')[0])).join(', ')}. If they come from stock, that is fine.</p>` : ''}<p>Make the delivery note anyway?</p>`, 'Make it anyway', go); else go(); },
  delivered(did) { const d = L_(did), o = O_(d.order), p = P_(o.project);
    modal(`Confirm delivery ${d.id}`, `<label class="fl">Signed for by<input class="field" id="sb" value="${esc(p.contact)}"></label><label class="fl">Delivered on<input class="field" type="date" id="dd" value="${TODAY}"></label>`, 'Confirm delivery', m => run(() => {
      d.delivered = $('#dd', m).value || TODAY; d.signedBy = $('#sb', m).value.trim() || p.contact; logA(`${d.id} delivered, signed by ${d.signedBy}`);
      if (R().autoInvoice && !finalOf(o.id)) { const id = `F2611-${nextNum()}`; S.invoices.push({ id, order: o.id, kind: 'Final', date: TODAY, due: addDays(TODAY, R().paymentTerm), status: 'Draft', reminders: 0 }); logA(`Drafted final invoice ${id} for ${o.id} after the delivery was signed`, 'agent');
        return [`Delivered and signed by ${d.signedBy}. The agent drafted invoice ${id}. Check it and send it.`, `#/invoice/${id}`]; }
      return [`Delivered and signed by ${d.signedBy}. Next: make the invoice.`]; })); },
  makeinv(oid) { run(() => { const id = `F2611-${nextNum()}`; S.invoices.push({ id, order: oid, kind: 'Final', date: TODAY, due: addDays(TODAY, R().paymentTerm), status: 'Draft', reminders: 0 }); logA(`Drafted final invoice ${id} for ${oid}`, 'agent');
    return [`Invoice ${id} drafted. Check it and send it.`, `#/invoice/${id}`]; }); },
  sendinv(fid) { const i = F_(fid), o = O_(i.order), p = P_(o.project);
    mailModal({ title: `Send invoice ${i.id}`, to: p.email, subject: `Factuur ${i.id} · ${p.name}`, attach: `Factuur ${i.id}.pdf`,
      body: `${greet(p)}\n\nIn de bijlage factuur ${i.id} voor order ${o.id}, ${eurNL(gross(i))} inclusief BTW. Graag betalen voor ${fmtNL(addDays(TODAY, R().paymentTerm))}.${sig}` }, () => {
      i.status = 'Sent'; i.date = TODAY; i.due = addDays(TODAY, R().paymentTerm); logA(`Sent invoice ${i.id} to ${p.customer} and booked it in Exact`); return [`Invoice ${i.id} sent and booked in Exact.`]; }); },
  reminder(fid) { const i = F_(fid), o = O_(i.order), p = P_(o.project);
    mailModal({ title: `Send reminder ${i.reminders + 1}`, to: p.email, subject: `Herinnering factuur ${i.id}`, attach: `Factuur ${i.id}.pdf`,
      body: `${greet(p)}\n\nFactuur ${i.id} van ${eurNL(gross(i))} stond open tot ${fmtNL(i.due)}. Wilt u deze binnen 7 dagen betalen? Is er iets mis met de factuur, laat het ons weten.${sig}` }, () => {
      i.reminders++; logA(`Sent reminder ${i.reminders} for ${i.id}`); return [`Reminder ${i.reminders} sent to ${p.customer}.`]; }); },
  pay(fid) { const i = F_(fid);
    modal(`Register payment for ${i.id}`, `<label class="fl">Amount received<input class="field" id="amt" value="${gross(i).toFixed(2)}"></label><label class="fl">Date<input class="field" type="date" id="pd" value="${TODAY}"></label>`, 'Register payment', m => {
      const a = num($('#amt', m).value); if (Math.abs(a - gross(i)) > 0.01) { toast(`That is ${eur(a)}; the invoice is ${eur(gross(i))}. Register the full amount, or send a reminder for the rest.`); return false; }
      run(() => { i.status = 'Paid'; i.paid = $('#pd', m).value || TODAY; const p = P_(O_(i.order).project); logA(`Payment of ${eur(a)} received for ${i.id}`);
        return [i.kind === 'Final' ? `Paid. Project ${p.id} is complete: all 8 steps done.` : `Deposit ${i.id} paid.`]; }); }); },
  tellcustomer(oid) { const o = O_(oid), p = P_(o.project);
    mailModal({ title: 'Tell the customer', to: p.email, subject: `Levering order ${o.id}`, body: `${greet(p)}\n\nOnze leverancier is later met het glas. De levering van order ${o.id} schuift daardoor naar week ${o.week + 1}. Excuses voor het ongemak.${sig}` }, () => {
      o.week += 1; logA(`Told ${p.customer} delivery moves to week ${o.week}`); return [`Mail sent. Delivery moved to week ${o.week}.`]; }); },
  psend(id) { const x = I_(id);
    mailModal({ title: `Send ${x.id} to ${x.supplier}`, to: D0.supplierMail[x.supplier] || '', subject: `Inkooporder ${x.id}`, attach: `Inkooporder ${x.id}.pdf`,
      body: `Beste leverancier,\n\nHierbij onze inkooporder ${x.id}:\n${x.lines.map(l => `- ${l.qty} ${l.unit} ${l.desc}`).join('\n')}\n\nGraag geleverd op ${fmtNL(x.due)} in Terborg. Wilt u de datum bevestigen?${sig}` }, () => {
      x.step = 1; x.log.push(['Sent to supplier', now()]); logA(`Sent purchase order ${x.id} to ${x.supplier}`); return [`${x.id} sent to ${x.supplier}. Next: their confirmation.`]; }); },
  pconfirm(id) { const x = I_(id); modal(`${x.supplier} confirmed?`, `<label class="fl">Confirmed delivery date<input class="field" type="date" id="cd" value="${x.due}"></label>`, 'Save confirmation', m => run(() => {
    x.due = $('#cd', m).value || x.due; x.step = 2; x.log.push([`Supplier confirmed ${fmt(x.due)}`, now()]); logA(`${x.supplier} confirmed ${x.id} for ${fmt(x.due)}`); return [`Confirmed for ${fmt(x.due)}.`]; })); },
  preceive(id) { const x = I_(id); modal(`Goods received for ${x.id}`, `<p>Tick what arrived in good order.</p><div class="picklines">${x.lines.map(l => `<label><input type="checkbox" class="rc" checked> ${l.qty} ${l.unit} ${esc(l.desc)}</label>`).join('')}</div>`, 'Goods received', m => {
    if ([...m.querySelectorAll('.rc')].some(c => !c.checked)) { toast('Not everything arrived. Chase the supplier for the rest, or tick all lines when it is in.'); return false; }
    run(() => { x.step = 3; x.log.push(['Goods received and checked', now()]); logA(`Received goods for ${x.id}`); return ['Goods received. Next: match the purchase invoice.']; }); }); },
  pmatch(id) { const x = I_(id); modal(`Purchase invoice from ${x.supplier}`, `<label class="fl">Invoice amount excl. VAT<input class="field" id="pa" value="${purTotal(x).toFixed(2)}"></label><p class="hint">Differences up to ${eur(R().tolerance)} are accepted (Agent rules).</p>`, 'Match invoice', m => {
    const a = num($('#pa', m).value), diff = Math.round((a - purTotal(x)) * 100) / 100;
    if (Math.abs(diff) > R().tolerance) { toast(`Difference ${eur(diff)} is above your ${eur(R().tolerance)} tolerance. Ask ${x.supplier} for a credit note.`); return false; }
    run(() => { x.step = 4; x.log.push([`Purchase invoice matched${diff ? `, difference ${eur(diff)}` : ''}`, now()]); logA(`Matched purchase invoice for ${x.id}`, 'agent'); return ['Invoice matched. Pay it on the due date.']; }); }); },
  ppay(id) { run(() => { const x = I_(id); x.step = 5; x.log.push(['Paid and booked in Exact', now()]); logA(`Paid ${x.supplier} for ${x.id}`); return [`${x.id} paid. This purchase is complete.`]; }); },
  pchase(id) { const x = I_(id);
    mailModal({ title: `Chase ${x.supplier}`, to: D0.supplierMail[x.supplier] || '', subject: `RE: Inkooporder ${x.id}`, body: `Beste leverancier,\n\nInkooporder ${x.id} stond gepland op ${fmtNL(x.due)}. Wanneer kunnen we de goederen verwachten?${sig}` }, () => {
      x.log.push(['You chased the supplier', now()]); logA(`Chased ${x.supplier} about ${x.id}`); return [`${x.supplier} chased. The mail is in Inbox → Sent.`]; }); },
  pdelete(id) { run(() => { S.purchases = S.purchases.filter(x => x.id !== id); logA(`Deleted draft ${id}`); return [`Draft ${id} deleted.`, '#/purchasing']; }); },
};

/* ---------- reading mail from the Inbox, customer replies, and the Settings → Agent tab ---------- */
const readFiles = async input => { const out = []; for (const f of Array.from((input && input.files) || [])) {
  if (f.size > 7e6) { toast(`${f.name} is larger than 7 MB, so it is not sent to the agent.`); out.push({ name: f.name }); continue; }
  const data = await new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => res(''); r.readAsDataURL(f); }); out.push({ name: f.name, type: f.type, data }); } return out; };
async function readInboxMail(id) {
  const m = window.UFMail.get(id); if (!m) return;
  const text = /^van:/im.test(m.body) ? m.body : `Van: ${m.from} <${m.email}>\nOnderwerp: ${m.subject}\n\n${m.body}`;
  toast('Reading the e-mail…');
  const rd = await AG().read({ text, via: 'Mail' });
  if (rd.lane === 'reply') return handleReply(m);
  if (rd.lane === 'notRelevant' || rd.lane === 'question') { run(() => { window.UFMail.setAgent(id, rd.lane === 'question' ? 'This is a question, not a request for a price. No request was created.' : 'This e-mail is not a request for a price. No request was created.', null, rd.lane === 'question' ? ['neutral', 'Question'] : ['neutral', 'Not relevant']); logA(`Read a mail from ${m.from}: ${rd.lane === 'question' ? 'a question' : 'not relevant'}`, 'agent'); return ['No request created: this is not a request for a price.']; }); return; }
  run(() => { const pid = newProject(rd, { via: 'Mail', text: m.body, mail: m.id, files: m.attach ? m.attach.split(/,\s*/).map(name => ({ name })) : [] }), n = rd.missing.length;
    window.UFMail.setAgent(id, `Request ${pid} created from this e-mail. ${n ? `${n} required detail${n > 1 ? 's are' : ' is'} missing.` : 'All required details were found.'} ${engineLine(rd)}`, ['#/request/' + pid, 'Open request ' + pid], ['active', 'Request created']);
    return [`Request ${pid} created from the e-mail. Verify the extracted details.`, `#/request/${pid}`]; });
}
async function handleReply(m) {
  const mm = (m.subject + ' ' + m.body).match(/[OQ]\d{4}-\d{3}/), q = (mm && Qt(mm[0])) || Object.values(S.quotes).filter(x => x.client.email === m.email && x.status === 'Sent').sort((a, b) => (b.sent || '').localeCompare(a.sent || ''))[0];
  if (!q) { toast('This looks like a reply, but I cannot find which quote it belongs to. Open the quote and use Customer accepted.'); return; }
  if (q.status !== 'Sent') { toast(`${q.id} is ${q.status.toLowerCase()}, so it is not waiting for an answer.`); return; }
  const rr = await AG().readReply({ text: m.body, quote: q.id });
  const sim = JSON.parse(JSON.stringify(q)), res = rr.changes.reduce((a, c) => { const r = applyChange(sim, c, 'customer'); return { diff: a.diff.concat(r.diff), skipped: a.skipped.concat(r.skipped) }; }, { diff: [], skipped: [] });
  const verdict = rr.declined ? 'The customer declined.' : rr.accepted ? 'The customer accepted.' : 'There is no clear answer.';
  const ok = rr.declined ? 'Mark as rejected' : res.diff.length ? `Make revision R${+q.rev.slice(1) + 1}` : rr.accepted ? 'Customer accepted' : 'Close';
  modal(`Reply from ${esc(q.client.company)}`, `<p>${esc(engineLine({ engine: rr.engine, model: AG().cfg().model, ms: rr.ms || 0, reason: rr.reason }))}</p><p><b>${esc(rr.summary || verdict)}</b></p>
    ${res.diff.length ? `<p>Changes asked for:</p><ul class="plain">${res.diff.map(d => `<li>${esc(d)}</li>`).join('')}</ul><p class="muted">I make a new revision with these changes. You check it and send it again.</p>` : ''}
    ${res.skipped.map(s => `<p class="check check--attention"><span>${esc(s)}</span></p>`).join('')}
    ${(rr.flags || []).map(f => `<p class="check check--attention"><span>${esc(f)}</span></p>`).join('')}`, ok, () => {
    if (!rr.declined && !res.diff.length && !rr.accepted) return;
    if (!rr.declined && !res.diff.length && rr.accepted) { run(() => { window.UFMail.setAgent(m.id, `The customer accepted ${q.id}. Press Make order.`, ['#/quote/' + q.id, 'Open quote ' + q.id], ['active', 'Customer reply']); return null; }); closeLayers(); setTimeout(() => DO.accept(q.id), 30); return false; }
    run(() => {
      if (rr.declined) { q.status = 'Rejected'; q.rejected = 'The customer declined by mail'; q.timeline.unshift(['The customer declined by mail', now()]); logA(`${q.id} declined by ${q.client.company}`, 'agent');
        window.UFMail.setAgent(m.id, `The customer declined ${q.id}. I marked it rejected.`, ['#/quote/' + q.id, 'Open quote ' + q.id], ['loss', 'Declined']); return [`${q.id} marked as rejected.`, `#/quote/${q.id}`]; }
      q.rev = 'R' + (+q.rev.slice(1) + 1); q.status = 'To verify'; delete q.rejected; q.pendingAccept = !!rr.accepted;
      const r = rr.changes.reduce((a, c) => { const x = applyChange(q, c, 'customer'); return { diff: a.diff.concat(x.diff), skipped: a.skipped.concat(x.skipped) }; }, { diff: [], skipped: [] });
      q.changes = r.diff; q.timeline.unshift([`Agent made revision ${q.rev} from the customer's reply: ${r.diff.join(', ')}`, now()]); logA(`Made revision ${q.rev} of ${q.id} from a reply by ${q.client.company}: ${r.diff.join(', ')}`, 'agent');
      window.UFMail.setAgent(m.id, `${verdict} I made revision ${q.rev}: ${r.diff.join(', ')}. It waits for you to verify.`, ['#/quote/' + q.id, 'Open quote ' + q.id], ['attention', 'Customer reply']);
      return [`Revision ${q.rev} made: ${r.diff.join(', ')}.${rr.accepted ? ' The customer already accepted it.' : ''} Verify it and send it.`, `#/quote/${q.id}`]; }); });
}
function saveAgentCfg(silent) {
  const key = $('#agkey') ? $('#agkey').value.trim() : '', o = { model: ($('#agmodel').value.trim() || 'gemini-2.5-flash'), on: $('#agon').checked, limit: Math.max(1, parseInt($('#aglimit').value, 10) || 100) };
  if (key) o.key = key; AG().setCfg(o); if (silent) return;
  toast(key ? 'Key saved in this browser. Press Test the connection to check it.' : 'Agent settings saved.'); state.keepScroll = true; route();
}
async function testAgent() {
  const out = $('#agout'); saveAgentCfg(true); out.className = ''; out.textContent = 'Testing…';
  try { const r = await AG().test(); out.className = 'ok'; out.textContent = `Works. ${r.model} answered in ${(r.ms / 1000).toFixed(1)} s.`; }
  catch (e) { out.className = 'uf-loss'; out.textContent = `Failed: ${e.message}`; }
}
function agentTab() {
  const c = AG().cfg(), u = AG().usage(), logs = AG().log();
  return `<p class="lead">${AG().live() ? `The agent uses the Google model <b>${esc(c.model)}</b>.` : 'The agent is using the basic reader. It recognises names, dimensions and door counts in text, but cannot read drawings, photos or voice notes. Add a Google API key to use the full agent.'}</p>
    <dl class="rules">
      <div><dt>Google API key<span class="uf-second">From Google AI Studio. Kept in this browser only, never in the project files.</span></dt><dd><input class="field" id="agkey" type="password" autocomplete="off" placeholder="${c.key ? `Key saved, ends in ${esc(c.key.slice(-4))}. Paste a new one to replace it.` : 'Paste your key'}" aria-label="Google API key"></dd></div>
      <div><dt>Model<span class="uf-second">Any Gemini model your key can use.</span></dt><dd><input class="field" id="agmodel" value="${esc(c.model)}" aria-label="Model"></dd></div>
      <div><dt>Agent switched on<span class="uf-second">Off means everything is typed by hand.</span></dt><dd><label class="chk"><input type="checkbox" id="agon" ${c.on ? 'checked' : ''}> On</label></dd></div>
      <div><dt>Calls per day<span class="uf-second">Used today: ${u.n} of ${c.limit}</span></dt><dd><input class="field" id="aglimit" value="${c.limit}" inputmode="numeric" aria-label="Calls per day"></dd></div></dl>
    <div class="agbtns">${btn('Save', 'primary', 'data-agsave')}${btn('Test the connection', 'secondary', 'data-agtest')}${c.key ? btn('Remove key', 'quiet', 'data-agforget') : ''}<span id="agout" role="status"></span></div>
    <p class="hint">Anyone who uses this browser can use the key. For a team the key belongs in a small server function, so no browser holds it. Mail text and plans are sent to Google when the key is on.</p>
    <h2 class="uf-section-title">What the agent may do</h2>
    ${table([{ h: 'Level', v: r => `<b>${r[0]}</b>` }, { h: 'Meaning', v: r => esc(r[1]) }, { h: 'In this prototype', v: r => esc(r[2]) }], [['A  Automatic', 'The agent does it and logs it.', 'Read e-mail, WhatsApp, call notes and voice notes, extract the request, draft the calculation.'], ['C  A person approves', 'The agent prepares it, you approve.', 'Every quote, order confirmation, invoice, purchase order and mail.'], ['D  A person decides', 'The agent hands it over.', 'Items not in the catalogue, discounts, complaints.']])}
    <p class="hint">Level B (automatic with a short undo) is not switched on. Every mail waits for you.</p>
    <h2 class="uf-section-title">Last calls to Google</h2>
    ${logs.length ? table([{ h: 'Time', v: r => esc(r.t.slice(11, 16)) }, { h: 'Task', v: r => esc(r.task) }, { h: 'Sent', v: r => `${r.sent} characters${r.files ? `, ${r.files} file${r.files > 1 ? 's' : ''}` : ''}` }, { h: 'Result', v: r => r.ok ? `Done in ${(r.ms / 1000).toFixed(1)} s` : `<span class="uf-loss">${esc(r.err)}</span>` }], logs) : '<p class="lead">No calls yet.</p>'}`;
}

/* ---------- voice notes and photos for a new request ---------- */
const media = { items: [], rec: null };
const toB64 = blob => new Promise(res => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1] || ''); r.onerror = () => res(''); r.readAsDataURL(blob); });
/* Google reads WAV, so the browser recording (WebM or Ogg) is converted to 16 kHz mono WAV. */
async function toWav(blob) {
  const AC = window.AudioContext || window.webkitAudioContext, ctx = new AC(), buf = await ctx.decodeAudioData(await blob.arrayBuffer()); ctx.close();
  const rate = 16000, off = new OfflineAudioContext(1, Math.max(1, Math.ceil(buf.duration * rate)), rate), src = off.createBufferSource();
  src.buffer = buf; src.connect(off.destination); src.start(); const d = (await off.startRendering()).getChannelData(0);
  const v = new DataView(new ArrayBuffer(44 + d.length * 2)), w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + d.length * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, d.length * 2, true);
  for (let i = 0; i < d.length; i++) { const s = Math.max(-1, Math.min(1, d[i])); v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); }
  return new Blob([v], { type: 'audio/wav' });
}
const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
function showMedia() { const ul = $('#nmedia'); if (ul) ul.innerHTML = media.items.map((m, i) => `<li class="chip">${I(m.kind === 'voice' ? 'mic' : 'camera')}<span>${esc(m.name)}</span><button type="button" class="linkbtn" data-mrm="${i}" aria-label="Remove ${esc(m.name)}">Remove</button></li>`).join(''); }
async function toggleVoice(btn) {
  if (media.rec) { media.rec.stop(); return; }
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.MediaRecorder) { toast('This browser cannot record audio. Type the notes instead.'); return; }
  let stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast('Microphone access is blocked. Allow the microphone for this site to record a voice note.'); return; }
  const mr = new MediaRecorder(stream), chunks = [], t0 = Date.now(), notes = $('#nn2'), SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let sr = null;
  if (SR && !AG().live()) { sr = new SR(); sr.lang = 'nl-NL'; sr.continuous = true; sr.interimResults = false;
    sr.onresult = ev => { for (let i = ev.resultIndex; i < ev.results.length; i++) if (ev.results[i].isFinal && notes) notes.value = (notes.value.trim() ? notes.value.trim() + ' ' : '') + ev.results[i][0].transcript.trim(); };
    try { sr.start(); } catch (x) { sr = null; } }
  mr.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
  const tick = setInterval(() => { const s = Math.round((Date.now() - t0) / 1000); btn.innerHTML = `${I('stop')}Stop recording ${mmss(s)}`; if (s >= 180) mr.stop(); }, 500);
  mr.onstop = async () => {
    clearInterval(tick); stream.getTracks().forEach(t => t.stop()); if (sr) { try { sr.stop(); } catch (x) {} }
    media.rec = null; btn.classList.remove('is-rec'); btn.innerHTML = `${I('mic')}Record voice note`;
    const dur = mmss(Math.round((Date.now() - t0) / 1000));
    let blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' }); try { blob = await toWav(blob); } catch (x) {}
    media.items.push({ name: `Voice note ${dur}`, type: blob.type, data: await toB64(blob), kind: 'voice' }); showMedia();
    if (!AG().live()) toast(sr ? 'Voice note added. The browser typed what it heard into Notes. Check the text.' : 'Voice note added. Without a Google API key it is not transcribed, so type the main points as well.');
  };
  mr.start(); media.rec = mr; btn.classList.add('is-rec'); btn.innerHTML = `${I('stop')}Stop recording 0:00`;
}
async function addPhotos(input) {
  for (const f of Array.from(input.files || [])) {
    if (f.size > 7e6) { toast(`${f.name} is larger than 7 MB and was not added.`); continue; }
    media.items.push({ name: f.name || 'Photo', type: f.type || 'image/jpeg', data: await toB64(f), kind: f.type === 'application/pdf' ? 'file' : 'photo' });
  }
  input.value = ''; showMedia();
  if (!AG().live()) toast('Photo added. Photos are read only with a Google API key; without a key, type the main points in Notes.');
}
/* ---------- WhatsApp conversation → request ---------- */
async function readWhatsApp(id) {
  const W_ = window.UFWhatsApp, c = W_.get(id); if (!c) return;
  if (c.agent) { location.hash = (c.link && c.link[0]) || '#/whatsapp/' + id; return; }
  toast('Reading the conversation…');
  const rd = await AG().read({ text: W_.text(id), via: 'WhatsApp' });
  if (rd.lane !== 'request') { run(() => { W_.setAgent(id, rd.lane === 'question' ? 'This is a question, not a request for a price. No request was created. Reply in the conversation.' : 'This conversation is not a request for a price. No request was created.', null, ['neutral', rd.lane === 'question' ? 'Question' : 'Not relevant']); logA(`Read a WhatsApp conversation with ${c.name}: no request`, 'agent'); return ['No request created: this is not a request for a price.', '#/whatsapp/' + id]; }); return; }
  run(() => { const pid = newProject(rd, { via: 'WhatsApp', text: W_.text(id), wa: id }), n = rd.missing.length;
    W_.setAgent(id, `Request ${pid} created from this conversation. ${n ? `${n} required detail${n > 1 ? 's are' : ' is'} missing.` : 'All required details were found.'} ${engineLine(rd)}`, ['#/request/' + pid, 'Open request ' + pid], ['active', 'Request created']);
    return [`Request ${pid} created from WhatsApp. Verify the extracted details.`, `#/request/${pid}`]; });
}
function whatsappHelp() {
  modal('Connect WhatsApp Business', `<p>A live connection reads new messages on the company number automatically. It needs:</p>
    <ol class="steps-list"><li>A Meta Business account with the WhatsApp Business Platform (Cloud API).</li><li>The company phone number registered on that platform.</li><li>A small server (webhook) that receives the messages and passes them to the portal. The portal is a static website today, so this is a separate service.</li></ol>
    <p>Until then, import a conversation: in WhatsApp open the chat, then More, Export chat, Without media. Choose Import chat on the WhatsApp page.</p>`, 'Open WhatsApp', () => { closeLayers(); location.hash = '#/whatsapp'; });
}

/* ---------- "New …" buttons ---------- */
const NEW = {
  project(company) { const custs = S.relations.filter(r => r.kind === 'Customer'), wa = window.UFWhatsApp ? window.UFWhatsApp.all() : [];
    media.items = [];
    openDrawer('New request', `<div class="seg nrseg" role="tablist" aria-label="Channel">
        <button type="button" role="tab" data-nrtab="call" aria-selected="true">Call or visit</button><button type="button" role="tab" data-nrtab="wa" aria-selected="false">WhatsApp</button></div>
      <div data-nrpanel="call">
        <div class="uf-field"><label for="nv">Channel</label><select class="field" id="nv"><option value="Phone">Phone call</option><option value="Visit">Site visit</option><option value="Meeting">Meeting</option></select></div>
        <div class="uf-field"><label for="ncust">Customer <span class="muted">(optional)</span></label><div class="inrow"><input class="field" id="ncust" list="custs" value="${esc(company || '')}" placeholder="Search customers" autocomplete="off"><button type="button" class="uf-pbtn uf-pbtn--secondary" data-newcusttoggle>New customer</button></div>
          <datalist id="custs">${custs.map(r => `<option value="${esc(r.name)}">`).join('')}</datalist><span class="hint">If left empty, the agent takes the customer from the notes.</span></div>
        <div id="newcust" class="subform" hidden>
          <div class="uf-field"><label for="ncn">Company name</label><input class="field" id="ncn"></div>
          <div class="uf-field"><label for="ncc">Contact person</label><input class="field" id="ncc"></div>
          <div class="uf-field"><label for="nce">E-mail</label><input class="field" id="nce" type="email"></div>
          <div class="uf-field"><label for="ncp">Phone</label><input class="field" id="ncp" type="tel"></div></div>
        <div class="uf-field"><label for="nn2">Notes</label><textarea id="nn2" class="field" rows="6" placeholder="Customer, site address, wall length and height, number of doors, delivery date"></textarea></div>
        <div class="capture"><button type="button" class="uf-pbtn uf-pbtn--secondary" data-voice>${I('mic')}Record voice note</button><label class="uf-pbtn uf-pbtn--secondary">${I('camera')}Add photo<input type="file" id="nphoto" accept="image/*,.pdf" capture="environment" multiple hidden></label></div>
        <ul class="chips" id="nmedia"></ul>
        <p class="hint">${AG().live() ? `A voice note or a photo of handwritten notes is enough. The Google model ${esc(AG().cfg().model)} transcribes and reads it.` : 'Without a Google API key, the browser types out voice notes as you speak, and photos cannot be read. Add a key in Settings → Agent for the full agent.'}</p></div>
      <div data-nrpanel="wa" hidden>
        <p class="hint">Select the conversation. The agent reads the messages, voice messages and photos, and creates the request.</p>
        <div class="wapick">${wa.length ? wa.map((c, i) => `<label class="warow ${c.agent ? 'is-done' : ''}"><input type="radio" name="wa" value="${c.id}" ${!c.agent && !wa.slice(0, i).some(x => !x.agent) ? 'checked' : ''} ${c.agent ? 'disabled' : ''}><span><b>${esc(c.name)}${c.company ? `, ${esc(c.company)}` : ''}</b><span class="muted">${c.agent ? 'Request already created' : esc(c.phone || 'Imported chat')}</span></span></label>`).join('') : '<p class="lead">No conversations yet.</p>'}</div>
        <a class="linkbtn" href="#/whatsapp">Open WhatsApp</a></div>`,
    `<button class="uf-pbtn uf-pbtn--primary" type="submit" id="nr-go">Create request</button>`, f => {
      if (media.rec) { toast('Stop the recording first.'); return false; }
      const go = $('#nr-go', f);
      if ((f.dataset.tab || 'call') === 'wa') { const pick = f.querySelector('input[name=wa]:checked'); if (!pick) { toast('Select a conversation.'); return false; } closeLayers(); readWhatsApp(pick.value); return; }
      const text = ($('#nn2', f).value || '').trim(), via = $('#nv', f).value, files = media.items.slice();
      if (!text && !files.length) { toast('Record a voice note, add a photo, or type the notes.'); return false; }
      if (!text && !AG().live()) { toast('Without a Google API key the agent needs typed notes. Type the main points, or add a key in Settings → Agent.'); return false; }
      let cust = $('#ncust', f).value.trim(), newRel = null;
      if (!$('#newcust', f).hidden) { const n = $('#ncn', f).value.trim(); if (!n) { toast('Enter the company name of the new customer.'); return false; }
        newRel = { name: n, kind: 'Customer', contact: $('#ncc', f).value.trim() || 'Contact', email: $('#nce', f).value.trim(), phone: $('#ncp', f).value.trim(), city: '–' }; cust = n; }
      go.disabled = true; go.textContent = 'Reading…';
      AG().read({ text: text || '(See the voice note and photos.)', files, via: 'Phone' }).then(rd => {
        if (!f.isConnected) return;
        if (rd.lane === 'notRelevant' || rd.lane === 'question') { go.disabled = false; go.textContent = 'Create request'; toast('This does not read as a request for a price, so nothing was created. Add the dimensions and the number of doors.'); return; }
        run(() => {
          if (newRel && !S.relations.some(r => r.name === newRel.name)) { S.relations.push(newRel); logA(`Added customer ${newRel.name}`); }
          const rel = cust && S.relations.find(r => r.kind === 'Customer' && r.name.toLowerCase() === cust.toLowerCase());
          if (rel) { rd.fields.customer = { value: rel.name, source: 'match', status: 'found' }; [['contact', rel.contact], ['email', rel.email], ['phone', rel.phone]].forEach(([k, v]) => { if (v && v !== 'Contact' && !rd.fields[k].value) rd.fields[k] = { value: v, source: 'match', status: 'found' }; }); }
          else if (cust) rd.fields.customer = { value: cust, source: 'person', status: 'found' };
          const id = newProject(rd, { via, text: text || files.map(x => x.name).join(', '), files }), n = rd.missing.length;
          return [`Request ${id} created. ${n ? `${n} required detail${n > 1 ? 's are' : ' is'} missing.` : 'All required details were found.'}`, `#/request/${id}`]; });
      }).catch(e => { go.disabled = false; go.textContent = 'Create request'; toast('The request could not be read: ' + e.message); });
      return false;
    }); $('#panel form').dataset.tab = 'call'; },
  calc() { const ps = S.projects.filter(p => stage(p) === 1);
    if (!ps.length) { toast('Every project already has a calculation. Make a new request first.', () => NEW.project(), 'New request'); return; }
    openDrawer('New calculation', `<div class="uf-field"><label for="pp">For which request?</label><select class="field" id="pp">${ps.map(p => `<option value="${p.id}">${p.id} ${esc(p.customer)} · ${esc(p.name)}</option>`).join('')}</select></div>`, '<button class="uf-pbtn uf-pbtn--primary" type="submit">Make calculation</button>', f => { const v = $('#pp', f).value; setTimeout(() => DO.calc(v), 0); }); },
  order() { const qs = Object.values(S.quotes).filter(q => q.status === 'Sent');
    if (!qs.length) { toast('No sent quotes are waiting. Orders come from an accepted quote.'); return; }
    openDrawer('New order from a quote', `<div class="uf-field"><label for="qq">Which quote did the customer accept?</label><select class="field" id="qq">${qs.map(q => `<option value="${q.id}">${q.id} ${esc(q.client.company)} · ${eur(totals(q).sale)}</option>`).join('')}</select></div>`, '<button class="uf-pbtn uf-pbtn--primary" type="submit">Next</button>', f => { const v = $('#qq', f).value; setTimeout(() => DO.accept(v), 0); }); },
  invoice() { const os = S.orders.filter(o => stage(P_(o.project)) === 6 && !finalOf(o.id));
    if (!os.length) { toast('No delivered orders are waiting for an invoice.'); return; }
    openDrawer('New invoice', `<div class="uf-field"><label for="oo">For which delivered order?</label><select class="field" id="oo">${os.map(o => `<option value="${o.id}">${o.id} ${esc(custOfOrder(o))}</option>`).join('')}</select></div>`, '<button class="uf-pbtn uf-pbtn--primary" type="submit">Make invoice</button>', f => { const v = $('#oo', f).value; setTimeout(() => DO.makeinv(v), 0); }); },
  purchase(article) { const os = S.orders.filter(o => stage(P_(o.project)) === 4);
    if (!os.length) { toast('No orders in production need materials.'); return; }
    openDrawer('New purchase order', `<div class="uf-field"><label for="po">For which order?</label><select class="field" id="po">${os.map(o => `<option value="${o.id}">${o.id} ${esc(custOfOrder(o))}</option>`).join('')}</select></div>${article ? `<p class="hint">For article ${esc(article)}: pick the order it is for.</p>` : ''}`, '<button class="uf-pbtn uf-pbtn--primary" type="submit">Next</button>', f => { const v = $('#po', f).value; setTimeout(() => DO.materials(v), 0); }); },
  company(kind) { const k0 = kind === 'Supplier' ? 'Supplier' : 'Customer';
    openDrawer('New customer or supplier', `<div class="seg nrseg" role="tablist" aria-label="Type"><button type="button" role="tab" data-cktab="Customer" aria-selected="${k0 === 'Customer'}">Customer</button><button type="button" role="tab" data-cktab="Supplier" aria-selected="${k0 === 'Supplier'}">Supplier</button></div>
      <div class="uf-field"><label for="cn">Company name</label><input class="field" id="cn"></div>
      <div class="uf-field"><label for="cc">Contact person</label><input class="field" id="cc"></div>
      <div class="uf-field"><label for="ce">E-mail</label><input class="field" id="ce" type="email"></div>
      <div class="uf-field"><label for="cp">Phone</label><input class="field" id="cp" type="tel"></div>
      <div class="uf-field"><label for="ci">City</label><input class="field" id="ci"></div>
      <div class="uf-field" data-supplieronly ${k0 === 'Supplier' ? '' : 'hidden'}><label for="cs">Supplies</label><input class="field" id="cs" placeholder="For example: glass, profiles, doors"></div>`,
    `<button class="uf-pbtn uf-pbtn--primary" type="submit" id="ck-go">Create ${k0.toLowerCase()}</button>`, f => {
      const n = $('#cn', f).value.trim(), kd = f.dataset.kind || k0; if (!n) { toast('Enter the company name.'); return false; }
      if (S.relations.some(r => r.name.toLowerCase() === n.toLowerCase())) { toast(`${n} already exists in Customers and suppliers.`); return false; }
      run(() => { S.relations.push({ name: n, kind: kd, contact: $('#cc', f).value.trim() || '–', email: $('#ce', f).value.trim(), phone: $('#cp', f).value.trim(), city: $('#ci', f).value.trim() || '–', ...(kd === 'Supplier' ? { supplies: $('#cs', f).value.trim() } : {}) });
        logA(`Added ${kd.toLowerCase()} ${n}`); return [`${kd} ${n} created.`, '#/relations']; }); });
    $('#panel form').dataset.kind = k0; },
  article() { openDrawer('New article', `<div class="uf-field"><label for="ac">Code</label><input class="field" id="ac"></div><div class="uf-field"><label for="an">Name</label><input class="field" id="an"></div>
      <div class="uf-field"><label for="au">Unit</label><select class="field" id="au"><option>st</option><option>m1</option><option>set</option></select></div><div class="uf-field"><label for="ap">Cost</label><input class="field" id="ap" inputmode="decimal"></div>`, null, f => {
      const c = $('#ac', f).value.trim(), n = $('#an', f).value.trim(); if (!c || !n) { toast('Fill in code and name.'); return false; }
      run(() => { S.articles.push({ code: c, name: n, group: 'Other', unit: $('#au', f).value, cost: num($('#ap', f).value), margin: 20, stock: 0 }); logA(`Added article ${c}`); return [`Article ${c} added.`, '#/articles']; }); }); },
};

/* ---------- router ---------- */
function route() {
  const [, page = 'today', ...rest] = (location.hash || '#/today').split('/');
  const [name, query] = page.split('?');
  const fn = P[name] || P.today;
  const q = query ? decodeURIComponent((query.match(/q=([^&]*)/) || [])[1] || '').replace(/\+/g, ' ') : '';
  const sec = SECTION_OF[name] || name;
  state.group = (NAV.find(g => g.items.some(i => i[0] === sec)) || {}).group || 'Home';
  DETAIL.length = 0;
  const y = state.keepScroll ? scrollY : 0; state.keepScroll = false;
  $('#view').innerHTML = fn(rest.join('/') || q);
  renderNav(sec);
  document.title = `${$('#view h1')?.textContent || 'Portal'} · Uniframe portal`;
  const tr = $('.steps-track'); if (tr) { void tr.getBoundingClientRect().width; getComputedStyle(tr).getPropertyValue('--pos'); tr.style.setProperty('--pos', tr.dataset.here); }
  $('#view').focus({ preventScroll: true });
  window.scrollTo(0, y);
}
window.addEventListener('hashchange', () => { closeLayers(); route(); });
function refreshQuote() {
  const m = $('#qmain'), r = $('#qrail'), q = cq(); if (!m || !q) return;
  const active = document.activeElement, sel = active && active.dataset && active.dataset.f ? `[data-c="${active.dataset.c}"][data-l="${active.dataset.l}"][data-f="${active.dataset.f}"]` : null;
  m.innerHTML = state.view === 'doc' ? quoteDoc(q) : calcTable(q); r.innerHTML = quoteRail(q);
  const t = totals(q);
  document.querySelectorAll('[data-live="sale"]').forEach(e => e.textContent = eur(t.sale));
  document.querySelectorAll('[data-live="margin"]').forEach(e => e.innerHTML = pct(t.margin));
  if (sel) { const n = $(sel); if (n) n.focus(); }
}

/* ---------- events ---------- */
document.addEventListener('change', e => {
  const el = e.target, q = cq();
  if (el.id === 'gcid') { try { localStorage.setItem('uf-gmail-client', JSON.stringify(el.value.trim())); } catch (x) {} toast('Client ID saved. Press Connect Gmail to sign in with Google.'); return; }
  if (el.id === 'nphoto') { addPhotos(el); return; }
  if (el.dataset.rf) { setField(P_(el.dataset.p), el.dataset.rf, el.value.trim()); state.keepScroll = true; route(); return; }
  if (!q || !el.closest('#qmain, #qrail')) return;
  if (el.id === 'upfile' && el.files[0]) { q.files.unshift({ name: el.files[0].name, from: 'You, just now' }); q.timeline.unshift([`Agent read ${el.files[0].name} you added`, now()]); save(); refreshQuote(); toast(`${el.files[0].name} added. The agent reads it with this quote.`); return; }
  if (!editable(q)) return;
  if (el.dataset.chap != null) { q.chapters[+el.dataset.chap].title = el.value; save(); refreshQuote(); return; }
  if (el.dataset.q) { if (el.dataset.q === 'intro') q.intro = el.value; else q.client.salutation = el.value; save(); return; }
  if (el.dataset.f) {
    const l = q.chapters[+el.dataset.c].lines[+el.dataset.l], f = el.dataset.f;
    if (f === 'price') { const p = num(el.value); if (l.cost) l.margin = Math.round((p / l.cost - 1) * 1000) / 10; else { l.cost = Math.round(p / 1.2 * 100) / 100; l.margin = 20; } }
    else if (f !== 'desc') l[f] = num(el.value);
    l.byYou = true; if (f === 'qty') l.src = 'person'; delete l.check; save(); refreshQuote();
  }
});
document.addEventListener('focusout', e => {
  const el = e.target, q = cq(); if (!el.matches || !el.matches('.ce') || !q || !editable(q) || !el.closest('#qmain')) return;
  const l = q.chapters[+el.dataset.c].lines[+el.dataset.l], v = el.textContent.trim();
  if (v && v !== l.desc) { l.desc = v; l.byYou = true; save(); setTimeout(refreshQuote, 0); }
});
document.addEventListener('click', e => {
  const t = e.target.closest('button, a, tr[data-href], label'); if (!t) return;
  if (t.matches('tr[data-href]') && !e.target.closest('a,button,input')) { location.hash = t.dataset.href; return; }
  if (t.dataset.go) { closeLayers(); location.hash = t.dataset.go; return; }
  if (t.dataset.pick) { const [pid, key, value] = t.dataset.pick.split('|'), p = P_(pid); setField(p, key, value); logA(`Picked ${value} for ${key} on ${p.id}`); save(); state.keepScroll = true; route(); toast(`Using ${value}. The value is now set by you.`); return; }
  if (t.dataset.agentread) { readInboxMail(t.dataset.agentread); return; }
  if (t.dataset.waread) { readWhatsApp(t.dataset.waread); return; }
  if (t.matches('[data-voice]')) { toggleVoice(t); return; }
  if (t.dataset.mrm != null) { media.items.splice(+t.dataset.mrm, 1); showMedia(); return; }
  if (t.matches('[data-newcusttoggle]')) { const b = $('#newcust'); b.hidden = !b.hidden; t.textContent = b.hidden ? 'New customer' : 'Existing customer'; $('#ncust').disabled = !b.hidden; if (!b.hidden) $('#ncn').focus(); return; }
  if (t.dataset.cktab) { const f = t.closest('form'); f.dataset.kind = t.dataset.cktab; f.querySelectorAll('[data-cktab]').forEach(b => b.setAttribute('aria-selected', b === t)); f.querySelector('[data-supplieronly]').hidden = t.dataset.cktab !== 'Supplier'; $('#ck-go', f).textContent = `Create ${t.dataset.cktab.toLowerCase()}`; return; }
  if (t.matches('[data-wahelp]')) { whatsappHelp(); return; }
  if (t.dataset.nrtab) { const f = t.closest('form'); f.dataset.tab = t.dataset.nrtab; f.querySelectorAll('[data-nrtab]').forEach(b => b.setAttribute('aria-selected', b === t));
    f.querySelectorAll('[data-nrpanel]').forEach(p => p.hidden = p.dataset.nrpanel !== t.dataset.nrtab); return; }
  if (t.matches('[data-agsave]')) { saveAgentCfg(); return; }
  if (t.matches('[data-agtest]')) { testAgent(); return; }
  if (t.matches('[data-agforget]')) { AG().setCfg({ key: '' }); toast('Key removed from this browser.'); state.keepScroll = true; route(); return; }
  if (t.dataset.act) { const f = DO[t.dataset.act]; if (f) f(t.dataset.arg); return; }
  if (t.dataset.new) { closeLayers(); NEW[t.dataset.new](); return; }
  if (t.dataset.future) { const tr = t.closest('.steps-track'), p = P_(tr.dataset.p), n = next(p);
    toast(`${J[+t.dataset.future - 1]} is not reached yet.${n ? ` Next: ${n.label.toLowerCase()}.` : ''}`, n && location.hash !== n.href ? () => { location.hash = n.href; } : null, 'Go there'); return; }
  if (t.dataset.mailto != null) { e.preventDefault(); window.UFMail.compose({ to: t.dataset.mailto }); return; }
  if (t.dataset.view) { state.view = t.dataset.view; document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', b === t)); refreshQuote(); return; }
  if (t.dataset.fix) { const q = cq(), l = q.chapters[+t.dataset.c].lines[+t.dataset.l];
    if (t.dataset.fix === 'price') { l.cost = +t.dataset.v / 1.2; l.margin = 20; } else l.margin = +t.dataset.v;
    q.timeline.unshift([t.dataset.fix === 'price' ? 'You accepted the agent\'s price' : 'You raised a margin to the floor', now()]); save(); refreshQuote(); return; }
  if (t.dataset.addline != null) { cq().chapters[+t.dataset.addline].lines.push({ desc: 'Nieuwe regel', qty: 1, unit: 'st', cost: 0, margin: 20, byYou: true }); save(); refreshQuote(); return; }
  if (t.matches('[data-addchap]')) { cq().chapters.push({ title: 'Nieuw hoofdstuk', lines: [] }); save(); refreshQuote(); return; }
  if (t.dataset.file) { toast(`${t.dataset.file} would open in your PDF or Excel viewer. Example file, not included.`); return; }
  if (t.matches('[data-print]')) { closeLayers(); if ($('#qmain')) { state.view = 'doc'; refreshQuote(); document.querySelectorAll('[data-view]').forEach(b => b.setAttribute('aria-selected', b.dataset.view === 'doc')); } setTimeout(() => window.print(), 50); return; }
  if (t.matches('[data-gmail]')) { window.UFMail.connect(); return; }
  if (t.matches('[data-exact]')) { toast(`${S.invoices.filter(i => i.status !== 'Draft').length} invoices are booked in Exact Online. Nothing new to export.`); return; }
  if (t.matches('[data-save]')) { toast(t.dataset.save); return; }
  if (t.matches('[data-saverules]')) { const next = {}; document.querySelectorAll('[data-rule]').forEach(el => { next[el.dataset.rule] = el.dataset.rule === 'autoInvoice' ? el.value === '1' : Math.round(num(el.value)); }); setRules(next, 'Agent rules'); return; }
  if (t.matches('[data-rulereset]')) { setRules({ ...RULE0 }, 'Reset to defaults'); return; }
  if (t.closest('[data-tellagent]')) { tellAgent(''); return; }
  if (t.matches('[data-replan]')) { toast('The agent checked supplier dates and capacity. The plan already fits; nothing to move.'); return; }
  if (t.matches('[data-approveplan]')) { logA('Approved the planning'); save(); toast('Plan approved. The montage team and customers get the dates.'); return; }
  if (t.matches('[data-resetall]')) { closeLayers(); modal('Reset example data?', '<p>All your changes, sent example mails and drafts go back to the example. This cannot be undone.</p>', 'Reset', () => { ['uf-store-v4', 'uf-store-v3', 'uf-mail-local', 'uf-mail-flags', 'uf-quote-O2611-010-v1'].forEach(k => { try { localStorage.removeItem(k); } catch (x) {} }); location.hash = '#/today'; location.reload(); }); return; }
  if (t.matches('[data-editproject]')) { const p = P_(t.dataset.editproject); openDrawer('Edit project', `<div class="uf-field"><label for="ep1">Project name</label><input class="field" id="ep1" value="${esc(p.name)}"></div><div class="uf-field"><label for="ep2">Site</label><input class="field" id="ep2" value="${esc(p.site)}"></div><div class="uf-field"><label for="ep3">Contact</label><input class="field" id="ep3" value="${esc(p.contact)}"></div><div class="uf-field"><label for="ep4">E-mail</label><input class="field" id="ep4" value="${esc(p.email)}"></div>`, null, f => run(() => { p.name = $('#ep1', f).value; p.site = $('#ep2', f).value; p.contact = $('#ep3', f).value; p.email = $('#ep4', f).value; logA(`Edited project ${p.id}`); return ['Project saved.']; })); return; }
  if (t.matches('[data-more-menu]')) { openDrawer('More actions', `<div class="drawer-acts drawer-acts--col">${btn('Print this page', 'secondary', 'data-print')}${btn('Copy link', 'secondary', 'data-copylink')}${btn('Ask the portal about this', 'secondary', `data-go="#/ask?q=${encodeURIComponent(($('#view h1').textContent.split(' · ')[0]))}"`)}</div>`, ''); return; }
  if (t.matches('[data-copylink]')) { try { navigator.clipboard.writeText(location.href); } catch (x) {} closeLayers(); toast('Link copied.'); return; }
  if (t.matches('[data-whomenu]')) { openDrawer('Arjan Laninga', `<dl class="drows"><div><dt>Role</dt><dd>Owner</dd></div><div><dt>E-mail</dt><dd>arjan@uniframe.nl</dd></div></dl><div class="drawer-acts drawer-acts--col">${btn('Settings', 'secondary', 'data-go="#/settings"')}${btn('Reset example data', 'secondary', 'data-resetall')}${btn('Sign out', 'quiet', 'data-signout')}</div>`, ''); return; }
  if (t.matches('[data-signout]')) { closeLayers(); toast('This prototype has no sign-in, so there is nothing to sign out of.'); return; }
  if (t.closest('.tab')) { const bar = t.closest('.tabs'); bar.querySelectorAll('.tab').forEach(b => b.setAttribute('aria-selected', b === t));
    const panels = bar.nextElementSibling; if (panels && panels.classList.contains('tabpanels')) panels.querySelectorAll(':scope > .tabpanel').forEach(p => p.hidden = p.dataset.panel !== t.dataset.tab); return; }
  if (t.closest('.vpill')) { const bar = t.closest('.viewpills'); bar.querySelectorAll('.vpill').forEach(b => b.setAttribute('aria-selected', b === t));
    const tb = bar.nextElementSibling && bar.nextElementSibling.querySelector('tbody'); if (tb) { const f = t.dataset.filter || ''; let n = 0;
      tb.querySelectorAll('tr:not(.norows)').forEach(r => { const show = !f || (r.dataset.cat || '').split('|').includes(f); r.hidden = !show; n += show; }); tb.querySelector('.norows').hidden = n > 0; } return; }
  if (t.matches('[data-more]')) { t.previousElementSibling.querySelectorAll('li[hidden]').forEach(li => li.hidden = false); t.remove(); return; }
  if (t.closest('[data-m], .mail, .compose, #modal, #panel form [type=submit]') || t.matches('[type=submit], [data-close], label') || (t.tagName === 'BUTTON' && t.type === 'submit')) return;
  if (t.matches('.uf-pbtn, .linkbtn') && t.tagName === 'BUTTON') act(t.textContent.trim());
});
document.addEventListener('click', e => {
  const tr = e.target.closest('tr[data-detail]'); if (!tr || e.target.closest('a,button,input')) return;
  const { cols, r, detail } = DETAIL[+tr.dataset.detail];
  state.detail = r;
  openDrawer(tr.cells[0].innerText.trim(), `<dl class="drows">${cols.filter(c => c.h).map(c => `<div><dt>${c.h}</dt><dd>${c.v(r)}</dd></div>`).join('')}</dl>
    <div class="drawer-acts">${(detail.actions || []).map((a, i) => btn(a, i ? 'secondary' : 'primary')).join('')}</div>`, '');
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches && e.target.matches('tr[data-detail], tr[data-href]')) e.target.click(); });

/* Buttons in drawers for list rows (customers, articles, activity), and connection buttons */
function act(label) {
  const r = state.detail;
  const A = {
    'Write an email': () => { closeLayers(); window.UFMail.compose({ to: r.email || '' }); },
    'New project for this company': () => { closeLayers(); NEW.project(r.name); },
    'Edit company': () => openDrawer(`Edit ${r.name}`, `<div class="uf-field"><label for="ec1">Contact</label><input class="field" id="ec1" value="${esc(r.contact)}"></div><div class="uf-field"><label for="ec2">E-mail</label><input class="field" id="ec2" value="${esc(r.email)}"></div><div class="uf-field"><label for="ec3">City</label><input class="field" id="ec3" value="${esc(r.city)}"></div>`, null, f => run(() => {
      const x = S.relations.find(y => y.name === r.name); x.contact = $('#ec1', f).value; x.email = $('#ec2', f).value; x.city = $('#ec3', f).value; delete x.toConfirm; logA(`Edited ${x.name}`); return [`${x.name} saved.`]; })),
    'Edit price': () => openDrawer(`Edit ${r.code}`, `<div class="uf-field"><label for="ap1">Cost</label><input class="field" id="ap1" value="${r.cost.toFixed(2)}"></div><div class="uf-field"><label for="ap2">Margin %</label><input class="field" id="ap2" value="${r.margin}"></div><p class="hint">New calculations use this price. Sent quotes keep theirs.</p>`, null, f => run(() => {
      const x = S.articles.find(y => y.code === r.code); x.cost = num($('#ap1', f).value); x.margin = num($('#ap2', f).value); logA(`Changed the price of ${x.code}`); return [`${x.code} saved.`]; })),
    'Correct the stock count': () => openDrawer(`Stock of ${r.code}`, `<div class="uf-field"><label for="sc">Counted</label><input class="field" id="sc" value="${r.stock}" inputmode="numeric"></div>`, null, f => run(() => {
      const x = S.articles.find(y => y.code === r.code); x.stock = Math.round(num($('#sc', f).value)); logA(`Corrected stock of ${x.code} to ${x.stock}`); return [`Stock of ${x.code} is now ${x.stock}.`]; })),
    'Order more': () => { closeLayers(); NEW.purchase(r.code); },
    'Tell the agent': () => tellAgent(Array.isArray(r) ? r[0] : ''),
    'Connect': () => toast('Example: this connection is not set up in the prototype. Gmail is the one that really connects.'),
    'Disconnect': () => toast('Example: this connection stays on in the prototype.'),
  };
  if (A[label]) return A[label]();
  closeLayers(); toast(`${label}: done.`);
}
document.addEventListener('submit', e => {
  const f = e.target; if (f.matches('form[data-m]') || f.closest('#panel')) return; e.preventDefault();
  if (f.matches('[data-tell]')) { const v = f.querySelector('input').value.trim(), q = cq(); if (!v || !q) return;
    if (!editable(q)) { toast('This quote has gone to the customer. Make a new revision first.'); return; }
    const box = f.querySelector('input'); toast('The agent is reading your instruction…');
    AG().tell({ text: v, quote: q.id }).then(r => { if (!r.changes.length) { toast(r.summary || 'I could not turn that into a change.'); return; }
      const res = r.changes.reduce((a, c) => ({ diff: a.diff.concat(applyChange(q, c, 'person').diff) }), { diff: [] });
      q.timeline.unshift([`You told the agent: "${v}". ${res.diff.join(', ') || 'No change in numbers.'}`, now()]); logA(`You told the agent on ${q.id}: ${v} (${res.diff.join(', ') || 'no change'})`); save(); box.value = ''; refreshQuote(); toast(`Done: ${res.diff.join(', ') || 'no change in numbers'}. The lines you changed are locked.`); }); return; }
  if (f.matches('[data-ask]') || f.id === 'search') { const v = (new FormData(f).get('q') || '').trim(); location.hash = `#/ask?q=${encodeURIComponent(v)}`; if (f.id === 'search') f.reset(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLayers(); if (e.key === 'Enter' && e.target.matches('.ce')) { e.preventDefault(); e.target.blur(); } });

/* ---------- planning drag ---------- */
let bar = null;
function moveBar(i, s) {
  const r = state.planRows[i]; if (!r) return; s = Math.max(0, Math.min(3, s)); const wk = 48 + s + 1;
  if (wk === r.w) { state.keepScroll = true; route(); return; }
  run(() => { const o = O_(r.id); if (o) o.week = wk; else Qt(r.id).week = wk; logA(`Moved ${r.id} to delivery week ${wk}`); return [`${r.n} moves to delivery week ${wk}. Approve the plan to tell the team and the customer.`]; });
  const b = document.querySelector(`[data-bar="${i}"]`); if (b) b.focus();
}
document.addEventListener('pointerdown', e => { const b = e.target.closest && e.target.closest('.gantt__bar'); if (!b || e.button) return;
  e.preventDefault(); b.setPointerCapture(e.pointerId); bar = { b, x0: e.clientX, left: b.offsetLeft, w: b.parentElement.clientWidth, i: +b.dataset.bar }; b.classList.add('is-drag'); });
document.addEventListener('pointermove', e => { if (!bar) return; const max = bar.w - bar.b.offsetWidth; bar.b.style.left = Math.max(0, Math.min(max, bar.left + e.clientX - bar.x0)) + 'px'; });
document.addEventListener('pointerup', e => { if (!bar) return; const { b, x0, left, w, i } = bar; bar = null; b.classList.remove('is-drag');
  if (Math.abs(e.clientX - x0) < 4) { b.focus(); return; } moveBar(i, Math.round((left + e.clientX - x0) / w * 5)); });
document.addEventListener('keydown', e => { const b = e.target.closest && e.target.closest('.gantt__bar'); if (!b || !['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
  e.preventDefault(); const i = +b.dataset.bar, r = state.planRows[i]; moveBar(i, r.w - 49 + (e.key === 'ArrowRight' ? 1 : -1)); });

/* ---------- overlays ---------- */
function toast(msg, fn, label = 'Undo') {
  const el = $('#toast'); el.innerHTML = `<span>${esc(msg)}</span>${fn ? `<button class="linkbtn" id="undo">${label}</button>` : ''}`; el.hidden = false;
  if (fn) $('#undo').onclick = () => { el.hidden = true; fn(); };
  clearTimeout(toast.t); toast.t = setTimeout(() => el.hidden = true, 7000);
}
function modal(title, body, ok, onOk) {
  const m = $('#modal'); m.innerHTML = `<div class="modal" role="dialog" aria-modal="true" aria-labelledby="mt"><h2 id="mt" class="uf-section-title">${title}</h2>${body}<div class="modal__foot">${btn('Cancel', 'quiet', 'data-close')}${btn(ok, 'primary', 'id="mok"')}</div></div>`;
  m.hidden = false; const first = m.querySelector('input, textarea, select'); (first || $('#mok')).focus();
  const box = m.querySelector('.modal');
  $('#mok').onclick = () => { if (onOk(box) === false) return; if (m.querySelector('.modal') === box) closeLayers(); };
  m.querySelector('[data-close]').onclick = closeLayers;
}
function openDrawer(title, body, foot, done) {
  const d = $('#panel');
  d.innerHTML = `<form><div class="uf-panel__head"><h2 class="uf-section-title" id="pt">${esc(title)}</h2><button class="uf-pbtn uf-pbtn--quiet uf-pbtn--icon" type="button" data-close aria-label="Close">${I('close')}</button></div>
    <div class="uf-panel__body">${body}</div>${foot === '' ? '' : `<div class="uf-panel__foot"><button class="uf-pbtn uf-pbtn--quiet" type="button" data-close>Cancel</button>${foot || '<button class="uf-pbtn uf-pbtn--primary" type="submit">Save</button>'}</div>`}</form>`;
  d.hidden = false; $('#scrim').hidden = false;
  d.querySelectorAll('[data-close]').forEach(b => b.onclick = closeLayers);
  const form = d.querySelector('form');
  form.onsubmit = e => { e.preventDefault(); if (typeof done === 'function') { if (done(form) === false) return; } else toast(done || 'Saved.'); if (d.querySelector('form') === form) closeLayers(); };
  const f = d.querySelector('.uf-panel__body input, .uf-panel__body textarea, .uf-panel__body select, .uf-panel__body button'); if (f) f.focus();
}
function closeLayers() { if (media.rec) media.rec.stop(); $('#modal').hidden = true; $('#panel').hidden = true; $('#scrim').hidden = true; }
$('#scrim').onclick = closeLayers;
window.UF = { toast, modal, openDrawer, nav: () => renderNav(SECTION_OF[(location.hash.split('/')[1] || 'today').split('?')[0]] || (location.hash.split('/')[1] || 'today').split('?')[0]), route };

route();
})();
