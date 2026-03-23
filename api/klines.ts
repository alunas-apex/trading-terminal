export const config = { runtime: 'edge' };

const COIN_MAP: Record<string, string> = {
  BTCUSDT: 'bitcoin', ETHUSDT: 'ethereum', SOLUSDT: 'solana',
  BNBUSDT: 'binancecoin', XRPUSDT: 'ripple', DOGEUSDT: 'dogecoin',
  ADAUSDT: 'cardano', AVAXUSDT: 'avalanche-2', DOTUSDT: 'polkadot',
  MATICUSDT: 'matic-network', LINKUSDT: 'chainlink', LTCUSDT: 'litecoin',
};

// Map our timeframe to CoinGecko days + expected candle duration
const TF_CONFIG: Record<string, { days: string; candleSec: number; cache: number }> = {
  '1m':  { days: '1',   candleSec: 60,      cache: 30 },
  '3m':  { days: '1',   candleSec: 180,     cache: 30 },
  '5m':  { days: '1',   candleSec: 300,     cache: 30 },
  '15m': { days: '1',   candleSec: 900,     cache: 60 },
  '30m': { days: '1',   candleSec: 1800,    cache: 60 },
  '1h':  { days: '7',   candleSec: 3600,    cache: 120 },
  '2h':  { days: '14',  candleSec: 7200,    cache: 120 },
  '4h':  { days: '30',  candleSec: 14400,   cache: 300 },
  '6h':  { days: '30',  candleSec: 21600,   cache: 300 },
  '8h':  { days: '60',  candleSec: 28800,   cache: 300 },
  '12h': { days: '60',  candleSec: 43200,   cache: 300 },
  '1d':  { days: '180', candleSec: 86400,   cache: 600 },
  '3d':  { days: '365', candleSec: 259200,  cache: 600 },
  '1w':  { days: '365', candleSec: 604800,  cache: 600 },
  '1M':  { days: 'max', candleSec: 2592000, cache: 3600 },
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const interval = url.searchParams.get('interval') || '1h';

  const coinId = COIN_MAP[symbol] || 'bitcoin';
  const config = TF_CONFIG[interval] || TF_CONFIG['1h'];

  try {
    // Use market_chart endpoint — more reliable than OHLC, better rate limits
    const cgUrl = `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${config.days}`;
    const res = await fetch(cgUrl);

    if (res.status === 429) {
      // Rate limited — return empty with short cache so client retries soon
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=10, stale-while-revalidate=20',
        },
      });
    }

    if (!res.ok) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await res.json() as { prices?: number[][]; total_volumes?: number[][] };
    const prices = data.prices || [];
    const volumes = data.total_volumes || [];

    if (prices.length === 0) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Build volume lookup
    const volMap = new Map<number, number>();
    for (const [ts, vol] of volumes) {
      volMap.set(ts, vol);
    }

    // Group price points into candles of the requested duration
    const candleDurationMs = config.candleSec * 1000;
    const candles: { time: number; open: number; high: number; low: number; close: number; volume: number }[] = [];

    let bucketStart = Math.floor(prices[0][0] / candleDurationMs) * candleDurationMs;
    let open = prices[0][1];
    let high = prices[0][1];
    let low = prices[0][1];
    let close = prices[0][1];
    let vol = 0;

    for (const [ts, price] of prices) {
      if (ts >= bucketStart + candleDurationMs) {
        // Save completed candle
        candles.push({
          time: Math.floor(bucketStart / 1000),
          open, high, low, close,
          volume: vol,
        });

        // Start new bucket
        bucketStart = Math.floor(ts / candleDurationMs) * candleDurationMs;
        open = price;
        high = price;
        low = price;
        close = price;
        vol = 0;
      } else {
        high = Math.max(high, price);
        low = Math.min(low, price);
        close = price;
      }

      // Accumulate nearest volume
      const nearestVol = volMap.get(ts);
      if (nearestVol !== undefined) vol += nearestVol;
    }

    // Don't forget the last candle
    if (open !== undefined) {
      candles.push({
        time: Math.floor(bucketStart / 1000),
        open, high, low, close,
        volume: vol,
      });
    }

    return new Response(JSON.stringify(candles), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `s-maxage=${config.cache}, stale-while-revalidate=${config.cache * 2}`,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
