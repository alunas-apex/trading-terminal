import { create } from 'zustand';
import type { Candle, Orderbook, Ticker, FundingRate, PredictionMarket, Timeframe, WatchlistItem, Trade } from '../types/market';

interface MarketState {
  activeSymbol: string;
  activeTimeframe: Timeframe;
  setActiveSymbol: (symbol: string) => void;
  setActiveTimeframe: (tf: Timeframe) => void;

  candles: Record<string, Candle[]>;
  setCandles: (key: string, candles: Candle[]) => void;
  appendCandle: (key: string, candle: Candle) => void;

  tickers: Record<string, Ticker>;
  updateTicker: (ticker: Ticker) => void;

  orderbook: Orderbook | null;
  setOrderbook: (ob: Orderbook) => void;

  recentTrades: Trade[];
  addTrade: (trade: Trade) => void;

  fundingRates: Record<string, FundingRate>;
  updateFundingRate: (fr: FundingRate) => void;

  predictionMarkets: PredictionMarket[];
  setPredictionMarkets: (markets: PredictionMarket[]) => void;

  watchlist: WatchlistItem[];
  addToWatchlist: (item: WatchlistItem) => void;
  removeFromWatchlist: (symbol: string) => void;

  connectionStatus: Record<string, 'connected' | 'disconnected' | 'connecting'>;
  setConnectionStatus: (source: string, status: 'connected' | 'disconnected' | 'connecting') => void;
}

const DEFAULT_WATCHLIST: WatchlistItem[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', assetClass: 'crypto', source: 'binance' },
  { symbol: 'ETHUSDT', name: 'Ethereum', assetClass: 'crypto', source: 'binance' },
  { symbol: 'SOLUSDT', name: 'Solana', assetClass: 'crypto', source: 'binance' },
  { symbol: 'BNBUSDT', name: 'BNB', assetClass: 'crypto', source: 'binance' },
  { symbol: 'XRPUSDT', name: 'XRP', assetClass: 'crypto', source: 'binance' },
];

export const useMarketStore = create<MarketState>((set) => ({
  activeSymbol: 'BTCUSDT',
  activeTimeframe: '1h',
  setActiveSymbol: (symbol) => set({ activeSymbol: symbol }),
  setActiveTimeframe: (tf) => set({ activeTimeframe: tf }),

  candles: {},
  setCandles: (key, candles) =>
    set((s) => ({ candles: { ...s.candles, [key]: candles } })),
  appendCandle: (key, candle) =>
    set((s) => {
      const existing = s.candles[key] ?? [];
      const last = existing[existing.length - 1];
      let updated: Candle[];
      if (last && last.time === candle.time) {
        updated = [...existing.slice(0, -1), candle];
      } else {
        updated = [...existing, candle];
      }
      return { candles: { ...s.candles, [key]: updated } };
    }),

  tickers: {},
  updateTicker: (ticker) =>
    set((s) => ({ tickers: { ...s.tickers, [ticker.symbol]: ticker } })),

  orderbook: null,
  setOrderbook: (ob) => set({ orderbook: ob }),

  recentTrades: [],
  addTrade: (trade) =>
    set((s) => ({ recentTrades: [trade, ...s.recentTrades].slice(0, 50) })),

  fundingRates: {},
  updateFundingRate: (fr) =>
    set((s) => ({ fundingRates: { ...s.fundingRates, [fr.symbol]: fr } })),

  predictionMarkets: [],
  setPredictionMarkets: (markets) => set({ predictionMarkets: markets }),

  watchlist: DEFAULT_WATCHLIST,
  addToWatchlist: (item) =>
    set((s) => ({ watchlist: [...s.watchlist, item] })),
  removeFromWatchlist: (symbol) =>
    set((s) => ({ watchlist: s.watchlist.filter((w) => w.symbol !== symbol) })),

  connectionStatus: {},
  setConnectionStatus: (source, status) =>
    set((s) => ({ connectionStatus: { ...s.connectionStatus, [source]: status } })),
}));
