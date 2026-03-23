import type { Candle } from '../types/market';
import type { IndicatorValue } from '../types/indicators';

export function calcRSI(candles: Candle[], period: number = 14): IndicatorValue[] {
  if (candles.length < period + 1) return [];

  const results: IndicatorValue[] = [];
  let avgGain = 0;
  let avgLoss = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change > 0) avgGain += change;
    else avgLoss += Math.abs(change);
  }

  avgGain /= period;
  avgLoss /= period;

  const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  results.push({ time: candles[period].time, value: 100 - 100 / (1 + rs) });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
    results.push({ time: candles[i].time, value: rsi });
  }

  return results;
}

export function calcEMA(candles: Candle[], period: number): IndicatorValue[] {
  if (candles.length < period) return [];

  const k = 2 / (period + 1);
  const results: IndicatorValue[] = [];

  let ema = candles.slice(0, period).reduce((s, c) => s + c.close, 0) / period;
  results.push({ time: candles[period - 1].time, value: ema });

  for (let i = period; i < candles.length; i++) {
    ema = candles[i].close * k + ema * (1 - k);
    results.push({ time: candles[i].time, value: ema });
  }

  return results;
}

export function calcMACD(
  candles: Candle[],
  fast: number = 12,
  slow: number = 26,
  signal: number = 9
): IndicatorValue[] {
  const fastEMA = calcEMA(candles, fast);
  const slowEMA = calcEMA(candles, slow);

  if (fastEMA.length === 0 || slowEMA.length === 0) return [];

  const slowMap = new Map(slowEMA.map((v) => [v.time, v.value]));
  const macdLine: { time: number; value: number }[] = [];

  for (const f of fastEMA) {
    const s = slowMap.get(f.time);
    if (s !== undefined) {
      macdLine.push({ time: f.time, value: f.value - s });
    }
  }

  if (macdLine.length < signal) return macdLine.map((m) => ({ ...m, extra: { signal: 0, histogram: m.value } }));

  const k = 2 / (signal + 1);
  let sigEma = macdLine.slice(0, signal).reduce((s, m) => s + m.value, 0) / signal;

  const results: IndicatorValue[] = [];
  results.push({
    time: macdLine[signal - 1].time,
    value: macdLine[signal - 1].value,
    extra: { signal: sigEma, histogram: macdLine[signal - 1].value - sigEma },
  });

  for (let i = signal; i < macdLine.length; i++) {
    sigEma = macdLine[i].value * k + sigEma * (1 - k);
    results.push({
      time: macdLine[i].time,
      value: macdLine[i].value,
      extra: { signal: sigEma, histogram: macdLine[i].value - sigEma },
    });
  }

  return results;
}

export function calcBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDev: number = 2
): IndicatorValue[] {
  if (candles.length < period) return [];

  const results: IndicatorValue[] = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const mean = slice.reduce((s, c) => s + c.close, 0) / period;
    const variance = slice.reduce((s, c) => s + Math.pow(c.close - mean, 2), 0) / period;
    const sd = Math.sqrt(variance);

    results.push({
      time: candles[i].time,
      value: mean,
      extra: { upper: mean + stdDev * sd, lower: mean - stdDev * sd },
    });
  }

  return results;
}

export function calcVWAP(candles: Candle[]): IndicatorValue[] {
  if (candles.length === 0) return [];

  const results: IndicatorValue[] = [];
  let cumVol = 0;
  let cumTP = 0;

  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumTP += tp * c.volume;
    cumVol += c.volume;
    results.push({
      time: c.time,
      value: cumVol > 0 ? cumTP / cumVol : tp,
    });
  }

  return results;
}
