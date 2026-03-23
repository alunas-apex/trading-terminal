import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { limit = '20' } = req.query;
  try {
    const url = `https://gamma-api.polymarket.com/events?closed=false&limit=${limit}&order=volume&ascending=false`;
    const response = await fetch(url);
    const data = await response.json();
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=60');
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prediction markets' });
  }
}
