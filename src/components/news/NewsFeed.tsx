import { useState, useEffect } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { formatTime } from '../../utils/format';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const alerts = usePortfolioStore((s) => s.alerts);
  const tickers = useMarketStore((s) => s.tickers);

  useEffect(() => {
    const items: NewsItem[] = [];
    for (const [symbol, ticker] of Object.entries(tickers)) {
      if (Math.abs(ticker.changePercent24h) > 5) {
        items.push({
          id: `move-${symbol}`,
          title: `${symbol} ${ticker.changePercent24h > 0 ? 'surges' : 'drops'} ${Math.abs(ticker.changePercent24h).toFixed(1)}% in 24h`,
          source: ticker.source,
          timestamp: ticker.timestamp,
        });
      }
    }
    setNews(items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10));
  }, [tickers]);

  const activeAlerts = alerts.filter((a) => !a.triggered);

  return (
    <div style={{ display: 'flex', gap: '16px', padding: '8px 12px', fontSize: '11px', overflow: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', gap: '16px', overflow: 'hidden' }}>
        {news.length > 0 ? (
          news.map((item) => (
            <div key={item.id} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ color: 'var(--text-muted)', marginRight: '4px' }}>
                {formatTime(item.timestamp)}
              </span>
              <span>{item.title}</span>
              <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({item.source})</span>
            </div>
          ))
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Monitoring markets for notable moves...</span>
        )}
      </div>

      {activeAlerts.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '16px' }}>
          {activeAlerts.slice(0, 3).map((alert) => (
            <div key={alert.id} style={{ whiteSpace: 'nowrap', color: 'var(--yellow)' }}>
              {alert.symbol} {alert.condition} {alert.value}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
