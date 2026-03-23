import { useMarketStore } from '../../stores/marketStore';
import type { Candle, Timeframe } from '../../types/market';

// --- Chart data via CryptoCompare (Vercel Edge proxy) ---

export async function fetchKlines(symbol: string, timeframe: Timeframe): Promise<Candle[]> {
  const url = `/api/klines?symbol=${symbol}&interval=${timeframe}&limit=300`;
  console.log('[Data] Fetching klines:', url);
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Data] Klines HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!Array.isArray(data)) {
      console.warn('[Data] Klines response not an array');
      return [];
    }
    console.log(`[Data] Got ${data.length} candles for ${symbol}:${timeframe}`);
    return data as Candle[];
  } catch (err) {
    console.warn('[Data] Klines error:', err);
    return [];
  }
}

// --- Tickers via CoinGecko (Vercel Edge proxy) ---

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
    console.warn('[Data] Ticker error:', err);
  }
}

// --- Orderbook via CoinGecko price (Vercel Edge proxy) ---

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
    console.warn('[Data] Orderbook error:', err);
  }
}

// --- Funding rates via CoinGecko derivatives (Vercel Edge proxy) ---

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
    console.warn('[Data] Funding rates error:', err);
  }
}

export async function fetchAllTickers(symbols: string[]): Promise<void> {
  // Handled by CoinGecko bulk endpoint in coingecko.ts
}
