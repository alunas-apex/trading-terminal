import { useState, useMemo, useCallback } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { runBacktest } from '../../engine/backtest';
import type { BacktestConfig, BacktestResult, StrategyName, EquityPoint } from '../../types/backtest';

const STRATEGY_OPTIONS: { value: StrategyName; label: string; description: string }[] = [
  { value: 'RSI_MEAN_REVERSION', label: 'RSI Mean Reversion', description: 'Buy RSI<30, Sell RSI>70' },
  { value: 'EMA_CROSSOVER', label: 'EMA Crossover', description: 'EMA20/EMA50 cross signals' },
  { value: 'BOLLINGER_BOUNCE', label: 'Bollinger Bounce', description: 'Buy lower band, sell upper band' },
];

function EquityCurve({ data }: { data: EquityPoint[] }) {
  if (data.length < 2) return null;

  const width = 400;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minEquity = Math.min(...data.map((d) => d.equity));
  const maxEquity = Math.max(...data.map((d) => d.equity));
  const range = maxEquity - minEquity || 1;

  const points = data.map((d, i) => {
    const x = padding.left + (i / (data.length - 1)) * chartW;
    const y = padding.top + chartH - ((d.equity - minEquity) / range) * chartH;
    return `${x},${y}`;
  });

  const startEquity = data[0].equity;
  const endEquity = data[data.length - 1].equity;
  const isProfit = endEquity >= startEquity;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="backtest-equity-curve" preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const y = padding.top + chartH * (1 - pct);
        const val = minEquity + range * pct;
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="var(--border)" strokeWidth="0.5" strokeDasharray="2,2" />
            <text x={padding.left - 4} y={y + 3} textAnchor="end" fontSize="7" fill="var(--text-secondary)">
              {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
            </text>
          </g>
        );
      })}
      {/* Equity line */}
      <polyline
        fill="none"
        stroke={isProfit ? 'var(--green)' : 'var(--red)'}
        strokeWidth="1.5"
        points={points.join(' ')}
      />
      {/* Start/end dots */}
      <circle cx={padding.left} cy={parseFloat(points[0].split(',')[1])} r="2" fill="var(--text-secondary)" />
      <circle
        cx={width - padding.right}
        cy={parseFloat(points[points.length - 1].split(',')[1])}
        r="2"
        fill={isProfit ? 'var(--green)' : 'var(--red)'}
      />
    </svg>
  );
}

export function BacktestPanel() {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const activeTimeframe = useMarketStore((s) => s.activeTimeframe);
  const candles = useMarketStore((s) => s.candles);

  const [strategy, setStrategy] = useState<StrategyName>('RSI_MEAN_REVERSION');
  const [initialBalance] = useState(10000);
  const [positionSizePct] = useState(50);
  const [stopLossPct, setStopLossPct] = useState<string>('5');
  const [takeProfitPct, setTakeProfitPct] = useState<string>('10');
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const candleKey = `${activeSymbol}:${activeTimeframe}`;
  const candleData = candles[candleKey];
  const candleCount = candleData?.length ?? 0;

  const runTest = useCallback(() => {
    if (!candleData || candleData.length < 60) {
      setError('Not enough candle data (need at least 60 candles)');
      return;
    }

    setRunning(true);
    setError(null);
    setResult(null);

    // Use setTimeout to allow UI to update before running
    setTimeout(() => {
      try {
        const config: BacktestConfig = {
          strategy,
          symbol: activeSymbol,
          timeframe: activeTimeframe,
          initialBalance,
          positionSizePct,
          stopLossPct: stopLossPct ? parseFloat(stopLossPct) : undefined,
          takeProfitPct: takeProfitPct ? parseFloat(takeProfitPct) : undefined,
        };

        const backtestResult = runBacktest(candleData, config);
        setResult(backtestResult);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Backtest failed');
      } finally {
        setRunning(false);
      }
    }, 10);
  }, [candleData, strategy, activeSymbol, activeTimeframe, initialBalance, positionSizePct, stopLossPct, takeProfitPct]);

  const selectedStrategy = STRATEGY_OPTIONS.find((s) => s.value === strategy);

  return (
    <div className="backtest-panel">
      {/* Config Section */}
      <div className="backtest-config">
        <div className="backtest-config-row">
          <label>Strategy</label>
          <select
            value={strategy}
            onChange={(e) => {
              setStrategy(e.target.value as StrategyName);
              setResult(null);
            }}
            className="backtest-select"
          >
            {STRATEGY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        {selectedStrategy && (
          <div className="backtest-strategy-desc">{selectedStrategy.description}</div>
        )}
        <div className="backtest-config-row">
          <label>Stop Loss %</label>
          <input
            type="number"
            value={stopLossPct}
            onChange={(e) => setStopLossPct(e.target.value)}
            className="backtest-input"
            min="0"
            step="0.5"
          />
        </div>
        <div className="backtest-config-row">
          <label>Take Profit %</label>
          <input
            type="number"
            value={takeProfitPct}
            onChange={(e) => setTakeProfitPct(e.target.value)}
            className="backtest-input"
            min="0"
            step="0.5"
          />
        </div>
        <button
          className="backtest-run-btn"
          onClick={runTest}
          disabled={running || candleCount < 60}
        >
          {running ? 'Running...' : `Run Backtest (${candleCount} candles)`}
        </button>
        {error && <div className="backtest-error">{error}</div>}
      </div>

      {/* Results Section */}
      {result && (
        <div className="backtest-results">
          {/* Metrics */}
          <div className="backtest-metrics">
            <div className="backtest-metric">
              <span className="backtest-metric-label">Return</span>
              <span className={`backtest-metric-value ${result.metrics.totalReturn >= 0 ? 'positive' : 'negative'}`}>
                {result.metrics.totalReturn.toFixed(2)}%
              </span>
            </div>
            <div className="backtest-metric">
              <span className="backtest-metric-label">Win Rate</span>
              <span className="backtest-metric-value">{result.metrics.winRate.toFixed(1)}%</span>
            </div>
            <div className="backtest-metric">
              <span className="backtest-metric-label">Sharpe</span>
              <span className="backtest-metric-value">{result.metrics.sharpeRatio.toFixed(2)}</span>
            </div>
            <div className="backtest-metric">
              <span className="backtest-metric-label">Max DD</span>
              <span className="backtest-metric-value negative">-{result.metrics.maxDrawdown.toFixed(2)}%</span>
            </div>
            <div className="backtest-metric">
              <span className="backtest-metric-label">Profit Factor</span>
              <span className="backtest-metric-value">
                {result.metrics.profitFactor === Infinity ? '∞' : result.metrics.profitFactor.toFixed(2)}
              </span>
            </div>
            <div className="backtest-metric">
              <span className="backtest-metric-label">Trades</span>
              <span className="backtest-metric-value">{result.metrics.totalTrades}</span>
            </div>
            <div className="backtest-metric">
              <span className="backtest-metric-label">Avg Win</span>
              <span className="backtest-metric-value positive">${result.metrics.avgWin.toFixed(2)}</span>
            </div>
            <div className="backtest-metric">
              <span className="backtest-metric-label">Avg Loss</span>
              <span className="backtest-metric-value negative">-${result.metrics.avgLoss.toFixed(2)}</span>
            </div>
          </div>

          {/* Equity Curve */}
          <div className="backtest-equity">
            <div className="backtest-section-title">Equity Curve</div>
            <EquityCurve data={result.equityCurve} />
          </div>

          {/* Trade Log */}
          <div className="backtest-trades">
            <div className="backtest-section-title">Trade Log ({result.trades.length})</div>
            <div className="backtest-trade-list">
              <div className="backtest-trade-header">
                <span>Side</span>
                <span>Entry</span>
                <span>Exit</span>
                <span>P&L</span>
                <span>Reason</span>
              </div>
              {result.trades.map((trade, idx) => (
                <div key={idx} className={`backtest-trade-row ${trade.pnl >= 0 ? 'win' : 'loss'}`}>
                  <span className={`trade-side ${trade.side}`}>{trade.side.toUpperCase()}</span>
                  <span>${trade.entryPrice.toFixed(2)}</span>
                  <span>${trade.exitPrice.toFixed(2)}</span>
                  <span className={trade.pnl >= 0 ? 'positive' : 'negative'}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnlPct.toFixed(2)}%
                  </span>
                  <span className="trade-reason" title={trade.reason}>{trade.reason}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
