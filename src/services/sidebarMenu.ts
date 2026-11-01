import api from '@/src/lib/http';
import type { RolePrivilegesResponse } from '@/src/types/rolePrivileges';

const ROLE_PRIVILEGES_ENDPOINT = '/get-role-privileges';

export async function getCurrentUserPrivileges(signal?: AbortSignal) {
  // Always bypass any HTTP / proxy cache. Privileges can be revoked by an
  // admin at any time, and a stale cached response would leave the UI
  // showing buttons the user no longer has access to until the cache
  // expires (reproduced as "works in incognito, fails in normal window").
  const response = await api.get<RolePrivilegesResponse>(
    ROLE_PRIVILEGES_ENDPOINT,
    {
      signal,
      params: { _ts: Date.now() },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    },
  );

  return response.data;
}

export const getSidebarMenu = getCurrentUserPrivileges;
