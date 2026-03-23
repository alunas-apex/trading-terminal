export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const limit = url.searchParams.get('limit') || '25';

  const bybitUrl = `https://api.bybit.com/v5/market/orderbook?category=spot&symbol=${symbol}&limit=${limit}`;
  const res = await fetch(bybitUrl);
  const json = await res.json() as { retCode: number; result?: { b?: string[][]; a?: string[][] } };

  if (json.retCode !== 0 || !json.result) {
    return new Response(JSON.stringify({ bids: [], asks: [] }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  const orderbook = {
    bids: (json.result.b || []).map(([p, q]: string[]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
    asks: (json.result.a || []).map(([p, q]: string[]) => ({ price: parseFloat(p), quantity: parseFloat(q) })),
  };

  return new Response(JSON.stringify(orderbook), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=1, stale-while-revalidate=5',
    },
  });
}
