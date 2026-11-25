'use client';

import { useSession } from '@/src/hooks/useSession';
import { isSuperAdminRole } from '@/src/lib/superAdmin';

/** Whether the signed-in employee is the Super Admin (`src/lib/superAdmin.ts`). */
export function useIsSuperAdmin(): boolean {
  return isSuperAdminRole(useSession().details.roleName);
}
