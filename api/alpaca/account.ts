export const config = { runtime: 'edge' };

const ALPACA_BASE = 'https://paper-api.alpaca.markets';

const CORS_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, APCA-API-KEY-ID, APCA-API-SECRET-KEY',
};

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const apiKey = req.headers.get('APCA-API-KEY-ID');
  const apiSecret = req.headers.get('APCA-API-SECRET-KEY');

  if (!apiKey || !apiSecret) {
    return new Response(
      JSON.stringify({ error: 'Missing Alpaca API credentials. Pass APCA-API-KEY-ID and APCA-API-SECRET-KEY headers.' }),
      { status: 401, headers: CORS_HEADERS }
    );
  }

  try {
    const res = await fetch(`${ALPACA_BASE}/v2/account`, {
      headers: {
        'APCA-API-KEY-ID': apiKey,
        'APCA-API-SECRET-KEY': apiSecret,
      },
    });

    const data = await res.json();

    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Failed to fetch Alpaca account info' }),
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
