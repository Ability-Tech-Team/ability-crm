import type { GetUnitsParams } from '@/src/services/units';
import type { UnitSearchFormData } from './types';

/** The blank filters this page opens with; Exact Match is on by default. */
export const UNIT_SEARCH_INITIAL_VALUES: UnitSearchFormData = {
  unit_number: '',
  unit_id: '',
  is_exact: '1',
};

export function buildUnitSearchParams(
  data: UnitSearchFormData,
): GetUnitsParams {
  return {
    unit_number: data.unit_number || undefined,
    unit_id: data.unit_id ? Number(data.unit_id) : undefined,
    is_exact: data.is_exact === '1',
    // Returns every unit in the app, with a contract or without.
    all_units: 1,
  };
}
