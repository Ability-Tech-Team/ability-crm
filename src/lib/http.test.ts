import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setApiAddresses } from './apiConfig';
import { ApiError } from './apiErrors';
import api from './http';
import { useMaintenanceStore } from '@/src/store/useMaintenanceStore';
import { useSessionStore } from '@/src/store/useSessionStore';

function respondWith(status: number, data: unknown): AxiosAdapter {
  return async (config: InternalAxiosRequestConfig) => {
    const response = {
      data,
      status,
      statusText: '',
      headers: {},
      config,
    };
    if (status >= 400) {
      const error = Object.assign(new Error(`HTTP ${status}`), {
        isAxiosError: true,
        config,
        response,
      });
      throw error;
    }
    return response;
  };
}

const envelope = (statusCode: number, message_code: string) => ({
  result: { message: 'message', message_code },
  statusCode,
  success: false,
});

beforeEach(() => {
  setApiAddresses({
    baseUrl: 'http://172.20.1.141:9999',
    socketOrigin: 'http://172.20.1.141:9999',
  });
  useSessionStore.setState({ mustChangePassword: false, endedReason: null });
  useMaintenanceStore.setState({ isMaintenance: false });
});

afterEach(() => {
  api.defaults.adapter = undefined;
});

describe('the API client', () => {
  it('targets the configured API with the cookie and cookie-only auth', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = async (config) => {
      seen = config;
      return { data: { result: [], success: true, statusCode: 200 }, status: 200, statusText: '', headers: {}, config };
    };

    await api.get('/branding');

    expect(seen?.baseURL).toBe('http://172.20.1.141:9999');
    expect(seen?.withCredentials).toBe(true);
    expect(seen?.headers['X-Auth-Mode']).toBe('cookie');
    expect(seen?.headers.Authorization).toBeUndefined();
    expect(seen?.headers['Accept-Language']).toBe('en');
  });

  it('sends nothing before the session names the API', async () => {
    setApiAddresses({ baseUrl: '', socketOrigin: '' });
    let called = false;
    api.defaults.adapter = async (config) => {
      called = true;
      return { data: {}, status: 200, statusText: '', headers: {}, config };
    };

    await expect(api.get('/customers')).rejects.toThrow('API address is not set');
    expect(called).toBe(false);
    expect(useSessionStore.getState().endedReason).toBeNull();
  });

  it('ends the session on a 401 envelope', async () => {
    api.defaults.adapter = respondWith(200, envelope(401, 'AUTH_INVALID_CREDENTIALS'));

    await expect(api.get('/customers')).rejects.toBeInstanceOf(ApiError);
    expect(useSessionStore.getState().endedReason).toBe('expired');
  });

  it('ends the session on an HTTP 401 too', async () => {
    api.defaults.adapter = respondWith(401, envelope(401, 'AUTH_INVALID_CREDENTIALS'));

    await expect(api.get('/customers')).rejects.toMatchObject({ kind: 'session_ended' });
    expect(useSessionStore.getState().endedReason).toBe('expired');
  });

  it('keeps the session when the caller handles its own 401', async () => {
    api.defaults.adapter = respondWith(200, envelope(401, 'AUTH_INVALID_CREDENTIALS'));

    await expect(
      api.post('/auth/change-password', {}, { skipSessionRedirect: true }),
    ).rejects.toMatchObject({ status: 401 });
    expect(useSessionStore.getState().endedReason).toBeNull();
  });

  it('asks for a password change on AUTH_PASSWORD_CHANGE_REQUIRED', async () => {
    api.defaults.adapter = respondWith(200, envelope(403, 'AUTH_PASSWORD_CHANGE_REQUIRED'));

    await expect(api.get('/orders/tickets')).rejects.toMatchObject({
      kind: 'password_change_required',
    });
    expect(useSessionStore.getState().mustChangePassword).toBe(true);
    expect(useSessionStore.getState().endedReason).toBeNull();
  });

  it('rejects NO_PERMISSION and 429 without touching the session', async () => {
    api.defaults.adapter = respondWith(200, envelope(403, 'NO_PERMISSION'));
    await expect(api.get('/orders/invoices')).rejects.toMatchObject({ kind: 'no_permission' });

    api.defaults.adapter = respondWith(429, 'Too Many Requests');
    await expect(api.get('/orders/invoices')).rejects.toMatchObject({ kind: 'too_many_attempts' });

    expect(useSessionStore.getState()).toMatchObject({
      endedReason: null,
      mustChangePassword: false,
    });
  });

  it('reports a not-found envelope with its code, not as a logout', async () => {
    api.defaults.adapter = respondWith(200, envelope(404, 'CUSTOMER_NOT_FOUND'));

    await expect(api.post('/customers/update-customer/1', {})).rejects.toMatchObject({
      status: 404,
      code: 'CUSTOMER_NOT_FOUND',
      response: { status: 200 },
    });
    expect(useSessionStore.getState().endedReason).toBeNull();
  });

  it('follows the maintenance flag on any answer', async () => {
    api.defaults.adapter = respondWith(200, { result: { is_maintenance: 1 }, success: true, statusCode: 200 });
    await api.get('/all-dropdowns');
    expect(useMaintenanceStore.getState().isMaintenance).toBe(true);
  });

  it('passes file downloads through untouched', async () => {
    const blob = new Blob(['a,b']);
    api.defaults.adapter = respondWith(200, blob);
    const response = await api.get('/imports/1/errors', { responseType: 'blob' });
    expect(response.data).toBe(blob);
  });
});
