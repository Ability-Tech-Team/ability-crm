import api from '@/src/lib/http';
import type { RolePrivilegesResponse } from '@/src/types/rolePrivileges';

const ROLE_PRIVILEGES_ENDPOINT = '/roles/get-role-privileges';

export async function getCurrentUserPrivileges(signal?: AbortSignal) {
  // Always bypass any HTTP / proxy cache. Privileges can be revoked by an
  // admin at any time, and a stale cached response would leave the UI
  // showing buttons the user no longer has access to until the cache
  // expires (reproduced as "works in incognito, fails in normal window").
  // The headers do it: the API rejects unknown query parameters
  // (INVALID_DATA_PROVIDED), so a `_ts` cache-buster can't be sent.
  const response = await api.get<RolePrivilegesResponse>(
    ROLE_PRIVILEGES_ENDPOINT,
    {
      signal,
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
