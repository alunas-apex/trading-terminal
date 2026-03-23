export interface IndicatorConfig {
  name: string;
  type: 'momentum' | 'trend' | 'volume' | 'volatility';
  params: Record<string, number>;
  enabled: boolean;
}

export interface IndicatorValue {
  time: number;
  value: number;
  extra?: Record<string, number>;
}

export const DEFAULT_INDICATORS: IndicatorConfig[] = [
  { name: 'RSI', type: 'momentum', params: { period: 14 }, enabled: true },
  { name: 'MACD', type: 'momentum', params: { fast: 12, slow: 26, signal: 9 }, enabled: true },
  { name: 'EMA', type: 'trend', params: { period: 20 }, enabled: false },
  { name: 'EMA', type: 'trend', params: { period: 50 }, enabled: false },
  { name: 'EMA', type: 'trend', params: { period: 200 }, enabled: false },
  { name: 'Bollinger', type: 'volatility', params: { period: 20, stdDev: 2 }, enabled: false },
  { name: 'VWAP', type: 'volume', params: {}, enabled: false },
  { name: 'ATR', type: 'volatility', params: { period: 14 }, enabled: false },
];
