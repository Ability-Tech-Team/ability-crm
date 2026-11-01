'use client';

import { useMaintenanceStore } from '@/src/store/useMaintenanceStore';
import MaintenancePage from './MaintenancePage';

type Props = {
  children: React.ReactNode;
};

/**
 * Gate that swaps the entire UI for `<MaintenancePage />` whenever the
 * backend signals maintenance mode via the `is_maintenance` flag on any
 * response (handled by the axios response interceptor in `src/lib/http.ts`).
 */
export default function MaintenanceProvider({ children }: Props) {
  const isMaintenance = useMaintenanceStore((s) => s.isMaintenance);

  if (isMaintenance) {
    return <MaintenancePage />;
  }

  return <>{children}</>;
}
