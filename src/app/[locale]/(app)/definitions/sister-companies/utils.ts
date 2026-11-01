import type { SisterCompanyOption, SisterCompanyPayload } from './types';

export function buildSisterCompanyPayload(
  values: Record<string, string>,
): SisterCompanyPayload {
  return {
    en_name: values.en_name,
    ar_name: values.ar_name,
  };
}

export function getSisterCompanyInitialValues(
  editTarget: SisterCompanyOption | null,
) {
  if (!editTarget) {
    return undefined;
  }

  return {
    en_name: editTarget.en_name ?? editTarget.name,
    ar_name: editTarget.ar_name ?? editTarget.name,
  };
}
