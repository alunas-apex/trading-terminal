import { wsManager } from '../websocket';
import { useMarketStore } from '../../stores/marketStore';
import type { Candle, Timeframe } from '../../types/market';

const BINANCE_WS = 'wss://stream.binance.com:9443/ws';

const TF_MAP: Record<Timeframe, string> = {
  '1m': '1m', '3m': '3m', '5m': '5m', '15m': '15m', '30m': '30m',
  '1h': '1h', '2h': '2h', '4h': '4h', '6h': '6h', '8h': '8h', '12h': '12h',
  '1d': '1d', '3d': '3d', '1w': '1w', '1M': '1M',
};

export function subscribeTicker(symbol: string): void {
  const stream = symbol.toLowerCase() + '@ticker';
  wsManager.add(`binance-ticker-${symbol}`, {
    url: `${BINANCE_WS}/${stream}`,
    onMessage: (data) => {
      const d = data as Record<string, string>;
      if (d.e !== '24hrTicker') return;
      useMarketStore.getState().updateTicker({
        symbol: d.s,
        price: parseFloat(d.c),
        change24h: parseFloat(d.p),
        changePercent24h: parseFloat(d.P),
        high24h: parseFloat(d.h),
        low24h: parseFloat(d.l),
        volume24h: parseFloat(d.v),
        source: 'binance',
        timestamp: Date.now(),
      });
    },
    onOpen: () => {
      console.log('[WS] Ticker connected:', symbol);
      useMarketStore.getState().setConnectionStatus('binance', 'connected');
    },
    onClose: () => {
      useMarketStore.getState().setConnectionStatus('binance', 'disconnected');
    },
  });
}

export function subscribeKline(symbol: string, timeframe: Timeframe): void {
  const stream = `${symbol.toLowerCase()}@kline_${TF_MAP[timeframe]}`;
  wsManager.add(`binance-kline-${symbol}-${timeframe}`, {
    url: `${BINANCE_WS}/${stream}`,
    onMessage: (data) => {
      const d = data as Record<string, unknown>;
      if (d.e !== 'kline') return;
      const k = d.k as Record<string, string | number>;
      useMarketStore.getState().appendCandle(`${symbol}:${timeframe}`, {
        time: Math.floor((k.t as number) / 1000),
        open: parseFloat(k.o as string),
        high: parseFloat(k.h as string),
        low: parseFloat(k.l as string),
        close: parseFloat(k.c as string),
        volume: parseFloat(k.v as string),
      });
    },
  });
}

export function subscribeOrderbook(symbol: string): void {
  const stream = `${symbol.toLowerCase()}@depth20@1000ms`;
  wsManager.add(`binance-orderbook-${symbol}`, {
    url: `${BINANCE_WS}/${stream}`,
    onMessage: (data) => {
      const d = data as { bids?: string[][]; asks?: string[][]; lastUpdateId?: number };
      if (!d.bids || !d.asks) return;
      useMarketStore.getState().setOrderbook({
        symbol,
        bids: d.bids.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
        asks: d.asks.map(([p, q]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
        timestamp: Date.now(),
      });
    },
  });
}

export function subscribeTrades(symbol: string): void {
  const stream = `${symbol.toLowerCase()}@trade`;
  wsManager.add(`binance-trades-${symbol}`, {
    url: `${BINANCE_WS}/${stream}`,
    onMessage: (data) => {
      const d = data as Record<string, string | number | boolean>;
      if (d.e !== 'trade') return;
      useMarketStore.getState().addTrade({
        id: String(d.t),
        symbol: d.s as string,
        price: parseFloat(d.p as string),
        quantity: parseFloat(d.q as string),
        side: d.m ? 'sell' : 'buy',
        timestamp: d.T as number,
      });
    },
  });
}

export async function fetchKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 500
): Promise<Candle[]> {
  // Always use the proxy on deployed environments to avoid any CORS issues
  const useProxy = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
  const url = useProxy
    ? `/api/klines?symbol=${symbol}&interval=${TF_MAP[timeframe]}&limit=${limit}`
    : `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${TF_MAP[timeframe]}&limit=${limit}`;

  console.log('[Binance] Fetching klines:', url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Klines HTTP ${res.status}`);
  const data = (await res.json()) as (string | number)[][];
  if (!Array.isArray(data)) throw new Error('Klines response is not an array');
  console.log(`[Binance] Got ${data.length} klines`);
  return data.map((k) => ({
    time: Math.floor((k[0] as number) / 1000),
    open: parseFloat(k[1] as string),
    high: parseFloat(k[2] as string),
    low: parseFloat(k[3] as string),
    close: parseFloat(k[4] as string),
    volume: parseFloat(k[5] as string),
  }));
}

export async function fetchFundingRates(): Promise<void> {
  try {
    const useProxy = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const url = useProxy ? '/api/funding-rates' : 'https://fapi.binance.com/fapi/v1/premiumIndex';
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, unknown>[];
    if (!Array.isArray(data)) return;
    const store = useMarketStore.getState();
    for (const item of data.slice(0, 20)) {
      store.updateFundingRate({
        symbol: item.symbol as string,
        rate: parseFloat(item.lastFundingRate as string),
        nextFundingTime: item.nextFundingTime as number,
        exchange: 'binance',
      });
    }
  } catch (err) {
    console.warn('[Binance] Funding rates error:', err);
  }
}
