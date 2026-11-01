'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, X } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import FilePreviewDialog, {
  type PreviewFile,
} from '@/src/components/ui/FilePreviewDialog';
import MainBox from '@/src/components/ui/MainBox';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getEmployees } from '@/src/services/employees';
import {
  closeOwnershipManagementRequest,
  getOwnershipManagementRequests,
  markOwnershipManagementRequestAsWrongTicket,
  type OwnershipManagementRequest,
  type OwnershipManagementRequestAttachment,
} from '@/src/services/ownershipManagementRequests';

import {
  getAttachments,
  getStatusBadgeClass,
} from '../utils';

const LIMIT = 10;

const DESCRIPTION_MAX_LENGTH = 60;

const searchSchema = z.object({
  unit_id: z.string().optional(),
  unit_number: z.string().optional(),
  is_exact: z.string().optional(),
  category_id: z.string().optional(),
  status_id: z.string().optional(),
  created_by: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

type SearchParams = {
  unit_id?: number;
  unit_number?: string;
  is_exact?: number;
  category_id?: number;
  status_id?: number;
  created_by?: string;
  from_date?: string;
  to_date?: string;
};

function renderTruncatedText(value: string | null) {
  const text = value ?? '';
  const truncated =
    text.length > DESCRIPTION_MAX_LENGTH
      ? `${text.slice(0, DESCRIPTION_MAX_LENGTH)}...`
      : text;
  return (
    <span className="block truncate w-full" title={text}>
      {truncated || '—'}
    </span>
  );
}

export default function OwnershipManagementSearch() {
  const t = useTranslations('ownershipManagement');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/ownership-management/search');
  const canRead = privileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);

  const canExport = privileges.hasPrivilege(PRIVILEGE_IDS.EXPORT);

  // ── Search & data state ──────────────────────────────────────
  const [requests, setRequests] = useState<OwnershipManagementRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Created-by options ──────────────────────────────────────
  const [employeeOptions, setEmployeeOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await getEmployees({ page: 1, limit: 1000 });
        setEmployeeOptions(
          data.employees
            .filter((employee) => employee.is_deleted !== 1)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((employee) => ({
              value: employee.id,
              label: employee.full_name || employee.user_name,
            })),
        );
      } catch {
        setEmployeeOptions([]);
      }
    };

    void fetchEmployees();
  }, []);

  // ── Close action state ───────────────────────────────────────
  const [closeTarget, setCloseTarget] =
    useState<OwnershipManagementRequest | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  // ── Wrong-ticket action state ───────────────────────────────
  const [wrongTicketTarget, setWrongTicketTarget] =
    useState<OwnershipManagementRequest | null>(null);
  const [isMarkingWrongTicket, setIsMarkingWrongTicket] = useState(false);

  // ── Attachments state ────────────────────────────────────────
  const [attachmentsTarget, setAttachmentsTarget] = useState<
    OwnershipManagementRequestAttachment[] | null
  >(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchRequests = useCallback(
    async (params: SearchParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getOwnershipManagementRequests(
          { ...params, page, limit },
          controller.signal,
        );
        setRequests(data.requests);
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
    const params: SearchParams = {
      unit_id: data.unit_id ? Number(data.unit_id) : undefined,
      unit_number: data.unit_number || undefined,
      is_exact: data.is_exact === '1' ? 1 : undefined,
      category_id: data.category_id ? Number(data.category_id) : undefined,
      status_id: data.status_id ? Number(data.status_id) : undefined,
      created_by: data.created_by || undefined,
      from_date: data.from_date || undefined,
      to_date: data.to_date || undefined,
    };
    setSearchParams(params);
    setCurrentPage(1);
    await fetchRequests(params, 1, pageSize);
  };

  const handleReset = () => {
    setRequests([]);
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
    await fetchRequests(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchRequests(searchParams, 1, size);
  };

  // ── Close handler ────────────────────────────────────────────
  const handleConfirmClose = async () => {
    if (!closeTarget) return;

    setIsClosing(true);
    try {
      await closeOwnershipManagementRequest(closeTarget.id);
      showSuccess('statusChangeSuccess');
      setCloseTarget(null);
      if (searchParams) {
        await fetchRequests(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsClosing(false);
    }
  };

  // ── Wrong-ticket handler ────────────────────────────────────
  const handleWrongTicket = async (values: Record<string, string>) => {
    if (!wrongTicketTarget) return;

    const comment = values.comment?.trim();
    if (!comment) return;

    setIsMarkingWrongTicket(true);
    try {
      await markOwnershipManagementRequestAsWrongTicket(wrongTicketTarget.id, {
        comment,
      });
      showSuccess('statusChangeSuccess');
      setWrongTicketTarget(null);
      if (searchParams) {
        await fetchRequests(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsMarkingWrongTicket(false);
    }
  };

  // ── Options ──────────────────────────────────────────────────
  const categoryOptions = useMemo(
    () =>
      (dropdowns?.ownership_management_categories ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  const statusOptions = useMemo(
    () =>
      (dropdowns?.ownership_management_statuses ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  // ── Form config ──────────────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: t('filters.unitNumber'),
      placeholder: t('filters.unitNumber'),
      type: 'text',
    },
    {
      name: 'unit_id',
      label: t('filters.unitId'),
      placeholder: t('filters.unitId'),
      type: 'text',
      onlyNumbers: true,
    },
    {
      name: 'is_exact',
      label: tForm('isExact'),
      fieldType: 'checkbox',
    },
    {
      name: 'category_id',
      label: t('filters.category'),
      placeholder: t('filters.selectCategory'),
      fieldType: 'select',
      options: categoryOptions,
    },
    {
      name: 'status_id',
      label: t('filters.status'),
      placeholder: t('filters.selectStatus'),
      fieldType: 'select',
      options: statusOptions,
    },
    {
      name: 'created_by',
      label: tForm('createdBy'),
      placeholder: tForm('createdBy'),
      fieldType: 'select',
      options: employeeOptions,
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
  const columns: ColumnDef<OwnershipManagementRequest>[] = [
    {
      id: 'id',
      label: t('columns.id'),
      accessorKey: 'id',
      alwaysVisible: true,
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      cell: (row) => row.unit_number ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'unit_id',
      label: t('columns.unitId'),
      cell: (row) => row.unit_id ?? '—',
      defaultVisible: false,
    },
    {
      id: 'category_name',
      label: t('columns.category'),
      cell: (row) => row.category_name ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'description',
      label: t('columns.description'),
      cellClassName: 'max-w-[200px]',
      cell: (row) => renderTruncatedText(row.description),
    },
    {
      id: 'comment',
      label: t('columns.wrongTicketComment'),
      cellClassName: 'max-w-[200px]',
      defaultVisible: false,
      cell: (row) => renderTruncatedText(row.comment),
    },
    {
      id: 'status_name',
      label: t('columns.status'),
      alwaysVisible: true,
      cell: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
            row.status_id,
          )}`}
        >
          {row.status_name ?? '—'}
        </span>
      ),
    },
    {
      id: 'attachments',
      label: t('columns.attachments'),
      alwaysVisible: true,
      disableRowLink: true,
      cell: (row) => {
        const attachments = getAttachments(row);
        if (attachments.length === 0) {
          return <span className="text-slate-300">—</span>;
        }
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setAttachmentsTarget(attachments)}
          >
            <Paperclip size={14} className="me-1 inline" />
            {`${t('attachments.show')} (${attachments.length})`}
          </Button>
        );
      },
    },
    {
      id: 'created_by_name',
      label: t('columns.createdBy'),
      cell: (row) => row.created_by_name ?? '—',
    },
    {
      id: 'created_at',
      label: t('columns.createdAt'),
      cell: (row) => row.created_at ?? '—',
    },
    {
      id: 'closed_by_name',
      label: t('columns.closedBy'),
      cell: (row) => row.closed_by_name ?? '—',
    },
    {
      id: 'closed_date',
      label: t('columns.closedDate'),
      cell: (row) => row.closed_date ?? '—',
    },
    {
      id: 'company_code',
      label: t('columns.companyCode'),
      cell: (row) => row.company_code ?? '—',
      defaultVisible: false,
    },
    {
      id: 'sub_project_id',
      label: t('columns.subProjectId'),
      cell: (row) => row.sub_project_id ?? '—',
      defaultVisible: false,
    },
    {
      id: 'project_id',
      label: t('columns.projectId'),
      cell: (row) => row.project_id ?? '—',
      defaultVisible: false,
    },
    {
      id: 'updated_at',
      label: t('columns.updatedAt'),
      cell: (row) => row.updated_at ?? '—',
      defaultVisible: false,
    },
  ];

  if (!privileges.canAccess || !canRead) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          unit_id: '',
          unit_number: '',
          is_exact: '1',
          category_id: '',
          status_id: '',
          created_by: '',
          from_date: '',
          to_date: '',
        }}
        validationSchema={searchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        autoSubmit
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && (
        <MainBox>
          <DataTable<OwnershipManagementRequest>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={requests}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noRequestsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="ownership-management-search-columns"
            showColumnToggle
            exportEnabled={canExport}
            exportEndpoint="/customers/ownership-management-requests"
            exportParams={searchParams ?? {}}
            exportFileName="ownership-management-requests"
            rowHref={(row) => `/ownership-management/${row.id}`}
          />
        </MainBox>
      )}

      <ConfirmModal
        open={!!closeTarget}
        title={t('actions.closeTitle')}
        message={t('actions.closeMessage', { id: closeTarget?.id ?? '' })}
        confirmLabel={t('actions.close')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isClosing}
        loadingLabel={t('actions.closing')}
        onConfirm={() => {
          void handleConfirmClose();
        }}
        onCancel={() => {
          if (isClosing) return;
          setCloseTarget(null);
        }}
      />

      <AddEntryModal
        open={!!wrongTicketTarget}
        title={t('actions.wrongTicketTitle')}
        fields={[
          {
            name: 'comment',
            label: t('actions.comment'),
            placeholder: t('actions.commentPlaceholder'),
            type: 'textarea',
            required: true,
          },
        ]}
        saveLabel={t('actions.wrongTicket')}
        cancelLabel={tForm('cancel')}
        isSaving={isMarkingWrongTicket}
        onSave={handleWrongTicket}
        onCancel={() => {
          if (isMarkingWrongTicket) return;
          setWrongTicketTarget(null);
        }}
      />

      {attachmentsTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAttachmentsTarget(null);
          }}
        >
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {t('attachments.title')}
              </h2>
              <button
                type="button"
                onClick={() => setAttachmentsTarget(null)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                aria-label={tForm('cancel')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {attachmentsTarget.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {t('attachments.empty')}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {attachmentsTarget.map((attachment) => (
                    <button
                      key={attachment.id}
                      type="button"
                      onClick={() =>
                        setPreviewFile({
                          url: attachment.file_path,
                          name: attachment.file_name,
                        })
                      }
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-start text-sm text-slate-700 transition-colors hover:bg-slate-100"
                    >
                      <Paperclip size={16} className="shrink-0 text-sky-600" />
                      <span className="truncate">{attachment.file_name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <FilePreviewDialog
        open={!!previewFile}
        file={previewFile}
        title={t('attachments.title')}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
