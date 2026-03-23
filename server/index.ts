import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { BinanceAdapter } from './adapters/binance.js';
import { BybitAdapter } from './adapters/bybit.js';

const PORT = 3001;

async function start() {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });
  await app.register(websocket);

  // Exchange adapters
  const binance = new BinanceAdapter();
  const bybit = new BybitAdapter();

  // WebSocket endpoint — client subscribes to symbols, server fans out
  app.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, _req) => {
      const subscriptions = new Set<string>();

      socket.on('message', (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as { action: string; symbol?: string; channel?: string };

          if (msg.action === 'subscribe' && msg.symbol) {
            const sym = msg.symbol.toUpperCase();
            subscriptions.add(sym);

            // Subscribe to Binance ticker + kline
            binance.subscribe(sym, (data) => {
              if (socket.readyState === 1) {
                socket.send(JSON.stringify({ source: 'binance', symbol: sym, ...data }));
              }
            });

            // Subscribe to Bybit funding/liquidation if perps
            bybit.subscribe(sym, (data) => {
              if (socket.readyState === 1) {
                socket.send(JSON.stringify({ source: 'bybit', symbol: sym, ...data }));
              }
            });

            socket.send(JSON.stringify({ type: 'subscribed', symbol: sym }));
          }

          if (msg.action === 'unsubscribe' && msg.symbol) {
            subscriptions.delete(msg.symbol.toUpperCase());
          }
        } catch {
          // ignore malformed messages
        }
      });

      socket.on('close', () => {
        // Cleanup handled by adapters' reference counting
        subscriptions.clear();
      });
    });
  });

  // REST: Health check
  app.get('/api/health', async () => ({ status: 'ok', uptime: process.uptime() }));

  // REST: Proxy Binance klines
  app.get<{
    Querystring: { symbol: string; interval: string; limit?: string };
  }>('/api/klines', async (req) => {
    const { symbol, interval, limit = '500' } = req.query;
    const url = `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    const res = await fetch(url);
    return res.json();
  });

  // REST: Proxy Binance funding rates
  app.get('/api/funding-rates', async () => {
    const url = 'https://fapi.binance.com/fapi/v1/premiumIndex';
    const res = await fetch(url);
    return res.json();
  });

  // REST: Proxy Polymarket events
  app.get<{
    Querystring: { limit?: string };
  }>('/api/prediction-markets', async (req) => {
    const limit = req.query.limit ?? '20';
    const url = `https://gamma-api.polymarket.com/events?closed=false&limit=${limit}&order=volume&ascending=false`;
    const res = await fetch(url);
    return res.json();
  });

  // REST: Proxy CoinGecko
  app.get<{
    Querystring: { ids?: string };
  }>('/api/coins', async (req) => {
    const ids = req.query.ids ?? 'bitcoin,ethereum,solana,binancecoin,ripple';
    const url = `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${ids}&order=market_cap_desc`;
    const res = await fetch(url);
    return res.json();
  });

  // REST: Proxy FRED data
  app.get<{
    Querystring: { series_id: string };
  }>('/api/fred', async (req) => {
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${req.query.series_id}&api_key=DEMO_KEY&file_type=json&sort_order=desc&limit=10`;
    const res = await fetch(url);
    return res.json();
  });

  // REST: Proxy DefiLlama
  app.get('/api/defi/tvl', async () => {
    const res = await fetch('https://api.llama.fi/protocols');
    const data = (await res.json()) as { name: string; tvl: number; chain: string; category: string }[];
    return data.slice(0, 20).map((p) => ({
      name: p.name,
      tvl: p.tvl,
      chain: p.chain,
      category: p.category,
    }));
  });

  await app.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`Server running on http://localhost:${PORT}`);
}

start().catch(console.error);
