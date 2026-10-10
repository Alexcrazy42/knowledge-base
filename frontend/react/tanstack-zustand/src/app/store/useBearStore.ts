import { create } from 'zustand'

interface BearState {
  bears: number
}

interface BearActions {
  increasePopulation: () => void
  removeAllBears: () => void
}

export const useBearStore = create<BearState & BearActions>()((set) => ({
  bears: 0,
  increasePopulation: () => set((state) => ({ bears: state.bears + 1 })),
  removeAllBears: () => set({ bears: 0 }),
}))