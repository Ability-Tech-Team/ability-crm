import "server-only";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getSession } from "@/src/services/accountSession";
import type { AccountSummary } from "@/src/types/account";
import { isLoopbackHost } from "./baseUrl";
import { buildPortalSignInUrl, getPortalBaseUrl } from "./portal";
import { SESSION_COOKIE_NAME } from "./sessionCookie";
import { isWellFormedToken } from "./tokens";

export type ProductAccess =
  | { status: "available"; account: AccountSummary }
  | {
      status: "denied";
      reason: "not_subscribed" | "locked" | "unknown";
      account: AccountSummary;
    }
  /** The access check couldn't be completed: never show the product. */
  | { status: "unavailable" };

/**
 * Whether the signed-in client may use this product, checked with the
 * account service on every request (once per render), so locks, ended
 * subscriptions, and sign-outs apply immediately.
 */
const checkSession = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;

  if (!isWellFormedToken(token)) {
    return { status: "invalid" } as const;
  }

  return getSession(token);
});

/**
 * The access check that every protected page and data request runs first.
 * Signed-out clients go to the Portal's sign-in page and come back to this
 * locale's entry page; everything else is returned for the page to show.
 */
export async function requireProductAccess(
  locale: string,
): Promise<ProductAccess> {
  const session = await checkSession();

  if (session.status === "invalid") {
    const portalBaseUrl = getPortalBaseUrl();

    if (!portalBaseUrl) {
      return { status: "unavailable" };
    }

    redirect(buildPortalSignInUrl(portalBaseUrl, locale, await entryUrl(locale)));
  }

  if (session.status === "unavailable") {
    return { status: "unavailable" };
  }

  return session.access === "available"
    ? { status: "available", account: session.account }
    : { status: "denied", reason: session.access, account: session.account };
}

/**
 * This app's entry page for the locale, as the browser reached it. The Portal
 * validates the address against its configured product destinations.
 */
async function entryUrl(locale: string): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    requestHeaders.get("host") ??
    "localhost";
  const forwardedProto = requestHeaders
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim();
  const protocol =
    forwardedProto === "http" || forwardedProto === "https"
      ? forwardedProto
      : isLoopbackHost(host.replace(/:\d+$/, ""))
        ? "http"
        : "https";

  return `${protocol}://${host}/${locale}`;
}
