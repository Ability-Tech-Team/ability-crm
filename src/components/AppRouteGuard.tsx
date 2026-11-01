'use client';

import type { ReactNode } from 'react';
import { usePathname } from '@/src/i18n/navigation';
import AccessDenied from '@/src/components/AccessDenied';
import { useCurrentUserPrivileges } from '@/src/hooks/useCurrentUserPrivileges';

/**
 * Shows a route only when the user's permission tree allows it. Without a
 * loaded tree nothing is shown: an unloaded permission check is a denial.
 */
export default function AppRouteGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { data, firstAccessibleHref, canAccessPath } =
    useCurrentUserPrivileges();

  if (!data || !canAccessPath(pathname)) {
    return <AccessDenied fallbackHref={firstAccessibleHref} />;
  }

  return <>{children}</>;
}
