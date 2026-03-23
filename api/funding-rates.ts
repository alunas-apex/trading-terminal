export const config = { runtime: 'edge' };

export default async function handler() {
  const res = await fetch('https://api.bybit.com/v5/market/tickers?category=linear');
  const json = await res.json() as { retCode: number; result?: { list?: Record<string, string>[] } };

  if (json.retCode !== 0 || !json.result?.list) {
    return new Response(JSON.stringify([]), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const rates = json.result.list
    .filter((t) => t.fundingRate && t.symbol?.endsWith('USDT'))
    .slice(0, 30)
    .map((t) => ({
      symbol: t.symbol,
      lastFundingRate: t.fundingRate,
      nextFundingTime: parseInt(t.nextFundingTime || '0'),
    }));

  return new Response(JSON.stringify(rates), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
    },
  });
}
