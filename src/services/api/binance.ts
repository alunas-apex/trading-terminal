import { wsManager } from '../websocket';
import {
  normalizeBinanceTicker,
  normalizeBinanceKline,
  normalizeBinanceOrderbook,
  normalizeBinanceTrade,
} from '../dataAggregator';
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
      const record = data as Record<string, unknown>;
      if (record.e === '24hrTicker') {
        const ticker = normalizeBinanceTicker(record);
        useMarketStore.getState().updateTicker(ticker);
      }
    },
    onOpen: () => {
      console.log(`[Binance WS] Ticker connected: ${symbol}`);
      useMarketStore.getState().setConnectionStatus('binance', 'connected');
    },
    onClose: () => {
      useMarketStore.getState().setConnectionStatus('binance', 'disconnected');
    },
    onError: (err) => {
      console.error(`[Binance WS] Ticker error: ${symbol}`, err);
    },
  });
}

export function subscribeKline(symbol: string, timeframe: Timeframe): void {
  const stream = `${symbol.toLowerCase()}@kline_${TF_MAP[timeframe]}`;
  wsManager.add(`binance-kline-${symbol}-${timeframe}`, {
    url: `${BINANCE_WS}/${stream}`,
    onMessage: (data) => {
      const record = data as Record<string, unknown>;
      if (record.e === 'kline') {
        const candle = normalizeBinanceKline(record);
        const key = `${symbol}:${timeframe}`;
        useMarketStore.getState().appendCandle(key, candle);
      }
    },
  });
}

export function subscribeOrderbook(symbol: string): void {
  const stream = `${symbol.toLowerCase()}@depth20@1000ms`;
  wsManager.add(`binance-orderbook-${symbol}`, {
    url: `${BINANCE_WS}/${stream}`,
    onMessage: (data) => {
      const record = data as Record<string, unknown>;
      const ob = normalizeBinanceOrderbook({ ...record, s: symbol });
      useMarketStore.getState().setOrderbook(ob);
    },
  });
}

export function subscribeTrades(symbol: string): void {
  const stream = `${symbol.toLowerCase()}@trade`;
  wsManager.add(`binance-trades-${symbol}`, {
    url: `${BINANCE_WS}/${stream}`,
    onMessage: (data) => {
      const record = data as Record<string, unknown>;
      if (record.e === 'trade') {
        const trade = normalizeBinanceTrade(record);
        useMarketStore.getState().addTrade(trade);
      }
    },
  });
}

export async function fetchKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 500
): Promise<Candle[]> {
  // Use Vercel serverless proxy (avoids CORS) or direct Binance API
  const isVercel = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
  const url = isVercel
    ? `/api/klines?symbol=${symbol}&interval=${TF_MAP[timeframe]}&limit=${limit}`
    : `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${TF_MAP[timeframe]}&limit=${limit}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Klines fetch failed: ${res.status}`);
  const data = (await res.json()) as (string | number)[][];
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
    const isVercel = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const url = isVercel
      ? '/api/funding-rates'
      : 'https://fapi.binance.com/fapi/v1/premiumIndex';
    const res = await fetch(url);
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, unknown>[];
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
    console.error('[Binance] Funding rates error:', err);
  }
}

export function unsubscribeAll(): void {
  wsManager.closeAll();
}
