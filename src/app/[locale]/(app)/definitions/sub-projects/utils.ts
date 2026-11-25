import type {
  CreateSubProjectDto,
  UpdateSubProjectDto,
} from '@/src/services/projects';
import type { SubProjectDefinition, SubProjectPayload } from './types';

/** `CreateSubProjectDto`: the code is at most 50 characters, the names 100. */
export const SUB_PROJECT_CODE_MAX_LENGTH = 50;
export const SUB_PROJECT_NAME_MAX_LENGTH = 100;

/** The form's values; the project only when adding, since a sub-project can't move. */
export function buildSubProjectPayload(
  values: Record<string, string>,
  editTarget: SubProjectDefinition | null,
): SubProjectPayload {
  const projectId = Number(values.project_id);
  return {
    project_code: (values.project_code ?? '').trim(),
    en_name: (values.en_name ?? '').trim(),
    ar_name: (values.ar_name ?? '').trim(),
    ...(!editTarget && Number.isInteger(projectId) && projectId > 0
      ? { project_id: projectId }
      : {}),
  };
}

export function toCreateSubProjectDto(
  payload: SubProjectPayload,
  fallbackProjectId: number,
): CreateSubProjectDto {
  return {
    project_id: payload.project_id ?? fallbackProjectId,
    project_code: payload.project_code,
    en_name: payload.en_name,
    ar_name: payload.ar_name,
    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
  };
}

/** The update body (`UpdateSubProjectDto`), which can't carry the project. */
export function toUpdateSubProjectDto(
  payload: Partial<SubProjectPayload>,
): UpdateSubProjectDto {
  const { project_id: _projectId, ...rest } = payload;
  void _projectId;
  return rest;
}

export function getSubProjectInitialValues(
  editTarget: SubProjectDefinition | null,
  projectId: number | null,
): Record<string, string> {
  if (!editTarget) {
    return {
      project_id: projectId === null ? '' : String(projectId),
      project_code: '',
      en_name: '',
      ar_name: '',
    };
  }

  return {
    project_id: String(editTarget.project_id),
    project_code: editTarget.project_code,
    en_name: editTarget.en_name ?? '',
    ar_name: editTarget.ar_name ?? '',
  };
}

/** The search runs on the loaded list: the API filters sub-projects by exact code only. */
export function matchesSubProjectSearch(
  row: SubProjectDefinition,
  query: string,
): boolean {
  const term = query.trim().toLowerCase();
  if (!term) return true;
  return [row.project_code, row.name, row.en_name, row.ar_name].some((value) =>
    value?.toLowerCase().includes(term),
  );
}
