import { useMarketStore } from '../../stores/marketStore';
import { formatPrice, formatPercent } from '../../utils/format';

export function Watchlist() {
  const watchlist = useMarketStore((s) => s.watchlist);
  const tickers = useMarketStore((s) => s.tickers);
  const predictionMarkets = useMarketStore((s) => s.predictionMarkets);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const setActiveSymbol = useMarketStore((s) => s.setActiveSymbol);

  return (
    <div style={{ fontSize: '11px' }}>
      {/* Crypto watchlist */}
      <div style={{ padding: '4px 8px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
        Crypto
      </div>
      {watchlist.map((item) => {
        const ticker = tickers.get(item.symbol);
        const isActive = item.symbol === activeSymbol;
        return (
          <div
            key={item.symbol}
            onClick={() => setActiveSymbol(item.symbol)}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              padding: '4px 8px',
              cursor: 'pointer',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            <span style={{ fontWeight: 500 }}>{item.name}</span>
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {ticker ? (
                <>
                  <div>${formatPrice(ticker.price)}</div>
                  <div style={{
                    fontSize: '10px',
                    color: ticker.changePercent24h >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {formatPercent(ticker.changePercent24h)}
                  </div>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>--</span>
              )}
            </div>
          </div>
        );
      })}

      {/* Prediction Markets */}
      {predictionMarkets.length > 0 && (
        <>
          <div style={{ padding: '8px 8px 4px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', borderTop: '1px solid var(--border)', marginTop: '4px' }}>
            Predictions
          </div>
          {predictionMarkets.slice(0, 8).map((m) => (
            <a
              key={m.id}
              href={m.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '4px 8px',
                textDecoration: 'none',
                color: 'inherit',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', fontSize: '10px' }}>
                {m.question}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontWeight: 600,
                color: m.probability > 60 ? 'var(--green)' : m.probability < 40 ? 'var(--red)' : 'var(--yellow)',
                flexShrink: 0,
              }}>
                {m.probability.toFixed(0)}%
              </span>
            </a>
          ))}
        </>
      )}
    </div>
  );
}
