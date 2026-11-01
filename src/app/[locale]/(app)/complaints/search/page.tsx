'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { RefreshCw, MessageSquarePlus, Paperclip } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import ComplaintAttachmentsModal from '@/src/components/ComplaintAttachmentsModal';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  getComplaints,
  changeComplaintStatus,
  addComplaintResponse,
  type Complaint,
} from '@/src/services/complaints';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';

const LIMIT = 10;

const searchSchema = z.object({
  department_id: z.string().optional(),
  type_id: z.string().optional(),
  status_id: z.string().optional(),
  customer_name: z.string().optional(),
  unit_number: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  request_from_id: z.string().optional(),
  contact_channel_id: z.string().optional(),
});

function isResolved(statusName?: string | null): boolean {
  const n = (statusName ?? '').toLowerCase();
  return (
    n.includes('resolved') ||
    n.includes('closed') ||
    n.includes('محلول') ||
    n.includes('مغلق')
  );
}

type SearchFormData = z.infer<typeof searchSchema>;

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

export default function ComplaintsSearch() {
  const t = useTranslations('complaints');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const complaintsSearchPrivileges = useRoutePrivileges('/complaints/search');
  const canReadComplaint = complaintsSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canChangeComplaint = complaintsSearchPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EDIT,
  );
  const canRespondToComplaint = complaintsSearchPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EDIT,
  );
  const canUseComplaintActions =
    canReadComplaint || canChangeComplaint || canRespondToComplaint;

  // ── Search & data state ──────────────────────────────────────
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Change status state ──────────────────────────────────────
  const [statusTarget, setStatusTarget] = useState<Complaint | null>(null);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // ── Add response state ───────────────────────────────────────
  const [responseTarget, setResponseTarget] = useState<Complaint | null>(null);
  const [isAddingResponse, setIsAddingResponse] = useState(false);
  // ── Attachments preview state ────────────────────────────────
  const [attachmentsTarget, setAttachmentsTarget] = useState<Complaint | null>(
    null,
  );
  // ── Dropdowns ────────────────────────────────────────────────
  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const complainTypeOptions = useMemo(
    () =>
      (dropdowns?.complain_types ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const requestFromOptions = useMemo(
    () =>
      (dropdowns?.request_sources ?? [])
        .filter((d) => d.name !== 'CRM Form' && d.name !== 'نموذج CRM')
        .map((d) => ({
          value: String(d.id),
          label: d.name,
        })),
    [dropdowns],
  );

  const complainStatusOptions = useMemo(
    () =>
      (dropdowns?.complain_statuses ?? []).map((d) => ({
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
  const fetchComplaints = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getComplaints(
          {
            department_id: params.department_id
              ? Number(params.department_id)
              : undefined,
            type_id: params.type_id ? Number(params.type_id) : undefined,
            status_id: params.status_id ? Number(params.status_id) : undefined,
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
        setComplaints(data.complaints);
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
    setSuccessMsg('');
    setSearchParams(data);
    setCurrentPage(1);
    await fetchComplaints(data, 1, pageSize);
  };

  const handleReset = () => {
    setComplaints([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
    setSuccessMsg('');
  };

  const handlePageChange = async (page: number) => {
    if (!searchParams || page === currentPage) return;
    setCurrentPage(page);
    await fetchComplaints(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchComplaints(searchParams, 1, size);
  };

  const complaintsExportParams = useMemo(
    () =>
      searchParams
        ? {
            department_id: searchParams.department_id
              ? Number(searchParams.department_id)
              : undefined,
            type_id: searchParams.type_id
              ? Number(searchParams.type_id)
              : undefined,
            status_id: searchParams.status_id
              ? Number(searchParams.status_id)
              : undefined,
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

  // ── Change status handler ────────────────────────────────────
  const handleChangeStatus = useCallback(
    async (values: Record<string, string>) => {
      if (!statusTarget) return;
      setIsChangingStatus(true);
      try {
        await changeComplaintStatus(statusTarget.complain_id, {
          status_id: Number(values.status_id),
        });
        setStatusTarget(null);
        showSuccess('statusChangeSuccess');
        if (searchParams) {
          fetchComplaints(searchParams, currentPage, pageSize);
        }
      } catch (err) {
        showError(err);
      } finally {
        setIsChangingStatus(false);
      }
    },
    [
      statusTarget,
      fetchComplaints,
      searchParams,
      currentPage,
      pageSize,
      showError,
      showSuccess,
    ],
  );

  // ── Add response handler ─────────────────────────────────────
  const handleAddResponse = useCallback(
    async (values: Record<string, string>) => {
      if (!responseTarget) return;
      setIsAddingResponse(true);
      try {
        await addComplaintResponse(responseTarget.complain_id, {
          response: values.response,
        });
        setResponseTarget(null);
        showSuccess('responseAddedSuccess');
        if (searchParams) {
          fetchComplaints(searchParams, currentPage, pageSize);
        }
      } catch (err) {
        showError(err);
      } finally {
        setIsAddingResponse(false);
      }
    },
    [
      responseTarget,
      fetchComplaints,
      searchParams,
      currentPage,
      pageSize,
      showError,
      showSuccess,
    ],
  );

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'department_id',
      label: tForm('department'),
      placeholder: tForm('department'),
      fieldType: 'select',
      options: departmentOptions,
    },
    {
      name: 'type_id',
      label: tForm('complainType'),
      placeholder: tForm('complainType'),
      fieldType: 'select',
      options: complainTypeOptions,
    },
    {
      name: 'customer_name',
      label: tForm('customerFilter'),
      placeholder: tForm('customerFilter'),
      type: 'text',
    },
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'status_id',
      label: tForm('complainStatus'),
      placeholder: tForm('complainStatus'),
      fieldType: 'select',
      options: complainStatusOptions,
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
  const columns: ColumnDef<Complaint>[] = [
    ...(canUseComplaintActions
      ? [
          {
            disableRowLink: true,
            id: 'view',
            label: t('columns.actions'),
            alwaysVisible: true,
            cell: (row: Complaint) => (
              <div className="flex items-center gap-1">
                {canChangeComplaint && !isResolved(row.status_name) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setStatusTarget(row);
                    }}
                    className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-all duration-200 hover:scale-110"
                    title={t('changeStatus')}
                  >
                    <RefreshCw size={18} />
                  </button>
                )}
                {canRespondToComplaint && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setResponseTarget(row);
                    }}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
                    title={t('addResponse')}
                  >
                    <MessageSquarePlus size={18} />
                  </button>
                )}
                {canReadComplaint && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAttachmentsTarget(row);
                    }}
                    className="p-2 text-sky-600 hover:bg-sky-100 rounded-lg transition-all duration-200 hover:scale-110"
                    title={t('viewAttachments')}
                  >
                    <Paperclip size={18} />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
    {
      id: 'complain_id',
      label: t('columns.complainId'),
      accessorKey: 'complain_id',
      alwaysVisible: true,
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      accessorKey: 'unit_number',
    },
    {
      id: 'customer_name',
      label: t('columns.customerName'),
      accessorKey: 'customer_name',
    },
    {
      id: 'customer_code',
      label: t('columns.customerCode'),
      accessorKey: 'customer_code',
    },
    {
      id: 'mobile_number',
      label: t('columns.mobileNumber'),
      cell: (row) => row.mobile_number ?? '—',
    },
    {
      id: 'department_name',
      label: t('columns.department'),
      cell: (row) => row.department_name ?? '—',
    },
    {
      id: 'type_name',
      label: t('columns.type'),
      accessorKey: 'type_name',
    },
    {
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
      id: 'project_name',
      label: t('columns.project'),
      cell: (row) => row.project_name ?? '—',
    },
    {
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
      id: 'contact_channel_name',
      label: tForm('contactChannel'),
      cell: (row) => row.contact_channel_name ?? '—',
    },
    {
      id: 'complain_date',
      label: t('columns.complainDate'),
      accessorKey: 'complain_date',
    },
    {
      id: 'details',
      label: t('columns.details'),
      cellClassName: 'max-w-[200px]',
      cell: (row) => {
        const text = row.details ?? '';
        if (!text) return '—';
        const truncated = text.length > 50 ? `${text.slice(0, 50)}...` : text;
        return (
          <span className="block truncate w-full" title={text}>
            {truncated}
          </span>
        );
      },
    },
    {
      id: 'responses',
      label: t('columns.responses'),
      cellClassName: 'max-w-[200px]',
      cell: (row) => {
        const text = (row.responses ?? []).map((r) => r.response).join(', ');
        if (!text) return '—';
        const truncated = text.length > 50 ? `${text.slice(0, 50)}...` : text;
        return (
          <span className="block truncate w-full" title={text}>
            {truncated}
          </span>
        );
      },
    },
    {
      id: 'created_by',
      label: t('columns.createdBy'),
      accessorKey: 'created_by',
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          department_id: '',
          type_id: '',
          status_id: '',
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
        autoSubmit
      />

      {successMsg && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && (
        <MainBox>
          <DataTable<Complaint>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={complaints}
            rowKey={(row) => row.complain_id}
            loading={isLoading}
            emptyState={t('noComplaintsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="complaints-search-columns"
            showColumnToggle
            exportEnabled
            exportEndpoint="/orders/complains"
            exportParams={complaintsExportParams}
            exportFileName="complaints"
            rowHref={
              canReadComplaint
                ? (row) => `/complaints/${row.complain_id}`
                : undefined
            }
          />
        </MainBox>
      )}

      {/* Change status modal */}
      <AddEntryModal
        open={!!statusTarget}
        title={`${t('changeStatus')} (#${statusTarget?.complain_id ?? ''})`}
        fields={[
          {
            name: 'status_id',
            label: tForm('complainStatus'),
            type: 'select',
            required: true,
            options: complainStatusOptions,
          },
        ]}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        isSaving={isChangingStatus}
        onSave={handleChangeStatus}
        onCancel={() => setStatusTarget(null)}
      />

      {/* Add response modal */}
      <AddEntryModal
        open={!!responseTarget}
        title={`${t('addResponse')} (#${responseTarget?.complain_id ?? ''})`}
        fields={[
          {
            name: 'response',
            label: tForm('response'),
            placeholder: tForm('responsePlaceholder'),
            required: true,
          },
        ]}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        isSaving={isAddingResponse}
        onSave={handleAddResponse}
        onCancel={() => setResponseTarget(null)}
      />

      <ComplaintAttachmentsModal
        open={!!attachmentsTarget}
        complainId={attachmentsTarget?.complain_id ?? ''}
        attachments={attachmentsTarget?.media ?? []}
        onClose={() => setAttachmentsTarget(null)}
      />
    </div>
  );
}
