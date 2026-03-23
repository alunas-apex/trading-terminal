import { useEffect, useRef } from 'react';
import { createChart, type IChartApi, type ISeriesApi, ColorType } from 'lightweight-charts';
import { useMarketStore } from '../../stores/marketStore';
import { useSettingsStore } from '../../stores/settingsStore';

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const activeTimeframe = useMarketStore((s) => s.activeTimeframe);
  const candles = useMarketStore((s) => s.candles.get(`${activeSymbol}:${activeTimeframe}`));
  const theme = useSettingsStore((s) => s.theme);

  const isDark = theme === 'dark';

  // Create chart
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: isDark ? '#16161f' : '#ffffff' },
        textColor: isDark ? '#8888a0' : '#555570',
        fontFamily: "'SF Mono', 'Fira Code', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: isDark ? '#1e1e2a' : '#f0f0f5' },
        horzLines: { color: isDark ? '#1e1e2a' : '#f0f0f5' },
      },
      crosshair: {
        vertLine: { color: isDark ? '#6366f1' : '#6366f1', width: 1, style: 2 },
        horzLine: { color: isDark ? '#6366f1' : '#6366f1', width: 1, style: 2 },
      },
      rightPriceScale: {
        borderColor: isDark ? '#2a2a3a' : '#e0e0e8',
      },
      timeScale: {
        borderColor: isDark ? '#2a2a3a' : '#e0e0e8',
        timeVisible: true,
        secondsVisible: false,
      },
      handleScroll: true,
      handleScale: true,
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderUpColor: '#22c55e',
      borderDownColor: '#ef4444',
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
    });

    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeRef.current = volumeSeries;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      volumeRef.current = null;
    };
  }, [isDark]);

  // Update candle data
  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || !candles?.length) return;

    const candleData = candles.map((c) => ({
      time: c.time as import('lightweight-charts').UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const volumeData = candles.map((c) => ({
      time: c.time as import('lightweight-charts').UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)',
    }));

    seriesRef.current.setData(candleData);
    volumeRef.current.setData(volumeData);
  }, [candles]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
    />
  );
}
