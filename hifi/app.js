/* Uniframe hi-fi wireframe (greyscale). Real example data from the portal repo (data.js + demo mails).
   One layout on every page: the work in the middle, a decision rail on the right.
   Calm round (26 Nov, after ux-process-audit-2026-11-26.md):
   - The rail holds only: a title, max 3 plain facts, the decision (the only box), and one line under
     the button that says what the button will do. No grey labels, no card per fact.
   - One dark thing per page: the main button. Names come before IDs. One keyboard tip in the top bar.
   The main button never moves (x 1248, y 812 at 1600 × 900). Enter presses it. Nothing is sent anywhere. */
(() => {
const D = window.UF_DATA;
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const eur = n => '€ ' + n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = iso => { const [, m, d] = String(iso).split('-'); return m ? +d + ' ' + MON[m - 1] : iso; };
const clean = s => String(s).replace(/-\s+/g, ' ');
const sale = l => l.cost * (1 + l.margin / 100);
const flat = q => q.chapters.flatMap(c => c.lines);
const total = q => flat(q).reduce((s, l) => s + l.qty * sale(l), 0);
const costOf = q => flat(q).reduce((s, l) => s + l.qty * l.cost, 0);
const marginOf = q => { const t = total(q); return t ? (t - costOf(q)) / t * 100 : 0; };
const art = k => D.articles.find(a => a.key === k);
const A = (k, qty, over = {}) => { const a = art(k); return { desc: a.desc, qty, unit: a.unit, cost: a.cost, margin: a.margin, supplier: a.supplier || 'Own team', ...over }; };
const STEPS = D.journey;
Object.values(D.quotes).forEach(q => { q.project_info.desc = clean(q.project_info.desc); });
const URGENT = ['Overdue', 'Supplier late', 'Needs a person', 'Late', 'conflict', 'At risk'];

/* rail building blocks */
const kv = (k, v, small, gap) => `<div class="kv"><span>${k}</span><b class="${gap ? 'gapb' : ''}">${v}${small ? `<small>${small}</small>` : ''}</b></div>`;
const head = (title, sub) => `<h2>${title}</h2>${sub ? `<p class="sub">${sub}</p>` : ''}`;

/* Demo mails, copied from the portal's mail.js. agent = what the agent made of the mail (Inbox label). */
const MAILS = {
  d7: { from: 'Daan Verhoeven (verkoop)', subject: 'Doorgestuurd: aanvraag kantoorverdieping Utrecht', date: '23 Nov', files: ['plattegrond.pdf', 'deurstaat.pdf'], agent: 'New request',
    body: 'Van: Marloes de Graaf <marloes@degraaf-interieur.nl>\nDoorgestuurd door: Daan Verhoeven (verkoop)\nOnderwerp: Aanvraag kantoorverdieping Utrecht\n\nHoi Arjan,\n\nHieronder alles van De Graaf Interieurbouw. Voor de kantoorverdieping aan het Stationsplein 4 in Utrecht willen ze een glazen systeemwand van 12 m, hoogte 3,0 m, met 4 deuren en mat folie op ooghoogte. Enkel glas, 10 mm. Oplevering in maart. Plattegrond en deurstaat zitten in de bijlage. Let op: de deurstaat toont 5 deuren.\n\nGroet,\nDaan Verhoeven\nUniframe verkoop' },
  d8: { from: 'Afdeling inkoop, Bouwbedrijf Hoekstra', subject: 'RE: Offerte O2611-007 sporthal', date: '23 Nov', agent: 'Accepted + 2 doors', body: 'Goedemiddag,\n\nWe gaan akkoord met de offerte voor de sporthal, maar graag 2 deuren extra.\n\nGroet,\nAfdeling inkoop\nBouwbedrijf Hoekstra' },
  d1: { from: 'Paul Terlouw, Wallsz', subject: 'RE: Politie KPLD, deur 2.14 erbij', date: '19 Nov', agent: 'Revision R2 made', body: 'Beste Arjan,\n\nWe hebben toch een extra deur nodig op de begane grond (2.14), zelfde uitvoering als de rest.\nKunnen jullie de offerte aanpassen?\n\nMet vriendelijke groet,\nPaul Terlouw\nWallsz' },
  d3: { from: 'Glas Centrum Nederland', subject: 'Leverdatum I2611-001-1', date: '21 Nov', agent: 'Supplier late', body: 'Beste klant,\n\nDoor drukte in de productie verschuift de levering van order I2611-001-1 naar 2 december.\n\nMet vriendelijke groet,\nPlanning' },
  d4: { from: 'Marloes de Graaf', subject: 'Klacht: kras op deurblad', date: '22 Nov', files: ['foto-deur-kamer3.jpg'], agent: 'Complaint, stopped', body: 'Hoi Arjan,\n\nBij de oplevering zagen we een flinke kras op het deurblad van kamer 3. Foto in de bijlage. Hoe lossen we dit op?\n\nGroet,\nMarloes' },
  d2: { from: 'Bouwbedrijf Hoekstra', subject: 'Aanvraag school wing B', date: '21 Nov', agent: 'Project made', body: 'Goedemiddag,\n\nVoor school wing B in Amersfoort zoeken wij een prijs voor circa 60 m1 glazen systeemwand en 12 deuren. Tekening volgt.\n\nGroet,\nAfdeling inkoop', handled: 'Agent made project P2611-011 and drafted 2 questions (ceiling height, glass type).' },
  d6: { from: 'Paul Terlouw, Wallsz', subject: 'Aanvraag Politie KPLD', date: '18 Nov', agent: 'Calculation made', body: 'Beste Arjan,\n\nGraag een offerte voor systeemwanden, 8 kozijnen en deuren voor het politiebureau in Driebergen. Tekening en deurstaat in de bijlage.\n\nMet vriendelijke groet,\nPaul Terlouw\nWallsz', handled: 'Agent made project P2611-009 and drafted calculation C2611-009.' },
};

/* State, reset on reload */
const ST = { sel: {}, doors: null, folie: '', saveArt: true, toast: null, done: {}, calcMade: false, quoteSent: false, order: null, pos: [], relFilter: 'All', mine: [], projQ: '', moreToday: false, relQ: '', artQ: '',
  allIn: false, delivered: false, finalSent: false, signer: 'Marloes de Graaf',
  week: { 'V2611-001': 50 }, rem: { 'F2610-004': 1 }, plan: { pl1: 'In production', pl2: 'Waits for quote', pl3: 'Waits for quote' }, activity: D.activity.map(a => a.slice()),
  power: { Quotes: 'Always ask', 'Customer replies': 'Ask me first', 'Supplier chases': 'Do it alone, show in log', 'Payment reminders': 'Do it alone, show in log' } };

const Q = D.quotes;
const invTotal = inv => { const o = D.orders.find(o => o.id === inv.order); const q = Q[o.quote]; const t = total(q) * 1.21; return inv.pct ? t * inv.pct / 100 : t; };
const custOfOrder = id => { const o = D.orders.find(o => o.id === id); return D.projects.find(p => p.id === o.project); };
const isOverdue = i => i.status === 'Sent' && i.due < '2026-11-23' && !ST.done[i.id];
const relOf = name => D.relations.find(r => r.name === name) || {};
const finalAmount = () => total(Q['O2611-002']) * 1.21 * 0.7;   /* order V2611-002: 30 % at order, 70 % on delivery */

function calcDeGraaf() {
  const n = ST.doors || 4, f = parseFloat(String(ST.folie).replace(',', '.'));
  return { id: 'C2611-013', chapters: [
    { title: 'Systeemwanden', lines: [A('wall', 12)] },
    { title: 'Deuren', lines: [A('door', n), A('hw', n)] },
    { title: 'Folie', lines: [{ desc: 'Matte folie, band op ooghoogte', qty: 12, unit: 'm1', cost: isNaN(f) ? 0 : f, margin: 20, supplier: 'Own team', missing: isNaN(f) || f <= 0 }] },
    { title: 'Montage en transport', lines: [A('install', Math.round(12 * 1.2 + n * 2)), A('transport', 1)] }] };
}
function orderHoekstra() {
  return { id: 'V2611-007', project: 'P2611-007', quote: 'O2611-007', customer: 'Bouwbedrijf Hoekstra', name: 'Sports hall', chapters: [
    { title: 'Systeemwanden', lines: [A('wall', 40)] },
    { title: 'Deuren', lines: [A('door', 10, { note: '8 + 2 extra' }), A('hw', 10)] },
    { title: 'Montage en transport', lines: [A('install', 64), A('transport', 1)] }] };
}

/* ---------- items that need a person. Text starts with the name; the ID goes last. ---------- */
const ITEMS = [
  { id: 'q010', group: 'needs', mail: 'd1', since: 19, short: 'Wallsz quote', text: 'Wallsz | Politie KPLD: agent made R2 with 9 doors | O2611-009', tag: 'Verify' },
  { id: 'd3', group: 'needs', mail: 'd3', since: 21, short: 'Bentacera update', text: 'Bentacera | glass late, customer not told yet: week 51 | I2611-001-1', tag: 'Supplier late' },
  { id: 'd4', group: 'needs', mail: 'd4', since: 22, short: 'De Graaf complaint', text: 'De Graaf | complaint: scratch on a door, reply drafted', tag: 'Needs a person' },
  { id: 'd7', group: 'needs', mail: 'd7', since: 23, short: 'De Graaf request', text: 'De Graaf | new request: 12 m glass wall, 4 or 5 doors?', tag: 'New request' },
  { id: 'd8', group: 'needs', mail: 'd8', since: 23, short: 'Hoekstra order', text: 'Hoekstra | accepts the quote with 2 extra doors | O2611-007', tag: 'Customer reply' },
  { id: 'fin', group: 'due', short: 'De Graaf final invoice', text: 'De Graaf | delivered: final invoice 70 % is ready | V2611-002', tag: 'To invoice', when: () => ST.delivered && !ST.finalSent },
  { id: 'F2610-004', group: 'due', short: 'Wallsz invoice', text: 'Wallsz | invoice 13 days overdue, reminder 1 sent | F2610-004', tag: 'Overdue' },
  { id: 'I2611-002-2', group: 'due', short: 'Metaalwerk purchase', text: 'Metaalwerk Veenendaal | frames arrive 2 Dec | I2611-002-2', tag: 'Purchase' },
];
const waiting = i => i.since ? (23 - i.since ? `waiting ${23 - i.since} d` : 'today') : '';
const open = g => ITEMS.filter(i => i.group === g && !ST.done[i.id] && (!i.when || i.when())).sort((a, b) => (a.since || 99) - (b.since || 99));
const nextItem = () => open('needs')[0] || open('due')[0];
const toNext = () => { const n = nextItem(); return n ? { label: 'Next: ' + n.short, enabled: true, hint: 'Back to Today', run: () => { ST.sel.today = n.id; go('#/today'); } } : { label: 'All done for today', enabled: false }; };

function toast(text, undo) {
  /* your own actions are logged, so Undo stays reachable in Activity after the message is gone */
  const entry = undo ? { text, undo, at: new Date().toTimeString().slice(0, 5), undone: false } : null;
  if (entry) ST.mine.unshift(entry);
  ST.toast = { text, undo: undo && (() => { undo(); entry.undone = true; }), until: Date.now() + 10000 };
  setTimeout(() => { if (ST.toast && Date.now() > ST.toast.until) { ST.toast = null; document.querySelector('.toast')?.remove(); } }, 10050); }

/* choices sit side by side; when any label is long they stack, one per line, so nothing gets cut */
const seg = (key, opts, cur) => `<div class="seg${opts.length > 2 ? ' seg3' : ''}${opts.some(([, l]) => String(l).replace(/<[^>]+>/g, '').length > 22) ? ' stack' : ''}">${opts.map(([v, l]) => `<button data-do="${key}" data-v="${esc(v)}" aria-pressed="${String(cur) === String(v)}">${l}</button>`).join('')}</div>`;
const thumb = (name, cap) => `<div class="thumb" role="img" aria-label="Photo ${esc(name)}"><span>Photo</span><small>${esc(cap)}, ${esc(name)}</small></div>`;

/* railFor(id, here): here = true when you are on that record's own page (no self-link, no repeats) */
function railFor(id, here) {
  const q = Q['O2611-009'];
  if (id === 'q010') { const t = ST.transport, addrOk = !!(ST.addr && ST.addr.trim()), n = (addrOk ? 0 : 1) + (t === undefined ? 1 : 0);
    if (addrOk) q.client.address = ST.addr.trim();
    return { facts: head('Wallsz: Politie KPLD', 'Quote O2611-009 R2, Paul Terlouw')
      + kv('Total excl. VAT', `<span data-live="qt">${eur(total(q))}</span>`) + kv('Margin', marginOf(q).toFixed(1) + ' %') + kv('Changed', '8 → 9 doors', 'Paul, 19 Nov')
      + (here ? '' : '<a class="link" href="#/quote/O2611-009">Open the quote</a>'),
    decide: `${addrOk && !ST.addrOther ? '' : `<div class="ask${n > 1 ? ' compact' : ''}">Address says "Onbekend". Wallsz's last job used Kanaalweg 9, Utrecht.
        ${seg('addr', [['kanaal', 'Use Kanaalweg 9'], ['other', 'Type another']], ST.addrOther ? 'other' : '')}
        ${ST.addrOther ? `<label class="field">Address<input id="addr" value="${esc(ST.addr || '')}" autocomplete="off" placeholder="Street, city"></label>` : ''}</div>`}
      ${t === undefined ? `<div class="ask${n > 1 ? ' compact' : ''}">Transport has no price. Wallsz's last job paid €&nbsp;450.
      ${seg('transport', [['450', 'Use € 450'], ['0', 'Keep € 0']], t)}</div>` : ''}`,
    label: !addrOk ? 'Add the address first' : t === undefined ? 'Price transport first' : 'Approve and send R2', enabled: addrOk && t !== undefined,
    hint: addrOk && t !== undefined ? 'Mails R2 to paul.terlouw@wallsz.nl. Undo for 10 s.' : '',
    focus: !addrOk ? (ST.addrOther ? '#addr' : '[data-do=addr]') : t === undefined ? '[data-do=transport]' : '#anchor',
    run: () => { ST.done.q010 = true; q.status = 'Sent'; toast('Quote O2611-009 R2 sent to Paul Terlouw', () => { delete ST.done.q010; q.status = 'To verify'; }); } }; }
  if (id === 'd7') { const n = ST.doors;
    return { facts: here ? head('De Graaf: new request', 'The agent read 7 of 8 fields. The doors don\'t match.')
        : head('De Graaf: new request', 'Kantoorverdieping, Stationsplein 4, Utrecht')
          + kv('Wall', '12 m glass, 10 mm', 'matte folie: not in catalogue') + kv('Wanted', 'March, week 11') + kv('Files', '2 kept')
          + '<a class="link" href="#/request/P2611-013">Open the request</a>',
      decide: `<div class="ask">Doors: the mail says 4, the door schedule says 5.${seg('doors', [['4', 'Use 4'], ['5', 'Use 5']], n)}</div>`,
      label: n ? `Make calculation with ${n} doors` : 'Pick 4 or 5 doors first', enabled: !!n, hint: n ? 'The agent prices the lines. Nothing is sent.' : '',
      focus: n ? '#anchor' : '[data-do=doors]',
      run: () => { ST.calcMade = true; go('#/calc/C2611-013'); } }; }
  if (id === 'd3') return { facts: head('Bentacera: glass is late', 'Glas Centrum Nederland, purchase I2611-001-1, order V2611-001')
      + kv('Glass', '18 Nov → 2 Dec') + kv('Bentacera gets it', 'week 50 → 51'),
    decide: `<label class="field">Mail to Ruben Aalbers<textarea id="draft" class="full">Beste Ruben,

Door een late glaslevering schuift de oplevering van de behandelkamers in Zeist één week op, naar week 51. Excuses voor het ongemak.

Met vriendelijke groet,
Arjan Laninga</textarea></label>`,
    label: 'Send update', enabled: true, hint: 'Also moves order V2611-001 to week 51',
    run: () => { ST.done.d3 = true; ST.week['V2611-001'] = 51; toast('Update sent to Ruben, order now week 51', () => { delete ST.done.d3; ST.week['V2611-001'] = 50; }); } };
  if (id === 'd4') return { facts: head('De Graaf: complaint', 'Scratch on the door of room 3, order V2611-002, the agent stopped: complaints need you')
      + thumb('foto-deur-kamer3.jpg', 'Door, room 3') + (here ? '' : '<a class="link" href="#/project/P2611-002">Open the project</a>'),
    decide: `<label class="field">Reply to Marloes<textarea id="draft">Hoi Marloes,

Vervelend, dank voor de foto. We komen volgende week een nieuw deurblad plaatsen; ik bel je morgen voor een moment.

Groet,
Arjan</textarea></label>`,
    label: 'Send reply', enabled: true, hint: 'To marloes@degraaf-interieur.nl',
    run: () => { ST.done.d4 = true; toast('Reply sent to Marloes de Graaf', () => { delete ST.done.d4; }); } };
  if (id === 'd8') { const q8 = Q['O2611-007'], up = 2 * sale(art('door')) + 2 * sale(art('hw')) + 4 * sale(art('install'));
    return { facts: head('Hoekstra: accepts the quote', 'Sports hall, quote O2611-007, asks for 2 extra doors')
      + kv('Quote excl. VAT', eur(total(q8)), '+ ' + eur(up) + ' for the doors') + kv('Doors and hinge sets', '8 → 10') + kv('Montage', '60 → 64 h')
      + '<a class="link" href="#/quote/O2611-007">Open the quote</a>',
      label: 'Make order with 10 doors', enabled: true, hint: 'Opens order V2611-007. You pick the week there.',
      run: () => { ST.order = orderHoekstra(); go('#/order/V2611-007'); } }; }
  if (id === 'F2610-004') { const inv = D.invoices.find(i => i.id === id), r = relOf('Wallsz');
    return { facts: head('Wallsz: overdue', 'Final invoice F2610-004, Offices, Kanaalweg 9')
      + kv('Amount incl. VAT', eur(invTotal(inv))) + kv('Was due', '10 Nov', '13 days ago') + kv('Reminders', ST.rem[id] > 1 ? '2 sent' : '1 sent', ST.rem[id] > 1 ? 'by you, today' : '2nd by the agent on 27 Nov'),
      decide: `<p class="alt">Or call ${esc(r.contact)}, ${r.phone ? esc(r.phone) : 'no phone number on file'}${r.phone ? '' : '<button class="btn2 inline" data-do="noop">Add phone</button>'}</p>`,
      label: ST.rem[id] > 1 ? 'Reminder 2 sent' : 'Send reminder 2 now', enabled: ST.rem[id] < 2, hint: ST.rem[id] > 1 ? '' : 'Herinnering 2 to ' + r.email,
      run: () => { ST.rem[id] = 2; ST.done[id] = true; toast('Reminder 2 sent to Paul Terlouw', () => { ST.rem[id] = 1; delete ST.done[id]; }); } }; }
  if (id === 'I2611-002-2') { const p = D.purchases.find(x => x.id === id);
    return { facts: head('Metaalwerk Veenendaal: on its way', 'Purchase I2611-002-2, for De Graaf, order V2611-002')
      + p.lines.map(l => kv(esc(l.desc), l.qty + ' ' + l.unit)).join('') + kv('Arrives', '2 Dec'),
      label: 'Mark as seen', enabled: true, hint: 'The agent keeps watching 2 Dec',
      run: () => { ST.done[id] = true; toast('Marked as seen', () => delete ST.done[id]); } }; }
  if (id === 'fin') { const dep = D.invoices.find(i => i.id === 'F2611-002-1');
    return { facts: head('De Graaf: final invoice F2611-002-2', 'Order V2611-002, delivered, signed by ' + esc(ST.signer || 'Marloes de Graaf'))
      + kv('70 % incl. VAT', eur(finalAmount())) + kv('Deposit 30 %, F2611-002-1', eur(invTotal(dep)), 'due ' + day(dep.due)) + kv('Payment', '70 % on delivery'),
      label: 'Send final invoice', enabled: true, hint: 'To marloes@degraaf-interieur.nl, copy to the accountant',
      run: () => { ST.finalSent = true; toast('Final invoice sent to Marloes, accountant copied', () => { ST.finalSent = false; }); } }; }
  return { facts: '<p class="empty">Nothing selected.</p>', label: 'Nothing to do', enabled: false };
}

/* ---------- views ---------- */
/* stepper(i, links, notes): done steps with a link are clickable; notes show open items under a step */
const stepper = (i, links = {}, notes = {}) => `<nav class="stepper" aria-label="Job stage">${STEPS.map((s, k) => { const cls = `step ${k < i ? 'done' : k === i ? 'now' : ''}`, n = notes[k] ? `<em>${notes[k]}</em>` : '';
  return links[k] && k < i ? `<a class="${cls} go" href="${links[k]}"><i></i>${s}${n}</a>` : `<div class="${cls}"${k === i ? ' aria-current="step"' : ''}><i></i>${s}${n}</div>`; }).join('')}</nav>`;
const back = `<a class="back" href="#" data-do="back">← Back</a>`;
const tagHtml = t => t ? `<span class="tag${URGENT.includes(t) ? ' urgent' : ''}">${esc(t)}</span>` : '';
const CODE = /^(job )?[A-Z]?\d{4}-\d{3}(-\d)?$/;
/* "Customer | what | number": the layout separates them, not punctuation */
const rowText = text => { const p = String(text).split(' | '); if (p.length < 2) return [`<span title="${esc(text)}">${esc(text)}</span>`, '']; const code = CODE.test(p[p.length - 1]) ? p.pop() : ''; const what = p.slice(1).join(', ');
  return [`<span class="two"><b title="${esc(p[0])}">${esc(p[0])}</b>${what ? `<span title="${esc(what)}">${esc(what.charAt(0).toUpperCase() + what.slice(1))}</span>` : ''}</span>`, code ? `<span class="code">${esc(code)}</span>` : '']; };
const row = (list, id, text, tag, meta = '', warn = false) => { const [main, code] = rowText(text); return `<div class="row${warn ? ' warn' : ''}" data-sel="${list}" data-id="${id}" aria-selected="${ST.sel[list] === id}" role="option" tabindex="-1">${main}${code}${meta ? `<span class="meta" title="${esc(meta)}">${esc(meta)}</span>` : ''}${tagHtml(tag)}</div>`; };
const pick = (list, ids) => { if (!ids.includes(ST.sel[list])) ST.sel[list] = ids[0]; return ST.sel[list]; };
const linesTable = q => `<table><thead><tr><th>Nr</th><th>Line</th><th class="num">Qty</th><th>Unit</th><th class="num">Cost</th><th class="num">Margin</th><th class="num">Total</th></tr></thead><tbody>
  ${q.chapters.map((c, ci) => c.lines.map((l, li) => `<tr class="${l.missing ? 'missing' : ''}"><td>${ci + 1}.${li + 1}</td><td>${esc(l.desc)}${l.note ? ` <span class="tag">${esc(l.note)}</span>` : ''}${l.missing ? '<br><small>Not in the catalogue, price it on the right</small>' : ''}</td>
    <td class="num">${l.qty}</td><td>${l.unit}</td><td class="num">${l.missing ? '–' : eur(l.cost)}</td><td class="num">${l.margin} %</td><td class="num">${l.missing ? '–' : eur(l.qty * sale(l))}</td></tr>`).join('')).join('')}</tbody></table>`;

const V = {};
V.today = () => {
  const needs = open('needs'), due = open('due');
  const sel = pick('today', [...needs, ...due].map(i => i.id));
  return { work: `<h1>Today</h1><p class="sub">Monday 23 Nov. ${needs.length} need you, longest waiting first.</p>
    <a class="agentline" href="#/activity">The agent did ${ST.activity.length + 7} things since Friday. See all ${ST.activity.length + 7}</a>
    <div class="lab">Needs you <span class="count">${needs.length}</span></div><div class="rows" role="listbox">${(ST.moreToday ? needs : needs.slice(0, 5)).map(i => row('today', i.id, i.text, i.tag, waiting(i), URGENT.includes(i.tag))).join('') || '<p class="empty">Nothing needs you. The agent handles the routine.</p>'}${needs.length > 5 && !ST.moreToday ? `<a href="#" class="row" data-do="moretoday"><span>Show ${needs.length - 5} more</span></a>` : ''}</div>
    <div class="lab">Due today <span class="count">${due.length}</span></div><div class="rows" role="listbox">${due.map(i => row('today', i.id, i.text, i.tag, '', URGENT.includes(i.tag))).join('') || '<p class="empty">Nothing due.</p>'}</div>`,
    rail: railFor(sel), list: 'today' };
};
const mailRow = (id, sel) => { const m = MAILS[id]; return `<div class="row two" data-sel="inbox" data-id="${id}" aria-selected="${sel === id}" role="option" tabindex="-1"><span><b>${esc(m.from.split(', ')[0])}</b><small><b>${esc(m.agent)}</b>&ensp;${esc(m.subject)}</small></span><span class="meta">${m.date}</span></div>`; };
V.inbox = () => {
  const needMails = ITEMS.filter(i => i.mail && !ST.done[i.id]).sort((a, b) => a.since - b.since).map(i => i.mail);
  const handled = ['d2', 'd6', ...ITEMS.filter(i => i.mail && ST.done[i.id]).map(i => i.mail)];
  const sel = pick('inbox', [...needMails, ...handled]), m = MAILS[sel], item = ITEMS.find(i => i.mail === sel);
  /* No box around the list: list and mail are two full-height columns split by one line */
  return { full: true, work: `<h1>Inbox</h1><p class="sub">Gmail arjan@uniframe.nl. In bold: what the agent made of each mail.</p><div class="mailsplit"><div class="maillist">
    <div class="lab" style="margin-top:0">Needs you <span class="count">${needMails.length}</span></div><div class="rows">${needMails.map(id => mailRow(id, sel)).join('')}</div>
    <div class="lab">Handled by the agent <span class="count">${handled.length}</span></div><div class="rows">${handled.map(id => mailRow(id, sel)).join('')}</div></div>
    <article class="mail mailread"><h2>${esc(m.subject)}</h2><p class="sub">${esc(m.from)}, ${m.date}</p><pre>${esc(m.body)}</pre>${(m.files || []).map(f => `<span class="chip">${esc(f)}</span>`).join('')}</article></div>`,
    rail: item && !ST.done[item.id] ? railFor(item.id) : { facts: head('Handled by the agent', esc(m.handled || 'Done.')), ...toNext() }, list: 'inbox' };
};
V.request = () => ({ work: `${back}<h1>De Graaf: Kantoorverdieping Utrecht</h1><p class="sub">Request P2611-013, from mail 23 Nov</p>${stepper(0)}
  <div class="split" style="grid-template-columns:1fr 1fr;gap:32px"><article class="mail"><h2>What they ask</h2>
    <p>Daan forwards a request from Marloes de Graaf: a 12 m glass wall, 3.0 m high, single glass 10 mm, with matte folie at eye level. Delivery in March. The mail says 4 doors; the door schedule shows 5.</p>
    <span class="chip">plattegrond.pdf</span><span class="chip">deurstaat.pdf</span>
    <p class="sub" style="margin:4px 0 0">Summary by the agent. <a href="#" class="readmore" data-do="original">${ST.showOriginal ? 'Hide original mail' : 'Read original mail'}</a></p>
    ${ST.showOriginal ? `<pre class="original">${esc(MAILS.d7.body)}</pre>` : ''}</article>
  <div><div class="rows">${[['Doors', ST.doors ? ST.doors + ' (you chose)' : '4 or 5?', ST.doors ? 'you' : 'conflict'], ['Customer', 'De Graaf Interieurbouw', 'mail'], ['Contact', 'Marloes de Graaf', 'mail'], ['Site', 'Stationsplein 4, Utrecht', 'mail'], ['Wall', '12 m, h 3000 mm', 'mail'], ['Glass', 'Enkel glas, 10 mm', 'mail'], ['Folie', 'Matte, eye level', 'mail'], ['Wanted', 'March = week 11', 'mail']]
    .map(([f, v, s]) => `<div class="row${s === 'conflict' ? ' warn' : ''}" style="cursor:default"><span>${f}</span><span>${esc(v)}</span>${s === 'conflict' ? tagHtml(s) : `<span class="meta">${s}</span>`}</div>`).join('')}</div></div></div>`, rail: railFor('d7', true) });

/* ---------- lists: every job and every quote, found by name or by the shared job number ---------- */
const shortName = c => c.replace(' Interieurbouw', '').replace('Bouwbedrijf ', '');
const baseOf = id => (String(id).match(/\d{4}-\d{3}/) || [''])[0];
function jobState(p) {
  switch (p.id) {
    case 'P2611-011': return { stage: 'Request, agent asked 2 questions', go: () => { ST.sel.inbox = 'd2'; go('#/inbox'); }, open: true };
    case 'P2611-013': return ST.quoteSent ? { stage: 'Quote sent today', go: () => go('#/quote/O2611-013'), open: true } : ST.calcMade ? { stage: 'Calculation, folie to price', go: () => go('#/calc/C2611-013'), open: true } : { stage: 'Request, 4 or 5 doors?', tag: 'New request', go: () => go('#/request/P2611-013'), open: true };
    case 'P2611-009': return Q['O2611-009'].status === 'Sent' ? { stage: 'Quote R2 sent', go: () => go('#/quote/O2611-009'), open: true } : { stage: 'Quote R2 to check', tag: 'Verify', go: () => go('#/quote/O2611-009'), open: true };
    case 'P2611-007': return { stage: ST.pos.some(x => x.order === 'V2611-007') ? 'Order, materials ordered' : 'Quote accepted, no order yet', go: () => go('#/order/V2611-007'), open: true };
    case 'P2611-002': return { stage: ST.finalSent ? 'Invoiced, final sent' : ST.delivered ? 'Delivered, invoice to send' : 'Ready to ship, 1 line open', go: () => go('#/project/P2611-002'), open: true };
    case 'P2611-001': return { stage: ST.done.d3 ? 'Order, moved to week 51' : 'Order, glass is late', tag: ST.done.d3 ? '' : 'Late', go: () => { ST.sel.purchasing = 'I2611-001-1'; go('#/purchasing'); }, open: true };
    case 'P2610-004': return { stage: 'Invoiced, 13 days overdue', tag: 'Overdue', go: () => { ST.sel.invoices = 'F2610-004'; go('#/invoices'); }, open: true };
    case 'P2610-003': return { stage: 'Paid 7 Nov', go: () => go('#/invoices'), open: false };
    case 'P2610-006': return { stage: 'Lost, they chose a cheaper supplier', go: () => go('#/quote/O2610-006'), open: false };
    default: return { stage: '–', open: true };
  }
}
function projectsList() {
  const q = ST.projQ.trim().toLowerCase(), qb = baseOf(q);
  const hit = p => !q || (qb ? baseOf(p.id) === qb : [p.id, p.customer, p.name, p.site, p.contact].join(' ').toLowerCase().includes(q));
  const all = D.projects.filter(hit).map(p => ({ p, s: jobState(p) }));
  const openJobs = all.filter(x => x.s.open), closed = all.filter(x => !x.s.open);
  const sel = all.length ? pick('projects', all.map(x => x.p.id)) : null, cur = all.find(x => x.p.id === sel);
  const line = x => row('projects', x.p.id, `${shortName(x.p.customer)} | ${x.p.name} | job ${baseOf(x.p.id)}`, x.s.tag || '', x.s.stage, URGENT.includes(x.s.tag));
  const work = `<h1>Projects</h1><p class="sub">Every job. One number per job: O2611-002, V2611-002 and F2611-002-1 all belong to job 2611-002.</p>
    <input class="search" id="projq" style="width:100%;margin-bottom:4px" placeholder="Job number, document number or customer" aria-label="Search jobs" value="${esc(ST.projQ)}" autocomplete="off">
    <div class="lab">Open <span class="count">${openJobs.length}</span></div><div class="rows">${openJobs.map(line).join('') || '<p class="empty">No open job matches.</p>'}</div>
    <div class="lab">Closed <span class="count">${closed.length}</span></div><div class="rows">${closed.map(line).join('') || '<p class="empty">No closed job matches.</p>'}</div>`;
  if (!cur) return { work, rail: { facts: '<p class="empty">No match. Try a job number like 2611-002 or a customer name.</p>', label: 'Nothing to open', enabled: false }, list: 'projects' };
  const p = cur.p;
  return { work, rail: { facts: head(`${esc(shortName(p.customer))}: ${esc(p.name)}`, `Job ${baseOf(p.id)}, ${esc(p.site)}`) + kv('Stage', esc(cur.s.stage)) + kv('Contact', esc(p.contact), esc(p.email)),
    label: 'Open the job', enabled: !!cur.s.go, hint: '', run: () => cur.s.go() }, list: 'projects' };
}
function quotesList() {
  const qs = Object.values(Q).map(q => ({ id: q.id, name: shortName(q.client.company), desc: q.project_info.desc, status: q.status, sent: q.sent, total: total(q) }));
  if (ST.quoteMade) qs.unshift({ id: 'O2611-013', name: 'De Graaf', desc: 'Kantoorverdieping', status: ST.quoteSent ? 'Sent' : 'To verify', sent: ST.quoteSent ? '2026-11-23' : '', total: total(calcDeGraaf()) });
  const acceptedHoekstra = ST.done.d8 || ST.order;
  const mine = qs.filter(q => q.status === 'To verify');
  const waiting = qs.filter(q => q.status === 'Sent' && !(q.id === 'O2611-007' && acceptedHoekstra));
  const decided = qs.filter(q => !mine.includes(q) && !waiting.includes(q));
  const sel = pick('quotes', [...mine, ...waiting, ...decided].map(q => q.id)), cur = qs.find(q => q.id === sel);
  const ago = d => d ? Math.round((Date.parse('2026-11-23') - Date.parse(d)) / 864e5) : 0;
  const work = `<h1>Quotes</h1><p class="sub">${qs.length} quotes, open total ${eur([...mine, ...waiting].reduce((s, q) => s + q.total, 0))} excl. VAT</p>
    <div class="lab">Needs you <span class="count">${mine.length}</span></div><div class="rows">${mine.map(q => row('quotes', q.id, `${q.name} | ${q.desc} | ${q.id}`, 'Verify', eur(q.total))).join('') || '<p class="empty">Nothing to check.</p>'}</div>
    <div class="lab">Waiting for the customer <span class="count">${waiting.length}</span></div><div class="rows">${waiting.map(q => row('quotes', q.id, `${q.name} | ${q.desc} | ${q.id}`, ago(q.sent) > 14 ? 'No reply 14 d+' : '', `sent ${day(q.sent)}, ${ago(q.sent)} d`, ago(q.sent) > 14)).join('') || '<p class="empty">No quotes out.</p>'}</div>
    <p class="state">${decided.filter(q => q.status !== 'Rejected').length} accepted, ${decided.filter(q => q.status === 'Rejected').length} lost, <a href="#" data-do="showdecided">${ST.showDecided ? 'hide' : 'show'}</a></p>
    ${ST.showDecided ? `<div class="rows">${decided.map(q => row('quotes', q.id, `${q.name} | ${q.desc} | ${q.id}`, '', q.status === 'Rejected' ? 'lost' : 'accepted')).join('')}</div>` : ''}`;
  return { work, rail: cur ? { facts: head(`${esc(cur.name)}: ${esc(cur.desc)}`, 'Quote ' + cur.id) + kv('Total excl. VAT', eur(cur.total)) + kv('Status', cur.id === 'O2611-007' && acceptedHoekstra ? 'Accepted' : cur.status, cur.sent ? 'sent ' + day(cur.sent) : ''),
    label: 'Open the quote', enabled: true, hint: '', run: () => go('#/quote/' + cur.id) } : { facts: '', label: 'Nothing to open', enabled: false }, list: 'quotes' };
}
const money = (c, missing) => { const t = total(c), cost = costOf(c), plus = missing ? ' + folie' : '';
  return kv('Total excl. VAT', eur(t) + plus) + kv('VAT 21 %', eur(t * .21) + plus) + kv('Total incl. VAT', eur(t * 1.21) + plus)
    + kv('Cost', eur(cost) + plus) + kv('Margin', `${eur(t - cost)}, ${(t ? (t - cost) / t * 100 : 0).toFixed(1)} %`, missing ? 'priced lines only' : ''); };
V.calc = () => {
  const c = calcDeGraaf(), missing = flat(c).filter(l => l.missing).length;
  return { work: `${back}<h1>De Graaf: Kantoorverdieping</h1><p class="sub">Calculation C2611-013, R1, ${ST.doors || 4} doors</p>${stepper(1, { 0: '#/request/P2611-013' })}${linesTable(c)}`,
    /* The money in plain lines (no boxes): cost, margin, VAT, totals. Until the folie has a price,
       the lines say "+ folie" and the margin is for the priced lines only. */
    rail: { facts: head('De Graaf: calculation', `<span data-live="final">${missing ? 'Not final: the folie has no price yet' : 'Priced from Articles'}</span>`) + money(c, missing),
      decide: `<div class="ask">Matte folie is not in the catalogue.<label class="field">Cost per m1 (12 m1)<input id="folie" inputmode="decimal" placeholder="€ 0.00" value="${esc(ST.folie)}" autocomplete="off"></label>
        <label class="check"><input type="checkbox" id="saveart" ${ST.saveArt ? 'checked' : ''}> Also save to Articles</label></div>`,
      label: missing ? 'Add the folie price first' : 'Make quote', enabled: !missing, hint: missing ? '' : 'Opens quote O2611-013. Nothing is sent.', live: true,
      run: () => { const f = parseFloat(String(ST.folie).replace(',', '.'));
        if (ST.saveArt && !D.articles.some(a => a.code === 'FO-MAT-01')) D.articles.push({ code: 'FO-MAT-01', key: 'folie', name: 'Matte folie, band op ooghoogte', desc: 'Matte folie, band op ooghoogte', group: 'Folie', unit: 'm1', cost: f, margin: 20, source: 'Own team', supplier: '', added: '23 Nov, from C2611-013' });
        ST.quoteMade = true; go('#/quote/O2611-013'); } }, focus: '#folie' };
};
V.quote = id => {
  if (!id) return quotesList();
  const mine = id === 'O2611-013', q = mine ? { ...calcDeGraaf(), id, client: { company: 'De Graaf Interieurbouw', attn: 'Mevr. M. de Graaf', address: 'Stationsplein 4, Utrecht' }, project_info: { desc: 'Kantoorverdieping', delivery: 'Stationsplein 4, Utrecht' }, date: '2026-11-23', valid: '2026-12-23' } : Q[id];
  const sent = mine ? ST.quoteSent : (q.status !== 'To verify' && q.status !== 'Draft');
  const rail = id === 'O2611-009' && !sent ? railFor('q010', true) : null;
  const changed = l => id === 'O2611-009' && l.qty === 9 ? 'was 8' : '';
  const noAddr = q.client.address === 'Onbekend';
  const doc = `<div class="doc"><div class="head"><div><b>Uniframe Systems</b><br>Terborg</div><div style="text-align:right"><b>Offerte ${esc(q.id)}</b><br>${day(q.date)}, geldig tot ${day(q.valid)}</div></div>
    <div>${esc(q.client.company)}<br>${esc(q.client.attn)}<br>${noAddr ? '<mark class="gap">Address missing</mark>' : esc(q.client.address)}</div><p>Project: ${esc(q.project_info.desc)}, ${esc(q.project_info.delivery)}</p>
    ${q.chapters.map(c => `<h3>${esc(c.title)}</h3><table>${c.lines.map(l => `<tr class="${changed(l) || (l.hint && !l.cost) ? 'chg' : ''}"><td>${esc(l.desc)}${changed(l) ? ` <span class="tag">${changed(l)}</span>` : ''}${l.hint && !l.cost ? ' <span class="tag urgent">no price</span>' : ''}</td><td class="num">${l.qty} ${l.unit}</td><td class="num">${eur(l.qty * sale(l))}</td></tr>`).join('')}</table>`).join('')}
    <table style="margin-top:14px"><tr class="total"><td>Totaal excl. btw</td><td class="num">${eur(total(q))}</td></tr><tr><td>Btw 21 %</td><td class="num">${eur(total(q) * .21)}</td></tr><tr class="total"><td>Totaal incl. btw</td><td class="num">${eur(total(q) * 1.21)}</td></tr></table></div>`;
  const to = mine ? 'Marloes de Graaf <marloes@degraaf-interieur.nl>' : `${q.client.attn} <${q.client.email}>`;
  const hello = mine ? 'Beste Marloes,' : (q.client.salutation || '').split(',').slice(-2, -1)[0]?.trim() + ',';
  const links = mine ? { 0: '#/request/P2611-013', 1: '#/calc/C2611-013' } : {};
  const name = q.client.company.replace(' Interieurbouw', '').replace('Bouwbedrijf ', '');
  return { work: `${back}<h1>${esc(name)}: ${esc(q.project_info.desc)}</h1><p class="sub">Quote ${esc(q.id)}, ${sent ? 'sent' : 'not sent yet'}${id === 'O2611-009' ? ', changed lines are marked' : ''}</p>${stepper(2, links)}${doc}`,
    rail: rail || (sent ? { facts: head(esc(name) + ': quote sent', `Sent to ${esc(to)}. A copy is in your Gmail sent mail.`), ...toNext() } : {
      facts: head(esc(name) + ': quote', 'Quote ' + esc(q.id)) + kv('Total excl. VAT', eur(total(q))) + kv('Margin', marginOf(q).toFixed(1) + ' %'),
      decide: `<label class="field">To<input value="${esc(to)}"></label><label class="field">Message<textarea>${esc(hello)}

Hierbij onze offerte voor ${mine ? `de glazen systeemwand met ${ST.doors || 4} deuren aan het Stationsplein 4. Oplevering in week 11` : esc(q.project_info.desc)}.

Met vriendelijke groet,
Arjan Laninga</textarea></label>`,
      label: 'Approve and send', enabled: true, hint: `Offerte ${esc(q.id)}.pdf attached. Undo for 10 s.`,
      run: () => { if (mine) { ST.quoteSent = true; ST.done.d7 = true; } else { q.status = 'Sent'; if (id === 'O2611-009') ST.done.q010 = true; } toast('Quote ' + q.id + ' sent', () => { if (mine) { ST.quoteSent = false; delete ST.done.d7; } else q.status = 'To verify'; }); } }) };
};
V.order = () => {
  const o = ST.order || orderHoekstra(), wk = ST.week[o.id] || 6, placed = ST.pos.some(p => p.order === o.id);
  const sup = {}; flat(o).filter(l => l.supplier !== 'Own team').forEach(l => (sup[l.supplier] = sup[l.supplier] || []).push(l));
  const load = { 5: 85, 6: 55, 7: 40 };
  return { work: `${back}<h1>Hoekstra: ${o.name}</h1><p class="sub">Order ${o.id}, from quote ${o.quote} + 2 doors</p>${stepper(3, { 2: '#/quote/' + o.quote })}
    <table><thead><tr><th>Line</th><th class="num">Qty</th><th>Supplier</th></tr></thead><tbody>${flat(o).map(l => `<tr class="${l.supplier === 'Own team' ? 'own' : ''}"><td>${esc(l.desc)}${l.note ? ` <span class="tag">${l.note}</span>` : ''}</td><td class="num">${l.qty} ${l.unit}</td><td>${l.supplier === 'Own team' ? 'Own team, no order' : esc(l.supplier)}</td></tr>`).join('')}</tbody></table>
    <div class="lab">Notes from the customer</div><p style="margin:0">"Start februari" and "graag 2 deuren extra" <small>(phone 28 Oct, mail 23 Nov)</small></p>`,
    rail: placed ? { facts: head('Hoekstra: ordered', 'The agent chases late suppliers and logs it.') + Object.keys(sup).map(s => kv(esc(s), 'sent')).join(''), ...toNext() } : {
      facts: head('Hoekstra: supplier orders', Object.keys(sup).length + ' mails, one per supplier') + Object.entries(sup).map(([s, ls]) => kv(esc(s), ls.map(l => l.qty + ' ' + l.unit).join(', '), D.supplierMail[s])).join(''),
      decide: `<div class="ask">Which week? The customer wants February.${seg('week', [5, 6, 7].map(w => [w, `Week ${w}<small>${load[w]} % full</small>`]), wk)}</div>`,
      label: `Order materials from ${Object.keys(sup).length} suppliers`, enabled: true, hint: `Sent from arjan@uniframe.nl, delivery week ${wk}`,
      run: () => { Object.keys(sup).forEach(s => ST.pos.push({ order: o.id, supplier: s })); ST.done.d8 = true; toast(Object.keys(sup).length + ' supplier orders sent', () => { ST.pos = ST.pos.filter(p => p.order !== o.id); delete ST.done.d8; }); } } };
};
V.project = id => {
  if (!id) return projectsList();
  const p = D.projects.find(x => x.id === 'P2611-002'), q = Q['O2611-002'], dep = D.invoices.find(i => i.id === 'F2611-002-1');
  const st = ST.delivered ? 5 : 4;
  /* One job, one base number (2611-002). Only the letter says what the document is.
     The documents are listed in the order of the job, so nothing "pops up" out of order. */
  const fin = ST.finalSent ? 'sent today' : ST.delivered ? 'ready to send' : 'after delivery';
  const docs = [
    ['Calculation', 'C2611-002', 'R3, final', '', 'done'],
    ['Quote', 'O2611-002', 'accepted 10 Nov', '#/quote/O2611-002', 'done'],
    ['Order', 'V2611-002', 'week 50, 30 % at order', '', 'done'],
    ['Purchase, Deurenfabriek Oost', 'I2611-002-1', 'received 14 Nov', '#/purchasing', 'done'],
    ['Purchase, Metaalwerk Veenendaal', 'I2611-002-2', ST.allIn ? 'received 2 Dec' : 'arrives 2 Dec', '#/purchasing', ST.allIn ? 'done' : 'open'],
    ['Delivery note', 'L2611-002', ST.delivered ? 'signed by ' + ST.signer : 'week 50', '#/delivery', ST.delivered ? 'done' : 'open'],
    ['Invoice, deposit 30 %', 'F2611-002-1', 'due ' + day(dep.due), '#/invoices', 'open'],
    ['Invoice, final 70 %', 'F2611-002-2', fin, '#/invoices', ST.finalSent ? 'done' : 'open']];
  return { work: `${back}<h1>De Graaf: ${p.name}</h1><p class="sub">Job 2611-002, ${p.site}, week 50</p>${stepper(st, { 2: '#/quote/O2611-002' })}
    <table class="chain"><thead><tr><th>Document</th><th>Number</th><th>Status</th><th></th></tr></thead><tbody>${docs.map(([a, n, s, h, d]) => `<tr class="${d === 'done' ? 'own' : ''}"${h ? ` data-go="${h}" style="cursor:pointer"` : ''}><td>${d === 'done' ? '✓ ' : ''}${a}</td><td>${n.replace('2611-002', '<b>2611-002</b>')}</td><td>${s}</td><td class="num">${h ? '›' : ''}</td></tr>`).join('')}</tbody></table>`,
    rail: { facts: head('De Graaf: Offices', 'Marloes de Graaf, ' + esc(p.email))
      + kv('Next step', ST.finalSent ? 'Wait for payment' : ST.delivered ? 'Final invoice' : 'Delivery check', 'Arjan, week 50') + kv('Open', ST.allIn ? 'nothing missing' : '1 line: steel frames', ST.allIn ? '' : 'arrive 2 Dec'),
      decide: ST.done.d4 ? '' : `<div class="ask">Open issue: complaint about a scratch on the door of room 3. A reply is drafted.<button class="btn2" data-do="answer">Answer the complaint</button></div>`,
      ...(ST.finalSent ? toNext() : { label: ST.delivered ? 'Go to the final invoice' : 'Check delivery', enabled: true, hint: ST.delivered ? '' : 'Opens the delivery checklist', run: () => { if (ST.delivered) { ST.sel.invoices = 'fin'; go('#/invoices'); } else go('#/delivery'); } }) } };
};
V.purchasing = () => {
  const late = ST.done.d3 ? [] : ['I2611-001-1'], rest = ['I2611-002-2', 'I2611-002-1', ...ST.pos.map((p, i) => 'NEW' + i)];
  const sel = pick('purchasing', [...late, ...rest]);
  const lab = id => { if (id.startsWith('NEW')) { const p = ST.pos[+id.slice(3)]; return [`${p.supplier} | for ${p.order}`, 'sent today']; } const p = D.purchases.find(x => x.id === id); const cust = custOfOrder(p.order).customer.replace(' Interieurbouw', ''); return [`${p.supplier} | for ${cust} | ${id}`, ['Draft', 'Sent', 'Confirmed', 'Received', 'Invoice matched', 'Paid'][p.step] + ', ' + (id === 'I2611-001-1' ? 'moved to 2 Dec' : id === 'I2611-002-2' && ST.allIn ? 'received 2 Dec' : day(p.due))]; };
  return { work: `<h1>Purchasing</h1><p class="sub">${rest.length + late.length} open, ${late.length} late</p>
    <a class="agentline" href="#/activity">The agent chased Glas Centrum on 21 Nov. See the log</a>
    <div class="lab">Needs you <span class="count">${late.length}</span></div><div class="rows">${late.map(id => row('purchasing', id, lab(id)[0], 'Late', lab(id)[1], true)).join('') || '<p class="empty">Nothing late.</p>'}</div>
    <div class="lab">Open</div><div class="rows">${rest.map(id => row('purchasing', id, lab(id)[0], '', lab(id)[1])).join('')}</div>`,
    rail: sel === 'I2611-001-1' ? railFor('d3') : { facts: head(esc(lab(sel)[0].split(' | ')[0]), esc(lab(sel)[1]) + '. The agent watches the date and chases if it slips.'), label: 'Nothing to do', enabled: false }, list: 'purchasing' };
};
V.planning = () => {
  const moved = ST.week['V2611-001'] === 51;
  const lines = [{ id: 'pl1', who: 'Bentacera', desc: 'Systeemwand dicht 16 m1', ref: 'V2611-001', week: ST.week['V2611-001'], risk: moved ? 'moved to week 51' : 'glass late: week 51?' }, { id: 'pl2', who: 'Wallsz', desc: 'Systeemwand dicht 28 m1', ref: 'O2611-009, if accepted', week: 52 }, { id: 'pl3', who: 'De Graaf', desc: 'Matte folie 12 m1', ref: 'O2611-013, if accepted', week: 11 }];
  const sel = pick('planning', lines.map(l => l.id)), L = lines.find(l => l.id === sel), s = ST.plan[sel];
  const bars = [[48, 80], [49, 55], [50, 95], [51, moved ? 70 : 45], [52, 20]];
  return { work: `<h1>Planning: own factory</h1><p class="sub">Load per week, example numbers: factory work is not tracked today</p>
    <div class="bars" style="padding:4px 0 8px">${bars.map(([w, p], k) => `<div class="bar"><b>Week ${w}${k === 0 ? ' (now)' : ''}</b><span><i class="${p > 90 ? 'full' : ''}" style="width:${p}%"></i></span><b>${p} %${p > 90 ? ' full' : ''}</b></div>`).join('')}</div>
    <div class="lab">Own-factory lines</div><div class="rows">${lines.map(l => row('planning', l.id, `${l.who} | ${l.desc} | ${l.ref}`, l.risk && !moved ? 'At risk' : ST.plan[l.id], l.risk || 'week ' + l.week, !!l.risk && !moved)).join('')}</div>`,
    rail: { facts: head(esc(L.who) + ': ' + esc(L.desc), esc(L.ref)) + kv('Status', s) + kv('Week', String(L.week), L.risk || ''),
      label: s === 'Ready' ? 'Ready ✓' : s === 'Waits for quote' ? 'Starts when the quote is accepted' : 'Mark ready', enabled: s === 'In production', hint: s === 'In production' ? 'The delivery check counts it as in' : '',
      run: () => { ST.plan[sel] = 'Ready'; toast(L.desc + ' is ready', () => { ST.plan[sel] = 'In production'; }); } }, list: 'planning' };
};
V.delivery = () => {
  const q = Q['O2611-002'], p = D.projects.find(x => x.id === 'P2611-002');
  const st = l => /Stalen/.test(l.desc) ? (ST.allIn ? '✓ in, 2 Dec' : 'arrives 2 Dec, Metaalwerk') : /Montage/.test(l.desc) ? 'own team' : '✓ in';
  const missing = flat(q).filter(l => /arrives/.test(st(l))).length;
  const stepI = ST.delivered ? 5 : 4;
  const facts3 = kv('Address', esc(p.site)) + kv('Contact', esc(p.contact), 'no phone on file') + kv('Time window and driver', 'not set', 'ask Joost', true);
  const rail = ST.delivered ? { facts: head('De Graaf: delivered', 'Signed by ' + esc(ST.signer)) + facts3, ...toNext() }
    : missing ? { facts: head('De Graaf: 1 line still on its way', 'Steel frames arrive 2 Dec. Week 50 still fits. <a class="link" href="#/purchasing" style="margin:0">Purchase I2611-002-2</a>') + facts3,
      decide: `<p class="alt">Shipping now means a second trip on 2 Dec.</p><button class="btn2" data-do="noop">Ship what is in anyway</button>`,
      label: 'Waiting for 1 line (2 Dec)', enabled: false, hint: '' }
    : { facts: head('De Graaf: everything is in', 'Order V2611-002, week 50') + facts3,
      decide: `<div class="ask">Who signed the delivery note?<label class="field">Name<input id="signer" value="${esc(ST.signer)}" autocomplete="off"></label><button class="btn2" data-do="noop">Add photo of the signed note</button></div>`,
      label: 'Confirm delivery', enabled: !!ST.signer.trim(), hint: 'Dated today. The final invoice (70 %) gets ready.', focus: '#anchor',
      run: () => { ST.delivered = true; toast('Delivery confirmed, final invoice is ready', () => { ST.delivered = false; }); } };
  return { work: `${back}<h1>De Graaf: Offices delivery</h1><p class="sub">Delivery note L2611-002, order V2611-002, Stationsplein 4, Utrecht, week 50</p>${stepper(stepI, { 2: '#/quote/O2611-002' })}
    <div class="rows">${flat(q).map(l => `<div class="row${/arrives/.test(st(l)) ? ' warn' : ''}" style="cursor:default"><span>${esc(l.desc)}, ${l.qty} ${l.unit}</span><span class="meta">${esc(st(l))}</span></div>`).join('')}</div>
    <p class="state">Wireframe state: ${ST.allIn ? '<a href="#" data-do="allin" data-v="0">back to today (23 Nov)</a>' : '<a href="#" data-do="allin" data-v="1">show 2 Dec, when everything is in</a>'}</p>`, rail };
};
V.invoices = () => {
  const rows = D.invoices.map(i => ({ ...i, overdue: i.status === 'Sent' && i.due < '2026-11-23' }));
  const toInv = ST.delivered && !ST.finalSent ? ['fin'] : [];
  const ids = [...rows.filter(r => r.overdue).map(r => r.id), ...toInv, ...rows.filter(r => !r.overdue && r.status !== 'Paid').map(r => r.id)];
  const sel = pick('invoices', ids), cust = i => custOfOrder(i.order).customer.replace(' Interieurbouw', '');
  const paid = rows.filter(r => r.status === 'Paid');
  return { work: `<h1>Invoices</h1><p class="sub">Copies go to the accountant</p>
    <div class="lab">Needs you <span class="count">${rows.filter(r => r.overdue).length}</span></div><div class="rows">${rows.filter(r => r.overdue).map(i => row('invoices', i.id, `${cust(i)} | ${i.kind.toLowerCase()} invoice, reminder ${ST.rem[i.id] || i.reminders} sent | ${i.id}`, 'Overdue', eur(invTotal(i)), true)).join('')}</div>
    <div class="lab">To invoice <span class="count">${toInv.length}</span></div><div class="rows">${toInv.length ? row('invoices', 'fin', 'De Graaf | final invoice 70 %, delivered | F2611-002-2', 'To invoice', eur(finalAmount())) : `<p class="empty">${ST.finalSent ? 'De Graaf final invoice sent today.' : 'Nothing delivered yet. De Graaf comes after delivery in week 50.'}</p>`}</div>
    <div class="lab">Open</div><div class="rows">${rows.filter(r => !r.overdue && r.status !== 'Paid').map(i => row('invoices', i.id, `${cust(i)} | ${i.kind.toLowerCase()} ${i.pct ? i.pct + ' %' : ''} | due ${day(i.due)} | ${i.id}`, '', eur(invTotal(i)))).join('')}</div>
    <p class="state">${paid.length} paid this month, ${paid.map(i => cust(i) + ' ' + eur(invTotal(i))).join(', ')}</p>`,
    rail: sel === 'F2610-004' ? railFor('F2610-004') : sel === 'fin' ? railFor('fin') : { facts: head(esc(cust(D.invoices.find(i => i.id === sel))) + ': ' + sel, 'Nothing to do. The agent sends reminders on its own and copies the accountant.'), label: 'Nothing to do', enabled: false }, list: 'invoices' };
};
V.relations = () => {
  const f = ST.relFilter, qq = ST.relQ.toLowerCase();
  const list = D.relations.filter(r => (f === 'All' || r.kind + 's' === f) && (!qq || [r.name, r.contact, r.city, r.email].join(' ').toLowerCase().includes(qq)));
  const sel = list.length ? pick('relations', list.map(r => r.name)) : null, r = D.relations.find(x => x.name === sel);
  const work = `<h1>Customers and suppliers</h1><p class="sub">${D.relations.filter(r => r.kind === 'Customer').length} customers, ${D.relations.filter(r => r.kind === 'Supplier').length} suppliers</p>
    <div class="tools"><input class="search" id="relq" style="flex:1;width:auto" placeholder="Search a name, city or e-mail" aria-label="Search relations" value="${esc(ST.relQ)}" autocomplete="off">${seg('relfilter', [['All', 'All'], ['Customers', 'Customers'], ['Suppliers', 'Suppliers']], f)}</div>
    <div class="rows" style="margin-top:12px">${list.map(x => row('relations', x.name, `${x.name} | ${x.contact} | ${x.city}`, '', f === 'All' ? x.kind : '')).join('') || '<p class="empty">No match. Try a city or part of a name.</p>'}</div>`;
  if (!r) return { work, rail: { facts: '<p class="empty">Nothing selected.</p>', label: 'Nothing to do', enabled: false }, list: 'relations' };
  const jobs = D.projects.filter(p => p.customer === r.name);
  const over = D.invoices.filter(i => isOverdue(i) && custOfOrder(i.order).customer === r.name);
  const openQ = Object.values(Q).filter(q => q.client.company === r.name && q.status === 'To verify');
  return { work,
    rail: { facts: head(esc(r.name), `${esc(r.kind)}, ${esc(r.contact)}, ${esc(r.email)}${r.phone ? ', ' + esc(r.phone) : ''}`)
      + over.map(i => kv('Overdue, ' + i.id, eur(invTotal(i)), Math.round((Date.parse('2026-11-23') - Date.parse(i.due)) / 864e5) + ' days late')).join('')
      + openQ.map(q => kv('Open quote, ' + q.id, eur(total(q)))).join('')
      + (jobs.length ? kv('Jobs', jobs.map(j => esc(j.name)).join(', '), jobs.map(j => j.id).join(', ')) : ''),
      label: r.kind === 'Customer' ? 'New request' : 'New purchase', enabled: true,
      hint: r.kind === 'Customer' ? `Contact: ${r.contact}${over.length ? ', the overdue stays visible' : ''}` : 'To ' + r.email, run: () => toast('Draft started for ' + r.name, () => {}) }, list: 'relations' };
};
V.articles = () => {
  const qq = ST.artQ.toLowerCase(), list = D.articles.filter(x => !qq || [x.code, x.name, x.supplier, x.source, x.group].join(' ').toLowerCase().includes(qq));
  const sel = list.length ? pick('articles', list.map(a => a.code)) : null, a = D.articles.find(x => x.code === sel);
  const work = `<div class="titlebar"><h1>Articles</h1><button class="btn2" data-do="noop">+ Add article</button></div><p class="sub">${D.articles.length} articles, prices used in every calculation</p>
    <input class="search" id="artq" style="width:100%;margin-bottom:12px" placeholder="Search code, article or supplier" aria-label="Search articles" value="${esc(ST.artQ)}" autocomplete="off">
    <table class="arts"><thead><tr><th>Code</th><th>Article</th><th>Unit</th><th class="num">Cost</th><th class="num">Margin</th><th>Source</th><th>Price date</th></tr></thead><tbody>
    ${list.map(x => `<tr data-sel="articles" data-id="${x.code}" style="cursor:pointer;${x.code === sel ? 'background:var(--soft);box-shadow:inset 4px 0 0 var(--dark);font-weight:600' : ''}"><td>${x.code}</td><td>${esc(x.name)}</td><td>${x.unit}</td><td class="num">${eur(x.cost)}</td><td class="num">${x.margin} %</td><td>${esc(x.supplier || x.source)}</td><td>${x.added ? esc(x.added.split(', ')[0]) : '<small title="not recorded yet">–</small>'}</td></tr>`).join('') || '<tr><td colspan="7" class="empty">No match. Try the supplier or a code like SW.</td></tr>'}</tbody></table>`;
  if (!a) return { work, rail: { facts: '<p class="empty">Nothing selected.</p>', label: 'Nothing to do', enabled: false }, list: 'articles' };
  return { work,
    rail: { facts: head(esc(a.name), `${a.code}, ${esc(a.supplier || a.source)}`) + kv('Price date', a.added ? esc(a.added) : 'not recorded yet', '', !a.added),
      decide: `<label class="field">Cost per ${a.unit}<input id="artcost" value="${a.cost.toFixed(2)}" inputmode="decimal"></label><label class="field">Margin %<input id="artmargin" value="${a.margin}" inputmode="decimal"></label>`,
      label: 'Save price', enabled: true, hint: 'New calculations only. Open ones keep their price.',
      run: () => { const old = [a.cost, a.margin, a.added]; a.cost = parseFloat($('#artcost').value) || a.cost; a.margin = parseFloat($('#artmargin').value) || a.margin; a.added = '23 Nov, by Arjan'; toast('Price saved for ' + a.code, () => { [a.cost, a.margin, a.added] = old; }); } }, list: 'articles' };
};
const ACT = {
  'Drafted 2 questions to Bouwbedrijf Hoekstra': { go: () => { ST.sel.inbox = 'd2'; go('#/inbox'); }, rec: 'the mail', what: 'Made project P2611-011. Drafted 2 questions: ceiling height, glass type.' },
  'Chased Glas Centrum Nederland about I2611-001-1': { go: () => { ST.sel.purchasing = 'I2611-001-1'; go('#/purchasing'); }, rec: 'purchase I2611-001-1', what: 'Asked planning@glascentrum.nl for the delivery date. Answer: 2 Dec.' },
  'Made revision R2 of C2611-009 after a customer mail': { go: () => go('#/quote/O2611-009'), rec: 'quote O2611-009', what: 'Doors, frames and hinge sets 8 → 9, after Paul\'s mail of 19 Nov.' },
  'Sent reminder 1 for F2610-004 to Wallsz': { go: () => { ST.sel.invoices = 'F2610-004'; go('#/invoices'); }, rec: 'invoice F2610-004', what: 'Herinnering 1 to paul.terlouw@wallsz.nl, 10 days after the due date.' },
  'Matched purchase invoice of Deurenfabriek Oost to I2611-002-1': { go: () => { ST.sel.purchasing = 'I2611-002-1'; go('#/purchasing'); }, rec: 'purchase I2611-002-1', what: '4 doors and 4 hinge sets: invoice matches the order and the goods received on 14 Nov.' },
};
V.activity = () => {
  const ids = [...ST.mine.map((x, i) => 'm' + i), ...ST.activity.map((a, i) => 'a' + i)], sel = pick('activity', ids);
  const work = `<h1>Activity</h1><p class="sub">What you and the agent did, newest first</p>
    <div class="lab">You, today <span class="count">${ST.mine.length}</span></div><div class="rows">${ST.mine.map((x, i) => row('activity', 'm' + i, x.text, x.undone ? 'undone' : '', x.at)).join('') || '<p class="empty">Nothing sent yet today.</p>'}</div>
    <div class="lab">Agent, this week <span class="count">${ST.activity.length}</span></div><div class="rows">${ST.activity.map((x, i) => row('activity', 'a' + i, x[0], '', x[1])).join('')}</div>`;
  if (sel && sel[0] === 'm') { const x = ST.mine[+sel.slice(1)];
    return { work, rail: { facts: head(esc(x.text), 'You, today ' + x.at + (x.undone ? ', undone' : '')),
      decide: x.undone ? '' : `<button class="btn2" data-do="undomine" data-v="${sel.slice(1)}">Undo this</button>`, ...toNext() }, list: 'activity' }; }
  const a = sel && ST.activity[+sel.slice(1)], m = a && ACT[a[0]];
  return { work,
    rail: a ? { facts: head(esc(a[0]), esc(a[1])) + `<p class="plain">${esc(m ? m.what : '')}</p>`,
      decide: `<button class="btn2" data-do="undoact">Undo this action</button>`,
      label: 'Open the record', enabled: !!m, hint: m ? 'Opens ' + m.rec : '',
      run: () => m.go() } : { facts: '<p class="empty">No actions.</p>', label: 'Nothing to open', enabled: false }, list: 'activity' };
};
V.settings = () => {
  const sel = pick('settings', Object.keys(ST.power)), locked = sel === 'Quotes';
  return { work: `<h1>Settings</h1><p class="sub">Agent power, mail, users</p><div class="lab">What the agent may do</div><div class="rows">${Object.entries(ST.power).map(([k, v]) => row('settings', k, k, k === 'Quotes' ? 'set by owner' : '', v)).join('')}</div>
    <div class="lab">Mail</div><div class="rows"><div class="row" style="cursor:default"><span>Gmail, arjan@uniframe.nl</span><span class="meta">connected</span><button class="btn2 inline" data-do="noop">Reconnect</button></div></div>
    <div class="lab">Users</div><div class="rows"><div class="row" style="cursor:default"><span>Joost</span><span class="meta">owner, can change agent power</span></div><div class="row" style="cursor:default"><span>Arjan Laninga</span><span class="meta">sales, quotes and orders</span></div></div>`,
    rail: locked ? { facts: head('Quotes: always ask', 'Every quote waits for Joost or Arjan to approve it. The agent drafts, never sends. Only Joost can change this.'), label: 'Locked by the owner', enabled: false, hint: '' }
    : { facts: head(esc(sel), 'What the agent may do here.'),
      decide: `<label class="field">The agent may<select id="power">${['Ask me first', 'Do it alone, show in log'].map(o => `<option ${ST.power[sel] === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`,
      label: 'Save', enabled: true, hint: ST.power[sel] === 'Ask me first' ? 'Drafts wait for you on Today' : 'Acts alone, logged in Agent activity', run: () => { const old = ST.power[sel]; ST.power[sel] = $('#power').value; toast('Saved', () => { ST.power[sel] = old; }); } }, list: 'settings' };
};

/* ---------- shell ---------- */
const NAVS = [['today', 'Today'], ['inbox', 'Inbox'], ['project', 'Projects'], ['quote', 'Quotes'], ['purchasing', 'Purchasing'], ['planning', 'Planning'], ['invoices', 'Invoices'], ['relations', 'Customers and suppliers'], ['articles', 'Articles'], ['activity', 'Activity'], ['settings', 'Settings']];
const SHORT = { today: 'To', inbox: 'In', project: 'Pr', quote: 'Qu', purchasing: 'Pu', planning: 'Pl', invoices: 'Iv', relations: 'Cu', articles: 'Ar', activity: 'Ag', settings: 'Se' }; /* stand-ins for icons when the menu is narrow */
const SECTION = { request: 'project', calc: 'project', order: 'project', delivery: 'project' };
function side(r, a) {
  const count = { today: open('needs').length, purchasing: ST.done.d3 ? 0 : 1, invoices: (ST.done['F2610-004'] ? 0 : 1) + (ST.delivered && !ST.finalSent ? 1 : 0) };
  const act = r === 'quote' && a ? 'project' : SECTION[r] || r;
  $('#side').innerHTML = `<div class="logo"><span>UNIFRAME</span><button class="sidebtn" data-do="sidemin" data-v="${ST.sideMin ? 0 : 1}" title="${ST.sideMin ? 'Show menu' : 'Hide menu'} ([)" aria-label="${ST.sideMin ? 'Show menu' : 'Hide menu'}">${ST.sideMin ? '»' : '«'}</button></div>`
    + NAVS.map(([k, l]) => `<a class="nav" href="#/${k}" title="${l}" ${k === act ? 'aria-current="page"' : ''}><i>${SHORT[k]}</i><span>${l}</span>${count[k] ? `<b>${count[k]}</b>` : ''}</a>`).join('');
}
let CUR = null;
function go(h) { if (location.hash === h) render(); else location.hash = h; }
function render() {
  const [, r = 'today', a] = location.hash.split('/');
  const view = V[r] || V.today;
  const keepScroll = $('#work') ? $('#work').scrollTop : 0;
  const v = view(a); CUR = v;
  if (ST.toast && Date.now() > ST.toast.until) ST.toast = null;
  const R = v.rail;
  document.querySelector('.app').classList.toggle('side-min', !!ST.sideMin);
  $('#page').classList.toggle('rail-min', !!ST.railMin);
  /* Hidden panel: a thin strip with "Show panel". Enter does nothing then, so nothing is sent unseen. */
  const pending = /class="ask/.test(R.decide || '');
  $('#page').innerHTML = `<section class="work${v.full ? ' full' : ''}" id="work">${v.work}</section>` + (ST.railMin
    ? `<aside class="rail strip" aria-label="Decision, hidden"><button class="railbtn" data-do="railmin" data-v="0" title="Show panel (])" aria-label="Show panel">‹</button><span class="striplabel">Panel${pending ? ', 1 to do' : ''}</span></aside>`
    : `<aside class="rail" aria-label="Decision"><button class="railbtn" data-do="railmin" data-v="1" title="Hide panel (])" aria-label="Hide panel">›</button><div class="facts">${R.facts || ''}</div>${R.decide ? `<div class="decide">${R.decide}</div>` : ''}
    ${ST.toast ? `<div class="toast" role="status"><span>${esc(ST.toast.text)}</span>${ST.toast.undo ? '<button data-do="undo">Undo</button>' : ''}</div>` : ''}
    <div class="hint">${esc(R.hint || '')}</div><button class="anchor" id="anchor" ${!R.enabled ? 'disabled' : ''}>${esc(R.label || 'Nothing to do')}${R.enabled ? '<kbd>⏎</kbd>' : ''}</button></aside>`);
  if (r === (location.hash.split('/')[1] || 'today')) $('#work').scrollTop = keepScroll;
  side(r, a);
  document.querySelectorAll('.rail textarea').forEach(t => { t.style.height = 'auto'; t.style.height = (t.scrollHeight + 2) + 'px'; });
  document.querySelectorAll('#page h1, .rail h2, .rail .sub, #anchor').forEach(e => { e.title = e.innerText.replace('⏎', '').trim(); });
  document.title = (v.work.match(/<h1>(.*?)<\/h1>/) || [, 'Uniframe'])[1].replace(/<[^>]+>/g, '') + ' (hi-fi wireframe)';
  const f = v.focus || R.focus, el = f && $(f);
  if (el && document.activeElement !== el) { el.focus({ preventScroll: true }); if (el.tagName === 'INPUT') el.setSelectionRange(el.value.length, el.value.length); }
}
let lastAnchorClick = 0;
function runAnchor(viaMouse) {
  if (!CUR || ST.railMin) return;
  if (viaMouse) { const now = Date.now(); if (now - lastAnchorClick < 400) return; lastAnchorClick = now; }
  const R = CUR.rail; if (!R.enabled || !R.run) return;
  R.run(); render();
}
function liveUpdate() {
  const [, r = 'today', a] = location.hash.split('/'); const v = (V[r] || V.today)(a); CUR = v;
  const b = $('#anchor'); if (!b) return; b.disabled = !v.rail.enabled; b.innerHTML = esc(v.rail.label) + (v.rail.enabled ? '<kbd>⏎</kbd>' : '');
  $('.hint').textContent = v.rail.hint || '';
  if (r === 'calc') { const w = $('#work'), top = w.scrollTop; w.innerHTML = v.work; w.scrollTop = top;
    $('.facts').innerHTML = v.rail.facts; }
}
/* search boxes re-render the page, then keep typing where you were */
function reSearch(id) { render(); const el = $('#' + id); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
document.addEventListener('click', e => {
  const s = e.target.closest('[data-sel]'); if (s) { ST.sel[s.dataset.sel] = s.dataset.id; ST.toast = null; render(); return; }
  const g = e.target.closest('[data-go]'); if (g) { go(g.dataset.go); return; }
  const d = e.target.closest('[data-do]'); if (d) { e.preventDefault(); const v = d.dataset.v;
    if (d.dataset.do === 'railmin') { ST.railMin = v === '1'; render(); }
    if (d.dataset.do === 'sidemin') { ST.sideMin = v === '1'; render(); }
    if (d.dataset.do === 'moretoday') { ST.moreToday = true; render(); }
    if (d.dataset.do === 'showdecided') { ST.showDecided = !ST.showDecided; render(); }
    if (d.dataset.do === 'undomine') { const x = ST.mine[+v]; if (x && !x.undone) { x.undo(); x.undone = true; toast('Undone: ' + x.text, null); } render(); }
    if (d.dataset.do === 'original') { ST.showOriginal = !ST.showOriginal; render(); }
    if (d.dataset.do === 'doors') { ST.doors = +v; render(); }
    if (d.dataset.do === 'transport') { ST.transport = +v; const tr = flat(Q['O2611-009']).find(l => l.hint); tr.cost = ST.transport / (1 + tr.margin / 100); render(); }
    if (d.dataset.do === 'addr') { if (v === 'kanaal') { ST.addrOther = false; ST.addr = 'Kanaalweg 9, Utrecht'; } else { ST.addrOther = true; ST.addr = ''; } render(); }
    if (d.dataset.do === 'week') { const o = ST.order || orderHoekstra(); ST.week[o.id] = +v; render(); }
    if (d.dataset.do === 'relfilter') { ST.relFilter = v; render(); }
    if (d.dataset.do === 'allin') { ST.allIn = v === '1'; if (!ST.allIn) ST.delivered = false; render(); }
    if (d.dataset.do === 'answer') { ST.sel.today = 'd4'; go('#/today'); }
    if (d.dataset.do === 'back') history.back();
    if (d.dataset.do === 'undoact') { const i = +ST.sel.activity.slice(1), it = ST.activity.splice(i, 1)[0]; toast('Undone: ' + it[0], () => ST.activity.splice(i, 0, it)); render(); }
    if (d.dataset.do === 'noop') { toast('Wireframe: this opens a form', null); render(); }
    if (d.dataset.do === 'undo' && ST.toast) { ST.toast.undo(); ST.toast = null; render(); }
    return; }
  if (e.target.closest('#anchor')) runAnchor(true);
});
document.addEventListener('input', e => {
  const id = e.target.id;
  if (id === 'folie') { ST.folie = e.target.value; liveUpdate(); }
  if (id === 'addr') { ST.addr = e.target.value; liveUpdate(); }
  if (id === 'signer') { ST.signer = e.target.value; liveUpdate(); }
  if (id === 'artq') { ST.artQ = e.target.value; reSearch('artq'); }
  if (id === 'relq') { ST.relQ = e.target.value; reSearch('relq'); }
  if (id === 'projq') { ST.projQ = e.target.value; reSearch('projq'); }
});
document.addEventListener('change', e => { if (e.target.id === 'saveart') { ST.saveArt = e.target.checked; render(); } if (e.target.id === 'power') render(); });
document.addEventListener('keydown', e => {
  const t = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName || '');
  if (!t.closest) return;
  if (e.key === 'Enter' && !e.repeat && !e.shiftKey && t.tagName !== 'TEXTAREA' && !t.closest('[data-do]') && t.id !== 'anchor') { if (!typing || ['folie', 'artcost', 'artmargin', 'addr', 'signer'].includes(t.id)) { e.preventDefault(); if (t.id === 'addr') render(); runAnchor(); } }
  if (e.key === 'Enter' && t.id === 'gsearch') { ST.projQ = t.value; t.value = ''; t.blur(); go('#/project'); return; }
  if (!typing && e.key === '/') { e.preventDefault(); $('#gsearch').focus(); return; }
  if (!typing && e.key === '[') { ST.sideMin = !ST.sideMin; render(); }
  if (!typing && e.key === ']') { ST.railMin = !ST.railMin; render(); }
  if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && t.closest('.seg')) { const bs = [...t.closest('.seg').querySelectorAll('button')]; bs[(bs.indexOf(t) + (e.key === 'ArrowRight' ? 1 : bs.length - 1)) % bs.length].focus(); e.preventDefault(); }
  if (!typing && (e.key === 'ArrowDown' || e.key === 'ArrowUp') && CUR && CUR.list) {
    const ids = [...document.querySelectorAll(`[data-sel="${CUR.list}"]`)].map(x => x.dataset.id); const i = ids.indexOf(ST.sel[CUR.list]);
    ST.sel[CUR.list] = ids[Math.max(0, Math.min(ids.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))]; e.preventDefault(); render(); }
});
addEventListener('hashchange', () => { if (ST.toast && Date.now() - (ST.toast.until - 10000) > 500) ST.toast = null; render(); });
render();
})();
