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
const BINANCE_FAPI_WS = 'wss://fstream.binance.com/ws';
const BINANCE_REST = 'https://api.binance.com/api/v3';
const BINANCE_FAPI_REST = 'https://fapi.binance.com/fapi/v1';

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
      const ticker = normalizeBinanceTicker(data as Record<string, unknown>);
      useMarketStore.getState().updateTicker(ticker);
    },
    onOpen: () => {
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
      const candle = normalizeBinanceKline(data as Record<string, unknown>);
      const key = `${symbol}:${timeframe}`;
      useMarketStore.getState().appendCandle(key, candle);
    },
  });
}

export function subscribeOrderbook(symbol: string, depth: number = 20): void {
  const stream = `${symbol.toLowerCase()}@depth${depth}@100ms`;
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
      const trade = normalizeBinanceTrade(data as Record<string, unknown>);
      useMarketStore.getState().addTrade(trade);
    },
  });
}

export async function fetchKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number = 500
): Promise<Candle[]> {
  const url = `${BINANCE_REST}/klines?symbol=${symbol}&interval=${TF_MAP[timeframe]}&limit=${limit}`;
  const res = await fetch(url);
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
  const url = `${BINANCE_FAPI_REST}/premiumIndex`;
  const res = await fetch(url);
  const data = (await res.json()) as Record<string, unknown>[];
  const store = useMarketStore.getState();
  for (const item of data) {
    store.updateFundingRate({
      symbol: item.symbol as string,
      rate: parseFloat(item.lastFundingRate as string),
      nextFundingTime: item.nextFundingTime as number,
      exchange: 'binance',
    });
  }
}

export function unsubscribeAll(): void {
  wsManager.closeAll();
}
