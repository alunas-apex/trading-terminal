import { useSettingsStore } from '../../stores/settingsStore';
import { useMarketStore } from '../../stores/marketStore';

const STRATEGIES = [
  { id: 'vwap-reversion', name: 'VWAP Reversion', category: 'Day Trading', phase: 2 },
  { id: 'rsi-mean-reversion', name: 'RSI Mean Reversion', category: 'Swing', phase: 2 },
  { id: 'funding-rate-arb', name: 'Funding Rate Arb', category: 'Crypto Perps', phase: 2 },
  { id: 'options-wheel', name: 'Options Wheel', category: 'Options', phase: 2 },
  { id: 'prediction-arb', name: 'Prediction Market Arb', category: 'Prediction', phase: 2 },
  { id: 'gap-fill', name: 'Gap Fill', category: 'Day Trading', phase: 3 },
  { id: 'breakout-retest', name: 'Breakout-Retest', category: 'Day Trading', phase: 3 },
  { id: 'trend-following', name: 'Trend Following', category: 'Swing', phase: 3 },
  { id: 'liquidation-cascade', name: 'Liquidation Cascade', category: 'Crypto Perps', phase: 3 },
  { id: 'cross-exchange-arb', name: 'Cross-Exchange Arb', category: 'Arbitrage', phase: 3 },
  { id: 'iron-condor', name: 'Iron Condor Scanner', category: 'Options', phase: 3 },
  { id: 'sentiment-driven', name: 'Sentiment-Driven', category: 'AI/Novel', phase: 4 },
  { id: 'regime-detection', name: 'Regime Detection', category: 'AI/Novel', phase: 4 },
];

export function StrategyPanel() {
  const enabledStrategies = useSettingsStore((s) => s.enabledStrategies);
  const toggleStrategy = useSettingsStore((s) => s.toggleStrategy);
  const fundingRates = useMarketStore((s) => s.fundingRates);

  const topFundingRate = Array.from(fundingRates.values())
    .sort((a, b) => Math.abs(b.rate) - Math.abs(a.rate))[0];

  return (
    <div style={{ fontSize: '11px', padding: '8px' }}>
      {/* Funding rate highlight */}
      {topFundingRate && (
        <div style={{
          padding: '6px 8px',
          background: 'var(--bg-secondary)',
          borderRadius: '4px',
          marginBottom: '8px',
          fontSize: '10px',
        }}>
          <span style={{ color: 'var(--text-muted)' }}>Top Funding: </span>
          <span style={{ fontWeight: 600 }}>{topFundingRate.symbol.replace('USDT', '')} </span>
          <span style={{
            fontFamily: 'var(--font-mono)',
            color: topFundingRate.rate >= 0 ? 'var(--green)' : 'var(--red)',
          }}>
            {(topFundingRate.rate * 100).toFixed(4)}%
          </span>
        </div>
      )}

      {STRATEGIES.map((strategy) => {
        const isEnabled = enabledStrategies.includes(strategy.id);
        const isAvailable = strategy.phase <= 1;

        return (
          <div
            key={strategy.id}
            onClick={() => isAvailable && toggleStrategy(strategy.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 0',
              cursor: isAvailable ? 'pointer' : 'default',
              opacity: isAvailable ? 1 : 0.4,
            }}
          >
            <div style={{
              width: 14,
              height: 14,
              borderRadius: '3px',
              border: `1px solid ${isEnabled ? 'var(--accent)' : 'var(--border)'}`,
              background: isEnabled ? 'var(--accent)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '9px',
              color: '#fff',
              flexShrink: 0,
            }}>
              {isEnabled ? '\u2713' : ''}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500 }}>{strategy.name}</div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                {strategy.category}
                {!isAvailable && ` \u2022 Phase ${strategy.phase}`}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
