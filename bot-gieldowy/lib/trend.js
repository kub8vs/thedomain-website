// Drugi portfel: prosta strategia „jedź z trendem” (bez AI), dla porównania z AI.
// Zasady (wykres dzienny, BTC, SOL, złoto, S&P 500):
//  - kupno: zamknięcie wczoraj > średnia 50 dni ORAZ cena przebija najwyższe zamknięcie z 20 dni
//  - stop: pod najniższym dołkiem z 10 dni; wielkość pozycji = ryzyko 1% portfela
//  - sprzedaż: zamknięcie dnia pod średnią 20 dni albo cena dotyka stopu
import { START_CAPITAL_PLN, MIN_ORDER_PLN } from './config.js';
import { execute, portfolioValue, liquidationPLN } from './broker.js';
import { yahooChart } from './market.js';

const COINS = [{ symbol: 'BTC', pair: 'BTC-USD' }, { symbol: 'SOL', pair: 'SOL-USD' }, { symbol: 'GOLD', yahoo: 'GC=F' }, { symbol: 'SPY', yahoo: 'SPY' }];
const RISK = 0.01;

export function newTrend() {
  return { cash: START_CAPITAL_PLN, positions: {}, trades: [], log: [] };
}

async function daily({ pair, yahoo }) {
  if (yahoo) { // [time, low, high, open, close] jak w Coinbase; ostatni (bieżący) dzień odrzucamy
    const j = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahoo)}?interval=1d&range=6mo`, { headers: { 'User-Agent': 'Mozilla/5.0 (paper-trading-bot)' } }).then(r => r.json());
    const r = j.chart.result[0], q = r.indicators.quote[0];
    return r.timestamp.map((t, i) => [t, q.low[i], q.high[i], q.open[i], q.close[i]]).filter(x => x[4] != null && x[1] != null).slice(0, -1);
  }
  const r = await fetch(`https://api.exchange.coinbase.com/products/${pair}/candles?granularity=86400`, { headers: { 'User-Agent': 'Mozilla/5.0 (paper-trading-bot)' } });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const c = (await r.json()).reverse(); // od najstarszej: [time, low, high, open, close, vol]
  return c.slice(0, -1); // tylko zamknięte dni
}
const avg = a => a.reduce((s, x) => s + x, 0) / a.length;

export async function runTrend(state, market, now) {
  const tr = state.trend || (state.trend = newTrend());
  const fx = market.fx.rate;
  const sub = { get cash() { return tr.cash; }, set cash(v) { tr.cash = v; }, positions: tr.positions, trades: tr.trades };
  const events = [];
  for (const c of COINS) {
    const { symbol } = c;
    const q = market.quotes[symbol];
    if (!q || q.error) continue;
    let d; try { d = await daily(c); } catch { continue; }
    if (d.length < 51) continue;
    const closes = d.map(x => x[4]), lows = d.map(x => x[1]);
    const last = closes[closes.length - 1];
    const sma50 = avg(closes.slice(-50)), sma20 = avg(closes.slice(-20));
    const high20 = Math.max(...closes.slice(-21, -1));
    const low10 = Math.min(...lows.slice(-10));
    const pos = tr.positions[symbol];
    tr.signals = tr.signals || {};
    tr.signals[symbol] = { price: q.mid, sma50: +sma50.toFixed(2), sma20: +sma20.toFixed(2), high20, stop: pos?.trendStop ?? +low10.toFixed(4), trendUp: last > sma50, at: now };

    if (pos) {
      const why = q.bid <= pos.trendStop ? `cena ${q.bid} USD dotknęła stopu ${pos.trendStop} USD`
        : last < sma20 ? `dzienne zamknięcie ${last} USD pod średnią 20 dni (${sma20.toFixed(2)} USD): trend słabnie` : null;
      if (why) {
        const r = execute(sub, market, { action: 'sell', symbol, fraction: 1, guard: 'trend', anySymbol: true, reason: why }, now, 1);
        if (r.ok) events.push({ trade: r.trade, text: `Strategia trend: sprzedaż ${symbol}. ${why}.` });
      }
      continue;
    }
    if (last > sma50 && q.ask > high20 && q.ask > low10) {
      const equity = portfolioValue(sub, market).total;
      const riskPLN = equity * RISK;
      const perCoinLossPLN = (q.ask - low10) * fx;
      let pln = Math.min(tr.cash, (riskPLN / perCoinLossPLN) * q.ask * fx);
      if (pln < MIN_ORDER_PLN && tr.cash >= MIN_ORDER_PLN) pln = MIN_ORDER_PLN; // minimalne zlecenie
      const why = `trend w górę (cena nad średnią 50 dni ${sma50.toFixed(2)} USD) i wybicie ponad szczyt 20 dni ${high20} USD; stop ${low10} USD, ryzyko ok. 1% portfela`;
      const r = execute(sub, market, { action: 'buy', symbol, amount_pln: pln, anySymbol: true, reason: why }, now, 1);
      if (r.ok) { tr.positions[symbol].trendStop = low10; events.push({ trade: r.trade, text: `Strategia trend: kupno ${symbol} za ${r.trade.amountPLN.toFixed(2)} zł. ${why}.` }); }
    }
  }
  for (const e of events) tr.log.unshift({ at: now, text: e.text, tradeId: e.trade.id });
  tr.log = tr.log.slice(0, 100);
  return events;
}

export function trendValue(state, market) {
  const tr = state.trend; if (!tr) return START_CAPITAL_PLN;
  let v = tr.cash;
  for (const [sym, p] of Object.entries(tr.positions)) { const q = market.quotes[sym]; v += q && !q.error ? liquidationPLN(q, p.qty, market.fx.rate) : (p.lastValuePLN ?? p.costPLN); }
  return v;
}
