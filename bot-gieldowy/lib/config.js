// Ustawienia eksperymentu. Wszystkie koszty są wzorowane na realnych brokerach
// dostępnych w Polsce (stan na listopad 2026).

export const START_CAPITAL_PLN = 200;
export const EXPERIMENT_DAYS = 7;
export const MIN_ORDER_PLN = 10;          // mniejszych zleceń nie składamy
export const MAX_POSITION_SHARE = 0.4;    // max 40% portfela w jednym instrumencie
export const AI_MODEL = 'anthropic/claude-sonnet-5.5';

// Koszty
export const FX_FEE = 0.005;              // XTB: 0,5% za przewalutowanie PLN <-> USD przy każdej transakcji
export const FEES = {
  stock: { commission: 0, label: 'XTB: 0% prowizji (do 100 tys. EUR obrotu / mies.)' },
  crypto: { commission: 0.001, label: 'Giełda krypto (np. Binance): 0,1% prowizji taker' },
};

// Instrumenty. Spread dla akcji/ETF modelujemy (typowy spread na giełdzie w USA),
// dla krypto bierzemy PRAWDZIWY bid/ask z giełdy Coinbase.
export const UNIVERSE = [
  { symbol: 'SPY',  name: 'S&P 500 (ETF)',        type: 'stock',  spread: 0.0002 },
  { symbol: 'QQQ',  name: 'Nasdaq 100 (ETF)',     type: 'stock',  spread: 0.0002 },
  { symbol: 'AAPL', name: 'Apple',                type: 'stock',  spread: 0.0004 },
  { symbol: 'MSFT', name: 'Microsoft',            type: 'stock',  spread: 0.0004 },
  { symbol: 'NVDA', name: 'Nvidia',               type: 'stock',  spread: 0.0004 },
  { symbol: 'AMZN', name: 'Amazon',               type: 'stock',  spread: 0.0004 },
  { symbol: 'TSLA', name: 'Tesla',                type: 'stock',  spread: 0.0006 },
  { symbol: 'BTC',  name: 'Bitcoin',              type: 'crypto', pair: 'BTC-USD' },
  { symbol: 'ETH',  name: 'Ethereum',             type: 'crypto', pair: 'ETH-USD' },
  { symbol: 'SOL',  name: 'Solana',               type: 'crypto', pair: 'SOL-USD' },
  // meme coiny (prawdziwy bid/ask z Coinbase; spready bywają kilka razy większe niż na BTC)
  { symbol: 'DOGE', name: 'Dogecoin (meme)',      type: 'crypto', pair: 'DOGE-USD', meme: true },
  { symbol: 'SHIB', name: 'Shiba Inu (meme)',     type: 'crypto', pair: 'SHIB-USD', meme: true },
  { symbol: 'PEPE', name: 'Pepe (meme)',          type: 'crypto', pair: 'PEPE-USD', meme: true },
  { symbol: 'BONK', name: 'Bonk (meme)',          type: 'crypto', pair: 'BONK-USD', meme: true },
  { symbol: 'WIF',  name: 'dogwifhat (meme)',     type: 'crypto', pair: 'WIF-USD', meme: true },
  { symbol: 'FARTCOIN', name: 'Fartcoin (meme)',  type: 'crypto', pair: 'FARTCOIN-USD', meme: true },
  { symbol: 'PENGU', name: 'Pudgy Penguins (meme)', type: 'crypto', pair: 'PENGU-USD', meme: true },
  { symbol: 'TRUMP', name: 'Official Trump (meme)', type: 'crypto', pair: 'TRUMP-USD', meme: true },
];

export const BENCHMARKS = [
  { id: 'SPY', label: 'Rynek (S&P 500), kup i trzymaj' },
  { id: 'BTC', label: 'Bitcoin, kup i trzymaj' },
];

// Dni bez sesji na NYSE (koniec 2026 / początek 2027)
export const US_HOLIDAYS = ['2026-11-26', '2026-12-25', '2027-01-01', '2027-01-18'];
export const US_HALF_DAYS = ['2026-11-27', '2026-12-24'];

// Drugi portfel: tryb agresywny (cel 1000 zł z 200 zł). Te same koszty, bez dźwigni.
export const AGGRO_GOAL_PLN = 1000;
export const AGGRO_MAX_POSITION_SHARE = 1.0;
