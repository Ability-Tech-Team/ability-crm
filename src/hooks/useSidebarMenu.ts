import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { buildSidebarMenu } from '@/src/lib/sidebarMenu';
import { useIsSuperAdmin } from '@/src/hooks/useIsSuperAdmin';
import { useCurrentUserPrivilegesStore } from '@/src/store/useCurrentUserPrivilegesStore';
import type { SidebarItem } from '@/src/types/sidebar';

export function useSidebarMenu() {
  const data = useCurrentUserPrivilegesStore((s) => s.data);
  const isLoading = useCurrentUserPrivilegesStore((s) => s.isLoading);
  const error = useCurrentUserPrivilegesStore((s) => s.error);
  const t = useTranslations('navigation');
  const isSuperAdmin = useIsSuperAdmin();
  const importUnitDebts = t('importUnitDebts');
  const projects = t('projects');
  const subProjects = t('subProjects');

  const items: SidebarItem[] = useMemo(
    () =>
      buildSidebarMenu(
        data?.result ?? [],
        { importUnitDebts, projects, subProjects },
        { isSuperAdmin },
      ),
    [data, importUnitDebts, projects, subProjects, isSuperAdmin],
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
