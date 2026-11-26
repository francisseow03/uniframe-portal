/* Walk recorder: logs every click, scroll and key while a person (or Claude) walks a task.
   Paste into the console, or include with <script>. Read the result with __walk.report().
   Pointing cost uses Fitts's law (Shannon form): ID = log2(D / W + 1), W = smaller side of the target.
   Movement time estimate MT = 0.1 + 0.15 × ID seconds per click (typical mouse values, MacKenzie 1992). */
(() => {
  if (window.__walk) return;
  const W = window.__walk = {
    clicks: [], scrolls: 0, keys: 0, typed: 0, start: null,
    reset() { W.clicks = []; W.scrolls = 0; W.keys = 0; W.typed = 0; W.start = performance.now(); return 'reset'; },
    report() {
      let travel = 0, idSum = 0, rows = [];
      W.clicks.forEach((c, i) => {
        const p = W.clicks[i - 1];
        const d = p ? Math.hypot(c.x - p.x, c.y - p.y) : 0;
        const id = p ? Math.log2(d / Math.max(8, Math.min(c.w, c.h)) + 1) : 0;
        travel += d; idSum += id;
        rows.push({ n: i + 1, label: c.label, page: c.page, x: Math.round(c.x), y: Math.round(c.y), size: Math.round(c.w) + '×' + Math.round(c.h), dist: Math.round(d), id: +id.toFixed(2) });
      });
      return { clicks: W.clicks.length, travel_px: Math.round(travel), fitts_bits: +idSum.toFixed(1), est_pointing_s: +(W.clicks.length * 0.1 + idSum * 0.15).toFixed(1), scrolls: W.scrolls, keys: W.keys, rows };
    },
  };
  let lastScroll = 0;
  addEventListener('click', e => {
    const t = e.target.closest('button,a,[role=button],input,select,textarea,label,[data-act]') || e.target;
    const r = t.getBoundingClientRect();
    W.clicks.push({ x: e.clientX, y: e.clientY, w: r.width, h: r.height, page: location.hash || location.pathname,
      label: (t.getAttribute('aria-label') || t.innerText || t.value || t.name || t.tagName).trim().replace(/\s+/g, ' ').slice(0, 40) });
  }, true);
  addEventListener('scroll', () => { const now = performance.now(); if (now - lastScroll > 400) W.scrolls++; lastScroll = now; }, true);
  addEventListener('keydown', e => { W.keys++; if (e.key.length === 1) W.typed++; }, true);
  W.reset();
})();
