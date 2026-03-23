import type { Timeframe } from './market';

export type StrategyName = 'RSI_MEAN_REVERSION' | 'EMA_CROSSOVER' | 'BOLLINGER_BOUNCE';

export interface BacktestConfig {
  strategy: StrategyName;
  symbol: string;
  timeframe: Timeframe;
  initialBalance: number;
  positionSizePct: number;
  stopLossPct?: number;
  takeProfitPct?: number;
}

export interface BacktestTrade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  side: 'long' | 'short';
  pnl: number;
  pnlPct: number;
  reason: string;
}

export interface BacktestMetrics {
  totalReturn: number;
  winRate: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  totalTrades: number;
  avgWin: number;
  avgLoss: number;
}

export interface EquityPoint {
  time: number;
  equity: number;
}

export interface BacktestResult {
  metrics: BacktestMetrics;
  trades: BacktestTrade[];
  equityCurve: EquityPoint[];
}

export interface Signal {
  type: 'buy' | 'sell';
  reason: string;
}

export interface IndicatorState {
  rsi?: number;
  ema20?: number;
  ema50?: number;
  bbUpper?: number;
  bbLower?: number;
  bbMiddle?: number;
}
