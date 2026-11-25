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
import { useCurrentUserPrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useIsSuperAdmin } from '@/src/hooks/useIsSuperAdmin';
import DefinitionPageHeader from '../_shared/components/DefinitionPageHeader';
import DefinitionSearchBar from '../_shared/components/DefinitionSearchBar';
import DefinitionStatusBadge from '../_shared/components/DefinitionStatusBadge';
import { useProjectsPage } from './hooks/useProjectsPage';
import { getProjectModalFields } from './schema';
import type { ProjectDefinition } from './types';
import { getProjectInitialValues } from './utils';

/** The Projects definition, for the Super Admin only (the route rule and the API's `@Roles`). */
export default function ProjectsPage() {
  const t = useTranslations('projects');
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const isSuperAdmin = useIsSuperAdmin();
  const { firstAccessibleHref } = useCurrentUserPrivileges();
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
  } = useProjectsPage();

  const modalFields = useMemo(
    () => getProjectModalFields(t, tForm, editTarget !== null),
    [editTarget, t, tForm],
  );

  const columns = useMemo<ColumnDef<ProjectDefinition>[]>(
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
      { id: 'company_code', label: t('companyCode'), accessorKey: 'company_code' },
      { id: 'project_code', label: t('projectCode'), accessorKey: 'project_code' },
      { id: 'total_units', label: t('totalUnits'), accessorKey: 'total_units' },
      {
        id: 'occupancy',
        label: t('occupancy'),
        cell: (row) => `${row.occupancy}%`,
      },
      {
        id: 'status',
        label: tForm('status'),
        cell: (row) => (
          <DefinitionStatusBadge
            isActive={row.is_active}
            activeLabel={tForm('isActive')}
            inactiveLabel={tForm('inactive')}
          />
        ),
      },
      {
        id: 'action',
        alwaysVisible: true,
        label: tForm('actions'),
        cell: (row) => (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => openEditModal(row)}
              className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
            >
              <Pencil size={14} />
              {tForm('edit')}
            </button>
            <ToggleSwitch
              checked={row.is_active === 1}
              onChange={() => openStatusAction(row)}
            />
          </div>
        ),
      },
    ],
    [openEditModal, openStatusAction, t, tForm],
  );

  if (!isSuperAdmin) {
    return <AccessDenied fallbackHref={firstAccessibleHref} />;
  }

  return (
    <div className="p-6">
      <MainBox>
        <DefinitionPageHeader
          title={t('title')}
          description={t('description')}
          addLabel={tForm('add')}
          canAdd
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

        <DataTable<ProjectDefinition>
          columns={columns}
          data={displayData}
          rowKey={(row) => row.id}
          loading={isLoading || isSearching}
          emptyState={
            isLoading || isSearching ? tForm('loading') : tCommon('noDataFound')
          }
          itemsPerPage={10}
          persistKey="definitions-projects-columns"
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
        initialValues={getProjectInitialValues(editTarget)}
      />

      <ConfirmModal
        open={!!statusTarget && nextStatusValue !== null}
        title={nextStatusValue === 1 ? tForm('activate') : tForm('deactivate')}
        message={
          statusTarget
            ? nextStatusValue === 1
              ? tForm('activateConfirm', { name: statusTarget.name })
              : t('deactivateConfirm', { name: statusTarget.name })
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
