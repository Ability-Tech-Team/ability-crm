import { NextResponse } from 'next/server';
import { readSession } from '@/src/lib/session';
import { getBrandingLogoUrl } from '@/src/services/branding';

export const dynamic = 'force-dynamic';

const NO_STORE = 'private, no-store, max-age=0';

/**
 * The signed-in client's logo, at an address that doesn't expire: each
 * request gets a freshly signed link from the API and is redirected to it.
 */
export async function GET() {
  const session = await readSession();
  const logoUrl = session?.apiBaseUrl
    ? await getBrandingLogoUrl(session.apiBaseUrl)
    : null;

  if (!logoUrl) {
    return new NextResponse(null, {
      status: 404,
      headers: { 'Cache-Control': NO_STORE },
    });
  }

  return NextResponse.redirect(logoUrl, {
    status: 302,
    headers: { 'Cache-Control': NO_STORE },
  });
}
