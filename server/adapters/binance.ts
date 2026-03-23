import WebSocket from 'ws';

type DataCallback = (data: Record<string, unknown>) => void;

interface SubscriptionInfo {
  ws: WebSocket;
  callbacks: Set<DataCallback>;
}

export class BinanceAdapter {
  private subscriptions = new Map<string, SubscriptionInfo>();

  subscribe(symbol: string, callback: DataCallback): void {
    const key = symbol.toLowerCase();
    const existing = this.subscriptions.get(key);

    if (existing) {
      existing.callbacks.add(callback);
      return;
    }

    // Combined stream: ticker + kline_1h + depth20 + trade
    const streams = [
      `${key}@ticker`,
      `${key}@kline_1h`,
      `${key}@depth20@100ms`,
      `${key}@trade`,
    ].join('/');

    const url = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    const ws = new WebSocket(url);
    const callbacks = new Set<DataCallback>();
    callbacks.add(callback);

    ws.on('open', () => {
      console.log(`[Binance] Connected: ${symbol}`);
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as { stream: string; data: Record<string, unknown> };
        const streamType = msg.stream?.split('@')[1] ?? '';

        const enriched = {
          ...msg.data,
          _stream: msg.stream,
          _type: streamType.startsWith('kline') ? 'kline'
            : streamType === 'ticker' ? 'ticker'
            : streamType.startsWith('depth') ? 'orderbook'
            : streamType === 'trade' ? 'trade'
            : 'unknown',
        };

        for (const cb of callbacks) {
          cb(enriched);
        }
      } catch {
        // ignore parse errors
      }
    });

    ws.on('close', () => {
      console.log(`[Binance] Disconnected: ${symbol}`);
      this.subscriptions.delete(key);

      // Auto-reconnect after 5s
      setTimeout(() => {
        if (callbacks.size > 0) {
          for (const cb of callbacks) {
            this.subscribe(symbol, cb);
          }
        }
      }, 5000);
    });

    ws.on('error', (err) => {
      console.error(`[Binance] Error ${symbol}:`, err.message);
    });

    this.subscriptions.set(key, { ws, callbacks });
  }

  unsubscribe(symbol: string, callback: DataCallback): void {
    const key = symbol.toLowerCase();
    const sub = this.subscriptions.get(key);
    if (!sub) return;

    sub.callbacks.delete(callback);
    if (sub.callbacks.size === 0) {
      sub.ws.close();
      this.subscriptions.delete(key);
    }
  }
}
