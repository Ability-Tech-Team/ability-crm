import { parseAllowedBaseUrls } from "./baseUrl";

/**
 * Local development only (`next dev`): the browser calls the Ability CRM API
 * through this app's own address, and Next.js forwards each call to the API
 * (`rewrites` in next.config.ts).
 *
 * Without it, local runs can't work. The API's CORS lists only the deployed
 * sites, and its `access_token` cookie belongs to the API's host
 * (`SameSite=Lax`), so a page on `localhost` never sends it. Through the
 * proxy, the browser stores the cookie for `localhost`, where the Portal
 * (which signs in through its own proxy) and this app share it.
 *
 * `next build` and `next start` have no rewrites: deployed, the browser calls
 * the API directly.
 */
export const DEV_API_PROXY_PATH = "/api/dev-proxy/crm";

/** The same rules as `readSession` in session.ts. */
const ALLOWED_URL_OPTIONS = { allowPrivateNetworkHttp: true };

/**
 * Only this app's own pages, or an address typed in the browser, may use the
 * proxy. A request from another site doesn't match the rewrite and gets a
 * 404, so other sites can't send the `localhost` cookie through it. Next.js
 * matches the value as a whole (`^...$`).
 */
const SAME_ORIGIN_ONLY = [
  {
    type: "header" as const,
    key: "sec-fetch-site",
    value: "(same-origin|none)",
  },
];

export function isDevApiProxyEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}

/**
 * One rewrite per address in `API_ALLOWED_URLS`:
 * `/api/dev-proxy/crm/<n>/...` goes to the n-th address. Only configured
 * addresses are ever reached.
 */
export function devApiProxyRewrites(allowedList: string | undefined) {
  return parseAllowedBaseUrls(allowedList, ALLOWED_URL_OPTIONS).map(
    (baseUrl, index) => ({
      source: `${DEV_API_PROXY_PATH}/${index}/:path*`,
      destination: `${baseUrl}/:path*`,
      has: SAME_ORIGIN_ONLY,
    }),
  );
}

/**
 * Where the browser sends its API calls: the proxy in front of `apiBaseUrl`
 * during `next dev`, `apiBaseUrl` itself otherwise. `apiBaseUrl` has already
 * been checked against `allowedList` (`readSession`).
 */
export function browserApiBaseUrl(
  apiBaseUrl: string,
  allowedList: string | undefined,
): string {
  if (!isDevApiProxyEnabled()) {
    return apiBaseUrl;
  }

  const index = parseAllowedBaseUrls(allowedList, ALLOWED_URL_OPTIONS).indexOf(
    apiBaseUrl,
  );

  return index === -1 ? apiBaseUrl : `${DEV_API_PROXY_PATH}/${index}`;
}
