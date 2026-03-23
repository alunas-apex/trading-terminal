import type { Candle } from '../types/market';
import type {
  BacktestConfig,
  BacktestResult,
  BacktestTrade,
  BacktestMetrics,
  EquityPoint,
  IndicatorState,
} from '../types/backtest';
import { calcRSI, calcEMA, calcBollingerBands } from '../utils/indicators';
import { STRATEGIES } from './strategies';

/**
 * Pre-compute all indicator values for the full candle array,
 * returning a map from candle index to IndicatorState.
 */
function buildIndicatorMap(candles: Candle[]): Map<number, IndicatorState> {
  const rsiValues = calcRSI(candles, 14);
  const ema20Values = calcEMA(candles, 20);
  const ema50Values = calcEMA(candles, 50);
  const bbValues = calcBollingerBands(candles, 20, 2);

  // Build time -> value lookups
  const rsiByTime = new Map(rsiValues.map((v) => [v.time, v.value]));
  const ema20ByTime = new Map(ema20Values.map((v) => [v.time, v.value]));
  const ema50ByTime = new Map(ema50Values.map((v) => [v.time, v.value]));
  const bbByTime = new Map(
    bbValues.map((v) => [v.time, { middle: v.value, upper: v.extra?.upper ?? 0, lower: v.extra?.lower ?? 0 }])
  );

  const map = new Map<number, IndicatorState>();
  for (let i = 0; i < candles.length; i++) {
    const t = candles[i].time;
    const state: IndicatorState = {};
    const rsi = rsiByTime.get(t);
    if (rsi !== undefined) state.rsi = rsi;
    const e20 = ema20ByTime.get(t);
    if (e20 !== undefined) state.ema20 = e20;
    const e50 = ema50ByTime.get(t);
    if (e50 !== undefined) state.ema50 = e50;
    const bb = bbByTime.get(t);
    if (bb) {
      state.bbUpper = bb.upper;
      state.bbLower = bb.lower;
      state.bbMiddle = bb.middle;
    }
    map.set(i, state);
  }
  return map;
}

export function runBacktest(candles: Candle[], config: BacktestConfig): BacktestResult {
  const strategyFn = STRATEGIES[config.strategy];
  if (!strategyFn) {
    throw new Error(`Unknown strategy: ${config.strategy}`);
  }

  const indicatorMap = buildIndicatorMap(candles);

  let balance = config.initialBalance;
  let peakBalance = balance;
  let maxDrawdown = 0;

  const trades: BacktestTrade[] = [];
  const equityCurve: EquityPoint[] = [{ time: candles[0]?.time ?? 0, equity: balance }];

  // Position tracking
  let inPosition = false;
  let positionSide: 'long' | 'short' = 'long';
  let entryPrice = 0;
  let entryTime = 0;
  let positionSize = 0; // in units of the asset
  let entryReason = '';

  // Start from index 50 to ensure all indicators are available
  const startIdx = Math.min(50, candles.length - 1);

  for (let i = startIdx; i < candles.length; i++) {
    const candle = candles[i];
    const indicators = indicatorMap.get(i) ?? {};

    // Check stop loss / take profit if in position
    if (inPosition) {
      const currentPnlPct =
        positionSide === 'long'
          ? (candle.close - entryPrice) / entryPrice
          : (entryPrice - candle.close) / entryPrice;

      let shouldExit = false;
      let exitReason = '';

      if (config.stopLossPct !== undefined && currentPnlPct <= -config.stopLossPct / 100) {
        shouldExit = true;
        exitReason = `Stop loss hit (${(currentPnlPct * 100).toFixed(2)}%)`;
      } else if (config.takeProfitPct !== undefined && currentPnlPct >= config.takeProfitPct / 100) {
        shouldExit = true;
        exitReason = `Take profit hit (${(currentPnlPct * 100).toFixed(2)}%)`;
      }

      if (shouldExit) {
        const pnl =
          positionSide === 'long'
            ? (candle.close - entryPrice) * positionSize
            : (entryPrice - candle.close) * positionSize;

        trades.push({
          entryTime,
          exitTime: candle.time,
          entryPrice,
          exitPrice: candle.close,
          side: positionSide,
          pnl,
          pnlPct: currentPnlPct * 100,
          reason: exitReason,
        });

        balance += pnl;
        inPosition = false;
        equityCurve.push({ time: candle.time, equity: balance });

        if (balance > peakBalance) peakBalance = balance;
        const dd = peakBalance > 0 ? (peakBalance - balance) / peakBalance : 0;
        if (dd > maxDrawdown) maxDrawdown = dd;
        continue;
      }
    }

    const signal = strategyFn(candles, i, indicators);
    if (!signal) {
      // Track equity even without trades
      if (inPosition) {
        const unrealizedPnl =
          positionSide === 'long'
            ? (candle.close - entryPrice) * positionSize
            : (entryPrice - candle.close) * positionSize;
        const currentEquity = balance + unrealizedPnl;
        equityCurve.push({ time: candle.time, equity: currentEquity });

        if (currentEquity > peakBalance) peakBalance = currentEquity;
        const dd = peakBalance > 0 ? (peakBalance - currentEquity) / peakBalance : 0;
        if (dd > maxDrawdown) maxDrawdown = dd;
      } else {
        // Sample equity curve periodically when not in position
        if (i % 10 === 0) {
          equityCurve.push({ time: candle.time, equity: balance });
        }
      }
      continue;
    }

    if (!inPosition && signal.type === 'buy') {
      // Enter long
      inPosition = true;
      positionSide = 'long';
      entryPrice = candle.close;
      entryTime = candle.time;
      entryReason = signal.reason;
      positionSize = (balance * (config.positionSizePct / 100)) / candle.close;
    } else if (!inPosition && signal.type === 'sell') {
      // Enter short
      inPosition = true;
      positionSide = 'short';
      entryPrice = candle.close;
      entryTime = candle.time;
      entryReason = signal.reason;
      positionSize = (balance * (config.positionSizePct / 100)) / candle.close;
    } else if (inPosition && signal.type === 'sell' && positionSide === 'long') {
      // Exit long
      const pnl = (candle.close - entryPrice) * positionSize;
      const pnlPct = ((candle.close - entryPrice) / entryPrice) * 100;
      trades.push({
        entryTime,
        exitTime: candle.time,
        entryPrice,
        exitPrice: candle.close,
        side: 'long',
        pnl,
        pnlPct,
        reason: signal.reason,
      });
      balance += pnl;
      inPosition = false;
      equityCurve.push({ time: candle.time, equity: balance });

      if (balance > peakBalance) peakBalance = balance;
      const dd = peakBalance > 0 ? (peakBalance - balance) / peakBalance : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    } else if (inPosition && signal.type === 'buy' && positionSide === 'short') {
      // Exit short
      const pnl = (entryPrice - candle.close) * positionSize;
      const pnlPct = ((entryPrice - candle.close) / entryPrice) * 100;
      trades.push({
        entryTime,
        exitTime: candle.time,
        entryPrice,
        exitPrice: candle.close,
        side: 'short',
        pnl,
        pnlPct,
        reason: signal.reason,
      });
      balance += pnl;
      inPosition = false;
      equityCurve.push({ time: candle.time, equity: balance });

      if (balance > peakBalance) peakBalance = balance;
      const dd = peakBalance > 0 ? (peakBalance - balance) / peakBalance : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  // Close any open position at the end
  if (inPosition) {
    const lastCandle = candles[candles.length - 1];
    const pnl =
      positionSide === 'long'
        ? (lastCandle.close - entryPrice) * positionSize
        : (entryPrice - lastCandle.close) * positionSize;
    const pnlPct =
      positionSide === 'long'
        ? ((lastCandle.close - entryPrice) / entryPrice) * 100
        : ((entryPrice - lastCandle.close) / entryPrice) * 100;
    trades.push({
      entryTime,
      exitTime: lastCandle.time,
      entryPrice,
      exitPrice: lastCandle.close,
      side: positionSide,
      pnl,
      pnlPct,
      reason: 'End of backtest period',
    });
    balance += pnl;
    equityCurve.push({ time: lastCandle.time, equity: balance });
  }

  const metrics = calculateMetrics(trades, config.initialBalance, balance, maxDrawdown);

  return { metrics, trades, equityCurve };
}

function calculateMetrics(
  trades: BacktestTrade[],
  initialBalance: number,
  finalBalance: number,
  maxDrawdown: number
): BacktestMetrics {
  if (trades.length === 0) {
    return {
      totalReturn: 0,
      winRate: 0,
      sharpeRatio: 0,
      maxDrawdown: 0,
      profitFactor: 0,
      totalTrades: 0,
      avgWin: 0,
      avgLoss: 0,
    };
  }

  const totalReturn = ((finalBalance - initialBalance) / initialBalance) * 100;

  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl <= 0);
  const winRate = (wins.length / trades.length) * 100;

  const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;

  const avgWin = wins.length > 0 ? grossProfit / wins.length : 0;
  const avgLoss = losses.length > 0 ? grossLoss / losses.length : 0;

  // Sharpe ratio: annualized, assuming 365 trading days
  // Use per-trade returns
  const returns = trades.map((t) => t.pnlPct / 100);
  const meanReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - meanReturn, 2), 0) / returns.length;
  const stdDev = Math.sqrt(variance);
  // Annualize: assume roughly 1 trade per day as a simplification
  // More accurate would use actual time between trades, but this is standard
  const annualizedReturn = meanReturn * 365;
  const annualizedStdDev = stdDev * Math.sqrt(365);
  const sharpeRatio = annualizedStdDev > 0 ? annualizedReturn / annualizedStdDev : 0;

  return {
    totalReturn,
    winRate,
    sharpeRatio,
    maxDrawdown: maxDrawdown * 100,
    profitFactor,
    totalTrades: trades.length,
    avgWin,
    avgLoss,
  };
}
