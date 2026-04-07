import { create } from 'zustand';

interface EarningsState {
  balance: number | null;
  lastFetched: number | null;
  setBalance: (balance: number) => void;
  invalidate: () => void;
}

export const useEarningsStore = create<EarningsState>((set) => ({
  balance: null,
  lastFetched: null,
  setBalance: (balance) => set({ balance, lastFetched: Date.now() }),
  invalidate: () => set({ balance: null, lastFetched: null }),
}));
