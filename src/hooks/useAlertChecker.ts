import { useEffect, useRef } from 'react';
import { useMarketStore } from '../stores/marketStore';
import { usePortfolioStore } from '../stores/portfolioStore';
import type { Alert } from '../types/market';

function showNotification(alert: Alert, currentPrice: number) {
  const direction = alert.condition === 'above' ? 'rose above' : 'fell below';
  const title = `Price Alert: ${alert.symbol}`;
  const body = `${alert.symbol} ${direction} ${alert.value.toLocaleString(undefined, { minimumFractionDigits: 2 })} — now at ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' });
  }

  // Also log to console as fallback
  console.log(`[Alert] ${title}: ${body}`);
}

export function useAlertChecker() {
  const tickers = useMarketStore((s) => s.tickers);
  const alerts = usePortfolioStore((s) => s.alerts);
  const triggerAlert = usePortfolioStore((s) => s.triggerAlert);

  // Track which alerts we've already triggered this session to avoid re-firing
  const triggeredRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const activeAlerts = alerts.filter((a) => !a.triggered);
    if (activeAlerts.length === 0) return;

    for (const alert of activeAlerts) {
      // Skip if already triggered in this render cycle
      if (triggeredRef.current.has(alert.id)) continue;

      const ticker = tickers[alert.symbol];
      if (!ticker) continue;

      const currentPrice = ticker.price;
      let shouldTrigger = false;

      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentPrice >= alert.value;
          break;
        case 'below':
          shouldTrigger = currentPrice <= alert.value;
          break;
        case 'cross_up':
          shouldTrigger = currentPrice >= alert.value;
          break;
        case 'cross_down':
          shouldTrigger = currentPrice <= alert.value;
          break;
      }

      if (shouldTrigger) {
        triggeredRef.current.add(alert.id);
        triggerAlert(alert.id);
        showNotification(alert, currentPrice);
      }
    }
  }, [tickers, alerts, triggerAlert]);
}
