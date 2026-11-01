import { create } from 'zustand';
import type { AllDropdownsResponse } from '@/src/types/dropdowns';

interface DropdownsState {
  data: AllDropdownsResponse['result'] | null;
  isLoading: boolean;
  error: Error | null;
  setData: (data: AllDropdownsResponse['result']) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

export const useDropdownsStore = create<DropdownsState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  setData: (data) => set({ data, isLoading: false, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ data: null, isLoading: false, error: null }),
}));
