import type { AccessibleProject } from '@/src/services/projects';
import { useProjectScopeStore } from '@/src/store/useProjectScopeStore';

/**
 * The Super Admin's working project (the user's decision, 2026-11-25). The
 * header's picker sets it; every call whose route takes a `project_id` sends
 * it, and each screen's Project filter starts at it. The units routes require
 * it from the Super Admin (`writeProjectId`/`readProjectIds` in
 * ability-crm-api). Everyone else has no scope and sends no `project_id`.
 *
 * The choice lasts as long as the browser tab, in `sessionStorage` under the
 * employee's id, and logout clears it. It is a preference, not an access
 * decision: the API checks the project on every call.
 */

export const PROJECT_SCOPE_STORAGE_PREFIX = 'crm-project-scope:';

type KeyedStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export function projectScopeStorageKey(employeeId: string): string {
  return `${PROJECT_SCOPE_STORAGE_PREFIX}${employeeId}`;
}

export function readStoredProjectScope(
  storage: KeyedStorage | null,
  employeeId: string,
): number | null {
  try {
    const value = Number(storage?.getItem(projectScopeStorageKey(employeeId)));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

export function storeProjectScope(
  storage: KeyedStorage | null,
  employeeId: string,
  projectId: number,
): void {
  try {
    storage?.setItem(projectScopeStorageKey(employeeId), String(projectId));
  } catch {
    // Blocked storage: the choice lasts until the page reloads.
  }
}

/** Removes every employee's choice, for logout. */
export function clearProjectScopes(storage: KeyedStorage): void {
  const keys: string[] = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(PROJECT_SCOPE_STORAGE_PREFIX)) keys.push(key);
  }
  keys.forEach((key) => storage.removeItem(key));
}

/**
 * The project to work in: the stored choice while it is still an active
 * project, else the sign-in project, else the first active project. With no
 * list (it couldn't load), the sign-in project.
 */
export function pickScopeProject(
  projects: readonly AccessibleProject[],
  storedProjectId: number | null,
  signInProjectId: number | null,
): number | null {
  const active = projects.filter((project) => project.active);
  const isActive = (id: number | null) =>
    id !== null && active.some((project) => project.id === id);

  if (isActive(storedProjectId)) return storedProjectId;
  if (isActive(signInProjectId) || !active.length) return signInProjectId;
  return active[0].id;
}

/** The Super Admin's working project, or undefined for everyone else. */
export function scopedProjectId(): number | undefined {
  return useProjectScopeStore.getState().projectId ?? undefined;
}

/**
 * `{ project_id }` for a call whose route takes one: the caller's project
 * when given (as before, for everyone), else the scope. Without either it is
 * empty, so a call made for anyone but the Super Admin is unchanged.
 */
export function projectScopeParam(
  projectId?: number | string | null,
): { project_id?: number } {
  const explicit = Number(projectId);
  if (projectId !== undefined && projectId !== null && projectId !== '') {
    if (Number.isInteger(explicit) && explicit > 0) return { project_id: explicit };
  }
  const scope = scopedProjectId();
  return scope === undefined ? {} : { project_id: scope };
}

/**
 * Reloads the Super Admin's project list after projects change (the
 * Projects definition), keeping the working project while it stays active.
 */
export async function refreshProjectScope(
  loadProjects: () => Promise<AccessibleProject[]>,
): Promise<void> {
  const { projectId, setScope } = useProjectScopeStore.getState();
  if (projectId === null) return;
  try {
    const active = (await loadProjects()).filter((project) => project.active);
    setScope(active, pickScopeProject(active, projectId, projectId));
  } catch {
    // The header keeps the list it has.
  }
}
