/* Stress mode: open the hi-fi with ?stress=1.
   After every render it makes the content worst-case long, the way real Uniframe data can be:
   - names, articles, suppliers, subjects and notes get 10+ extra words,
   - one long Dutch compound word with no break point,
   - amounts become 7 digits (€ 1,234,567.89).
   window.__stressReport() measures every visible element for overflow, clipping and broken layout. */
(() => {
  if (!/[?&]stress=1/.test(location.search)) return;
  const LONG = ' Interieurbouw en Projectinrichting Noord-Holland vestiging Amsterdam-Zuidoost B.V.';
  const WORD = ' brandwerendeglazensysteemwandafdichtingsprofielen';
  const TARGETS = ['.row > span:first-child', '.row.two b', '.row.two small', 'h1', '.rail h2', '.rail .sub', '.kv b', '.kv span',
    'td', '.mail h2', '.mail p', '.agentline', '.chip', '.ask', '.seg button', '.field input', '#anchor', '.hint', '.meta', '.alt'];
  const isMoney = /€\s?[\d.,]+/g, hasMoney = /€\s?[\d.,]+/;
  function stretch() {
    document.querySelectorAll(TARGETS.join(',')).forEach(el => {
      if (el.dataset.stressed) return; el.dataset.stressed = '1';
      if (el.tagName === 'H1' && !document.querySelector('.back')) return;   /* page names like "Today" never get long; record names do */
      if (el.tagName === 'INPUT') { if (!/folie|addr|signer|artq|relq|artcost|artmargin/.test(el.id)) el.value += LONG; return; }
      const tn = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!tn) return;
      let t = tn.textContent;
      if (hasMoney.test(t)) { tn.textContent = t.replace(isMoney, '€ 1,234,567.89'); return; }
      if (/^\s*[\d.,%\s]+\s*$/.test(t) || t.trim().length < 3) return;              /* plain numbers and tiny labels stay */
      if (el.matches('td.num')) return;                                          /* quantities and amounts never get long */
      if (el.matches('td') && el.cellIndex > 1 && !/[a-z]{4}/i.test(t)) return;       /* qty, unit columns stay */
      tn.textContent = t + (el.matches('h1, .rail h2, .row > span:first-child, td') ? LONG + WORD : LONG);
    });
  }
  function restack() { document.querySelectorAll('.seg').forEach(g => { if ([...g.querySelectorAll('button')].some(b => b.innerText.length > 22)) g.classList.add('stack'); }); }
  const obs = new MutationObserver(() => { obs.disconnect(); stretch(); restack(); obs.observe(document.body, { childList: true, subtree: true }); });
  addEventListener('load', () => { stretch(); restack(); obs.observe(document.body, { childList: true, subtree: true }); document.title = 'STRESS · ' + document.title; });
  window.__stressReport = () => {
    const vis = e => { const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    const out = { overflowX: [], clippedByParent: [], ellipsis: 0, anchorLines: 0, rowsOver3Lines: 0, railFactsScroll: false, pageScroll: false, h1Lines: 0 };
    document.querySelectorAll('#page *, #side *').forEach(e => {
      if (!vis(e)) return; const s = getComputedStyle(e);
      if (s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth) out.ellipsis++;
      else if (e.scrollWidth > e.clientWidth + 1 && s.overflowX !== 'auto' && s.overflowX !== 'scroll' && !['TEXTAREA', 'INPUT'].includes(e.tagName)) out.overflowX.push((e.className || e.tagName) + ':' + Math.round(e.scrollWidth - e.clientWidth) + 'px');
      const p = e.parentElement; if (p && p.id !== 'page') { const r = e.getBoundingClientRect(), q = p.getBoundingClientRect(); if (r.right > q.right + 2 && getComputedStyle(p).overflowX === 'visible' && !e.closest('.work')) out.clippedByParent.push(e.className || e.tagName); }
    });
    const a = document.querySelector('#anchor'); if (a) out.anchorLines = Math.round(a.scrollHeight / parseFloat(getComputedStyle(a).lineHeight || 20));
    out.anchorFits = a ? a.scrollWidth <= a.clientWidth + 1 && a.scrollHeight <= a.clientHeight + 1 : null;
    document.querySelectorAll('.row').forEach(r => { if (r.getBoundingClientRect().height > 3 * 21 + 16) out.rowsOver3Lines++; });
    const f = document.querySelector('.facts'); out.railFactsScroll = !!f && f.scrollHeight > f.clientHeight + 2;
    const h = document.querySelector('h1'); if (h) out.h1Lines = Math.round(h.getBoundingClientRect().height / 31);
    out.pageScroll = document.scrollingElement.scrollHeight > innerHeight + 1;
    out.overflowX = [...new Set(out.overflowX)].slice(0, 8); out.clippedByParent = [...new Set(out.clippedByParent)].slice(0, 8);
    return out;
  };
})();
