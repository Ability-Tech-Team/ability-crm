import type { CreateProjectDto, UpdateProjectDto } from '@/src/services/projects';
import type { ProjectDefinition, ProjectPayload } from './types';

/** `CreateCompanyProjectDto`: both codes are at most 10 characters. */
export const PROJECT_CODE_MAX_LENGTH = 10;
export const PROJECT_NAME_MAX_LENGTH = 100;

/** The form's values; the project code only when adding, since it can't change. */
export function buildProjectPayload(
  values: Record<string, string>,
  editTarget: ProjectDefinition | null,
): ProjectPayload {
  return {
    en_name: (values.en_name ?? '').trim(),
    ar_name: (values.ar_name ?? '').trim(),
    company_code: (values.company_code ?? '').trim(),
    ...(editTarget ? {} : { project_code: (values.project_code ?? '').trim() }),
  };
}

export function toCreateProjectDto(payload: ProjectPayload): CreateProjectDto {
  return {
    en_name: payload.en_name,
    ar_name: payload.ar_name,
    company_code: payload.company_code,
    project_code: payload.project_code ?? '',
    ...(payload.is_active !== undefined ? { is_active: payload.is_active } : {}),
  };
}

/** The update body (`UpdateCompanyProjectDto`), which can't carry the project code. */
export function toUpdateProjectDto(
  payload: Partial<ProjectPayload>,
): UpdateProjectDto {
  const { project_code: _projectCode, ...rest } = payload;
  void _projectCode;
  return rest;
}

export function getProjectInitialValues(
  editTarget: ProjectDefinition | null,
): Record<string, string> {
  if (!editTarget) {
    return { en_name: '', ar_name: '', company_code: '', project_code: '' };
  }

  return {
    en_name: editTarget.en_name,
    ar_name: editTarget.ar_name,
    company_code: editTarget.company_code,
    project_code: editTarget.project_code,
  };
}
