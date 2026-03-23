import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const response = await fetch('https://api.llama.fi/protocols');
    const data = (await response.json()) as { name: string; tvl: number; chain: string; category: string }[];
    const top = data.slice(0, 20).map((p) => ({
      name: p.name,
      tvl: p.tvl,
      chain: p.chain,
      category: p.category,
    }));
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(200).json(top);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch DeFi data' });
  }
}
