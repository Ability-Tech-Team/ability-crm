/**
 * Validation for configured base URLs (product destinations, the account
 * service): an absolute `https:` URL, or `http:` for loopback hosts during
 * local development, with an optional base path.
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
export function parseBaseUrl(value: string | undefined): ParsedBaseUrl {
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

  if (url.protocol === "http:" && !isLoopbackHost(url.hostname)) {
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
