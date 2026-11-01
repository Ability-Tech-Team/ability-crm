'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import ToggleSwitch from '@/src/components/ui/ToggleSwitch';
import AccessDenied from '@/src/components/AccessDenied';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import DefinitionPageHeader from '../_shared/components/DefinitionPageHeader';
import DefinitionSearchBar from '../_shared/components/DefinitionSearchBar';

import { usePositionsPage } from './hooks/usePositionsPage';
import { getPositionsModalFields } from './schema';
import type { PositionOption } from './types';
import { getPositionInitialValues } from './utils';

export default function PositionsPage() {
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const privileges = useRoutePrivileges('/definitions/positions');
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const canDelete = privileges.hasPrivilege(PRIVILEGE_IDS.DELETE);
  const canManageActions = canEdit || canDelete;
  const {
    displayData,
    isLoading,
    modalOpen,
    editTarget,
    saving,
    deleteTarget,
    isDeleting,
    statusTarget,
    nextStatusValue,
    openStatusAction,
    clearStatusAction,
    confirmStatusChange,
    isUpdatingStatus,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isSearching,
    handleSearch,
    handleClearSearch,
    openAddModal,
    openEditModal,
    closeModal,
    requestDelete,
    clearDeleteTarget,
    handleSave,
    confirmDelete,
  } = usePositionsPage();

  const modalFields = useMemo(() => getPositionsModalFields(tForm), [tForm]);

  const columns = useMemo<ColumnDef<PositionOption>[]>(
    () => [
      {
        id: 'reference_number',
        label: tForm('referenceNumber'),
        cell: (_, index) => index,
      },
      {
        id: 'name',
        label: tForm('name'),
        accessorKey: 'name',
        alwaysVisible: true,
      },
      ...(canManageActions
        ? [
            {
              id: 'action',
              alwaysVisible: true,
              label: tForm('actions'),
              cell: (row: PositionOption) => {
                const isActive = Number(row.is_active ?? 1) === 1;

                return (
                  <div className="flex flex-wrap items-center gap-2">
                    {canEdit ? (
                      <button
                        onClick={() => openEditModal(row)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
                      >
                        <Pencil size={14} />
                        {tForm('edit')}
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        onClick={() => requestDelete(row)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
                      >
                        <Trash2 size={14} />
                        {tForm('delete')}
                      </button>
                    ) : null}
                    {canEdit ? (
                      <ToggleSwitch
                        checked={isActive}
                        onChange={() => openStatusAction(row)}
                      />
                    ) : null}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [
      canDelete,
      canEdit,
      canManageActions,
      openEditModal,
      openStatusAction,
      requestDelete,
      tForm,
    ],
  );

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6">
      <MainBox>
        <DefinitionPageHeader
          title={tForm('position')}
          addLabel={tForm('add')}
          canAdd={canAdd}
          onAdd={openAddModal}
        />

        <DefinitionSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          placeholder={tForm('searchByName')}
          searchLabel={tForm('search')}
          searchingLabel={tForm('searching')}
          isSearching={isSearching}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          allLabel={tCommon('all')}
          activeLabel={tForm('isActive')}
          inactiveLabel={tForm('inactive')}
        />

        <DataTable<PositionOption>
          columns={columns}
          data={displayData}
          rowKey={(row) => row.id}
          loading={isLoading || isSearching}
          emptyState={
            isLoading || isSearching ? tForm('loading') : tCommon('noDataFound')
          }
          itemsPerPage={10}
          persistKey="definitions-positions-columns"
          showColumnToggle
        />
      </MainBox>

      <AddEntryModal
        open={modalOpen}
        title={editTarget ? tForm('edit') : tForm('add')}
        fields={modalFields}
        saveLabel={
          saving
            ? editTarget
              ? tForm('updating')
              : tForm('adding')
            : tForm('save')
        }
        cancelLabel={tForm('cancel')}
        isSaving={saving}
        onSave={handleSave}
        onCancel={closeModal}
        initialValues={getPositionInitialValues(editTarget)}
      />

      <ConfirmModal
        open={!!statusTarget && nextStatusValue !== null}
        title={nextStatusValue === 1 ? tForm('activate') : tForm('deactivate')}
        message={
          statusTarget
            ? nextStatusValue === 1
              ? tForm('activateConfirm', { name: statusTarget.name })
              : tForm('deactivateConfirm', { name: statusTarget.name })
            : ''
        }
        confirmLabel={
          nextStatusValue === 1 ? tForm('activate') : tForm('deactivate')
        }
        cancelLabel={tForm('cancel')}
        confirmVariant={nextStatusValue === 1 ? 'success' : 'danger'}
        isLoading={isUpdatingStatus}
        onConfirm={confirmStatusChange}
        onCancel={clearStatusAction}
      />

      <ConfirmModal
        open={!!deleteTarget}
        title={tForm('delete')}
        message={`${tForm('delete')} "${deleteTarget?.name ?? ''}"?`}
        confirmLabel={tForm('delete')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isDeleting}
        onConfirm={confirmDelete}
        onCancel={clearDeleteTarget}
      />
    </div>
  );
}
