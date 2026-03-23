export const config = { runtime: 'edge' };

// CryptoCompare has proper OHLCV endpoints for every timeframe
// Free tier: 100K calls/month, no geo-blocking, no auth required for basic

const SYMBOL_MAP: Record<string, string> = {
  BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL',
  BNBUSDT: 'BNB', XRPUSDT: 'XRP', DOGEUSDT: 'DOGE',
  ADAUSDT: 'ADA', AVAXUSDT: 'AVAX', DOTUSDT: 'DOT',
  MATICUSDT: 'MATIC', LINKUSDT: 'LINK', LTCUSDT: 'LTC',
};

interface CCResponse {
  Response: string;
  Data: {
    Data: {
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volumefrom: number;
      volumeto: number;
    }[];
  };
}

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const symbol = url.searchParams.get('symbol') || 'BTCUSDT';
  const interval = url.searchParams.get('interval') || '1h';
  const limit = url.searchParams.get('limit') || '300';

  const fsym = SYMBOL_MAP[symbol] || symbol.replace('USDT', '');

  // Map timeframe to CryptoCompare endpoint + aggregate
  let endpoint: string;
  let aggregate = 1;
  let cacheSec = 60;

  switch (interval) {
    case '1m':
      endpoint = 'histominute';
      aggregate = 1;
      cacheSec = 15;
      break;
    case '3m':
      endpoint = 'histominute';
      aggregate = 3;
      cacheSec = 15;
      break;
    case '5m':
      endpoint = 'histominute';
      aggregate = 5;
      cacheSec = 30;
      break;
    case '15m':
      endpoint = 'histominute';
      aggregate = 15;
      cacheSec = 60;
      break;
    case '30m':
      endpoint = 'histominute';
      aggregate = 30;
      cacheSec = 60;
      break;
    case '1h':
      endpoint = 'histohour';
      aggregate = 1;
      cacheSec = 120;
      break;
    case '2h':
      endpoint = 'histohour';
      aggregate = 2;
      cacheSec = 120;
      break;
    case '4h':
      endpoint = 'histohour';
      aggregate = 4;
      cacheSec = 300;
      break;
    case '6h':
      endpoint = 'histohour';
      aggregate = 6;
      cacheSec = 300;
      break;
    case '8h':
      endpoint = 'histohour';
      aggregate = 8;
      cacheSec = 300;
      break;
    case '12h':
      endpoint = 'histohour';
      aggregate = 12;
      cacheSec = 300;
      break;
    case '1d':
      endpoint = 'histoday';
      aggregate = 1;
      cacheSec = 600;
      break;
    case '3d':
      endpoint = 'histoday';
      aggregate = 3;
      cacheSec = 600;
      break;
    case '1w':
      endpoint = 'histoday';
      aggregate = 7;
      cacheSec = 600;
      break;
    case '1M':
      endpoint = 'histoday';
      aggregate = 30;
      cacheSec = 3600;
      break;
    default:
      endpoint = 'histohour';
      aggregate = 1;
      cacheSec = 120;
  }

  const ccUrl = `https://min-api.cryptocompare.com/data/v2/${endpoint}?fsym=${fsym}&tsym=USD&limit=${limit}&aggregate=${aggregate}`;

  try {
    const res = await fetch(ccUrl);
    if (!res.ok) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 's-maxage=10',
        },
      });
    }

    const json = (await res.json()) as CCResponse;
    if (json.Response === 'Error' || !json.Data?.Data) {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    const candles = json.Data.Data
      .filter((c) => c.open > 0) // Filter out zero-price entries
      .map((c) => ({
        time: c.time,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close,
        volume: c.volumefrom,
      }));

    return new Response(JSON.stringify(candles), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': `s-maxage=${cacheSec}, stale-while-revalidate=${cacheSec * 2}`,
      },
    });
  } catch {
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
