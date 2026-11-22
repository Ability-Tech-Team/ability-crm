import type {
  AssignUnitToCustomerDto,
  CreateCustomerDto,
} from '@/src/services/customers';
import {
  OWNER_TYPE_OWNER,
  OWNERSHIP_OWNER,
  optionalId,
  optionalText,
  todayIsoDate,
} from '../_shared/utils';
import type { CustomerEntryValues } from './schema';

export function customerEntryInitialValues(
  now: Date = new Date(),
): CustomerEntryValues {
  return {
    customer_name: '',
    id_type: '',
    id_number: '',
    country_id: '',
    marital_status_id: '',
    religion_id: '',
    customer_type_id: '',
    mobile_number: '',
    email: '',
    customer_code: '',
    unit_number: '',
    sub_project_code: '',
    ownership_id: '',
    owner_type_id: '',
    contract_number: '',
    start_date: todayIsoDate(now),
    sign_date: '',
    end_date: '',
  };
}

/** The create body; blank optional fields are left out. */
export function buildCustomerPayload(
  values: CustomerEntryValues,
): CreateCustomerDto {
  const payload: CreateCustomerDto = {
    customer_name: values.customer_name.trim(),
    id_type: Number(values.id_type),
    id_number: values.id_number.trim().toUpperCase(),
    country_id: Number(values.country_id),
    marital_status_id: Number(values.marital_status_id),
    religion_id: Number(values.religion_id),
    customer_type_id: Number(values.customer_type_id),
  };
  const mobile = optionalText(values.mobile_number);
  if (mobile) payload.mobile_number = mobile;
  const email = optionalText(values.email);
  if (email) payload.email = email;
  const code = optionalText(values.customer_code);
  if (code) payload.customer_code = code;
  return payload;
}

/**
 * The link body. The sign date defaults to the start date, as in the
 * customers sheet; a blank contract number is sent empty, which the API
 * accepts.
 */
export function buildAssignPayload(
  values: CustomerEntryValues,
  customerId: number,
  unit: { id: number; unit_number: string },
): AssignUnitToCustomerDto {
  const payload: AssignUnitToCustomerDto = {
    customer_id: customerId,
    unit_id: unit.id,
    unit_number: unit.unit_number,
    ownership_id: Number(values.ownership_id),
    start_date: values.start_date,
    sign_date: optionalText(values.sign_date) ?? values.start_date,
    contract_number: optionalText(values.contract_number) ?? '',
    is_active: 1,
  };
  const endDate = optionalText(values.end_date);
  if (endDate) payload.end_date = endDate;
  return payload;
}

/**
 * The owner type to set after linking, or null. An owner's link starts as
 * Owner, so only another owner type needs the second call.
 */
export function ownerTypeToSet(values: CustomerEntryValues): number | null {
  if (Number(values.ownership_id) !== OWNERSHIP_OWNER) return null;
  const ownerType = optionalId(values.owner_type_id);
  return ownerType && ownerType !== OWNER_TYPE_OWNER ? ownerType : null;
}
