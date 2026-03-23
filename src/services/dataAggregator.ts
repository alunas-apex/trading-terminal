import type { Candle, Ticker, Orderbook, OrderbookLevel, FundingRate, Trade, DataSource } from '../types/market';

export function normalizeBinanceTicker(data: Record<string, unknown>): Ticker {
  return {
    symbol: data.s as string,
    price: parseFloat(data.c as string),
    change24h: parseFloat(data.p as string),
    changePercent24h: parseFloat(data.P as string),
    high24h: parseFloat(data.h as string),
    low24h: parseFloat(data.l as string),
    volume24h: parseFloat(data.v as string),
    source: 'binance',
    timestamp: Date.now(),
  };
}

export function normalizeBinanceKline(data: Record<string, unknown>): Candle {
  const k = data.k as Record<string, unknown>;
  return {
    time: Math.floor((k.t as number) / 1000),
    open: parseFloat(k.o as string),
    high: parseFloat(k.h as string),
    low: parseFloat(k.l as string),
    close: parseFloat(k.c as string),
    volume: parseFloat(k.v as string),
  };
}

export function normalizeBinanceOrderbook(data: Record<string, unknown>): Orderbook {
  return {
    symbol: (data.s as string) ?? '',
    bids: ((data.bids ?? data.b) as string[][])?.map(([p, q]: string[]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })) ?? [],
    asks: ((data.asks ?? data.a) as string[][])?.map(([p, q]: string[]) => ({
      price: parseFloat(p),
      quantity: parseFloat(q),
    })) ?? [],
    timestamp: Date.now(),
  };
}

export function normalizeBinanceTrade(data: Record<string, unknown>): Trade {
  return {
    id: String(data.t ?? data.T ?? Date.now()),
    symbol: data.s as string,
    price: parseFloat(data.p as string),
    quantity: parseFloat(data.q as string),
    side: data.m ? 'sell' : 'buy',
    timestamp: data.T as number,
  };
}

export function normalizeBinanceFundingRate(data: Record<string, unknown>): FundingRate {
  return {
    symbol: data.symbol as string,
    rate: parseFloat(data.lastFundingRate as string),
    nextFundingTime: data.nextFundingTime as number,
    exchange: 'binance',
  };
}

export function normalizeBybitFundingRate(data: Record<string, unknown>): FundingRate {
  return {
    symbol: data.symbol as string,
    rate: parseFloat(data.fundingRate as string),
    nextFundingTime: parseInt(data.nextFundingTime as string, 10),
    exchange: 'bybit',
  };
}

export function normalizeCoinGeckoTicker(id: string, data: Record<string, unknown>): Ticker {
  return {
    symbol: id.toUpperCase(),
    price: data.current_price as number,
    change24h: data.price_change_24h as number,
    changePercent24h: data.price_change_percentage_24h as number,
    high24h: data.high_24h as number,
    low24h: data.low_24h as number,
    volume24h: data.total_volume as number,
    source: 'coingecko',
    timestamp: Date.now(),
  };
}
