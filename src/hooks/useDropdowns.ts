import { useCallback } from 'react';
import { useDropdownsStore } from '@/src/store/useDropdownsStore';
import { getAllDropdowns } from '@/src/services/dropdowns';

/**
 * Hook to access cached dropdowns from the store.
 * Dropdowns are fetched once after login and cached globally.
 */
export function useDropdowns() {
  const data = useDropdownsStore((s) => s.data);
  const isLoading = useDropdownsStore((s) => s.isLoading);
  const error = useDropdownsStore((s) => s.error);
  const setData = useDropdownsStore((s) => s.setData);
  const setLoading = useDropdownsStore((s) => s.setLoading);
  const setError = useDropdownsStore((s) => s.setError);

  const refreshDropdowns = useCallback(async () => {
    setLoading(true);

    try {
      const response = await getAllDropdowns();
      setData(response.result ?? {});
    } catch (err) {
      const refreshError =
        err instanceof Error ? err : new Error('Failed to refresh dropdowns');
      setError(refreshError);
      throw refreshError;
    }
  }, [setData, setError, setLoading]);

  return { data, isLoading, error, refreshDropdowns };
}
