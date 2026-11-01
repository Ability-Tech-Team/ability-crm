import { describe, expect, it } from 'vitest';
import type { CustomerUnit, OwnershipHistory } from '@/src/services/units';
import {
  buildOwnershipUpdatePayload,
  getOwnershipInitialValues,
  ownershipTargetFromCustomerUnit,
  ownershipTargetFromHistory,
  toDateInput,
} from './utils';

const owner = {
  customer_id: 5,
  customer_name: 'Owner',
  customer_unit_id: 41,
  contract_number: 'C-1',
  fm_contract_number: null,
  owner_type_id: 1,
  owner_type_name: 'Owner',
  start_date: '2024-01-01T00:00:00.000Z',
  sign_date: '2024-01-02',
  end_date: null,
} as unknown as CustomerUnit;

const renter = {
  ...owner,
  customer_unit_id: 42,
  owner_type_id: null,
  owner_type_name: null,
} as unknown as CustomerUnit;

const ended = {
  id: '77',
  customer_name: 'Former owner',
  contract: 'C-0',
  sign_date: '2020-05-01',
  end_date: '2023-12-31',
  is_active: 0,
} as unknown as OwnershipHistory;

describe('toDateInput', () => {
  it('keeps the date part', () => {
    expect(toDateInput('2024-01-01T00:00:00.000Z')).toBe('2024-01-01');
    expect(toDateInput('2024-01-01')).toBe('2024-01-01');
    expect(toDateInput(null)).toBe('');
    expect(toDateInput('01/02/2024')).toBe('');
  });
});

describe('ownership targets', () => {
  it('uses customer_unit_id for a current row and the history id for an ended one', () => {
    expect(ownershipTargetFromCustomerUnit(owner)).toMatchObject({
      id: 41,
      isEnded: false,
      hasOwnerType: true,
    });
    expect(ownershipTargetFromCustomerUnit(renter)?.hasOwnerType).toBe(false);
    expect(ownershipTargetFromHistory(ended)).toMatchObject({
      id: 77,
      isEnded: true,
      hasOwnerType: false,
    });
  });

  it('has no target without an ownership row id', () => {
    expect(
      ownershipTargetFromCustomerUnit({
        ...owner,
        customer_unit_id: null,
      } as CustomerUnit),
    ).toBeNull();
  });
});

describe('buildOwnershipUpdatePayload', () => {
  const target = ownershipTargetFromCustomerUnit(owner)!;
  const initial = getOwnershipInitialValues(target);

  it('sends only the changed fields', () => {
    expect(buildOwnershipUpdatePayload(initial, target)).toEqual({});
    expect(
      buildOwnershipUpdatePayload(
        { ...initial, contract_number: ' C-2 ', sign_date: '2024-02-01' },
        target,
      ),
    ).toEqual({ contract_number: 'C-2', sign_date: '2024-02-01' });
  });

  it('sends the owner type only for an owner', () => {
    expect(
      buildOwnershipUpdatePayload({ ...initial, owner_type_id: '3' }, target),
    ).toEqual({ owner_type_id: 3 });

    const renterTarget = ownershipTargetFromCustomerUnit(renter)!;
    expect(
      buildOwnershipUpdatePayload(
        { ...getOwnershipInitialValues(renterTarget), owner_type_id: '3' },
        renterTarget,
      ),
    ).toEqual({});
  });

  it('corrects the end date only on an ended ownership', () => {
    expect(
      buildOwnershipUpdatePayload({ ...initial, end_date: '2025-01-01' }, target),
    ).toEqual({});

    const endedTarget = ownershipTargetFromHistory(ended)!;
    expect(
      buildOwnershipUpdatePayload(
        { ...getOwnershipInitialValues(endedTarget), end_date: '2024-01-15' },
        endedTarget,
      ),
    ).toEqual({ end_date: '2024-01-15' });
  });
});
