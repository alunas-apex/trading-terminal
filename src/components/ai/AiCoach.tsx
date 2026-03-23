import { useState } from 'react';
import { useMarketStore } from '../../stores/marketStore';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export function AiCoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'AI Coach is ready. In Phase 3, I will provide live market analysis, trade suggestions, and portfolio management. For now, I am monitoring your active instruments.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const ticker = useMarketStore((s) => s.tickers.get(activeSymbol));

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    // Phase 1: Basic auto-response with market context
    const response = generateBasicResponse(input, activeSymbol, ticker);
    const assistantMsg: Message = { role: 'assistant', content: response, timestamp: Date.now() };

    setTimeout(() => {
      setMessages((prev) => [...prev, assistantMsg]);
    }, 300);

    setInput('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontSize: '11px' }}>
      <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            marginBottom: '8px',
            padding: '6px 8px',
            borderRadius: '6px',
            background: msg.role === 'user' ? 'var(--accent)' : msg.role === 'system' ? 'var(--bg-secondary)' : 'var(--bg-hover)',
            color: msg.role === 'user' ? '#fff' : 'var(--text-primary)',
            alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
            maxWidth: '90%',
          }}>
            {msg.role === 'assistant' && (
              <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600, marginBottom: '2px' }}>AI Coach</div>
            )}
            <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}</div>
          </div>
        ))}
      </div>

      <div style={{
        display: 'flex',
        gap: '4px',
        padding: '8px',
        borderTop: '1px solid var(--border)',
      }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about markets..."
          style={{
            flex: 1,
            padding: '6px 8px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            color: 'var(--text-primary)',
            fontSize: '11px',
            outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '6px 12px',
            background: 'var(--accent)',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '11px',
            fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function generateBasicResponse(
  input: string,
  symbol: string,
  ticker?: { price: number; changePercent24h: number; high24h: number; low24h: number; volume24h: number }
): string {
  const lower = input.toLowerCase();

  if (lower.includes('price') || lower.includes('how') || lower.includes('what')) {
    if (ticker) {
      return `${symbol} is currently at $${ticker.price.toLocaleString()} (${ticker.changePercent24h >= 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}% 24h).\n\nRange: $${ticker.low24h.toLocaleString()} - $${ticker.high24h.toLocaleString()}\nVolume: ${(ticker.volume24h / 1e6).toFixed(1)}M\n\n[Full AI analysis available in Phase 3]`;
    }
    return `Waiting for ${symbol} data to load...`;
  }

  if (lower.includes('buy') || lower.includes('sell') || lower.includes('trade') || lower.includes('entry')) {
    return `Trade suggestions will be available in Phase 3 with Claude AI integration. For now, I recommend analyzing the chart with RSI and MACD indicators enabled.`;
  }

  if (lower.includes('strategy') || lower.includes('strat')) {
    return `Supported strategies (coming Phase 2-3):\n- VWAP Reversion\n- RSI Mean Reversion\n- Funding Rate Arb\n- Options Wheel\n- Prediction Market Arb\n\nToggle them in the Strategy Panel.`;
  }

  return `I'm monitoring ${symbol} for you. Full AI coaching (analysis, signals, trade management) arrives in Phase 3.\n\nTry asking: "what's the price?" or "what strategies are available?"`;
}
