/**
 * The client's Ability CRM API in the browser. Its address comes with the
 * session (the sign-in's `platforms[crm].apiUrl`, checked on the server
 * against `API_ALLOWED_URLS`), so `SessionProvider` sets it before the app
 * shell makes its first request. Never Amer CRM's API.
 */
let apiBaseUrl: string | null = null;
let socketOrigin: string | null = null;

export function setApiAddresses(addresses: {
  /** Where API calls go; during `next dev`, the proxy path (src/lib/devApiProxy.ts). */
  baseUrl: string;
  /** The API's own origin, for Socket.IO. */
  socketOrigin: string;
}): void {
  apiBaseUrl = addresses.baseUrl;
  socketOrigin = addresses.socketOrigin;
}

export function getApiBaseUrl(): string | null {
  return apiBaseUrl;
}

/**
 * The API's origin, where the Socket.IO namespaces are mounted. Always the
 * API itself: the development proxy forwards HTTP calls only.
 */
export function getApiOrigin(): string | null {
  return socketOrigin;
}
