import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import {
  buildPortalSignInUrl,
  getPortalBaseUrl,
  localeFromPathname,
} from "./lib/portal";
import { SESSION_COOKIE_NAME } from "./lib/sessionCookie";
import { isWellFormedToken } from "./lib/tokens";

const handleI18nRouting = createMiddleware(routing);

/**
 * Locale routing, plus an early redirect for clients without a session
 * cookie: they sign in on the Portal and come back to the exact page they
 * asked for. This is only an optimistic check; every page still verifies the
 * session with the account service (src/lib/access.ts).
 */
export default function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!isWellFormedToken(token)) {
    const portalBaseUrl = getPortalBaseUrl();

    if (portalBaseUrl) {
      return NextResponse.redirect(
        buildPortalSignInUrl(
          portalBaseUrl,
          localeFromPathname(request.nextUrl.pathname),
          request.nextUrl.href,
        ),
      );
    }
  }

  return handleI18nRouting(request);
}

export const config = {
  // Match all pathnames except those starting with `/api`, `/_next` or
  // `/_vercel`, and those containing a dot (e.g. `favicon.ico`).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
