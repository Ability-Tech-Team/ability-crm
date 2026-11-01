'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useDropdownsStore } from '@/src/store/useDropdownsStore';
import { usePrivilegesStore } from '@/src/store/usePrivilegesStore';
import { useCurrentUserPrivilegesStore } from '@/src/store/useCurrentUserPrivilegesStore';
import { useSessionStore } from '@/src/store/useSessionStore';
import { useSidebarStore } from '@/src/store/useSidebarStore';
import { getAllDropdowns } from '@/src/services/dropdowns';
import { getPrivileges } from '@/src/services/privileges';
import { getCurrentUserPrivileges } from '@/src/services/sidebarMenu';
import { useSession } from '@/src/hooks/useSession';
import { buildPortalSignInUrl } from '@/src/lib/portal';
import AppRouteGuard from '@/src/components/AppRouteGuard';
import ForcePasswordChange from '@/src/components/ForcePasswordChange';
import AccessNotice from '@/src/components/AccessNotice';

type LoadState = { key: string; status: 'ready' | 'failed' };

/**
 * The app shell's session handling. Ability CRM has no sign-in page: the
 * backend's `access_token` cookie is the session, and the API decides every
 * request.
 *
 * - Loads the dropdowns, the user's permission tree, and the privilege
 *   catalogue (again when the locale or the menu changes).
 * - A 401 from any call ends the session: the user goes to the Portal's
 *   sign-in and comes back to this page.
 * - A 403 `AUTH_PASSWORD_CHANGE_REQUIRED` blocks the app until the password
 *   is changed.
 * - If the permission tree can't load, nothing behind it is shown.
 */
export default function SessionGate({ children }: { children: ReactNode }) {
  const t = useTranslations('session');
  const locale = useLocale();
  const { portalBaseUrl } = useSession();
  const menuVersion = useSidebarStore((s) => s.menuVersion);
  const mustChangePassword = useSessionStore((s) => s.mustChangePassword);
  const endedReason = useSessionStore((s) => s.endedReason);
  const [attempt, setAttempt] = useState(0);
  const [loadState, setLoadState] = useState<LoadState | null>(null);
  const requestKey = `${locale}:${menuVersion}:${attempt}`;

  const dropdowns = useDropdownsStore();
  const privileges = usePrivilegesStore();
  const currentUserPrivileges = useCurrentUserPrivilegesStore();
  const {
    setData: setDropdowns,
    setLoading: setDropdownsLoading,
    setError: setDropdownsError,
  } = dropdowns;
  const {
    setData: setPrivilegesData,
    setLoading: setPrivilegesLoading,
    setError: setPrivilegesError,
  } = privileges;
  const {
    setData: setCurrentUserPrivilegesData,
    setLoading: setCurrentUserPrivilegesLoading,
    setError: setCurrentUserPrivilegesError,
  } = currentUserPrivileges;

  useEffect(() => {
    if (mustChangePassword || endedReason) return;

    const controller = new AbortController();
    let isActive = true;

    setDropdownsLoading(true);
    setPrivilegesLoading(true);
    setCurrentUserPrivilegesLoading(true);

    Promise.all([
      getAllDropdowns(controller.signal),
      getCurrentUserPrivileges(controller.signal),
      getPrivileges(),
    ])
      .then(([dropdownsResponse, userPrivileges, privilegeCatalogue]) => {
        if (!isActive) return;
        setDropdowns(dropdownsResponse.result ?? {});
        setCurrentUserPrivilegesData(userPrivileges);
        setPrivilegesData(privilegeCatalogue);
        setLoadState({ key: requestKey, status: 'ready' });
      })
      .catch((err: unknown) => {
        if (!isActive || controller.signal.aborted) return;
        const error =
          err instanceof Error ? err : new Error('Failed to load data');
        setDropdownsError(error);
        setCurrentUserPrivilegesError(error);
        setPrivilegesError(error);
        setLoadState({ key: requestKey, status: 'failed' });
      })
      .finally(() => {
        if (!isActive) return;
        setDropdownsLoading(false);
        setPrivilegesLoading(false);
        setCurrentUserPrivilegesLoading(false);
      });

    return () => {
      isActive = false;
      controller.abort();
    };
  }, [
    requestKey,
    mustChangePassword,
    endedReason,
    setDropdowns,
    setDropdownsLoading,
    setDropdownsError,
    setPrivilegesData,
    setPrivilegesLoading,
    setPrivilegesError,
    setCurrentUserPrivilegesData,
    setCurrentUserPrivilegesLoading,
    setCurrentUserPrivilegesError,
  ]);

  useEffect(() => {
    if (!endedReason || !portalBaseUrl) return;

    // After a logout, come back to the entry page rather than the page the
    // user left; after an expired session, to the same page.
    const returnTo =
      endedReason === 'signed_out'
        ? `${window.location.origin}/${locale}`
        : window.location.href;

    window.location.replace(
      buildPortalSignInUrl(portalBaseUrl, locale, returnTo),
    );
  }, [endedReason, portalBaseUrl, locale]);

  if (endedReason) {
    return portalBaseUrl ? (
      <Spinner />
    ) : (
      <CenteredNotice>
        <AccessNotice
          title={t('signInUnavailable.title')}
          description={t('signInUnavailable.description')}
        />
      </CenteredNotice>
    );
  }

  // Blocks the whole app (header, sidebar, every route) until the password
  // is changed.
  if (mustChangePassword) {
    return <ForcePasswordChange />;
  }

  if (loadState?.key !== requestKey) {
    return <Spinner />;
  }

  if (loadState.status === 'failed') {
    return (
      <CenteredNotice>
        <AccessNotice
          title={t('loadFailed.title')}
          description={t('loadFailed.description')}
        >
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-white hover:bg-sky-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            {t('tryAgain')}
          </button>
        </AccessNotice>
      </CenteredNotice>
    );
  }

  return <AppRouteGuard>{children}</AppRouteGuard>;
}

function CenteredNotice({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-6 text-center">
      {children}
    </main>
  );
}

function Spinner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center h-screen bg-gray-50"
    >
      <div className="w-8 h-8 border-4 border-sky-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
