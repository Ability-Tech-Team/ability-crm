import type { LocationDropdownOption } from '@/src/types/dropdowns';
import type { FlatLocationRow, LocationPayload } from './types';

export function flattenLocationRows(
  locations: LocationDropdownOption[],
  expanded: Set<number>,
): FlatLocationRow[] {
  const rows: FlatLocationRow[] = [];

  for (const root of locations) {
    rows.push({ ...root, _isChild: false, _parentId: null });

    if (expanded.has(root.id) && root.children?.length) {
      for (const child of root.children) {
        rows.push({ ...child, _isChild: true, _parentId: root.id });
      }
    }
  }

  return rows;
}

export function buildLocationPayload(
  values: Record<string, string>,
): LocationPayload {
  return {
    en_name: values.en_name,
    ar_name: values.ar_name,
    ...(values.location_type_id
      ? { location_type_id: Number(values.location_type_id) }
      : {}),
    ...(values.location_code ? { location_code: values.location_code } : {}),
    ...(values.is_active ? { is_active: Number(values.is_active) } : {}),
  };
}

export function getLocationInitialValues(
  editTarget: LocationDropdownOption | null,
): Record<string, string> {
  if (!editTarget) {
    return {
      en_name: '',
      ar_name: '',
      location_type_id: '',
      location_code: '',
      is_active: '1',
    };
  }

  return {
    en_name: editTarget.en_name ?? editTarget.name,
    ar_name: editTarget.ar_name ?? editTarget.name,
    location_type_id: editTarget.location_type_id
      ? String(editTarget.location_type_id)
      : '',
    location_code: editTarget.location_code ?? '',
    is_active: String(editTarget.is_active ?? 1),
  };
}
