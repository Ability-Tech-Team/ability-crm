import { describe, expect, it } from 'vitest';
import { createCustomerEntrySchema } from './schema';
import {
  buildAssignPayload,
  buildCustomerPayload,
  customerEntryInitialValues,
  ownerTypeToSet,
} from './utils';

const t = (key: string) => key;
const filled = {
  ...customerEntryInitialValues(new Date(2026, 10, 22)),
  customer_name: ' Sara Adel ',
  id_type: '2',
  id_number: '29801011234567',
  country_id: '1',
  marital_status_id: '1',
  religion_id: '1',
  customer_type_id: '1',
  unit_number: 'A-101',
  ownership_id: '1',
};

describe('the manual customer payloads', () => {
  it('starts the link today', () => {
    expect(customerEntryInitialValues(new Date(2026, 10, 22)).start_date).toBe('2026-11-22');
  });

  it('sends the customer without blank optional fields', () => {
    expect(buildCustomerPayload({ ...filled, id_number: ' a1234567 ', email: ' ' })).toEqual({
      customer_name: 'Sara Adel',
      id_type: 2,
      id_number: 'A1234567',
      country_id: 1,
      marital_status_id: 1,
      religion_id: 1,
      customer_type_id: 1,
    });
  });

  it('signs on the start date and sends a blank contract empty, as the sheet does', () => {
    expect(buildAssignPayload(filled, 5, { id: 9, unit_number: 'A-101' })).toEqual({
      customer_id: 5,
      unit_id: 9,
      unit_number: 'A-101',
      ownership_id: 1,
      start_date: '2026-11-22',
      sign_date: '2026-11-22',
      contract_number: '',
      is_active: 1,
    });
  });

  it('keeps a sign date, contract, and end date that are filled', () => {
    const payload = buildAssignPayload(
      { ...filled, sign_date: '2026-11-01', contract_number: ' C-7 ', end_date: '2027-11-21' },
      5,
      { id: 9, unit_number: 'A-101' },
    );
    expect(payload).toMatchObject({
      sign_date: '2026-11-01',
      contract_number: 'C-7',
      end_date: '2027-11-21',
    });
  });

  it('sets an owner type only on an owner and only when it isn’t Owner', () => {
    expect(ownerTypeToSet({ ...filled, owner_type_id: '3' })).toBe(3);
    expect(ownerTypeToSet({ ...filled, owner_type_id: '2' })).toBeNull();
    expect(ownerTypeToSet({ ...filled, owner_type_id: '' })).toBeNull();
    expect(ownerTypeToSet({ ...filled, ownership_id: '2', owner_type_id: '3' })).toBeNull();
  });
});

describe('the manual customer form', () => {
  const schema = createCustomerEntrySchema(t);

  it('accepts a complete entry', () => {
    expect(schema.safeParse(filled).success).toBe(true);
  });

  it('checks the ID number against its type', () => {
    const result = schema.safeParse({ ...filled, id_number: '1234' });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['id_number'], message: 'nationalIdFormat' }),
    ]);
  });

  it('refuses an end date before the start date', () => {
    const result = schema.safeParse({ ...filled, end_date: '2026-11-01' });
    expect(result.error?.issues).toEqual([
      expect.objectContaining({ path: ['end_date'], message: 'endBeforeStart' }),
    ]);
  });
});
