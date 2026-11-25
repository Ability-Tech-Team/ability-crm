import type { FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import { scopedProjectId } from '@/src/lib/projectScope';

/**
 * The Project filter the Super Admin gets on the list screens whose API takes
 * a `project_id` (the user's decision, 2026-11-25). It starts at the project
 * chosen in the header; an emptied filter falls back to it
 * (`projectScopeParam`), so a list never mixes projects. Other employees
 * don't see it and send no project.
 */
export const PROJECT_FILTER_NAME = 'project_id';

export function projectFilterField(
  label: string,
  options: SelectOption[],
): FieldConfig {
  return {
    name: PROJECT_FILTER_NAME,
    label,
    placeholder: label,
    fieldType: 'select',
    options,
  };
}

/**
 * The project a search sends: the filter's choice, else the header's project.
 * Undefined for everyone but the Super Admin, so their searches are unchanged.
 * Exports reuse the search's params, so they carry it too.
 */
export function projectFilterParam(value: string | undefined): number | undefined {
  const id = Number(value);
  if (Number.isInteger(id) && id > 0) return id;
  return scopedProjectId();
}
