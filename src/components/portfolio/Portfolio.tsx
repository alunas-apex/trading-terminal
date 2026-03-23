import { useState } from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { useMarketStore } from '../../stores/marketStore';
import { formatPrice, formatPercent } from '../../utils/format';
import type { Position } from '../../types/market';

export function Portfolio() {
  const positions = usePortfolioStore((s) => s.positions);
  const balance = usePortfolioStore((s) => s.balance);
  const addPosition = usePortfolioStore((s) => s.addPosition);
  const removePosition = usePortfolioStore((s) => s.removePosition);
  const tickers = useMarketStore((s) => s.tickers);
  const fundingRates = useMarketStore((s) => s.fundingRates);

  const [showForm, setShowForm] = useState(false);
  const [formSymbol, setFormSymbol] = useState('BTCUSDT');
  const [formSide, setFormSide] = useState<'long' | 'short'>('long');
  const [formEntry, setFormEntry] = useState('');
  const [formQty, setFormQty] = useState('');

  // Compute live P&L from current ticker prices
  const positionsWithLivePnl = positions.map((p) => {
    const currentTicker = tickers[p.symbol];
    const livePrice = currentTicker ? currentTicker.price : p.currentPrice;
    const rawPnl = p.side === 'long'
      ? (livePrice - p.entryPrice) * p.quantity
      : (p.entryPrice - livePrice) * p.quantity;
    const pnlPct = p.entryPrice > 0 ? (rawPnl / (p.entryPrice * p.quantity)) * 100 : 0;
    return { ...p, currentPrice: livePrice, pnl: rawPnl, pnlPercent: pnlPct };
  });

  const totalPnl = positionsWithLivePnl.reduce((sum, p) => sum + p.pnl, 0);
  const totalPortfolioValue = balance + totalPnl;

  const frEntries = Object.entries(fundingRates).slice(0, 5);

  const handleAddPosition = () => {
    const entry = parseFloat(formEntry);
    const qty = parseFloat(formQty);
    if (!formSymbol || isNaN(entry) || isNaN(qty) || entry <= 0 || qty <= 0) return;

    const newPos: Position = {
      id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbol: formSymbol.toUpperCase(),
      side: formSide,
      entryPrice: entry,
      currentPrice: entry,
      quantity: qty,
      pnl: 0,
      pnlPercent: 0,
      assetClass: 'crypto',
      openedAt: Date.now(),
    };
    addPosition(newPos);
    setFormEntry('');
    setFormQty('');
    setShowForm(false);
  };

  const inputStyle: React.CSSProperties = {
    padding: '4px 6px',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '4px',
    color: 'var(--text-primary)',
    fontSize: '10px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ fontSize: '11px', padding: '8px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Balance</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px' }}>${formatPrice(balance)}</div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Unrealized P&L</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px', color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {totalPnl >= 0 ? '+' : ''}{formatPrice(Math.abs(totalPnl))}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Portfolio Value</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px' }}>
            ${formatPrice(totalPortfolioValue)}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>Positions</span>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '2px 8px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontSize: '10px', fontWeight: 600,
          }}
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px', marginBottom: '8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Symbol</div>
              <input
                value={formSymbol}
                onChange={(e) => setFormSymbol(e.target.value)}
                placeholder="BTCUSDT"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Side</div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setFormSide('long')}
                  style={{
                    flex: 1, padding: '4px', border: 'none', borderRadius: '4px', cursor: 'pointer',
                    fontSize: '10px', fontWeight: 600,
                    background: formSide === 'long' ? 'var(--green)' : 'var(--bg-hover)',
                    color: formSide === 'long' ? '#fff' : 'var(--text-muted)',
                  }}
                >Long</button>
                <button
                  onClick={() => setFormSide('short')}
                  style={{
                    flex: 1, padding: '4px', border: 'none', borderRadius: '4px', cursor: 'pointer',
                    fontSize: '10px', fontWeight: 600,
                    background: formSide === 'short' ? 'var(--red)' : 'var(--bg-hover)',
                    color: formSide === 'short' ? '#fff' : 'var(--text-muted)',
                  }}
                >Short</button>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Entry Price</div>
              <input
                value={formEntry}
                onChange={(e) => setFormEntry(e.target.value)}
                placeholder="0.00"
                type="number"
                step="any"
                style={inputStyle}
              />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '9px', marginBottom: '2px' }}>Quantity</div>
              <input
                value={formQty}
                onChange={(e) => setFormQty(e.target.value)}
                placeholder="0.00"
                type="number"
                step="any"
                style={inputStyle}
              />
            </div>
          </div>
          <button
            onClick={handleAddPosition}
            style={{
              width: '100%', padding: '6px', background: 'var(--accent)', color: '#fff',
              border: 'none', borderRadius: '4px', cursor: 'pointer',
              fontSize: '10px', fontWeight: 600,
            }}
          >Add Position</button>
        </div>
      )}

      {positionsWithLivePnl.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>No open positions</div>
      ) : (
        positionsWithLivePnl.map((p) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 50px 60px 60px 24px', gap: '4px', padding: '4px 0', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <span style={{ fontWeight: 500 }}>{p.symbol}</span>
            <span style={{ color: p.side === 'long' ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}>{p.side}</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px' }}>{formatPrice(p.entryPrice)}</span>
            <span style={{ fontFamily: 'var(--font-mono)', color: p.pnl >= 0 ? 'var(--green)' : 'var(--red)', fontSize: '10px' }}>
              {p.pnl >= 0 ? '+' : ''}{formatPrice(Math.abs(p.pnl))}
            </span>
            <button
              onClick={() => removePosition(p.id)}
              title="Close position"
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', fontSize: '12px', padding: '0', lineHeight: 1,
              }}
            >\u00D7</button>
          </div>
        ))
      )}

      {frEntries.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>Funding Rates</div>
          {frEntries.map(([symbol, fr]) => (
            <div key={symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>{symbol.replace('USDT', '')}</span>
              <span style={{ fontFamily: 'var(--font-mono)', color: fr.rate >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {(fr.rate * 100).toFixed(4)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
