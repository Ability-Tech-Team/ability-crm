'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import ToggleSwitch from '@/src/components/ui/ToggleSwitch';
import MainBox from '@/src/components/ui/MainBox';
import { useRouter } from '@/src/i18n/navigation';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  deleteLegalEmployee,
  getLegalEmployees,
  updateLegalEmployee,
  type LegalEmployee,
} from '@/src/services/legalEmployees';

const LIMIT = 10;

/** projectEnums.ALL_PROJECTS — a row on this project is shared with every project. */
const ALL_PROJECTS_ID = 1;

const searchSchema = z.object({
  full_name: z.string().optional(),
  mobile_number: z.string().optional(),
  is_active: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

type SearchParams = {
  full_name?: string;
  mobile_number?: string;
  is_active?: number;
};

export default function ManageLegalUsers() {
  const t = useTranslations('legalEmployees');
  const tForm = useTranslations('form');
  const router = useRouter();
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/users/legal-users-manage');
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const canDelete = privileges.hasPrivilege(PRIVILEGE_IDS.DELETE);
  const canExport = privileges.hasPrivilege(PRIVILEGE_IDS.EXPORT);

  // ── Search & data state ──────────────────────────────────────
  const [legalEmployees, setLegalEmployees] = useState<LegalEmployee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Modal state ──────────────────────────────────────────────
  const [statusTarget, setStatusTarget] = useState<LegalEmployee | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<LegalEmployee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchLegalEmployees = useCallback(
    async (params: SearchParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getLegalEmployees(
          { ...params, page, limit },
          controller.signal,
        );
        setLegalEmployees(data.legalEmployees);
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
      full_name: data.full_name || undefined,
      mobile_number: data.mobile_number || undefined,
      is_active:
        data.is_active !== '' && data.is_active !== undefined
          ? Number(data.is_active)
          : undefined,
    };
    setSearchParams(params);
    setCurrentPage(1);
    await fetchLegalEmployees(params, 1, pageSize);
  };

  const handleReset = () => {
    setLegalEmployees([]);
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
    await fetchLegalEmployees(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchLegalEmployees(searchParams, 1, size);
  };

  // ── Actions ──────────────────────────────────────────────────
  const handleEdit = (row: LegalEmployee) => {
    if (!canEdit) return;
    router.push(`/users/legal-users-add?edit=${row.id}`);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget) return;
    setIsUpdatingStatus(true);
    try {
      await updateLegalEmployee(statusTarget.id, {
        is_active: statusTarget.is_active === 1 ? 0 : 1,
      });
      setStatusTarget(null);
      showSuccess('updateSuccess');
      if (searchParams) {
        await fetchLegalEmployees(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteLegalEmployee(deleteTarget.id);
      setDeleteTarget(null);
      showSuccess('updateSuccess');
      if (searchParams) {
        await fetchLegalEmployees(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Options ──────────────────────────────────────────────────
  const statusOptions = useMemo(
    () => [
      { value: '1', label: tForm('isActive') },
      { value: '0', label: tForm('inactive') },
    ],
    [tForm],
  );

  const projectMap = useMemo(
    () =>
      new Map<number, string>(
        (dropdowns?.company_projects ?? []).map((p): [number, string] => [
          p.id,
          p.name,
        ]),
      ),
    [dropdowns],
  );

  // ── Form config ──────────────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'full_name',
      label: t('filters.fullName'),
      placeholder: t('filters.fullName'),
      type: 'text',
    },
    {
      name: 'mobile_number',
      label: t('filters.mobileNumber'),
      placeholder: t('filters.mobileNumber'),
      type: 'text',
      onlyNumbers: true,
      maxLength: 11,
    },
    {
      name: 'is_active',
      label: tForm('status'),
      placeholder: tForm('status'),
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

  // ── Table columns ────────────────────────────────────────────
  const columns: ColumnDef<LegalEmployee>[] = [
    ...(canEdit
      ? [
          {
            id: 'edit',
            label: t('columns.edit'),
            alwaysVisible: true,
            cell: (row: LegalEmployee) => (
              <button
                onClick={() => handleEdit(row)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                title={tForm('edit')}
              >
                <Pencil size={18} />
              </button>
            ),
          },
        ]
      : []),
    ...(canEdit
      ? [
          {
            id: 'active',
            label: t('columns.status'),
            cell: (row: LegalEmployee) => (
              <ToggleSwitch
                checked={row.is_active === 1}
                onChange={() => setStatusTarget(row)}
              />
            ),
          },
        ]
      : []),
    ...(canDelete
      ? [
          {
            id: 'delete',
            label: t('columns.delete'),
            cell: (row: LegalEmployee) => (
              <button
                onClick={() => setDeleteTarget(row)}
                className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                title={tForm('delete')}
              >
                <Trash2 size={18} />
              </button>
            ),
          },
        ]
      : []),
    {
      id: 'full_name',
      label: t('columns.fullName'),
      cellClassName: 'max-w-[220px]',
      cell: (row) => {
        const text = row.full_name ?? '';
        if (!text) return '—';
        return (
          <span className="block truncate w-full" title={text}>
            {text}
          </span>
        );
      },
      alwaysVisible: true,
    },
    {
      id: 'mobile_number',
      label: t('columns.mobileNumber'),
      accessorKey: 'mobile_number',
      cellClassName: 'whitespace-nowrap',
      alwaysVisible: true,
    },
    {
      id: 'project_name',
      label: t('columns.project'),
      cellClassName: 'whitespace-nowrap',
      cell: (row) =>
        row.project_id === ALL_PROJECTS_ID
          ? t('sharedProject')
          : (projectMap.get(row.project_id) ?? String(row.project_id)),
    },
    {
      id: 'created_by_name',
      label: t('columns.createdBy'),
      cellClassName: 'whitespace-nowrap',
      cell: (row) => row.created_by_name ?? '—',
      defaultVisible: false,
    },
    {
      id: 'created_at',
      label: t('columns.createdAt'),
      cellClassName: 'whitespace-nowrap',
      cell: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleString() : '—',
      defaultVisible: false,
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{ full_name: '', mobile_number: '', is_active: '' }}
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
          <DataTable<LegalEmployee>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={legalEmployees}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noLegalEmployeesFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="legal-users-manage-columns"
            showColumnToggle
            exportEnabled={canExport}
            exportEndpoint="/employees/legal-employees"
            exportParams={searchParams ?? {}}
            exportFileName="legal-employees"
          />
        </MainBox>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        open={!!deleteTarget}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteMessage', {
          name: deleteTarget?.full_name ?? '',
        })}
        confirmLabel={tForm('delete')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isDeleting}
        loadingLabel={tForm('updating')}
        onConfirm={confirmDelete}
        onCancel={() => {
          if (isDeleting) return;
          setDeleteTarget(null);
        }}
      />

      {/* Activate / deactivate confirmation */}
      <ConfirmModal
        open={!!statusTarget}
        title={
          statusTarget?.is_active === 1
            ? t('confirmDeactivateTitle')
            : t('confirmActivateTitle')
        }
        message={
          statusTarget?.is_active === 1
            ? t('confirmDeactivateMessage', {
                name: statusTarget?.full_name ?? '',
              })
            : t('confirmActivateMessage', {
                name: statusTarget?.full_name ?? '',
              })
        }
        confirmLabel={tForm('confirm')}
        cancelLabel={tForm('cancel')}
        confirmVariant={statusTarget?.is_active === 1 ? 'danger' : 'primary'}
        isLoading={isUpdatingStatus}
        loadingLabel={tForm('updating')}
        onConfirm={confirmStatusChange}
        onCancel={() => {
          if (isUpdatingStatus) return;
          setStatusTarget(null);
        }}
      />
    </div>
  );
}
