import type { Candle } from '../types/market';
import type { Signal, IndicatorState } from '../types/backtest';

export type StrategyFn = (candles: Candle[], index: number, indicators: IndicatorState) => Signal | null;

export const RSI_MEAN_REVERSION: StrategyFn = (_candles, _index, indicators) => {
  if (indicators.rsi === undefined) return null;

  if (indicators.rsi < 30) {
    return { type: 'buy', reason: `RSI oversold at ${indicators.rsi.toFixed(1)}` };
  }
  if (indicators.rsi > 70) {
    return { type: 'sell', reason: `RSI overbought at ${indicators.rsi.toFixed(1)}` };
  }
  return null;
};

export const EMA_CROSSOVER: StrategyFn = (candles, index, indicators) => {
  if (indicators.ema20 === undefined || indicators.ema50 === undefined) return null;
  if (index < 1) return null;

  // We need previous EMA values to detect crossover.
  // Since we only get current indicators, we approximate by checking
  // if the current candle crossed (price was on the other side last bar).
  const prevClose = candles[index - 1].close;
  const currEma20 = indicators.ema20;
  const currEma50 = indicators.ema50;

  // EMA20 above EMA50 now
  const bullish = currEma20 > currEma50;
  // Use previous close relative to current EMAs as a proxy for crossover detection
  const prevWasBearish = prevClose < currEma50;
  const prevWasBullish = prevClose > currEma20;

  if (bullish && prevWasBearish) {
    return { type: 'buy', reason: `EMA20 crossed above EMA50 (${currEma20.toFixed(2)} > ${currEma50.toFixed(2)})` };
  }
  if (!bullish && prevWasBullish) {
    return { type: 'sell', reason: `EMA20 crossed below EMA50 (${currEma20.toFixed(2)} < ${currEma50.toFixed(2)})` };
  }
  return null;
};

export const BOLLINGER_BOUNCE: StrategyFn = (candles, index, indicators) => {
  if (indicators.bbUpper === undefined || indicators.bbLower === undefined) return null;

  const close = candles[index].close;

  if (close <= indicators.bbLower) {
    return { type: 'buy', reason: `Price at lower BB (${close.toFixed(2)} <= ${indicators.bbLower.toFixed(2)})` };
  }
  if (close >= indicators.bbUpper) {
    return { type: 'sell', reason: `Price at upper BB (${close.toFixed(2)} >= ${indicators.bbUpper.toFixed(2)})` };
  }
  return null;
};

export const STRATEGIES: Record<string, StrategyFn> = {
  RSI_MEAN_REVERSION,
  EMA_CROSSOVER,
  BOLLINGER_BOUNCE,
};
