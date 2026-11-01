import 'server-only';
import { cookies, headers } from 'next/headers';
import { isLoopbackHost, matchAllowedBaseUrl } from './baseUrl';
import {
  parseSessionCookie,
  SESSION_DETAILS_COOKIE,
  type SessionDetails,
} from './sessionDetails';

export type Session = {
  details: SessionDetails;
  /**
   * The client's Ability CRM API, from the sign-in's `platforms`, or null when
   * it isn't one of `API_ALLOWED_URLS`. A cookie that names any other address
   * is never followed, so a planted cookie can't send the user's requests
   * elsewhere.
   */
  apiBaseUrl: string | null;
};

/** The signed-in user's session from the Portal's cookie, if present and valid. */
export async function readSession(): Promise<Session | null> {
  const parsed = parseSessionCookie(
    (await cookies()).get(SESSION_DETAILS_COOKIE)?.value,
  );

  if (!parsed) {
    return null;
  }

  const apiBaseUrl = matchAllowedBaseUrl(
    parsed.crmApiUrl,
    process.env.API_ALLOWED_URLS,
    { allowPrivateNetworkHttp: true },
  );

  if (!apiBaseUrl && parsed.crmApiUrl) {
    console.warn(
      'The session names an Ability CRM API that is not in API_ALLOWED_URLS.',
    );
  }

  return { details: parsed.details, apiBaseUrl };
}

/**
 * This app's entry page for the locale, as the browser reached it. The Portal
 * validates the address against its configured product destinations before
 * returning there.
 */
export async function entryUrl(locale: string): Promise<string> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get('x-forwarded-host')?.split(',')[0]?.trim() ??
    requestHeaders.get('host') ??
    'localhost';
  const forwardedProto = requestHeaders
    .get('x-forwarded-proto')
    ?.split(',')[0]
    ?.trim();
  const protocol =
    forwardedProto === 'http' || forwardedProto === 'https'
      ? forwardedProto
      : isLoopbackHost(host.replace(/:\d+$/, ''))
        ? 'http'
        : 'https';

  return `${protocol}://${host}/${locale}`;
}
