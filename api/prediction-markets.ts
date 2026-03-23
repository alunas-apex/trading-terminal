export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  const url = new URL(req.url);
  const limit = url.searchParams.get('limit') || '20';

  const apiUrl = `https://gamma-api.polymarket.com/events?closed=false&limit=${limit}&order=volume&ascending=false`;
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
