'use client';

import { useSessionStorageJson } from '@/src/hooks/useSessionStorageJson';
import type { StoredRentalContext } from '../types';

const STORAGE_KEY = 'rental-create-unit';

export function useRentalCreateContext() {
  const { value: rentalContext, isHydrated } =
    useSessionStorageJson<StoredRentalContext>(STORAGE_KEY);

  const clearContext = () => {
    sessionStorage.removeItem(STORAGE_KEY);
  };

  return {
    rentalContext,
    isHydrated,
    clearContext,
  };
}
