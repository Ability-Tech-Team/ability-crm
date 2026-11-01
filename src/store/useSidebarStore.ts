import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  isCollapsed: boolean;
  menuVersion: number;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
  refreshSidebarMenu: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set) => ({
      isCollapsed: true,
      menuVersion: 0,
      toggle: () => set((state) => ({ isCollapsed: !state.isCollapsed })),
      expand: () => set({ isCollapsed: false }),
      collapse: () => set({ isCollapsed: true }),
      refreshSidebarMenu: () =>
        set((state) => ({ menuVersion: state.menuVersion + 1 })),
    }),
    {
      name: 'sidebar-storage-key',
      partialize: (state) => ({ isCollapsed: state.isCollapsed }),
    },
  ),
);
