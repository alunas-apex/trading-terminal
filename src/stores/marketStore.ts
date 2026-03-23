import { create } from 'zustand';
import type { Candle, Orderbook, Ticker, FundingRate, PredictionMarket, Timeframe, WatchlistItem, Trade } from '../types/market';

interface MarketState {
  // Active symbol
  activeSymbol: string;
  activeTimeframe: Timeframe;
  setActiveSymbol: (symbol: string) => void;
  setActiveTimeframe: (tf: Timeframe) => void;

  // Candle data
  candles: Map<string, Candle[]>;
  setCandles: (key: string, candles: Candle[]) => void;
  appendCandle: (key: string, candle: Candle) => void;

  // Tickers
  tickers: Map<string, Ticker>;
  updateTicker: (ticker: Ticker) => void;

  // Orderbook
  orderbook: Orderbook | null;
  setOrderbook: (ob: Orderbook) => void;

  // Recent trades
  recentTrades: Trade[];
  addTrade: (trade: Trade) => void;

  // Funding rates
  fundingRates: Map<string, FundingRate>;
  updateFundingRate: (fr: FundingRate) => void;

  // Prediction markets
  predictionMarkets: PredictionMarket[];
  setPredictionMarkets: (markets: PredictionMarket[]) => void;

  // Watchlist
  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;

  // Connection status
  connections: Map<string, 'connected' | 'disconnected' | 'connecting'>;
  setConnectionStatus: (source: string, status: 'connected' | 'disconnected' | 'connecting') => void;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', assetClass: 'crypto', source: 'binance' },
  { symbol: 'ETHUSDT', name: 'Ethereum', assetClass: 'crypto', source: 'binance' },
  { symbol: 'SOLUSDT', name: 'Solana', assetClass: 'crypto', source: 'binance' },
  { symbol: 'BNBUSDT', name: 'BNB', assetClass: 'crypto', source: 'binance' },
  { symbol: 'XRPUSDT', name: 'XRP', assetClass: 'crypto', source: 'binance' },
];

export const useMarketStore = create<MarketState>((set, get) => ({
  activeSymbol: 'BTCUSDT',
  activeTimeframe: '1h',
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
  setActiveTimeframe: (tf) => set({ activeTimeframe: tf }),

  candles: new Map(),
  setCandles: (key, candles) =>
    set((s) => {
      const next = new Map(s.candles);
      next.set(key, candles);
      return { candles: next };
    }),
  appendCandle: (key, candle) =>
    set((s) => {
      const next = new Map(s.candles);
      const existing = next.get(key) ?? [];
      const last = existing[existing.length - 1];
      if (last && last.time === candle.time) {
        existing[existing.length - 1] = candle;
      } else {
        existing.push(candle);
      }
      next.set(key, existing);
      return { candles: next };
    }),

  tickers: new Map(),
  updateTicker: (ticker) =>
    set((s) => {
      const next = new Map(s.tickers);
      next.set(ticker.symbol, ticker);
      return { tickers: next };
    }),

  orderbook: null,
  setOrderbook: (ob) => set({ orderbook: ob }),

  recentTrades: [],
  addTrade: (trade) =>
    set((s) => ({
      recentTrades: [trade, ...s.recentTrades].slice(0, 100),
    })),

  fundingRates: new Map(),
  updateFundingRate: (fr) =>
    set((s) => {
      const next = new Map(s.fundingRates);
      next.set(fr.symbol, fr);
      return { fundingRates: next };
    }),

  predictionMarkets: [],
  setPredictionMarkets: (markets) => set({ predictionMarkets: markets }),

  watchlist: DEFAULT_WATCHLIST,
  addToWatchlist: (item) =>
    set((s) => ({ watchlist: [...s.watchlist, item] })),
  removeFromWatchlist: (symbol) =>
    set((s) => ({ watchlist: s.watchlist.filter((w) => w.symbol !== symbol) })),

  connections: new Map(),
  setConnectionStatus: (source, status) =>
    set((s) => {
      const next = new Map(s.connections);
      next.set(source, status);
      return { connections: next };
    }),
}));
