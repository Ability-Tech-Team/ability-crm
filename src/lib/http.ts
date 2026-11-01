import axios, { type AxiosError, type AxiosResponse } from 'axios';
import { useMaintenanceStore } from '@/src/store/useMaintenanceStore';
import { useSessionStore } from '@/src/store/useSessionStore';
import { routing } from '@/src/i18n/routing';
import { getApiBaseUrl } from './apiConfig';
import {
  ApiError,
  readEnvelopeFailure,
  readMaintenanceFlag,
} from './apiErrors';

declare module 'axios' {
  interface AxiosRequestConfig {
    /**
     * Don't treat a 401 as the end of the session, for calls whose 401 means
     * something else (logout, a wrong current password).
     */
    skipSessionRedirect?: boolean;
  }
}

/**
 * The Ability CRM API client. The session is the backend's HttpOnly
 * `access_token` cookie, which the browser attaches itself
 * (`withCredentials`); no token is ever read, stored, or sent by this code.
 * `X-Auth-Mode: cookie` keeps the token out of response bodies.
 */
const api = axios.create({
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'X-Auth-Mode': 'cookie',
  },
});

function currentLocale(): string {
  if (typeof window === 'undefined') {
    return routing.defaultLocale;
  }

  const segment = window.location.pathname.split('/')[1];
  const pathLocale = routing.locales.find((locale) => locale === segment);

  return pathLocale ?? (document.documentElement.lang || routing.defaultLocale);
}

api.interceptors.request.use((config) => {
  const baseUrl = getApiBaseUrl();

  // Without the session's API address a relative URL would reach this app's
  // own server instead.
  if (!baseUrl) {
    throw new Error('The Ability CRM API address is not set.');
  }

  config.baseURL = baseUrl;
  const locale = currentLocale();
  config.headers['Accept-Language'] = locale;
  config.headers.lang = locale;
  return config;
});

function syncMaintenance(data: unknown) {
  const flag = readMaintenanceFlag(data);

  if (flag !== null) {
    useMaintenanceStore.getState().setMaintenance(flag);
  }
}

function handleFailure(
  data: unknown,
  httpStatus: number,
  skipSessionRedirect: boolean | undefined,
): ApiError | null {
  const failure = readEnvelopeFailure(data, httpStatus);

  if (!failure) {
    return null;
  }

  const error = new ApiError(failure, data, httpStatus);

  if (error.kind === 'session_ended' && !skipSessionRedirect) {
    useSessionStore.getState().markSessionEnded('expired');
  } else if (error.kind === 'password_change_required') {
    useSessionStore.getState().setMustChangePassword(true);
  }

  return error;
}

api.interceptors.response.use(
  (response: AxiosResponse) => {
    syncMaintenance(response.data);

    // File downloads are not envelopes.
    if (
      response.config.responseType === 'blob' ||
      response.config.responseType === 'arraybuffer'
    ) {
      return response;
    }

    const error = handleFailure(
      response.data,
      response.status,
      response.config.skipSessionRedirect,
    );

    return error ? Promise.reject(error) : response;
  },
  (error: AxiosError) => {
    if (axios.isCancel(error) || !error.response) {
      return Promise.reject(error);
    }

    syncMaintenance(error.response.data);

    return Promise.reject(
      handleFailure(
        error.response.data,
        error.response.status,
        error.config?.skipSessionRedirect,
      ) ?? error,
    );
  },
);

export default api;
