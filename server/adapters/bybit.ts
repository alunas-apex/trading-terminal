import WebSocket from 'ws';

type DataCallback = (data: Record<string, unknown>) => void;

interface SubscriptionInfo {
  ws: WebSocket;
  callbacks: Set<DataCallback>;
}

export class BybitAdapter {
  private subscriptions = new Map<string, SubscriptionInfo>();

  subscribe(symbol: string, callback: DataCallback): void {
    const existing = this.subscriptions.get(symbol);

    if (existing) {
      existing.callbacks.add(callback);
      return;
    }

    const url = 'wss://stream.bybit.com/v5/public/linear';
    const ws = new WebSocket(url);
    const callbacks = new Set<DataCallback>();
    callbacks.add(callback);

    ws.on('open', () => {
      console.log(`[Bybit] Connected: ${symbol}`);

      // Subscribe to tickers and liquidations
      ws.send(JSON.stringify({
        op: 'subscribe',
        args: [
          `tickers.${symbol}`,
          `liquidation.${symbol}`,
        ],
      }));
    });

    ws.on('message', (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as Record<string, unknown>;

        // Skip subscription confirmations
        if (msg.op === 'subscribe') return;

        const topic = msg.topic as string | undefined;
        if (!topic) return;

        const type = topic.startsWith('tickers') ? 'bybit_ticker'
          : topic.startsWith('liquidation') ? 'liquidation'
          : 'unknown';

        const enriched = {
          _type: type,
          _topic: topic,
          data: msg.data,
        };

        for (const cb of callbacks) {
          cb(enriched);
        }
      } catch {
        // ignore
      }
    });

    ws.on('close', () => {
      console.log(`[Bybit] Disconnected: ${symbol}`);
      this.subscriptions.delete(symbol);

      setTimeout(() => {
        if (callbacks.size > 0) {
          for (const cb of callbacks) {
            this.subscribe(symbol, cb);
          }
        }
      }, 5000);
    });

    ws.on('error', (err) => {
      console.error(`[Bybit] Error ${symbol}:`, err.message);
    });

    // Bybit requires ping every 20s
    const pingInterval = setInterval(() => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ op: 'ping' }));
      }
    }, 20000);

    ws.on('close', () => clearInterval(pingInterval));

    this.subscriptions.set(symbol, { ws, callbacks });
  }

  unsubscribe(symbol: string, callback: DataCallback): void {
    const sub = this.subscriptions.get(symbol);
    if (!sub) return;

    sub.callbacks.delete(callback);
    if (sub.callbacks.size === 0) {
      sub.ws.close();
      this.subscriptions.delete(symbol);
    }
  }
}
