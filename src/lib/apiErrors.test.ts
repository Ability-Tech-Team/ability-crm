import { describe, expect, it } from 'vitest';
import {
  ApiError,
  classifyFailure,
  getErrorCode,
  isNotFoundError,
  readEnvelopeFailure,
  readEnvelopeMessage,
  readMaintenanceFlag,
} from './apiErrors';

const failure = (statusCode: number, message_code: string, message = 'm') => ({
  result: { message, message_code },
  statusCode,
  success: false,
});

describe('readEnvelopeFailure', () => {
  it('passes a successful envelope', () => {
    expect(
      readEnvelopeFailure({ result: [], statusCode: 200, success: true }, 200),
    ).toBeNull();
  });

  it('reads the status and code of an HTTP-200 failure envelope', () => {
    expect(
      readEnvelopeFailure(failure(404, 'NOT_FOUND', 'Not found'), 200),
    ).toEqual({ status: 404, code: 'NOT_FOUND', message: 'Not found' });
  });

  it('falls back to the HTTP status when the body has none', () => {
    expect(readEnvelopeFailure('Too Many Requests', 429)).toEqual({
      status: 429,
      code: null,
      message: '',
    });
  });

  it('treats success: false without a status as a failure', () => {
    expect(readEnvelopeFailure({ success: false, message: 'x' }, 200)).toEqual(
      { status: 200, code: null, message: 'x' },
    );
  });
});

describe('classifyFailure', () => {
  it.each([
    [401, 'AUTH_INVALID_CREDENTIALS', 'session_ended'],
    [401, null, 'session_ended'],
    [403, 'AUTH_PASSWORD_CHANGE_REQUIRED', 'password_change_required'],
    [403, 'NO_PERMISSION', 'no_permission'],
    [429, 'AUTH_TOO_MANY_ATTEMPTS', 'too_many_attempts'],
    [429, null, 'too_many_attempts'],
    [404, 'CUSTOMER_NOT_FOUND', 'failed'],
    [409, 'CUSTOMER_ALREADY_EXISTS', 'failed'],
  ] as const)('%i %s is %s', (status, code, kind) => {
    expect(classifyFailure({ status, code, message: '' })).toBe(kind);
  });

  it('never ends the session for a 404, which used to be a 401', () => {
    expect(
      classifyFailure({ status: 404, code: 'CUSTOMER_NOT_FOUND', message: '' }),
    ).not.toBe('session_ended');
  });
});

describe('readEnvelopeMessage', () => {
  it('joins array messages', () => {
    expect(readEnvelopeMessage({ message: ['a', 'b'] })).toEqual({
      message: 'a | b',
      code: null,
    });
  });
});

describe('readMaintenanceFlag', () => {
  it('reads the flag at the top level or in the result', () => {
    expect(readMaintenanceFlag({ is_maintenance: 1 })).toBe(true);
    expect(readMaintenanceFlag({ result: { is_maintenance: '0' } })).toBe(
      false,
    );
    expect(readMaintenanceFlag({ result: [] })).toBeNull();
  });
});

describe('ApiError', () => {
  const data = failure(403, 'NO_PERMISSION', 'No permission');
  const error = new ApiError(readEnvelopeFailure(data, 200)!, data, 200);

  it('keeps the axios-like response for existing handlers', () => {
    expect(error.response).toEqual({ data, status: 200 });
    expect(error.message).toBe('No permission');
    expect(error.kind).toBe('no_permission');
  });

  it('exposes its code and not-found state', () => {
    expect(getErrorCode(error)).toBe('NO_PERMISSION');
    expect(isNotFoundError(error)).toBe(false);
    const notFound = failure(404, 'NOT_FOUND');
    expect(
      isNotFoundError(
        new ApiError(readEnvelopeFailure(notFound, 200)!, notFound, 200),
      ),
    ).toBe(true);
  });

  it('reads the code of a plain axios-shaped error', () => {
    expect(
      getErrorCode({ response: { data: failure(409, 'ALREADY_EXISTS') } }),
    ).toBe('ALREADY_EXISTS');
  });
});
