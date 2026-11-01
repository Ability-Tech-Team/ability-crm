import { create } from 'zustand';

interface MaintenanceState {
  isMaintenance: boolean;
  setMaintenance: (value: boolean) => void;
}

/**
 * Tracks the backend-driven maintenance flag.
 *
 * The flag is updated by the axios response interceptor (see
 * `src/lib/http.ts`) on every response — both success and error — based on
 * the `is_maintenance` key the backend includes in its payload.
 *
 * Intentionally NOT persisted: the value must always reflect the latest
 * response from the backend.
 */
export const useMaintenanceStore = create<MaintenanceState>((set) => ({
  isMaintenance: false,
  setMaintenance: (value) => set({ isMaintenance: value }),
}));
