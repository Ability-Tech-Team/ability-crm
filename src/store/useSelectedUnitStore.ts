import { create } from 'zustand';
import type { Unit } from '@/src/services/units';

interface SelectedUnitState {
  unit: Unit | null;
  setUnit: (unit: Unit) => void;
  clear: () => void;
}

export const useSelectedUnitStore = create<SelectedUnitState>((set) => ({
  unit: null,
  setUnit: (unit) => set({ unit }),
  clear: () => set({ unit: null }),
}));
