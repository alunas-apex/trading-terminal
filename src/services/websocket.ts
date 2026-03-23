type MessageHandler = (data: unknown) => void;

interface WSConnectionOptions {
  url: string;
  onMessage: MessageHandler;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (error: Event) => void;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
}

export class WSConnection {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: MessageHandler;
  private onOpen?: () => void;
  private onClose?: () => void;
  private onError?: (error: Event) => void;
  private reconnect: boolean;
  private maxReconnectAttempts: number;
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  constructor(options: WSConnectionOptions) {
    this.url = options.url;
    this.onMessage = options.onMessage;
    this.onOpen = options.onOpen;
    this.onClose = options.onClose;
    this.onError = options.onError;
    this.reconnect = options.reconnect ?? true;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 10;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.intentionallyClosed = false;
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.onOpen?.();
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        this.onMessage(data);
      } catch {
        // non-JSON message, ignore
      }
    };

    this.ws.onclose = () => {
      this.onClose?.();
      if (this.reconnect && !this.intentionallyClosed) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (error) => {
      this.onError?.(error);
    };
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    this.ws?.close();
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }
}

export class WSManager {
  private connections = new Map<string, WSConnection>();

  add(id: string, options: WSConnectionOptions): WSConnection {
    const existing = this.connections.get(id);
    if (existing) {
      existing.close();
    }

    const conn = new WSConnection(options);
    this.connections.set(id, conn);
    conn.connect();
    return conn;
  }

  get(id: string): WSConnection | undefined {
    return this.connections.get(id);
  }

  remove(id: string): void {
    const conn = this.connections.get(id);
    conn?.close();
    this.connections.delete(id);
  }

  closeAll(): void {
    for (const conn of this.connections.values()) {
      conn.close();
    }
    this.connections.clear();
  }
}

export const wsManager = new WSManager();
