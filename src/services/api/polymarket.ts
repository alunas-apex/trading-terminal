import type { PredictionMarket } from '../../types/market';
import { useMarketStore } from '../../stores/marketStore';

interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  markets: PolymarketMarketData[];
}

interface PolymarketMarketData {
  id: string;
  question: string;
  outcomePrices: string;
  volume: string;
  endDate: string;
  slug: string;
}

export async function fetchActiveMarkets(limit: number = 20): Promise<PredictionMarket[]> {
  // Use Vercel serverless proxy to avoid CORS
  const isVercel = typeof window !== 'undefined' && !window.location.hostname.includes('localhost');
  const url = isVercel
    ? `/api/prediction-markets?limit=${limit}`
    : `https://gamma-api.polymarket.com/events?closed=false&limit=${limit}&order=volume&ascending=false`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polymarket fetch failed: ${res.status}`);
  const events = (await res.json()) as PolymarketEvent[];

  const markets: PredictionMarket[] = [];
  for (const event of events) {
    for (const market of event.markets ?? []) {
      let probability = 0;
      try {
        const prices = JSON.parse(market.outcomePrices) as string[];
        probability = parseFloat(prices[0]) * 100;
      } catch { /* fallback */ }

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

  return markets;
}

export async function fetchAndStoreMarkets(): Promise<void> {
  try {
    const markets = await fetchActiveMarkets();
    useMarketStore.getState().setPredictionMarkets(markets);
  } catch (err) {
    console.error('[Polymarket] Error:', err);
  }
}
