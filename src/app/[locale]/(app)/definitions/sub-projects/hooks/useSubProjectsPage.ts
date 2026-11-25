'use client';

import { useCallback, useState } from 'react';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import {
  createSubProject,
  deleteSubProject,
  getSubProjects,
  updateSubProject,
} from '@/src/services/projects';
import { useProjectScopeStore } from '@/src/store/useProjectScopeStore';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import type { SubProjectDefinition, SubProjectPayload } from '../types';
import {
  buildSubProjectPayload,
  matchesSubProjectSearch,
  toCreateSubProjectDto,
  toUpdateSubProjectDto,
} from '../utils';

const updateSubProjectItem = (
  id: number,
  payload: Partial<SubProjectPayload>,
) => updateSubProject(id, toUpdateSubProjectDto(payload));

/**
 * The Sub-projects definition (Super Admin only): one project's sub-projects
 * (`GET /sub-projects?project_id=`), starting at the project the Super Admin
 * works in, with create, edit, on/off, and delete. The API refuses turning
 * off or deleting the default sub-project, and deleting one that holds units
 * or customers.
 */
export function useSubProjectsPage() {
  const { refreshDropdowns } = useDropdowns();
  const scopeProjectId = useProjectScopeStore((s) => s.projectId);
  const projects = useProjectScopeStore((s) => s.projects);
  const [projectId, setProjectId] = useState<number | null>(
    scopeProjectId ?? projects[0]?.id ?? null,
  );

  const getAll = useCallback(
    (signal?: AbortSignal) =>
      projectId === null
        ? Promise.resolve([])
        : getSubProjects({ project_id: projectId }, signal),
    [projectId],
  );

  const search = useCallback(
    async ({ name }: { name?: string }, signal?: AbortSignal) =>
      (await getAll(signal)).filter((row) =>
        matchesSubProjectSearch(row, name ?? ''),
      ),
    [getAll],
  );

  const createItem = useCallback(
    async (payload: SubProjectPayload) => {
      const target = payload.project_id ?? projectId;
      if (target === null) return;
      await createSubProject(toCreateSubProjectDto(payload, target));
    },
    [projectId],
  );

  const afterMutation = useCallback(async () => {
    await refreshDropdowns();
  }, [refreshDropdowns]);

  const crud = useDefinitionCrudPage<SubProjectDefinition, SubProjectPayload>({
    getAll,
    search,
    createItem,
    updateItem: updateSubProjectItem,
    deleteItem: deleteSubProject,
    buildPayload: buildSubProjectPayload,
    afterMutation,
  });

  return { ...crud, projects, projectId, setProjectId };
}
