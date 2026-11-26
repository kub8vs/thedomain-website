import { authorized, deny } from '../lib/auth.js';
import { loadState, loadScalp } from '../lib/store.js';
import { scalpValue, scalpStats } from '../lib/scalp.js';
import { getMarket } from '../lib/market.js';
import { snapshot, costsInfo } from '../lib/engine.js';

export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (!authorized(req)) return deny(res);
  try {
    const [state, market, sc] = await Promise.all([loadState({ fresh: false }), getMarket(), loadScalp().catch(() => null)]);
    if (!state) return res.status(200).json({ notStarted: true, market, costs: costsInfo() });
    const { pv, bench } = snapshot(state, market);
    const fees = state.trades.reduce((a, t) => ({ fx: a.fx + t.fees.fx, commission: a.commission + t.fees.commission, spread: a.spread + t.fees.spread }), { fx: 0, commission: 0, spread: 0 });
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json({
      now: new Date().toISOString(),
      startedAt: state.startedAt, endsAt: state.endsAt, startCapitalPLN: state.startCapitalPLN,
      portfolio: pv, benchmarks: bench, equity: state.equity,
      trades: state.trades.slice(0, 200), decisions: state.decisions.slice(0, 200), notes: state.notes,
      fees, aiCostUSD: state.aiCostUSD, lessons: state.lessons || [], regime: state.regime || null, trend: state.trend ? { cash: state.trend.cash, positions: state.trend.positions, trades: state.trend.trades.slice(0, 50), log: state.trend.log, signals: state.trend.signals } : null, lessonsAt: state.lessonsAt || null,
      scalp: sc ? { value: scalpValue(sc, market.quotes, market.fx.rate), cash: sc.cash, positions: sc.positions, trades: sc.trades.slice(0, 30), stats: scalpStats(sc), startedAt: sc.startedAt } : null,
      market: { at: market.at, fx: market.fx, us: market.us, quotes: Object.values(market.quotes).map(q => ({
        symbol: q.symbol, name: q.name, type: q.type, mid: q.mid, bid: q.bid, ask: q.ask, ch24h: q.ch24h, ch7d: q.ch7d, ch1h: q.ch1h, ch15m: q.ch15m, rsi14h: q.rsi14h, high7d: q.high7d, low7d: q.low7d, meme: q.meme,
        spark: q.spark, tradable: q.tradable, error: q.error, spreadSource: q.spreadSource })) },
      costs: costsInfo(),
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: String(e.message || e) });
  }
}
