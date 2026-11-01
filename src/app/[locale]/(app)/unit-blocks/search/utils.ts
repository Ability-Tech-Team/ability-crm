import type { SearchFormData, SearchParams } from './types';

/**
 * Turns the form's strings into the request's numbers. `is_active`,
 * `is_legal` and `block_kind` cannot use a truthy check: `0` is a real value
 * for each of them, not "no filter".
 */
export function buildSearchParams(
  data: SearchFormData,
  isLegal: number | undefined,
): SearchParams {
  return {
    unit_id: data.unit_id ? Number(data.unit_id) : undefined,
    unit_number: data.unit_number || undefined,
    is_exact: data.is_exact === '1' ? 1 : undefined,
    category_id: data.category_id ? Number(data.category_id) : undefined,
    project_id: data.project_id ? Number(data.project_id) : undefined,
    customer_name: data.customer_name || undefined,
    customer_mobile: data.customer_mobile || undefined,
    assign_to_id: data.assign_to_id || undefined,
    is_active:
      data.is_active !== '' && data.is_active !== undefined
        ? Number(data.is_active)
        : undefined,
    block_kind:
      data.block_kind !== '' && data.block_kind !== undefined
        ? Number(data.block_kind)
        : undefined,
    from_date: data.from_date || undefined,
    to_date: data.to_date || undefined,
    // Comes from the active tab, not from a filter field.
    is_legal: isLegal,
  };
}

/** The blank filters a tab opens with; only the Status default differs. */
export function getSearchInitialValues(defaultIsActive: string) {
  return {
    unit_id: '',
    unit_number: '',
    is_exact: '1',
    category_id: '',
    project_id: '',
    customer_name: '',
    customer_mobile: '',
    assign_to_id: '',
    is_active: defaultIsActive,
    block_kind: '',
    from_date: '',
    to_date: '',
  };
}
