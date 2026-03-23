import { useState, useMemo } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { formatPrice, formatPercent, formatVolume } from '../../utils/format';

export function Watchlist() {
  const watchlist = useMarketStore((s) => s.watchlist);
  const tickers = useMarketStore((s) => s.tickers);
  const predictionMarkets = useMarketStore((s) => s.predictionMarkets);
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const setActiveSymbol = useMarketStore((s) => s.setActiveSymbol);
  const [search, setSearch] = useState('');

  const filteredWatchlist = useMemo(() => {
    if (!search.trim()) return watchlist;
    const q = search.toLowerCase();
    return watchlist.filter(
      (item) =>
        item.symbol.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q)
    );
  }, [watchlist, search]);

  return (
    <div style={{ fontSize: '11px' }}>
      <div style={{ padding: '4px 8px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search assets..."
          style={{
            width: '100%',
            padding: '4px 8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '10px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>
      <div style={{ padding: '4px 8px', color: 'var(--text-muted)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
        Crypto
      </div>
      {filteredWatchlist.map((item) => {
        const ticker = tickers[item.symbol];
        const isActive = item.symbol === activeSymbol;
        const changeUp = ticker ? ticker.changePercent24h >= 0 : false;
        return (
          <div
            key={item.symbol}
            onClick={() => setActiveSymbol(item.symbol)}
            style={{
              display: 'flex', justifyContent: 'space-between', padding: '4px 8px',
              cursor: 'pointer',
              background: isActive ? 'var(--bg-hover)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--accent)' : '2px solid transparent',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{
                color: changeUp ? 'var(--green)' : 'var(--red)',
                fontSize: '10px',
                fontWeight: 700,
                width: '10px',
              }}>
                {ticker ? (changeUp ? '\u25B2' : '\u25BC') : ''}
              </span>
              <span style={{ fontWeight: 500 }}>{item.name}</span>
            </div>
            <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
              {ticker ? (
                <>
                  <div>${formatPrice(ticker.price)}</div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', fontSize: '10px' }}>
                    <span style={{
                      color: changeUp ? 'var(--green)' : 'var(--red)',
                    }}>
                      {formatPercent(ticker.changePercent24h)}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {formatVolume(ticker.volume24h)}
                    </span>
                  </div>
                </>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>--</span>
              )}
            </div>
          </div>
        );
      })}

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
                display: 'flex', justifyContent: 'space-between', padding: '4px 8px',
                textDecoration: 'none', color: 'inherit',
              }}
            >
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '8px', fontSize: '10px' }}>
                {m.question}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)', fontWeight: 600, flexShrink: 0,
                color: m.probability > 60 ? 'var(--green)' : m.probability < 40 ? 'var(--red)' : 'var(--yellow)',
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
