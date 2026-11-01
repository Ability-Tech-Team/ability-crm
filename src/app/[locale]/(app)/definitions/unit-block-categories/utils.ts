import type {
  UnitBlockCategoryOption,
  UnitBlockCategoryPayload,
} from './types';

export function buildUnitBlockCategoryPayload(
  values: Record<string, string>,
): UnitBlockCategoryPayload {
  return {
    en_name: values.en_name,
    ar_name: values.ar_name,
  };
}

export function getUnitBlockCategoryInitialValues(
  editTarget: UnitBlockCategoryOption | null,
) {
  if (!editTarget) {
    return undefined;
  }

  return {
    en_name: editTarget.en_name ?? editTarget.name,
    ar_name: editTarget.ar_name ?? editTarget.name,
  };
}
