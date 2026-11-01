'use client';

import { useContext } from 'react';
import { useLocale } from 'next-intl';
import { SessionContext } from '@/src/components/SessionProvider';

/** The signed-in user's details, inside the app shell. */
export function useSession() {
  const value = useContext(SessionContext);

  if (!value) {
    throw new Error('useSession must be used inside the app shell.');
  }

  return value;
}

/** Where the signed-in client's logo is served (`src/app/api/branding/logo`). */
export const BRAND_LOGO_PATH = '/api/branding/logo';

/**
 * The client's name and logo for display: its own product name (`branding`)
 * first, then its name. Also works outside the app shell (maintenance page),
 * where both are null.
 */
export function useClientBrand(): {
  name: string | null;
  logoUrl: string | null;
} {
  const value = useContext(SessionContext);
  const locale = useLocale();
  const client = value?.details.client;
  const name =
    locale === 'ar'
      ? (client?.brandNameAr ?? client?.nameAr)
      : (client?.brandNameEn ?? client?.nameEn);

  return {
    name: name ?? null,
    logoUrl: client?.hasLogo ? BRAND_LOGO_PATH : null,
  };
}
