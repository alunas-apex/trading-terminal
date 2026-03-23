export const config = { runtime: 'edge' };

export default async function handler() {
  const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex');
  const data = await res.json();

  return new Response(JSON.stringify(data), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=30, stale-while-revalidate=60',
    },
  });
}
