export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  id: string;
  symbol: string;
  price: number;
  quantity: number;
  side: 'buy' | 'sell';
  timestamp: number;
}

export interface OrderbookLevel {
  price: number;
  quantity: number;
}

export interface Orderbook {
  symbol: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: number;
}

export interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  source: DataSource;
  timestamp: number;
}

export interface FundingRate {
  symbol: string;
  rate: number;
  nextFundingTime: number;
  exchange: string;
}

export interface PredictionMarket {
  id: string;
  question: string;
  probability: number;
  volume: number;
  endDate: string;
  source: 'polymarket' | 'manifold' | 'kalshi';
  url: string;
}

export type AssetClass = 'crypto' | 'stock' | 'option' | 'forex' | 'commodity' | 'prediction' | 'defi';

export type DataSource =
  | 'binance'
  | 'bybit'
  | 'crypto_com'
  | 'coingecko'
  | 'polymarket'
  | 'manifold'
  | 'yahoo'
  | 'fred'
  | 'defillama';

export type Timeframe =
  | '1m' | '3m' | '5m' | '15m' | '30m'
  | '1h' | '2h' | '4h' | '6h' | '8h' | '12h'
  | '1d' | '3d' | '1w' | '1M';

export interface WatchlistItem {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  source: DataSource;
  ticker?: Ticker;
}

export interface Position {
  id: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  assetClass: AssetClass;
  openedAt: number;
}

export interface Alert {
  id: string;
  symbol: string;
  condition: 'above' | 'below' | 'cross_up' | 'cross_down';
  value: number;
  indicator?: string;
  triggered: boolean;
  createdAt: number;
}
