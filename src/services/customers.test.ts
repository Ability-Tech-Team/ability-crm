import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setApiAddresses } from '@/src/lib/apiConfig';
import { ApiError } from '@/src/lib/apiErrors';
import api from '@/src/lib/http';
import { useSessionStore } from '@/src/store/useSessionStore';
import {
  addRelative,
  assignUnitToCustomer,
  createCustomer,
  findCustomerByIdNumber,
} from './customers';

function answer(
  data: unknown,
  seen?: (config: InternalAxiosRequestConfig) => void,
): AxiosAdapter {
  return async (config) => {
    seen?.(config);
    return { data, status: 200, statusText: '', headers: {}, config };
  };
}

beforeEach(() => {
  setApiAddresses({
    baseUrl: 'http://172.20.1.141:9999',
    socketOrigin: 'http://172.20.1.141:9999',
  });
  useSessionStore.setState({ mustChangePassword: false, endedReason: null });
});

afterEach(() => {
  api.defaults.adapter = undefined;
});

describe('finding a customer by ID number', () => {
  it('keeps only the customer with exactly that number', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = answer(
      {
        result: {
          customers: [
            { id: 1, customer_name: 'Other', id_number: 'A12345678' },
            { id: 2, customer_name: 'Sara', id_number: 'A1234567' },
          ],
          totalCount: 2,
        },
        success: true,
        statusCode: 200,
      },
      (config) => {
        seen = config;
      },
    );

    const customer = await findCustomerByIdNumber(' a1234567 ');
    expect(customer?.id).toBe(2);
    expect(seen?.params).toMatchObject({ id_number: 'A1234567' });
  });

  it('answers null when no customer matches, and asks nothing for a blank number', async () => {
    api.defaults.adapter = answer({
      result: { customers: [], totalCount: 0 },
      success: true,
      statusCode: 200,
    });
    await expect(findCustomerByIdNumber('29801011234567')).resolves.toBeNull();
    await expect(findCustomerByIdNumber('  ')).resolves.toBeNull();
  });
});

describe('the manual entry calls', () => {
  it('creates a customer and returns their id', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = answer(
      { result: { id: 41, customer_name: 'Sara' }, success: true, statusCode: 201 },
      (config) => {
        seen = config;
      },
    );
    const body = {
      customer_name: 'Sara',
      country_id: 1,
      id_type: 2,
      id_number: '29801011234567',
      marital_status_id: 1,
      religion_id: 1,
      customer_type_id: 1,
    };
    await expect(createCustomer(body)).resolves.toEqual({ id: 41, customer_name: 'Sara' });
    expect(seen?.url).toBe('/customers');
    expect(JSON.parse(String(seen?.data))).toEqual(body);
  });

  it('returns the new link’s id, for setting its owner type', async () => {
    api.defaults.adapter = answer({ result: { id: 77 }, success: true, statusCode: 201 });
    await expect(
      assignUnitToCustomer({
        customer_id: 41,
        unit_id: 9,
        unit_number: 'A-101',
        ownership_id: 1,
        start_date: '2026-11-22',
        sign_date: '2026-11-22',
        contract_number: '',
        is_active: 1,
      }),
    ).resolves.toEqual({ ownershipId: 77 });
  });

  it('posts a relative to /customers/relatives', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = answer(
      {
        result: { relative_id: 88, message: 'The relative was added to the unit.' },
        success: true,
        statusCode: 201,
      },
      (config) => {
        seen = config;
      },
    );
    const body = {
      owner_id: 41,
      unit_id: 9,
      relative_name: 'Omar',
      relative_id_number: '30001011234567',
    };
    await expect(addRelative(body)).resolves.toEqual({ relativeId: 88 });
    expect(seen?.method).toBe('post');
    expect(seen?.url).toBe('/customers/relatives');
    expect(JSON.parse(String(seen?.data))).toEqual(body);
  });

  it('reports a rejected relative by its code, keeping the sheet’s reason in the message', async () => {
    api.defaults.adapter = answer({
      result: {
        message: 'The relative was not added: owner "1" does not hold unit "A-101"',
        message_code: 'RELATIVE_NOT_ADDED',
      },
      success: false,
      statusCode: 400,
    });
    const error = await addRelative({
      owner_id: 41,
      unit_id: 9,
      relative_name: 'Omar',
      relative_id_number: '30001011234567',
    }).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('RELATIVE_NOT_ADDED');
    expect((error as ApiError).message).toContain('does not hold unit');
  });
});
