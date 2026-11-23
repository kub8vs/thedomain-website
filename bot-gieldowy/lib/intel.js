// Dodatkowe informacje dla AI z darmowych, uznanych źródeł.
// Każde źródło jest opcjonalne: jeśli nie odpowie, bot działa dalej bez niego.

const UA = { 'User-Agent': 'Mozilla/5.0 (paper-trading-bot)' };

async function get(url, as = 'json', timeout = 6000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { headers: UA, signal: ctrl.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return as === 'json' ? await r.json() : await r.text();
  } finally { clearTimeout(t); }
}

const GECKO_IDS = {
  SOL: 'solana', DOGE: 'dogecoin', SHIB: 'shiba-inu', PEPE: 'pepe', BONK: 'bonk', WIF: 'dogwifcoin',
  FARTCOIN: 'fartcoin', PENGU: 'pudgy-penguins', TRUMP: 'official-trump', BTC: 'bitcoin', ETH: 'ethereum',
};

const FEEDS = [
  { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/' },
  { name: 'The Block', url: 'https://www.theblock.co/rss.xml' },
  { name: 'Decrypt', url: 'https://decrypt.co/feed' },
  { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss' },
];

function parseRss(xml, source, max = 6) {
  const items = [];
  for (const m of xml.matchAll(/<item[\s>][\s\S]*?<\/item>/g)) {
    const raw = m[0];
    const pick = tag => {
      const x = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(raw);
      return x ? x[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#8217;|&#039;/g, "'").replace(/&quot;/g, '"').trim() : '';
    };
    const title = pick('title');
    const date = new Date(pick('pubDate'));
    if (!title) continue;
    if (!isNaN(date) && Date.now() - date > 36 * 3600e3) continue; // tylko świeże (36 h)
    items.push({ source, title: title.slice(0, 180), at: isNaN(date) ? null : date.toISOString() });
    if (items.length >= max) break;
  }
  return items;
}

export async function getIntel() {
  const ok = [];
  const [fng, gecko, trending, ...feeds] = await Promise.all([
    get('https://api.alternative.me/fng/?limit=2').then(j => { ok.push('Fear & Greed Index (alternative.me)'); return j.data; }).catch(() => null),
    get(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${Object.values(GECKO_IDS).join(',')}&price_change_percentage=1h,24h,7d`)
      .then(j => { ok.push('CoinGecko'); return j; }).catch(() => null),
    get('https://api.coingecko.com/api/v3/search/trending').then(j => j.coins?.slice(0, 7).map(c => c.item.symbol)).catch(() => null),
    ...FEEDS.map(f => get(f.url, 'text').then(x => { const items = parseRss(x, f.name); if (items.length) ok.push(f.name); return items; }).catch(() => [])),
  ]);

  const bySymbol = Object.fromEntries(Object.entries(GECKO_IDS).map(([s, id]) => [id, s]));
  const coins = (gecko || []).map(c => ({
    symbol: bySymbol[c.id], mcap_rank: c.market_cap_rank, volume_24h_musd: Math.round(c.total_volume / 1e6),
    vol_to_mcap: c.market_cap ? +(c.total_volume / c.market_cap).toFixed(3) : null,
    ch1h: c.price_change_percentage_1h_in_currency && +c.price_change_percentage_1h_in_currency.toFixed(2),
    ch24h: c.price_change_percentage_24h_in_currency && +c.price_change_percentage_24h_in_currency.toFixed(2),
    ch7d: c.price_change_percentage_7d_in_currency && +c.price_change_percentage_7d_in_currency.toFixed(2),
    from_ath_pct: c.ath_change_percentage && +c.ath_change_percentage.toFixed(1),
  }));
  const news = feeds.flat().sort((a, b) => (b.at || '').localeCompare(a.at || '')).slice(0, 16);

  return {
    sources: ok,
    fearGreed: fng ? { now: +fng[0].value, label: fng[0].value_classification, yesterday: +fng[1]?.value } : null,
    coins, trending: trending || [], news,
  };
}

export function intelForPrompt(i) {
  if (!i) return '(brak)';
  return [
    i.fearGreed ? `Indeks strachu i chciwości krypto: ${i.fearGreed.now}/100 (${i.fearGreed.label}), wczoraj ${i.fearGreed.yesterday}.` : '',
    i.coins.length ? `CoinGecko (wolumen, ranking, zmiany): ${JSON.stringify(i.coins)}` : '',
    i.trending.length ? `Najczęściej wyszukiwane teraz na CoinGecko: ${i.trending.join(', ')}` : '',
    i.news.length ? `Nagłówki z ostatnich 36 h:\n${i.news.map(n => `- [${n.source}${n.at ? ' ' + n.at.slice(5, 16).replace('T', ' ') : ''}] ${n.title}`).join('\n')}` : '',
  ].filter(Boolean).join('\n');
}
