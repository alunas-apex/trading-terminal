import { useState, useEffect, useRef } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import { usePortfolioStore } from '../../stores/portfolioStore';

interface NewsItem {
  id: string;
  title: string;
  source: string;
  timestamp: number;
  type: 'price' | 'prediction' | 'funding' | 'alert';
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NewsFeed() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const alerts = usePortfolioStore((s) => s.alerts);
  const tickers = useMarketStore((s) => s.tickers);
  const fundingRates = useMarketStore((s) => s.fundingRates);
  const predictionMarkets = useMarketStore((s) => s.predictionMarkets);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const items: NewsItem[] = [];

    // Price movement alerts
    for (const [symbol, ticker] of Object.entries(tickers)) {
      if (Math.abs(ticker.changePercent24h) > 5) {
        items.push({
          id: `move-${symbol}`,
          title: `${symbol.replace('USDT', '')} ${ticker.changePercent24h > 0 ? '\u25B2' : '\u25BC'} ${Math.abs(ticker.changePercent24h).toFixed(1)}% in 24h`,
          source: ticker.source,
          timestamp: ticker.timestamp,
          type: 'price',
        });
      }
    }

    // Funding rate alerts (rates > 0.05%)
    for (const [symbol, fr] of Object.entries(fundingRates)) {
      const ratePercent = Math.abs(fr.rate * 100);
      if (ratePercent > 0.05) {
        items.push({
          id: `fr-${symbol}`,
          title: `${symbol.replace('USDT', '')} funding ${fr.rate >= 0 ? '+' : ''}${(fr.rate * 100).toFixed(4)}% — ${fr.rate > 0 ? 'longs pay shorts' : 'shorts pay longs'}`,
          source: fr.exchange,
          timestamp: Date.now(),
          type: 'funding',
        });
      }
    }

    // Prediction market movements (probability > 60% or < 40% = notable)
    for (const pm of predictionMarkets) {
      if (pm.probability > 75 || pm.probability < 25) {
        items.push({
          id: `pred-${pm.id}`,
          title: `${pm.question.slice(0, 60)}${pm.question.length > 60 ? '...' : ''} — ${pm.probability.toFixed(0)}%`,
          source: pm.source,
          timestamp: Date.now(),
          type: 'prediction',
        });
      }
    }

    setNews(items.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));
  }, [tickers, fundingRates, predictionMarkets]);

  // Auto-scroll ticker tape
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || news.length === 0) return;
    let animFrame: number;
    let scrollPos = 0;
    const speed = 0.5;
    const animate = () => {
      scrollPos += speed;
      if (scrollPos >= el.scrollWidth - el.clientWidth) {
        scrollPos = 0;
      }
      el.scrollLeft = scrollPos;
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    const handleMouseEnter = () => cancelAnimationFrame(animFrame);
    const handleMouseLeave = () => { animFrame = requestAnimationFrame(animate); };
    el.addEventListener('mouseenter', handleMouseEnter);
    el.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      cancelAnimationFrame(animFrame);
      el.removeEventListener('mouseenter', handleMouseEnter);
      el.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [news]);

  const activeAlerts = alerts.filter((a) => !a.triggered);

  const typeColor: Record<string, string> = {
    price: 'var(--accent)',
    prediction: 'var(--yellow)',
    funding: 'var(--green)',
    alert: 'var(--red)',
  };

  return (
    <div style={{ display: 'flex', gap: '16px', padding: '8px 12px', fontSize: '11px', overflow: 'hidden' }}>
      <div
        ref={scrollRef}
        style={{ flex: 1, display: 'flex', gap: '24px', overflow: 'hidden', whiteSpace: 'nowrap' }}
      >
        {news.length > 0 ? (
          news.map((item) => (
            <div key={item.id} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: typeColor[item.type] || 'var(--text-muted)',
                display: 'inline-block', flexShrink: 0,
              }} />
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                {timeAgo(item.timestamp)}
              </span>
              <span>{item.title}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>({item.source})</span>
            </div>
          ))
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>Monitoring markets for notable moves...</span>
        )}
      </div>

      {activeAlerts.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', borderLeft: '1px solid var(--border)', paddingLeft: '16px', flexShrink: 0 }}>
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
