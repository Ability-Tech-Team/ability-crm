'use client';

import {
  ArrowLeft,
  Bell,
  User,
  Menu,
  PanelLeftClose,
  LogOut,
  X,
  Lock,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useSidebarStore } from '@/src/store/useSidebarStore';
import { useSession } from '@/src/hooks/useSession';
import BrandMark from './BrandMark';
import { getLocaleDirection, type AppLocale } from '@/src/i18n/routing';
import LanguageSwitcherCompact from './LanguageSwitcherCompact';
import HeaderSearch from './HeaderSearch';
import ChangePasswordModal from './ChangePasswordModal';
import { useState, useRef, useEffect } from 'react';
import { logoutAndClearSession } from '@/src/lib/logout';
import { buildPortalHomeUrl } from '@/src/lib/portal';

interface Notification {
  id: string;
  message: string;
  timestamp: Date;
}

export default function Header() {
  const { isCollapsed, toggle } = useSidebarStore();
  const { details, portalBaseUrl } = useSession();
  const { userName, roleName, projectName } = details;
  const t = useTranslations('common');
  const tAuth = useTranslations('auth');
  const tSession = useTranslations('session');
  const locale = useLocale();
  const isRtl = getLocaleDirection(locale as AppLocale) === 'rtl';
  // The Portal's product cards, in the same language. Hidden when
  // PORTAL_URL isn't configured.
  const portalHomeUrl = portalBaseUrl
    ? buildPortalHomeUrl(portalBaseUrl, locale)
    : null;

  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notifications] = useState<Notification[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setIsNotificationOpen(false);
      }
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setIsUserMenuOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    // Server round-trip: only the server can clear an HttpOnly cookie.
    // SessionGate then sends the user to the Portal's sign-in.
    await logoutAndClearSession();
  };

  const handleNotificationClick = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  return (
    <header className="col-span-2 grid grid-cols-[auto_1fr_auto] items-center bg-white h-14 sm:h-16 px-3 sm:px-6 shadow-[0_6px_6px_rgba(0,0,0,0.1)] sticky top-0 z-20 gap-2 sm:gap-4">
      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={toggle}
          aria-label={isCollapsed ? t('expandSidebar') : t('collapseSidebar')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-[#8F9BB3]"
        >
          <Menu size={24} className="sm:hidden" />
          <span className="hidden sm:block">
            {isCollapsed ? <Menu size={24} /> : <PanelLeftClose size={24} />}
          </span>
        </button>

        <BrandMark
          className="w-10 h-10 sm:w-16.25 sm:h-16.25 object-contain"
          textClassName="max-w-40 truncate text-sm font-bold text-slate-700 sm:text-base"
        />
      </div>

      <div className="flex justify-center min-w-0 px-2">
        {projectName ? (
          <div className="max-w-full rounded-full border border-sky-100 bg-linear-to-r from-sky-50 via-white to-cyan-50 px-3 py-1 text-center shadow-sm sm:px-5 sm:py-1.5">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.28em] text-sky-700 sm:text-xs">
              {t('project')}
            </p>
            <p className="truncate text-sm font-bold text-slate-700 sm:text-base">
              {projectName}
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-3 sm:gap-6">
        <HeaderSearch />

        <div className="relative" ref={notificationRef}>
          <button
            onClick={handleNotificationClick}
            className="hover:text-blue-500 text-[#8F9BB3] sm:w-6 sm:h-6 cursor-pointer transition-colors p-1"
            aria-label={t('notifications')}
            title={t('notifications')}
          >
            <Bell size={20} className="sm:w-6 sm:h-6" />
          </button>

          {/* Notification Dropdown /*/}
          {isNotificationOpen && (
            <div
              className={`absolute mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${isRtl ? 'left-0' : 'right-0'}`}
            >
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-semibold text-gray-700">
                  {t('notifications')}
                </h3>
                <button
                  onClick={() => setIsNotificationOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  aria-label={t('close')}
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-gray-500">
                    <p>
                      {t('noNotificationRightNow') ||
                        'No notifications right now'}
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className="p-4 hover:bg-gray-50 transition-colors"
                      >
                        <p className="text-sm text-gray-700">
                          {notification.message}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {notification.timestamp.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {portalHomeUrl ? (
          <a
            href={portalHomeUrl}
            title={tSession('backToPortal')}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-700 transition-colors hover:bg-gray-50 hover:text-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 lg:px-3"
          >
            <ArrowLeft
              size={18}
              aria-hidden="true"
              className="shrink-0 text-[#8F9BB3] rtl:rotate-180"
            />
            <span className="sr-only lg:not-sr-only lg:whitespace-nowrap">
              {tSession('backToPortal')}
            </span>
          </a>
        ) : null}

        <LanguageSwitcherCompact />

        <div className="relative" ref={userMenuRef}>
          <button
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="group flex items-center gap-2 sm:gap-3 cursor-pointer hover:bg-gray-100 rounded-lg px-2 py-1.5 transition-colors"
          >
            <User
              size={20}
              strokeWidth={1.5}
              className="text-[#8F9BB3] sm:w-6 sm:h-6"
            />

            <div className="hidden sm:block text-start">
              <p className="text-sm sm:text-base text-gray-700 leading-tight">
                {userName || t('username')}
              </p>
              {roleName && (
                <p className="text-xs text-[#8F9BB3] leading-tight">
                  {roleName}
                </p>
              )}
            </div>
          </button>

          {isUserMenuOpen && (
            <div
              className={`absolute mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 ${isRtl ? 'left-0' : 'right-0'}`}
            >
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsChangePasswordOpen(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Lock size={16} className="text-[#8F9BB3]" />
                  {tAuth('changePassword')}
                </button>
                <div className="border-t border-gray-200" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={16} />
                  {tAuth('logout')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <ChangePasswordModal
        open={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </header>
  );
}
