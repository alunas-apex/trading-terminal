export const config = { runtime: 'edge' };

// Use CoinGecko for tickers — reliable, no geo-block
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';

  const coinMap: Record<string, string> = {
    BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', SOLUSDT: 'solana',
    BNBUSDT: 'binancecoin', XRPUSDT: 'ripple', DOGEUSDT: 'dogecoin',
    ADAUSDT: 'cardano', AVAXUSDT: 'avalanche-2', DOTUSDT: 'polkadot',
  };
  const coinId = coinMap[symbol] || 'bitcoin';

  try {
    const cgUrl = `https://api.coingecko.com/api/v3/coins/${coinId}?localization=false&tickers=false&community_data=false&developer_data=false`;
    const res = await fetch(cgUrl);
    if (!res.ok) {
      return new Response(JSON.stringify(null), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await res.json() as Record<string, unknown>;
    const md = data.market_data as Record<string, unknown> | undefined;
    if (!md) {
      return new Response(JSON.stringify(null), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const ticker = {
      symbol,
      price: (md.current_price as Record<string, number>)?.usd ?? 0,
      change24h: (md.price_change_24h_in_currency as Record<string, number>)?.usd ?? 0,
      changePercent24h: (md.price_change_percentage_24h as number) ?? 0,
      high24h: (md.high_24h as Record<string, number>)?.usd ?? 0,
      low24h: (md.low_24h as Record<string, number>)?.usd ?? 0,
      volume24h: (md.total_volume as Record<string, number>)?.usd ?? 0,
    };

    return new Response(JSON.stringify(ticker), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=15, stale-while-revalidate=30',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify(null), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
