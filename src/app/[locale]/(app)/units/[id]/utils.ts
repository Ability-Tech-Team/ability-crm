import type { UpdateOwnershipDto } from '@/src/services/customers';
import type { CustomerUnit, OwnershipHistory } from '@/src/services/units';

/** An ownership row as the edit form sees it, current or ended. */
export type OwnershipEditTarget = {
  /** `customer_unit_id` for a current row, `ownership_history[].id` for an ended one. */
  id: number;
  customerName: string;
  contractNumber: string | null;
  fmContractNumber: string | null;
  ownerTypeId: number | null;
  startDate: string | null;
  signDate: string | null;
  endDate: string | null;
  /** Only an ended ownership's end date can be corrected. */
  isEnded: boolean;
  /** Only an owner ownership takes an owner type. */
  hasOwnerType: boolean;
};

const DATE_PREFIX = /^(\d{4}-\d{2}-\d{2})/;

/** A `YYYY-MM-DD` value for a date input, from an API date or timestamp. */
export function toDateInput(value: string | null | undefined): string {
  return value ? (DATE_PREFIX.exec(value)?.[1] ?? '') : '';
}

export function toPositiveInt(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function ownershipTargetFromCustomerUnit(
  row: CustomerUnit,
): OwnershipEditTarget | null {
  const id = toPositiveInt(row.customer_unit_id);

  if (id === null) return null;

  return {
    id,
    customerName: row.customer_name,
    contractNumber: row.contract_number ?? null,
    fmContractNumber: row.fm_contract_number ?? null,
    ownerTypeId: row.owner_type_id ?? null,
    startDate: row.start_date ?? null,
    signDate: row.sign_date ?? null,
    endDate: row.end_date ?? null,
    isEnded: false,
    hasOwnerType: row.owner_type_id != null || Boolean(row.owner_type_name),
  };
}

export function ownershipTargetFromHistory(
  row: OwnershipHistory,
): OwnershipEditTarget | null {
  const id = toPositiveInt(row.id);

  if (id === null) return null;

  return {
    id,
    customerName: row.customer_name,
    contractNumber: row.contract ?? null,
    fmContractNumber: null,
    ownerTypeId: null,
    startDate: null,
    signDate: row.sign_date ?? null,
    endDate: row.end_date ?? null,
    isEnded: row.is_active !== 1 || Boolean(row.end_date),
    hasOwnerType: false,
  };
}

export function getOwnershipInitialValues(
  target: OwnershipEditTarget,
): Record<string, string> {
  return {
    contract_number: target.contractNumber ?? '',
    fm_contract_number: target.fmContractNumber ?? '',
    owner_type_id: target.ownerTypeId ? String(target.ownerTypeId) : '',
    start_date: toDateInput(target.startDate),
    sign_date: toDateInput(target.signDate),
    end_date: toDateInput(target.endDate),
  };
}

/**
 * Only the fields that changed. The backend rejects an owner type on a
 * non-owner ownership and an end date on an open one, so those fields are
 * only sent where they apply. An empty result means there is nothing to save.
 */
export function buildOwnershipUpdatePayload(
  values: Record<string, string>,
  target: OwnershipEditTarget,
): UpdateOwnershipDto {
  const initial = getOwnershipInitialValues(target);
  const changed = (name: string) =>
    (values[name] ?? '').trim() !== '' &&
    (values[name] ?? '').trim() !== initial[name];
  const payload: UpdateOwnershipDto = {};

  if (changed('contract_number')) {
    payload.contract_number = values.contract_number.trim();
  }
  if (changed('fm_contract_number')) {
    payload.fm_contract_number = values.fm_contract_number.trim();
  }
  if (target.hasOwnerType && changed('owner_type_id')) {
    const ownerTypeId = toPositiveInt(values.owner_type_id);
    if (ownerTypeId !== null) payload.owner_type_id = ownerTypeId;
  }
  if (changed('start_date')) payload.start_date = values.start_date;
  if (changed('sign_date')) payload.sign_date = values.sign_date;
  if (target.isEnded && changed('end_date')) payload.end_date = values.end_date;

  return payload;
}
