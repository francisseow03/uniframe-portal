/* Inbox: a Gmail-style mail client inside the portal.
   Demo mode: example mail, and Send opens Gmail's own compose window with everything filled in.
   Connected mode: with a Google OAuth client ID (Settings → Connections), it signs in with Google,
   reads the real Gmail inbox and sends through the Gmail API. Nothing is stored on a server. */
(() => {
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const I = (n) => window.ufIcon(n);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };
const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send';

const demo = [
  { id: 'd1', folder: 'inbox', lane: ['attention', 'Change to a quote'], from: 'Paul Terlouw', email: 'paul.terlouw@wallsz.nl', subject: 'RE: Politie KPLD, deur 2.14 erbij', date: '19 Nov', unread: true, star: true,
    body: 'Beste Arjan,\n\nWe hebben toch een extra deur nodig op de begane grond (2.14), zelfde uitvoering als de rest.\nKunnen jullie de offerte aanpassen?\n\nMet vriendelijke groet,\nPaul Terlouw\nWallsz',
    agent: 'I added door 2.14 as revision R2 of C2611-010 (9 doors instead of 8). The new quote is waiting for you to verify.', link: ['#/quote/O2611-010', 'Open quote O2611-010'],
    draft: 'Beste Paul,\n\nDank voor je bericht. Deur 2.14 is toegevoegd; je ontvangt de aangepaste offerte vandaag.\n\nMet vriendelijke groet,\nArjan Laninga' },
  { id: 'd2', folder: 'inbox', lane: ['active', 'New request'], from: 'Bouwbedrijf Hoekstra', email: 'inkoop@hoekstra-bouw.nl', subject: 'Aanvraag school wing B', date: '21 Nov', unread: true,
    body: 'Goedemiddag,\n\nVoor school wing B in Amersfoort zoeken wij een prijs voor circa 60 m1 glazen systeemwand en 12 deuren. Tekening volgt.\n\nGroet,\nAfdeling inkoop',
    agent: 'I made project P2611-011 and drafted 2 questions: ceiling height and glass type. They go out after you approve, or you can edit them.', link: ['#/request/P2611-011', 'Open the request'],
    draft: 'Goedemiddag,\n\nDank voor uw aanvraag. Twee vragen zodat we een goede prijs kunnen maken:\n1. Wat is de plafondhoogte?\n2. Enkel of dubbel glas?\n\nMet vriendelijke groet,\nArjan Laninga' },
  { id: 'd3', folder: 'inbox', lane: ['loss', 'Supplier late'], from: 'Glas Centrum Nederland', email: 'planning@glascentrum.nl', subject: 'Leverdatum I2611-006', date: '21 Nov',
    body: 'Beste klant,\n\nDoor drukte in de productie verschuift de levering van order I2611-006 naar 2 december.\n\nMet vriendelijke groet,\nPlanning',
    agent: 'Linked to order V2611-002 for Bentacera. With glass on 2 Dec, delivery moves from week 50 to week 51.', link: ['#/order/V2611-002', 'Open order V2611-002'] },
  { id: 'd4', folder: 'inbox', lane: ['attention', 'Needs a person'], from: 'Marloes de Graaf', email: 'marloes@degraaf-interieur.nl', subject: 'Klacht: kras op deurblad', date: '22 Nov', unread: true,
    body: 'Hoi Arjan,\n\nBij de oplevering zagen we een flinke kras op het deurblad van kamer 3. Foto in de bijlage. Hoe lossen we dit op?\n\nGroet,\nMarloes',
    agent: 'This is a complaint about a delivered order, so I stopped and handed it to you. I drafted a reply you can change.', link: ['#/order/V2611-003', 'Open order V2611-003'],
    draft: 'Hoi Marloes,\n\nVervelend, dank voor de foto. We komen volgende week een nieuw deurblad plaatsen; ik bel je morgen voor een moment.\n\nGroet,\nArjan' },
  { id: 'd6', folder: 'inbox', lane: ['active', 'New request'], from: 'Paul Terlouw', email: 'paul.terlouw@wallsz.nl', subject: 'Aanvraag Politie KPLD', date: '18 Nov',
    body: 'Beste Arjan,\n\nGraag een offerte voor systeemwanden, 8 kozijnen en deuren voor het politiebureau in Driebergen. Tekening en deurstaat in de bijlage.\n\nMet vriendelijke groet,\nPaul Terlouw\nWallsz',
    agent: 'I made project P2611-009 from this mail, read the drawing and the door schedule, and drafted calculation C2611-010.', link: ['#/request/P2611-009', 'Open the request'] },
  { id: 'd5', folder: 'sent', from: 'You', to: 'paul.terlouw@wallsz.nl', email: 'paul.terlouw@wallsz.nl', subject: 'Offerte O2611-010', date: '12 Nov', body: 'Beste Paul,\n\nIn de bijlage onze offerte voor Politie KPLD.\n\nMet vriendelijke groet,\nArjan' },
];

const FLAGS = LS.get('uf-mail-flags', {});
demo.forEach(m => { if (FLAGS[m.id]) Object.assign(m, FLAGS[m.id]); });
const keepFlags = m => { if (!m || !m.id || m.id[0] !== 'd') return; FLAGS[m.id] = { unread: !!m.unread, star: !!m.star }; LS.set('uf-mail-flags', FLAGS); };
const M = {
  folder: 'inbox', open: null, q: '', token: null, live: null, compose: null,
  local: LS.get('uf-mail-local', []),
  get clientId() { return LS.get('uf-gmail-client', '') || window.UF_GMAIL_CLIENT_ID || ''; },
  list() {
    const all = M.local.concat(M.live || demo);
    let l = M.folder === 'starred' ? all.filter(m => m.star) : M.folder === 'lane' ? all.filter(m => m.lane && m.lane[1] === M.lane) : all.filter(m => m.folder === M.folder);
    if (M.q) { const q = M.q.toLowerCase(); l = l.filter(m => (m.from + m.subject + m.body).toLowerCase().includes(q)); }
    return l;
  },
};

function counts() { const all = (M.live || demo).concat(M.local); return { inbox: all.filter(m => m.folder === 'inbox' && m.unread).length, drafts: all.filter(m => m.folder === 'drafts').length }; }

function render(id) {
  if (id && id !== M.routed) { const m = find(id); if (m) { M.folder = m.folder; M.lane = null; M.q = ''; M.open = id; if (m.unread) { m.unread = false; keepFlags(m); setTimeout(() => window.UF && window.UF.nav(), 0); } } }
  M.routed = id;
  const c = counts(), lanes = [...new Set(demo.filter(m => m.lane).map(m => m.lane[1]))];
  const list = M.list(), open = list.find(m => m.id === M.open) || null;
  const f = (k, label, ico, n) => `<button class="mf" data-m="folder" data-v="${k}" aria-current="${M.folder === k && !M.lane ? 'true' : 'false'}">${I(ico)}<span>${label}</span>${n ? `<b>${n}</b>` : ''}</button>`;
  return `<header class="rec-head"><nav class="crumbs"><span>Home</span></nav>
      <div class="rec-head__row"><div class="rec-head__title"><h1 class="uf-page-title">Inbox</h1>${M.live ? '<span class="uf-pill uf-pill--profit">Gmail connected</span>' : '<span class="uf-pill uf-pill--neutral">Example mail</span>'}</div>
      <div class="rec-head__actions">${M.live ? `<button class="uf-pbtn uf-pbtn--secondary" data-m="refresh">Refresh</button><button class="uf-pbtn uf-pbtn--quiet" data-m="disconnect">Disconnect</button>` : `<button class="uf-pbtn uf-pbtn--secondary" data-m="connect">Connect Gmail</button>`}<button class="uf-pbtn uf-pbtn--primary" data-m="compose">${I('plus')}Compose</button></div></div></header>
    <div class="mail">
      <nav class="mail__folders" aria-label="Mail folders">
        ${f('inbox', 'Inbox', 'inbox', c.inbox)}${f('starred', 'Starred', 'agent')}${f('sent', 'Sent', 'send')}${f('drafts', 'Drafts', 'quotes', c.drafts)}
        <div class="mf-group">Agent lanes</div>
        ${lanes.map(l => `<button class="mf" data-m="lane" data-v="${esc(l)}" aria-current="${M.lane === l}"><span class="dot"></span><span>${esc(l)}</span></button>`).join('')}
      </nav>
      <section class="mail__list" aria-label="Messages">
        <form class="mail__search" data-m="search"><input name="q" value="${esc(M.q)}" placeholder="Search mail" aria-label="Search mail"></form>
        ${list.length ? list.map(m => `<button class="mrow ${m.unread ? 'is-unread' : ''} ${m.id === M.open ? 'is-open' : ''}" data-m="open" data-v="${m.id}">
          <span class="mrow__top"><span class="mrow__from">${esc(m.folder === 'sent' || m.folder === 'drafts' ? 'To: ' + (m.to || '') : m.from)}</span><span class="mrow__date">${esc(m.date)}</span></span>
          <span class="mrow__subj">${esc(m.subject || '(no subject)')}</span>
          <span class="mrow__snip">${esc((m.snippet || m.body || '').replace(/\s+/g, ' ').slice(0, 90))}</span>
          ${m.lane ? `<span class="uf-pill uf-pill--${m.lane[0]}">${esc(m.lane[1])}</span>` : ''}</button>`).join('') : '<p class="mail__empty">No mail here.</p>'}
      </section>
      <article class="mail__read" aria-label="Message">${open ? reader(open) : '<p class="mail__empty">Choose a message to read it.</p>'}</article>
    </div>${M.compose ? composer() : ''}`;
}
function reader(m) {
  return `<div class="mread__head"><h2>${esc(m.subject || '(no subject)')}</h2>
      <button class="uf-pbtn uf-pbtn--quiet uf-pbtn--sm" data-m="star" data-v="${m.id}" aria-pressed="${!!m.star}">${m.star ? 'Starred' : 'Star'}</button></div>
    <div class="mread__meta">${m.folder === 'sent' || m.folder === 'drafts' ? `<b>To: ${esc(m.to || m.email || '')}</b>` : `<b>${esc(m.from)}</b> <span class="muted">&lt;${esc(m.email || '')}&gt;</span>`}<span class="muted">${esc(m.date)}</span></div>
    ${m.agent ? `<section class="agent agent--mail"><div class="agent__head">${I('agent')}<h2>What the agent did</h2></div><div class="agent__body"><p>${esc(m.agent)}</p></div>
      <div class="agent__actions">${m.link ? `<a class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" href="${m.link[0]}">${esc(m.link[1])}</a>` : ''}${m.draft ? `<button class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" data-m="usedraft" data-v="${m.id}">Use the agent's reply</button>` : ''}</div></section>` : ''}
    ${m.folder === 'sent' && m.mock ? '<p class="sentnote">Sent in example mode: saved here, not delivered. Connect Gmail in Settings to send for real.</p>' : ''}
    <div class="mread__body">${esc(m.body || m.snippet || '').replace(/\n/g, '<br>')}</div>${m.attach ? `<p class="attach">${I('upload')}${esc(m.attach)}</p>` : ''}
    <div class="mread__actions"><button class="uf-pbtn uf-pbtn--secondary" data-m="reply" data-v="${m.id}">Reply</button><button class="uf-pbtn uf-pbtn--secondary" data-m="replyall" data-v="${m.id}">Reply all</button><button class="uf-pbtn uf-pbtn--quiet" data-m="forward" data-v="${m.id}">Forward</button></div>`;
}
function composer() {
  const c = M.compose;
  return `<form class="compose" data-m="send" aria-label="New message">
    <div class="compose__head"><b>${esc(c.title || 'New message')}</b><button type="button" class="x" data-m="discard" aria-label="Close">×</button></div>
    <label class="compose__f"><span>To</span><input name="to" value="${esc(c.to || '')}" required placeholder="name@company.nl"></label>
    <label class="compose__f"><span>Cc</span><input name="cc" value="${esc(c.cc || '')}"></label>
    <label class="compose__f"><span>Bcc</span><input name="bcc" value="${esc(c.bcc || '')}"></label>
    <label class="compose__f"><span>Subject</span><input name="subject" value="${esc(c.subject || '')}"></label>
    <textarea name="body" rows="9" aria-label="Message">${esc(c.body || '')}</textarea>
    <p class="compose__hint">${M.live ? 'Sends from your connected Gmail account.' : 'Example mode: Send saves the mail in Sent; it is not delivered. Open in Gmail sends it for real from your own Gmail.'}</p>
    <div class="compose__foot"><button class="uf-pbtn uf-pbtn--primary" type="submit">${I('send')}Send</button><button class="uf-pbtn uf-pbtn--quiet" type="button" data-m="savedraft">Save draft</button>${M.live ? '' : '<button class="uf-pbtn uf-pbtn--quiet" type="button" data-m="gmail">Open in Gmail</button>'}</div>
  </form>`;
}

/* ---------- Gmail API (only when a client ID is set and the user signs in) ---------- */
function loadGis() { return new Promise((ok, no) => { if (window.google?.accounts?.oauth2) return ok(); const s = document.createElement('script'); s.src = 'https://accounts.google.com/gsi/client'; s.onload = ok; s.onerror = () => no(new Error('Could not load Google sign-in')); document.head.appendChild(s); }); }
async function connect() {
  if (!M.clientId) { window.UF.modal('Connect Gmail', `<p>To read and send real mail, the portal needs a Google OAuth client ID for this website. One-time setup:</p>
      <ol class="steps-list"><li>Google Cloud console → APIs &amp; Services → enable the <b>Gmail API</b>.</li><li>OAuth consent screen: External, add your Gmail address as a test user.</li><li>Credentials → Create OAuth client ID → Web application. Authorised JavaScript origin: <code>${esc(location.origin)}</code></li><li>Paste the client ID below.</li></ol>
      <label class="fl">OAuth client ID<input class="field" id="cid" placeholder="1234-abc.apps.googleusercontent.com"></label>`, 'Save and connect', () => { const v = document.getElementById('cid').value.trim(); if (v) { LS.set('uf-gmail-client', v); connect(); } }); return; }
  try {
    await loadGis();
    const tc = google.accounts.oauth2.initTokenClient({ client_id: M.clientId, scope: SCOPES, callback: async r => { if (r.error) { window.UF.toast('Gmail sign-in was cancelled.'); return; } M.token = r.access_token; await refresh(); } });
    tc.requestAccessToken();
  } catch (e) { window.UF.toast(e.message); }
}
async function api(path, opt = {}) {
  const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/' + path, { ...opt, headers: { Authorization: 'Bearer ' + M.token, 'Content-Type': 'application/json', ...(opt.headers || {}) } });
  if (!r.ok) throw new Error('Gmail: ' + r.status); return r.json();
}
const hdr = (m, n) => (m.payload?.headers || []).find(h => h.name.toLowerCase() === n.toLowerCase())?.value || '';
const b64d = s => { try { return new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))); } catch (e) { return ''; } };
function textOf(p) { if (!p) return ''; if (p.mimeType === 'text/plain' && p.body?.data) return b64d(p.body.data); for (const c of p.parts || []) { const t = textOf(c); if (t) return t; } return ''; }
async function refresh() {
  try {
    const box = M.folder === 'sent' ? 'SENT' : 'INBOX';
    const l = await api(`messages?maxResults=25&labelIds=${box}`);
    const msgs = await Promise.all((l.messages || []).map(x => api(`messages/${x.id}?format=full`)));
    M.live = msgs.map(m => { const from = hdr(m, 'From'); return { id: m.id, threadId: m.threadId, folder: box === 'SENT' ? 'sent' : 'inbox', from: from.replace(/<.*>/, '').trim() || from, email: (from.match(/<(.*)>/) || [, from])[1], to: hdr(m, 'To'),
      subject: hdr(m, 'Subject'), msgId: hdr(m, 'Message-ID'), date: new Date(+m.internalDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }), snippet: m.snippet, body: textOf(m.payload) || m.snippet,
      unread: (m.labelIds || []).includes('UNREAD'), star: (m.labelIds || []).includes('STARRED') }; });
    window.UF.toast(`Gmail connected: ${M.live.length} messages loaded.`); rerender();
  } catch (e) { window.UF.toast(e.message + '. Try Connect again.'); M.token = null; }
}
function rfc822({ to, cc, bcc, subject, body, inReplyTo }) {
  const enc = s => /[^\x00-\x7F]/.test(s) ? '=?UTF-8?B?' + btoa(String.fromCharCode(...new TextEncoder().encode(s))) + '?=' : s;
  const lines = [`To: ${to}`, cc ? `Cc: ${cc}` : null, bcc ? `Bcc: ${bcc}` : null, `Subject: ${enc(subject || '')}`, inReplyTo ? `In-Reply-To: ${inReplyTo}` : null, inReplyTo ? `References: ${inReplyTo}` : null,
    'MIME-Version: 1.0', 'Content-Type: text/plain; charset=UTF-8', 'Content-Transfer-Encoding: 8bit', '', body || ''].filter(x => x !== null);
  const bytes = new TextEncoder().encode(lines.join('\r\n'));
  let bin = ''; bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/* ---------- events ---------- */
function rerender() { if (!location.hash.startsWith('#/inbox')) return; document.getElementById('view').innerHTML = render(M.routed); window.UF && window.UF.nav(); }
function startCompose(c) { M.compose = c; if (!location.hash.startsWith('#/inbox')) { location.hash = '#/inbox'; setTimeout(() => startCompose(c), 30); return; } rerender(); setTimeout(() => document.querySelector('.compose [name=' + (c.to ? 'body' : 'to') + ']')?.focus(), 0); }
function dropDraft() { const id = M.compose && M.compose.draftId; if (id) { M.local = M.local.filter(x => x.id !== id); LS.set('uf-mail-local', M.local); } }
const find = id => (M.live || demo).concat(M.local).find(m => m.id === id);
const quote = m => `\n\n\nOn ${m.date}, ${m.from} wrote:\n> ` + (m.body || '').replace(/\n/g, '\n> ');

document.addEventListener('click', e => {
  const t = e.target.closest('[data-m]'); if (!t || t.tagName === 'FORM') return;
  const a = t.dataset.m, v = t.dataset.v, m = v && find(v);
  if (a === 'folder') { M.folder = v; M.lane = null; M.open = null; M.routed = null; history.replaceState(null, '', '#/inbox'); if (M.live && (v === 'inbox' || v === 'sent')) refresh(); rerender(); }
  else if (a === 'lane') { M.folder = 'lane'; M.lane = v; M.open = null; M.routed = null; history.replaceState(null, '', '#/inbox'); rerender(); }
  else if (a === 'open') { if (m && m.folder === 'drafts') { startCompose({ ...m, title: 'Draft', draftId: m.id }); return; } M.open = v; M.routed = v; if (m) { m.unread = false; keepFlags(m); } history.replaceState(null, '', '#/inbox/' + v); rerender(); }
  else if (a === 'star') { m.star = !m.star; keepFlags(m); rerender(); }
  else if (a === 'compose') startCompose({});
  else if (a === 'reply' || a === 'replyall') startCompose({ title: 'Reply', to: m.email, cc: a === 'replyall' ? (m.to || '') : '', subject: /^re:/i.test(m.subject) ? m.subject : 'RE: ' + m.subject, body: quote(m), threadId: m.threadId, inReplyTo: m.msgId });
  else if (a === 'usedraft') startCompose({ title: 'Reply', to: m.email, subject: /^re:/i.test(m.subject) ? m.subject : 'RE: ' + m.subject, body: m.draft + quote(m) });
  else if (a === 'forward') startCompose({ title: 'Forward', subject: 'FW: ' + m.subject, body: '\n\n---------- Forwarded message ----------\nFrom: ' + m.from + ' <' + (m.email || '') + '>\nSubject: ' + m.subject + '\n\n' + (m.body || '') });
  else if (a === 'discard') { M.compose = null; rerender(); }
  else if (a === 'savedraft') { const d = Object.fromEntries(new FormData(t.closest('form'))); dropDraft(); M.local.unshift({ id: 'l' + Date.now(), folder: 'drafts', from: 'You', date: 'Now', ...d }); LS.set('uf-mail-local', M.local); M.compose = null; rerender(); window.UF.toast('Draft saved.'); }
  else if (a === 'gmail') { const d = Object.fromEntries(new FormData(t.closest('form'))); const qs = [['to', 'to'], ['cc', 'cc'], ['bcc', 'bcc'], ['subject', 'su'], ['body', 'body']].filter(([k]) => d[k]).map(([k, p]) => p + '=' + encodeURIComponent(d[k])).join('&');
    window.open('https://mail.google.com/mail/?view=cm&fs=1&' + qs, '_blank', 'noopener'); window.UF.toast('Gmail opened in a new tab with this mail. Press Send there.'); }
  else if (a === 'connect') connect();
  else if (a === 'disconnect') { if (M.token && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(M.token); M.token = null; M.live = null; rerender(); window.UF.toast('Gmail disconnected.'); }
  else if (a === 'refresh') refresh();
}, true);
document.addEventListener('input', e => { if (!e.target.closest('form.mail__search')) return; M.q = e.target.value; const pos = e.target.selectionStart; rerender(); const i = document.querySelector('.mail__search input'); if (i) { i.focus(); i.setSelectionRange(pos, pos); } });
document.addEventListener('submit', async e => {
  const f = e.target; if (!f.matches('form[data-m]')) return; e.preventDefault(); e.stopPropagation();
  if (f.dataset.m === 'search') { M.q = new FormData(f).get('q'); rerender(); return; }
  const d = Object.fromEntries(new FormData(f)); const c = M.compose || {};
  if (M.token) {
    try { await api('messages/send', { method: 'POST', body: JSON.stringify({ raw: rfc822({ ...d, inReplyTo: c.inReplyTo }), ...(c.threadId ? { threadId: c.threadId } : {}) }) }); window.UF.toast(`Sent to ${d.to} from your Gmail.`); }
    catch (err) { window.UF.toast(err.message + '. Not sent.'); return; }
  } else window.UF.toast(`Sent to ${d.to}. It is in Sent (example mode, not delivered).`);
  dropDraft(); M.local.unshift({ id: 'l' + Date.now(), folder: 'sent', from: 'You', email: d.to, date: 'Today', mock: !M.token, ...d }); LS.set('uf-mail-local', M.local);
  M.compose = null; M.folder = 'sent'; M.open = M.local[0].id; rerender();
}, true);

window.UFMail = { render, connect, get connected() { return !!M.token; }, get unread() { return counts().inbox; },
  all: () => (M.live || demo).concat(M.local),
  isUnread: id => { const m = demo.find(x => x.id === id); return !!(m && m.unread); },
  compose: c => startCompose({ title: 'New message', ...c }),
  send(d) { if (M.token) api('messages/send', { method: 'POST', body: JSON.stringify({ raw: rfc822(d) }) }).catch(e => window.UF.toast(e.message + '. Not sent.'));
    M.local.unshift({ id: 'l' + Date.now() + Math.floor(Math.random() * 99), folder: 'sent', from: 'You', email: d.to, to: d.to, subject: d.subject, body: d.body, attach: d.attach, date: 'Today', mock: !M.token }); LS.set('uf-mail-local', M.local); },
  dump: () => JSON.stringify(M.local), restore: s => { M.local = JSON.parse(s); LS.set('uf-mail-local', M.local); } };
})();
