// Strażnik: uruchamiany co minutę. Bez AI, tylko twarde reguły:
// 1) stop kroczący i realizacja połowy zysku dla otwartych pozycji,
// 2) alarm: gdy któraś moneta mocno się rusza, od razu prosi AI o pełną analizę.
import { UNIVERSE, TRADABLE_ONLY, ALARM_MOVE_PCT } from './config.js';
import { quickQuotes, usdPln } from './market.js';
import { loadState, saveState } from './store.js';
import { execute, guardLevels } from './broker.js';
import { runTick } from './engine.js';

const px = x => +(+x).toPrecision(5);

export async function runWatch({ force = false } = {}) {
  const now = new Date();
  // co 5 minut działa pełna analiza AI; strażnik wtedy nie wchodzi jej w drogę
  if (!force && now.getUTCMinutes() % 5 === 0) return { skipped: 'minuta pełnej analizy' };
  const state = await loadState({ fresh: false });
  if (!state) return { skipped: 'brak stanu' };
  if (now > new Date(state.endsAt)) return { skipped: 'eksperyment zakończony' };

  const held = Object.keys(state.positions);
  const syms = [...new Set([...TRADABLE_ONLY, ...held])];
  const quotes = await quickQuotes(UNIVERSE.filter(u => syms.includes(u.symbol) && u.type === 'crypto'));
  const Q = Object.fromEntries(quotes.map(q => [q.symbol, q]));
  let dirty = false;
  const dec = { id: crypto.randomUUID(), at: now.toISOString(), source: 'strażnik', executed: [], rejected: [], notes: [] };
  let market = null;

  for (const sym of held) {
    const p = state.positions[sym], q = Q[sym];
    if (!p || !q || q.error) continue;
    if (!p.entryUSD) { // pozycja sprzed strażnika: cena wejścia z ostatniego kupna
      const t = state.trades.find(t => t.symbol === sym && t.side === 'KUPNO');
      p.entryUSD = t?.priceUSD || q.ask; p.peakUSD = Math.max(p.entryUSD, q.bid); dirty = true;
    }
    const before = guardLevels(p);
    if (q.bid > (p.peakUSD || 0)) p.peakUSD = q.bid;
    const g = guardLevels(p);
    if (g.stopUSD > before.stopUSD * 1.004) dirty = true; // stop podciągnięty w górę
    let order = null;
    if (q.bid <= g.stopUSD) {
      order = { action: 'sell', symbol: sym, fraction: 1, guard: 'stop',
        reason: `cena ${px(q.bid)} USD spadła do stopu ${px(g.stopUSD)} USD (${g.stopPct}% od szczytu ${px(g.peakUSD)})` };
    } else if (g.takeUSD && q.bid >= g.takeUSD) {
      order = { action: 'sell', symbol: sym, fraction: 0.5, guard: 'cel',
        reason: `cena ${px(q.bid)} USD osiągnęła cel +${g.takePct}%: sprzedaję połowę, reszta jedzie dalej ze stopem` };
    }
    if (!order) continue;
    market = market || { fx: await usdPln(), us: { open: false, reason: '' }, quotes: Q, at: now.toISOString() };
    const r = execute(state, market, order, dec.at, 1);
    if (r.ok) {
      if (order.guard === 'cel' && state.positions[sym]) state.positions[sym].tookProfit = true;
      dec.executed.push({ tradeId: r.trade.id, text: `${r.trade.side} ${sym} za ${r.trade.amountPLN.toFixed(2)} zł` });
      dec.notes.push(`${sym}: ${order.reason}`);
    } else dec.rejected.push({ text: r.why });
    dirty = true;
  }

  if (dec.executed.length || dec.rejected.length) {
    dec.summary = `Strażnik: ${dec.notes.join('; ') || 'próba sprzedaży'}.`;
    state.decisions.unshift(dec);
    state.decisions = state.decisions.slice(0, 600);
  }
  if (dirty) await saveState(state);

  // alarm: duży ruch w ciągu 3 minut
  const movers = quotes.filter(q => !q.error && q.ch3m != null && Math.abs(q.ch3m) >= (state.positions[q.symbol] ? 1 : ALARM_MOVE_PCT))
    .sort((a, b) => Math.abs(b.ch3m) - Math.abs(a.ch3m));
  let alarm = null;
  if (movers.length || dec.executed.length) {
    const lastAI = state.decisions.find(d => !d.error && d.source !== 'strażnik');
    const lastAlarm = state.decisions.find(d => d.source === 'alarm');
    const sinceAI = lastAI ? (now - new Date(lastAI.at)) / 60e3 : 99;
    const sinceAlarm = lastAlarm ? (now - new Date(lastAlarm.at)) / 60e3 : 99;
    if (sinceAI >= 1.5 && sinceAlarm >= 4) {
      alarm = [
        ...dec.notes.map(n => 'strażnik sprzedał ' + n),
        ...movers.slice(0, 3).map(q => `${q.symbol} ${q.ch3m > 0 ? '+' : ''}${q.ch3m}% w 3 min (1 min: ${q.ch1m}%, 15 min: ${q.ch15m}%)`),
      ].join('; ');
    }
  }
  let tick = null;
  if (alarm) tick = await runTick({ source: 'alarm', force: true, alarm });
  return { checked: quotes.length, held, traded: dec.executed.map(e => e.text), saved: dirty, alarm, tick: tick && (tick.decision?.summary || tick.why) };
}
