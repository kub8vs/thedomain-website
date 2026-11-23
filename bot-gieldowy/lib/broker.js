import { FX_FEE, FEES, MIN_ORDER_PLN, MAX_POSITION_SHARE, TRADABLE_ONLY, DEFAULT_STOP_PCT, DEFAULT_TAKE_PCT, MIN_HOLD_MIN } from './config.js';

const r2 = x => Math.round(x * 100) / 100;

// Ile dostałbym w PLN, gdybym sprzedał `qty` teraz (bid, prowizja, przewalutowanie).
export function liquidationPLN(q, qty, fx) {
  const usd = qty * q.bid;
  const comm = usd * FEES[q.type].commission;
  return (usd - comm) * fx * (1 - FX_FEE);
}

export function portfolioValue(state, market) {
  const fx = market.fx.rate;
  let positions = 0;
  const rows = [];
  for (const [sym, p] of Object.entries(state.positions)) {
    const q = market.quotes[sym];
    if (!q || q.error) { // brak ceny: wyceniamy po ostatniej znanej
      const v = p.lastValuePLN ?? p.costPLN;
      positions += v; rows.push({ symbol: sym, qty: p.qty, valuePLN: v, costPLN: p.costPLN, stale: true });
      continue;
    }
    const v = liquidationPLN(q, p.qty, fx);
    p.lastValuePLN = v;
    positions += v;
    rows.push({ symbol: sym, name: q.name, type: q.type, qty: p.qty, price: q.bid, valuePLN: v, costPLN: p.costPLN,
      plPLN: v - p.costPLN, plPct: (v / p.costPLN - 1) * 100, openedAt: p.openedAt, ...guardLevels(p) });
  }
  return { cash: state.cash, positions, total: state.cash + positions, rows };
}

export function benchmarkValue(b, market) {
  if (!b.qty) return b.cashPLN; // jeszcze nie kupiony (np. giełda w USA zamknięta)
  const q = market.quotes[b.id];
  if (!q || q.error) return b.lastValuePLN ?? b.cashPLN;
  b.lastValuePLN = liquidationPLN(q, b.qty, market.fx.rate);
  return b.lastValuePLN;
}

// Kupno za kwotę `pln` (całkowity koszt po stronie gotówki)
export function quoteBuy(q, pln, fx) {
  const fxFee = pln * FX_FEE;
  const usd = (pln - fxFee) / fx;
  const comm = usd * FEES[q.type].commission;
  const qty = (usd - comm) / q.ask;
  const spreadPLN = qty * (q.ask - q.mid) * fx;
  return { qty, fees: { fx: fxFee, commission: comm * fx, spread: spreadPLN } };
}

export function execute(state, market, order, now = new Date().toISOString(), maxShare = MAX_POSITION_SHARE) {
  const fx = market.fx.rate;
  const q = market.quotes[order.symbol];
  if (!q) return { ok: false, why: `nieznany instrument ${order.symbol}` };
  if (!order.anySymbol && TRADABLE_ONLY?.length && !TRADABLE_ONLY.includes(order.symbol) && !(order.action === 'sell' && state.positions[order.symbol])) return { ok: false, why: `${order.symbol}: handlujemy tylko ${TRADABLE_ONLY.join(', ')}` };
  if (q.error) return { ok: false, why: `brak ceny dla ${order.symbol}` };
  if (!q.tradable) return { ok: false, why: `${order.symbol}: giełda w USA zamknięta (${market.us.reason})` };

  if (order.action === 'buy') {
    let pln = Math.min(+order.amount_pln || 0, state.cash);
    const total = portfolioValue(state, market).total;
    const have = state.positions[q.symbol] ? liquidationPLN(q, state.positions[q.symbol].qty, fx) : 0;
    const room = total * maxShare - have;
    if (pln > room) pln = Math.max(0, room);
    pln = Math.floor(pln * 100) / 100;
    if (pln < MIN_ORDER_PLN) return { ok: false, why: `${q.symbol}: za mała kwota (${r2(pln)} zł, min ${MIN_ORDER_PLN} zł lub limit ${Math.round(maxShare * 100)}% portfela)` };
    const { qty, fees } = quoteBuy(q, pln, fx);
    state.cash -= pln;
    const p = state.positions[q.symbol] || { qty: 0, costPLN: 0, openedAt: now };
    p.entryUSD = ((p.entryUSD || 0) * p.qty + q.ask * qty) / (p.qty + qty);
    p.qty += qty; p.costPLN += pln;
    const clamp = (x, lo, hi, d) => Number.isFinite(+x) && +x > 0 ? Math.min(hi, Math.max(lo, +x)) : d;
    p.stopPct = clamp(order.stop_loss_pct, 1.5, 15, p.stopPct || DEFAULT_STOP_PCT);
    p.takePct = clamp(order.take_profit_pct, 2, 60, p.takePct || DEFAULT_TAKE_PCT);
    p.peakUSD = Math.max(p.peakUSD || 0, q.bid);
    p.tookProfit = false;
    state.positions[q.symbol] = p;
    const t = { id: crypto.randomUUID(), at: now, side: 'KUPNO', symbol: q.symbol, name: q.name, qty, priceUSD: q.ask,
      fx, amountPLN: pln, fees, feesTotal: fees.fx + fees.commission + fees.spread, reason: order.reason || '' };
    state.trades.unshift(t);
    return { ok: true, trade: t };
  }

  if (order.action === 'sell') {
    const p = state.positions[q.symbol];
    if (!p) return { ok: false, why: `${q.symbol}: brak pozycji do sprzedaży` };
    const ageMin = (new Date(now) - new Date(p.openedAt)) / 60e3;
    const lossPct = p.entryUSD ? (q.bid / p.entryUSD - 1) * 100 : 0;
    if (!order.guard && ageMin < MIN_HOLD_MIN && lossPct > -(p.stopPct || DEFAULT_STOP_PCT))
      return { ok: false, why: `${q.symbol}: pozycja ma dopiero ${Math.round(ageMin)} min (min. ${MIN_HOLD_MIN} min, żeby nie przepalać opłat; przed dużą stratą chroni stop)` };
    const frac = Math.min(1, Math.max(0, order.fraction == null ? 1 : +order.fraction));
    let qty = p.qty * frac;
    const remainingPLN = liquidationPLN(q, p.qty - qty, fx);
    if (remainingPLN < MIN_ORDER_PLN) qty = p.qty; // nie zostawiamy okruszków
    const usd = qty * q.bid;
    const comm = usd * FEES[q.type].commission;
    const plnBefore = (usd - comm) * fx;
    const fxFee = plnBefore * FX_FEE;
    const pln = plnBefore - fxFee;
    const spreadPLN = qty * (q.mid - q.bid) * fx;
    const costPart = p.costPLN * (qty / p.qty);
    state.cash += pln;
    p.qty -= qty; p.costPLN -= costPart;
    if (p.qty <= 1e-12) delete state.positions[q.symbol];
    const fees = { fx: fxFee, commission: comm * fx, spread: spreadPLN };
    const t = { id: crypto.randomUUID(), at: now, side: 'SPRZEDAŻ', symbol: q.symbol, name: q.name, qty, priceUSD: q.bid,
      fx, amountPLN: pln, fees, feesTotal: fees.fx + fees.commission + fees.spread, plPLN: pln - costPart, reason: order.reason || '', guard: order.guard || undefined };
    state.trades.unshift(t);
    return { ok: true, trade: t };
  }
  return { ok: false, why: 'nieznana akcja' };
}

// Poziomy ochrony pozycji (USD): stop kroczący od szczytu i cel częściowej realizacji zysku
export function guardLevels(p) {
  if (!p.entryUSD) return {};
  const stopPct = p.stopPct || DEFAULT_STOP_PCT, takePct = p.takePct || DEFAULT_TAKE_PCT;
  const peak = Math.max(p.peakUSD || 0, p.entryUSD);
  // po realizacji połowy zysku stop nie schodzi poniżej ceny wejścia
  const stopUSD = Math.max(peak * (1 - stopPct / 100), p.tookProfit ? p.entryUSD * 1.003 : 0);
  return { entryUSD: p.entryUSD, peakUSD: peak, stopUSD, takeUSD: p.tookProfit ? null : p.entryUSD * (1 + takePct / 100), stopPct, takePct, tookProfit: !!p.tookProfit };
}
