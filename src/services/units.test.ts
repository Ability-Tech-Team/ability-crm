import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, describe, expect, it } from 'vitest';
import { setApiAddresses } from '@/src/lib/apiConfig';
import api from '@/src/lib/http';
import {
  getPrimaryCustomer,
  getUnitDebitAmount,
  setUnitDebt,
  type CustomerUnit,
} from './units';

function answer(
  data: unknown,
  seen?: (config: InternalAxiosRequestConfig) => void,
): AxiosAdapter {
  return async (config) => {
    seen?.(config);
    return { data, status: 200, statusText: '', headers: {}, config };
  };
}

afterEach(() => {
  api.defaults.adapter = undefined;
});

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

describe('setUnitDebt', () => {
  it('posts the amount for the unit and returns the debt as saved', async () => {
    setApiAddresses({
      baseUrl: 'http://172.20.1.141:9999',
      socketOrigin: 'http://172.20.1.141:9999',
    });
    let seen: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = answer(
      {
        result: {
          unit_id: 9,
          unit_number: 'A-101',
          debit_amount: -250.75,
          debt_updated_at: '2026-11-25, 10:30',
          message: 'Unit debt updated successfully',
          message_code: 'UNIT_DEBT_UPDATED',
        },
        success: true,
        statusCode: 201,
      },
      (config) => {
        seen = config;
      },
    );

    await expect(setUnitDebt(9, -250.75)).resolves.toEqual({
      debitAmount: -250.75,
      debtUpdatedAt: '2026-11-25, 10:30',
    });
    expect(seen?.method).toBe('post');
    expect(seen?.url).toBe('/projects/units/debt/9');
    expect(JSON.parse(String(seen?.data))).toEqual({ debit_amount: -250.75 });
  });
});
