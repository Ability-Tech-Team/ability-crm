import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except those starting with `/api`, `/_next` or
  // `/_vercel`, and those containing a dot (e.g. `favicon.ico`).
  matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
};
