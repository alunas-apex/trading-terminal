import { normalizeCoinGeckoTicker } from '../dataAggregator';
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
    const isVercel = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const ids = Object.keys(COIN_MAP).join(',');
    const url = isVercel
      ? `/api/coins?ids=${ids}`
      : `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`;

    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, unknown>[];

    const store = useMarketStore.getState();
    for (const coin of data) {
      const symbol = COIN_MAP[coin.id as string];
      if (symbol) {
        const ticker = normalizeCoinGeckoTicker(symbol, coin);
        // Only update if we don't have a live Binance ticker (Binance is more real-time)
        const existing = store.tickers.get(symbol);
        if (!existing || existing.source === 'coingecko') {
          store.updateTicker(ticker);
        }
      }
    }
  } catch (err) {
    console.error('[CoinGecko] Error:', err);
  }
}
