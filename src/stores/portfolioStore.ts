import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Position, Alert } from '../types/market';

interface PortfolioState {
  balance: number;
  setBalance: (b: number) => void;

  positions: Position[];
  addPosition: (p: Position) => void;
  removePosition: (id: string) => void;
  updatePosition: (id: string, updates: Partial<Position>) => void;

  alerts: Alert[];
  addAlert: (a: Alert) => void;
  removeAlert: (id: string) => void;
  triggerAlert: (id: string) => void;

  totalPnl: () => number;
  totalPnlPercent: () => number;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      balance: 10000,
      setBalance: (b) => set({ balance: b }),

      positions: [],
      addPosition: (p) =>
        set((s) => ({ positions: [...s.positions, p] })),
      removePosition: (id) =>
        set((s) => ({ positions: s.positions.filter((p) => p.id !== id) })),
      updatePosition: (id, updates) =>
        set((s) => ({
          positions: s.positions.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      alerts: [],
      addAlert: (a) => set((s) => ({ alerts: [...s.alerts, a] })),
      removeAlert: (id) =>
        set((s) => ({ alerts: s.alerts.filter((a) => a.id !== id) })),
      triggerAlert: (id) =>
        set((s) => ({
          alerts: s.alerts.map((a) =>
            a.id === id ? { ...a, triggered: true } : a
          ),
        })),

      totalPnl: () =>
        get().positions.reduce((sum, p) => sum + p.pnl, 0),
      totalPnlPercent: () => {
        const { positions, balance } = get();
        const totalPnl = positions.reduce((sum, p) => sum + p.pnl, 0);
        return balance > 0 ? (totalPnl / balance) * 100 : 0;
      },
    }),
    { name: 'trading-terminal-portfolio' }
  )
);
