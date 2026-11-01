'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2, Plus } from 'lucide-react';
import MainBox from '@/src/components/ui/MainBox';
import Input from '@/src/components/ui/Input';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import { getRoles, deleteRole, type RoleItem } from '@/src/services/roles';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { useRouter } from '@/src/i18n/navigation';
import { useSidebarStore } from '@/src/store/useSidebarStore';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

const LIMIT = 10;

export default function Roles() {
  const t = useTranslations('roles');
  const tCommon = useTranslations('common');
  const router = useRouter();
  const refreshSidebarMenu = useSidebarStore((s) => s.refreshSidebarMenu);
  const { success: showSuccess, error: showError } = useResponseMessage();

  const manageRolePrivileges = useRoutePrivileges(['/roles/manage', '/roles']);
  const addRolePrivileges = useRoutePrivileges('/roles/add');

  const canAddRole = addRolePrivileges.canAccess;

  const canEditRole = manageRolePrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.EDIT,
    'edit',
  ]);
  const canDeleteRole = manageRolePrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.DELETE,
    'delete',
  ]);
  const canExportRoles = manageRolePrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.EXPORT,
    'export',
  ]);
  const canManageActions = canEditRole || canDeleteRole;

  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<RoleItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Debounce search input — reset to page 1 on new query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchRoles = useCallback(
    async (search: string, currentPage: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getRoles(
          { role_name: search || undefined, page: currentPage, limit },
          controller.signal,
        );
        setRoles(Array.isArray(data.roles) ? data.roles : []);
        setTotal(data.totalCount);
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

  useEffect(() => {
    const cancel = runAfterCommit(() => {
      fetchRoles(debouncedSearch, page, pageSize);
    });

    return () => {
      cancel();
    };
  }, [debouncedSearch, page, pageSize, fetchRoles]);

  const getRoleName = (role: RoleItem) => role.name;

  const handleEditRole = (role: RoleItem) => {
    if (!canEditRole) return;
    const params = new URLSearchParams({ edit: role.id });
    if (role.en_name) params.set('en_name', role.en_name);
    if (role.ar_name) params.set('ar_name', role.ar_name);
    router.push(`/roles/add?${params.toString()}`);
  };

  const handleDeleteRole = (role: RoleItem) => {
    if (!canDeleteRole) return;
    setDeleteTarget(role);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteRole(deleteTarget.id);
      setDeleteTarget(null);
      showSuccess('deleteSuccess');
      refreshSidebarMenu();
      // Re-fetch current page
      fetchRoles(debouncedSearch, page, pageSize);
    } catch (err) {
      showError(err);
    } finally {
      setIsDeleting(false);
    }
  };

  const rolesExportParams = useMemo(
    () => ({ role_name: debouncedSearch || undefined }),
    [debouncedSearch],
  );

  const columns: ColumnDef<RoleItem>[] = [
    {
      id: 'roleName',
      label: t('roleName'),
      alwaysVisible: true,
      cell: (role) => <span className="font-medium">{getRoleName(role)}</span>,
    },
    ...(canManageActions
      ? [
          {
            id: 'actions',
            alwaysVisible: true,
            label: t('actions'),
            headerClassName: 'text-center w-32',
            cellClassName: 'text-center',
            cell: (role: RoleItem) => (
              <div className="flex items-center justify-center gap-2">
                {canEditRole && (
                  <button
                    onClick={() => handleEditRole(role)}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                    title={t('editRole')}
                    aria-label={t('editRole')}
                  >
                    <Pencil size={18} />
                  </button>
                )}
                {canDeleteRole && (
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
                    title={t('deleteRole')}
                    aria-label={t('deleteRole')}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <MainBox>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">{t('title')}</h1>
        {canAddRole && (
          <Button
            onClick={() => router.push('/roles/add')}
            variant="primary"
            size="md"
            className="flex items-center gap-2 whitespace-nowrap"
          >
            <Plus size={18} />
            {tCommon('add')}
          </Button>
        )}
      </div>

      <div className="mb-6">
        <Input
          label={t('searchRoles')}
          name="search"
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="max-w-md"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <DataTable<RoleItem>
        columns={columns}
        data={roles}
        rowKey={(row) => row.id}
        loading={isLoading}
        emptyState={t('noRolesFound')}
        itemsPerPage={LIMIT}
        pageSize={pageSize}
        currentPage={page}
        totalCount={total}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        persistKey="manage-roles-columns"
        showColumnToggle
        exportEnabled={canExportRoles}
        exportEndpoint="/get-roles"
        exportParams={rolesExportParams}
        exportFileName="roles"
      />

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteMessage', { name: deleteTarget?.name ?? '' })}
        confirmLabel={t('deleteRole')}
        cancelLabel={t('cancelDelete')}
        confirmVariant="danger"
        isLoading={isDeleting}
        loadingLabel={t('deleting')}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </MainBox>
  );
}
