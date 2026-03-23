export const config = { runtime: 'edge' };

// Use CoinGecko OHLC — reliable, no geo-block
export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const interval = url.searchParams.get('interval') || '1h';

  // Map symbol to CoinGecko ID
  const coinMap: Record<string, string> = {
    BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', SOLUSDT: 'solana',
    BNBUSDT: 'binancecoin', XRPUSDT: 'ripple', DOGEUSDT: 'dogecoin',
    ADAUSDT: 'cardano', AVAXUSDT: 'avalanche-2', DOTUSDT: 'polkadot',
    MATICUSDT: 'matic-network', LINKUSDT: 'chainlink', LTCUSDT: 'litecoin',
  };
  const coinId = coinMap[symbol] || 'bitcoin';

  // Map interval to CoinGecko days parameter
  // CoinGecko OHLC: 1-2 days = 30min candles, 3-30 days = 4h, 31+ = 4 days
  // For market_chart we get granular data
  const daysMap: Record<string, string> = {
    '1m': '1', '5m': '1', '15m': '1', '30m': '1',
    '1h': '7', '4h': '30', '1d': '365', '1w': '365',
    '2h': '14', '6h': '30', '8h': '30', '12h': '60',
    '3m': '1', '3d': '365', '1M': '365',
  };
  const days = daysMap[interval] || '7';

  try {
    const cgUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/ohlc?vs_currency=usd&days=${days}`;
    const res = await fetch(cgUrl);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `CoinGecko HTTP ${res.status}` }), {
        status: 502,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await res.json() as number[][];
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // CoinGecko OHLC format: [timestamp, open, high, low, close]
    // We need to add volume (CoinGecko OHLC doesn't include it, set to 0)
    const candles = data.map((k: number[]) => ({
      time: Math.floor(k[0] / 1000),
      open: k[1],
      high: k[2],
      low: k[3],
      close: k[4],
      volume: 0,
    }));

    return new Response(JSON.stringify(candles), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
