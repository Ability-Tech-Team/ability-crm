'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Eye, Images, Undo2, X } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import Form, {
  type ButtonConfig,
  type FieldConfig,
} from '@/src/components/Form';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import FilePreviewDialog, {
  type PreviewFile,
} from '@/src/components/ui/FilePreviewDialog';
import SecureImage from '@/src/components/ui/SecureImage';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  acceptOwnerRelativeRequest,
  getOwnerRelativeRequests,
  rejectOwnerRelativeRequest,
  revertAcceptOwnerRelativeRequest,
  type OwnerRelativeRequest,
} from '@/src/services/customerRelativeRequests';

const LIMIT = 10;

const PENDING_STATUS_ID = 1;
const ACCEPTED_STATUS_ID = 2;

const searchSchema = z.object({
  id: z.string().optional(),
  owner_id: z.string().optional(),
  project_id: z.string().optional(),
  unit_number: z.string().optional(),
  mobile_number: z.string().optional(),
  relative_identification_id: z.string().optional(),
  request_status_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

type SearchParams = {
  id?: number;
  owner_id?: number;
  project_id?: number;
  unit_number?: string;
  mobile_number?: string;
  relative_identification_id?: string;
  request_status_id?: number;
};

type ActionKind = 'accept' | 'reject' | 'undo';

function getStatusBadgeClass(statusId: number | null | undefined) {
  if (statusId === 2) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }
  if (statusId === 3) {
    return 'border-red-200 bg-red-50 text-red-700';
  }
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

function formatDateValue(value: string | null | undefined) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function getRelativeFullName(row: OwnerRelativeRequest) {
  const first = row.payload?.first_name?.trim();
  const last = row.payload?.last_name?.trim();
  const joined = [first, last].filter(Boolean).join(' ');
  return joined || '—';
}

function getMediaImages(row: OwnerRelativeRequest) {
  return (row.payload?.identification_images ?? []).filter(
    (url): url is string => typeof url === 'string' && url.length > 0,
  );
}

export default function CustomerRelativeRequestsPage() {
  const tCustomers = useTranslations('customers');
  const t = useTranslations('customers.relativeRequests');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/customers/relative-requests');
  const canRead = privileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canAccept = privileges.hasPrivilege(PRIVILEGE_IDS.ACCEPT);
  const canReject = privileges.hasPrivilege(PRIVILEGE_IDS.REJECT);
  const canUndo = privileges.hasPrivilege(PRIVILEGE_IDS.REVERT_ACCEPT);
  const canManageActions = canAccept || canReject || canUndo;

  const [requests, setRequests] = useState<OwnerRelativeRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [actionKind, setActionKind] = useState<ActionKind | null>(null);
  const [actionTarget, setActionTarget] = useState<OwnerRelativeRequest | null>(
    null,
  );
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const [mediaImages, setMediaImages] = useState<string[] | null>(null);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  const fetchRequests = useCallback(
    async (params: SearchParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getOwnerRelativeRequests(
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

  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    const params: SearchParams = {
      id: data.id ? Number(data.id) : undefined,
      owner_id: data.owner_id ? Number(data.owner_id) : undefined,
      project_id: data.project_id ? Number(data.project_id) : undefined,
      unit_number: data.unit_number || undefined,
      mobile_number: data.mobile_number || undefined,
      relative_identification_id: data.relative_identification_id || undefined,
      request_status_id: data.request_status_id
        ? Number(data.request_status_id)
        : undefined,
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

  const openAction = (kind: ActionKind, row: OwnerRelativeRequest) => {
    setActionKind(kind);
    setActionTarget(row);
  };

  const closeAction = () => {
    if (isSubmittingAction) return;
    setActionKind(null);
    setActionTarget(null);
  };

  const handleConfirmAction = async () => {
    if (!actionKind || !actionTarget) {
      return;
    }

    setIsSubmittingAction(true);
    try {
      if (actionKind === 'accept') {
        await acceptOwnerRelativeRequest(actionTarget.id);
        toast.success(t('actions.acceptSuccess'));
      } else if (actionKind === 'reject') {
        await rejectOwnerRelativeRequest(actionTarget.id);
        toast.success(t('actions.rejectSuccess'));
      } else {
        await revertAcceptOwnerRelativeRequest(actionTarget.id);
        toast.success(t('actions.undoSuccess'));
      }
      setActionKind(null);
      setActionTarget(null);
      if (searchParams) {
        await fetchRequests(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const projectOptions = useMemo(
    () =>
      (dropdowns?.company_projects ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  const statusOptions = useMemo(
    () =>
      (dropdowns?.owner_relative_request_statuses ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  const fields: FieldConfig[] = [
    {
      name: 'id',
      label: t('filters.id'),
      placeholder: t('filters.id'),
      type: 'text',
      onlyNumbers: true,
    },
    {
      name: 'owner_id',
      label: t('filters.ownerId'),
      placeholder: t('filters.ownerId'),
      type: 'text',
      onlyNumbers: true,
    },
    {
      name: 'unit_number',
      label: t('filters.unitNumber'),
      placeholder: t('filters.unitNumber'),
      type: 'text',
    },
    {
      name: 'mobile_number',
      label: t('filters.phoneNumber'),
      placeholder: t('filters.phoneNumber'),
      type: 'text',
      onlyNumbers: true,
    },
    {
      name: 'relative_identification_id',
      label: t('filters.relativeIdNumber'),
      placeholder: t('filters.relativeIdNumber'),
      type: 'text',
    },
    {
      name: 'project_id',
      label: t('filters.projectId'),
      placeholder: t('filters.selectProject'),
      fieldType: 'select',
      options: projectOptions,
    },
    {
      name: 'request_status_id',
      label: t('filters.status'),
      placeholder: t('filters.selectStatus'),
      fieldType: 'select',
      options: statusOptions,
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

  const columns: ColumnDef<OwnerRelativeRequest>[] = [
    {
      id: 'id',
      label: t('columns.id'),
      accessorKey: 'id',
      alwaysVisible: true,
    },
    {
      id: 'created_at',
      label: t('columns.requestDate'),
      cell: (row) => formatDateValue(row.created_at),
    },
    {
      id: 'ownerName',
      label: t('columns.ownerName'),
      cell: (row) => row.owner?.customer_name ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'ownerCode',
      label: t('columns.ownerCode'),
      cell: (row) => row.owner?.customer_code ?? '—',
    },
    {
      id: 'ownerIdNumber',
      label: t('columns.ownerIdNumber'),
      cell: (row) => row.owner?.id_number ?? '—',
    },
    {
      id: 'unitNumber',
      label: t('columns.unitNumber'),
      cell: (row) => row.unit?.unit_number ?? row.unit_number ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'relativeName',
      label: t('columns.relativeName'),
      cell: (row) => getRelativeFullName(row),
      alwaysVisible: true,
    },
    {
      id: 'relation',
      label: t('columns.relation'),
      cell: (row) => row.payload?.relation ?? '—',
    },
    {
      id: 'relativeIdType',
      label: t('columns.relativeIdType'),
      cell: (row) => row.payload?.identification_type ?? '—',
    },
    {
      id: 'relativeIdNumber',
      label: t('columns.relativeIdNumber'),
      cell: (row) =>
        row.relative_identification_id ??
        row.payload?.identification_value ??
        '—',
    },
    {
      id: 'relativePhone',
      label: t('columns.relativePhone'),
      cell: (row) => row.payload?.phone ?? '—',
    },
    {
      id: 'relativeEmail',
      label: t('columns.relativeEmail'),
      cell: (row) => row.payload?.email ?? '—',
    },
    {
      id: 'media',
      label: t('columns.media'),
      alwaysVisible: true,
      disableRowLink: true,
      cell: (row) => {
        const images = getMediaImages(row);
        if (images.length === 0) {
          return <span className="text-slate-300">—</span>;
        }
        return (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setMediaImages(images)}
          >
            <Images size={16} className="me-1 inline" />
            {t('media.show')}
          </Button>
        );
      },
    },
    {
      id: 'status',
      label: t('columns.status'),
      alwaysVisible: true,
      cell: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
            row.request_status_id,
          )}`}
        >
          {row.status?.name ?? '—'}
        </span>
      ),
    },
    {
      id: 'actionBy',
      label: t('columns.actionBy'),
      cell: (row) => row.action_by ?? '—',
    },
    ...(canManageActions
      ? [
          {
            id: 'actions',
            label: tForm('actions'),
            alwaysVisible: true,
            disableRowLink: true,
            cell: (row: OwnerRelativeRequest) => {
              const isPending = row.request_status_id === PENDING_STATUS_ID;
              const isAccepted = row.request_status_id === ACCEPTED_STATUS_ID;
              const hasPendingAction = isPending && (canAccept || canReject);
              const hasUndoAction = isAccepted && canUndo;

              if (!hasPendingAction && !hasUndoAction) {
                return <span className="text-slate-300">—</span>;
              }

              return (
                <div className="flex flex-wrap items-center gap-2">
                  {isPending && canAccept && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => openAction('accept', row)}
                    >
                      {t('actions.accept')}
                    </Button>
                  )}
                  {isPending && canReject && (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => openAction('reject', row)}
                    >
                      {t('actions.reject')}
                    </Button>
                  )}
                  {isAccepted && canUndo && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => openAction('undo', row)}
                    >
                      <Undo2 size={14} className="me-1" />
                      {t('actions.undo')}
                    </Button>
                  )}
                </div>
              );
            },
          } satisfies ColumnDef<OwnerRelativeRequest>,
        ]
      : []),
  ];

  if (!privileges.canAccess || !canRead) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${tCustomers('title')} - ${t('searchTitle')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          id: '',
          owner_id: '',
          project_id: '',
          unit_number: '',
          mobile_number: '',
          relative_identification_id: '',
          request_status_id: '',
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
          <DataTable<OwnerRelativeRequest>
            title={`${tCustomers('results')} (${totalCount})`}
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
            persistKey="customers-relative-requests-columns"
            showColumnToggle
            exportEnabled
            exportEndpoint="/customers/owner-relative-requests"
            exportParams={searchParams ?? {}}
            exportFileName="owner-relative-requests"
          />
        </MainBox>
      )}

      <ConfirmModal
        open={actionKind === 'accept'}
        title={t('actions.acceptTitle')}
        message={t('actions.acceptMessage')}
        confirmLabel={t('actions.accept')}
        cancelLabel={tForm('cancel')}
        confirmVariant="success"
        isLoading={isSubmittingAction}
        loadingLabel={t('actions.accepting')}
        onConfirm={() => {
          void handleConfirmAction();
        }}
        onCancel={closeAction}
      />

      <ConfirmModal
        open={actionKind === 'reject'}
        title={t('actions.rejectTitle')}
        message={t('actions.rejectMessage')}
        confirmLabel={t('actions.reject')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isSubmittingAction}
        loadingLabel={t('actions.rejecting')}
        onConfirm={() => {
          void handleConfirmAction();
        }}
        onCancel={closeAction}
      />

      <ConfirmModal
        open={actionKind === 'undo'}
        title={t('actions.undoTitle')}
        message={t('actions.undoMessage')}
        confirmLabel={t('actions.undo')}
        cancelLabel={tForm('cancel')}
        confirmVariant="secondary"
        isLoading={isSubmittingAction}
        loadingLabel={t('actions.undoing')}
        onConfirm={() => {
          void handleConfirmAction();
        }}
        onCancel={closeAction}
      />

      {mediaImages && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setMediaImages(null);
          }}
        >
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-lg font-semibold text-slate-800">
                {t('media.title')}
              </h2>
              <button
                type="button"
                onClick={() => setMediaImages(null)}
                className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
                aria-label={tForm('cancel')}
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
              {mediaImages.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  {t('media.empty')}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {mediaImages.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() =>
                        setPreviewFile({
                          url,
                          name: `${t('media.title')} ${index + 1}`,
                        })
                      }
                      className="group relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <SecureImage
                        src={url}
                        alt={`${t('media.title')} ${index + 1}`}
                        className="h-40 w-full object-cover"
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-black/0 text-white opacity-0 transition group-hover:bg-black/40 group-hover:opacity-100">
                        <Eye size={20} className="me-1" />
                        {t('media.view')}
                      </span>
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
        title={t('media.title')}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
