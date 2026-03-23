import { useMarketStore } from '../../stores/marketStore';
import { formatPrice } from '../../utils/format';

export function Orderbook() {
  const orderbook = useMarketStore((s) => s.orderbook);

  if (!orderbook) {
    return <div style={{ padding: '16px', color: 'var(--text-muted)' }}>Connecting...</div>;
  }

  const asks = orderbook.asks.slice(0, 15).reverse();
  const bids = orderbook.bids.slice(0, 15);
  const maxQty = Math.max(
    ...asks.map((a) => a.quantity),
    ...bids.map((b) => b.quantity),
    0.001
  );

  const spread = asks.length > 0 && bids.length > 0
    ? asks[asks.length - 1].price - bids[0].price
    : 0;

  return (
    <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', padding: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 6px', color: 'var(--text-muted)', fontSize: '10px', marginBottom: '4px' }}>
        <span>Price</span>
        <span>Qty</span>
      </div>

      {asks.map((ask, i) => (
        <div key={`a${i}`} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '1px 6px' }}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: `${(ask.quantity / maxQty) * 100}%`,
            background: 'var(--red-dim)',
          }} />
          <span style={{ color: 'var(--red)', position: 'relative' }}>{formatPrice(ask.price)}</span>
          <span style={{ position: 'relative' }}>{ask.quantity.toFixed(4)}</span>
        </div>
      ))}

      <div style={{
        padding: '4px 6px',
        textAlign: 'center',
        color: 'var(--text-muted)',
        fontSize: '10px',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        margin: '2px 0',
      }}>
        Spread: {formatPrice(spread)}
      </div>

      {bids.map((bid, i) => (
        <div key={`b${i}`} style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', padding: '1px 6px' }}>
          <div style={{
            position: 'absolute', right: 0, top: 0, bottom: 0,
            width: `${(bid.quantity / maxQty) * 100}%`,
            background: 'var(--green-dim)',
          }} />
          <span style={{ color: 'var(--green)', position: 'relative' }}>{formatPrice(bid.price)}</span>
          <span style={{ position: 'relative' }}>{bid.quantity.toFixed(4)}</span>
        </div>
      ))}
    </div>
  );
}
