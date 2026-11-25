import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { buildSidebarMenu } from '@/src/lib/sidebarMenu';
import { useCurrentUserPrivilegesStore } from '@/src/store/useCurrentUserPrivilegesStore';
import type { SidebarItem } from '@/src/types/sidebar';

export function useSidebarMenu() {
  const data = useCurrentUserPrivilegesStore((s) => s.data);
  const isLoading = useCurrentUserPrivilegesStore((s) => s.isLoading);
  const error = useCurrentUserPrivilegesStore((s) => s.error);
  const t = useTranslations('navigation');
  const importUnitDebts = t('importUnitDebts');

  const items: SidebarItem[] = useMemo(
    () => buildSidebarMenu(data?.result ?? [], { importUnitDebts }),
    [data, importUnitDebts],
  );

  return useMemo(
    () => ({
      items,
      isLoading,
      error,
    }),
    [items, isLoading, error],
  );
}
