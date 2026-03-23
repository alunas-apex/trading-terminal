import { usePortfolioStore } from '../../stores/portfolioStore';
import { useMarketStore } from '../../stores/marketStore';
import { formatPrice, formatPercent } from '../../utils/format';

export function Portfolio() {
  const positions = usePortfolioStore((s) => s.positions);
  const balance = usePortfolioStore((s) => s.balance);
  const fundingRates = useMarketStore((s) => s.fundingRates);

  const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);

  return (
    <div style={{ fontSize: '11px', padding: '8px' }}>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
        <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Balance</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, fontSize: '14px' }}>
            ${formatPrice(balance)}
          </div>
        </div>
        <div style={{ background: 'var(--bg-secondary)', padding: '8px', borderRadius: '4px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Unrealized P&L</div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontWeight: 600,
            fontSize: '14px',
            color: totalPnl >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {totalPnl >= 0 ? '+' : ''}${formatPrice(Math.abs(totalPnl))}
          </div>
        </div>
      </div>

      {/* Positions */}
      {positions.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '16px' }}>
          No open positions
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px', gap: '4px', padding: '4px 0', color: 'var(--text-muted)', fontSize: '10px', borderBottom: '1px solid var(--border)' }}>
            <span>Symbol</span>
            <span>Side</span>
            <span>Entry</span>
            <span>P&L</span>
          </div>
          {positions.map((p) => (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 60px 60px', gap: '4px', padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontWeight: 500 }}>{p.symbol}</span>
              <span style={{ color: p.side === 'long' ? 'var(--green)' : 'var(--red)', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}>
                {p.side}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>{formatPrice(p.entryPrice)}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                color: p.pnl >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {formatPercent(p.pnlPercent)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Funding Rates */}
      {fundingRates.size > 0 && (
        <div style={{ marginTop: '12px' }}>
          <div style={{ color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', marginBottom: '4px' }}>
            Funding Rates
          </div>
          {Array.from(fundingRates.entries()).slice(0, 5).map(([symbol, fr]) => (
            <div key={symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
              <span>{symbol.replace('USDT', '')}</span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                color: fr.rate >= 0 ? 'var(--green)' : 'var(--red)',
              }}>
                {(fr.rate * 100).toFixed(4)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
