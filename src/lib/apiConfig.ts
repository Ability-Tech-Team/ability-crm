/**
 * The client's Ability CRM API in the browser. Its address comes with the
 * session (the sign-in's `platforms[crm].apiUrl`, checked on the server
 * against `API_ALLOWED_URLS`), so `SessionProvider` sets it before the app
 * shell makes its first request. Never Amer CRM's API.
 */
let apiBaseUrl: string | null = null;

export function setApiBaseUrl(baseUrl: string): void {
  apiBaseUrl = baseUrl;
}

export function getApiBaseUrl(): string | null {
  return apiBaseUrl;
}

/** The API's origin, where the Socket.IO namespaces are mounted. */
export function getApiOrigin(): string | null {
  return apiBaseUrl ? new URL(apiBaseUrl).origin : null;
}
