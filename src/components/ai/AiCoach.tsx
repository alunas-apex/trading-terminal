import { useState } from 'react';
import { useMarketStore } from '../../stores/marketStore';
import type { Ticker, Candle, FundingRate } from '../../types/market';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export function AiCoach() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'system',
      content: 'AI Coach is ready. Ask me about any coin on your watchlist for market summaries, trend analysis, and funding rate info.',
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const activeSymbol = useMarketStore((s) => s.activeSymbol);
  const tickers = useMarketStore((s) => s.tickers);
  const candles = useMarketStore((s) => s.candles);
  const fundingRates = useMarketStore((s) => s.fundingRates);
  const watchlist = useMarketStore((s) => s.watchlist);

  const handleSend = () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);

    const response = generateResponse(input, activeSymbol, tickers, candles, fundingRates, watchlist.map((w) => w.symbol));
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
            maxWidth: '90%',
          }}>
            {msg.role === 'assistant' && (
              <div style={{ fontSize: '10px', color: 'var(--accent)', fontWeight: 600, marginBottom: '2px' }}>AI Coach</div>
            )}
            <div style={{ whiteSpace: 'pre-wrap' }}>
              {renderFormattedText(msg.content)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', padding: '8px', borderTop: '1px solid var(--border)' }}>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Ask about markets..."
          style={{
            flex: 1, padding: '6px 8px', background: 'var(--bg-secondary)',
            border: '1px solid var(--border)', borderRadius: '4px',
            color: 'var(--text-primary)', fontSize: '11px', outline: 'none',
          }}
        />
        <button
          onClick={handleSend}
          style={{
            padding: '6px 12px', background: 'var(--accent)', color: '#fff',
            border: 'none', borderRadius: '4px', cursor: 'pointer',
            fontSize: '11px', fontWeight: 600,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}

function renderFormattedText(text: string): JSX.Element[] {
  return text.split('\n').map((line, i) => {
    // Bold markers: **text**
    const parts = line.split(/(\*\*[^*]+\*\*)/);
    const rendered = parts.map((part, j) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={j} style={{ color: 'var(--accent)' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={j}>{part}</span>;
    });
    return <div key={i}>{rendered}</div>;
  });
}

function computeRSI(candleData: Candle[], period: number = 14): number | null {
  if (candleData.length < period + 1) return null;
  const recent = candleData.slice(-period - 1);
  let gains = 0;
  let losses = 0;
  for (let i = 1; i < recent.length; i++) {
    const diff = recent[i].close - recent[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

function detectTrend(candleData: Candle[]): string {
  if (candleData.length < 20) return 'insufficient data';
  const recent = candleData.slice(-20);
  const first5Avg = recent.slice(0, 5).reduce((s, c) => s + c.close, 0) / 5;
  const last5Avg = recent.slice(-5).reduce((s, c) => s + c.close, 0) / 5;
  const changePct = ((last5Avg - first5Avg) / first5Avg) * 100;
  if (changePct > 2) return 'bullish';
  if (changePct < -2) return 'bearish';
  return 'sideways';
}

function findSymbolFromInput(input: string, watchlistSymbols: string[]): string | null {
  const lower = input.toLowerCase();
  for (const sym of watchlistSymbols) {
    const base = sym.replace('USDT', '').toLowerCase();
    if (lower.includes(base)) return sym;
  }
  return null;
}

function generateResponse(
  input: string,
  activeSymbol: string,
  tickers: Record<string, Ticker>,
  candles: Record<string, Candle[]>,
  fundingRates: Record<string, FundingRate>,
  watchlistSymbols: string[]
): string {
  const lower = input.toLowerCase();

  // Determine which symbol user is asking about
  const mentionedSymbol = findSymbolFromInput(input, watchlistSymbols);
  const symbol = mentionedSymbol || activeSymbol;
  const ticker = tickers[symbol];
  const fr = fundingRates[symbol];

  // Find candle data (try multiple timeframe keys)
  let candleData: Candle[] = [];
  for (const tfKey of [`${symbol}:1h`, `${symbol}:4h`, `${symbol}:1d`, symbol]) {
    if (candles[tfKey] && candles[tfKey].length > 0) {
      candleData = candles[tfKey];
      break;
    }
  }

  // Market summary / overview
  if (lower.includes('summary') || lower.includes('overview') || lower.includes('market')) {
    let resp = `**Market Summary for ${symbol}**\n\n`;
    if (ticker) {
      resp += `Price: $${ticker.price.toLocaleString()} (${ticker.changePercent24h >= 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}%)\n`;
      resp += `24h Range: $${ticker.low24h.toLocaleString()} - $${ticker.high24h.toLocaleString()}\n`;
      resp += `Volume: ${(ticker.volume24h / 1e6).toFixed(1)}M\n\n`;
    } else {
      resp += 'Waiting for ticker data...\n\n';
    }

    const rsi = computeRSI(candleData);
    const trend = detectTrend(candleData);
    if (rsi !== null) {
      resp += `**RSI(14):** ${rsi.toFixed(1)} — ${rsi > 70 ? 'Overbought' : rsi < 30 ? 'Oversold' : 'Neutral'}\n`;
    }
    resp += `**Trend:** ${trend}\n`;

    if (fr) {
      resp += `\n**Funding Rate:** ${(fr.rate * 100).toFixed(4)}% (${fr.rate >= 0 ? 'longs pay' : 'shorts pay'})\n`;
    }

    return resp;
  }

  // Price queries
  if (lower.includes('price') || lower.includes('how much') || lower.includes('what\'s')) {
    if (ticker) {
      let resp = `**${symbol}** is at $${ticker.price.toLocaleString()} (${ticker.changePercent24h >= 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}% 24h)\n\n`;
      resp += `Range: $${ticker.low24h.toLocaleString()} - $${ticker.high24h.toLocaleString()}\n`;
      resp += `Volume: ${(ticker.volume24h / 1e6).toFixed(1)}M\n`;

      const rsi = computeRSI(candleData);
      if (rsi !== null) {
        resp += `\n**RSI(14):** ${rsi.toFixed(1)} — ${rsi > 70 ? 'Overbought zone, watch for reversal' : rsi < 30 ? 'Oversold zone, potential bounce' : 'Neutral range'}\n`;
      }
      const trend = detectTrend(candleData);
      resp += `**Trend:** ${trend}\n`;

      if (fr) {
        resp += `**Funding:** ${(fr.rate * 100).toFixed(4)}%\n`;
      }
      return resp;
    }
    return `Waiting for ${symbol} data to load...`;
  }

  // RSI specific
  if (lower.includes('rsi')) {
    const rsi = computeRSI(candleData);
    if (rsi !== null) {
      let resp = `**${symbol} RSI(14):** ${rsi.toFixed(1)}\n\n`;
      if (rsi > 70) resp += 'Currently in **overbought** territory. Consider taking profits or tightening stops.';
      else if (rsi > 60) resp += 'Bullish momentum but approaching overbought levels.';
      else if (rsi < 30) resp += 'Currently in **oversold** territory. Watch for potential bounce or accumulation.';
      else if (rsi < 40) resp += 'Bearish momentum but approaching oversold levels.';
      else resp += 'RSI is in neutral range. No strong momentum signal.';
      return resp;
    }
    return `Not enough candle data for ${symbol} to compute RSI. Waiting for more data to load.`;
  }

  // Funding rate
  if (lower.includes('funding')) {
    if (fr) {
      const rateStr = (fr.rate * 100).toFixed(4);
      let resp = `**${symbol} Funding Rate:** ${rateStr}%\n\n`;
      resp += fr.rate >= 0
        ? 'Positive funding: longs are paying shorts. Market sentiment is bullish.'
        : 'Negative funding: shorts are paying longs. Market sentiment is bearish.';
      if (Math.abs(fr.rate * 100) > 0.1) {
        resp += '\n\n**Alert:** High funding rate — potential for a funding rate arbitrage opportunity or mean reversion.';
      }
      return resp;
    }
    return `No funding rate data available for ${symbol} yet.`;
  }

  // Trade / buy / sell
  if (lower.includes('buy') || lower.includes('sell') || lower.includes('trade') || lower.includes('entry')) {
    let resp = `**${symbol} Quick Analysis**\n\n`;
    if (ticker) {
      resp += `Current: $${ticker.price.toLocaleString()} (${ticker.changePercent24h >= 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}%)\n`;
    }
    const rsi = computeRSI(candleData);
    const trend = detectTrend(candleData);
    if (rsi !== null) resp += `RSI(14): ${rsi.toFixed(1)}\n`;
    resp += `Trend: ${trend}\n`;
    if (fr) resp += `Funding: ${(fr.rate * 100).toFixed(4)}%\n`;
    resp += '\nFull AI trade suggestions with entry/exit levels will be available in Phase 3 with Claude AI integration.';
    return resp;
  }

  // Strategy
  if (lower.includes('strategy') || lower.includes('strat')) {
    return '**Available Strategies (Phase 2-3):**\n\n- VWAP Reversion\n- RSI Mean Reversion\n- Funding Rate Arb\n- Options Wheel\n- Prediction Market Arb\n\nToggle them in the Strategy Panel.';
  }

  // Default: give a mini summary
  let resp = `Monitoring **${symbol}** for you.\n\n`;
  if (ticker) {
    resp += `Price: $${ticker.price.toLocaleString()} (${ticker.changePercent24h >= 0 ? '+' : ''}${ticker.changePercent24h.toFixed(2)}%)\n`;
  }
  const rsi = computeRSI(candleData);
  if (rsi !== null) resp += `RSI: ${rsi.toFixed(1)} | `;
  resp += `Trend: ${detectTrend(candleData)}\n\n`;
  resp += 'Try: "market summary", "RSI", "funding rate", or ask about any watchlist coin by name.';
  return resp;
}
