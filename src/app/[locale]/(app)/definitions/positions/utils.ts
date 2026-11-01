import type { PositionOption, PositionPayload } from './types';

export function buildPositionPayload(
  values: Record<string, string>,
): PositionPayload {
  return {
    en_name: values.en_name,
    ar_name: values.ar_name,
  };
}

export function getPositionInitialValues(editTarget: PositionOption | null) {
  if (!editTarget) {
    return undefined;
  }

  return {
    en_name: editTarget.en_name ?? editTarget.name,
    ar_name: editTarget.ar_name ?? editTarget.name,
  };
}
