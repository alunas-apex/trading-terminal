import { useEffect, useRef } from 'react';
import { createChart, ColorType, type IChartApi, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts';
import { useMarketStore } from '../../stores/marketStore';
import { useSettingsStore } from '../../stores/settingsStore';

export function TradingChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const volumeRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const dataApplied = useRef(false);

  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const activeTimeframe = useMarketStore((s) => s.activeTimeframe);
  const candleKey = `${activeSymbol}:${activeTimeframe}`;
  const candles = useMarketStore((s) => s.candles[candleKey]);
  const theme = useSettingsStore((s) => s.theme);
  const isDark = theme === 'dark';

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

  // Apply candle data
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

      if (!dataApplied.current) {
        chartRef.current?.timeScale().fitContent();
        dataApplied.current = true;
      }
    } catch (err) {
      console.error('[Chart] Data error:', err);
    }
  }, [candles]);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: 200 }}
    />
  );
}
