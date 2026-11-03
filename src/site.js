/* menu, section links and call booking (plain JS, outside the story template) */
(function () {
  var D = document, R = D.documentElement;
  var DN = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
  var MN = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  var sel = { d: null, t: null };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };
  var iso = function (d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };

  function workdays(n) {
    var out = [], d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
    while (out.length < n) { var w = d.getDay(); if (w > 0 && w < 6) out.push(new Date(d)); d.setDate(d.getDate() + 1); }
    return out;
  }
  function fillDays() {
    var els = D.querySelectorAll('[data-days]');
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.firstChild) {
        var n = +el.getAttribute('data-days') || 5;
        el.innerHTML = workdays(n).map(function (d) {
          return '<button type="button" class="gc-d" data-day="' + iso(d) + '"><span>' + DN[d.getDay()] + '</span><b>' + d.getDate() + '</b><span>' + MN[d.getMonth()] + '</span></button>';
        }).join('');
      }
    }
    sync();
  }
  function sync() {
    var b = D.querySelectorAll('.gc-d');
    for (var i = 0; i < b.length; i++) b[i].classList.toggle('on', b[i].getAttribute('data-day') === sel.d);
    var t = D.querySelectorAll('.gc-t');
    for (var j = 0; j < t.length; j++) t[j].classList.toggle('on', t[j].getAttribute('data-time') === sel.t);
  }
  // the story template can re-render; keep the day pickers filled
  setInterval(fillDays, 600);
  function onScroll() { R.classList.toggle('scrolled', (window.scrollY || 0) > 80); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
  D.addEventListener('DOMContentLoaded', fillDays);
  fillDays();

  function menu(open) {
    R.classList.toggle('menu-open', open);
    var b = D.querySelectorAll('[data-menu]');
    for (var i = 0; i < b.length; i++) b[i].setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  function book(open) {
    R.classList.toggle('bk-open', open);
    var m = D.querySelector('.bk');
    if (m) m.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (open) { menu(false); loadCal(); }
  }
  function goTo(hash) {
    if (hash === '#top' || hash === '#start') { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    var el = D.getElementById(hash.slice(1)); if (!el) return;
    var y = el.getBoundingClientRect().top + window.scrollY;
    if (el.querySelector(':scope > .stage')) y += Math.max(0, el.offsetHeight - window.innerHeight) * 0.3;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  D.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target : e.target.parentElement;
    var m = t.closest('[data-menu]');
    if (m) { e.preventDefault(); menu(!R.classList.contains('menu-open')); return; }
    var b = t.closest('[data-book]');
    if (b) { e.preventDefault(); book(true); return; }
    var c = t.closest('[data-close]');
    if (c) { e.preventDefault(); book(false); return; }
    var n = t.closest('[data-nav]');
    if (n) { e.preventDefault(); menu(false); goTo(n.getAttribute('href')); return; }
    var d = t.closest('.gc-d');
    if (d) { sel.d = d.getAttribute('data-day'); sync(); return; }
    var h = t.closest('.gc-t');
    if (h) { sel.t = h.getAttribute('data-time'); sync(); return; }
    if (R.classList.contains('menu-open') && !t.closest('.menu-p')) menu(false);
    if (R.classList.contains('bk-open') && t.classList.contains('bk')) book(false);
  });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape') { menu(false); book(false); } });
  if (location.hash === '#umow') setTimeout(function () { book(true); }, 400);

  // ---- Cal.com inline calendar in the booking modal (real free slots, Google Meet link, reminders)
  var CAL_LINK = 'jakub-zimnicki-dusys3/the-domain', calOn = false;
  function loadCal() {
    if (calOn) return; calOn = true;
    (function (C, A, L) { var p = function (a, ar) { a.q.push(ar); }; var d = C.document; C.Cal = C.Cal || function () { var cal = C.Cal; var ar = arguments; if (!cal.loaded) { cal.ns = {}; cal.q = cal.q || []; d.head.appendChild(d.createElement('script')).src = A; cal.loaded = true; } if (ar[0] === L) { var api = function () { p(api, arguments); }; var namespace = ar[1]; api.q = api.q || []; if (typeof namespace === 'string') { cal.ns[namespace] = cal.ns[namespace] || api; p(cal.ns[namespace], ar); p(cal, ['initNamespace', namespace]); } else p(cal, ar); return; } p(cal, ar); }; })(window, 'https://app.cal.com/embed/embed.js', 'init');
    var box = D.getElementById('calInline'); if (box) box.innerHTML = '';
    var cfg = { layout: 'month_view', theme: 'dark' };
    if (sel.d) { cfg.date = sel.d; cfg.month = sel.d.slice(0, 7); }
    window.Cal('init', 'td', { origin: 'https://cal.com' });
    window.Cal.ns.td('inline', { elementOrSelector: '#calInline', calLink: CAL_LINK, config: cfg });
    window.Cal.ns.td('ui', { theme: 'dark', layout: 'month_view', hideEventTypeDetails: false, cssVarsPerTheme: { dark: { 'cal-brand': '#F3F2EE', 'cal-brand-text': '#0B0B0B' } } });
  }
})();
