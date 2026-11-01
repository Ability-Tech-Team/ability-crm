import { getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import AccessNotice from '@/src/components/AccessNotice';
import AppShell from '@/src/components/AppShell';
import SessionProvider from '@/src/components/SessionProvider';
import { buildPortalHomeUrl, buildPortalSignInUrl, getPortalBaseUrl } from '@/src/lib/portal';
import { entryUrl, readSession } from '@/src/lib/session';
import { includesCrmPlatform } from '@/src/lib/sessionDetails';

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

/**
 * Every page behind the sign-in. The Portal's `ability_portal_session` cookie
 * says who is signed in (display only) and which API serves the client; the
 * API checks the `access_token` cookie on every call, and `SessionGate` sends
 * the user back to the Portal when it answers 401.
 */
export default async function AppLayout({ children, params }: Props) {
  const { locale } = await params;
  const session = await readSession();
  const portalBaseUrl = getPortalBaseUrl();
  const t = await getTranslations('session');

  if (!session) {
    if (portalBaseUrl) {
      redirect(buildPortalSignInUrl(portalBaseUrl, locale, await entryUrl(locale)));
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <AccessNotice
          title={t('signInUnavailable.title')}
          description={t('signInUnavailable.description')}
        />
      </main>
    );
  }

  const { details, apiBaseUrl } = session;

  if (!includesCrmPlatform(details)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <AccessNotice
          title={t('notAvailable.title')}
          description={t('notAvailable.description')}
        >
          {portalBaseUrl ? (
            <a
              href={buildPortalHomeUrl(portalBaseUrl, locale)}
              className="text-sm text-sky-700 underline underline-offset-4"
            >
              {t('backToPortal')}
            </a>
          ) : null}
        </AccessNotice>
      </main>
    );
  }

  if (!apiBaseUrl) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
        <AccessNotice
          title={t('apiNotConfigured.title')}
          description={t('apiNotConfigured.description')}
        />
      </main>
    );
  }

  return (
    <SessionProvider value={{ details, apiBaseUrl, portalBaseUrl }}>
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
