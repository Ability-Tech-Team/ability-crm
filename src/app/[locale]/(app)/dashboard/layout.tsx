'use client';

import { useMemo, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { useSelectedLayoutSegment } from 'next/navigation';
import { Link } from '@/src/i18n/navigation';
import { useCurrentUserPrivileges } from '@/src/hooks/useCurrentUserPrivileges';

type Tab = {
  segment: string;
  href: string;
  labelKey: string;
};

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const t = useTranslations('dashboard.tabs');
  const segment = useSelectedLayoutSegment();
  const { canAccessPath } = useCurrentUserPrivileges();

  const tabs = useMemo<Tab[]>(() => {
    const all: (Tab | null)[] = [
      canAccessPath('/dashboard/statistics')
        ? {
            segment: 'statistics',
            href: '/dashboard/statistics',
            labelKey: 'statistics',
          }
        : null,
      canAccessPath('/dashboard/tickets')
        ? {
            segment: 'tickets',
            href: '/dashboard/tickets',
            labelKey: 'tickets',
          }
        : null,
      canAccessPath('/dashboard/complaints')
        ? {
            segment: 'complaints',
            href: '/dashboard/complaints',
            labelKey: 'complaints',
          }
        : null,
    ];
    return all.filter((tab): tab is Tab => tab !== null);
  }, [canAccessPath]);

  return (
    <div className="flex flex-col">
      <div className="px-6 pt-6">
        <nav
          className="inline-flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200"
          aria-label="Dashboard sections"
        >
          {tabs.map((tab) => {
            const isActive = (segment ?? 'statistics') === tab.segment;
            return (
              <Link
                key={tab.segment}
                href={tab.href}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {t(tab.labelKey)}
              </Link>
            );
          })}
        </nav>
      </div>
      {children}
    </div>
  );
}
