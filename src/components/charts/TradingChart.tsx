import { useEffect, useRef, useMemo } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { useMarketStore } from '../../stores/marketStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { calcRSI, calcEMA, calcMACD, calcBollingerBands } from '../../utils/indicators';
import type { IndicatorConfig } from '../../types/indicators';

function isEnabled(indicators: IndicatorConfig[], name: string, period?: number): boolean {
  return indicators.some(
    (ind) => ind.name === name && ind.enabled && (period === undefined || ind.params.period === period)
  );
}

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const dataApplied = useRef(false);

  // Indicator series refs
  const ema20Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const ema200Ref = useRef<ISeriesApi<'Line'> | null>(null);
  const bbUpperRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbLowerRef = useRef<ISeriesApi<'Line'> | null>(null);
  const bbMiddleRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOverboughtRef = useRef<ISeriesApi<'Line'> | null>(null);
  const rsiOversoldRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdLineRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdSignalRef = useRef<ISeriesApi<'Line'> | null>(null);
  const macdHistRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const activeTimeframe = useMarketStore((s) => s.activeTimeframe);
  const candleKey = `${activeSymbol}:${activeTimeframe}`;
  const candles = useMarketStore((s) => s.candles[candleKey]);
  const theme = useSettingsStore((s) => s.theme);
  const indicators = useSettingsStore((s) => s.indicators);
  const isDark = theme === 'dark';

  // Memoize indicator enabled states
  const ema20On = useMemo(() => isEnabled(indicators, 'EMA', 20), [indicators]);
  const ema50On = useMemo(() => isEnabled(indicators, 'EMA', 50), [indicators]);
  const ema200On = useMemo(() => isEnabled(indicators, 'EMA', 200), [indicators]);
  const bbOn = useMemo(() => isEnabled(indicators, 'Bollinger'), [indicators]);
  const rsiOn = useMemo(() => isEnabled(indicators, 'RSI'), [indicators]);
  const macdOn = useMemo(() => isEnabled(indicators, 'MACD'), [indicators]);

  // Create chart
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Destroy old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
      ema20Ref.current = null;
      ema50Ref.current = null;
      ema200Ref.current = null;
      bbUpperRef.current = null;
      bbLowerRef.current = null;
      bbMiddleRef.current = null;
      rsiRef.current = null;
      rsiOverboughtRef.current = null;
      rsiOversoldRef.current = null;
      macdLineRef.current = null;
      macdSignalRef.current = null;
      macdHistRef.current = null;
    }

    dataApplied.current = false;

    const rect = el.getBoundingClientRect();
    const w = rect.width || el.clientWidth || 600;
    const h = rect.height || el.clientHeight || 350;

    console.log(`[Chart] Creating ${w}x${h}`);

    const chart = createChart(el, {
      width: w,
      height: h,
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#16161f' : '#ffffff' },
        textColor: isDark ? '#8888a0' : '#555570',
        fontFamily: "'SF Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? '#1e1e2a' : '#f0f0f5' },
        horzLines: { color: isDark ? '#1e1e2a' : '#f0f0f5' },
      },
      crosshair: {
        vertLine: { color: '#6366f1', width: 1, style: 2 },
        horzLine: { color: '#6366f1', width: 1, style: 2 },
      },
      rightPriceScale: { borderColor: isDark ? '#2a2a3a' : '#e0e0e8' },
      timeScale: { borderColor: isDark ? '#2a2a3a' : '#e0e0e8', timeVisible: true, secondsVisible: false },
    });

    const cs = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const vs = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    vs.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

    // --- EMA series ---
    ema20Ref.current = chart.addLineSeries({
      color: '#facc15',
      lineWidth: 1,
      priceScaleId: 'right',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ema50Ref.current = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      priceScaleId: 'right',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    ema200Ref.current = chart.addLineSeries({
      color: '#ef4444',
      lineWidth: 1,
      priceScaleId: 'right',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // --- Bollinger Bands ---
    bbMiddleRef.current = chart.addLineSeries({
      color: 'rgba(168, 85, 247, 0.6)',
      lineWidth: 1,
      priceScaleId: 'right',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbUpperRef.current = chart.addLineSeries({
      color: 'rgba(168, 85, 247, 0.35)',
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: 'right',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    bbLowerRef.current = chart.addLineSeries({
      color: 'rgba(168, 85, 247, 0.35)',
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: 'right',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // --- RSI (separate pane) ---
    rsiRef.current = chart.addLineSeries({
      color: '#f59e0b',
      lineWidth: 1,
      priceScaleId: 'rsi',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    rsiRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0.02 },
      autoScale: true,
    });
    rsiOverboughtRef.current = chart.addLineSeries({
      color: 'rgba(239, 68, 68, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: 'rsi',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    rsiOversoldRef.current = chart.addLineSeries({
      color: 'rgba(34, 197, 94, 0.3)',
      lineWidth: 1,
      lineStyle: 2,
      priceScaleId: 'rsi',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    // --- MACD (separate pane) ---
    macdLineRef.current = chart.addLineSeries({
      color: '#3b82f6',
      lineWidth: 1,
      priceScaleId: 'macd',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    macdLineRef.current.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0.02 },
      autoScale: true,
    });
    macdSignalRef.current = chart.addLineSeries({
      color: '#f97316',
      lineWidth: 1,
      priceScaleId: 'macd',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });
    macdHistRef.current = chart.addHistogramSeries({
      priceScaleId: 'macd',
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    chartRef.current = chart;
    candleRef.current = cs;
    volumeRef.current = vs;

    // Resize observer
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        if (cr.width > 0 && cr.height > 0) {
          chart.applyOptions({ width: cr.width, height: cr.height });
        }
      }
    });
    ro.observe(el);

    return () => {
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleRef.current = null;
      volumeRef.current = null;
    };
  }, [isDark, activeSymbol, activeTimeframe]);

  // Apply candle data + indicators
  useEffect(() => {
    if (!candleRef.current || !volumeRef.current || !candles || candles.length === 0) return;

    console.log(`[Chart] Setting ${candles.length} candles`);

    try {
      candleRef.current.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }))
      );

      volumeRef.current.setData(
        candles.map((c) => ({
          time: c.time as UTCTimestamp,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
        }))
      );

      // --- EMA 20 ---
      if (ema20On && ema20Ref.current) {
        const data = calcEMA(candles, 20);
        ema20Ref.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
        ema20Ref.current.applyOptions({ visible: true });
      } else if (ema20Ref.current) {
        ema20Ref.current.applyOptions({ visible: false });
      }

      // --- EMA 50 ---
      if (ema50On && ema50Ref.current) {
        const data = calcEMA(candles, 50);
        ema50Ref.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
        ema50Ref.current.applyOptions({ visible: true });
      } else if (ema50Ref.current) {
        ema50Ref.current.applyOptions({ visible: false });
      }

      // --- EMA 200 ---
      if (ema200On && ema200Ref.current) {
        const data = calcEMA(candles, 200);
        ema200Ref.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
        ema200Ref.current.applyOptions({ visible: true });
      } else if (ema200Ref.current) {
        ema200Ref.current.applyOptions({ visible: false });
      }

      // --- Bollinger Bands ---
      if (bbOn && bbUpperRef.current && bbLowerRef.current && bbMiddleRef.current) {
        const bbInd = indicators.find((i) => i.name === 'Bollinger');
        const data = calcBollingerBands(candles, bbInd?.params.period ?? 20, bbInd?.params.stdDev ?? 2);
        bbMiddleRef.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
        bbUpperRef.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.extra!.upper })));
        bbLowerRef.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.extra!.lower })));
        bbMiddleRef.current.applyOptions({ visible: true });
        bbUpperRef.current.applyOptions({ visible: true });
        bbLowerRef.current.applyOptions({ visible: true });
      } else {
        bbMiddleRef.current?.applyOptions({ visible: false });
        bbUpperRef.current?.applyOptions({ visible: false });
        bbLowerRef.current?.applyOptions({ visible: false });
      }

      // --- RSI ---
      if (rsiOn && rsiRef.current && rsiOverboughtRef.current && rsiOversoldRef.current) {
        const rsiInd = indicators.find((i) => i.name === 'RSI');
        const data = calcRSI(candles, rsiInd?.params.period ?? 14);
        rsiRef.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
        // Overbought/oversold reference lines
        const times = data.map((d) => d.time);
        rsiOverboughtRef.current.setData(times.map((t) => ({ time: t as UTCTimestamp, value: 70 })));
        rsiOversoldRef.current.setData(times.map((t) => ({ time: t as UTCTimestamp, value: 30 })));
        rsiRef.current.applyOptions({ visible: true });
        rsiOverboughtRef.current.applyOptions({ visible: true });
        rsiOversoldRef.current.applyOptions({ visible: true });
      } else {
        rsiRef.current?.applyOptions({ visible: false });
        rsiOverboughtRef.current?.applyOptions({ visible: false });
        rsiOversoldRef.current?.applyOptions({ visible: false });
      }

      // --- MACD ---
      if (macdOn && macdLineRef.current && macdSignalRef.current && macdHistRef.current) {
        const macdInd = indicators.find((i) => i.name === 'MACD');
        const data = calcMACD(candles, macdInd?.params.fast ?? 12, macdInd?.params.slow ?? 26, macdInd?.params.signal ?? 9);
        macdLineRef.current.setData(data.map((d) => ({ time: d.time as UTCTimestamp, value: d.value })));
        macdSignalRef.current.setData(
          data.filter((d) => d.extra?.signal !== undefined).map((d) => ({ time: d.time as UTCTimestamp, value: d.extra!.signal }))
        );
        macdHistRef.current.setData(
          data.filter((d) => d.extra?.histogram !== undefined).map((d) => ({
            time: d.time as UTCTimestamp,
            value: d.extra!.histogram,
            color: d.extra!.histogram >= 0 ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)',
          }))
        );
        macdLineRef.current.applyOptions({ visible: true });
        macdSignalRef.current.applyOptions({ visible: true });
        macdHistRef.current.applyOptions({ visible: true });
      } else {
        macdLineRef.current?.applyOptions({ visible: false });
        macdSignalRef.current?.applyOptions({ visible: false });
        macdHistRef.current?.applyOptions({ visible: false });
      }

      if (!dataApplied.current) {
        chartRef.current?.timeScale().fitContent();
        dataApplied.current = true;
      }
    } catch (err) {
      console.error('[Chart] Data error:', err);
    }
  }, [candles, ema20On, ema50On, ema200On, bbOn, rsiOn, macdOn, indicators]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 200 }}
    />
  );
}
