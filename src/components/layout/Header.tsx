import { useMarketStore } from '../../stores/marketStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatPrice, formatPercent } from '../../utils/format';
import type { Timeframe } from '../../types/market';

const TIMEFRAMES: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

export function Header() {
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const activeTimeframe = useMarketStore((s) => s.activeTimeframe);
  const setActiveTimeframe = useMarketStore((s) => s.setActiveTimeframe);
  const ticker = useMarketStore((s) => s.tickers[activeSymbol]);
  const balance = usePortfolioStore((s) => s.balance);
  const positions = usePortfolioStore((s) => s.positions);
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const connectionStatus = useMarketStore((s) => s.connectionStatus);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
  const pnlColor = totalPnl >= 0 ? 'var(--green)' : 'var(--red)';
  const connectedCount = Object.values(connectionStatus).filter((s) => s === 'connected').length;

  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      padding: '8px 16px',
      background: 'var(--bg-secondary)',
      borderBottom: '1px solid var(--border)',
      flexShrink: 0,
      flexWrap: 'wrap',
    }}>
      <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
        TERMINAL
      </div>

      {ticker ? (
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>{activeSymbol}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            ${formatPrice(ticker.price)}
          </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            color: ticker.changePercent24h >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {formatPercent(ticker.changePercent24h)}
          </span>
        </div>
      ) : (
        <div style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Loading {activeSymbol}...</div>
      )}

      <div style={{ display: 'flex', gap: '2px' }}>
        {TIMEFRAMES.map((tf) => (
          <button
            key={tf}
            onClick={() => setActiveTimeframe(tf)}
            style={{
              padding: '3px 8px',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              background: tf === activeTimeframe ? 'var(--accent)' : 'transparent',
              color: tf === activeTimeframe ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {tf}
          </button>
        ))}
      </div>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '12px' }}>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>Balance </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
            ${formatPrice(balance)}
          </span>
        </div>
        <div>
          <span style={{ color: 'var(--text-muted)' }}>P&L </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: pnlColor }}>
            {totalPnl >= 0 ? '+' : ''}${formatPrice(Math.abs(totalPnl))}
          </span>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: connectedCount > 0 ? 'var(--green)' : 'var(--red)',
        }} title={`${connectedCount} source(s) connected`} />
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            background: 'none', border: '1px solid var(--border)', borderRadius: '4px',
            padding: '4px 8px', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '11px',
          }}
        >
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>
    </header>
  );
}
