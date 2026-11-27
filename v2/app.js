/* Uniframe portal v2 (brand applied, 27 Nov). Example data from the portal repo (data.js) plus a demo mailbox.
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
const URGENT = ['Overdue', 'Supplier late', 'Needs a person', 'Late', 'Conflict', 'At risk', 'No reply 14 d+'];
const BAD = ['Overdue', 'Conflict'];
const KEEP = ['set by owner', 'undone', 'To invoice', 'New'];

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
  powerPick: {}, ce: {}, req: {}, planWeek: { pl2: 52, pl3: 11 }, delWin: '', pc: {}, q: {}, sort: {}, warnOnly: {}, pop: null, modal: null, box: 'inbox', sent: [], fresh: [], read: {}, phone: {}, catOf: {}, projCat: 'All', openWeek: null, showClosed: false, photo: '',
  power: { Quotes: 'Always ask', 'Customer replies': 'Ask me first', 'Supplier chases': 'Do it alone, show in log', 'Payment reminders': 'Do it alone, show in log' } };

const Q = D.quotes;
const invTotal = inv => { const o = D.orders.find(o => o.id === inv.order); const q = Q[o.quote]; const t = total(q) * 1.21; return inv.pct ? t * inv.pct / 100 : t; };
const custOfOrder = id => { const o = D.orders.find(o => o.id === id); return D.projects.find(p => p.id === o.project); };
const isOverdue = i => i.status === 'Sent' && i.due < '2026-11-23' && !ST.done[i.id];
const relOf = name => D.relations.find(r => r.name === name) || {};
const finalAmount = () => total(Q['O2611-002']) * 1.21 * 0.7;   /* order V2611-002: 30 % at order, 70 % on delivery */

function calcBase() {
  const n = ST.doors || 4, f = parseFloat(String(ST.folie).replace(',', '.'));
  return { id: 'C2611-013', chapters: [
    { title: 'Systeemwanden', lines: [A('wall', 12)] },
    { title: 'Deuren', lines: [A('door', n), A('hw', n)] },
    { title: 'Folie', lines: [{ desc: 'Matte folie, band op ooghoogte', qty: 12, unit: 'm1', cost: isNaN(f) ? 0 : f, margin: 20, supplier: 'Own team', missing: isNaN(f) || f <= 0 }] },
    { title: 'Montage en transport', lines: [A('install', Math.round(12 * 1.2 + n * 2)), A('transport', 1)] }] };
}
function calcDeGraaf() { const c = calcBase(); c.chapters.forEach((ch, ci) => ch.lines.forEach((l, li) => { const o = ST.ce[ci + '.' + li]; if (o) Object.assign(l, o); })); return c; }
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
      + (here ? '' : kv('Total excl. VAT', `<span data-live="qt">${eur(total(q))}</span>`)) + kv('Margin', marginOf(q).toFixed(1) + ' %') + kv('Changed', '8 → 9 doors', 'Paul, 19 Nov')
      + (here ? '' : '<a class="link" href="#/quote/O2611-009">Open the quote</a>'),
    decide: `${addrOk && !ST.addrOther ? '' : `<div class="ask${n > 1 ? ' compact' : ''}">Address says "Onbekend". Wallsz's last job used Kanaalweg 9, Utrecht.
        ${seg('addr', [['kanaal', 'Use Kanaalweg 9'], ['other', 'Type another']], ST.addrOther ? 'other' : '')}
        ${ST.addrOther ? `<label class="field">Address<input id="addr" value="${esc(ST.addr || '')}" autocomplete="off" placeholder="Street, city"></label>` : ''}</div>`}
      ${t === undefined ? `<div class="ask${n > 1 ? ' compact' : ''}">Transport has no price. Wallsz's last job paid €&nbsp;450.
      ${seg('transport', [['450', 'Use € 450'], ['0', 'Keep € 0']], t)}</div>` : ''}`,
    label: !addrOk ? 'Add the address first' : t === undefined ? 'Price transport first' : 'Approve and send R2', enabled: addrOk && t !== undefined,
    hint: addrOk && t !== undefined ? 'Mails R2 to paul.terlouw@wallsz.nl. Undo for 10 s.' : '',
    focus: !addrOk ? (ST.addrOther ? '#addr' : '[data-do=addr]') : t === undefined ? '[data-do=transport]' : '#anchor',
    run: () => { ST.done.q010 = true; q.status = 'Sent'; sendMail('paul.terlouw@wallsz.nl', 'Offerte O2611-009 R2, Politie KPLD', 'Beste Paul,\n\nHierbij de aangepaste offerte met 9 deuren.\n\nMet vriendelijke groet,\nArjan Laninga', ['Offerte O2611-009 R2.pdf']); toast('Quote O2611-009 R2 sent to Paul Terlouw', () => { delete ST.done.q010; q.status = 'To verify'; }); } }; }
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
    run: () => { ST.done.d3 = true; ST.week['V2611-001'] = 51; sendMail('ruben@bentacera.nl', 'Levering behandelkamers Zeist: week 51', ($('#draft') || {}).value || ''); toast('Update sent to Ruben, order now week 51', () => { delete ST.done.d3; ST.week['V2611-001'] = 50; }); } };
  if (id === 'd4') return { facts: head('De Graaf: complaint', 'Scratch on the door of room 3, order V2611-002, the agent stopped: complaints need you')
      + thumb('foto-deur-kamer3.jpg', 'Door, room 3') + (here ? '' : '<a class="link" href="#/project/P2611-002">Open the project</a>'),
    decide: `<label class="field">Reply to Marloes<textarea id="draft">Hoi Marloes,

Vervelend, dank voor de foto. We komen volgende week een nieuw deurblad plaatsen; ik bel je morgen voor een moment.

Groet,
Arjan</textarea></label>`,
    label: 'Send reply', enabled: true, hint: 'To marloes@degraaf-interieur.nl',
    run: () => { ST.done.d4 = true; sendMail('marloes@degraaf-interieur.nl', 'RE: Klacht: kras op deurblad', ($('#draft') || {}).value || ''); toast('Reply sent to Marloes de Graaf', () => { delete ST.done.d4; }); } };
  if (id === 'd8') { const q8 = Q['O2611-007'], up = 2 * sale(art('door')) + 2 * sale(art('hw')) + 4 * sale(art('install'));
    return { facts: head('Hoekstra: accepts the quote', 'Sports hall, quote O2611-007, asks for 2 extra doors')
      + kv('Quote excl. VAT', eur(total(q8)), '+ ' + eur(up) + ' for the doors') + kv('Doors and hinge sets', '8 → 10') + kv('Montage', '60 → 64 h')
      + '<a class="link" href="#/quote/O2611-007">Open the quote</a>',
      label: 'Make order with 10 doors', enabled: true, hint: 'Opens order V2611-007. You pick the week there.',
      run: () => { ST.order = orderHoekstra(); go('#/order/V2611-007'); } }; }
  if (id === 'F2610-004') { const inv = D.invoices.find(i => i.id === id), r = relOf('Wallsz');
    return { facts: head('Wallsz: overdue', 'Final invoice F2610-004, Offices, Kanaalweg 9')
      + kv('Amount incl. VAT', eur(invTotal(inv))) + kv('Was due', '10 Nov', '13 days ago') + kv('Reminders', ST.rem[id] > 1 ? '2 sent' : '1 sent', ST.rem[id] > 1 ? 'by you, today' : '2nd by the agent on 27 Nov'),
      decide: `<p class="alt">Or call ${esc(r.contact)}, ${ST.phone[r.name] || r.phone ? esc(ST.phone[r.name] || r.phone) : 'no phone number on file'}${ST.phone[r.name] || r.phone ? '' : '<button class="btn2 inline" data-do="modal" data-v="phone">Add phone</button>'}</p>`,
      label: ST.rem[id] > 1 ? 'Reminder 2 sent' : 'Send reminder 2 now', enabled: ST.rem[id] < 2, hint: ST.rem[id] > 1 ? '' : 'Herinnering 2 to ' + r.email,
      run: () => { ST.rem[id] = 2; ST.done[id] = true; sendMail(r.email, 'Herinnering 2: factuur F2610-004', 'Beste Paul,\n\nFactuur F2610-004 staat nog open. Wilt u deze binnen 7 dagen betalen?\n\nMet vriendelijke groet,\nArjan Laninga', ['F2610-004.pdf']); toast('Reminder 2 sent to Paul Terlouw', () => { ST.rem[id] = 1; delete ST.done[id]; }); } }; }
  if (id === 'I2611-002-2') { const p = D.purchases.find(x => x.id === id);
    return { facts: head('Metaalwerk Veenendaal: on its way', 'Purchase I2611-002-2, for De Graaf, order V2611-002')
      + p.lines.map(l => kv(esc(l.desc), l.qty + ' ' + l.unit)).join('') + kv('Arrives', '2 Dec'),
      label: ST.allIn ? 'Received 2 Dec' : 'Mark as received', enabled: !ST.allIn, hint: ST.allIn ? '' : 'When the frames are in. The delivery check then opens.',
      run: () => { ST.allIn = true; ST.done[id] = true; toast('Frames received, De Graaf can be delivered', () => { ST.allIn = false; delete ST.done[id]; }); } }; }
  if (id === 'fin') { const dep = D.invoices.find(i => i.id === 'F2611-002-1');
    return { facts: head('De Graaf: final invoice F2611-002-2', 'Order V2611-002, delivered, signed by ' + esc(ST.signer || 'Marloes de Graaf'))
      + kv('70 % incl. VAT', eur(finalAmount())) + kv('Deposit 30 %, F2611-002-1', eur(invTotal(dep)), 'due ' + day(dep.due)) + kv('Payment', '70 % on delivery'),
      label: 'Send final invoice', enabled: true, hint: 'To marloes@degraaf-interieur.nl, copy to the accountant',
      run: () => { ST.finalSent = true; sendMail('marloes@degraaf-interieur.nl', 'Factuur F2611-002-2, eindfactuur 70 %', 'Beste Marloes,\n\nIn de bijlage de eindfactuur.\n\nMet vriendelijke groet,\nArjan Laninga', ['F2611-002-2.pdf']); toast('Final invoice sent to Marloes, accountant copied', () => { ST.finalSent = false; }); } }; }
  return { facts: '<p class="empty">Nothing selected.</p>', label: 'Nothing to do', enabled: false };
}

/* ---------- views ---------- */
/* stepper(i, links, notes): done steps with a link are clickable; notes show open items under a step */
const stepper = (i, links = {}, notes = {}) => `<nav class="stepper" aria-label="Job stage">${STEPS.map((s, k) => { const cls = `step ${k < i ? 'done' : k === i ? 'now' : ''}`, n = notes[k] ? `<em>${notes[k]}</em>` : '';
  return links[k] && k < i ? `<a class="${cls} go" href="${links[k]}"><i></i>${s}${n}</a>` : `<div class="${cls}"${k === i ? ' aria-current="step"' : ''}><i></i>${s}${n}</div>`; }).join('')}</nav>`;
const back = `<a class="back" href="#" data-do="back">← Back</a>`;
const tagHtml = t => t && (URGENT.includes(t) || KEEP.includes(t)) ? `<span class="tag${URGENT.includes(t) ? ' urgent' : ''}${BAD.includes(t) ? ' bad' : ''}">${esc(t)}</span>` : '';
const CODE = /^(job )?[A-Z]?\d{4}-\d{3}(-\d)?$/;
/* "Customer | what | number": the layout separates them, not punctuation */
const rowText = (text, tag, noCode) => { const p = String(text).split(' | '); const code = p.length > 1 && CODE.test(p[p.length - 1]) ? p.pop() : ''; const what = p.slice(1).join(', ');
  return [`<span class="two"><span class="nl"><b title="${esc(p[0])}">${esc(p[0])}</b>${tagHtml(tag)}</span>${what ? `<span title="${esc(what)}">${esc(what.charAt(0).toUpperCase() + what.slice(1))}</span>` : ''}</span>`, code && !noCode ? `<span class="code">${esc(code)}</span>` : '']; };
const row = (list, id, text, tag, meta = '', warn = false, cat = '') => { const [main, code] = rowText(text, tag, list === 'today'); return `<div class="row${warn ? ' warn' : ''}" data-sel="${list}" data-id="${id}" data-name="${esc(String(text).split(' | ')[0])}" aria-selected="${ST.sel[list] === id}" role="option" tabindex="-1">${main}${cat ? `<span class="cat">${esc(cat)}</span>` : ''}${code}${meta ? `<span class="meta" title="${esc(meta)}">${esc(meta)}</span>` : ''}</div>`; };
const pick = (list, ids) => { if (!ids.includes(ST.sel[list])) ST.sel[list] = ids[0]; return ST.sel[list]; };
const linesTable = (q, edit) => `<table><thead><tr><th>Nr</th><th>Line</th><th class="num">Quantity</th><th class="num">Cost</th><th class="num">Margin</th><th class="num">Total</th></tr></thead><tbody>
  ${q.chapters.map((c, ci) => c.lines.map((l, li) => `<tr class="${l.missing ? 'missing' : ST.ce[ci + '.' + li] ? 'chg' : ''}"><td>${ci + 1}.${li + 1}</td><td>${esc(l.desc)}${l.missing ? ': no price yet' : ''}${l.note ? ` <span class="tag">${esc(l.note)}</span>` : ''}</td>
    <td class="num">${edit ? ed(`calc|${ci}|${li}|qty`, l.qty) : l.qty} ${l.unit}</td><td class="num">${edit ? ed(`calc|${ci}|${li}|cost`, l.missing ? '' : l.cost.toFixed(2), l.missing ? 'Add price' : eur(l.cost)) : l.missing ? '–' : eur(l.cost)}</td><td class="num">${edit ? ed(`calc|${ci}|${li}|margin`, l.margin, l.margin + ' %') : l.margin + ' %'}</td><td class="num">${l.missing ? '–' : eur(l.qty * sale(l))}</td></tr>`).join('')).join('')}</tbody></table>`;

/* click-to-type: any value with data-edit opens a field in place; Enter saves, Esc cancels, Tab goes to the next */
const ed = (key, val, shown) => `<span class="ed" data-edit="${esc(key)}" data-val="${esc(val)}" tabindex="0" title="Click to change">${shown === undefined ? esc(val) : shown}</span>`;
const V = {};
V.today = () => {
  const needs = open('needs'), due = open('due');
  const sel = pick('today', [...needs, ...due].map(i => i.id));
  return { work: `<h1>Today</h1><p class="sub">Monday 23 Nov</p>
    <a class="agentline" href="#/activity">The agent did ${ST.activity.length + 7} things since Friday. See all ${ST.activity.length + 7}</a>
    ${tools('today')}<div class="lab">Needs you <span class="count">${needs.length}</span></div><div class="rows" role="listbox">${(ST.moreToday ? needs : needs.slice(0, 5)).map(i => row('today', i.id, i.text, i.tag, waiting(i), URGENT.includes(i.tag))).join('') || '<p class="empty">Nothing needs you. The agent handles the routine.</p>'}${needs.length > 5 && !ST.moreToday ? `<a href="#" class="row" data-do="moretoday"><span>Show ${needs.length - 5} more</span></a>` : ''}</div>
    <div class="lab">Due today <span class="count">${due.length}</span></div><div class="rows" role="listbox">${due.map(i => row('today', i.id, i.text, i.tag, '', URGENT.includes(i.tag))).join('') || '<p class="empty">Nothing due.</p>'}</div>`,
    rail: railFor(sel), list: 'today' };
};
const mailRow = (id, sel) => { const m = MAILS[id]; return `<div class="row two${ST.fresh.includes(id) && !ST.read[id] ? ' unread' : ''}" data-sel="inbox" data-id="${id}" data-name="${esc(m.from)}" aria-selected="${sel === id}" role="option" tabindex="-1"><span class="three"><b>${esc(m.from.split(', ')[0])}</b><span>${esc(m.agent)}</span><small>${esc(m.subject)}</small></span><span class="meta">${m.date}</span></div>`; };
const sentRow = (x, i, sel) => `<div class="row two" data-sel="sent" data-id="s${i}" data-name="${esc(x.to)}" aria-selected="${sel === 's' + i}" role="option" tabindex="-1"><span class="three"><b>To ${esc(x.to)}</b><span>${esc(x.subject)}</span>${x.files ? `<small>${esc(x.files.join(', '))}</small>` : ''}</span><span class="meta">${x.at}</span></div>`;
V.inbox = () => {
  if (ST.box === 'sent') return sentBox();
  const needMails = [...ST.fresh.filter(id => !ST.done[id]), ...ITEMS.filter(i => i.mail && !ST.done[i.id]).sort((a, b) => a.since - b.since).map(i => i.mail)];
  const handled = [...ST.fresh.filter(id => ST.done[id]), 'd2', 'd6', ...ITEMS.filter(i => i.mail && ST.done[i.id]).map(i => i.mail)];
  const sel = pick('inbox', [...needMails, ...handled]), m = MAILS[sel], item = ITEMS.find(i => i.mail === sel); ST.read[sel] = true;
  /* No box around the list: list and mail are two full-height columns split by one line */
  return { full: true, work: `<div class="titlebar"><h1>Inbox</h1><button class="btn2" data-do="modal" data-v="compose">${ic('plus')}New mail</button></div>${boxTabs()}${tools('inbox')}<div class="mailsplit"><div class="maillist">
    <div class="lab">Needs you <span class="count">${needMails.length}</span></div><div class="rows">${needMails.map(id => mailRow(id, sel)).join('')}</div>
    <div class="lab">Handled by the agent <span class="count">${handled.length}</span></div><div class="rows">${handled.map(id => mailRow(id, sel)).join('')}</div></div>
    <article class="mail mailread"><h2>${esc(m.subject)}</h2><p class="sub">${esc(m.from)}, ${m.date}</p><pre>${esc(m.body)}</pre>${(m.files || []).map(f => `<span class="chip">${ic('attach')}${esc(f)}</span>`).join('')}</article></div>`,
    rail: ST.fresh.includes(sel) && !ST.done[sel] ? freshRail(sel) : item && !ST.done[item.id] ? railFor(item.id) : { facts: head(ST.done[sel] && ST.fresh.includes(sel) ? 'Answered' : 'Handled by the agent', esc(m.handled || 'Done.')), ...toNext() }, list: 'inbox' };
};
V.request = () => ({ work: `${back}<h1>De Graaf: Kantoorverdieping Utrecht</h1><p class="sub">Request P2611-013, from mail 23 Nov</p>${stepper(0)}
  <div class="split" style="grid-template-columns:1fr 1fr;gap:32px"><article class="mail"><h2>What they ask</h2>
    <p>Daan forwards a request from Marloes de Graaf: a 12 m glass wall, 3.0 m high, single glass 10 mm, with matte folie at eye level. Delivery in March. The mail says 4 doors; the door schedule shows 5.</p>
    <span class="chip">plattegrond.pdf</span><span class="chip">deurstaat.pdf</span>
    <p style="margin:8px 0 0"><a href="#" class="readmore" data-do="original">${ST.showOriginal ? 'Hide original mail' : 'Read original mail'}</a></p>
    ${ST.showOriginal ? `<pre class="original">${esc(MAILS.d7.body)}</pre>` : ''}</article>
  <div><div class="lab">What the agent read <span class="count">9</span></div><div class="rows">${[['Doors', ST.doors ? ST.doors + ', you chose' : '4 or 5?', ST.doors ? '' : 'Conflict'], ['Category', catOf('P2611-013'), 'cat'], ...[['Customer', 'De Graaf Interieurbouw'], ['Contact', 'Marloes de Graaf'], ['Site', 'Stationsplein 4, Utrecht'], ['Wall', '12 m, h 3000 mm'], ['Glass', 'Enkel glas, 10 mm'], ['Folie', 'Matte, eye level'], ['Wanted', 'March, week 11']].map(([f, d]) => [f, ST.req[f] ?? d])]
    .map(([f, v, s]) => `<div class="row kvrow${s === 'Conflict' ? ' warn' : ''}" style="cursor:default"><span class="k">${f}</span><span class="nl"><b>${s === 'cat' ? esc(v) : f === 'Doors' ? ed('req|Doors', ST.doors || '', esc(v)) : ed('req|' + f, v)}</b>${s === 'Conflict' ? tagHtml(s) : ''}</span>${s === 'cat' ? '<a href="#" class="readmore" data-do="modal" data-v="category" data-id="P2611-013">Set by the agent. Change</a>' : ''}</div>`).join('')}</div></div></div>`, rail: railFor('d7', true) });

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
  const all = D.projects.filter(hit).filter(p => ST.projCat === 'All' || catOf(p.id) === ST.projCat).map(p => ({ p, s: jobState(p) }));
  const openJobs = all.filter(x => x.s.open), closed = all.filter(x => !x.s.open);
  const sel = all.length ? pick('projects', all.map(x => x.p.id)) : null, cur = all.find(x => x.p.id === sel);
  const line = x => row('projects', x.p.id, `${shortName(x.p.customer)}: ${x.p.name} | ${x.s.stage} | ${baseOf(x.p.id)}`, x.s.tag || '', '', URGENT.includes(x.s.tag), catOf(x.p.id));
  const cats = ['All', ...CATS].map(c => [c, c === 'All' ? D.projects.length : D.projects.filter(p => catOf(p.id) === c).length]);
  const work = `<h1>Projects</h1>
    <div class="tabs">${cats.map(([c, n]) => `<button data-do="projcat" data-v="${c}" aria-pressed="${ST.projCat === c}">${c}<span class="count">${n}</span></button>`).join('')}</div>
    ${tools('projects')}
    <div class="lab">Open <span class="count">${openJobs.length}</span></div><div class="rows">${openJobs.map(line).join('') || '<p class="empty">No open job in this category.</p>'}</div>
    ${closed.length ? `<p class="state"><a href="#" data-do="showclosed">Closed ${closed.length}: ${ST.showClosed ? 'hide' : 'show'}</a></p>${ST.showClosed ? `<div class="rows">${closed.map(line).join('')}</div>` : ''}` : ''}`;
  if (!cur) return { work, rail: { facts: '<p class="empty">No match. Try a job number like 2611-002 or a customer name.</p>', label: 'Nothing to open', enabled: false }, list: 'projects' };
  const p = cur.p;
  return { work, rail: { facts: head(`${esc(shortName(p.customer))}: ${esc(p.name)}`, `Job ${baseOf(p.id)}, ${esc(p.site)}`) + kv('Stage', esc(cur.s.stage)) + kv('Category', catOf(p.id), '<a href="#" class="readmore" data-do="modal" data-v="category" data-id="' + p.id + '">Set by the agent. Change</a>') + kv('Contact', ed('pc|' + p.id + '|contact', (ST.pc[p.id] || {}).contact || p.contact), ed('pc|' + p.id + '|email', (ST.pc[p.id] || {}).email || p.email)),
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
  const work = `<h1>Quotes</h1><p class="sub">Open total ${eur([...mine, ...waiting].reduce((s, q) => s + q.total, 0))} excl. VAT</p>
    ${tools('quotes')}<div class="lab">Needs you <span class="count">${mine.length}</span></div><div class="rows">${mine.map(q => row('quotes', q.id, `${q.name}: ${q.desc} | ${q.id === 'O2611-009' ? 'R2 made by the agent, check it before it goes out' : 'Check it before it goes out'} | ${q.id}`, '', eur(q.total))).join('') || '<p class="empty">Nothing to check.</p>'}</div>
    <div class="lab">Waiting for the customer <span class="count">${waiting.length}</span></div><div class="rows">${waiting.map(q => row('quotes', q.id, `${q.name} | ${q.desc} | ${q.id}`, ago(q.sent) > 14 ? 'No reply 14 d+' : '', `sent ${day(q.sent)}, ${ago(q.sent)} d`, ago(q.sent) > 14)).join('') || '<p class="empty">No quotes out.</p>'}</div>
    <p class="state">${decided.filter(q => q.status !== 'Rejected').length} accepted, ${decided.filter(q => q.status === 'Rejected').length} lost, <a href="#" data-do="showdecided">${ST.showDecided ? 'hide' : 'show'}</a></p>
    ${ST.showDecided ? `<div class="rows">${decided.map(q => row('quotes', q.id, `${q.name} | ${q.desc} | ${q.id}`, '', q.status === 'Rejected' ? 'lost' : 'accepted')).join('')}</div>` : ''}`;
  return { work, rail: cur ? { facts: head(`${esc(cur.name)}: ${esc(cur.desc)}`, 'Quote ' + cur.id) + kv('Total excl. VAT', eur(cur.total)) + (cur.id === 'O2611-009' ? kv('Changed', '8 → 9 doors', 'Paul, 19 Nov') : cur.sent ? kv('Sent', day(cur.sent)) : ''),
    label: 'Open the quote', enabled: true, hint: '', run: () => go('#/quote/' + cur.id) } : { facts: '', label: 'Nothing to open', enabled: false }, list: 'quotes' };
}
const money = (c, missing) => { const t = total(c), cost = costOf(c), plus = missing ? ' + folie' : '';
  return kv('Total excl. VAT', eur(t) + plus)
    + kv('Cost', eur(cost) + plus) + kv('Margin', `${eur(t - cost)}, ${(t ? (t - cost) / t * 100 : 0).toFixed(1)} %`, missing ? 'priced lines only' : ''); };
V.calc = () => {
  const c = calcDeGraaf(), missing = flat(c).filter(l => l.missing).length;
  return { work: `${back}<h1>De Graaf: Kantoorverdieping</h1><p class="sub">Calculation C2611-013, R1, ${ST.doors || 4} doors</p>${stepper(1, { 0: '#/request/P2611-013' })}${linesTable(c, true)}`,
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
    ${q.chapters.map(c => `<h3>${esc(c.title)}</h3><table>${c.lines.map(l => `<tr class="${changed(l) || (l.hint && !l.cost) ? 'chg' : ''}"><td>${esc(l.desc)}${changed(l) ? ` <span class="tag">${changed(l)}</span>` : ''}${l.hint && !l.cost ? ' <span class="tag urgent">no price</span>' : ''}</td><td class="num">${!sent ? ed(mine ? `calc|${q.chapters.indexOf(c)}|${c.lines.indexOf(l)}|qty` : `q|${id}|${q.chapters.indexOf(c)}|${c.lines.indexOf(l)}|qty`, l.qty) : l.qty} ${l.unit}</td><td class="num">${eur(l.qty * sale(l))}</td></tr>`).join('')}</table>`).join('')}
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
      run: () => { sendMail(to.replace(/.*<|>/g, ''), 'Offerte ' + q.id + ', ' + q.project_info.desc, ($('.rail textarea') || {}).value || '', ['Offerte ' + q.id + '.pdf']); if (mine) { ST.quoteSent = true; ST.done.d7 = true; } else { q.status = 'Sent'; if (id === 'O2611-009') ST.done.q010 = true; } toast('Quote ' + q.id + ' sent', () => { if (mine) { ST.quoteSent = false; delete ST.done.d7; } else q.status = 'To verify'; }); } }) };
};
V.order = () => {
  const o = ST.order || orderHoekstra(), wk = ST.week[o.id] || 6, placed = ST.pos.some(p => p.order === o.id);
  const sup = {}; flat(o).filter(l => l.supplier !== 'Own team').forEach(l => (sup[l.supplier] = sup[l.supplier] || []).push(l));
  const load = { 5: 85, 6: 55, 7: 40 };
  return { work: `${back}<h1>Hoekstra: ${o.name}</h1><p class="sub">Order ${o.id}, from quote ${o.quote} + 2 doors</p>${stepper(3, { 2: '#/quote/' + o.quote })}
    <table><thead><tr><th>Line</th><th class="num">Quantity</th><th>Supplier</th></tr></thead><tbody>${flat(o).map((l, i) => `<tr class="${l.supplier === 'Own team' ? 'own' : ''}"><td>${esc(l.desc)}${l.note ? ` <span class="tag">${l.note}</span>` : ''}</td><td class="num">${placed ? l.qty : ed(`ord|${i}|qty`, l.qty)} ${l.unit}</td><td>${l.supplier === 'Own team' ? 'Own team, no order' : placed ? esc(l.supplier) : ed(`ord|${i}|supplier`, l.supplier)}</td></tr>`).join('')}</tbody></table>
    <div class="lab">Notes from the customer</div><p style="margin:0">"Start februari" and "graag 2 deuren extra" <small>(phone 28 Oct, mail 23 Nov)</small></p>`,
    rail: placed ? { facts: head('Hoekstra: ordered', 'The agent chases late suppliers and logs it.') + Object.keys(sup).map(s => kv(esc(s), 'sent')).join(''), ...toNext() } : {
      facts: head('Hoekstra: supplier orders', Object.keys(sup).length + ' mails, one per supplier') + Object.entries(sup).map(([s, ls]) => kv(esc(s), ls.map(l => l.qty + ' ' + l.unit).join(', '), D.supplierMail[s])).join(''),
      decide: `<div class="ask">Which week? The customer wants February.${seg('week', [5, 6, 7].map(w => [w, `Week ${w}<small>${load[w]} % full</small>`]), wk)}</div>`,
      label: `Order materials from ${Object.keys(sup).length} suppliers`, enabled: true, hint: `Sent from arjan@uniframe.nl, delivery week ${wk}`,
      run: () => { Object.keys(sup).forEach(s => { ST.pos.push({ order: o.id, supplier: s }); sendMail(D.supplierMail[s] || s, 'Inkooporder ' + o.id + ', levering week ' + wk, 'Goedendag,\n\nIn de bijlage onze inkooporder voor week ' + wk + '.\n\nMet vriendelijke groet,\nArjan Laninga', ['Inkooporder ' + o.id + '.pdf']); }); ST.done.d8 = true; toast(Object.keys(sup).length + ' supplier orders sent', () => { ST.pos = ST.pos.filter(p => p.order !== o.id); delete ST.done.d8; }); } } };
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
    <div class="lab">Documents <span class="count">${docs.length}</span></div><table class="chain"><thead><tr><th>Document</th><th>Number</th><th>Status</th></tr></thead><tbody>${docs.map(([a, n, s, h, d]) => `<tr class="${d === 'open' && /arrives|week 50/.test(s) && !ST.allIn && /Metaalwerk/.test(a) ? 'chg' : ''}"${h ? ` data-go="${h}" style="cursor:pointer"` : ''}><td>${a}</td><td>${n}</td><td>${s}</td></tr>`).join('')}</tbody></table>`,
    rail: { facts: head('De Graaf: Offices', 'Marloes de Graaf, ' + esc(p.email))
      + kv('Next step', ST.finalSent ? 'Wait for payment' : ST.delivered ? 'Final invoice' : 'Delivery check', 'Arjan, week 50') + kv('Open', ST.allIn ? 'nothing missing' : '1 line: steel frames', ST.allIn ? '' : 'arrive 2 Dec'),
      decide: ST.done.d4 ? '' : `<div class="ask">Open issue: complaint about a scratch on the door of room 3. A reply is drafted.<button class="btn2" data-do="answer">Answer the complaint</button></div>`,
      ...(ST.finalSent ? toNext() : { label: ST.delivered ? 'Go to the final invoice' : 'Check delivery', enabled: true, hint: ST.delivered ? '' : 'Opens the delivery checklist', run: () => { if (ST.delivered) { ST.sel.invoices = 'fin'; go('#/invoices'); } else go('#/delivery'); } }) } };
};
V.purchasing = () => {
  const late = ST.done.d3 ? [] : ['I2611-001-1'], rest = ['I2611-002-2', 'I2611-002-1', ...ST.pos.map((p, i) => 'NEW' + i)];
  const sel = pick('purchasing', [...late, ...rest]);
  const lab = id => { if (id.startsWith('NEW')) { const p = ST.pos[+id.slice(3)]; return [`${p.supplier} | for ${p.order}`, 'sent today']; } const p = D.purchases.find(x => x.id === id); const cust = custOfOrder(p.order).customer.replace(' Interieurbouw', ''); return [`${p.supplier} | for ${cust} | ${id}`, ['Draft', 'Sent', 'Confirmed', 'Received', 'Invoice matched', 'Paid'][p.step] + ', ' + (id === 'I2611-001-1' ? 'moved to 2 Dec' : id === 'I2611-002-2' && ST.allIn ? 'received 2 Dec' : day(p.due))]; };
  return { work: `<h1>Purchasing</h1>
    <a class="agentline" href="#/activity">The agent chased Glas Centrum on 21 Nov. See the log</a>
    ${tools('purchasing')}<div class="lab">Needs you <span class="count">${late.length}</span></div><div class="rows">${late.map(id => row('purchasing', id, lab(id)[0], 'Late', lab(id)[1], true)).join('') || '<p class="empty">Nothing late.</p>'}</div>
    <div class="lab">Open <span class="count">${rest.length}</span></div><div class="rows">${rest.map(id => row('purchasing', id, lab(id)[0], '', lab(id)[1])).join('')}</div>`,
    rail: sel === 'I2611-001-1' ? railFor('d3') : sel === 'I2611-002-2' ? railFor('I2611-002-2') : { facts: head(esc(lab(sel)[0].split(' | ')[0]), esc(lab(sel)[1]) + '. The agent watches the date and chases if it slips.'), label: 'Nothing to do', enabled: false }, list: 'purchasing' };
};
V.planning = () => {
  const moved = ST.week['V2611-001'] === 51;
  const lines = [{ id: 'pl1', who: 'Bentacera', desc: 'Systeemwand dicht 16 m1', ref: 'V2611-001', week: ST.week['V2611-001'], risk: moved ? 'moved to week 51' : 'glass late: week 51?' }, { id: 'pl2', who: 'Wallsz', desc: 'Systeemwand dicht 28 m1', ref: 'O2611-009, if accepted', week: ST.planWeek.pl2 }, { id: 'pl3', who: 'De Graaf', desc: 'Matte folie 12 m1', ref: 'O2611-013, if accepted', week: ST.planWeek.pl3 }];
  const sel = pick('planning', lines.map(l => l.id)), L = lines.find(l => l.id === sel), s = ST.plan[sel];
  const bars = [[48, 80], [49, 55], [50, 95], [51, moved ? 70 : 45], [52, 20]];
  return { work: `<h1>Planning</h1><p class="sub">Example numbers: factory hours are not tracked yet.</p>
    <div class="lab">Load per week <small>Press a week to see its days</small></div><div class="rows weeks">${bars.map(([w, p], k) => `<button class="bar${ST.openWeek === w ? ' open' : ''}" data-do="openweek" data-v="${w}" aria-expanded="${ST.openWeek === w}">${ic(ST.openWeek === w ? 'chevD' : 'chevR')}<b>Week ${w}${k === 0 ? ', now' : ''}</b><span><i class="${p > 90 ? 'full' : ''}" style="width:${p}%"></i></span><b>${p} %${p > 90 ? ', full' : ''}</b></button>${ST.openWeek === w ? daysOf(w, p) : ''}`).join('')}</div>
    <div class="lab">Own-factory lines <span class="count">${lines.length}</span></div><div class="rows">${lines.map(l => row('planning', l.id, `${l.who} | ${l.desc} | ${l.ref}`, l.risk && !moved ? 'At risk' : ST.plan[l.id], l.risk || 'week ' + l.week, !!l.risk && !moved)).join('')}</div>`,
    rail: { facts: head(esc(L.who) + ': ' + esc(L.desc), esc(L.ref)) + kv('Status', s) + kv('Week', ed('plan|' + L.id, L.week), L.risk || ''),
      label: s === 'Ready' ? 'Ready ✓' : s === 'Waits for quote' ? 'Starts when the quote is accepted' : 'Mark ready', enabled: s === 'In production', hint: '',
      run: () => { ST.plan[sel] = 'Ready'; toast(L.desc + ' is ready', () => { ST.plan[sel] = 'In production'; }); } }, list: 'planning' };
};
V.delivery = () => {
  const q = Q['O2611-002'], p = D.projects.find(x => x.id === 'P2611-002');
  const st = l => /Stalen/.test(l.desc) ? (ST.allIn ? '✓ in, 2 Dec' : 'arrives 2 Dec, Metaalwerk') : /Montage/.test(l.desc) ? 'own team' : '✓ in';
  const missing = flat(q).filter(l => /arrives/.test(st(l))).length;
  const stepI = ST.delivered ? 5 : 4;
  const facts3 = kv('Address', esc(p.site)) + kv('Contact', esc(p.contact), 'no phone on file') + kv('Time window and driver', ed('del|window', ST.delWin, ST.delWin ? esc(ST.delWin) : 'Not set'), ST.delWin ? '' : 'ask Joost', !ST.delWin);
  const rail = ST.delivered ? { facts: head('De Graaf: delivered', 'Signed by ' + esc(ST.signer)) + facts3, ...toNext() }
    : missing ? { facts: head('De Graaf: 1 line still on its way', 'Steel frames arrive 2 Dec. Week 50 still fits. <a class="link" href="#/purchasing" style="margin:0">Purchase I2611-002-2</a>') + facts3,
      decide: `<p class="alt">Shipping now means a second trip on 2 Dec.</p><button class="btn2" data-do="modal" data-v="ship">Ship what is in anyway</button>`,
      label: 'Waiting for 1 line (2 Dec)', enabled: false, hint: '' }
    : { facts: head('De Graaf: everything is in', 'Order V2611-002, week 50') + facts3,
      decide: `<div class="ask">Who signed the delivery note?<label class="field">Name<input id="signer" value="${esc(ST.signer)}" autocomplete="off"></label><label class="btn2 file">${ST.photo ? esc(ST.photo) : 'Add photo of the signed note'}<input type="file" accept="image/*" id="photo" hidden></label></div>`,
      label: 'Confirm delivery', enabled: !!ST.signer.trim(), hint: 'Dated today. The final invoice (70 %) gets ready.', focus: '#anchor',
      run: () => { ST.delivered = true; toast('Delivery confirmed, final invoice is ready', () => { ST.delivered = false; }); } };
  return { work: `${back}<h1>De Graaf: Offices delivery</h1><p class="sub">Delivery note L2611-002, order V2611-002, Stationsplein 4, Utrecht, week 50</p>${stepper(stepI, { 2: '#/quote/O2611-002' })}
    <div class="rows">${flat(q).map(l => `<div class="row${/arrives/.test(st(l)) ? ' warn' : ''}" style="cursor:default"><span>${esc(l.desc)}, ${l.qty} ${l.unit}</span><span class="meta">${esc(st(l))}</span></div>`).join('')}</div>
`, rail };
};
V.invoices = () => {
  const rows = D.invoices.map(i => ({ ...i, overdue: i.status === 'Sent' && i.due < '2026-11-23' }));
  const toInv = ST.delivered && !ST.finalSent ? ['fin'] : [];
  const ids = [...rows.filter(r => r.overdue).map(r => r.id), ...toInv, ...rows.filter(r => !r.overdue && r.status !== 'Paid').map(r => r.id)];
  const sel = pick('invoices', ids), cust = i => custOfOrder(i.order).customer.replace(' Interieurbouw', '');
  const paid = rows.filter(r => r.status === 'Paid');
  return { work: `<h1>Invoices</h1>
    ${tools('invoices')}<div class="lab">Needs you <span class="count">${rows.filter(r => r.overdue).length}</span></div><div class="rows">${rows.filter(r => r.overdue).map(i => row('invoices', i.id, `${cust(i)} | ${i.kind.toLowerCase()} invoice, reminder ${ST.rem[i.id] || i.reminders} sent | ${i.id}`, 'Overdue', eur(invTotal(i)), true)).join('')}</div>
    ${toInv.length ? `<div class="lab">To invoice <span class="count">${toInv.length}</span></div><div class="rows">${row('invoices', 'fin', 'De Graaf | final invoice 70 %, delivered | F2611-002-2', 'To invoice', eur(finalAmount()))}</div>` : ''}
    <div class="lab">Open <span class="count">${rows.filter(r => !r.overdue && r.status !== 'Paid').length}</span></div><div class="rows">${rows.filter(r => !r.overdue && r.status !== 'Paid').map(i => row('invoices', i.id, `${cust(i)} | ${i.kind.toLowerCase()} ${i.pct ? i.pct + ' %' : ''} | due ${day(i.due)} | ${i.id}`, '', eur(invTotal(i)))).join('')}</div>
    <p class="state">Paid this month: ${paid.map(i => cust(i) + ', ' + eur(invTotal(i))).join('; ')}</p>`,
    rail: sel === 'F2610-004' ? railFor('F2610-004') : sel === 'fin' ? railFor('fin') : { facts: head(esc(cust(D.invoices.find(i => i.id === sel))) + ': ' + sel, 'Nothing to do. The agent sends reminders on its own and copies the accountant.'), label: 'Nothing to do', enabled: false }, list: 'invoices' };
};
V.relations = () => {
  const f = ST.relFilter, qq = ST.relQ.toLowerCase();
  const list = D.relations.filter(r => (f === 'All' || r.kind + 's' === f) && (!qq || [r.name, r.contact, r.city, r.email].join(' ').toLowerCase().includes(qq)));
  const sel = list.length ? pick('relations', list.map(r => r.name)) : null, r = D.relations.find(x => x.name === sel);
  const nk = k => D.relations.filter(r => k === 'All' || r.kind + 's' === k).length;
  const work = `<h1>Customers and suppliers</h1>
    <div class="tabs">${['All', 'Customers', 'Suppliers'].map(k => `<button data-do="relfilter" data-v="${k}" aria-pressed="${f === k}">${k}<span class="count">${nk(k)}</span></button>`).join('')}</div>
    ${tools('relations')}
    <div class="rows">${list.map(x => row('relations', x.name, `${x.name} | ${x.contact}, ${x.city}`, D.invoices.some(i => isOverdue(i) && custOfOrder(i.order).customer === x.name) ? 'Overdue' : '', f === 'All' && x.kind === 'Supplier' ? 'Supplier' : '')).join('') || '<p class="empty">No match. Try a city or part of a name.</p>'}</div>`;
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
      hint: r.kind === 'Customer' ? 'Opens a new mail to ' + r.contact : 'To ' + r.email, run: () => { ST.modal = { kind: 'compose', to: r.email, subject: r.kind === 'Customer' ? 'Nieuwe aanvraag' : 'Inkooporder' }; } }, list: 'relations' };
};
V.articles = () => {
  const qq = ST.artQ.toLowerCase(), list = D.articles.filter(x => !qq || [x.code, x.name, x.supplier, x.source, x.group].join(' ').toLowerCase().includes(qq));
  const sel = list.length ? pick('articles', list.map(a => a.code)) : null, a = D.articles.find(x => x.code === sel);
  const work = `<div class="titlebar"><h1>Articles</h1><button class="btn2" data-do="modal" data-v="article">${ic('plus')}Add article</button></div><p class="sub">Prices used in every calculation</p>
    ${tools('articles')}
    <table class="arts"><thead><tr><th>Code</th><th>${sortHead('articles')}</th><th>Source</th><th>Unit</th><th class="num">Cost</th><th class="num">Margin</th></tr></thead><tbody>
    ${list.map(x => `<tr data-sel="articles" data-id="${x.code}" data-name="${esc(x.name)}" aria-selected="${x.code === sel}" style="cursor:pointer"><td>${x.code}</td><td>${ed(`art|${x.code}|name`, x.name)}</td><td>${esc(x.supplier || x.source)}</td><td>${ed(`art|${x.code}|unit`, x.unit)}</td><td class="num">${ed(`art|${x.code}|cost`, x.cost.toFixed(2), eur(x.cost))}</td><td class="num">${ed(`art|${x.code}|margin`, x.margin, x.margin + ' %')}</td></tr>`).join('') || '<tr><td colspan="6" class="empty">No match. Try the supplier or a code like SW.</td></tr>'}</tbody></table>`;
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
  const work = `<h1>Activity</h1>${tools('activity')}
    ${ST.mine.length ? `<div class="lab">You, today <span class="count">${ST.mine.length}</span></div><div class="rows">${ST.mine.map((x, i) => row('activity', 'm' + i, x.text, x.undone ? 'undone' : '', x.at)).join('')}</div>` : ''}
    <div class="lab">Agent, this week <span class="count">${ST.activity.length}</span></div><div class="rows">${ST.activity.map((x, i) => row('activity', 'a' + i, x[0], '', x[1])).join('')}</div>`;
  if (sel && sel[0] === 'm') { const x = ST.mine[+sel.slice(1)];
    return { work, rail: { facts: head(esc(x.text), 'You, today ' + x.at + (x.undone ? ', undone' : '')),
      decide: x.undone ? '' : `<button class="btn2" data-do="undomine" data-v="${sel.slice(1)}">Undo this</button>`, ...toNext() }, list: 'activity' }; }
  const a = sel && ST.activity[+sel.slice(1)], m = a && ACT[a[0]];
  return { work,
    rail: a ? { facts: head(esc(a[0]), esc(a[1])) + `<p class="plain">${esc(m ? m.what : '')}</p>`,
      decide: `<button class="btn2" data-do="undoact">Undo this action</button>`,
      label: m ? 'Open ' + m.rec : 'Nothing to open', enabled: !!m, hint: '',
      run: () => m.go() } : { facts: '<p class="empty">No actions.</p>', label: 'Nothing to open', enabled: false }, list: 'activity' };
};
V.settings = () => {
  const sel = pick('settings', Object.keys(ST.power)), locked = sel === 'Quotes';
  return { work: `<h1>Settings</h1><div class="lab">What the agent may do <span class="count">${Object.keys(ST.power).length}</span></div><div class="rows">${Object.entries(ST.power).map(([k, v]) => row('settings', k, k, k === 'Quotes' ? 'set by owner' : '', v)).join('')}</div>
    <div class="lab">Mail</div><div class="rows"><div class="row" style="cursor:default"><span class="two"><b>Gmail</b><span>arjan@uniframe.nl, connected. Copies of invoices go to the accountant.</span></span><button class="btn2 inline" data-do="modal" data-v="reconnect">Reconnect</button></div></div>
    <div class="lab">Users <span class="count">2</span></div><div class="rows"><div class="row" style="cursor:default"><span class="two"><b>Joost</b><span>Owner, can change agent power</span></span></div><div class="row" style="cursor:default"><span class="two"><b>Arjan Laninga</b><span>Sales, quotes and orders</span></span></div></div>`,
    rail: locked ? { facts: head('Quotes: always ask', 'Every quote waits for Joost or Arjan to approve it. The agent drafts, never sends. Only Joost can change this.'), label: 'Locked by the owner', enabled: false, hint: '' }
    : { facts: head(esc(sel), 'What the agent may do here.'),
      decide: `<label class="field">The agent may<select id="power">${['Ask me first', 'Do it alone, show in log'].map(o => `<option ${(ST.powerPick[sel] || ST.power[sel]) === o ? 'selected' : ''}>${o}</option>`).join('')}</select></label>`,
      label: 'Save', enabled: true, hint: (ST.powerPick[sel] || ST.power[sel]) === 'Ask me first' ? 'Drafts wait for you on Today' : 'Acts alone, logged in Agent activity', run: () => { const old = ST.power[sel]; ST.power[sel] = ST.powerPick[sel] || $('#power').value; delete ST.powerPick[sel]; toast('Saved', () => { ST.power[sel] = old; }); } }, list: 'settings' };
};

/* ---------- v2: categories, list tools, pop-ups, mailbox, planning days ---------- */
const TEST = /test/.test(location.search);   /* ?test: no mail arrives by itself, so a timed walk stays clean */
const CATS = ['Offices', 'Education', 'Healthcare', 'Sport', 'Retail'];
const CAT0 = { 'P2611-011': 'Education', 'P2611-009': 'Offices', 'P2611-007': 'Sport', 'P2611-002': 'Offices', 'P2611-001': 'Healthcare', 'P2610-004': 'Offices', 'P2610-003': 'Offices', 'P2610-006': 'Retail', 'P2611-013': 'Offices' };
const catOf = id => ST.catOf[id] || CAT0[id] || 'Offices';

const SORTS = {
  today: [['default', 'Longest waiting'], ['rev', 'Newest first'], ['az', 'Name, A to Z'], ['za', 'Name, Z to A']],
  inbox: [['default', 'Oldest first'], ['rev', 'Newest first'], ['az', 'Sender, A to Z']],
  sent: [['default', 'Newest first'], ['rev', 'Oldest first'], ['az', 'Receiver, A to Z']],
  projects: [['default', 'Last change'], ['az', 'Customer, A to Z'], ['za', 'Customer, Z to A'], ['code', 'Job number, high to low'], ['rev', 'Oldest change first']],
  quotes: [['default', 'Last change'], ['az', 'Customer, A to Z'], ['za', 'Customer, Z to A'], ['amount', 'Amount, high to low']],
  purchasing: [['default', 'Delivery date'], ['az', 'Supplier, A to Z'], ['za', 'Supplier, Z to A']],
  invoices: [['default', 'Due date'], ['amount', 'Amount, high to low'], ['az', 'Customer, A to Z']],
  relations: [['default', 'Customers first'], ['az', 'Name, A to Z'], ['za', 'Name, Z to A']],
  articles: [['default', 'Code'], ['az', 'Article, A to Z'], ['za', 'Article, Z to A'], ['amount', 'Cost, high to low']],
  activity: [['default', 'Newest first'], ['rev', 'Oldest first']],
  planning: [['default', 'Week'], ['az', 'Customer, A to Z']],
};
const PH = { today: 'Search in Today', inbox: 'Search mail', sent: 'Search sent mail', projects: 'Search customer, project or job number', quotes: 'Search quotes', purchasing: 'Search purchases', invoices: 'Search invoices', relations: 'Search name, city or e-mail', articles: 'Search code, article or supplier', activity: 'Search activity' };
function tools(l) {
  const so = SORTS[l], cur = so.find(x => x[0] === (ST.sort[l] || 'default')) || so[0];
  return `<div class="tools"><label class="search inlist">${ic('search')}<input id="q-${l}" value="${esc(ST.q[l] || '')}" placeholder="${PH[l]}" autocomplete="off" aria-label="${PH[l]}"></label>
    <div class="popwrap"><button class="btn2" data-do="pop" data-v="${l}:sort" aria-expanded="${ST.pop === l + ':sort'}">${ic('sort')}Sort: ${cur[1].charAt(0).toLowerCase() + cur[1].slice(1)}</button>${ST.pop === l + ':sort' ? `<div class="pop menu" role="menu">${so.map(([k, t]) => `<button role="menuitemradio" data-do="sortby" data-v="${l}:${k}" aria-pressed="${cur[0] === k}">${ic('check')}${t}</button>`).join('')}</div>` : ''}</div>
    <div class="popwrap"><button class="btn2" data-do="pop" data-v="${l}:filter" aria-expanded="${ST.pop === l + ':filter'}">${ic('filter')}Filter${ST.warnOnly[l] ? '<span class="count">1</span>' : ''}</button>${ST.pop === l + ':filter' ? `<div class="pop menu" role="menu"><button role="menuitemcheckbox" data-do="warnonly" data-v="${l}" aria-pressed="${!!ST.warnOnly[l]}">${ic('check')}Only rows with a warning</button></div>` : ''}</div></div>`;
}
const sortHead = l => { const s = ST.sort[l]; return `<button class="th" data-do="sortby" data-v="${l}:${s === 'az' ? 'za' : 'az'}">Article${s === 'az' ? ', A to Z' : s === 'za' ? ', Z to A' : ''}${s === 'az' || s === 'za' ? ic(s === 'az' ? 'chevD' : 'chevR') : ''}</button>`; };
/* sorting and searching work on the rows that are on screen, inside each group */
function applyListTools() {
  const L = CUR && CUR.list; if (!L) return;
  const q = (ST.q[L] || '').trim().toLowerCase(), s = ST.sort[L] || 'default', w = ST.warnOnly[L];
  const num = r => { const m = r.innerText.match(/€\s?([\d,]+\.\d\d)/); return m ? parseFloat(m[1].replace(/,/g, '')) : 0; };
  const code = r => (r.querySelector('.code') || { innerText: '' }).innerText;
  const cmp = { default: (a, b) => a.dataset.i - b.dataset.i, rev: (a, b) => b.dataset.i - a.dataset.i, az: (a, b) => a.dataset.name.localeCompare(b.dataset.name), za: (a, b) => b.dataset.name.localeCompare(a.dataset.name), code: (a, b) => code(b).localeCompare(code(a)), amount: (a, b) => num(b) - num(a) }[s] || ((a, b) => a.dataset.i - b.dataset.i);
  document.querySelectorAll('#work .rows, #work tbody').forEach(box => {
    const rows = [...box.children].filter(r => r.dataset && r.dataset.sel); if (!rows.length) return;
    rows.forEach((r, i) => { if (r.dataset.i === undefined) r.dataset.i = i; r.hidden = (q && !r.innerText.toLowerCase().includes(q)) || (w && !r.querySelector('.tag.urgent')); });
    rows.sort(cmp).forEach(r => box.appendChild(r));
    let e = box.querySelector('.nomatch'); const shown = rows.some(r => !r.hidden);
    if (!shown && !e) { e = document.createElement(box.tagName === 'TBODY' ? 'tr' : 'p'); e.className = 'empty nomatch'; e.innerHTML = box.tagName === 'TBODY' ? '<td colspan="9">No match. Clear the search or the filter.</td>' : 'No match. Clear the search or the filter.'; box.appendChild(e); }
    if (shown && e) e.remove();
  });
}
/* brand field: the label sits in the gap of the top line */
function fieldLabels() { document.querySelectorAll('label.field').forEach(l => { const t = l.firstChild; if (t && t.nodeType === 3 && t.textContent.trim()) { const s = document.createElement('span'); s.className = 'flab'; s.textContent = t.textContent.trim(); l.replaceChild(s, t); } }); }

/* ---------- top bar: shortcuts, user menu, new-mail notice ---------- */
function topBar() {
  $('#toppop').innerHTML = ST.pop === 'shortcuts' ? `<div class="pop keys-pop"><h3>Shortcuts</h3>${[['↑ ↓', 'Pick a row'], ['Enter', 'Main button'], ['← →', 'Choose an answer'], ['[ ]', 'Hide the side panels'], ['/', 'Search'], ['Esc', 'Close a pop-up']].map(([k, v]) => `<div><kbd>${k}</kbd>${v}</div>`).join('')}</div>`
    : ST.pop === 'user' ? `<div class="pop menu user-pop"><div class="me"><b>Arjan Laninga</b><small>Sales</small></div><a href="#/settings" data-do="close">${ic('settings')}Settings</a><button data-do="modal" data-v="logout">${ic('back')}Log out</button></div>` : '';
  const n = ST.notice && Date.now() < ST.notice.until ? ST.notice : null;
  $('#notice').innerHTML = n ? `<button class="notice" data-do="opennew" data-v="${n.id}">${ic('inbox')}${esc(n.text)}</button>` : '';
}
function refreshChrome() { const [, r = 'today', a] = location.hash.split('/'); side(r, a); topBar(); }

/* ---------- pop-ups (brand C7: white, one 28 px curve, shadow) ---------- */
const CONTACTS = () => D.relations.map(r => `<option value="${esc(r.email)}">${esc(r.contact)}, ${esc(r.name)}</option>`).join('');
function modalHtml() {
  const m = ST.modal; if (!m) return '';
  const wrap = (title, body, ok, text) => `<div class="scrim"><div class="dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}"><h2>${title}</h2>${text ? `<p>${text}</p>` : ''}${body}<div class="btnrow"><button class="btn2" data-do="close">Cancel</button>${ok ? `<button class="anchor" data-do="save">${ok}</button>` : ''}</div></div></div>`;
  if (m.kind === 'compose') return wrap('New mail', `<label class="field">To<input id="m-to" list="contacts" value="${esc(m.to || '')}" autocomplete="off"></label><datalist id="contacts">${CONTACTS()}</datalist>
    <label class="field">Subject<input id="m-subj" value="${esc(m.subject || '')}"></label><label class="field">Message<textarea id="m-body" rows="7">Beste ,\n\n\n\nMet vriendelijke groet,\nArjan Laninga</textarea></label>`, 'Send', 'From arjan@uniframe.nl. It shows in Sent, and you can undo it for 10 s.');
  if (m.kind === 'category') { const cur = ST.modalCat || catOf(m.id), p = D.projects.find(x => x.id === m.id) || { name: 'Kantoorverdieping Utrecht' };
    return wrap('Category of ' + esc(p.name), CATS.map(c => `<button class="radio" data-do="setcat" data-v="${c}" aria-pressed="${cur === c}"><i></i>${c}</button>`).join(''), 'Save category', `The agent chose ${catOf(m.id)} from the mail.`); }
  if (m.kind === 'article') return wrap('Add an article', `<label class="field">Article<input id="m-name" placeholder="e.g. Systeemwand enkel glas, h 2700"></label><div class="two-col"><label class="field">Code<input id="m-code" placeholder="e.g. SW-GL-27"></label><label class="field">Unit<input id="m-unit" value="m1"></label></div>
    <div class="two-col"><label class="field">Cost<input id="m-cost" inputmode="decimal" placeholder="€ 0.00"></label><label class="field">Margin %<input id="m-margin" inputmode="decimal" value="20"></label></div><label class="field">Source<input id="m-source" value="Glas Centrum Nederland"></label>`, 'Add article');
  if (m.kind === 'phone') return wrap('Phone number for Paul Terlouw', `<label class="field">Phone<input id="m-phone" inputmode="tel" placeholder="06 12 34 56 78"></label>`, 'Save phone', 'Wallsz, used for reminders by phone.');
  if (m.kind === 'ship') return wrap('Ship what is in now?', '', 'Ship now', 'The steel frames follow on 2 Dec. That means a second trip to Stationsplein 4, Utrecht.');
  if (m.kind === 'reconnect') return wrap('Reconnect Gmail', '', 'Continue to Google', 'Google asks you to sign in again as arjan@uniframe.nl. Your mail and drafts stay where they are.');
  if (m.kind === 'logout') return wrap('Log out?', '', 'Log out', 'Drafts are saved. You can log in again at any time.');
  return '';
}
function saveModal() {
  const m = ST.modal; if (!m) return; const val = id => (($('#' + id) || {}).value || '').trim();
  if (m.kind === 'compose') { const to = val('m-to'); if (!/@/.test(to)) { const f = $('#m-to'); f && f.focus(); return; }
    const x = sendMail(to, val('m-subj') || '(no subject)', ($('#m-body') || {}).value || ''); toast('Mail sent to ' + to, () => { ST.sent = ST.sent.filter(y => y !== x); }); }
  if (m.kind === 'category') { const c = ST.modalCat || catOf(m.id), old = ST.catOf[m.id]; ST.catOf[m.id] = c; toast('Category set to ' + c, () => { if (old) ST.catOf[m.id] = old; else delete ST.catOf[m.id]; }); }
  if (m.kind === 'article') { const name = val('m-name'), code = val('m-code'); if (!name || !code) { const f = $(name ? '#m-code' : '#m-name'); f && f.focus(); return; }
    const a = { code, key: code, name, desc: name, group: '', unit: val('m-unit') || 'st', cost: parseFloat(val('m-cost').replace('€', '').replace(',', '.')) || 0, margin: parseFloat(val('m-margin')) || 20, source: val('m-source') || 'Own team', supplier: val('m-source'), added: '27 Nov, by Arjan' };
    D.articles.push(a); ST.sel.articles = code; toast('Article ' + code + ' added', () => { D.articles.splice(D.articles.indexOf(a), 1); }); }
  if (m.kind === 'phone') { const ph = val('m-phone'); if (!ph) { const f = $('#m-phone'); f && f.focus(); return; } ST.phone.Wallsz = ph; toast('Phone saved for Paul Terlouw', () => { delete ST.phone.Wallsz; }); }
  if (m.kind === 'ship') toast('Part delivery planned for week 50. Frames follow on 2 Dec', null);
  if (m.kind === 'reconnect') toast('Gmail checked: connected as arjan@uniframe.nl', null);
  if (m.kind === 'logout') toast('You stay logged in on this demo', null);
  ST.modal = null; ST.modalCat = null;
}

/* ---------- mailbox: what you send goes to Sent; new mail and replies come in ---------- */
let NEWN = 0;
function sendMail(to, subject, body, files) {
  const x = { to, subject, body, files, at: new Date().toTimeString().slice(0, 5) }; ST.sent.unshift(x);
  const rel = D.relations.find(r => r.email === to);
  if (rel && !TEST) setTimeout(() => arrive({ from: rel.contact + ', ' + rel.name, email: to, subject: 'RE: ' + subject, agent: 'Reply, nothing to do', body: 'Hoi Arjan,\n\nDank je, goed ontvangen.\n\nGroet,\n' + rel.contact.split(' ')[0], handled: 'The agent read it: a thank-you, nothing to do.' }, true), 15000);
  return x;
}
function arrive(m, done) {
  const id = 'n' + (++NEWN); MAILS[id] = { ...m, date: new Date().toTimeString().slice(0, 5) }; ST.fresh.unshift(id); if (done) ST.done[id] = true;
  ST.notice = { id, text: 'New mail: ' + m.from.split(', ')[0], until: Date.now() + 8000 }; refreshChrome();
  setTimeout(refreshChrome, 8100);
}
const boxTabs = () => `<div class="tabs"><button data-do="box" data-v="inbox" aria-pressed="${ST.box === 'inbox'}">Inbox<span class="count">${ST.fresh.filter(id => !ST.done[id]).length + ITEMS.filter(i => i.mail && !ST.done[i.id]).length}</span></button><button data-do="box" data-v="sent" aria-pressed="${ST.box === 'sent'}">Sent<span class="count">${ST.sent.length}</span></button></div>`;
function sentBox() {
  const ids = ST.sent.map((x, i) => 's' + i), sel = ids.length ? pick('sent', ids) : null, x = sel && ST.sent[+sel.slice(1)];
  const work = `<div class="titlebar"><h1>Inbox</h1><button class="btn2" data-do="modal" data-v="compose">${ic('plus')}New mail</button></div>${boxTabs()}${tools('sent')}<div class="mailsplit"><div class="maillist">
    <div class="lab">Sent <span class="count">${ST.sent.length}</span></div><div class="rows">${ST.sent.map((y, i) => sentRow(y, i, sel)).join('') || '<p class="empty">Nothing sent yet. Mails you send from the portal show here.</p>'}</div></div>
    ${x ? `<article class="mail mailread"><h2>${esc(x.subject)}</h2><p class="sub">To ${esc(x.to)}, today ${x.at}</p><pre>${esc(x.body)}</pre>${(x.files || []).map(f => `<span class="chip">${ic('attach')}${esc(f)}</span>`).join('')}</article>` : '<article class="mail mailread"></article>'}</div>`;
  return { full: true, work, rail: x ? { facts: head('Sent', 'From arjan@uniframe.nl to ' + esc(x.to) + ', today ' + x.at), label: 'New mail', enabled: true, hint: '', run: () => { ST.modal = { kind: 'compose' }; } } : { facts: head('Sent mail', 'Everything you send from the portal: quotes, reminders, replies.'), label: 'New mail', enabled: true, run: () => { ST.modal = { kind: 'compose' }; } }, list: 'sent' };
}
function freshRail(id) {
  const m = MAILS[id];
  return { facts: head(esc(m.from.split(', ').reverse().join(': ')), esc(m.agent)),
    decide: `<label class="field">Reply to ${esc(m.from.split(', ')[0])}<textarea id="draft" class="full">${esc(m.draft || '')}</textarea></label>`,
    label: 'Send reply', enabled: true, hint: 'To ' + m.email,
    run: () => { const x = sendMail(m.email, 'RE: ' + m.subject, ($('#draft') || {}).value || ''); ST.done[id] = true; toast('Reply sent to ' + m.from.split(', ')[0], () => { delete ST.done[id]; ST.sent = ST.sent.filter(y => y !== x); }); } };
}
const INCOMING = [
  [25000, { from: 'Sanne Vermeer, Kantoorgroep Noord', email: 'sanne@kantoorgroepnoord.nl', subject: 'Vraag: levertijd glazen wand receptie', agent: 'Question, reply drafted',
    body: 'Hoi Arjan,\n\nWe denken weer aan de glazen wand voor de receptie in Zwolle. Wat is op dit moment de levertijd?\n\nGroet,\nSanne', draft: 'Hoi Sanne,\n\nOp dit moment is de levertijd voor een glazen systeemwand ongeveer 4 weken na akkoord, montage binnen 1 week daarna.\n\nZal ik een prijs voor je maken?\n\nGroet,\nArjan' }],
  [80000, { from: 'Henk Bos, Metaalwerk Veenendaal', email: 'h.bos@metaalwerkveenendaal.nl', subject: 'Bevestiging levering kozijnen 2 december', agent: 'Date confirmed, nothing to do', handled: 'The agent checked it against purchase I2611-002-2: same date, nothing changes.',
    body: 'Goedemorgen,\n\nHierbij bevestigen wij de levering van de stalen kozijnen op 2 december.\n\nMet vriendelijke groet,\nHenk Bos' }, true],
  [150000, { from: 'Kees Vos, Inter-Fact', email: 'kees@inter-fact.nl', subject: 'Aanvraag: 3 glazen deuren vergaderzaal', agent: 'New request, reply drafted',
    body: 'Beste Arjan,\n\nVoor onze vergaderzaal zoeken we 3 glazen deuren in de bestaande wand. Kun je een prijs geven?\n\nGroet,\nKees', draft: 'Beste Kees,\n\nDank voor je aanvraag. Mag ik volgende week langskomen om de wand op te meten? Dan maak ik direct een prijs.\n\nGroet,\nArjan' }],
];
if (!TEST) INCOMING.forEach(([ms, m, done]) => setTimeout(() => arrive(m, done), ms));

/* ---------- planning: a week opens into its days ---------- */
const DAYPLAN = { 50: [[100, 'Bentacera: Systeemwand dicht, 6 m1'], [100, 'Bentacera: Systeemwand dicht, 6 m1'], [100, 'Bentacera: Systeemwand dicht, 4 m1'], [85, 'De Graaf: frames check before delivery'], [90, 'De Graaf: load the truck for week 50'], [0, 'Closed']] };
function daysOf(w, p) {
  const mon = new Date(2026, 10, 23 + (w - 48) * 7), names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const plan = DAYPLAN[w] || [p + 5, p, p + 5, p - 5, p - 10, 0].map((x, i) => [Math.max(0, Math.min(100, x)), i === 5 ? 'Closed' : i < 3 ? 'Systeemwand production' : 'Frames and doors, prep']);
  return plan.map(([pct, what], i) => { const d = new Date(mon); d.setDate(mon.getDate() + i);
    return `<div class="day${pct ? '' : ' off'}"><span>${names[i]} ${d.getDate()} ${MON[d.getMonth()]}</span><span class="track"><i class="${pct >= 90 ? 'full' : ''}" style="width:${pct}%"></i></span><b>${pct ? pct + ' %' : '–'}</b><span>${esc(what)}</span></div>`; }).join('');
}

function setEdit(key, raw) {
  const [k, ...p] = key.split('|'), txt = String(raw).trim(), num = parseFloat(txt.replace(/[€\s%]/g, '').replace(/,(\d{1,2})$/, '.$1').replace(/,/g, ''));
  let undo = null, what = '';
  if (k === 'calc') { const [ci, li, f] = p, l = calcBase().chapters[ci].lines[li]; if (isNaN(num) || num < 0) return;
    if (/^Matte folie/.test(l.desc) && f === 'cost') { const old = ST.folie; ST.folie = String(num); undo = () => { ST.folie = old; }; }
    else { const id = ci + '.' + li, old = ST.ce[id] ? { ...ST.ce[id] } : null; ST.ce[id] = { ...(ST.ce[id] || {}), [f]: num }; undo = () => { if (old) ST.ce[id] = old; else delete ST.ce[id]; }; }
    what = l.desc.split(',')[0] + ', ' + (f === 'qty' ? 'quantity' : f) + ' ' + txt; }
  if (k === 'q') { const [id, ci, li, f] = p, l = Q[id].chapters[ci].lines[li]; if (isNaN(num) || num < 0) return; const old = l[f]; l[f] = num; undo = () => { l[f] = old; }; what = l.desc.split(',')[0] + ', quantity ' + num; }
  if (k === 'req') { const [f] = p;
    if (f === 'Doors') { if (isNaN(num) || num < 1) return; const od = ST.doors; ST.doors = Math.round(num); undo = () => { ST.doors = od; }; }
    else { if (!txt) return; const old = ST.req[f]; ST.req[f] = txt; undo = () => { if (old === undefined) delete ST.req[f]; else ST.req[f] = old; }; }
    what = f.toLowerCase() + ' to ' + txt; }
  if (k === 'ord') { if (!ST.order) ST.order = orderHoekstra(); const [i, f] = p, l = flat(ST.order)[+i], old = l[f];
    if (f === 'qty') { if (isNaN(num) || num < 0) return; l.qty = num; } else { if (!txt) return; l.supplier = txt; }
    undo = () => { l[f] = old; }; what = l.desc.split(',')[0] + ', ' + (f === 'qty' ? 'quantity ' + num : 'supplier ' + txt); }
  if (k === 'art') { const [code, f] = p, a = D.articles.find(x => x.code === code), old = a[f];
    if (f === 'cost' || f === 'margin') { if (isNaN(num) || num < 0) return; a[f] = num; } else { if (!txt) return; a[f] = txt; if (f === 'name') a.desc = txt; }
    undo = () => { a[f] = old; if (f === 'name') a.desc = old; }; what = code + ', ' + f + ' ' + txt; }
  if (k === 'plan') { const [id] = p; if (isNaN(num) || num < 1 || num > 53) return; num !== num;
    if (id === 'pl1') { const old = ST.week['V2611-001']; ST.week['V2611-001'] = Math.round(num); undo = () => { ST.week['V2611-001'] = old; }; }
    else { const old = ST.planWeek[id]; ST.planWeek[id] = Math.round(num); undo = () => { ST.planWeek[id] = old; }; }
    what = 'week to ' + Math.round(num); }
  if (k === 'del') { const old = ST.delWin; ST.delWin = txt; undo = () => { ST.delWin = old; }; what = 'time window and driver'; }
  if (k === 'pc') { const [id, f] = p; if (!txt) return; ST.pc[id] = ST.pc[id] || {}; const old = ST.pc[id][f]; ST.pc[id][f] = txt; undo = () => { ST.pc[id][f] = old; }; what = f === 'email' ? 'e-mail' : 'contact'; }
  if (undo) toast('Changed ' + what, undo);
}
function startEdit(el) {
  if (!el || el.querySelector('input')) return;
  const key = el.dataset.edit, w = el.getBoundingClientRect().width;
  el.innerHTML = `<input class="inl" value="${esc(el.dataset.val)}" style="width:${Math.max(72, Math.round(w) + 28)}px" aria-label="Change value">`;
  const i = el.querySelector('input'); i.focus(); i.select();
  let done = false;
  const finish = save => { if (done) return; done = true; if (save && i.value.trim() !== String(el.dataset.val)) setEdit(key, i.value); render(); };
  i.addEventListener('keydown', ev => {
    ev.stopPropagation();
    if (ev.key === 'Enter') { ev.preventDefault(); finish(true); }
    if (ev.key === 'Escape') { ev.preventDefault(); finish(false); }
    if (ev.key === 'Tab') { ev.preventDefault(); const all = [...document.querySelectorAll('[data-edit]')], nx = all[all.indexOf(el) + (ev.shiftKey ? -1 : 1)], nk = nx && nx.dataset.edit;
      finish(true); if (nk) setTimeout(() => startEdit([...document.querySelectorAll('[data-edit]')].find(x => x.dataset.edit === nk)), 0); }
  });
  i.addEventListener('blur', () => finish(true));
}
/* ---------- shell ---------- */
const NAVS = [['today', 'Today'], ['inbox', 'Inbox'], ['project', 'Projects'], ['quote', 'Quotes'], ['purchasing', 'Purchasing'], ['planning', 'Planning'], ['invoices', 'Invoices'], ['relations', 'Customers and suppliers'], ['articles', 'Articles'], ['activity', 'Activity'], ['settings', 'Settings']];
const SHORT = { today: 'To', inbox: 'In', project: 'Pr', quote: 'Qu', purchasing: 'Pu', planning: 'Pl', invoices: 'Iv', relations: 'Cu', articles: 'Ar', activity: 'Ag', settings: 'Se' }; /* stand-ins for icons when the menu is narrow */
const SECTION = { request: 'project', calc: 'project', order: 'project', delivery: 'project' };
function side(r, a) {
  const count = { inbox: ST.fresh.filter(id => !ST.read[id]).length, today: open('needs').length, purchasing: ST.done.d3 ? 0 : 1, invoices: (ST.done['F2610-004'] ? 0 : 1) + (ST.delivered && !ST.finalSent ? 1 : 0) };
  const act = r === 'quote' && a ? 'project' : SECTION[r] || r;
  const item = ([k, l]) => `<a class="nav" href="#/${k}" title="${l}" ${k === act ? 'aria-current="page"' : ''}>${ic(k)}<span>${l}</span>${count[k] ? `<b>${count[k]}</b>` : ''}</a>`;
  $('#side').innerHTML = `<div class="logo"><svg class="mark" viewBox="0 0 100 100" aria-hidden="true"><path d="M0 0H36V18H18V82H68A14 14 0 0 0 82 68V18H64V0H100V68A32 32 0 0 1 68 100H0Z"/></svg><span>Uniframe<br>Systems</span><button class="sidebtn" data-do="sidemin" data-v="${ST.sideMin ? 0 : 1}" title="${ST.sideMin ? 'Show menu' : 'Hide menu'} ([)" aria-label="${ST.sideMin ? 'Show menu' : 'Hide menu'}">${ic('collapse')}</button></div>`
    + [NAVS.slice(0, 2), NAVS.slice(2, 7), NAVS.slice(7, 9)].map(g => `<div class="navgroup">${g.map(item).join('')}</div>`).join('') + `<div class="navbottom">${NAVS.slice(9).map(item).join('')}</div>`;
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
  document.title = (v.work.match(/<h1>(.*?)<\/h1>/) || [, 'Uniframe'])[1].replace(/<[^>]+>/g, '') + ' · Uniframe';
  applyListTools(); fieldLabels(); $('#modal').innerHTML = modalHtml(); topBar();
  const f = ST.modal ? null : (v.focus || R.focus), el = f && $(f);
  if (el && document.activeElement !== el) { el.focus({ preventScroll: true }); if (el.tagName === 'INPUT') el.setSelectionRange(el.value.length, el.value.length); }
}
let lastAnchorClick = 0;
function runAnchor(viaMouse) {
  if (!CUR || ST.railMin || ST.modal) return;
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
  if (e.target.closest('input.inl')) return;
  const edEl = e.target.closest('[data-edit]'); if (edEl) { e.preventDefault(); startEdit(edEl); return; }
  if (ST.pop && !e.target.closest('.pop, [data-do="pop"]')) { ST.pop = null; if (!e.target.closest('[data-do],[data-sel],a,button')) { render(); return; } }
  if (e.target.classList && e.target.classList.contains('scrim')) { ST.modal = null; render(); return; }
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
    if (d.dataset.do === 'modal') { ST.modal = { kind: v, id: d.dataset.id }; ST.pop = null; render(); }
    if (d.dataset.do === 'close') { ST.modal = null; ST.pop = null; render(); }
    if (d.dataset.do === 'pop') { ST.pop = ST.pop === v ? null : v; render(); }
    if (d.dataset.do === 'sortby') { const [l, k] = v.split(':'); ST.sort[l] = k; ST.pop = null; render(); }
    if (d.dataset.do === 'warnonly') { ST.warnOnly[v] = !ST.warnOnly[v]; render(); }
    if (d.dataset.do === 'projcat') { ST.projCat = v; render(); }
    if (d.dataset.do === 'showclosed') { ST.showClosed = !ST.showClosed; render(); }
    if (d.dataset.do === 'openweek') { ST.openWeek = ST.openWeek === +v ? null : +v; render(); }
    if (d.dataset.do === 'box') { ST.box = v; render(); }
    if (d.dataset.do === 'setcat') { ST.modalCat = v; render(); }
    if (d.dataset.do === 'save') { saveModal(); render(); }
    if (d.dataset.do === 'opennew') { ST.box = 'inbox'; ST.sel.inbox = v; ST.notice = null; go('#/inbox'); }
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
  if (id.startsWith('q-')) { ST.q[id.slice(2)] = e.target.value; applyListTools(); }
});
document.addEventListener('change', e => { if (e.target.id === 'photo' && e.target.files[0]) { ST.photo = e.target.files[0].name; render(); } if (e.target.id === 'saveart') { ST.saveArt = e.target.checked; render(); } if (e.target.id === 'power') { ST.powerPick[ST.sel.settings] = e.target.value; render(); } });
document.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.dataset && e.target.dataset.edit) { e.preventDefault(); startEdit(e.target); return; }
  const t = e.target, typing = /INPUT|TEXTAREA|SELECT/.test(t.tagName || '');
  if (!t.closest) return;
  if (ST.modal && e.key === 'Enter' && t.tagName !== 'TEXTAREA') { e.preventDefault(); saveModal(); render(); return; }
  if (e.key === 'Enter' && !e.repeat && !e.shiftKey && t.tagName !== 'TEXTAREA' && !t.closest('[data-do]') && t.id !== 'anchor') { if (!typing || ['folie', 'artcost', 'artmargin', 'addr', 'signer'].includes(t.id)) { e.preventDefault(); if (t.id === 'addr') render(); runAnchor(); } }
  if (e.key === 'Enter' && t.id === 'gsearch') { ST.projQ = t.value; t.value = ''; t.blur(); go('#/project'); return; }
  if (e.key === 'Escape' && (ST.modal || ST.pop)) { ST.modal = null; ST.pop = null; render(); return; }
  if (ST.modal) return;
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
