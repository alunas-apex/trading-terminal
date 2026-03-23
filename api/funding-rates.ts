export const config = { runtime: 'edge' };

// Funding rates from CoinGecko derivatives data
export default async function handler() {
  try {
    const cgUrl = 'https://api.coingecko.com/api/v3/derivatives';
    const res = await fetch(cgUrl);
    if (!res.ok) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    const data = await res.json() as Record<string, unknown>[];
    if (!Array.isArray(data)) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Extract funding rates from perpetual contracts
    const seen = new Set<string>();
    const rates = data
      .filter((d) => d.contract_type === 'perpetual' && d.funding_rate != null)
      .filter((d) => {
        const sym = (d.symbol as string || '').toUpperCase();
        if (seen.has(sym)) return false;
        seen.add(sym);
        return true;
      })
      .slice(0, 20)
      .map((d) => ({
        symbol: ((d.symbol as string) || '').replace('/', '').toUpperCase(),
        lastFundingRate: String(d.funding_rate ?? '0'),
        nextFundingTime: Date.now() + 8 * 60 * 60 * 1000,
      }));

    return new Response(JSON.stringify(rates), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 's-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (err) {
    return new Response(JSON.stringify([]), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
}
