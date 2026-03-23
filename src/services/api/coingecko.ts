import { useMarketStore } from '../../stores/marketStore';

const COIN_MAP: Record<string, string> = {
  bitcoin: 'BTCUSDT',
  ethereum: 'ETHUSDT',
  solana: 'SOLUSDT',
  binancecoin: 'BNBUSDT',
  ripple: 'XRPUSDT',
  dogecoin: 'DOGEUSDT',
  cardano: 'ADAUSDT',
};

export async function fetchTopCoins(): Promise<void> {
  try {
    const useProxy = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const ids = Object.keys(COIN_MAP).join(',');
    const url = useProxy
      ? `/api/coins?ids=${ids}`
      : `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`;

    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(data)) return;

    const store = useMarketStore.getState();
    for (const coin of data) {
      const symbol = COIN_MAP[coin.id as string];
      if (!symbol) continue;
      // Only use CoinGecko data if we don't already have live Binance data
      const existing = store.tickers[symbol];
      if (existing && existing.source === 'binance') continue;
      store.updateTicker({
        symbol,
        price: coin.current_price as number,
        change24h: coin.price_change_24h as number,
        changePercent24h: coin.price_change_percentage_24h as number,
        high24h: coin.high_24h as number,
        low24h: coin.low_24h as number,
        volume24h: coin.total_volume as number,
        source: 'coingecko',
        timestamp: Date.now(),
      });
    }
  } catch (err) {
    console.warn('[CoinGecko] Error:', err);
  }
}
