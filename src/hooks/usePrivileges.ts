import { usePrivilegesStore } from '@/src/store/usePrivilegesStore';

/**
 * Hook to access cached privileges from the store.
 * Privileges are fetched once after login and cached globally.
 */
export function usePrivileges() {
  const data = usePrivilegesStore((s) => s.data);
  const isLoading = usePrivilegesStore((s) => s.isLoading);
  const error = usePrivilegesStore((s) => s.error);

  return { data, isLoading, error };
}
