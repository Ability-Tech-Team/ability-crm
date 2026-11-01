/**
 * The Ability CRM API's response envelope (docs/ABILITY-CRM-BACKEND-CHANGES.md):
 * every answer is HTTP 200 with `{ result, success, statusCode }`, and a
 * failure carries `result: { message, message_code }`. Some layers in front
 * of the API (rate limiting, gateways) can still answer with a real HTTP
 * status, so both are read.
 *
 * Failures are classified by status and `message_code`, never by the wording
 * of the message.
 */

export type ApiFailureKind =
  /** The session cookie is missing, expired, or revoked. */
  | 'session_ended'
  /** An admin created or reset the account; only change-password works. */
  | 'password_change_required'
  /** The role lacks the privilege; the backend checked it. */
  | 'no_permission'
  /** Too many attempts in a short time. */
  | 'too_many_attempts'
  | 'failed';

export type ApiFailure = {
  status: number;
  code: string | null;
  message: string;
};

type EnvelopeLike = {
  success?: unknown;
  statusCode?: unknown;
  message?: unknown;
  result?: unknown;
  is_maintenance?: unknown;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readText(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (Array.isArray(value)) {
    const parts = value.filter(
      (part): part is string => typeof part === 'string' && part.trim() !== '',
    );
    return parts.length > 0 ? parts.join(' | ') : null;
  }

  return null;
}

/** The message and `message_code` of a response body, if it has them. */
export function readEnvelopeMessage(data: unknown): {
  message: string | null;
  code: string | null;
} {
  const envelope = asRecord(data) as EnvelopeLike | null;
  const result = asRecord(envelope?.result);

  return {
    message: readText(result?.message) ?? readText(envelope?.message),
    code:
      typeof result?.message_code === 'string' && result.message_code
        ? result.message_code
        : null,
  };
}

/**
 * The failure an answer reports, or null when it succeeded. `httpStatus` is
 * used when the body is not an envelope or doesn't say.
 */
export function readEnvelopeFailure(
  data: unknown,
  httpStatus: number,
): ApiFailure | null {
  const envelope = asRecord(data) as EnvelopeLike | null;
  const bodyStatus =
    typeof envelope?.statusCode === 'number' ? envelope.statusCode : null;
  const failedByBody =
    envelope?.success === false || (bodyStatus !== null && bodyStatus >= 400);
  const failedByHttp = httpStatus >= 400;

  if (!failedByBody && !failedByHttp) {
    return null;
  }

  const { message, code } = readEnvelopeMessage(data);

  return {
    status: bodyStatus !== null && bodyStatus >= 400 ? bodyStatus : httpStatus,
    code,
    message: message ?? '',
  };
}

export function classifyFailure({ status, code }: ApiFailure): ApiFailureKind {
  if (code === 'AUTH_PASSWORD_CHANGE_REQUIRED') {
    return 'password_change_required';
  }

  if (code === 'NO_PERMISSION') {
    return 'no_permission';
  }

  if (code === 'AUTH_TOO_MANY_ATTEMPTS' || status === 429) {
    return 'too_many_attempts';
  }

  if (status === 401) {
    return 'session_ended';
  }

  return 'failed';
}

/** The backend's maintenance flag, or null when the answer doesn't carry one. */
export function readMaintenanceFlag(data: unknown): boolean | null {
  const envelope = asRecord(data) as EnvelopeLike | null;
  const raw =
    envelope?.is_maintenance !== undefined
      ? envelope.is_maintenance
      : asRecord(envelope?.result)?.is_maintenance;

  if (raw === undefined || raw === null) {
    return null;
  }

  return Number(raw) === 1;
}

/**
 * A failed API call. `response` keeps the axios shape (`data`, `status`) so
 * existing `.catch` handlers that read `error.response.data` keep working.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly kind: ApiFailureKind;
  readonly response: { data: unknown; status: number };

  constructor(failure: ApiFailure, data: unknown, httpStatus: number) {
    super(failure.message || `Request failed (${failure.status})`);
    this.name = 'ApiError';
    this.status = failure.status;
    this.code = failure.code;
    this.kind = classifyFailure(failure);
    this.response = { data, status: httpStatus };
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** The `message_code` of a failed call, from an ApiError or an axios error. */
export function getErrorCode(error: unknown): string | null {
  if (isApiError(error)) {
    return error.code;
  }

  const response = asRecord(asRecord(error)?.response);
  return readEnvelopeMessage(response?.data).code;
}

/** Whether a call answered 404, in the envelope or at the HTTP level. */
export function isNotFoundError(error: unknown): boolean {
  if (isApiError(error)) {
    return error.status === 404;
  }

  const status = asRecord(asRecord(error)?.response)?.status;
  return status === 404;
}
