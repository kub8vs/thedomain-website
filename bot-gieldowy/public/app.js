const $ = s => document.querySelector(s);
const PIN_KEY = 'dbot-pin';
let pin = ''; try { pin = localStorage.getItem(PIN_KEY) || ''; } catch {}
let data = null;

const zl = (x, d = 2) => (x ?? 0).toLocaleString('pl-PL', { minimumFractionDigits: d, maximumFractionDigits: d });
const sign = x => (x > 0 ? '+' : x < 0 ? '−' : '') + zl(Math.abs(x));
const pct = x => (x > 0 ? '+' : x < 0 ? '−' : '') + zl(Math.abs(x)) + '%';
const cls = x => x > 0.004 ? 'up' : x < -0.004 ? 'down' : 'mut';
const tPL = iso => new Date(iso).toLocaleString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
const hm = iso => new Date(iso).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Warsaw' });
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg, ms = 3200) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('show'), ms); }

async function api(path, opts = {}) {
  const r = await fetch(path, { ...opts, headers: { 'Content-Type': 'application/json', 'x-pin': pin, ...(opts.headers || {}) } });
  if (r.status === 401) { showPin(); throw new Error('auth'); }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Błąd ' + r.status);
  return j;
}

function showPin(err) { $('#pin').hidden = false; $('#pinErr').textContent = err || ''; setTimeout(() => $('#pinInput').focus(), 50); }
$('#pinForm').addEventListener('submit', async e => {
  e.preventDefault(); pin = $('#pinInput').value.trim();
  try { await load(); try { localStorage.setItem(PIN_KEY, pin); } catch {} $('#pin').hidden = true; }
  catch (err) { if (err.message === 'auth') $('#pinErr').textContent = 'Zły kod. Spróbuj jeszcze raz.'; }
});
$('#logoutBtn').addEventListener('click', () => { try { localStorage.removeItem(PIN_KEY); } catch {} location.reload(); });

// tabs
document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
  document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
  document.querySelectorAll('.view').forEach(v => v.hidden = v.dataset.view !== b.dataset.tab);
  window.scrollTo({ top: 0 });
  try { sessionStorage.setItem('dbot-tab', b.dataset.tab); } catch {}
}));
try { const t = sessionStorage.getItem('dbot-tab'); if (t) document.querySelector(`.tabs [data-tab="${t}"]`)?.click(); } catch {}

function sparkSVG(arr, w = 64, h = 22) {
  if (!arr || arr.length < 2) return '';
  const mn = Math.min(...arr), mx = Math.max(...arr), r = mx - mn || 1;
  const pts = arr.map((v, i) => `${(i / (arr.length - 1) * w).toFixed(1)},${(h - 2 - (v - mn) / r * (h - 4)).toFixed(1)}`).join(' ');
  const up = arr[arr.length - 1] >= arr[0];
  return `<svg class="spark" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${up ? 'var(--up)' : 'var(--down)'}" stroke-width="1.3"/></svg>`;
}

function drawChart(eq, start) {
  const svg = $('#chart'); const W = 360, H = 180, P = 6;
  if (!eq || eq.length < 2) { svg.innerHTML = `<line x1="0" x2="${W}" y1="${H / 2}" y2="${H / 2}" stroke="var(--rule2)" stroke-dasharray="2 4"/>`; $('#chartHint').textContent = 'Wykres pojawi się po kilku godzinach działania.'; return; }
  const keys = ['ai', 'SPY', 'BTC'];
  const all = eq.flatMap(p => keys.map(k => p[k]).filter(v => v != null)).concat([start]);
  let mn = Math.min(...all), mx = Math.max(...all); const pad = (mx - mn) * .12 || 1; mn -= pad; mx += pad;
  const t0 = new Date(eq[0].t).getTime(), t1 = new Date(eq[eq.length - 1].t).getTime() || t0 + 1;
  const X = t => P + (new Date(t).getTime() - t0) / ((t1 - t0) || 1) * (W - 2 * P);
  const Y = v => H - P - (v - mn) / (mx - mn) * (H - 2 * P);
  const line = (k, style) => `<polyline points="${eq.filter(p => p[k] != null).map(p => `${X(p.t).toFixed(1)},${Y(p[k]).toFixed(1)}`).join(' ')}" fill="none" vector-effect="non-scaling-stroke" ${style}/>`;
  svg.innerHTML = `<line x1="0" x2="${W}" y1="${Y(start)}" y2="${Y(start)}" stroke="var(--rule2)" stroke-dasharray="1 3" vector-effect="non-scaling-stroke"/>`
    + line('SPY', 'stroke="var(--mut)" stroke-width="1.5" stroke-dasharray="5 4"')
    + line('BTC', 'stroke="var(--mut)" stroke-width="1.5" stroke-dasharray="1.5 3"')
    + line('ai', 'stroke="var(--fg)" stroke-width="2.2"');
  $('#chartHint').textContent = `Linia kropkowana pozioma = start (200 zł). ${eq.length} pomiarów od ${tPL(eq[0].t)}.`;
}

function render(d) {
  data = d;
  const live = $('#liveDot'); live.classList.toggle('on', !!d.market?.us);
  $('#liveTxt').textContent = d.market ? `ceny ${hm(d.market.at)} · USD ${zl(d.market.fx.rate, 4)}` : '';
  if (d.notStarted) { $('#verdictTxt').textContent = 'Eksperyment startuje przy pierwszej decyzji AI.'; return; }

  const start = d.startCapitalPLN, tot = d.portfolio.total, diff = tot - start;
  const day = Math.min(7, Math.floor((Date.now() - new Date(d.startedAt)) / 864e5) + 1);
  const ended = Date.now() > new Date(d.endsAt);
  $('#dayLine').textContent = ended ? `Koniec tygodnia · ${tPL(d.endsAt)}` : `Dzień ${day} z 7 · koniec ${tPL(d.endsAt)}`;
  $('#total').textContent = zl(tot);
  $('#totalDelta').innerHTML = `<span class="${cls(diff)}">${sign(diff)} zł (${pct(diff / start * 100)})</span> <span class="mut">od startu, po wszystkich kosztach</span>`;

  const spy = d.benchmarks.find(b => b.id === 'SPY'), btc = d.benchmarks.find(b => b.id === 'BTC');
  const vsM = tot - spy.value;
  let v;
  if (spy.pending) v = 'Benchmark S&P 500 wystartuje przy otwarciu giełdy w USA (15:30).';
  else if (Math.abs(vsM) < 0.05) v = 'Na razie remis z rynkiem.';
  else v = vsM > 0 ? `AI wygrywa z rynkiem o ${zl(vsM)} zł.` : `AI przegrywa z rynkiem o ${zl(-vsM)} zł.`;
  $('#verdictTxt').textContent = v;

  const mdl = (d.decisions.find(x => x.model) || {}).model || '';
  const aiName = /claude/.test(mdl) ? 'AI (Claude)' : mdl ? 'AI (model zapasowy)' : 'AI';
  const rows = [{ nm: aiName, sub: /claude/.test(mdl) || !mdl ? 'aktywnie zarządza' : 'darmowy model, Claude po doładowaniu', val: tot, me: true }, ...d.benchmarks.map(b => ({ nm: b.id === 'SPY' ? 'S&P 500' : 'Bitcoin', sub: b.pending ? 'czeka na otwarcie giełdy' : 'kup i trzymaj, nic nie robi', val: b.value }))];
  const vals = rows.map(r => r.val), lo = Math.min(...vals, start) * .995, hi = Math.max(...vals, start) * 1.005;
  rows.sort((a, b) => b.val - a.val);
  $('#race').innerHTML = rows.map((r, i) => `<tr class="${r.me ? 'me' : ''}"><td class="nm">${i + 1}. ${r.nm}<span>${r.sub}</span><div class="bar"><b style="left:0;width:${((r.val - lo) / (hi - lo) * 100).toFixed(1)}%"></b></div></td>
    <td class="v">${zl(r.val)} zł</td><td class="p ${cls(r.val - start)}">${pct((r.val / start - 1) * 100)}</td></tr>`).join('');

  drawChart(d.equity, start);

  const ld = d.decisions[0];
  $('#lastDecision').textContent = ld ? ld.summary : 'AI jeszcze nie podjęło decyzji.';
  $('#lastDecisionMeta').textContent = ld ? `${tPL(ld.at)} · ${ld.model ? ld.model.split('/')[1] + ' · ' : ''}${ld.executed.length ? ld.executed.map(e => e.text).join(', ') : 'bez transakcji'}` : '';

  const f = d.fees, fT = f.fx + f.commission + f.spread;
  $('#facts').innerHTML = `<dt>Gotówka</dt><dd>${zl(d.portfolio.cash)} zł</dd><dt>W pozycjach</dt><dd>${zl(d.portfolio.positions)} zł</dd>
    <dt>Transakcje</dt><dd>${d.trades.length}</dd><dt>Zapłacone koszty</dt><dd>${zl(fT)} zł</dd>
    <dt>Decyzje AI</dt><dd>${d.decisions.length}</dd><dt>Koszt AI (prawdziwy)</dt><dd>${zl(d.aiCostUSD * d.market.fx.rate)} zł</dd>`;

  // portfel
  const pos = d.portfolio.rows;
  $('#positions').innerHTML = `<tr><th>Instrument</th><th>Wartość</th><th>Wynik</th></tr>` +
    (pos.length ? pos.map(p => `<tr><td><b>${p.symbol}</b><span>${esc(p.name || '')} · ${zl(p.qty, p.qty < 1 ? 6 : 3)} szt.</span></td><td>${zl(p.valuePLN)} zł<span>koszt ${zl(p.costPLN)} zł</span></td><td class="${cls(p.plPLN)}">${sign(p.plPLN)} zł<span>${pct(p.plPct)}</span></td></tr>`).join('') : '')
    + `<tr><td><b>Gotówka</b><span>PLN</span></td><td>${zl(d.portfolio.cash)} zł</td><td></td></tr>`;
  $('#usStatus').textContent = `Giełda w USA: ${d.market.us.open ? 'otwarta, można handlować akcjami' : 'zamknięta, ' + d.market.us.reason + '. Krypto działa 24/7.'}`;
  $('#market').innerHTML = `<tr><th>Instrument</th><th>48 h</th><th>Cena</th><th>7 dni</th></tr>` + d.market.quotes.map(q => q.error ? `<tr><td><b>${q.symbol}</b><span>brak danych</span></td><td></td><td></td><td></td></tr>` :
    `<tr class="${q.tradable ? '' : 'closed'}"><td><b>${q.symbol}</b><span>${esc(q.name)}</span></td><td>${sparkSVG(q.spark)}</td><td>$${zl(q.mid, q.mid < 10 ? 4 : 2)}<span>spread ${zl((q.ask - q.bid) / q.mid * 100, 3)}%</span></td><td class="${cls(q.ch7d)}">${q.ch7d == null ? '–' : pct(q.ch7d)}<span>24h ${q.ch24h == null ? '–' : pct(q.ch24h)}</span></td></tr>`).join('');

  // dziennik
  const tradesById = Object.fromEntries(d.trades.map(t => [t.id, t]));
  $('#log').innerHTML = d.decisions.length ? d.decisions.map(dec => `<li><time>${tPL(dec.at)}</time>${dec.source === 'ręcznie' ? '<span class="tag">ręcznie</span>' : ''}${dec.error ? '<span class="tag">błąd AI</span>' : ''}
    <p class="sum">${esc(dec.summary)}</p>${dec.marketView ? `<p class="mv">${esc(dec.marketView)}</p>` : ''}
    ${dec.executed.map(e => { const t = tradesById[e.tradeId]; if (!t) return `<div class="tr">${esc(e.text)}</div>`;
      return `<div class="tr"><b>${t.side}</b> ${t.symbol} · ${zl(t.amountPLN)} zł · ${zl(t.qty, t.qty < 1 ? 6 : 3)} szt. po $${zl(t.priceUSD)}
      ${t.plPLN != null ? `<br><span class="${cls(t.plPLN)}">wynik ${sign(t.plPLN)} zł</span>` : ''}
      ${t.reason ? `<br><span class="mut">${esc(t.reason)}</span>` : ''}
      <details><summary>koszty ${zl(t.feesTotal)} zł</summary><div class="fees"><span>Przewalutowanie 0,5%</span><span>${zl(t.fees.fx)} zł</span><span>Prowizja</span><span>${zl(t.fees.commission)} zł</span><span>Spread</span><span>${zl(t.fees.spread, 4)} zł</span><span>Kurs USD/PLN</span><span>${zl(t.fx, 4)}</span></div></details></div>`; }).join('')}
    ${dec.rejected.map(r => `<div class="tr rej">Odrzucone: ${esc(r.text)}</div>`).join('')}
    ${dec.error ? `<p class="mv">${esc(dec.error).slice(0, 200)}</p>` : ''}</li>`).join('') : '<li class="mut">Brak decyzji.</li>';

  $('#notes').innerHTML = d.notes.map(n => `<li><time>${tPL(n.at)}</time>${esc(n.text)}</li>`).join('');

  const c = d.costs;
  $('#costFacts').innerHTML = `<dt>Przewalutowanie PLN↔USD</dt><dd>${zl(c.fx * 100, 1)}%</dd><dt>Prowizja akcje/ETF</dt><dd>${zl(c.stock.commission * 100, 1)}%</dd>
    <dt>Prowizja krypto</dt><dd>${zl(c.crypto.commission * 100, 1)}%</dd><dt>Kurs USD/PLN teraz</dt><dd>${zl(d.market.fx.rate, 4)}</dd><dt>Źródło kursu</dt><dd>${esc(d.market.fx.source)}</dd>`;

  const mins = 65 - new Date().getMinutes(); 
  $('#nextTick').textContent = `AI sprawdza rynek automatycznie co godzinę (następne sprawdzenie w ciągu ~${mins % 60 || 60} min).`;
}

async function load() { const d = await api('/api/state'); render(d); return d; }

$('#decideBtn').addEventListener('click', async () => {
  const b = $('#decideBtn'); b.disabled = true; b.textContent = 'AI analizuje rynek…';
  try {
    const r = await api('/api/tick', { method: 'POST' });
    if (r.skipped) toast(r.why === 'za wcześnie od ostatniej decyzji' ? 'AI decydowało przed chwilą. Spróbuj za kilka minut.' : 'Eksperyment zakończony.');
    else toast(r.decision.summary || 'Gotowe', 5000);
    await load();
  } catch (e) { if (e.message !== 'auth') toast('Nie udało się: ' + e.message); }
  b.disabled = false; b.textContent = 'Niech AI zdecyduje teraz';
});

$('#noteForm').addEventListener('submit', async e => {
  e.preventDefault(); const text = $('#noteText').value.trim(); if (!text) return;
  try { await api('/api/note', { method: 'POST', body: JSON.stringify({ text }) }); $('#noteText').value = ''; toast('AI przeczyta to przy następnej decyzji.'); load(); }
  catch (err) { if (err.message !== 'auth') toast(err.message); }
});

load().catch(e => { if (e.message !== 'auth') toast('Brak połączenia: ' + e.message); });
setInterval(() => { if (!document.hidden && $('#pin').hidden) load().catch(() => {}); }, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) load().catch(() => {}); });
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
