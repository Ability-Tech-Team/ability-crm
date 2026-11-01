import { create } from 'zustand';
import type { PrivilegesResponse } from '@/src/services/privileges';

interface PrivilegesState {
  data: PrivilegesResponse | null;
  isLoading: boolean;
  error: Error | null;
  setData: (data: PrivilegesResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

export const usePrivilegesStore = create<PrivilegesState>((set) => ({
  data: null,
  isLoading: false,
  error: null,
  setData: (data) => set({ data, isLoading: false, error: null }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error, isLoading: false }),
  reset: () => set({ data: null, isLoading: false, error: null }),
}));
