import type { AxiosAdapter, InternalAxiosRequestConfig } from 'axios';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setApiAddresses } from '@/src/lib/apiConfig';
import { ApiError } from '@/src/lib/apiErrors';
import api from '@/src/lib/http';
import { useSessionStore } from '@/src/store/useSessionStore';
import { sendSupportRequest, toSentSupportRequest } from './support';

const payload = {
  category: 'technical_issue' as const,
  subject: 'Export fails',
  message: 'The units export stops at 50%.',
  page: '/units',
};

function answer(data: unknown, seen?: (config: InternalAxiosRequestConfig) => void): AxiosAdapter {
  return async (config) => {
    seen?.(config);
    return { data, status: 200, statusText: '', headers: {}, config };
  };
}

beforeEach(() => {
  setApiAddresses({ baseUrl: 'http://172.20.1.141:9999', socketOrigin: 'http://172.20.1.141:9999' });
  useSessionStore.setState({ mustChangePassword: false, endedReason: null });
});

afterEach(() => {
  api.defaults.adapter = undefined;
});

describe('sending a support request', () => {
  it('posts the request and returns the reference and where the answer goes', async () => {
    let seen: InternalAxiosRequestConfig | undefined;
    api.defaults.adapter = answer(
      {
        result: {
          message: 'Your request was sent to Ability-Tech support.',
          message_code: 'SUPPORT_REQUEST_SENT_SUCCESSFULLY',
          request_id: 1042,
          reference: 'SR-ACME-1042',
          reply_to: 'sara@example.invalid',
        },
        success: true,
        statusCode: 201,
      },
      (config) => {
        seen = config;
      },
    );

    await expect(sendSupportRequest(payload)).resolves.toEqual({
      requestId: 1042,
      reference: 'SR-ACME-1042',
      replyTo: 'sara@example.invalid',
    });
    expect(seen?.method).toBe('post');
    expect(seen?.url).toBe('/support/requests');
    expect(JSON.parse(String(seen?.data))).toEqual(payload);
  });

  it('reports a failure envelope by its code, without ending the session', async () => {
    api.defaults.adapter = answer({
      result: { message: 'not configured', message_code: 'SUPPORT_NOT_CONFIGURED' },
      success: false,
      statusCode: 503,
    });

    const error = await sendSupportRequest(payload).catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe('SUPPORT_NOT_CONFIGURED');
    expect(useSessionStore.getState().endedReason).toBeNull();
  });
});

describe('the support request answer', () => {
  it('reads an account without an email as no reply address', () => {
    expect(toSentSupportRequest({ request_id: 7, reference: 'SR-ACME-7', reply_to: null })).toEqual({
      requestId: 7,
      reference: 'SR-ACME-7',
      replyTo: null,
    });
  });

  it('refuses an answer without a reference instead of showing an empty one', () => {
    expect(() => toSentSupportRequest({ request_id: 7 })).toThrow();
    expect(() => toSentSupportRequest(undefined)).toThrow();
  });
});
