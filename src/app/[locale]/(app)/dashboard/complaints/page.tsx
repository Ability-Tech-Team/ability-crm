'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { useComplaintNotificationsSocket } from '@/src/hooks/useComplaintNotificationsSocket';
import {
  getComplaintNotifications,
  type Complaint,
  type ComplaintLocale,
} from '@/src/services/complaints';
import { useCurrentUserPrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { playNotificationSound } from '@/src/lib/notificationSound';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

const LIMIT = 10;

function getStatusBadgeClass(statusName?: string | null): string {
  const n = (statusName ?? '').toLowerCase();
  if (
    n.includes('open') ||
    n.includes('new') ||
    n.includes('جديد') ||
    n.includes('مفتوح')
  )
    return 'bg-sky-50 text-sky-700 ring-1 ring-sky-200';
  if (n.includes('progress') || n.includes('pending') || n.includes('قيد'))
    return 'bg-amber-50 text-amber-700 ring-1 ring-amber-200';
  if (
    n.includes('closed') ||
    n.includes('resolved') ||
    n.includes('مغلق') ||
    n.includes('محلول')
  )
    return 'bg-green-50 text-green-700 ring-1 ring-green-200';
  if (
    n.includes('cancel') ||
    n.includes('rejected') ||
    n.includes('مرفوض') ||
    n.includes('ملغ')
  )
    return 'bg-red-50 text-red-700 ring-1 ring-red-200';
  return 'bg-slate-50 text-slate-700 ring-1 ring-slate-200';
}

export default function DashboardComplaintsPage() {
  const t = useTranslations('complaints');
  const tDashboard = useTranslations('dashboard');
  const tRealtime = useTranslations('dashboard.realtime');
  const locale = useLocale() as ComplaintLocale;
  const { hasAnyPrivilegeForHrefs } = useCurrentUserPrivileges();

  const canReadDetail = hasAnyPrivilegeForHrefs(
    ['/complaints/search'],
    [PRIVILEGE_IDS.READ, PRIVILEGE_IDS.READ_ALL],
  );

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [hasPendingRealtime, setHasPendingRealtime] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchPage = useCallback(
    async (page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);
      setLoadError('');
      try {
        const { notifications, totalCount: total } =
          await getComplaintNotifications(
            { page, limit, locale },
            controller.signal,
          );
        if (controller.signal.aborted) return;
        setComplaints(notifications);
        setTotalCount(total);
      } catch (err) {
        if (controller.signal.aborted) return;
        if ((err as { name?: string })?.name === 'CanceledError') return;
        setLoadError(t('loadError'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    },
    [t, locale],
  );

  useEffect(() => {
    const cancel = runAfterCommit(() => {
      fetchPage(currentPage, pageSize);
    });

    return () => {
      cancel();
      abortRef.current?.abort();
    };
  }, [fetchPage, currentPage, pageSize]);

  const {
    notifications: liveNotifications,
    status,
    lastEvent,
  } = useComplaintNotificationsSocket({ enabled: true, locale });

  const isFirstLatestRef = useRef(true);
  useEffect(() => {
    if (!lastEvent) return;
    // Skip beep on the initial snapshot delivered right after subscribing.
    if (isFirstLatestRef.current) {
      isFirstLatestRef.current = false;
      return;
    }
    playNotificationSound();
  }, [lastEvent]);

  // A new live snapshot replaces page 1; on other pages it only flags that
  // newer items exist. Adjusted during render when the snapshot changes.
  const [seenLiveNotifications, setSeenLiveNotifications] =
    useState(liveNotifications);
  if (liveNotifications !== seenLiveNotifications) {
    setSeenLiveNotifications(liveNotifications);
    if (liveNotifications) {
      if (currentPage === 1) {
        setComplaints(liveNotifications);
        setHasPendingRealtime(false);
      } else {
        setHasPendingRealtime(true);
      }
    }
  }

  const columns = useMemo<ColumnDef<Complaint>[]>(
    () => [
      {
        sortable: true,
        id: 'complain_id',
        label: t('columns.complainId'),
        accessorKey: 'complain_id',
        alwaysVisible: true,
      },
      {
        sortable: true,
        id: 'unit_number',
        label: t('columns.unitNumber'),
        accessorKey: 'unit_number',
      },
      {
        sortable: true,
        id: 'customer_name',
        label: t('columns.customerName'),
        accessorKey: 'customer_name',
      },
      {
        sortable: true,
        id: 'mobile_number',
        label: t('columns.mobileNumber'),
        cell: (row) => row.mobile_number ?? '—',
      },
      {
        sortable: true,
        id: 'department_name',
        label: t('columns.department'),
        cell: (row) => row.department_name ?? '—',
      },
      {
        sortable: true,
        id: 'type_name',
        label: t('columns.type'),
        accessorKey: 'type_name',
      },
      {
        sortable: true,
        id: 'status_name',
        label: t('columns.status'),
        cell: (row) => (
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(row.status_name)}`}
          >
            {row.status_name || '—'}
          </span>
        ),
      },
      {
        sortable: true,
        id: 'request_from_name',
        label: t('columns.requestFrom'),
        cell: (row) => {
          const value = row.request_from_name;
          if (!value) return '—';
          return (
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                value === 'CRM'
                  ? 'bg-sky-100 text-sky-700'
                  : 'bg-green-100 text-green-700'
              }`}
            >
              {value}
            </span>
          );
        },
      },
      {
        sortable: true,
        id: 'complain_date',
        label: t('columns.complainDate'),
        accessorKey: 'complain_date',
      },
      {
        sortable: true,
        id: 'created_by',
        label: t('columns.createdBy'),
        accessorKey: 'created_by',
      },
    ],
    [t],
  );

  return (
    <div className="p-6 flex flex-col gap-4">
      <RealtimeStatusPill status={status} tRealtime={tRealtime} />

      {hasPendingRealtime && currentPage !== 1 && (
        <button
          type="button"
          onClick={() => setCurrentPage(1)}
          className="self-start rounded-lg bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
        >
          {tRealtime('newUpdates')}
        </button>
      )}

      <MainBox>
        {loadError && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {loadError}
          </div>
        )}
        <DataTable<Complaint>
          title={`${tDashboard('tabs.complaints')}${
            lastEvent
              ? ` · ${tRealtime('lastUpdate')}: ${formatTime(lastEvent.receivedAt)}`
              : ''
          }`}
          columns={columns}
          data={complaints}
          rowKey={(row) => row.complain_id ?? row.id ?? ''}
          loading={isLoading}
          emptyState={t('noComplaintsFound')}
          persistKey="dashboard-complaints-columns"
          rowHref={
            canReadDetail
              ? (row) => {
                  const id = row.complain_id ?? row.id;
                  return id ? `/complaints/${id}` : undefined;
                }
              : undefined
          }
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          itemsPerPage={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setCurrentPage(1);
          }}
        />
      </MainBox>
    </div>
  );
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString();
}

function RealtimeStatusPill({
  status,
  tRealtime,
}: {
  status: 'idle' | 'connecting' | 'subscribed' | 'error' | 'disconnected';
  tRealtime: ReturnType<typeof useTranslations>;
}) {
  const config = {
    idle: { dot: 'bg-slate-300', label: tRealtime('idle') },
    connecting: {
      dot: 'bg-amber-400 animate-pulse',
      label: tRealtime('connecting'),
    },
    subscribed: { dot: 'bg-green-500', label: tRealtime('connected') },
    error: { dot: 'bg-red-500', label: tRealtime('error') },
    disconnected: { dot: 'bg-slate-400', label: tRealtime('disconnected') },
  }[status];

  return (
    <div className="inline-flex items-center gap-2 self-start rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm ring-1 ring-slate-200">
      <span className={`h-2 w-2 rounded-full ${config.dot}`} />
      {config.label}
    </div>
  );
}
