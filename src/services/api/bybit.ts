import { useMarketStore } from '../../stores/marketStore';
import type { Candle, Timeframe } from '../../types/market';

const TF_MAP: Record<Timeframe, string> = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '2h': '120', '4h': '240', '6h': '360', '8h': '480', '12h': '720',
  '1d': 'D', '3d': 'D', '1w': 'W', '1M': 'M',
};

// --- REST (via Vercel Edge proxy) ---

export async function fetchKlines(symbol: string, timeframe: Timeframe, limit: number = 500): Promise<Candle[]> {
  const url = `/api/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
  console.log('[Bybit] Fetching klines:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Klines HTTP ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error('Klines response is not an array');
  console.log(`[Bybit] Got ${data.length} candles`);
  return data as Candle[];
}

export async function fetchTicker(symbol: string): Promise<void> {
  try {
    const res = await fetch(`/api/ticker?symbol=${symbol}`);
    if (!res.ok) return;
    const ticker = await res.json();
    if (!ticker || !ticker.price) return;
    useMarketStore.getState().updateTicker({
      ...ticker,
      source: 'bybit',
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[Bybit] Ticker error:', err);
  }
}

export async function fetchOrderbook(symbol: string): Promise<void> {
  try {
    const res = await fetch(`/api/orderbook?symbol=${symbol}&limit=25`);
    if (!res.ok) return;
    const data = await res.json();
    if (!data.bids || !data.asks) return;
    useMarketStore.getState().setOrderbook({
      symbol,
      bids: data.bids,
      asks: data.asks,
      timestamp: Date.now(),
    });
  } catch (err) {
    console.warn('[Bybit] Orderbook error:', err);
  }
}

export async function fetchFundingRates(): Promise<void> {
  try {
    const res = await fetch('/api/funding-rates');
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    const store = useMarketStore.getState();
    for (const item of data) {
      store.updateFundingRate({
        symbol: item.symbol,
        rate: parseFloat(item.lastFundingRate),
        nextFundingTime: item.nextFundingTime,
        exchange: 'bybit',
      });
    }
  } catch (err) {
    console.warn('[Bybit] Funding rates error:', err);
  }
}

export async function fetchAllTickers(symbols: string[]): Promise<void> {
  for (const symbol of symbols) {
    await fetchTicker(symbol);
  }
}
