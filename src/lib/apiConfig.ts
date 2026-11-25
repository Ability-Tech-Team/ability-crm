/**
 * The client's Ability CRM API in the browser. Its address comes with the
 * session (the sign-in's `platforms[crm].apiUrl`, checked on the server
 * against `API_ALLOWED_URLS`), so `SessionProvider` sets it before the app
 * shell makes its first request. Never Amer CRM's API.
 */
let apiBaseUrl: string | null = null;

export function setApiAddresses(addresses: {
  /**
   * Where API calls and the dashboards' sockets go: the API itself, or
   * during `next dev` the proxy path in front of it (src/lib/devApiProxy.ts).
   */
  baseUrl: string;
}): void {
  apiBaseUrl = addresses.baseUrl;
}

export function getApiBaseUrl(): string | null {
  return apiBaseUrl;
}
