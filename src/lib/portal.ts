import { routing, type AppLocale } from "@/src/i18n/routing";
import { isLoopbackHost, parseBaseUrl } from "./baseUrl";

let reportedProblem = "";

/**
 * Ability Portal's address (`PORTAL_URL`, read at runtime): clients sign in
 * there. Returns null, logging why without the value, when it is missing or
 * invalid; signed-out clients then get the access-check error page.
 */
export function getPortalBaseUrl(): string | null {
  const parsed = parseBaseUrl(process.env.PORTAL_URL);

  if (parsed.status === "configured") {
    return parsed.baseUrl;
  }

  const problem =
    parsed.status === "missing"
      ? "is not set"
      : `is invalid (${parsed.problem})`;

  if (problem !== reportedProblem) {
    reportedProblem = problem;
    console.warn(
      `PORTAL_URL ${problem}; signed-out clients can't be sent to the Portal's sign-in page.`,
    );
  }

  return null;
}

/**
 * The Portal's sign-in page, which opens `returnTo` afterwards. The Portal
 * follows it only when it points into a configured product address.
 */
export function buildPortalSignInUrl(
  portalBaseUrl: string,
  locale: string,
  returnTo: string,
): string {
  const url = new URL(`${portalBaseUrl}/${locale}/sign-in`);
  url.searchParams.set("returnTo", returnTo);
  return url.toString();
}

export function buildPortalHomeUrl(
  portalBaseUrl: string,
  locale: string,
): string {
  return `${portalBaseUrl}/${locale}`;
}

/**
 * The origin the browser used for this request: `X-Forwarded-Host` (set by a
 * proxy in front of the app) or `Host`, never the server's own listening
 * address, which `request.nextUrl` reports (`0.0.0.0:3000` in the container).
 * The protocol is `X-Forwarded-Proto`'s, or `http` only on loopback hosts.
 * The Portal checks `returnTo` against its configured product addresses, so
 * a forged header only makes it ignore the address.
 */
export function requestOrigin(requestHeaders: Headers): string {
  const host =
    firstHeaderValue(requestHeaders, "x-forwarded-host") ||
    firstHeaderValue(requestHeaders, "host") ||
    "localhost";
  const forwardedProto = firstHeaderValue(requestHeaders, "x-forwarded-proto");
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : isLoopbackHost(host.replace(/:\d+$/, ""))
        ? "http"
        : "https";

  return `${protocol}://${host}`;
}

/** A header's first value, as proxies append theirs after a comma. */
function firstHeaderValue(requestHeaders: Headers, name: string): string {
  return requestHeaders.get(name)?.split(",")[0]?.trim() ?? "";
}

/** The locale of a path such as `/ar/...`, or the default locale. */
export function localeFromPathname(pathname: string): AppLocale {
  const segment = pathname.split("/")[1];
  return (
    routing.locales.find((locale) => locale === segment) ??
    routing.defaultLocale
  );
}
