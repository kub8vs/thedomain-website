import { UNIVERSE, US_HOLIDAYS, US_HALF_DAYS } from './config.js';

const UA = { 'User-Agent': 'Mozilla/5.0 (paper-trading-bot)' };

async function getJSON(url, timeout = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: UA, signal: ctrl.signal, cache: 'no-store' });
    if (!r.ok) throw new Error(`${url} -> HTTP ${r.status}`);
    return await r.json();
  } finally { clearTimeout(t); }
}

// ---------- godziny sesji NYSE ----------
function nyParts(date = new Date()) {
  const f = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false,
  });
  const p = Object.fromEntries(f.formatToParts(date).map(x => [x.type, x.value]));
  return { ymd: `${p.year}-${p.month}-${p.day}`, wd: p.weekday, mins: (+p.hour % 24) * 60 + +p.minute };
}

export function usMarketStatus(date = new Date()) {
  const { ymd, wd, mins } = nyParts(date);
  if (wd === 'Sat' || wd === 'Sun') return { open: false, reason: 'weekend' };
  if (US_HOLIDAYS.includes(ymd)) return { open: false, reason: 'święto w USA' };
  const close = US_HALF_DAYS.includes(ymd) ? 13 * 60 : 16 * 60;
  if (mins < 9 * 60 + 30) return { open: false, reason: 'przed otwarciem (15:30 czasu PL)' };
  if (mins >= close) return { open: false, reason: 'po zamknięciu sesji' };
  return { open: true, reason: 'sesja trwa' };
}

// ---------- wskaźniki ----------
function rsi(closes, n = 14) {
  if (closes.length < n + 1) return null;
  let g = 0, l = 0;
  for (let i = closes.length - n; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) g += d; else l -= d;
  }
  if (l === 0) return 100;
  return +(100 - 100 / (1 + g / l)).toFixed(1);
}
const sma = (a, n) => a.length >= n ? a.slice(-n).reduce((s, x) => s + x, 0) / n : null;
const pct = (a, b) => (a && b) ? +(((a / b) - 1) * 100).toFixed(2) : null;

function stats(closes, price) {
  // closes = świece godzinowe, od najstarszej
  const c = closes.filter(x => Number.isFinite(x));
  const back = h => c.length > h ? c[c.length - 1 - h] : c[0];
  const last7d = c.slice(-7 * 24);
  return {
    ch1h: pct(price, back(1)),
    ch24h: pct(price, back(24)),
    ch7d: pct(price, back(7 * 24)),
    rsi14h: rsi(c),
    sma20h: sma(c, 20) && +sma(c, 20).toFixed(4),
    sma50h: sma(c, 50) && +sma(c, 50).toFixed(4),
    high7d: last7d.length ? Math.max(...last7d) : null,
    low7d: last7d.length ? Math.min(...last7d) : null,
    spark: c.slice(-48).map(x => +x.toPrecision(6)),
  };
}

// ---------- źródła ----------
export async function yahooChart(symbol, range = '1mo', interval = '1h') {
  const hosts = ['query1', 'query2'];
  let last;
  for (const h of hosts) {
    try {
      const j = await getJSON(`https://${h}.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${interval}&range=${range}&includePrePost=false`);
      const r = j.chart.result[0];
      return { meta: r.meta, closes: (r.indicators.quote[0].close || []).filter(x => x != null) };
    } catch (e) { last = e; }
  }
  throw last;
}

async function stockQuote(inst) {
  const { meta, closes } = await yahooChart(inst.yahoo || inst.symbol);
  const mid = meta.regularMarketPrice;
  const half = inst.spread / 2;
  return {
    ...inst, mid, bid: mid * (1 - half), ask: mid * (1 + half),
    spreadSource: 'model', time: new Date(meta.regularMarketTime * 1000).toISOString(),
    ...stats(closes, mid),
  };
}

async function cryptoQuote(inst) {
  const base = `https://api.exchange.coinbase.com/products/${inst.pair}`;
  const t = await getJSON(`${base}/ticker`);
  const candles = await getJSON(`${base}/candles?granularity=3600`);
  const c1 = await getJSON(`${base}/candles?granularity=60`).catch(() => []); // 300 świec minutowych = 5 h
  const bid = +t.bid, ask = +t.ask, mid = (bid + ask) / 2;
  const closes = candles.map(c => c[4]).reverse(); // Coinbase zwraca od najnowszej
  const H = candles.slice().reverse(); // [time, low, high, open, close, vol] od najstarszej
  const tr = H.map((c, i) => i ? Math.max(c[2] - c[1], Math.abs(c[2] - H[i - 1][4]), Math.abs(c[1] - H[i - 1][4])) / c[4] * 100 : (c[2] - c[1]) / c[4] * 100);
  const atrAt = i => tr.slice(Math.max(0, i - 13), i + 1).reduce((a, b) => a + b, 0) / Math.min(14, i + 1);
  const atrNow = tr.length ? atrAt(tr.length - 1) : null;
  const atrHist = tr.map((_, i) => atrAt(i)).slice(-168).sort((a, b) => a - b);
  const atrMed = atrHist.length ? atrHist[Math.floor(atrHist.length / 2)] : null;
  const last24 = H.slice(-24);
  const vw = last24.reduce((s, c) => s + (c[1] + c[2] + c[4]) / 3 * c[5], 0), vv = last24.reduce((s, c) => s + c[5], 0);
  const vwap24 = vv ? vw / vv : null;
  const c24 = closes.slice(-25);
  const er = c24.length > 2 ? Math.abs(c24[c24.length - 1] - c24[0]) / c24.slice(1).reduce((s, x, i) => s + Math.abs(x - c24[i]), 0) : null; // 1 = czysty trend, 0 = szarpanina
  const k1 = c1.map(c => c[4]).reverse();
  const v1 = c1.map(c => c[5] * c[4]).reverse();
  const back1 = n => k1.length > n ? k1[k1.length - 1 - n] : null;
  const k5 = k1.filter((_, i) => (k1.length - 1 - i) % 5 === 0); // co 5. świeca = świece 5-min
  const volNow = v1.slice(-15).reduce((a, b) => a + b, 0) / 15, volAvg = v1.slice(-300).reduce((a, b) => a + b, 0) / Math.max(1, Math.min(300, v1.length));
  return { ...inst, mid, bid, ask, spreadSource: 'giełda', time: t.time, ...stats(closes, mid),
    ch1m: pct(mid, back1(1)), ch3m: pct(mid, back1(3)), ch5m: pct(mid, back1(5)), ch15m: pct(mid, back1(15)), ch60m: pct(mid, back1(60)),
    rsi14_1m: rsi(k1), rsi14_5m: rsi(k5), vol15m_vs_avg: volAvg ? +(volNow / volAvg).toFixed(2) : null,
    high5h: k1.length ? Math.max(...k1) : null, low5h: k1.length ? Math.min(...k1) : null,
    atr14h_pct: atrNow != null ? +atrNow.toFixed(2) : null,
    vwap24h: vwap24 != null ? +vwap24.toPrecision(6) : null, vs_vwap24h_pct: vwap24 ? pct(mid, vwap24) : null,
    efficiency_24h: er != null ? +er.toFixed(2) : null,
    regime: er == null ? null : er >= 0.35 ? (closes[closes.length - 1] > c24[0] ? 'trend w górę' : 'trend w dół') : 'rynek boczny',
    vol_regime: atrNow && atrMed ? (atrNow > atrMed * 1.5 ? 'wysoka' : atrNow < atrMed * 0.7 ? 'niska' : 'normalna') : null };
}

// Coinbase limituje publiczne API, więc krypto pobieramy partiami
async function inBatches(items, n, fn) {
  const out = [];
  for (let i = 0; i < items.length; i += n) out.push(...await Promise.all(items.slice(i, i + n).map(fn)));
  return out;
}

export async function usdPln() {
  try {
    const { meta } = await yahooChart('PLN=X', '1d', '5m');
    if (meta.regularMarketPrice > 2) return { rate: meta.regularMarketPrice, source: 'rynek walutowy (na żywo)' };
  } catch {}
  const j = await getJSON('https://api.nbp.pl/api/exchangerates/rates/a/usd/?format=json');
  return { rate: j.rates[0].mid, source: `NBP ${j.rates[0].effectiveDate}` };
}

export async function getMarket() {
  const safe = (f, i) => f(i).catch(e => ({ ...i, error: String(e.message || e) }));
  const [fx, stocks, cryptos] = await Promise.all([
    usdPln(),
    Promise.all(UNIVERSE.filter(i => i.type !== 'crypto').map(i => safe(stockQuote, i))),
    inBatches(UNIVERSE.filter(i => i.type === 'crypto'), 4, i => safe(cryptoQuote, i)),
  ]);
  const quotes = [...stocks, ...cryptos];
  const us = usMarketStatus();
  const q = {};
  for (const x of quotes) {
    const wd = new Date().getUTCDay();
    x.tradable = !x.error && (x.type === 'crypto' || us.open || (x.h24 && wd !== 0 && wd !== 6));
    q[x.symbol] = x;
  }
  return { at: new Date().toISOString(), fx, us, quotes: q };
}

// Szybki odczyt dla strażnika (co minutę): bid/ask + świece minutowe dla wybranych par
export async function quickQuotes(insts) {
  return inBatches(insts, 5, async inst => {
    const base = `https://api.exchange.coinbase.com/products/${inst.pair}`;
    try {
      const [t, c1] = await Promise.all([getJSON(`${base}/ticker`, 5000), getJSON(`${base}/candles?granularity=60`, 5000).catch(() => [])]);
      const bid = +t.bid, ask = +t.ask, mid = (bid + ask) / 2;
      const k1 = c1.map(c => c[4]).reverse();
      const back1 = n => k1.length > n ? k1[k1.length - 1 - n] : null;
      const v = c1.map(c => c[5]).reverse();
      const avg = (a, b) => { const x = v.slice(Math.max(0, v.length - a), v.length - b); return x.length ? x.reduce((s, y) => s + y, 0) / x.length : null; };
      const v3 = avg(3, 0), v30 = avg(33, 3);
      const lastC = c1[0];
      return { ...inst, bid, ask, mid, tradable: true, ch1m: pct(mid, back1(1)), ch3m: pct(mid, back1(3)), ch15m: pct(mid, back1(15)),
        vol3_vs_30: v3 && v30 ? +(v3 / v30).toFixed(2) : null, green1m: lastC ? lastC[4] > lastC[3] : null };
    } catch (e) { return { ...inst, error: String(e.message || e) }; }
  });
}
