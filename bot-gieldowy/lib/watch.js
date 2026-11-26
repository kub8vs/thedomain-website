// Strażnik: uruchamiany co minutę. Bez AI, tylko twarde reguły:
// 1) stop kroczący i realizacja połowy zysku dla otwartych pozycji,
// 2) alarm: gdy któraś moneta mocno się rusza, od razu prosi AI o pełną analizę.
import { UNIVERSE, TRADABLE_ONLY, ALARM_MOVE_PCT } from './config.js';
import { quickQuotes, usdPln } from './market.js';
import { loadState, saveState, loadScalp, saveScalp } from './store.js';
import { execute, guardLevels } from './broker.js';
import { runTick } from './engine.js';
import { reviewTrades } from './ai.js';
import { notify, tradeMessage } from './push.js';
import { portfolioValue } from './broker.js';
import { runScalp, scalpInit } from './scalp.js';

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
  const guard = st => {
    let dirty = false;
    const dec = { id: crypto.randomUUID(), at: now.toISOString(), source: 'strażnik', executed: [], rejected: [], notes: [] };
    for (const sym of Object.keys(st.positions)) {
      const p = st.positions[sym], q = Q[sym];
      if (!p || !q || q.error) continue;
      if (!p.entryUSD) { // pozycja sprzed strażnika: cena wejścia z ostatniego kupna
        const t = st.trades.find(t => t.symbol === sym && t.side === 'KUPNO');
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
      dirty = true;
      const r = execute(st, market, order, dec.at, 1);
      if (r.ok) {
        if (order.guard === 'cel' && st.positions[sym]) st.positions[sym].tookProfit = true;
        dec.executed.push({ tradeId: r.trade.id, text: `${r.trade.side} ${sym} za ${r.trade.amountPLN.toFixed(2)} zł` });
        dec.notes.push(`${sym}: ${order.reason}`);
      } else dec.rejected.push({ text: r.why });
    }
    if (dec.executed.length || dec.rejected.length) {
      dec.summary = `Strażnik: ${dec.notes.join('; ') || 'próba sprzedaży'}.`;
      st.decisions.unshift(dec);
      st.decisions = st.decisions.slice(0, 600);
    }
    return { dirty, dec };
  };
  const market = { fx: { rate: 4 }, us: { open: false, reason: '' }, quotes: Q, at: now.toISOString() };
  // 1) próba na tanim (z pamięci CDN) odczycie; 2) jeśli trzeba coś zmienić, czytamy świeży stan i dopiero zapisujemy
  let { dirty, dec } = guard(JSON.parse(JSON.stringify(state)));
  if (dirty) {
    market.fx = await usdPln();
    const freshState = await loadState({ fresh: true });
    ({ dirty, dec } = guard(freshState));
    if (dirty) await saveState(freshState);
    if (dec.executed.length) {
      const T = Object.fromEntries(freshState.trades.slice(0, 10).map(t => [t.id, t]));
      let total = freshState.cash; try { total = portfolioValue(freshState, market).total; } catch {}
      await notify([tradeMessage(dec, dec.executed.map(e => T[e.tradeId]).filter(Boolean), total)]).catch(() => {});
    }
    Object.assign(state, freshState);
  }

  // MINUTÓWKA: osobny portfel do szybkiego tradingu, sprawdzany co minutę
  let scalpEv = [];
  try {
    const fxNow = state.trades?.[0]?.fx || 4.07;
    const cached = (await loadScalp()) || scalpInit();
    if (runScalp(JSON.parse(JSON.stringify(cached)), Q, fxNow, now).length) {
      const sc = (await loadScalp({ fresh: true })) || scalpInit();
      scalpEv = runScalp(sc, Q, fxNow, now);
      if (scalpEv.length) await saveScalp(sc);
    }
  } catch (e) { console.error('minutówka', e.message); }

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
  // co 2 godziny: AI przegląda swoje transakcje i zapisuje lekcje
  let lessons = null;
  const sinceLessons = state.lessonsAt ? (now - new Date(state.lessonsAt)) / 3600e3 : 99;
  if (!alarm && sinceLessons >= 2 && (state.trades || []).filter(t => t.side === 'SPRZEDAŻ').length >= 2 && (force || now.getUTCMinutes() % 5 === 2)) {
    try {
      const list = await reviewTrades(state);
      const fresh = await loadState({ fresh: true });
      fresh.lessons = list.map(text => ({ at: now.toISOString(), text }));
      fresh.lessonsAt = now.toISOString();
      await saveState(fresh);
      lessons = list;
    } catch (e) { console.error('lekcje', e.message); }
  }
  return { scalp: scalpEv.map(t => `${t.side} ${t.symbol} ${t.amountPLN} zł${t.plPLN != null ? ' (' + t.plPLN + ' zł)' : ''}`), checked: quotes.length, held, traded: dec.executed.map(e => e.text), saved: dirty, alarm, tick: tick && (tick.decision?.summary || tick.why), lessons };
}
