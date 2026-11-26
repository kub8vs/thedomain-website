// MINUTÓWKA: osobny portfel testowy (200 zł) do szybkiego tradingu minutowego, bez AI.
// Wejście: moneta rośnie mocno w 3 min (>= +0,5%), ostatnia świeca zielona, obrót 1,5x wyższy niż zwykle.
// Wyjście: cel +1%, stop -0,7%, albo po 10 min. Max 2 pozycje po 40 zł.
// Koszty jak na giełdzie krypto z kontem w USDC: 0,1% prowizji za każdą stronę + prawdziwy spread
// (kupno po cenie ask, sprzedaż po bid). Bez przewalutowania, bo przy 0,5% za stronę każdy taki ruch byłby na minusie.
export const SCALP = { START: 200, SIZE_PLN: 40, MAX_POS: 2, MOM_3M: 0.5, VOL_X: 1.5, TP: 1.0, SL: 0.7, MAX_MIN: 10, FEE: 0.001, COOLDOWN_MIN: 3 };

const r2 = x => Math.round(x * 100) / 100;

export function scalpInit() { return { cash: SCALP.START, positions: {}, trades: [], startedAt: new Date().toISOString() }; }

export function scalpValue(sc, Q, fx) {
  let v = sc.cash;
  for (const [sym, p] of Object.entries(sc.positions || {})) {
    const q = Q[sym]; const bid = q && !q.error ? q.bid : p.entryUSD;
    v += p.qty * bid * fx * (1 - SCALP.FEE);
  }
  return v;
}

// zwraca listę zdarzeń (kupno/sprzedaż); modyfikuje sc
export function runScalp(sc, Q, fx, now = new Date()) {
  const ev = [];
  for (const [sym, p] of Object.entries(sc.positions)) {
    const q = Q[sym]; if (!q || q.error) continue;
    const ch = (q.bid / p.entryUSD - 1) * 100;
    const age = (now - new Date(p.at)) / 60e3;
    let why = null;
    if (ch >= SCALP.TP) why = `cel +${SCALP.TP}% osiągnięty`;
    else if (ch <= -SCALP.SL) why = `stop -${SCALP.SL}%`;
    else if (age >= SCALP.MAX_MIN) why = `minęło ${SCALP.MAX_MIN} min`;
    if (!why) continue;
    const got = p.qty * q.bid * fx * (1 - SCALP.FEE);
    sc.cash += got;
    const pl = got - p.costPLN;
    const t = { id: crypto.randomUUID(), at: now.toISOString(), side: 'SPRZEDAŻ', symbol: sym, priceUSD: q.bid, amountPLN: r2(got), plPLN: r2(pl), minutes: Math.round(age), reason: `${why} (${ch >= 0 ? '+' : ''}${ch.toFixed(2)}% ceny)` };
    sc.trades.unshift(t); delete sc.positions[sym]; ev.push(t);
  }
  const open = Object.keys(sc.positions).length;
  if (open < SCALP.MAX_POS && sc.cash >= SCALP.SIZE_PLN) {
    const recent = s => sc.trades.find(t => t.symbol === s && (now - new Date(t.at)) / 60e3 < SCALP.COOLDOWN_MIN);
    const cands = Object.values(Q).filter(q => !q.error && !sc.positions[q.symbol] && !recent(q.symbol)
      && q.ch3m >= SCALP.MOM_3M && q.ch1m > 0 && q.green1m && (q.vol3_vs_30 || 0) >= SCALP.VOL_X
      && (q.ask - q.bid) / q.mid < 0.003)
      .sort((a, b) => b.ch3m - a.ch3m).slice(0, SCALP.MAX_POS - open);
    for (const q of cands) {
      const qty = SCALP.SIZE_PLN * (1 - SCALP.FEE) / (q.ask * fx);
      sc.cash -= SCALP.SIZE_PLN;
      sc.positions[q.symbol] = { qty, entryUSD: q.ask, costPLN: SCALP.SIZE_PLN, at: now.toISOString() };
      const t = { id: crypto.randomUUID(), at: now.toISOString(), side: 'KUPNO', symbol: q.symbol, priceUSD: q.ask, amountPLN: SCALP.SIZE_PLN, reason: `+${q.ch3m}% w 3 min, obrót x${q.vol3_vs_30}` };
      sc.trades.unshift(t); ev.push(t);
    }
  }
  sc.trades = sc.trades.slice(0, 400);
  return ev;
}

export function scalpStats(sc) {
  const sells = sc.trades.filter(t => t.side === 'SPRZEDAŻ');
  const wins = sells.filter(t => t.plPLN > 0).length;
  return { closed: sells.length, wins, pl: r2(sells.reduce((s, t) => s + t.plPLN, 0)) };
}
