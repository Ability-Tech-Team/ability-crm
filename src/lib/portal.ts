import { routing, type AppLocale } from "@/src/i18n/routing";
import { parseBaseUrl } from "./baseUrl";

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

/** The locale of a path such as `/ar/...`, or the default locale. */
export function localeFromPathname(pathname: string): AppLocale {
  const segment = pathname.split("/")[1];
  return (
    routing.locales.find((locale) => locale === segment) ??
    routing.defaultLocale
  );
}
