export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';

  const bybitUrl = `https://api.bybit.com/v5/market/tickers?category=spot&symbol=${symbol}`;
  const res = await fetch(bybitUrl);
  const json = await res.json() as { retCode: number; result?: { list?: Record<string, string>[] } };

  if (json.retCode !== 0 || !json.result?.list?.[0]) {
    return new Response(JSON.stringify(null), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const t = json.result.list[0];
  const ticker = {
    symbol: t.symbol,
    price: parseFloat(t.lastPrice),
    change24h: parseFloat(t.price24hPcnt) * parseFloat(t.prevPrice24h),
    changePercent24h: parseFloat(t.price24hPcnt) * 100,
    high24h: parseFloat(t.highPrice24h),
    low24h: parseFloat(t.lowPrice24h),
    volume24h: parseFloat(t.volume24h),
  };

  return new Response(JSON.stringify(ticker), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=5, stale-while-revalidate=10',
    },
  });
}
