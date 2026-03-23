export const config = { runtime: 'edge' };

export default async function handler() {
  const res = await fetch('https://api.llama.fi/protocols');
  const data = await res.json() as { name: string; tvl: number; chain: string; category: string }[];
  const top = data.slice(0, 20).map((p) => ({
    name: p.name,
    tvl: p.tvl,
    chain: p.chain,
    category: p.category,
  }));

  return new Response(JSON.stringify(top), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
    },
  });
}
