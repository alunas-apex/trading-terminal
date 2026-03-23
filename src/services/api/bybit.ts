import { useMarketStore } from '../../stores/marketStore';
import type { Candle, Timeframe } from '../../types/market';

// --- REST via Vercel Edge proxy (CoinGecko-backed) ---

let lastKlineFetch = 0;
const KLINE_COOLDOWN = 5000; // 5s minimum between kline fetches

export async function fetchKlines(symbol: string, timeframe: Timeframe, limit: number = 500): Promise<Candle[]> {
  // Rate-limit client side too
  const now = Date.now();
  if (now - lastKlineFetch < KLINE_COOLDOWN) {
    const existing = useMarketStore.getState().candles[`${symbol}:${timeframe}`];
    if (existing && existing.length > 0) return existing;
  }
  lastKlineFetch = now;

  const url = `/api/klines?symbol=${symbol}&interval=${timeframe}&limit=${limit}`;
  console.log('[Data] Fetching klines:', url);
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
}

let lastTickerFetch = 0;
const TICKER_COOLDOWN = 10000;

export async function fetchTicker(symbol: string): Promise<void> {
  const now = Date.now();
  if (now - lastTickerFetch < TICKER_COOLDOWN) return;
  lastTickerFetch = now;

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

let lastOBFetch = 0;
const OB_COOLDOWN = 10000;

export async function fetchOrderbook(symbol: string): Promise<void> {
  const now = Date.now();
  if (now - lastOBFetch < OB_COOLDOWN) return;
  lastOBFetch = now;

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
  // Use CoinGecko bulk endpoint instead of individual calls
  try {
    const res = await fetch('/api/coins');
    if (!res.ok) return;
    const data = await res.json();
    if (!Array.isArray(data)) return;
    // CoinGecko coins endpoint already handled in coingecko.ts
  } catch {
    // Silently fail — CoinGecko polling in App.tsx handles this
  }
}
