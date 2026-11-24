// Reżim rynku + strażnik ryzyka z prawem weta. Wszystko liczone w kodzie, nie przez model językowy.

// Kalendarz wydarzeń (czas UTC). Źródło: notatka kuba z 23.11.2026 + kalendarz NYSE.
export const EVENTS = [
  { at: '2026-11-25T13:30:00Z', name: 'USA: inflacja PCE, PKB Q3, dochody i wydatki', impact: 'high' },
  { at: '2026-11-25T19:00:00Z', name: 'USA: Beige Book Fed', impact: 'medium' },
  { at: '2026-11-26T00:00:00Z', end: '2026-11-27T00:00:00Z', name: 'Święto Dziękczynienia: giełdy w USA zamknięte, niska płynność', impact: 'low-liquidity' },
  { at: '2026-11-27T14:30:00Z', end: '2026-11-27T18:00:00Z', name: 'USA: skrócona sesja, cienka płynność', impact: 'low-liquidity' },
  { at: '2026-12-04T13:30:00Z', name: 'USA: raport z rynku pracy (NFP)', impact: 'high' },
  { at: '2026-12-09T19:00:00Z', name: 'Fed (FOMC): decyzja, dot plot, konferencja', impact: 'high' },
  { at: '2026-12-10T13:30:00Z', name: 'USA: inflacja CPI', impact: 'high' },
  { at: '2026-12-17T12:00:00Z', name: 'EBC / Bank Anglii / Bank Japonii', impact: 'high' },
];

export const RISK = {
  DAILY_LOSS_STOP_PCT: 6,   // po -6% od początku dnia: zakaz nowych kupna do północy
  MAX_POSITIONS: 2,         // memy są mocno skorelowane: max 2 naraz
  HIGH_VOL_MAX_SHARE: 0.6,  // przy wysokiej zmienności max 60% portfela w jednej monecie
  LOW_LIQ_MAX_SHARE: 0.5,   // w dni niskiej płynności max 50%
  EVENT_BEFORE_MIN: 30, EVENT_AFTER_MIN: 60,
};

export function eventStatus(now = new Date()) {
  const t = now.getTime();
  const active = [], upcoming = [];
  for (const e of EVENTS) {
    const s = new Date(e.at).getTime(), end = e.end ? new Date(e.end).getTime() : s;
    if (e.impact === 'high' && t >= s - RISK.EVENT_BEFORE_MIN * 60e3 && t <= s + RISK.EVENT_AFTER_MIN * 60e3) active.push(e);
    else if (e.impact === 'low-liquidity' && t >= s && t <= end) active.push(e);
    else if (s > t && s - t < 72 * 3600e3) upcoming.push(e);
  }
  return { active, upcoming };
}

// Okno płynności dla krypto (największy obrót: otwarcie Europy 7-10 UTC i nakładanie z USA 13:30-17 UTC)
export function liquidityWindow(now = new Date()) {
  const wd = now.getUTCDay(), m = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (wd === 0 || wd === 6) return 'weekend (cieńsza płynność)';
  if (m >= 13 * 60 + 30 && m < 17 * 60) return 'nakładanie się sesji Europa + USA (najwyższa płynność)';
  if (m >= 7 * 60 && m < 10 * 60) return 'otwarcie Europy (rosnąca płynność)';
  if (m >= 21 * 60 || m < 1 * 60) return 'po zamknięciu USA (spadająca płynność)';
  if (m >= 1 * 60 && m < 7 * 60) return 'sesja azjatycka (niższa płynność)';
  return 'normalna sesja';
}

// Stop i cel liczone z ATR (zmienności godzinowej): stop = 2 x ATR, cel = 2 x stop (zysk:ryzyko 2:1)
export function atrLevels(q) {
  const atr = q?.atr14h_pct;
  const stopPct = Number.isFinite(atr) ? Math.min(12, Math.max(2, +(2 * atr).toFixed(1))) : 4;
  return { stopPct, takePct: +(2 * stopPct).toFixed(1) };
}

export function dayStartTotal(state, now = new Date()) {
  const day = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' });
  const p = state.equity.find(e => new Date(e.t).toLocaleDateString('sv-SE', { timeZone: 'Europe/Warsaw' }) === day);
  return p ? p.ai : state.startCapitalPLN;
}

export function regimeSummary(state, market, total, now = new Date()) {
  const ev = eventStatus(now);
  const btc = market.quotes.BTC, sol = market.quotes.SOL;
  const dayStart = dayStartTotal(state, now);
  return {
    at: now.toISOString(),
    btc: btc && !btc.error ? { trend: btc.regime, vol: btc.vol_regime } : null,
    sol: sol && !sol.error ? { trend: sol.regime, vol: sol.vol_regime } : null,
    liquidity: liquidityWindow(now),
    events_now: ev.active.map(e => e.name),
    events_next_72h: ev.upcoming.map(e => `${e.at.slice(5, 16).replace('T', ' ')} UTC: ${e.name}`),
    day_pl_pct: +((total / dayStart - 1) * 100).toFixed(2),
    daily_stop_hit: total / dayStart - 1 <= -RISK.DAILY_LOSS_STOP_PCT / 100,
  };
}

// Weto lub zmniejszenie zlecenia kupna. Zwraca { ok, why, maxShare }
// Wyniki testu na 180 dniach świec godzinowych (maj–lis 2026), z kosztami aplikacji.
// Każdy z 5 setupów był na minusie po kosztach; Momentum i Siła vs BTC jako jedyne
// były blisko zera w próbie, więc zostają, ale tylko w trendzie w górę i mniejszą pozycją.
export const BACKTEST = {
  ALLOWED: ['momentum', 'siła relatywna', 'sila relatywna'],
  MAX_SHARE: 0.5,
  // Tryb nauki (kub 2026-11-24): poza trendem bot może wchodzić małą kwotą, żeby było widać ruchy.
  LEARN_MODE: true,
  LEARN_MAX_SHARE: 0.25,
  SUMMARY: 'Test 180 dni (1h, koszty aplikacji): VWAP kontynuacja śr. -1,56% na transakcję, VWAP powrót -1,69% (548 transakcji), Sweep -1,82% (848), Momentum -1,25% (w próbie -0,94, poza próbą -2,41), Siła vs BTC -1,20% (w próbie -0,78, poza próbą -2,41). Kup i trzymaj: SOL -12%, memy -34% do -63%. Żaden setup nie zarabiał po kosztach; najwięcej traciły częste wejścia.',
};

export function riskCheck(state, market, order, regime, now = new Date()) {
  if (order.action !== 'buy') return { ok: true };
  if (regime.daily_stop_hit) return { ok: false, why: `weto ryzyka: dzienny limit straty -${RISK.DAILY_LOSS_STOP_PCT}% osiągnięty (${regime.day_pl_pct}%), zakaz nowych kupna do północy` };
  const ev = eventStatus(now);
  const hot = ev.active.find(e => e.impact === 'high');
  if (hot) return { ok: false, why: `weto ryzyka: trwa okno ważnego wydarzenia (${hot.name}), czekam aż rynek się uspokoi` };
  const open = Object.keys(state.positions).filter(s => s !== order.symbol);
  if (open.length >= RISK.MAX_POSITIONS) return { ok: false, why: `weto ryzyka: już ${open.length} otwarte pozycje (max ${RISK.MAX_POSITIONS}, memy ruszają się razem)` };
  const q = market.quotes[order.symbol];
  const setup = String(order.setup || '').toLowerCase();
  const allowed = BACKTEST.ALLOWED.find(x => setup.includes(x));
  const proven = allowed && q?.regime === 'trend w górę';
  if (!proven && !BACKTEST.LEARN_MODE) {
    if (!allowed) return { ok: false, why: `weto testu historycznego: setup "${order.setup || 'brak'}" tracił po kosztach na 6 miesiącach danych, dozwolone tylko Momentum po katalizatorze i Siła relatywna` };
    return { ok: false, why: `weto testu historycznego: ${order.symbol} nie jest w trendzie w górę (${q?.regime || 'brak danych'}), a poza trendem każdy setup tracił` };
  }
  let maxShare = proven ? BACKTEST.MAX_SHARE : BACKTEST.LEARN_MAX_SHARE;
  let notes = [proven ? 'setup bez udowodnionej przewagi' : 'tryb nauki, mała pozycja'];
  if (q?.vol_regime === 'wysoka') { maxShare = Math.min(maxShare, RISK.HIGH_VOL_MAX_SHARE); notes.push('wysoka zmienność'); }
  if (ev.active.some(e => e.impact === 'low-liquidity')) { maxShare = Math.min(maxShare, RISK.LOW_LIQ_MAX_SHARE); notes.push('niska płynność'); }
  return { ok: true, maxShare, note: notes.join(', ') };
}
