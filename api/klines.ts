export const config = { runtime: 'edge' };

const TF_MAP: Record<string, string> = {
  '1m': '1', '3m': '3', '5m': '5', '15m': '15', '30m': '30',
  '1h': '60', '2h': '120', '4h': '240', '6h': '360', '8h': '480', '12h': '720',
  '1d': 'D', '3d': 'D', '1w': 'W', '1M': 'M',
};

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const interval = url.searchParams.get('interval') || '1h';
  const limit = url.searchParams.get('limit') || '500';

  const bybitInterval = TF_MAP[interval] || '60';
  const bybitUrl = `https://api.bybit.com/v5/market/kline?category=spot&symbol=${symbol}&interval=${bybitInterval}&limit=${limit}`;

  const res = await fetch(bybitUrl);
  const json = await res.json() as { retCode: number; result?: { list?: string[][] } };

  if (json.retCode !== 0 || !json.result?.list) {
    return new Response(JSON.stringify({ error: 'Bybit API error', raw: json }), {
      status: 502,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  // Bybit returns [timestamp, open, high, low, close, volume, turnover] in DESC order
  // Convert to ascending array of [openTime, open, high, low, close, volume] matching our Candle format
  const candles = json.result.list
    .map((k: string[]) => ({
      time: Math.floor(parseInt(k[0]) / 1000),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
    .reverse();

  return new Response(JSON.stringify(candles), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=10, stale-while-revalidate=30',
    },
  });
}
