import type { DepartmentOption, DepartmentPayload } from './types';

export function buildDepartmentPayload(
  values: Record<string, string>,
): DepartmentPayload {
  return {
    en_name: values.en_name,
    ar_name: values.ar_name,
    show_in_mobile: Number(values.show_in_mobile || '0'),
    ...(values.is_active ? { is_active: Number(values.is_active) } : {}),
  };
}

export function getDepartmentInitialValues(
  editTarget: DepartmentOption | null,
): Record<string, string> {
  if (!editTarget) {
    return {
      en_name: '',
      ar_name: '',
      show_in_mobile: '0',
      is_active: '1',
    };
  }

  return {
    en_name: editTarget.en_name ?? editTarget.name,
    ar_name: editTarget.ar_name ?? editTarget.name,
    show_in_mobile: String(editTarget.show_in_mobile ?? 0),
    is_active: String(editTarget.is_active ?? 1),
  };
}
