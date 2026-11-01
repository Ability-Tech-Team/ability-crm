'use client';

import { Lock, LogOut } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ChangePasswordForm from './ChangePasswordForm';
import { useSessionStore } from '@/src/store/useSessionStore';
import { logoutAndClearSession } from '@/src/lib/logout';

/**
 * Full-screen, non-dismissable password change, shown while the API answers
 * 403 `AUTH_PASSWORD_CHANGE_REQUIRED` (after an admin creates or resets the
 * account). The only way out is a successful change or logging out.
 */
export default function ForcePasswordChange() {
  const t = useTranslations('auth');
  const setMustChangePassword = useSessionStore(
    (s) => s.setMustChangePassword,
  );

  const handleLogout = async () => {
    // Server round-trip: only the server can clear an HttpOnly cookie.
    // SessionGate then sends the user to the Portal's sign-in.
    await logoutAndClearSession();
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-100">
            <Lock size={20} className="text-sky-600" />
          </div>
          <h1 className="text-lg font-semibold text-gray-900">
            {t('changePassword')}
          </h1>
        </div>
        <p className="mb-6 text-sm text-gray-600">{t('mustChangePasswordHint')}</p>

        <ChangePasswordForm onSuccess={() => setMustChangePassword(false)} />

        <button
          type="button"
          onClick={handleLogout}
          className="mt-6 flex w-full items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <LogOut size={16} />
          {t('logout')}
        </button>
      </div>
    </div>
  );
}
