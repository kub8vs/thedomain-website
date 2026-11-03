/* menu, section links and call booking (plain JS, outside the story template) */
(function () {
  var D = document, R = D.documentElement;
  var MAIL = 'kub.mktg@gmail.com';
  var DN = ['nd', 'pon', 'wt', 'śr', 'czw', 'pt', 'sob'];
  var MN = ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'];
  var MF = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca', 'sierpnia', 'września', 'października', 'listopada', 'grudnia'];
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
    if (open) {
      menu(false); fillDays();
      var f = D.getElementById('bkF'), ok = D.querySelector('.bk-ok');
      if (f && ok && !ok.hidden && f.dataset.sent) { ok.hidden = true; f.hidden = false; f.reset(); delete f.dataset.sent; }
    }
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

  function label(dayIso, time) {
    var p = dayIso.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
    return DN[d.getDay()] + ', ' + d.getDate() + ' ' + MF[d.getMonth()] + ' ' + d.getFullYear() + ', ' + time;
  }
  function gcal(dayIso, time, title, details) {
    var s = dayIso.replace(/-/g, '') + 'T' + time.replace(':', '') + '00';
    var hm = time.split(':'), end = +hm[0] * 60 + +hm[1] + 30;
    var e = dayIso.replace(/-/g, '') + 'T' + pad(Math.floor(end / 60)) + pad(end % 60) + '00';
    return 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent(title) + '&dates=' + s + '/' + e + '&ctz=Europe/Warsaw&details=' + encodeURIComponent(details);
  }

  D.addEventListener('submit', function (e) {
    var f = e.target; if (f.id !== 'bkF') return;
    e.preventDefault();
    var err = f.querySelector('.bk-err'), btn = f.querySelector('.bk-send');
    var v = function (n) { var x = f.elements[n]; return x ? x.value.trim() : ''; };
    if (v('_honey')) return;
    if (!sel.d) { err.textContent = 'Wybierz dzień rozmowy.'; return; }
    if (!sel.t) { err.textContent = 'Wybierz godzinę rozmowy.'; return; }
    if (!v('imie')) { err.textContent = 'Wpisz imię i nazwisko.'; f.elements.imie.focus(); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v('email'))) { err.textContent = 'Wpisz poprawny adres e-mail.'; f.elements.email.focus(); return; }
    err.textContent = '';
    var needs = Array.prototype.map.call(f.querySelectorAll('input[name="potrzeby"]:checked'), function (x) { return x.value; }).join(', ');
    var when = label(sel.d, sel.t);
    var info = v('imie') + ' · ' + v('email') + (v('telefon') ? ' · ' + v('telefon') : '') + (v('firma') ? '\n' + v('firma') : '') + (needs ? '\nPotrzeby: ' + needs : '') + (v('wiadomosc') ? '\n\n' + v('wiadomosc') : '');
    var payload = {
      _subject: 'Nowy call: ' + v('imie') + ' · ' + when,
      _template: 'table',
      _captcha: 'false',
      'Termin': when + ' (30 min, czas polski)',
      'Imię i nazwisko': v('imie'),
      email: v('email'),
      'Telefon': v('telefon') || '-',
      'Firma / strona / IG': v('firma') || '-',
      'Potrzeby': needs || '-',
      'Wiadomość': v('wiadomosc') || '-',
      'Dodaj do kalendarza': gcal(sel.d, sel.t, 'Call: ' + v('imie') + ' (The Domain)', info)
    };
    btn.disabled = true; btn.firstChild.nodeValue = 'Wysyłam… ';
    fetch('https://formsubmit.co/ajax/' + MAIL, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(payload) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function () {
        f.dataset.sent = '1'; f.hidden = true;
        var ok = D.querySelector('.bk-ok'); ok.hidden = false;
        ok.querySelector('[data-okt]').textContent = 'Termin: ' + when + '. Potwierdzenie i link do rozmowy wyślę na ' + v('email') + ' w ciągu 24 godzin.';
        ok.querySelector('[data-okcal]').href = gcal(sel.d, sel.t, 'Call z The Domain', 'Rozmowa o projekcie z The Domain. Link do spotkania przyjdzie mailem.');
      })
      .catch(function () {
        err.innerHTML = 'Nie udało się wysłać. Napisz proszę na <a href="mailto:' + MAIL + '?subject=' + encodeURIComponent('Call: ' + when) + '" style="color:#F3F2EE">' + MAIL + '</a>.';
      })
      .then(function () { btn.disabled = false; btn.firstChild.nodeValue = 'Umów się na call '; });
  });
})();
