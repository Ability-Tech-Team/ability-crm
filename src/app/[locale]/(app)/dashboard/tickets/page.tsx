'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { AlertTriangle, CheckCircle, Eye, EyeOff } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { useTicketNotificationsSocket } from '@/src/hooks/useTicketNotificationsSocket';
import {
  getTicketNotifications,
  type Ticket,
  type TicketLocale,
} from '@/src/services/tickets';
import { useCurrentUserPrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { playNotificationSound } from '@/src/lib/notificationSound';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

const LIMIT = 10;

export default function DashboardTicketsPage() {
  const t = useTranslations('tickets');
  const tDashboard = useTranslations('dashboard');
  const tRealtime = useTranslations('dashboard.realtime');
  const locale = useLocale() as TicketLocale;
  const { hasAnyPrivilegeForHrefs } = useCurrentUserPrivileges();

  const canReadDetail = hasAnyPrivilegeForHrefs(
    ['/tickets/search'],
    [PRIVILEGE_IDS.READ, PRIVILEGE_IDS.READ_ALL],
  );

  const [tickets, setTickets] = useState<Ticket[]>([]);
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
          await getTicketNotifications(
            { page, limit, locale },
            controller.signal,
          );
        if (controller.signal.aborted) return;
        setTickets(notifications);
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
  } = useTicketNotificationsSocket({ enabled: true, locale });

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
        setTickets(liveNotifications);
        setHasPendingRealtime(false);
      } else {
        setHasPendingRealtime(true);
      }
    }
  }

  const columns = useMemo<ColumnDef<Ticket>[]>(
    () => [
      {
        sortable: true,
        id: 'status',
        label: t('columns.status'),
        cell: (row) =>
          row.seen_by ? (
            <Eye size={20} className="text-green-600" />
          ) : (
            <EyeOff size={20} className="text-gray-400" />
          ),
      },
      {
        sortable: true,
        id: 'sla',
        label: t('columns.sla'),
        cell: (row) =>
          row.sla_status === 1 ? (
            <AlertTriangle size={20} className="text-red-500" />
          ) : (
            <CheckCircle size={20} className="text-green-600" />
          ),
      },
      {
        sortable: true,
        id: 'delayed',
        label: t('columns.delayed'),
        cell: (row) =>
          row.delay_status === 1 ? (
            <AlertTriangle size={20} className="text-red-500" />
          ) : (
            <CheckCircle size={20} className="text-green-600" />
          ),
      },
      {
        sortable: true,
        id: 'is_urgent',
        label: t('columns.urgent'),
        cell: (row) =>
          row.is_urgent === 1 ? (
            <AlertTriangle size={20} className="text-red-600 animate-pulse" />
          ) : (
            <AlertTriangle size={20} className="text-gray-300" />
          ),
      },
      {
        sortable: true,
        id: 'ticket_id',
        label: t('columns.ticketId'),
        accessorKey: 'ticket_id',
        alwaysVisible: true,
      },
      {
        sortable: true,
        id: 'customer_name',
        label: t('columns.customerName'),
        accessorKey: 'customer_name',
        alwaysVisible: true,
      },
      {
        sortable: true,
        id: 'requester_name',
        label: t('columns.requesterName'),
        accessorKey: 'requester_name',
      },
      {
        sortable: true,
        id: 'unit_number',
        label: t('columns.unitNumber'),
        accessorKey: 'unit_number',
      },
      {
        sortable: true,
        id: 'department_name',
        label: t('columns.departmentName'),
        accessorKey: 'department_name',
      },
      {
        sortable: true,
        id: 'services',
        label: t('columns.services'),
        cell: (row) => (
          <span className="block min-w-64 whitespace-normal">
            {row.services?.length
              ? row.services.map((s) => s.service_name).join(', ')
              : '—'}
          </span>
        ),
      },
      {
        sortable: true,
        id: 'arrival_time',
        label: t('columns.arrivalTime'),
        cell: (row) => row.arrival_time ?? '—',
      },
      {
        sortable: true,
        id: 'last_status_name',
        label: t('columns.lastStatus'),
        accessorKey: 'last_status_name',
      },
      {
        sortable: true,
        id: 'ticket_source_name',
        label: t('columns.requestFrom'),
        cell: (row) => {
          const value = row.ticket_source_name;
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
        <DataTable<Ticket>
          title={`${tDashboard('tabs.tickets')}${
            lastEvent
              ? ` · ${tRealtime('lastUpdate')}: ${formatTime(lastEvent.receivedAt)}`
              : ''
          }`}
          columns={columns}
          data={tickets}
          rowKey={(row) => row.ticket_id}
          loading={isLoading}
          emptyState={t('noTicketsFound')}
          persistKey="dashboard-tickets-columns"
          rowHref={
            canReadDetail ? (row) => `/tickets/${row.ticket_id}` : undefined
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
