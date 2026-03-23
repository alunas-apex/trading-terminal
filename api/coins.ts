export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const ids = url.searchParams.get('ids') || 'bitcoin,ethereum,solana,binancecoin,ripple,dogecoin,cardano';

  const apiUrl = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`;
  const res = await fetch(apiUrl);
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
    },
  });
}
