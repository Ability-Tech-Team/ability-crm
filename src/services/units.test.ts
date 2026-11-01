import { describe, expect, it } from 'vitest';
import { getPrimaryCustomer, getUnitDebitAmount, type CustomerUnit } from './units';

describe('getUnitDebitAmount', () => {
  it('reads the uploaded debt, or null if never uploaded', () => {
    expect(getUnitDebitAmount({ debit_amount: 1250.5 })).toBe(1250.5);
    expect(getUnitDebitAmount({ debit_amount: '300' })).toBe(300);
    expect(getUnitDebitAmount({ debit_amount: 0 })).toBe(0);
    expect(getUnitDebitAmount({ debit_amount: null })).toBeNull();
    expect(getUnitDebitAmount({})).toBeNull();
    expect(getUnitDebitAmount({ debit_amount: 'n/a' })).toBeNull();
  });
});

describe('getPrimaryCustomer', () => {
  const renter = { customer_id: 1, is_owner: 0 } as unknown as CustomerUnit;
  const owner = { customer_id: 2, is_owner: 1 } as unknown as CustomerUnit;

  it('prefers the owner, then the first customer', () => {
    expect(getPrimaryCustomer({ customer_units: [renter, owner] })).toBe(owner);
    expect(getPrimaryCustomer({ customer_units: [renter] })).toBe(renter);
    expect(getPrimaryCustomer({ customer_units: [] })).toBeNull();
  });
});
