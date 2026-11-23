// Dodatkowe darmowe dane dające przewagę przy krótkim tradingu meme coinów.
// 1) DexScreener: co się dzieje w sieci Solana (tam memy ruszają najpierw)
// 2) OKX (kontrakty): funding, zmiana otwartych pozycji, proporcja long/short
// 3) Coinbase: przewaga kupujących/sprzedających w książce zleceń tuż przy cenie
const UA = { 'User-Agent': 'Mozilla/5.0 (paper-trading-bot)' };
async function get(url, timeout = 6000) {
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
  try { const r = await fetch(url, { headers: UA, signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
  finally { clearTimeout(t); }
}
const r2 = x => Math.round(x * 100) / 100;

export const SOLANA_MINTS = {
  SOL: 'So11111111111111111111111111111111111111112',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  FARTCOIN: '9BB6NFEcjBCtnNLFko2FqVQBq8HHM13kCyYcdQbgpump',
  PENGU: '2zMMhcVQEXDtdE6vsFS7S7D5oUodfJHE8vd1gnBouauv',
  TRUMP: '6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN',
};

export async function getDex() {
  const out = {};
  await Promise.all(Object.entries(SOLANA_MINTS).map(async ([sym, mint]) => {
    try {
      const j = await get(`https://api.dexscreener.com/latest/dex/tokens/${mint}`);
      const pairs = (j.pairs || []).filter(p => p.chainId === 'solana' && p.baseToken?.address === mint);
      if (!pairs.length) return;
      const s = { b5: 0, s5: 0, b1h: 0, s1h: 0, v5: 0, v1h: 0, v6h: 0, liq: 0 };
      for (const p of pairs) {
        s.b5 += p.txns?.m5?.buys || 0; s.s5 += p.txns?.m5?.sells || 0;
        s.b1h += p.txns?.h1?.buys || 0; s.s1h += p.txns?.h1?.sells || 0;
        s.v5 += p.volume?.m5 || 0; s.v1h += p.volume?.h1 || 0; s.v6h += p.volume?.h6 || 0; s.liq += p.liquidity?.usd || 0;
      }
      out[sym] = {
        buys_5m: s.b5, sells_5m: s.s5, buys_1h: s.b1h, sells_1h: s.s1h,
        buy_ratio_1h: s.b1h + s.s1h ? r2(s.b1h / (s.b1h + s.s1h)) : null,
        vol_5m_usd: Math.round(s.v5), vol_1h_usd: Math.round(s.v1h),
        vol_1h_vs_6h_avg: s.v6h ? r2(s.v1h / (s.v6h / 6)) : null, // >1 = obrót przyspiesza
        liquidity_musd: r2(s.liq / 1e6),
      };
    } catch {}
  }));
  return out;
}

const OKX = ['SOL', 'DOGE', 'SHIB', 'PEPE', 'BONK', 'WIF', 'FARTCOIN', 'PENGU', 'TRUMP', 'BTC'];
export async function getDerivs() {
  const out = {};
  await Promise.all(OKX.map(async sym => {
    const id = `${sym}-USDT-SWAP`;
    try {
      const [f, oi, ls] = await Promise.all([
        get(`https://www.okx.com/api/v5/public/funding-rate?instId=${id}`).catch(() => null),
        get(`https://www.okx.com/api/v5/rubik/stat/contracts/open-interest-history?instId=${id}&period=5m&limit=13`).catch(() => null),
        get(`https://www.okx.com/api/v5/rubik/stat/contracts/long-short-account-ratio-contract?instId=${id}&period=5m&limit=1`).catch(() => null),
      ]);
      const o = {};
      const fr = f?.data?.[0]?.fundingRate; if (fr != null) o.funding_pct_8h = +(+fr * 100).toFixed(4);
      const h = oi?.data || [];
      if (h.length >= 2) { const now = +h[0][3], hAgo = +h[h.length - 1][3]; o.open_interest_musd = r2(now / 1e6); o.oi_change_1h_pct = hAgo ? r2((now / hAgo - 1) * 100) : null; }
      const l = ls?.data?.[0]?.[1]; if (l != null) o.long_short_accounts = r2(+l);
      if (Object.keys(o).length) out[sym] = o;
    } catch {}
  }));
  return out;
}

export async function getBooks(pairs) {
  const out = {};
  for (let i = 0; i < pairs.length; i += 5) {
    await Promise.all(pairs.slice(i, i + 5).map(async ({ symbol, pair }) => {
      try {
        const b = await get(`https://api.exchange.coinbase.com/products/${pair}/book?level=2`);
        const bid = +b.bids[0][0], ask = +b.asks[0][0], mid = (bid + ask) / 2;
        const depth = (side, pct) => side.filter(([p]) => Math.abs(+p / mid - 1) <= pct).reduce((s, [p, q]) => s + +p * +q, 0);
        const b05 = depth(b.bids, .005), a05 = depth(b.asks, .005), b2 = depth(b.bids, .02), a2 = depth(b.asks, .02);
        out[symbol] = { bid_usd_0_5pct: Math.round(b05), ask_usd_0_5pct: Math.round(a05), imbalance_0_5pct: b05 + a05 ? r2((b05 - a05) / (b05 + a05)) : null, imbalance_2pct: b2 + a2 ? r2((b2 - a2) / (b2 + a2)) : null };
      } catch {}
    }));
  }
  return out;
}

export function edgeForPrompt(e) {
  if (!e) return '';
  const lines = [];
  if (e.dex && Object.keys(e.dex).length) lines.push(`SIEĆ SOLANA (DexScreener, suma wszystkich par): buy_ratio_1h > 0.55 = przewaga kupujących; vol_1h_vs_6h_avg > 1.5 = obrót przyspiesza:\n${JSON.stringify(e.dex)}`);
  if (e.derivs && Object.keys(e.derivs).length) lines.push(`KONTRAKTY (OKX): funding > 0.03% = przegrzane longi (ryzyko zrzutu), funding ujemny + rosnąca cena = szansa na wyciskanie shortów; oi_change_1h_pct rośnie razem z ceną = trend z nowym kapitałem:\n${JSON.stringify(e.derivs)}`);
  if (e.books && Object.keys(e.books).length) lines.push(`KSIĄŻKA ZLECEŃ (Coinbase): imbalance od -1 (przewaga sprzedających) do +1 (przewaga kupujących):\n${JSON.stringify(e.books)}`);
  return lines.join('\n');
}
