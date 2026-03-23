import { useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useMarketStore } from '../../stores/marketStore';

export function AlertManager() {
  const alerts = usePortfolioStore((s) => s.alerts);
  const addAlert = usePortfolioStore((s) => s.addAlert);
  const removeAlert = usePortfolioStore((s) => s.removeAlert);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const tickers = useMarketStore((s) => s.tickers);

  const [symbol, setSymbol] = useState(activeSymbol);
  const [condition, setCondition] = useState<'above' | 'below'>('above');
  const [price, setPrice] = useState('');

  // Pre-fill price from current ticker
  const currentPrice = tickers[symbol]?.price;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const value = parseFloat(price);
    if (!symbol || isNaN(value) || value <= 0) return;

    addAlert({
      id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol,
      condition,
      value,
      triggered: false,
      createdAt: Date.now(),
    });

    setPrice('');
  }

  // Request notification permission on first interaction
  function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }

  const activeAlerts = alerts.filter((a) => !a.triggered);
  const triggeredAlerts = alerts.filter((a) => a.triggered);

  return (
    <div style={{ padding: '12px', fontSize: '12px' }}>
      {/* Create Alert Form */}
      <form onSubmit={handleSubmit} onClick={requestNotificationPermission} style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
          <input
            type="text"
            value={symbol}
            onChange={(e) => setSymbol(e.target.value.toUpperCase())}
            placeholder="Symbol"
            style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'var(--text)',
              fontSize: '11px',
            }}
          />
          <select
            value={condition}
            onChange={(e) => setCondition(e.target.value as 'above' | 'below')}
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '4px 6px',
              color: 'var(--text)',
              fontSize: '11px',
            }}
          >
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={currentPrice ? `Current: ${currentPrice.toFixed(2)}` : 'Price'}
            step="any"
            style={{
              flex: 1,
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              borderRadius: '4px',
              padding: '4px 8px',
              color: 'var(--text)',
              fontSize: '11px',
            }}
          />
          <button
            type="submit"
            style={{
              background: 'var(--accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 12px',
              fontSize: '11px',
              cursor: 'pointer',
            }}
          >
            + Alert
          </button>
        </div>
      </form>

      {/* Active Alerts */}
      {activeAlerts.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Active ({activeAlerts.length})
          </div>
          {activeAlerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 6px',
                borderRadius: '3px',
                background: 'var(--bg-secondary)',
                marginBottom: '2px',
              }}
            >
              <span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{alert.symbol}</span>
                {' '}
                <span style={{ color: alert.condition === 'above' ? 'var(--green)' : 'var(--red)' }}>
                  {alert.condition === 'above' ? '\u25B2' : '\u25BC'}
                </span>
                {' '}
                {alert.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                onClick={() => removeAlert(alert.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1,
                  padding: '0 2px',
                }}
                title="Remove alert"
              >
                \u00D7
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Triggered ({triggeredAlerts.length})
          </div>
          {triggeredAlerts.slice(0, 5).map((alert) => (
            <div
              key={alert.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 6px',
                borderRadius: '3px',
                background: 'var(--bg-secondary)',
                marginBottom: '2px',
                opacity: 0.6,
              }}
            >
              <span>
                <span style={{ color: 'var(--yellow)' }}>\u2713</span>
                {' '}
                {alert.symbol} {alert.condition} {alert.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <button
                onClick={() => removeAlert(alert.id)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  lineHeight: 1,
                  padding: '0 2px',
                }}
                title="Dismiss"
              >
                \u00D7
              </button>
            </div>
          ))}
        </div>
      )}

      {activeAlerts.length === 0 && triggeredAlerts.length === 0 && (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '8px 0' }}>
          No alerts set. Create one above.
        </div>
      )}
    </div>
  );
}
