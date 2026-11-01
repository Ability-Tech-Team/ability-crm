'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, KeyRound } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import ToggleSwitch from '@/src/components/ui/ToggleSwitch';
import {
  getEmployees,
  sendPasswordResetMail,
  updateEmployee,
  type Employee,
} from '@/src/services/employees';
import { useRouter } from '@/src/i18n/navigation';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getRoles, type RoleItem } from '@/src/services/roles';

const LIMIT = 10;

const searchSchema = z.object({
  user_name: z.string().optional(),
  role_id: z.string().optional(),
  is_locked: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function ManageUsers() {
  const t = useTranslations('users');
  const tForm = useTranslations('form');
  const router = useRouter();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const userPrivileges = useRoutePrivileges('/users/manage');
  const canEditUser = userPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.EDIT,
    'edit',
  ]);
  const canManageUserState = canEditUser;
  const canResetPassword = canEditUser;
  const canExportUsers = userPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.EXPORT,
    'export',
  ]);

  // ── Search & data state ──────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const [roleOptions, setRoleOptions] = useState<
    { value: string; label: string }[]
  >([]);

  useEffect(() => {
    const controller = new AbortController();

    getRoles({ limit: 1000 }, controller.signal)
      .then(({ roles }) =>
        setRoleOptions(
          roles.map((role: RoleItem) => ({
            value: role.id,
            label: role.name,
          })),
        ),
      )
      .catch(() => setRoleOptions([]));

    return () => controller.abort();
  }, []);

  const statusOptions = useMemo(
    () => [
      { value: '0', label: tForm('isActive') },
      { value: '1', label: tForm('inactive') },
    ],
    [tForm],
  );

  // ── Modal state ──────────────────────────────────────────────
  const [lockTarget, setLockTarget] = useState<Employee | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Employee | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [resettingUserId, setResettingUserId] = useState<string | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchEmployees = useCallback(
    async (params: SearchFormData | null, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getEmployees(
          {
            name: params?.user_name || undefined,
            role_id: params?.role_id || undefined,
            is_locked:
              params?.is_locked !== '' && params?.is_locked !== undefined
                ? Number(params.is_locked)
                : undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setEmployees(data.employees);
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
    await fetchEmployees(data, 1, pageSize);
  };

  const handleReset = () => {
    setEmployees([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
  };

  const handlePageChange = async (page: number) => {
    if (!hasSearched || !searchParams || page === currentPage) return;
    setCurrentPage(page);
    await fetchEmployees(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!hasSearched || !searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchEmployees(searchParams, 1, size);
  };

  const usersExportParams = useMemo(
    () =>
      searchParams
        ? {
            name: searchParams.user_name || undefined,
            role_id: searchParams.role_id || undefined,
            is_locked:
              searchParams.is_locked !== '' &&
              searchParams.is_locked !== undefined
                ? Number(searchParams.is_locked)
                : undefined,
          }
        : {},
    [searchParams],
  );

  // ── Actions ──────────────────────────────────────────────────
  const handleEdit = (employee: Employee) => {
    if (!canEditUser) return;
    router.push(`/users/add?edit=${employee.id}`);
  };

  const confirmLock = async () => {
    if (!lockTarget) return;
    setIsProcessing(true);
    try {
      await updateEmployee(lockTarget.id, {
        is_locked: lockTarget.is_locked === 1 ? 0 : 1,
      });
      setLockTarget(null);
      showSuccess('updateSuccess');
      if (hasSearched) {
        fetchEmployees(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await updateEmployee(deleteTarget.id, {
        is_deleted: deleteTarget.is_deleted === 1 ? 0 : 1,
      });
      setDeleteTarget(null);
      showSuccess('updateSuccess');
      if (hasSearched) {
        fetchEmployees(searchParams, currentPage, pageSize);
      }
    } catch (err) {
      showError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPasswordMail = async (employeeId: string) => {
    if (!canResetPassword) return;
    setError('');
    setResettingUserId(employeeId);
    try {
      await sendPasswordResetMail(employeeId);
      showSuccess('resetPasswordSuccess');
    } catch (err) {
      showError(err);
    } finally {
      setResettingUserId(null);
    }
  };

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'user_name',
      label: tForm('username'),
      placeholder: t('searchPlaceholder'),
      type: 'text',
    },
    {
      name: 'role_id',
      label: tForm('role'),
      placeholder: tForm('role'),
      fieldType: 'select',
      options: roleOptions,
    },
    {
      name: 'is_locked',
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
  const columns: ColumnDef<Employee>[] = [
    ...(canEditUser
      ? [
          {
            id: 'edit',
            label: t('columns.edit'),
            alwaysVisible: true,
            cell: (row: Employee) => (
              <button
                onClick={() => handleEdit(row)}
                className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                title={t('editUser')}
              >
                <Pencil size={18} />
              </button>
            ),
          },
        ]
      : []),
    ...(canManageUserState
      ? [
          {
            id: 'active',
            label: t('columns.status'),
            cell: (row: Employee) => (
              <ToggleSwitch
                checked={row.is_locked !== 1}
                onChange={() => setLockTarget(row)}
              />
            ),
          },
        ]
      : []),

    ...(canResetPassword
      ? [
          {
            id: 'reset_password',
            label: t('columns.resetPassword'),
            cell: (row: Employee) => (
              <button
                onClick={() => handleResetPasswordMail(row.id)}
                disabled={resettingUserId === row.id}
                className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-all duration-200 hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed"
                title={t('sendResetPasswordMail')}
              >
                <KeyRound size={18} />
              </button>
            ),
          },
        ]
      : []),
    {
      id: 'user_name',
      label: t('columns.userName'),
      accessorKey: 'user_name',
      alwaysVisible: true,
    },
    {
      id: 'full_name',
      label: t('columns.fullName'),
      accessorKey: 'full_name',
    },
    {
      id: 'phone_number',
      label: t('columns.phoneNumber'),
      accessorKey: 'phone_number',
      cell: (row) => row.phone_number ?? '—',
    },
    {
      id: 'email',
      label: t('columns.email'),
      accessorKey: 'email',
    },
    {
      id: 'is_male',
      label: t('columns.gender'),
      cell: (row) => (row.is_male === 1 ? t('male') : t('female')),
    },
    {
      id: 'department_id',
      label: t('columns.department'),
      cell: (row) => row.department_name ?? '—',
    },
    {
      id: 'position_id',
      label: t('columns.position'),
      cell: (row) => row.position_name ?? '—',
    },
    {
      id: 'last_login_date',
      label: t('columns.lastLogin'),
      cell: (row) =>
        row.last_login_date
          ? new Date(row.last_login_date).toLocaleString()
          : '—',
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{ user_name: '', role_id: '', is_locked: '' }}
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
          <DataTable<Employee>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={employees}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noUsersFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="manage-users-columns"
            showColumnToggle
            exportEnabled={canExportUsers}
            exportEndpoint="/get-employees"
            exportParams={usersExportParams}
            exportFileName="users"
          />
        </MainBox>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteMessage', {
          name: deleteTarget?.full_name ?? '',
        })}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancelAction')}
        confirmVariant={deleteTarget?.is_deleted === 1 ? 'primary' : 'danger'}
        isLoading={isDeleting}
        loadingLabel={t('processing')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Lock confirmation modal */}
      <ConfirmModal
        open={!!lockTarget}
        title={
          lockTarget?.is_locked === 1
            ? t('confirmUnlockTitle')
            : t('confirmLockTitle')
        }
        message={
          lockTarget?.is_locked === 1
            ? t('confirmUnlockMessage', {
                name: lockTarget?.full_name ?? '',
              })
            : t('confirmLockMessage', {
                name: lockTarget?.full_name ?? '',
              })
        }
        confirmLabel={t('confirm')}
        cancelLabel={t('cancelAction')}
        confirmVariant={lockTarget?.is_locked === 1 ? 'primary' : 'danger'}
        isLoading={isProcessing}
        loadingLabel={t('processing')}
        onConfirm={confirmLock}
        onCancel={() => setLockTarget(null)}
      />
    </div>
  );
}
