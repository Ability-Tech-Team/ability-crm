'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil } from 'lucide-react';
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

import { useUnitBlockCategoriesPage } from './hooks/useUnitBlockCategoriesPage';
import { getUnitBlockCategoriesModalFields } from './schema';
import type { UnitBlockCategoryOption } from './types';
import { getUnitBlockCategoryInitialValues } from './utils';

/** projectEnums.ALL_PROJECTS — the row is shared with every project. */
const ALL_PROJECTS_ID = 1;

export default function UnitBlockCategoriesPage() {
  const t = useTranslations('unitBlockCategories');
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const privileges = useRoutePrivileges('/definitions/unit-block-categories');
  // Legal users only. 64 hangs off the /unit-blocks/add menu item, not this
  // one — the same place the unit-blocks pages read it from.
  const blockTypePrivileges = useRoutePrivileges('/unit-blocks/add');
  const isLegalUser = blockTypePrivileges.hasPrivilege(
    PRIVILEGE_IDS.LEGAL_BLOCK,
  );
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  // No delete here: a category is retired with the active toggle, not removed.
  const canManageActions = canEdit;
  const {
    displayData,
    isLoading,
    modalOpen,
    editTarget,
    saving,
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
    handleSave,
  } = useUnitBlockCategoriesPage();

  const modalFields = useMemo(
    () => getUnitBlockCategoriesModalFields(tForm),
    [tForm],
  );

  const columns = useMemo<ColumnDef<UnitBlockCategoryOption>[]>(
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
      {
        id: 'scope',
        label: t('columns.scope'),
        cellClassName: 'whitespace-nowrap',
        cell: (row: UnitBlockCategoryOption) =>
          row.project_id === ALL_PROJECTS_ID
            ? t('sharedProject')
            : t('ownProject'),
      },
      ...(canManageActions
        ? [
            {
              id: 'action',
              alwaysVisible: true,
              label: tForm('actions'),
              cell: (row: UnitBlockCategoryOption) => {
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
      canEdit,
      canManageActions,
      openEditModal,
      openStatusAction,
      t,
      tForm,
    ],
  );

  if (!privileges.canAccess || !isLegalUser) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6">
      <MainBox>
        <DefinitionPageHeader
          title={t('title')}
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

        <DataTable<UnitBlockCategoryOption>
          columns={columns}
          data={displayData}
          rowKey={(row) => row.id}
          loading={isLoading || isSearching}
          emptyState={
            isLoading || isSearching ? tForm('loading') : tCommon('noDataFound')
          }
          itemsPerPage={10}
          persistKey="definitions-unit-block-categories-columns"
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
        initialValues={getUnitBlockCategoryInitialValues(editTarget)}
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
    </div>
  );
}
