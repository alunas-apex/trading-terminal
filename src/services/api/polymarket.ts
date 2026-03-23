import type { PredictionMarket } from '../../types/market';
import { useMarketStore } from '../../stores/marketStore';

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  markets: {
    id: string;
    question: string;
    outcomePrices: string;
    volume: string;
    endDate: string;
    slug: string;
  }[];
}

export async function fetchAndStoreMarkets(): Promise<void> {
  try {
    const useProxy = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
    const url = useProxy
      ? '/api/prediction-markets?limit=20'
      : 'https://gamma-api.polymarket.com/events?closed=false&limit=20&order=volume&ascending=false';

    console.log('[Polymarket] Fetching:', url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Polymarket HTTP ${res.status}`);
    const events = (await res.json()) as PolymarketEvent[];
    if (!Array.isArray(events)) return;

    const markets: PredictionMarket[] = [];
    for (const event of events) {
      if (!event.markets) continue;
      for (const market of event.markets) {
        let probability = 50;
        try {
          const prices = JSON.parse(market.outcomePrices) as string[];
          probability = parseFloat(prices[0]) * 100;
        } catch { /* fallback to 50 */ }

        markets.push({
          id: market.id,
          question: market.question || event.title,
          probability,
          volume: parseFloat(market.volume || '0'),
          endDate: market.endDate,
          source: 'polymarket',
          url: `https://polymarket.com/event/${event.slug}`,
        });
      }
    }

    console.log(`[Polymarket] Got ${markets.length} markets`);
    useMarketStore.getState().setPredictionMarkets(markets);
  } catch (err) {
    console.warn('[Polymarket] Error:', err);
  }
}
