export const config = { runtime: 'edge' };

// Simulated orderbook from CoinGecko ticker data
// CoinGecko doesn't have orderbook data, so we generate realistic levels from the current price
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';

  const coinMap: Record<string, string> = {
    BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', SOLUSDT: 'solana',
    BNBUSDT: 'binancecoin', XRPUSDT: 'ripple',
  };
  const coinId = coinMap[symbol] || 'bitcoin';

  try {
    const cgUrl = `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`;
    const res = await fetch(cgUrl);
    if (!res.ok) {
      return new Response(JSON.stringify({ bids: [], asks: [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await res.json() as Record<string, { usd: number }>;
    const price = data[coinId]?.usd ?? 0;
    if (price === 0) {
      return new Response(JSON.stringify({ bids: [], asks: [] }), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Generate realistic orderbook levels around current price
    const spread = price * 0.0001; // 0.01% spread
    const bids = [];
    const asks = [];
    for (let i = 0; i < 20; i++) {
      const bidPrice = price - spread * (i + 1);
      const askPrice = price + spread * (i + 1);
      // Larger quantities further from mid
      const qty = (0.01 + Math.random() * 0.5) * (1 + i * 0.3);
      bids.push({ price: parseFloat(bidPrice.toFixed(2)), quantity: parseFloat(qty.toFixed(4)) });
      asks.push({ price: parseFloat(askPrice.toFixed(2)), quantity: parseFloat(qty.toFixed(4)) });
    }

    return new Response(JSON.stringify({ bids, asks }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=5, stale-while-revalidate=10',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ bids: [], asks: [] }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
