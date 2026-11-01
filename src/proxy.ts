import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  buildPortalSignInUrl,
  getPortalBaseUrl,
  localeFromPathname,
  requestOrigin,
} from "./lib/portal";
import { SESSION_DETAILS_COOKIE } from "./lib/sessionDetails";

const handleI18nRouting = createMiddleware(routing);

/**
 * Locale routing, plus an early redirect for visits without the Portal's
 * session cookie: the user signs in on the Portal and comes back to the exact
 * page they asked for. This is only an optimistic check; the app layout
 * validates the cookie, and the API checks the `access_token` cookie on every
 * call.
 */
export default function proxy(request: NextRequest) {
  if (!request.cookies.get(SESSION_DETAILS_COOKIE)?.value) {
    const portalBaseUrl = getPortalBaseUrl();

    if (portalBaseUrl) {
      return NextResponse.redirect(
        buildPortalSignInUrl(
          portalBaseUrl,
          localeFromPathname(request.nextUrl.pathname),
          `${requestOrigin(request.headers)}${request.nextUrl.pathname}${request.nextUrl.search}`,
        ),
      );
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except those starting with `/api`, `/aws` (the
  // health check), `/_next` or `/_vercel`, and those containing a dot (e.g.
  // `favicon.ico`).
  matcher: "/((?!api|aws|_next|_vercel|.*\\..*).*)",
};
