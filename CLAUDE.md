# Trading Terminal

AI-powered financial trading terminal — multi-asset, multi-strategy, with Claude AI coaching engine.

## Stack
- **Frontend:** Vite + React 18 + TypeScript strict
- **Charts:** TradingView Lightweight Charts
- **State:** Zustand + TanStack Query
- **Layout:** React Grid Layout (draggable/resizable panels)
- **Backend:** Fastify + WebSocket proxy
- **AI Engine:** Claude API (Phase 3+)

## Commands
- `npm run dev` — Start both client (5173) and server (3001)
- `npm run dev:client` — Vite dev server only
- `npm run dev:server` — Fastify server only
- `npm run build` — Production build
- `npm run typecheck` — TypeScript check

## Architecture
- `src/` — React frontend
- `server/` — Fastify backend (WS proxy, REST API)
- `src/services/` — Data adapters (Binance, Polymarket, etc.)
- `src/stores/` — Zustand state stores
- `src/components/` — UI panels (chart, orderbook, watchlist, etc.)

## Data Sources (Phase 1 — free, no auth)
Binance WS, Bybit WS, CoinGecko, Polymarket, Manifold, FRED, DefiLlama

## Conventions
- TypeScript strict mode everywhere
- Zustand for client state, TanStack Query for server state
- Server proxies all exchange WebSockets (avoids CORS/rate limits)
- All prices normalized to common format in dataAggregator
