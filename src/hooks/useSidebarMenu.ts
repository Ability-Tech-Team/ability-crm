import { useMemo } from 'react';
import { buildSidebarMenu } from '@/src/lib/sidebarMenu';
import { useCurrentUserPrivilegesStore } from '@/src/store/useCurrentUserPrivilegesStore';
import type { SidebarItem } from '@/src/types/sidebar';

export function useSidebarMenu() {
  const data = useCurrentUserPrivilegesStore((s) => s.data);
  const isLoading = useCurrentUserPrivilegesStore((s) => s.isLoading);
  const error = useCurrentUserPrivilegesStore((s) => s.error);

  const items: SidebarItem[] = useMemo(
    () => buildSidebarMenu(data?.result ?? []),
    [data],
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
