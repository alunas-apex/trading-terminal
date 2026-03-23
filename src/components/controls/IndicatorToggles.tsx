import { useSettingsStore } from '../../stores/settingsStore';
import type { IndicatorConfig } from '../../types/indicators';

function indicatorLabel(ind: IndicatorConfig): string {
  if (ind.name === 'EMA') return `EMA ${ind.params.period}`;
  if (ind.name === 'Bollinger') return `BB (${ind.params.period},${ind.params.stdDev})`;
  if (ind.name === 'RSI') return `RSI (${ind.params.period})`;
  if (ind.name === 'MACD') return `MACD (${ind.params.fast},${ind.params.slow},${ind.params.signal})`;
  if (ind.name === 'VWAP') return 'VWAP';
  if (ind.name === 'ATR') return `ATR (${ind.params.period})`;
  return ind.name;
}

export function IndicatorToggles() {
  const indicators = useSettingsStore((s) => s.indicators);
  const toggleIndicator = useSettingsStore((s) => s.toggleIndicator);

  return (
    <div className="indicator-toggles">
      <div className="indicator-toggles__title">Indicators</div>
      <div className="indicator-toggles__list">
        {indicators.map((ind, idx) => (
          <label key={`${ind.name}-${idx}`} className="indicator-toggles__item">
            <input
              type="checkbox"
              checked={ind.enabled}
              onChange={() => toggleIndicator(ind.name, ind.params)}
            />
            <span className={`indicator-toggles__label ${ind.enabled ? 'indicator-toggles__label--active' : ''}`}>
              {indicatorLabel(ind)}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
