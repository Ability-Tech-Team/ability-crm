import { create } from 'zustand';
import type {
  RoleMenu,
  RolePrivilegesResponse,
} from '@/src/types/rolePrivileges';
import {
  buildCurrentUserPrivilegeIndexes,
  type CurrentUserPrivilegeIndexes,
} from '@/src/lib/currentUserPrivileges';

interface CurrentUserPrivilegesState extends CurrentUserPrivilegeIndexes {
  data: RolePrivilegesResponse | null;
  isLoading: boolean;
  error: Error | null;
  setData: (data: RolePrivilegesResponse) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  reset: () => void;
}

function createEmptyIndexes(): CurrentUserPrivilegeIndexes {
  return buildCurrentUserPrivilegeIndexes([] as RoleMenu[]);
}

export const useCurrentUserPrivilegesStore = create<CurrentUserPrivilegesState>(
  (set) => ({
    data: null,
    isLoading: false,
    error: null,
    ...createEmptyIndexes(),
    setData: (data) =>
      set({
        data,
        isLoading: false,
        error: null,
        ...buildCurrentUserPrivilegeIndexes(data.result ?? []),
      }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error, isLoading: false }),
    reset: () =>
      set({
        data: null,
        isLoading: false,
        error: null,
        ...createEmptyIndexes(),
      }),
  }),
);
