/**
 * Validation for configured base URLs (the Portal, the business API): an
 * absolute `https:` URL, or `http:` for loopback hosts during local
 * development, with an optional base path.
 */

export type BaseUrlProblem =
  | "malformed"
  | "unsupported-protocol"
  | "insecure-http"
  | "credentials"
  | "query-or-fragment";

export type ParsedBaseUrl =
  | { status: "configured"; baseUrl: string }
  | { status: "missing" }
  | { status: "invalid"; problem: BaseUrlProblem };

export type ParseBaseUrlOptions = {
  /**
   * Also accept plain `http:` for private-network IPv4 addresses (10/8,
   * 172.16/12, 192.168/16), where development backends run. Public hosts
   * still need `https:`.
   */
  allowPrivateNetworkHttp?: boolean;
};

export function isPrivateNetworkHost(hostname: string): boolean {
  const match = /^(\d{1,3})\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname);

  if (!match) {
    return false;
  }

  const first = Number(match[1]);
  const second = Number(match[2]);

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  );
}

export function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "[::1]" ||
    /^127(?:\.\d{1,3}){3}$/.test(hostname)
  );
}

/**
 * Credentials, query strings, and fragments are rejected so that configured
 * URLs never carry secrets or tokens. The result has no trailing slash.
 */
export function parseBaseUrl(
  value: string | undefined,
  { allowPrivateNetworkHttp = false }: ParseBaseUrlOptions = {},
): ParsedBaseUrl {
  const trimmed = value?.trim();

  if (!trimmed) {
    return { status: "missing" };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return { status: "invalid", problem: "malformed" };
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    return { status: "invalid", problem: "unsupported-protocol" };
  }

  if (
    url.protocol === "http:" &&
    !isLoopbackHost(url.hostname) &&
    !(allowPrivateNetworkHttp && isPrivateNetworkHost(url.hostname))
  ) {
    return { status: "invalid", problem: "insecure-http" };
  }

  if (url.username || url.password) {
    return { status: "invalid", problem: "credentials" };
  }

  if (url.search || url.hash) {
    return { status: "invalid", problem: "query-or-fragment" };
  }

  return {
    status: "configured",
    baseUrl: `${url.origin}${url.pathname.replace(/\/+$/, "")}`,
  };
}

/**
 * `candidate`, normalized, when it equals one of the comma-separated base URLs
 * in `allowedList`; otherwise null. For addresses that arrive with the session
 * but must still come from trusted configuration.
 */
export function matchAllowedBaseUrl(
  candidate: string | null | undefined,
  allowedList: string | undefined,
  options: ParseBaseUrlOptions = {},
): string | null {
  const parsed = parseBaseUrl(candidate ?? undefined, options);

  if (parsed.status !== "configured") {
    return null;
  }

  return parseAllowedBaseUrls(allowedList, options).includes(parsed.baseUrl)
    ? parsed.baseUrl
    : null;
}

/**
 * The comma-separated base URLs in `allowedList`, normalized, in order;
 * invalid entries are left out.
 */
export function parseAllowedBaseUrls(
  allowedList: string | undefined,
  options: ParseBaseUrlOptions = {},
): string[] {
  return (allowedList ?? "")
    .split(",")
    .map((entry) => parseBaseUrl(entry, options))
    .flatMap((entry) => (entry.status === "configured" ? [entry.baseUrl] : []));
}
