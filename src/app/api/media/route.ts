import { NextRequest, NextResponse } from 'next/server';
import { readEnvelopeFailure } from '@/src/lib/apiErrors';
import { readSession } from '@/src/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_MEDIA_BYTES = 100 * 1024 * 1024;
const MAX_REDIRECTS = 3;

/** The backend's HttpOnly session cookie (docs/ABILITY-CRM-BACKEND-CHANGES.md). */
const API_SESSION_COOKIE = 'access_token';

function noStoreHeaders(extra?: HeadersInit): Headers {
  const headers = new Headers(extra);
  headers.set('Cache-Control', 'private, no-store, max-age=0');
  headers.set('X-Content-Type-Options', 'nosniff');
  return headers;
}

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: noStoreHeaders() },
  );
}

function configuredMediaHosts(): string[] {
  return (process.env.MEDIA_ALLOWED_HOSTS ?? '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function matchesConfiguredHost(hostname: string, allowedHost: string): boolean {
  if (allowedHost.startsWith('*.')) {
    const suffix = allowedHost.slice(1);
    return hostname.endsWith(suffix) && hostname.length > suffix.length;
  }

  return hostname === allowedHost;
}

function isAwsS3Host(hostname: string): boolean {
  return (
    /(^|\.)s3\.amazonaws\.com$/i.test(hostname) ||
    /(^|\.)s3[.-][a-z0-9-]+\.amazonaws\.com$/i.test(hostname)
  );
}

function isAllowedMediaUrl(value: string, apiBaseUrl: string): URL | null {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  const apiHostname = new URL(apiBaseUrl).hostname.toLowerCase();

  const isConfigured = configuredMediaHosts().some((host) =>
    matchesConfiguredHost(hostname, host),
  );

  return hostname === apiHostname || isConfigured || isAwsS3Host(hostname)
    ? url
    : null;
}

/**
 * Whether the session is valid: the API answers every call with HTTP 200, so
 * only an envelope without a failure counts (a 2xx alone did in Amer CRM).
 */
async function authenticateRequest(
  apiBaseUrl: string,
  authorization: string,
  language: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${apiBaseUrl}/roles/get-role-privileges?_ts=${Date.now()}`,
      {
        headers: {
          Authorization: authorization,
          'Accept-Language': language,
          lang: language,
        },
        cache: 'no-store',
        redirect: 'manual',
      },
    );

    if (!response.ok) return false;
    const body: unknown = await response.json().catch(() => null);
    return body !== null && readEnvelopeFailure(body, response.status) === null;
  } catch {
    return false;
  }
}

async function fetchAllowedMedia(
  url: URL,
  apiBaseUrl: string,
): Promise<Response | null> {
  let currentUrl = url;

  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(currentUrl, {
      cache: 'no-store',
      redirect: 'manual',
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) {
      return response;
    }

    const location = response.headers.get('location');
    if (!location) return null;

    const nextUrl = isAllowedMediaUrl(
      new URL(location, currentUrl).toString(),
      apiBaseUrl,
    );
    if (!nextUrl) return null;
    currentUrl = nextUrl;
  }

  return null;
}

function sizeLimitedBody(body: ReadableStream<Uint8Array>) {
  let received = 0;

  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        received += chunk.byteLength;
        if (received > MAX_MEDIA_BYTES) {
          controller.error(new Error('Media file exceeds the proxy limit'));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

export async function POST(request: NextRequest) {
  // The session is the backend's HttpOnly cookie, which reaches this route
  // only when the API and this app share a cookie domain. Pass it on as the
  // Bearer credential the API also accepts.
  const token = request.cookies.get(API_SESSION_COOKIE)?.value?.trim();
  if (!token) return jsonError('Unauthorized', 401);
  const authorization = `Bearer ${token}`;

  // The client's API comes with the session, checked against API_ALLOWED_URLS.
  const apiBaseUrl = (await readSession())?.apiBaseUrl;
  if (!apiBaseUrl) return jsonError('Unauthorized', 401);

  let source: unknown;
  try {
    const body = (await request.json()) as { url?: unknown };
    source = body.url;
  } catch {
    return jsonError('Invalid request body', 400);
  }

  if (typeof source !== 'string' || source.length > 8_192) {
    return jsonError('Invalid media URL', 400);
  }

  const mediaUrl = isAllowedMediaUrl(source, apiBaseUrl);
  if (!mediaUrl) return jsonError('Media host is not allowed', 403);

  const language = request.headers.get('accept-language') || 'en';
  if (!(await authenticateRequest(apiBaseUrl, authorization, language))) {
    return jsonError('Unauthorized', 401);
  }

  try {
    const response = await fetchAllowedMedia(mediaUrl, apiBaseUrl);
    if (!response) return jsonError('Invalid media redirect', 502);
    if (!response.ok || !response.body) {
      return jsonError('Failed to fetch media', response.status || 502);
    }

    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_MEDIA_BYTES) {
      return jsonError('Media file is too large', 413);
    }

    return new NextResponse(sizeLimitedBody(response.body), {
      status: 200,
      headers: noStoreHeaders({
        'Content-Type':
          response.headers.get('content-type') || 'application/octet-stream',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      }),
    });
  } catch {
    return jsonError('Failed to fetch media', 502);
  }
}
