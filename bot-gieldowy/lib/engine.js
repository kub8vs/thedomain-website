import { START_CAPITAL_PLN, EXPERIMENT_DAYS, BENCHMARKS, FX_FEE, FEES, UNIVERSE, AGGRO_GOAL_PLN, AGGRO_MAX_POSITION_SHARE, TRADABLE_ONLY } from './config.js';
import { getMarket } from './market.js';
import { loadState, saveState } from './store.js';
import { portfolioValue, benchmarkValue, quoteBuy, execute } from './broker.js';
import { askAI } from './ai.js';
import { getIntel } from './intel.js';
import { getDex, getDerivs, getBooks } from './edge.js';
import { notify, tradeMessage, moveMessage } from './push.js';

export function newState() {
  const now = new Date();
  return {
    version: 1,
    startedAt: now.toISOString(),
    endsAt: new Date(now.getTime() + EXPERIMENT_DAYS * 864e5).toISOString(),
    startCapitalPLN: START_CAPITAL_PLN,
    cash: START_CAPITAL_PLN,
    positions: {},
    benchmarks: BENCHMARKS.map(b => ({ ...b, cashPLN: START_CAPITAL_PLN, qty: 0 })),
    trades: [], decisions: [], equity: [], notes: [],
    aiCostUSD: 0,
  };
}

function buyBenchmarks(state, market) {
  for (const b of state.benchmarks) {
    if (b.qty) continue;
    const q = market.quotes[b.id];
    if (!q || q.error || !q.tradable) continue;
    const { qty, fees } = quoteBuy(q, b.cashPLN, market.fx.rate);
    Object.assign(b, { qty, boughtAt: market.at, priceUSD: q.ask, fees });
  }
}

export function snapshot(state, market) {
  const pv = portfolioValue(state, market);
  const bench = state.benchmarks.map(b => ({ id: b.id, label: b.label, value: benchmarkValue(b, market), pending: !b.qty }));
  return { pv, bench };
}

function recordEquity(state, pv, bench) {
  const p = { t: new Date().toISOString(), ai: +pv.total.toFixed(2) };
  for (const b of bench) p[b.id] = +b.value.toFixed(2);
  const last = state.equity[state.equity.length - 1];
  if (last && Date.now() - new Date(last.t) < 3 * 60e3) state.equity[state.equity.length - 1] = p;
  else state.equity.push(p);
}

export async function runTick({ source = 'cron', force = false, alarm = null } = {}) {
  let state = await loadState();
  const fresh = !state;
  if (fresh) state = newState();
  const market = await getMarket();
  buyBenchmarks(state, market);

  const now = new Date();
  state.day = Math.min(EXPERIMENT_DAYS, Math.floor((now - new Date(state.startedAt)) / 864e5) + 1);
  const finished = now > new Date(state.endsAt);
  const last = state.decisions.find(d => !d.error && d.source !== 'strażnik');
  const tooSoon = last && now - new Date(last.at) < (force ? 1.5 : 4) * 60e3;

  let result = { skipped: true, why: finished ? 'eksperyment zakończony' : 'za wcześnie od ostatniej decyzji' };
  if (!finished && !tooSoon) {
    const books = UNIVERSE.filter(u => (TRADABLE_ONLY.includes(u.symbol)) && u.pair);
    const [intel, dex, derivs, ob] = await Promise.all([getIntel().catch(() => null), getDex().catch(() => ({})), getDerivs().catch(() => ({})), getBooks(books).catch(() => ({}))]);
    if (intel) {
      intel.edge = { dex, derivs, books: ob };
      if (Object.keys(dex).length) intel.sources.push('DexScreener (sieć Solana)');
      if (Object.keys(derivs).length) intel.sources.push('OKX (kontrakty)');
      if (Object.keys(ob).length) intel.sources.push('Coinbase (książka zleceń)');
    }
    const ctx = { state, market, intel, alarm, mode: 'aggro', ...snapshot(state, market) };
    const dec = { id: crypto.randomUUID(), at: now.toISOString(), source, alarm: alarm || undefined, executed: [], rejected: [] };
    try {
      const { decision, usage, model } = await askAI(ctx);
      dec.model = model;
      dec.summary = decision.decision_summary || '';
      dec.marketView = decision.market_view || '';
      dec.confidence = decision.confidence;
      dec.sourcesUsed = Array.isArray(decision.sources_used) ? decision.sources_used.slice(0, 6).map(String) : [];
      dec.keyInfo = decision.key_info || '';
      dec.sourcesAvailable = intel?.sources || [];
      dec.fearGreed = intel?.fearGreed?.now ?? null;
      dec.raw = decision.actions || [];
      if (usage) {
        dec.tokens = { in: usage.prompt_tokens, out: usage.completion_tokens };
        state.aiCostUSD += (usage.prompt_tokens * 2 + usage.completion_tokens * 10) / 1e6;
      }
      const acts = (decision.actions || []).slice().sort((a, b) => (a.action === 'sell' ? -1 : 1) - (b.action === 'sell' ? -1 : 1));
      for (const a of acts) {
        const r = execute(state, market, { ...a, symbol: String(a.symbol || '').toUpperCase() }, dec.at, AGGRO_MAX_POSITION_SHARE);
        if (r.ok) dec.executed.push({ tradeId: r.trade.id, text: `${r.trade.side} ${r.trade.symbol} za ${r.trade.amountPLN.toFixed(2)} zł` });
        else dec.rejected.push({ text: r.why });
      }
    } catch (e) {
      dec.error = String(e.message || e);
      dec.summary = 'AI nie odpowiedziało, więc nic nie zmieniam (bezpieczny tryb).';
    }
    state.decisions.unshift(dec);
    state.decisions = state.decisions.slice(0, 600);
    result = { skipped: false, decision: dec };
  }
  const snap = snapshot(state, market);
  recordEquity(state, snap.pv, snap.bench);
  const msgs = [];
  if (result.decision?.executed?.length) {
    const T = Object.fromEntries(state.trades.slice(0, 20).map(t => [t.id, t]));
    msgs.push(tradeMessage(result.decision, result.decision.executed.map(e => T[e.tradeId]).filter(Boolean), snap.pv.total));
  }
  msgs.push(moveMessage(state, snap.pv.total, AGGRO_GOAL_PLN));
  await saveState(state);
  await notify(msgs).catch(e => console.error('push', e));
  return { fresh, ...result };
}

export function costsInfo() {
  return {
    goalPLN: AGGRO_GOAL_PLN, maxShare: AGGRO_MAX_POSITION_SHARE, tradable: TRADABLE_ONLY,
    fx: FX_FEE, stock: FEES.stock, crypto: FEES.crypto,
    universe: UNIVERSE.map(u => ({ symbol: u.symbol, name: u.name, type: u.type })),
  };
}
