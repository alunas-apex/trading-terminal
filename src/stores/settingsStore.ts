import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { IndicatorConfig } from '../types/indicators';
import { DEFAULT_INDICATORS } from '../types/indicators';

export type Theme = 'dark' | 'light';

interface SettingsState {
  theme: Theme;
  setTheme: (t: Theme) => void;

  riskPerTrade: number;
  setRiskPerTrade: (r: number) => void;

  maxDailyLoss: number;
  setMaxDailyLoss: (m: number) => void;

  indicators: IndicatorConfig[];
  toggleIndicator: (name: string, params?: Record<string, number>) => void;
  updateIndicatorParams: (name: string, params: Record<string, number>) => void;

  enabledSources: string[];
  toggleSource: (source: string) => void;

  enabledStrategies: string[];
  toggleStrategy: (strategy: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      setTheme: (t) => set({ theme: t }),

      riskPerTrade: 2,
      setRiskPerTrade: (r) => set({ riskPerTrade: r }),

      maxDailyLoss: 5,
      setMaxDailyLoss: (m) => set({ maxDailyLoss: m }),

      indicators: DEFAULT_INDICATORS,
      toggleIndicator: (name, params) =>
        set((s) => ({
          indicators: s.indicators.map((ind) =>
            ind.name === name && (!params || JSON.stringify(ind.params) === JSON.stringify(params))
              ? { ...ind, enabled: !ind.enabled }
              : ind
          ),
        })),
      updateIndicatorParams: (name, params) =>
        set((s) => ({
          indicators: s.indicators.map((ind) =>
            ind.name === name ? { ...ind, params } : ind
          ),
        })),

      enabledSources: ['binance', 'bybit', 'coingecko', 'polymarket', 'manifold'],
      toggleSource: (source) =>
        set((s) => ({
          enabledSources: s.enabledSources.includes(source)
            ? s.enabledSources.filter((src) => src !== source)
            : [...s.enabledSources, source],
        })),

      enabledStrategies: [],
      toggleStrategy: (strategy) =>
        set((s) => ({
          enabledStrategies: s.enabledStrategies.includes(strategy)
            ? s.enabledStrategies.filter((st) => st !== strategy)
            : [...s.enabledStrategies, strategy],
        })),
    }),
    { name: 'trading-terminal-settings' }
  )
);
