import { projectFilterParam } from '@/src/lib/projectFilter';
import type { HistoryFormData, HistorySearchParams } from './types';

/**
 * Turns the form's strings into the request's numbers. `is_active` cannot use
 * a truthy check: `0` means "inactive", not "no filter".
 */
export function buildHistoryParams(
  data: HistoryFormData,
  isLegal: number,
): HistorySearchParams {
  return {
    // The filter's project, else the Super Admin's (src/lib/projectFilter.ts).
    project_id: projectFilterParam(data.project_id),
    unit_id: data.unit_id ? Number(data.unit_id) : undefined,
    unit_number: data.unit_number || undefined,
    is_active: data.is_active !== '' ? Number(data.is_active) : undefined,
    from_date: data.from_date || undefined,
    to_date: data.to_date || undefined,
    is_exact: data.is_exact === '1' ? 1 : undefined,
    // Comes from the active tab, not from a filter field.
    is_legal: isLegal,
  };
}

/**
 * Seeds the filters from the link that opened this page; the Super Admin's
 * Project filter starts at the header's project.
 */
export function getHistoryInitialValues(params: URLSearchParams, projectId = '') {
  return {
    project_id: params.get('project_id') ?? projectId,
    unit_id: params.get('unit_id') ?? '',
    unit_number: params.get('unit_number') ?? '',
    is_active: '',
    from_date: '',
    to_date: '',
    is_exact: '1',
  };
}
