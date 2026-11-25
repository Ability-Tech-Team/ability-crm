import { create } from 'zustand';
import type { AccessibleProject } from '@/src/services/projects';

/**
 * The project the Super Admin works in, picked in the header
 * (`src/lib/projectScope.ts`). Empty for everyone else, who work in their
 * sign-in project and never send a `project_id`.
 */
type ProjectScopeState = {
  /** The chosen project; null for everyone but the Super Admin. */
  projectId: number | null;
  /** The active projects the Super Admin can pick. */
  projects: AccessibleProject[];
  setScope: (projects: AccessibleProject[], projectId: number | null) => void;
  setProjectId: (projectId: number) => void;
};

export const useProjectScopeStore = create<ProjectScopeState>((set) => ({
  projectId: null,
  projects: [],
  setScope: (projects, projectId) => set({ projects, projectId }),
  setProjectId: (projectId) => set({ projectId }),
}));
