'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import {
  Pencil,
  Trash2,
  Printer,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import TicketEditModal from '@/src/components/TicketEditModal';
import { useCurrentUserPrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getTickets, deleteTicket, type Ticket } from '@/src/services/tickets';
import { getServices } from '@/src/services/services';
import { getEmployees } from '@/src/services/employees';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import TicketPrintReceipt from '@/src/components/TicketPrintReceipt';

const LIMIT = 10;

const searchSchema = z.object({
  department_id: z.string().optional(),
  ticket_id: z.string().optional(),
  service_id: z.string().optional(),
  created_by: z.string().optional(),
  status_id: z.string().optional(),
  customer_name: z.string().optional(),
  requester_name: z.string().optional(),
  unit_number: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  request_from_id: z.string().optional(),
  contact_channel_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function TicketsSearch() {
  const t = useTranslations('tickets');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const { hasAnyPrivilegeForHrefs, hasPrivilegeForHref } =
    useCurrentUserPrivileges();
  const ticketsSearchRoute = '/tickets/search';
  const canEditTicket = hasPrivilegeForHref(
    ticketsSearchRoute,
    PRIVILEGE_IDS.EDIT,
  );
  const canDeleteTicket = hasPrivilegeForHref(
    ticketsSearchRoute,
    PRIVILEGE_IDS.DELETE,
  );
  const canReadTicket = hasAnyPrivilegeForHrefs(
    [ticketsSearchRoute],
    [PRIVILEGE_IDS.READ, PRIVILEGE_IDS.READ_ALL],
  );
  const canExportTickets = hasPrivilegeForHref(
    ticketsSearchRoute,
    PRIVILEGE_IDS.EXPORT,
  );
  const canPrintTicket = canReadTicket;

  // ── Search & data state ──────────────────────────────────────
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Print state ──────────────────────────────────────────────
  const [printTicket, setPrintTicket] = useState<Ticket | null>(null);

  // ── Edit state ───────────────────────────────────────────────
  const [editTicketId, setEditTicketId] = useState<number | null>(null);

  // ── Delete state ─────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Dynamic dropdown data ────────────────────────────────────
  const [serviceOptions, setServiceOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [userOptions, setUserOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const employeesData = await getEmployees({ page: 1, limit: 1000 });
        setUserOptions(
          employeesData.employees
            .filter((employee) => employee.is_deleted !== 1)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((employee) => ({
              value: employee.id,
              label: employee.full_name || employee.user_name,
            })),
        );
      } catch {
        // Silently fail — dropdown will be empty
      }
    };
    fetchUsers();
  }, []);

  // ── Fetch services by department ─────────────────────────────
  const fetchServicesByDepartment = useCallback(
    async (departmentId: string) => {
      if (!departmentId) {
        setServiceOptions([]);
        return;
      }
      try {
        const servicesData = await getServices({
          department_id: Number(departmentId),
          is_active: 1,
          page: 1,
          limit: 1000,
        });
        setServiceOptions(
          servicesData.services.map((s) => ({
            value: String(s.id),
            label: s.service_name,
          })),
        );
      } catch {
        setServiceOptions([]);
      }
    },
    [],
  );

  const handleFieldChange = useCallback(
    (name: string, value: string) => {
      if (name === 'department_id') {
        fetchServicesByDepartment(value);
      }
    },
    [fetchServicesByDepartment],
  );

  // ── Dropdowns from all-dropdowns ─────────────────────────────
  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const actionTakenOptions = useMemo(
    () =>
      (dropdowns?.ticket_statuses ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const requestFromOptions = useMemo(
    () =>
      (dropdowns?.request_sources ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const contactChannelOptions = useMemo(
    () =>
      (dropdowns?.contact_channels ?? []).map((channel) => ({
        value: String(channel.id),
        label: channel.name,
      })),
    [dropdowns],
  );

  // ── Fetch ────────────────────────────────────────────────────
  const fetchTickets = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getTickets(
          {
            department_id: params.department_id
              ? Number(params.department_id)
              : undefined,
            ticket_id: params.ticket_id ? Number(params.ticket_id) : undefined,
            service_id: params.service_id
              ? Number(params.service_id)
              : undefined,
            created_by: params.created_by || undefined,
            status_id: params.status_id ? Number(params.status_id) : undefined,
            customer_name: params.customer_name || undefined,
            requester_name: params.requester_name || undefined,
            unit_number: params.unit_number || undefined,
            from_date: params.from_date || undefined,
            to_date: params.to_date || undefined,
            request_from_id: params.request_from_id
              ? Number(params.request_from_id)
              : undefined,
            contact_channel_id: params.contact_channel_id
              ? Number(params.contact_channel_id)
              : undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setTickets(data.tickets);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setError(t('loadError'));
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  // ── Form handlers ────────────────────────────────────────────
  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    setSearchParams(data);
    setCurrentPage(1);
    await fetchTickets(data, 1, pageSize);
  };

  const handleReset = () => {
    setTickets([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
  };

  const handlePageChange = async (page: number) => {
    if (!searchParams || page === currentPage) return;
    setCurrentPage(page);
    await fetchTickets(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchTickets(searchParams, 1, size);
  };

  const ticketsExportParams = useMemo(
    () =>
      searchParams
        ? {
            department_id: searchParams.department_id
              ? Number(searchParams.department_id)
              : undefined,
            ticket_id: searchParams.ticket_id
              ? Number(searchParams.ticket_id)
              : undefined,
            service_id: searchParams.service_id
              ? Number(searchParams.service_id)
              : undefined,
            created_by: searchParams.created_by || undefined,
            status_id: searchParams.status_id
              ? Number(searchParams.status_id)
              : undefined,
            customer_name: searchParams.customer_name || undefined,
            requester_name: searchParams.requester_name || undefined,
            unit_number: searchParams.unit_number || undefined,
            from_date: searchParams.from_date || undefined,
            to_date: searchParams.to_date || undefined,
            request_from_id: searchParams.request_from_id
              ? Number(searchParams.request_from_id)
              : undefined,
            contact_channel_id: searchParams.contact_channel_id
              ? Number(searchParams.contact_channel_id)
              : undefined,
          }
        : {},
    [searchParams],
  );

  // ── Actions ──────────────────────────────────────────────────
  const handlePrint = useCallback((ticket: Ticket) => {
    setPrintTicket(ticket);
    setTimeout(() => {
      window.print();
      setPrintTicket(null);
    }, 100);
  }, []);

  const handleEditSave = useCallback(() => {
    setEditTicketId(null);
    // Re-fetch current search results
    if (searchParams) {
      fetchTickets(searchParams, currentPage, pageSize);
    }
  }, [fetchTickets, searchParams, currentPage, pageSize]);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteTicket(deleteTarget.ticket_id);
      setDeleteTarget(null);
      showSuccess('deleteSuccess');
      // Re-fetch current search results
      if (searchParams) {
        fetchTickets(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsDeleting(false);
    }
  }, [
    deleteTarget,
    fetchTickets,
    searchParams,
    currentPage,
    pageSize,
    showError,
    showSuccess,
  ]);

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'ticket_id',
      label: tForm('ticketId'),
      placeholder: tForm('ticketId'),
      type: 'text',
    },
    {
      name: 'department_id',
      label: tForm('department'),
      placeholder: tForm('department'),
      fieldType: 'select',
      options: departmentOptions,
    },

    {
      name: 'service_id',
      label: tForm('service'),
      placeholder: tForm('service'),
      fieldType: 'select',
      options: serviceOptions,
    },
    {
      name: 'created_by',
      label: tForm('user'),
      placeholder: tForm('user'),
      fieldType: 'select',
      options: userOptions,
    },
    {
      name: 'status_id',
      label: tForm('actionTaken'),
      placeholder: tForm('actionTaken'),
      fieldType: 'select',
      options: actionTakenOptions,
    },
    {
      name: 'customer_name',
      label: tForm('customerFilter'),
      placeholder: tForm('customerFilter'),
      type: 'text',
    },
    {
      name: 'requester_name',
      label: tForm('requesterName'),
      placeholder: tForm('requesterName'),
      type: 'text',
    },
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'from_date',
      label: tForm('dateFrom'),
      placeholder: tForm('dateFrom'),
      type: 'date',
    },
    {
      name: 'to_date',
      label: tForm('dateTo'),
      placeholder: tForm('dateTo'),
      type: 'date',
    },
    {
      name: 'request_from_id',
      label: tForm('requestFrom'),
      placeholder: tForm('requestFrom'),
      fieldType: 'select',
      options: requestFromOptions,
    },
    {
      name: 'contact_channel_id',
      label: tForm('contactChannel'),
      placeholder: tForm('contactChannel'),
      fieldType: 'select',
      options: contactChannelOptions,
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: tForm('search'),
      loadingLabel: tForm('searching'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('clear'),
      type: 'reset',
      variant: 'secondary',
    },
  ];

  // ── Table columns ────────────────────────────────────────────
  const columns: ColumnDef<Ticket>[] = [
    ...(canEditTicket
      ? [
          {
            id: 'edit',
            label: t('columns.edit'),
            disableRowLink: true,
            cell: (row: Ticket) => {
              const normalized = (row.last_status_name ?? '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim();
              const isCreated =
                normalized.includes('created') ||
                normalized.includes('new') ||
                normalized.includes('انشاء') ||
                normalized.includes('تم الإنشاء');
              const isDisabled = !isCreated;
              return (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isDisabled) setEditTicketId(row.ticket_id);
                  }}
                  disabled={isDisabled}
                  className={`p-2 rounded-lg transition-all duration-200 ${isDisabled ? 'text-gray-300 cursor-not-allowed' : 'text-blue-600 hover:bg-blue-100 hover:scale-110'}`}
                  title={t('editTicket')}
                >
                  <Pencil size={18} />
                </button>
              );
            },
          },
        ]
      : []),
    ...(canDeleteTicket
      ? [
          {
            id: 'delete',
            label: t('columns.delete'),
            disableRowLink: true,
            cell: (row: Ticket) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteTarget(row);
                }}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                title={t('deleteTicket')}
              >
                <Trash2 size={18} />
              </button>
            ),
          },
        ]
      : []),
    ...(canPrintTicket
      ? [
          {
            id: 'print',
            label: t('columns.print'),
            disableRowLink: true,
            cell: (row: Ticket) => (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrint(row);
                }}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
                title={t('printTicket')}
              >
                <Printer size={18} />
              </button>
            ),
          },
        ]
      : []),
    {
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
      id: 'ticket_id',
      label: t('columns.ticketId'),
      accessorKey: 'ticket_id',
      alwaysVisible: true,
    },
    {
      id: 'customer_name',
      label: t('columns.customerName'),
      accessorKey: 'customer_name',
      alwaysVisible: true,
    },
    {
      id: 'requester_name',
      label: t('columns.requesterName'),
      accessorKey: 'requester_name',
    },
    {
      id: 'requester_mobile',
      label: t('columns.requesterMobile'),
      accessorKey: 'requester_mobile',
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      accessorKey: 'unit_number',
    },
    {
      id: 'department_name',
      label: t('columns.departmentName'),
      accessorKey: 'department_name',
    },
    {
      id: 'services',
      label: t('columns.services'),
      cell: (row) => (
        <span className="block min-w-64 whitespace-normal">
          {row.services?.length
            ? row.services.map((s) => s.service_name).join(', ')
            : '—'}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: 'notes',
      label: t('columns.notes'),
      cell: (row) => (
        <span className="block max-w-50 truncate" title={row.notes ?? ''}>
          {row.notes ?? '—'}
        </span>
      ),
    },
    {
      id: 'arrival_time',
      label: t('columns.arrivalTime'),
      cell: (row) => row.arrival_time ?? '—',
    },
    {
      id: 'actual_arrival_time',
      label: t('columns.actualArrivalTime'),
      cell: (row) => row.actual_arrival_time ?? '—',
    },
    {
      id: 'duration',
      label: t('columns.duration'),
      cell: (row) => row.duration ?? '—',
    },
    {
      id: 'last_status_name',
      label: t('columns.lastStatus'),
      accessorKey: 'last_status_name',
    },
    {
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
      defaultVisible: true,
    },
    {
      id: 'contact_channel_name',
      label: tForm('contactChannel'),
      cell: (row) => row.contact_channel_name ?? '—',
    },
    {
      id: 'seen_by',
      label: t('columns.seenBy'),
      cell: (row) => row.seen_by ?? '—',
    },
    {
      id: 'agent_name',
      label: t('columns.agentName'),
      accessorKey: 'agent_name',
    },
    {
      id: 'collected_by',
      label: t('columns.collectedBy'),
      cell: (row) => row.collected_by ?? '—',
    },
    {
      id: 'done_by',
      label: t('columns.doneBy'),
      cell: (row) => row.done_by ?? '—',
    },
    {
      id: 'created_by',
      label: t('columns.createdBy'),
      cell: (row) => row.created_by ?? '—',
    },
    {
      id: 'created_at',
      label: t('columns.creationDate'),
      cell: (row) => row.request_time?.dateTime ?? '—',
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          ticket_id: '',
          department_id: '',
          service_id: '',
          created_by: '',
          status_id: '',
          customer_name: '',
          requester_name: '',
          unit_number: '',
          from_date: '',
          to_date: '',
          request_from_id: '',
          contact_channel_id: '',
        }}
        validationSchema={searchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        onFieldChange={handleFieldChange}
        autoSubmit
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Hidden print receipt — portaled to body so print CSS can target it */}
      {printTicket &&
        createPortal(
          <div className="print-area">
            <TicketPrintReceipt ticket={printTicket} />
          </div>,
          document.body,
        )}

      {hasSearched && (
        <MainBox>
          <DataTable<Ticket>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={tickets}
            rowKey={(row) => row.ticket_id}
            loading={isLoading}
            emptyState={t('noTicketsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="tickets-search-columns"
            showColumnToggle
            exportEnabled={canExportTickets}
            exportEndpoint="/orders/tickets"
            exportParams={ticketsExportParams}
            exportFileName="tickets"
            rowHref={
              canReadTicket ? (row) => `/tickets/${row.ticket_id}` : undefined
            }
          />
        </MainBox>
      )}

      {/* Edit ticket modal */}
      <TicketEditModal
        open={editTicketId !== null}
        ticketId={editTicketId}
        onSave={handleEditSave}
        onCancel={() => setEditTicketId(null)}
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={tForm('delete')}
        message={`${t('deleteConfirm')} (#${deleteTarget?.ticket_id ?? ''})`}
        confirmLabel={tForm('delete')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
