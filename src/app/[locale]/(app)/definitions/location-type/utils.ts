import type { LocationTypeOption, LocationTypePayload } from './types';

export function buildLocationTypePayload(
  values: Record<string, string>,
): LocationTypePayload {
  return {
    en_name: values.en_name,
    ar_name: values.ar_name,
    ...(values.is_active ? { is_active: Number(values.is_active) } : {}),
  };
}

export function getLocationTypeInitialValues(
  editTarget: LocationTypeOption | null,
): Record<string, string> {
  if (!editTarget) {
    return {
      en_name: '',
      ar_name: '',
      is_active: '1',
    };
  }

  return {
    en_name: editTarget.en_name ?? editTarget.name,
    ar_name: editTarget.ar_name ?? editTarget.name,
    is_active: String(editTarget.is_active ?? 1),
  };
}
