'use client';

import { useCallback } from 'react';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { refreshProjectScope } from '@/src/lib/projectScope';
import {
  createProject,
  getProjects,
  getWorkingProjects,
  updateProject,
} from '@/src/services/projects';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import type { ProjectDefinition, ProjectPayload } from '../types';
import {
  buildProjectPayload,
  toCreateProjectDto,
  toUpdateProjectDto,
} from '../utils';

// Module-level adapters, so the shared hook's loaders stay the same between renders.
const getAllProjects = (signal?: AbortSignal) => getProjects({}, signal);
const searchProjects = ({ name }: { name?: string }, signal?: AbortSignal) =>
  getProjects({ search: name }, signal);
const createProjectItem = (payload: ProjectPayload) =>
  createProject(toCreateProjectDto(payload));
const updateProjectItem = (id: number, payload: Partial<ProjectPayload>) =>
  updateProject(id, toUpdateProjectDto(payload));

/**
 * The Projects definition (Super Admin only): `GET /projects`, create, edit,
 * and turning a project on or off. Projects can't be deleted. After a change
 * the header's project list and the dropdowns are reloaded.
 */
export function useProjectsPage() {
  const { refreshDropdowns } = useDropdowns();

  const afterMutation = useCallback(async () => {
    await Promise.all([
      refreshDropdowns(),
      refreshProjectScope(getWorkingProjects),
    ]);
  }, [refreshDropdowns]);

  return useDefinitionCrudPage<ProjectDefinition, ProjectPayload>({
    getAll: getAllProjects,
    search: searchProjects,
    createItem: createProjectItem,
    updateItem: updateProjectItem,
    buildPayload: buildProjectPayload,
    afterMutation,
  });
}
