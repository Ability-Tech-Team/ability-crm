'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { CheckCircle, Printer, XCircle } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import InvoicePrintReceipt from '../../../../../components/InvoicePrintReceipt';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getEmployees } from '@/src/services/employees';
import {
  getInvoices,
  INVOICE_STATUS,
  type Invoice,
} from '@/src/services/invoices';
import { getServices } from '@/src/services/services';
import type { DropdownOption } from '@/src/types/dropdowns';

const LIMIT = 10;

const searchSchema = z.object({
  ticket_id: z.string().optional(),
  invoice_number: z.string().optional(),
  invoice_status_id: z.string().optional(),
  invoice_type_id: z.string().optional(),
  department_id: z.string().optional(),
  service_id: z.string().optional(),
  collected_by: z.string().optional(),
  created_by: z.string().optional(),
  customer_name: z.string().optional(),
  unit_number: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  request_from_id: z.string().optional(),
  contact_channel_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

function normalizeStatus(statusName: string): string {
  return statusName.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isPendingStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return normalized.includes('pending') || normalized.includes('معلق');
}

function isVoidRequestedStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);

  return (
    normalized.includes('void requested') ||
    normalized.includes('void request') ||
    normalized.includes('request void') ||
    normalized.includes('requested for void') ||
    normalized.includes('طلب إلغاء') ||
    normalized.includes('طلب الغاء')
  );
}

function isCollectedStatus(
  invoiceStatusId: number,
  invoiceStatusName: string,
  statuses?: DropdownOption[],
): boolean {
  if (
    invoiceStatusId === INVOICE_STATUS.REFUNDED ||
    invoiceStatusId === INVOICE_STATUS.PARTIALLY_REFUNDED
  ) {
    return true;
  }

  const candidateNames: string[] = [];

  const matchedStatus = statuses?.find((s) => s.id === invoiceStatusId);
  if (matchedStatus) {
    if (matchedStatus.en_name) candidateNames.push(matchedStatus.en_name);
    if (matchedStatus.ar_name) candidateNames.push(matchedStatus.ar_name);
    if (matchedStatus.name) candidateNames.push(matchedStatus.name);
  }
  candidateNames.push(invoiceStatusName);

  return candidateNames.some((name) => {
    const n = normalizeStatus(name);
    return (
      n.includes('collected') ||
      n.includes('paid') ||
      n.includes('مدفوع') ||
      n.includes('محصل') ||
      n.includes('void') ||
      n.includes('ملغي')
    );
  });
}

function isVoidedStatus(statusName: string): boolean {
  if (isVoidRequestedStatus(statusName)) {
    return false;
  }

  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('cancel') ||
    normalized.includes('void') ||
    normalized.includes('ملغي')
  );
}

function getStatusBg(
  invoiceStatusId: number,
  invoiceStatusName: string,
  statuses?: DropdownOption[],
): string {
  // Resolve candidate names, preferring the English name so colour-coding
  // works regardless of the active locale.
  const candidateNames: string[] = [];
  const matchedStatus = statuses?.find((s) => s.id === invoiceStatusId);
  if (matchedStatus) {
    if (matchedStatus.en_name) candidateNames.push(matchedStatus.en_name);
    if (matchedStatus.ar_name) candidateNames.push(matchedStatus.ar_name);
    if (matchedStatus.name) candidateNames.push(matchedStatus.name);
  }
  candidateNames.push(invoiceStatusName);

  const hasName = (check: (n: string) => boolean) =>
    candidateNames.some((name) => check(name));

  if (
    hasName((n) => {
      const norm = normalizeStatus(n);
      return (
        norm.includes('paid') ||
        norm.includes('collected') ||
        norm.includes('مدفوع') ||
        norm.includes('محصل')
      );
    })
  )
    return 'bg-emerald-50 text-emerald-700';
  if (hasName((n) => isPendingStatus(n))) return 'bg-amber-50 text-amber-700';
  if (hasName((n) => isVoidRequestedStatus(n)))
    return 'bg-orange-50 text-orange-700';
  if (hasName((n) => isVoidedStatus(n))) return 'bg-red-50 text-red-700';
  if (
    hasName((n) => {
      const norm = normalizeStatus(n);
      return norm.includes('confirmed') || norm.includes('مؤكد');
    })
  )
    return 'bg-blue-50 text-blue-700';
  return 'bg-slate-50 text-slate-700';
}

export default function InvoicesSearch() {
  const t = useTranslations('invoices');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const invoiceSearchPrivileges = useRoutePrivileges('/invoices/search');
  const canReadInvoice = invoiceSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExportInvoices = invoiceSearchPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EXPORT,
  );

  // ── Search & data state ──────────────────────────────────────
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [cashierOptions, setCashierOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [serviceOptions, setServiceOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchCashiers = async () => {
      try {
        const employeesData = await getEmployees({
          employee_type_id: 3,
          page: 1,
          limit: 1000,
        });
        setCashierOptions(
          employeesData.employees
            .filter((employee) => employee.is_deleted !== 1)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((employee) => ({
              value: employee.id,
              label: employee.full_name || employee.user_name,
            })),
        );
      } catch {
        setCashierOptions([]);
      }
    };

    fetchCashiers();
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

  // ── Dropdowns ────────────────────────────────────────────────
  const statusOptions = useMemo(
    () =>
      (dropdowns?.invoice_statuses ?? []).map((s) => ({
        value: String(s.id),
        label: s.name,
      })),
    [dropdowns],
  );
  const invoiceTypeOptions = useMemo(
    () =>
      (dropdowns?.invoice_types ?? []).map((s) => ({
        value: String(s.id),
        label: s.name,
      })),
    [dropdowns],
  );
  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
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
  const fetchInvoices = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getInvoices(
          {
            ticket_id: params.ticket_id ? Number(params.ticket_id) : undefined,
            invoice_number: params.invoice_number || undefined,
            invoice_status_id: params.invoice_status_id
              ? Number(params.invoice_status_id)
              : undefined,
            invoice_type_id: params.invoice_type_id
              ? Number(params.invoice_type_id)
              : undefined,
            service_id: params.service_id
              ? Number(params.service_id)
              : undefined,
            department_id: params.department_id
              ? Number(params.department_id)
              : undefined,
            collected_by: params.collected_by || undefined,
            created_by: params.created_by || undefined,
            customer_name: params.customer_name || undefined,
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
        setInvoices(data.invoices);
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
    await fetchInvoices(data, 1, pageSize);
  };

  const handleReset = () => {
    setInvoices([]);
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
    await fetchInvoices(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchInvoices(searchParams, 1, size);
  };

  const invoicesExportParams = useMemo(
    () =>
      searchParams
        ? {
            ticket_id: searchParams.ticket_id
              ? Number(searchParams.ticket_id)
              : undefined,
            invoice_number: searchParams.invoice_number || undefined,
            invoice_status_id: searchParams.invoice_status_id
              ? Number(searchParams.invoice_status_id)
              : undefined,
            invoice_type_id: searchParams.invoice_type_id
              ? Number(searchParams.invoice_type_id)
              : undefined,
            service_id: searchParams.service_id
              ? Number(searchParams.service_id)
              : undefined,
            department_id: searchParams.department_id
              ? Number(searchParams.department_id)
              : undefined,
            collected_by: searchParams.collected_by || undefined,
            created_by: searchParams.created_by || undefined,
            customer_name: searchParams.customer_name || undefined,
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

  const handlePrint = useCallback((invoice: Invoice) => {
    setPrintInvoice(invoice);
    setTimeout(() => {
      window.print();
      setPrintInvoice(null);
    }, 100);
  }, []);

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'ticket_id',
      label: tForm('ticketId'),
      placeholder: tForm('ticketId'),
      type: 'text',
    },
    {
      name: 'invoice_number',
      label: t('columns.invoiceNumber'),
      placeholder: t('columns.invoiceNumber'),
      type: 'text',
    },
    {
      name: 'invoice_status_id',
      label: tForm('status'),
      placeholder: tForm('status'),
      fieldType: 'select',
      options: statusOptions,
    },
    {
      name: 'invoice_type_id',
      label: t('columns.invoiceType'),
      placeholder: t('columns.invoiceType'),
      fieldType: 'select',
      options: invoiceTypeOptions,
    },
    {
      name: 'customer_name',
      label: tForm('customerFilter'),
      placeholder: tForm('customerFilter'),
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
      name: 'collected_by',
      label: tForm('collectedBy'),
      placeholder: tForm('collectedBy'),
      fieldType: 'select',
      options: cashierOptions,
    },
    {
      name: 'created_by',
      label: tForm('createdBy'),
      placeholder: tForm('createdBy'),
      fieldType: 'select',
      options: cashierOptions,
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
  const columns: ColumnDef<Invoice>[] = [
    {
      id: 'print',
      label: t('columns.print'),
      disableRowLink: true,
      cell: (row) => {
        const canPrint = isCollectedStatus(
          row.invoice_status_id,
          row.invoice_status_name,
          dropdowns?.invoice_statuses,
        );
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (canPrint) handlePrint(row);
            }}
            disabled={!canPrint}
            className={`p-2 rounded-lg transition-all duration-200 ${
              canPrint
                ? 'text-gray-600 hover:bg-gray-100 hover:scale-110'
                : 'text-gray-300 cursor-not-allowed'
            }`}
            title={t('columns.print')}
          >
            <Printer size={18} />
          </button>
        );
      },
    },
    {
      id: 'invoice_date',
      label: t('columns.creationDate'),
      cell: (row) =>
        row.invoice_date
          ? new Date(row.invoice_date).toLocaleDateString()
          : '—',
      sortable: true,
    },
    {
      id: 'invoice_created_by',
      label: t('columns.cashier'),
      accessorKey: 'invoice_created_by',
      sortable: true,
    },
    {
      id: 'contact_channel_name',
      label: tForm('contactChannel'),
      cell: (row) => row.contact_channel_name ?? '—',
    },

    {
      id: 'invoice_number',
      label: t('columns.invoiceNumber'),
      accessorKey: 'invoice_number',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'ticket_id',
      label: tForm('ticketId'),
      accessorKey: 'ticket_id',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'invoice_status_name',
      label: t('columns.status'),
      cell: (row) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBg(row.invoice_status_id, row.invoice_status_name, dropdowns?.invoice_statuses)}`}
        >
          {row.invoice_status_name || '—'}
        </span>
      ),
    },
    {
      id: 'notes',
      label: t('columns.notes'),
      cell: (row) => (
        <span className="block max-w-xs whitespace-pre-wrap wrap-break-word">
          {row.notes || '—'}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: 'total_amount',
      label: t('columns.totalAmount'),
      accessorKey: 'total_amount',
      sortable: true,
    },
    {
      id: 'payment_type_name',
      label: t('columns.paymentType'),
      cell: (row) => {
        const types = [
          ...new Set(
            (row.invoice_transactions ?? [])
              .map((tx) => tx.payment_type_name)
              .filter(Boolean),
          ),
        ].join(', ');
        return types || '—';
      },
      defaultVisible: true,
    },
    {
      id: 'sister_company_name',
      label: t('columns.sisterCompany'),
      cell: (row) => {
        const names = [
          ...new Set(
            (row.invoice_transactions ?? [])
              .map((tx) => tx.sister_company_name?.trim())
              .filter(Boolean),
          ),
        ].join(', ');
        return names || '—';
      },
      defaultVisible: true,
    },
    {
      id: 'invoice_type_name',
      label: t('columns.invoiceType'),
      accessorKey: 'invoice_type_name',
      sortable: true,
    },
    {
      id: 'department_name',
      label: t('columns.department'),
      cell: (row) =>
        row.department_name ||
        row.invoice_type_name ||
        (row.department_id ? String(row.department_id) : '—'),
      sortable: true,
      defaultVisible: true,
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
      id: 'customer_name',
      label: t('columns.customer'),
      accessorKey: 'customer_name',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'unit_number',
      label: t('columns.unit'),
      accessorKey: 'unit_number',
      sortable: true,
    },

    {
      id: 'void_requested_by',
      label: t('columns.voidRequestedBy'),
      cell: (row) => row.void_requested_by || '—',
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'void_reason',
      label: t('columns.voidReason'),
      cell: (row) => (
        <span className="block max-w-xs whitespace-pre-wrap wrap-break-word">
          {row.void_reason || '—'}
        </span>
      ),
      defaultVisible: true,
    },
    {
      id: 'void_by',
      label: t('columns.voidBy'),
      cell: (row) => row.void_by || '—',
      sortable: true,
      defaultVisible: true,
    },

    {
      id: 'invoice_collected_by',
      label: t('columns.invoiceCollectedBy'),
      cell: (row) => row.invoice_collected_by || '—',
      sortable: true,
      defaultVisible: true,
    },
    {
      id: 'invoice_collected_date',
      label: t('columns.invoiceCollectedDate'),
      cell: (row) =>
        row.invoice_collected_date
          ? new Date(row.invoice_collected_date).toLocaleDateString()
          : '—',
      sortable: true,
      defaultVisible: true,
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
      id: 'is_end_of_day',
      label: t('columns.eod'),
      cell: (row) =>
        row.is_end_of_day ? (
          <CheckCircle size={20} className="text-green-600" />
        ) : (
          <XCircle size={20} className="text-gray-400" />
        ),
    },
    {
      id: 'is_full_end_of_day',
      label: t('columns.fullEod'),
      cell: (row) =>
        row.is_full_end_of_day ? (
          <CheckCircle size={20} className="text-green-600" />
        ) : (
          <XCircle size={20} className="text-gray-400" />
        ),
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
          invoice_number: '',
          invoice_status_id: '',
          invoice_type_id: '',
          department_id: '',
          service_id: '',
          collected_by: '',
          created_by: '',
          customer_name: '',
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

      {printInvoice &&
        createPortal(
          <div className="print-area">
            <InvoicePrintReceipt invoice={printInvoice} />
          </div>,
          document.body,
        )}

      {hasSearched && (
        <MainBox>
          <DataTable<Invoice>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={invoices}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noInvoicesFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="invoices-search-columns-v2"
            showColumnToggle
            exportEnabled={canExportInvoices}
            exportEndpoint="/orders/invoices"
            exportParams={invoicesExportParams}
            exportFileName="invoices"
            rowHref={
              canReadInvoice ? (row) => `/invoices/${row.id}` : undefined
            }
          />
        </MainBox>
      )}
    </div>
  );
}
