const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const PIN_KEY = 'dbot-pin';
let pin = ''; try { pin = localStorage.getItem(PIN_KEY) || ''; } catch {}
let data = null, range = '24', logFilter = 'all';

// ---------- formatowanie ----------
const zl = (x, d = 2) => (x ?? 0).toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d });
const sign = x => (x > 0 ? '+' : x < 0 ? '−' : '') + zl(Math.abs(x));
const pct = x => x == null ? '–' : (x > 0 ? '+' : x < 0 ? '−' : '') + zl(Math.abs(x)) + '%';
const cls = x => x > 0.004 ? 'up' : x < -0.004 ? 'down' : 'mut';
const TZ = { timeZone: 'Europe/Warsaw' };
const hm = iso => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', ...TZ });
const dayKey = iso => new Date(iso).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', ...TZ });
const tPL = iso => new Date(iso).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', ...TZ });
const px = x => x == null ? '–' : x >= 10 ? zl(x, 2) : x >= 0.01 ? zl(x, 4) : x.toPrecision(3).replace('.', ',');
const qtyF = q => q < 1 ? zl(q, 6) : Math.round(q).toLocaleString('pl-PL');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const COIN = {
  SOL: ['#9945FF', '#14F195'], DOGE: ['#C2A633', '#E6CE6A'], SHIB: ['#E42D04', '#FFA409'], PEPE: ['#3D9A3A', '#7BC96F'],
  BONK: ['#F7931A', '#FFC24B'], WIF: ['#A0715A', '#D9A88F'], FARTCOIN: ['#5BA94F', '#B9E07A'], PENGU: ['#5AA7F2', '#A6D4FF'],
  TRUMP: ['#B8860B', '#F2C14E'], BTC: ['#F7931A', '#FFB84D'], ETH: ['#627EEA', '#9DB0F5'], SPY: ['#0A84FF', '#64B5FF'], QQQ: ['#5E5CE6', '#9D9BFF'],
};
const avatar = (sym, sm) => { const [a, b] = COIN[sym] || ['#636366', '#8E8E93']; return `<span class="av${sm ? ' sm' : ''}" style="background:linear-gradient(140deg,${a},${b})">${esc(sym.slice(0, sym.length > 4 ? 2 : 3))}</span>`; };

function toast(msg, ms = 3400) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); }

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-pin': pin, ...(opts.headers || {}) } });
  if (r.status === 401) { showPin(); throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Błąd ' + r.status);
  return j;
}

// ---------- kod dostępu (klawiatura jak w iOS) ----------
const PIN_LEN = 6;
let typed = '';
function drawDots() { $('#dots').innerHTML = Array.from({ length: PIN_LEN }, (_, i) => `<i class="${i < typed.length ? 'f' : ''}"></i>`).join(''); }
function showPin(err) { typed = ''; drawDots(); $('#pin').hidden = false; $('#pinErr').textContent = err || ''; }
$('#keypad').innerHTML = ['1', '2|ABC', '3|DEF', '4|GHI', '5|JKL', '6|MNO', '7|PQRS', '8|TUV', '9|WXYZ', '', '0', '⌫']
  .map(k => { const [n, l] = k.split('|'); return k === '' ? '<span></span>' : `<button type="button" data-k="${n}" class="${n === '⌫' ? 'ghost' : ''}">${n === '⌫' ? 'Usuń' : n}${l ? `<small>${l}</small>` : ''}</button>`; }).join('');
$('#keypad').addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return;
  const k = b.dataset.k;
  if (k === '⌫') typed = typed.slice(0, -1); else if (typed.length < PIN_LEN) typed += k;
  drawDots();
  if (typed.length === PIN_LEN) {
    pin = typed;
    try { await load(); try { localStorage.setItem(PIN_KEY, pin); } catch {} $('#pin').hidden = true; }
    catch (err) { if (err.message === 'auth') { $('#dots').classList.add('shake'); setTimeout(() => { $('#dots').classList.remove('shake'); typed = ''; drawDots(); }, 420); $('#pinErr').textContent = 'Zły kod'; } }
  }
});
$('#logoutBtn').addEventListener('click', () => { try { localStorage.removeItem(PIN_KEY); } catch {} location.reload(); });

// ---------- zakładki i pasek tytułu ----------
const TITLES = { wynik: 'Wynik', portfel: 'Portfel', dziennik: 'Dziennik', notatki: 'Notatki', zasady: 'Zasady' };
function openTab(tab) {
  $$('.tabbar button').forEach(x => x.classList.toggle('on', x.dataset.tab === tab));
  $$('.view').forEach(v => v.hidden = v.dataset.view !== tab);
  $('#navTitle').textContent = TITLES[tab];
  window.scrollTo({ top: 0 }); onScroll();
  try { sessionStorage.setItem('dbot-tab', tab); } catch {}
}
$$('.tabbar button').forEach(b => b.addEventListener('click', () => openTab(b.dataset.tab)));
try { const t = sessionStorage.getItem('dbot-tab'); if (t && TITLES[t]) openTab(t); } catch {}
function onScroll() { $('#navbar').classList.toggle('show', window.scrollY > 56); }
window.addEventListener('scroll', onScroll, { passive: true });

$$('#rangeSeg button').forEach(b => b.addEventListener('click', () => { range = b.dataset.r; $$('#rangeSeg button').forEach(x => x.classList.toggle('on', x === b)); if (data) drawChart(data.equity, data.startCapitalPLN); }));
$$('#logSeg button').forEach(b => b.addEventListener('click', () => { logFilter = b.dataset.f; $$('#logSeg button').forEach(x => x.classList.toggle('on', x === b)); if (data) renderLog(data); }));

// ---------- arkusz ----------
function openSheet(title, html) {
  $('#sheetTitle').textContent = title; $('#sheetBody').innerHTML = html; $('#sheetBody').scrollTop = 0;
  $('#sheet').classList.remove('out'); $('#sheetWrap').hidden = false; document.body.style.overflow = 'hidden';
}
function closeSheet() { $('#sheet').classList.add('out'); setTimeout(() => { $('#sheetWrap').hidden = true; document.body.style.overflow = ''; }, 230); }
$('#sheetDim').addEventListener('click', closeSheet);
$('#sheetClose').addEventListener('click', closeSheet);
(() => { // przeciągnięcie w dół zamyka arkusz
  let y0 = null; const s = $('#sheet');
  s.addEventListener('touchstart', e => { if ($('#sheetBody').scrollTop <= 0) y0 = e.touches[0].clientY; }, { passive: true });
  s.addEventListener('touchmove', e => { if (y0 == null) return; const dy = e.touches[0].clientY - y0; if (dy > 0) s.style.transform = `translateY(${dy}px)`; }, { passive: true });
  s.addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; s.style.transform = ''; y0 = null; if (dy > 110) closeSheet(); });
})();
const kv = (k, v, c = '') => `<div class="cell kv"><span class="k">${k}</span><span class="v ${c}">${v}</span></div>`;

// ---------- wykres ----------
function sparkSVG(arr, w = 58, h = 26) {
  if (!arr || arr.length < 2) return '<svg class="spark"></svg>';
  const mn = Math.min(...arr), mx = Math.max(...arr), r = mx - mn || 1;
  const pts = arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${(h - 2 - (v - mn) / r * (h - 4)).toFixed(1)}`).join(' ');
  const up = arr[arr.length - 1] >= arr[0];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up ? 'var(--up)' : 'var(--down)'}" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
}

let chartPts = null;
function drawChart(all, start) {
  const svg = $('#chart'); const W = 360, H = 190, PT = 18, PB = 8;
  let eq = all || [];
  if (range !== 'all' && eq.length) { const cut = Date.now() - +range * 3600e3; const f = eq.filter(p => new Date(p.t) >= cut); eq = f.length >= 2 ? f : eq; }
  if (eq.length < 2) { svg.innerHTML = `<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--fg3)" stroke-dasharray="2 5" vector-effect="non-scaling-stroke"/>`; chartPts = null; return; }
  const keys = ['ai', 'SPY', 'BTC'];
  const vals = eq.flatMap(p => keys.map(k => p[k]).filter(v => v != null)).concat([start]);
  let mn = Math.min(...vals), mx = Math.max(...vals); const pad = (mx - mn) * .1 || 1; mn -= pad; mx += pad;
  const t0 = +new Date(eq[0].t), t1 = +new Date(eq[eq.length - 1].t);
  const X = t => (+new Date(t) - t0) / ((t1 - t0) || 1) * W;
  const Y = v => PT + (1 - (v - mn) / (mx - mn)) * (H - PT - PB);
  const path = k => eq.filter(p => p[k] != null).map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)},${Y(p[k]).toFixed(1)}`).join('');
  const last = eq[eq.length - 1].ai, up = last >= start, col = up ? 'var(--up)' : 'var(--down)';
  const ai = path('ai');
  svg.innerHTML = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${up ? '#30D158' : '#FF453A'}" stop-opacity=".28"/><stop offset="1" stop-color="${up ? '#30D158' : '#FF453A'}" stop-opacity="0"/></linearGradient></defs>`
    + `<line x1="0" x2="${W}" y1="${Y(start)}" y2="${Y(start)}" stroke="var(--fg3)" stroke-dasharray="2 4" vector-effect="non-scaling-stroke"/>`
    + `<path d="${ai}L${W},${H}L0,${H}Z" fill="url(#g)"/>`
    + `<path d="${path('SPY')}" fill="none" stroke="var(--blue)" stroke-width="1.4" stroke-opacity=".8" vector-effect="non-scaling-stroke"/>`
    + `<path d="${path('BTC')}" fill="none" stroke="var(--orange)" stroke-width="1.4" stroke-opacity=".8" vector-effect="non-scaling-stroke"/>`
    + `<path d="${ai}" fill="none" stroke="${col}" stroke-width="2.4" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`
    + `<g id="cursor" style="display:none"><line id="cx" y1="0" y2="${H}" stroke="var(--fg3)" vector-effect="non-scaling-stroke"/><circle id="cd" r="4.5" fill="${col}" stroke="var(--bg)" stroke-width="2" vector-effect="non-scaling-stroke"/></g>`;
  chartPts = eq.map(p => ({ x: X(p.t), y: Y(p.ai), p }));
}
(() => { // przesuwanie palcem po wykresie
  const box = $('.chart-box');
  const move = e => {
    if (!chartPts) return;
    const r = box.getBoundingClientRect(); const cx = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) / r.width * 360;
    let best = chartPts[0]; for (const q of chartPts) if (Math.abs(q.x - cx) < Math.abs(best.x - cx)) best = q;
    const g = $('#cursor'); if (!g) return; g.style.display = '';
    $('#cx').setAttribute('x1', best.x); $('#cx').setAttribute('x2', best.x); $('#cd').setAttribute('cx', best.x); $('#cd').setAttribute('cy', best.y);
    const s = $('#scrub'); s.hidden = false; s.style.left = Math.min(Math.max(best.x / 360 * r.width, 60), r.width - 60) + 'px';
    $('#scrubVal').textContent = zl(best.p.ai) + ' zł'; $('#scrubT').textContent = tPL(best.p.t);
  };
  const end = () => { $('#scrub').hidden = true; const g = $('#cursor'); if (g) g.style.display = 'none'; };
  box.addEventListener('touchstart', move, { passive: true }); box.addEventListener('touchmove', move, { passive: true }); box.addEventListener('touchend', end);
  box.addEventListener('mousemove', move); box.addEventListener('mouseleave', end);
})();

// ---------- render ----------
function render(d) {
  data = d;
  $('#liveTxt').textContent = d.market ? `ceny ${hm(d.market.at)}` : 'na żywo';
  if (d.notStarted) { $('#verdictTxt').textContent = 'Eksperyment startuje przy pierwszej decyzji AI.'; return; }

  const start = d.startCapitalPLN, tot = d.portfolio.total, diff = tot - start;
  const day = Math.min(7, Math.floor((Date.now() - new Date(d.startedAt)) / 864e5) + 1);
  const ended = Date.now() > new Date(d.endsAt);
  $('#dayLine').textContent = ended ? 'Tydzień zakończony' : `Dzień ${day} z 7`;
  $('#total').textContent = zl(tot);
  const dp = $('#deltaPill'); dp.className = 'pill ' + cls(diff); dp.textContent = `${sign(diff)} zł · ${pct(diff / start * 100)}`;

  drawChart(d.equity, start);

  // cel
  const goal = d.costs.goalPLN || 1000;
  const prog = Math.max(0, Math.min(1, (tot - start) / (goal - start)));
  $('#ringFg').style.strokeDashoffset = (207.3 * (1 - Math.max(prog, 0.004))).toFixed(1);
  $('#goalPct').textContent = zl(prog * 100, prog < .1 ? 1 : 0);
  const daysLeft = Math.max(0, (new Date(d.endsAt) - Date.now()) / 864e5);
  $('#goalTxt').textContent = tot >= goal ? 'Cel osiągnięty.' : `Brakuje ${zl(goal - tot)} zł. Portfel musi urosnąć o ${zl((goal / tot - 1) * 100, 0)}% w ${zl(daysLeft, 1)} dnia.`;

  // wyścig
  const spy = d.benchmarks.find(b => b.id === 'SPY');
  const mdl = (d.decisions.find(x => x.model) || {}).model || '';
  const rows = [{ sym: 'AI', nm: /claude/.test(mdl) ? 'AI · Claude' : 'AI', sub: 'SOL + meme coiny', val: tot, me: true },
    ...d.benchmarks.map(b => ({ sym: b.id, nm: b.id === 'SPY' ? 'S&P 500' : 'Bitcoin', sub: b.pending ? 'czeka na otwarcie giełdy' : 'kup i trzymaj', val: b.value }))];
  const vals = rows.map(r => r.val), lo = Math.min(...vals, start) * .99, hi = Math.max(...vals, start) * 1.002;
  rows.sort((a, b) => b.val - a.val);
  $('#race').innerHTML = rows.map((r, i) => `<div class="cell ${r.me ? 'me' : ''}"><span class="race-rank">${i + 1}</span>
    <div class="cell-main"><p class="t1">${r.nm}</p><p class="t2">${r.sub}</p><div class="race-bar ${r.val < start ? 'neg' : ''}"><b style="width:${((r.val - lo) / (hi - lo) * 100).toFixed(1)}%"></b></div></div>
    <div class="cell-r"><p class="t1">${zl(r.val)} zł</p><p class="t2 ${cls(r.val - start)}">${pct((r.val / start - 1) * 100)}</p></div></div>`).join('');
  const vsM = tot - spy.value;
  $('#verdictTxt').textContent = spy.pending ? 'S&P 500 wystartuje przy otwarciu giełdy w USA (15:30).'
    : Math.abs(vsM) < 0.05 ? 'Na razie remis z rynkiem.' : vsM > 0 ? `AI wygrywa z rynkiem o ${zl(vsM)} zł.` : `AI przegrywa z rynkiem o ${zl(-vsM)} zł.`;

  // ostatnia decyzja
  const ld = d.decisions.find(x => x.source !== 'strażnik') || d.decisions[0];
  $('#lastDecision').textContent = ld ? ld.summary : 'AI jeszcze nie podjęło decyzji.';
  $('#lastDecisionMeta').innerHTML = ld ? `${hm(ld.at)} · ${ld.executed.length ? esc(ld.executed.map(e => e.text).join(', ')) : 'bez transakcji'}${badges(ld)}` : '';
  $('#lastDecisionCell').onclick = () => ld && openDecision(ld);

  const f = d.fees, fT = f.fx + f.commission + f.spread;
  $('#facts').innerHTML = kv('Gotówka', zl(d.portfolio.cash) + ' zł') + kv('W pozycjach', zl(d.portfolio.positions) + ' zł')
    + kv('Transakcje', d.trades.length) + kv('Zapłacone koszty', zl(fT) + ' zł') + kv('Decyzje AI', d.decisions.filter(x => x.source !== 'strażnik').length)
    + kv('Koniec tygodnia', tPL(d.endsAt));

  renderPortfolio(d);
  renderLog(d);
  $('#notes').innerHTML = d.notes.length ? d.notes.map(n => `<div class="cell"><div class="cell-main"><p class="note-t">${tPL(n.at)}</p><p class="note-x">${esc(n.text)}</p></div></div>`).join('')
    : '<div class="cell"><span class="muted">Brak notatek.</span></div>';
  const c = d.costs;
  $('#costFacts').innerHTML = kv('Przewalutowanie PLN↔USD', zl(c.fx * 100, 1) + '%') + kv('Prowizja krypto', zl(c.crypto.commission * 100, 1) + '%')
    + kv('Kurs USD/PLN teraz', zl(d.market.fx.rate, 4)) + kv('Źródło kursu', esc(d.market.fx.source));
}

function renderPortfolio(d) {
  const tradable = d.costs.tradable || [];
  const Q = Object.fromEntries(d.market.quotes.map(q => [q.symbol, q]));
  const pos = d.portfolio.rows;
  $('#positions').innerHTML = pos.map(p => `<button class="cell cell-tap ind" data-pos="${p.symbol}">${avatar(p.symbol)}
      <div class="cell-main"><p class="t1">${p.symbol}</p><p class="t2">${qtyF(p.qty)} szt.${p.stopUSD ? ` · stop $${px(p.stopUSD)}` : ''}</p></div>
      <div class="cell-r"><p class="price">${zl(p.valuePLN)} zł</p><span class="chg ${cls(p.plPLN)}">${pct(p.plPct)}</span></div></button>`).join('')
    + `<div class="cell ind"><span class="av" style="background:#3A3A3C">zł</span><div class="cell-main"><p class="t1">Gotówka</p><p class="t2">gotowa do wejścia</p></div><div class="cell-r"><p class="price">${zl(d.portfolio.cash)} zł</p></div></div>`;
  $$('#positions [data-pos]').forEach(b => b.onclick = () => openPosition(pos.find(p => p.symbol === b.dataset.pos), Q[b.dataset.pos]));

  $('#usStatus').textContent = 'krypto 24/7';
  const qs = d.market.quotes.filter(q => tradable.includes(q.symbol) || ['BTC', 'ETH'].includes(q.symbol))
    .sort((a, b) => (tradable.includes(b.symbol) - tradable.includes(a.symbol)));
  $('#market').innerHTML = qs.map(q => q.error ? `<div class="cell ind">${avatar(q.symbol)}<div class="cell-main"><p class="t1">${q.symbol}</p><p class="t2">brak danych</p></div></div>` :
    `<button class="cell cell-tap ind" data-q="${q.symbol}">${avatar(q.symbol)}<div class="cell-main"><p class="t1">${q.symbol}</p><p class="t2">${esc(q.name.replace(' (meme)', ''))}${tradable.includes(q.symbol) ? '' : ' · tylko kontekst'}</p></div>
      ${sparkSVG(q.spark)}<div class="cell-r"><p class="price">$${px(q.mid)}</p><span class="chg ${cls(q.ch24h)}">${pct(q.ch24h)}</span></div></button>`).join('');
  $$('#market [data-q]').forEach(b => b.onclick = () => openQuote(Q[b.dataset.q], pos.find(p => p.symbol === b.dataset.q)));
}

function openPosition(p, q) {
  const g = p.stopUSD ? `<h2 class="sec">Ochrona strażnika</h2><div class="group">${kv('Cena wejścia', '$' + px(p.entryUSD))}${kv('Najwyżej od wejścia', '$' + px(p.peakUSD))}
    ${kv(`Stop kroczący (${p.stopPct}%)`, '$' + px(p.stopUSD), 'down')}${p.takeUSD ? kv(`Cel: sprzedaż połowy (+${p.takePct}%)`, '$' + px(p.takeUSD), 'up') : kv('Cel', 'połowa zysku już zebrana')}</div>
    <p class="foot">Strażnik sprawdza cenę co minutę. Gdy spadnie do stopu, sprzedaje całość. Stop idzie w górę razem z ceną.</p>` : '';
  openSheet(p.symbol, `<div class="cell" style="padding:4px 0 10px">${avatar(p.symbol)}<div class="cell-main"><p class="bal" style="font-size:36px;margin:0">${zl(p.valuePLN)} zł</p><p class="t2"><span class="${cls(p.plPLN)}">${sign(p.plPLN)} zł (${pct(p.plPct)})</span> od zakupu</p></div></div>
    <div class="group">${kv('Ilość', qtyF(p.qty) + ' szt.')}${kv('Koszt zakupu', zl(p.costPLN) + ' zł')}${kv('Cena teraz (bid)', '$' + px(p.price))}${p.openedAt ? kv('Kupione', tPL(p.openedAt)) : ''}</div>${g}${q ? quoteStats(q) : ''}`);
}
function quoteStats(q) {
  return `<h2 class="sec">Rynek</h2><div class="group">${kv('Zmiana 1 h', pct(q.ch1h), cls(q.ch1h))}${kv('Zmiana 24 h', pct(q.ch24h), cls(q.ch24h))}${kv('Zmiana 7 dni', pct(q.ch7d), cls(q.ch7d))}
    ${q.rsi14h != null ? kv('RSI (godzinowe)', zl(q.rsi14h, 0)) : ''}${q.low7d ? kv('Zakres 7 dni', `$${px(q.low7d)} – $${px(q.high7d)}`) : ''}${kv('Spread', zl((q.ask - q.bid) / q.mid * 100, 3) + '%')}</div>`;
}
function openQuote(q, p) {
  openSheet(q.symbol, `<div class="cell" style="padding:4px 0 10px">${avatar(q.symbol)}<div class="cell-main"><p class="bal" style="font-size:36px;margin:0">$${px(q.mid)}</p><p class="t2">${esc(q.name)} · <span class="${cls(q.ch24h)}">${pct(q.ch24h)}</span> 24 h</p></div></div>
    <div class="group" style="padding:12px 14px">${sparkSVG(q.spark, 330, 120).replace('class="spark"', 'style="width:100%;height:120px;display:block"')}</div><p class="foot">Ostatnie 48 godzin, świece godzinowe z Coinbase.</p>
    ${quoteStats(q)}${p ? `<h2 class="sec">W portfelu</h2><div class="group">${kv('Wartość', zl(p.valuePLN) + ' zł')}${kv('Wynik', `${sign(p.plPLN)} zł`, cls(p.plPLN))}</div>` : ''}`);
}

// ---------- dziennik ----------
function badges(dec) {
  return (dec.source === 'strażnik' ? '<span class="badge b-guard">strażnik</span>' : '')
    + (dec.source === 'alarm' ? '<span class="badge b-alarm">alarm rynku</span>' : '')
    + (dec.source === 'ręcznie' ? '<span class="badge b-man">ręcznie</span>' : '')
    + (dec.error ? '<span class="badge b-err">AI nie odpowiedziało</span>' : '');
}
function decIcon(dec) {
  if (dec.source === 'strażnik') return `<span class="log-ico" style="background:var(--orange)"><svg><use href="#i-shield"/></svg></span>`;
  if (dec.source === 'alarm') return `<span class="log-ico" style="background:var(--blue)"><svg><use href="#i-bolt"/></svg></span>`;
  if (dec.error) return `<span class="log-ico" style="background:var(--down)">!</span>`;
  if (dec.executed.length) return `<span class="log-ico" style="background:var(--up)"><svg><use href="#i-spark"/></svg></span>`;
  return `<span class="log-ico" style="background:#636366"><svg><use href="#i-spark"/></svg></span>`;
}
function renderLog(d) {
  let list = d.decisions;
  if (logFilter === 'trades') list = list.filter(x => x.executed.length);
  if (logFilter === 'guard') list = list.filter(x => x.source === 'strażnik' || x.source === 'alarm');
  if (!list.length) { $('#log').innerHTML = '<div class="group"><div class="cell"><span class="muted">Nic tu jeszcze nie ma.</span></div></div>'; return; }
  const groups = [];
  for (const x of list.slice(0, 150)) { const k = dayKey(x.at); if (!groups.length || groups[groups.length - 1].k !== k) groups.push({ k, items: [] }); groups[groups.length - 1].items.push(x); }
  $('#log').innerHTML = groups.map(g => `<h2 class="day-h">${g.k}</h2><div class="group">${g.items.map(x => `<button class="cell cell-tap log-cell" data-d="${x.id}">${decIcon(x)}
    <div class="cell-main"><p class="log-time">${hm(x.at)}${badges(x)}</p><p class="log-sum">${esc(x.summary)}</p>${x.executed.length ? `<p class="log-tr">${esc(x.executed.map(e => e.text).join(' · '))}</p>` : ''}</div>
    <svg class="chev" style="margin-top:6px"><use href="#i-chev"/></svg></button>`).join('')}</div>`).join('');
  $$('#log [data-d]').forEach(b => b.onclick = () => openDecision(d.decisions.find(x => x.id === b.dataset.d)));
}
function openDecision(dec) {
  const T = Object.fromEntries(data.trades.map(t => [t.id, t]));
  const trades = dec.executed.map(e => T[e.tradeId]).filter(Boolean);
  const trHTML = trades.map(t => `<h2 class="sec">${t.side === 'KUPNO' ? 'Kupno' : 'Sprzedaż'} ${t.symbol}</h2><div class="group">
      ${kv('Kwota', zl(t.amountPLN) + ' zł')}${kv('Ilość', qtyF(t.qty) + ' szt.')}${kv('Cena', '$' + px(t.priceUSD))}${t.plPLN != null ? kv('Wynik', sign(t.plPLN) + ' zł', cls(t.plPLN)) : ''}
      ${kv('Przewalutowanie 0,5%', zl(t.fees.fx) + ' zł')}${kv('Prowizja', zl(t.fees.commission) + ' zł')}${kv('Spread', zl(t.fees.spread, 3) + ' zł')}${kv('Koszty razem', zl(t.feesTotal) + ' zł')}</div>
      ${t.reason ? `<p class="foot">${esc(t.reason)}</p>` : ''}`).join('');
  openSheet(dec.source === 'strażnik' ? 'Strażnik' : 'Decyzja AI', `<p class="cell-meta">${tPL(dec.at)}${badges(dec)}</p>
    <p class="sheet-p" style="font-size:19px;font-weight:600;letter-spacing:-.02em;margin:4px 0 0">${esc(dec.summary)}</p>
    ${dec.alarm ? `<h2 class="sec">Powód alarmu</h2><div class="group"><div class="cell"><p class="sheet-p">${esc(dec.alarm)}</p></div></div>` : ''}
    ${dec.marketView ? `<h2 class="sec">Co widzi na rynku</h2><div class="group"><div class="cell"><p class="sheet-p">${esc(dec.marketView)}</p></div></div>` : ''}
    ${dec.keyInfo ? `<h2 class="sec">Kluczowa informacja</h2><div class="group"><div class="cell"><p class="sheet-p">${esc(dec.keyInfo)}</p></div></div>` : ''}
    ${trHTML}
    ${dec.rejected?.length ? `<h2 class="sec">Odrzucone zlecenia</h2><div class="group">${dec.rejected.map(r => `<div class="cell"><p class="sheet-p muted">${esc(r.text)}</p></div>`).join('')}</div>` : ''}
    ${(dec.sourcesUsed?.length || dec.model) ? `<h2 class="sec">Źródła</h2><div class="group">${dec.sourcesUsed?.length ? kv('Oparte na', esc(dec.sourcesUsed.join(', '))) : ''}${dec.fearGreed != null ? kv('Strach i chciwość', dec.fearGreed + '/100') : ''}${dec.confidence != null ? kv('Pewność AI', zl(dec.confidence * 100, 0) + '%') : ''}${dec.model ? kv('Model', esc(dec.model.split('/')[1])) : ''}</div>` : ''}
    ${dec.error ? `<p class="foot">${esc(dec.error).slice(0, 220)}</p>` : ''}`);
}

// ---------- akcje ----------
async function load() { const d = await api('/api/state'); render(d); return d; }

$('#decideBtn').addEventListener('click', async () => {
  const b = $('#decideBtn'), s = b.querySelector('span'); b.disabled = true; s.textContent = 'AI analizuje rynek…';
  try {
    const r = await api('/api/tick', { method: 'POST' });
    if (r.skipped) toast(r.why === 'za wcześnie od ostatniej decyzji' ? 'AI analizowało przed chwilą. Spróbuj za minutę.' : 'Eksperyment zakończony.');
    else toast(r.decision.summary || 'Gotowe', 5200);
    await load();
  } catch (e) { if (e.message !== 'auth') toast('Nie udało się: ' + e.message); }
  b.disabled = false; s.textContent = 'Niech AI zdecyduje teraz';
});

$('#noteForm').addEventListener('submit', async e => {
  e.preventDefault(); const text = $('#noteText').value.trim(); if (!text) return;
  try { await api('/api/note', { method: 'POST', body: JSON.stringify({ text }) }); $('#noteText').value = ''; toast('AI przeczyta to przy następnej analizie.'); load(); }
  catch (err) { if (err.message !== 'auth') toast(err.message); }
});

drawDots();
if (!pin) showPin(); else load().catch(e => { if (e.message !== 'auth') toast('Brak połączenia: ' + e.message); });
setInterval(() => { if (!document.hidden && $('#pin').hidden && $('#sheetWrap').hidden) load().catch(() => {}); }, 30000);
document.addEventListener('visibilitychange', () => { if (!document.hidden && pin) load().catch(() => {}); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
