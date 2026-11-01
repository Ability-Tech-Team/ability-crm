import type { ErpCodeOption, ErpCodePayload } from './types';
import type { UpdateErpAccountCodeDto } from '@/src/services/erpAccountCodes';

export function buildErpCodePayload(
  values: Record<string, string>,
): ErpCodePayload {
  return {
    code: values.code,
    name: values.name,
  };
}

/** Only the fields that changed; the update route accepts `code` and `name`. */
export function buildErpCodeUpdatePayload(
  values: Record<string, string>,
  editTarget: ErpCodeOption,
): UpdateErpAccountCodeDto {
  const payload: UpdateErpAccountCodeDto = {};
  if (values.code !== (editTarget.code ?? '')) {
    payload.code = values.code;
  }
  if (values.name !== (editTarget.name ?? '')) {
    payload.name = values.name;
  }
  return payload;
}

export function getErpCodeInitialValues(editTarget: ErpCodeOption | null) {
  if (!editTarget) {
    return undefined;
  }

  return {
    code: editTarget.code ?? '',
    name: editTarget.name ?? '',
  };
}
