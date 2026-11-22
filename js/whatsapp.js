/* WhatsApp channel. Shows WhatsApp conversations next to the Inbox, so the agent can turn a chat
   (text, voice messages, photos of handwritten notes) into a request.
   Prototype: the conversations are examples, and a chat can be imported from WhatsApp's own "Export chat" (.txt).
   A live connection needs the WhatsApp Business Platform from Meta and a small server that receives the messages. */
(() => {
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const I = n => window.ufIcon(n);
const LS = { get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} } };

const demo = [
  { id: 'w1', name: 'Ruben Aalbers', company: 'Bentacera', phone: '+31 6 4182 7731', unread: true, msgs: [
    { who: 'them', time: '23 Nov 08:41', text: 'Goedemorgen Arjan, kun je een prijs maken voor onze nieuwe vergaderruimte?' },
    { who: 'them', time: '23 Nov 08:42', text: 'Glazen wand van 7 meter, 3 meter hoog, met 1 deur.' },
    { who: 'them', time: '23 Nov 08:44', kind: 'voice', dur: '0:21', transcript: 'Oplevering graag in week 14. Het adres is Utrechtseweg 31 in Zeist. De tekening stuur ik er zo bij.' },
    { who: 'them', time: '23 Nov 08:47', kind: 'photo', caption: 'Handgeschreven schets met maten: wand 7000 mm, hoogte 3000 mm, deur links' } ] },
  { id: 'w2', name: 'Femke Jansen', company: '', phone: '+31 6 2847 1190', unread: true, msgs: [
    { who: 'them', time: '22 Nov 16:05', text: 'Goedemiddag, wij zoeken een systeemwand voor onze praktijk in Arnhem.' },
    { who: 'them', time: '22 Nov 16:06', text: 'Ongeveer 15 m glas met 3 deuren, hoogte 2,8 m. Kunt u een offerte maken?' },
    { who: 'them', time: '22 Nov 16:06', text: 'Femke Jansen\nFysio Rijn\nfemke@fysiorijn.nl' } ] },
  { id: 'w3', name: 'Kees Vos', company: 'Inter-Fact', phone: '+31 6 1093 5528', msgs: [
    { who: 'them', time: '21 Nov 11:20', text: 'Zijn de deuren voor kantoor 2 al besteld?' },
    { who: 'us', time: '21 Nov 11:32', text: 'Ja, ze komen in week 50 binnen.' } ] },
];
const W = { open: null, local: LS.get('uf-wa-local', []), flags: LS.get('uf-wa-flags', {}) };
const all = () => W.local.concat(demo).map(c => ({ ...c, ...(W.flags[c.id] || {}) }));
const find = id => all().find(c => c.id === id);
const keep = () => { LS.set('uf-wa-local', W.local); LS.set('uf-wa-flags', W.flags); };
const flag = (id, o) => { W.flags[id] = { ...(W.flags[id] || {}), ...o }; keep(); };

/* Text the agent reads: every message, with transcripts of voice messages and descriptions of photos. */
function text(id) {
  const c = find(id); if (!c) return '';
  return `WhatsApp-gesprek met ${c.name}${c.company ? ` (${c.company})` : ''}${c.phone ? `, ${c.phone}` : ''}\n\n` + c.msgs.filter(m => m.who === 'them').map(m =>
    m.kind === 'voice' ? `[Spraakbericht ${m.dur}] ${m.transcript || ''}` : m.kind === 'photo' ? `[Foto] ${m.caption || ''}` : m.text).join('\n');
}
function bubble(m) {
  const body = m.kind === 'voice' ? `<span class="wa-voice">${I('mic')}<b>Voice message ${esc(m.dur)}</b></span>${m.transcript ? `<span class="wa-tr">Transcript: ${esc(m.transcript)}</span>` : ''}`
    : m.kind === 'photo' ? `<span class="wa-photo">${I('camera')}<b>Photo</b></span><span class="wa-tr">${esc(m.caption || '')}</span>` : esc(m.text).replace(/\n/g, '<br>');
  return `<div class="wa-msg wa-msg--${m.who}"><div class="wa-bub">${body}</div><time>${esc(m.time)}${m.mock ? ' · not delivered (example)' : ''}</time></div>`;
}
function render(id) {
  if (id && find(id)) { W.open = id; if (find(id).unread) flag(id, { unread: false }); }
  const list = all(), c = W.open && find(W.open);
  return `<header class="rec-head"><nav class="crumbs"><span>Home</span></nav>
      <div class="rec-head__row"><div class="rec-head__title"><h1 class="uf-page-title">WhatsApp</h1><span class="uf-pill uf-pill--neutral">Example conversations</span></div>
      <div class="rec-head__actions"><label class="uf-pbtn uf-pbtn--secondary">${I('upload')}Import chat<input type="file" id="waimport" accept=".txt,text/plain" hidden></label></div></div></header>
    <p class="lead">Conversations from the company WhatsApp number. Import a chat with WhatsApp's Export chat (without media). A live connection is set up under Settings → Connections.</p>
    <div class="mail wa">
      <section class="mail__list" aria-label="Conversations">
        ${list.map(x => `<a class="mrow ${x.unread ? 'is-unread' : ''} ${c && x.id === c.id ? 'is-open' : ''}" href="#/whatsapp/${x.id}">
          <span class="mrow__top"><span class="mrow__from">${esc(x.name)}${x.company ? `, ${esc(x.company)}` : ''}</span><span class="mrow__date">${esc((x.msgs[x.msgs.length - 1] || {}).time || '')}</span></span>
          <span class="mrow__snip">${esc(((m) => m.kind === 'voice' ? 'Voice message' : m.kind === 'photo' ? 'Photo' : m.text)(x.msgs[x.msgs.length - 1] || {}).slice(0, 80))}</span>
          ${x.lane ? `<span class="uf-pill uf-pill--${x.lane[0]}">${esc(x.lane[1])}</span>` : ''}</a>`).join('')}
      </section>
      <article class="mail__read wa__read" aria-label="Conversation">${c ? `
        <div class="mread__head"><h2>${esc(c.name)}${c.company ? `, ${esc(c.company)}` : ''}</h2><span class="muted">${esc(c.phone || 'Imported chat')}</span></div>
        ${c.agent ? `<section class="agent agent--mail"><div class="agent__head">${I('agent')}<h2>Agent summary</h2></div><div class="agent__body"><p>${esc(c.agent)}</p></div>${c.link ? `<div class="agent__actions"><a class="uf-pbtn uf-pbtn--secondary uf-pbtn--sm" href="${c.link[0]}">${esc(c.link[1])}</a></div>` : ''}</section>` : ''}
        <div class="wa-thread">${c.msgs.map(bubble).join('')}</div>
        <div class="mread__actions">${c.agent ? '' : `<button class="uf-pbtn uf-pbtn--primary" data-waread="${c.id}">${I('agent')}Create request</button>`}</div>
        <form class="wa-reply" data-wareply="${c.id}"><label class="sr" for="wamsg">Reply</label><input class="field" id="wamsg" placeholder="Type a reply" autocomplete="off"><button class="uf-pbtn uf-pbtn--secondary" type="submit">${I('send')}Send</button></form>`
      : '<p class="mail__empty">Select a conversation.</p>'}</article>
    </div>`;
}
/* WhatsApp "Export chat" formats: "23-11-2026 08:41 - Naam: tekst" and "[23/11/2026, 08:41:12] Naam: tekst". */
function parseExport(raw, fileName) {
  const re = /^\[?(\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4}),?\s+(\d{1,2}:\d{2})(?::\d{2})?\]?\s*(?:-\s*)?([^:]{1,60}):\s?(.*)$/;
  const msgs = []; let names = new Set();
  String(raw).replace(/\r/g, '').split('\n').forEach(line => {
    const m = line.replace(/^‎/, '').match(re);
    if (m) { names.add(m[3].trim()); const t = m[4]; msgs.push({ who: 'them', name: m[3].trim(), time: `${m[1]} ${m[2]}`, ...( /<(media|bijlage) (omitted|weggelaten)>|audio weggelaten|afbeelding weggelaten/i.test(t) ? { kind: /audio|ptt|opus/i.test(t) ? 'voice' : 'photo', dur: '', transcript: '', caption: 'Not included in the export' } : { text: t }) }); }
    else if (msgs.length && line.trim()) { const last = msgs[msgs.length - 1]; if (last.text != null) last.text += '\n' + line; }
  });
  if (!msgs.length) return null;
  const counts = {}; msgs.forEach(m => { counts[m.name] = (counts[m.name] || 0) + 1; });
  const other = Object.keys(counts).find(n => !/uniframe|arjan|joost|you|jij/i.test(n)) || Object.keys(counts)[0];
  msgs.forEach(m => { if (m.name !== other) m.who = 'us'; delete m.name; });
  const c = { id: 'wl' + Date.now(), name: other, company: '', phone: '', unread: false, msgs: msgs.slice(-200), imported: true };
  W.local.unshift(c); keep(); return c.id;
}
document.addEventListener('change', e => {
  if (e.target.id !== 'waimport' || !e.target.files[0]) return;
  const f = e.target.files[0], r = new FileReader();
  r.onload = () => { const id = parseExport(r.result, f.name); if (!id) { window.UF.toast('This file is not a WhatsApp chat export. In WhatsApp: open the chat, More, Export chat, Without media.'); return; } location.hash = '#/whatsapp/' + id; window.UF.toast('Chat imported. Press Create request to let the agent read it.'); };
  r.readAsText(f);
});
document.addEventListener('submit', e => {
  const f = e.target; if (!f.matches('[data-wareply]')) return; e.preventDefault();
  const v = f.querySelector('input').value.trim(), id = f.dataset.wareply; if (!v) return;
  const local = W.local.find(c => c.id === id); const msg = { who: 'us', time: 'Today', text: v, mock: true };
  if (local) local.msgs.push(msg); else flag(id, { msgs: [...find(id).msgs, msg] });
  keep(); window.UF.route(); window.UF.toast('Reply saved in the conversation. In example mode it is not sent to WhatsApp.');
});
window.UFWhatsApp = { render, get: find, all, text,
  setAgent(id, agent, link, lane) { flag(id, { agent, link, lane, unread: false }); },
  dump: () => JSON.stringify({ local: W.local, flags: W.flags }),
  restore(s) { const o = JSON.parse(s); W.local = o.local || []; W.flags = o.flags || {}; keep(); },
  get unread() { return all().filter(c => c.unread).length; } };
})();
