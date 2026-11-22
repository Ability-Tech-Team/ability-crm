import type { AddRelativeDto } from '@/src/services/customers';
import { optionalId, optionalText } from '../_shared/utils';
import type { RelativeEntryValues } from './schema';

export const RELATIVE_ENTRY_INITIAL_VALUES: RelativeEntryValues = {
  owner_id_number: '',
  unit_number: '',
  sub_project_code: '',
  relative_name: '',
  id_type: '',
  relative_id_number: '',
  is_male: '',
  relation: '',
  mobile_number: '',
  email: '',
};

/** The add body for the owner and unit found; blank optional fields are left out. */
export function buildRelativePayload(
  values: RelativeEntryValues,
  ownerId: number,
  unitId: number,
): AddRelativeDto {
  const payload: AddRelativeDto = {
    owner_id: ownerId,
    unit_id: unitId,
    relative_name: values.relative_name.trim(),
    relative_id_number: values.relative_id_number.trim().toUpperCase(),
  };
  const idType = optionalId(values.id_type);
  if (idType) payload.id_type = idType;
  if (values.is_male === '1' || values.is_male === '0') {
    payload.is_male = Number(values.is_male);
  }
  const relation = optionalText(values.relation);
  if (relation) payload.relation = relation;
  const mobile = optionalText(values.mobile_number);
  if (mobile) payload.mobile_number = mobile;
  const email = optionalText(values.email);
  if (email) payload.email = email;
  return payload;
}
