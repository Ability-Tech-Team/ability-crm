'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Trash2 } from 'lucide-react';
import ToggleSwitch from '@/src/components/ui/ToggleSwitch';
import AccessDenied from '@/src/components/AccessDenied';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Select from '@/src/components/ui/Select';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import { useCurrentUserPrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useIsSuperAdmin } from '@/src/hooks/useIsSuperAdmin';
import DefinitionPageHeader from '../_shared/components/DefinitionPageHeader';
import DefinitionSearchBar from '../_shared/components/DefinitionSearchBar';
import DefinitionStatusBadge from '../_shared/components/DefinitionStatusBadge';
import { useSubProjectsPage } from './hooks/useSubProjectsPage';
import { getSubProjectModalFields } from './schema';
import type { SubProjectDefinition } from './types';
import { getSubProjectInitialValues } from './utils';

/** The Sub-projects definition, for the Super Admin only (the route rule and the API's `@Roles`). */
export default function SubProjectsPage() {
  const t = useTranslations('subProjects');
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const isSuperAdmin = useIsSuperAdmin();
  const { firstAccessibleHref } = useCurrentUserPrivileges();
  const {
    projects,
    projectId,
    setProjectId,
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
  } = useSubProjectsPage();

  const projectOptions = useMemo(
    () =>
      projects.map((project) => ({
        value: String(project.id),
        label: project.name,
      })),
    [projects],
  );

  const modalFields = useMemo(
    () => getSubProjectModalFields(t, tForm, projectOptions, editTarget !== null),
    [editTarget, projectOptions, t, tForm],
  );

  const columns = useMemo<ColumnDef<SubProjectDefinition>[]>(
    () => [
      {
        id: 'reference_number',
        label: tForm('referenceNumber'),
        cell: (_, index) => index,
      },
      {
        id: 'project_code',
        label: t('code'),
        accessorKey: 'project_code',
        alwaysVisible: true,
      },
      {
        id: 'name',
        label: tForm('name'),
        cell: (row) => (
          <span className="inline-flex flex-wrap items-center gap-2">
            {row.name}
            {row.is_default ? (
              <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700">
                {t('default')}
              </span>
            ) : null}
          </span>
        ),
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
            {/* The default sub-project can't be turned off or deleted. */}
            {row.is_default ? null : (
              <>
                <button
                  type="button"
                  onClick={() => requestDelete(row)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
                >
                  <Trash2 size={14} />
                  {tForm('delete')}
                </button>
                <ToggleSwitch
                  checked={row.is_active === 1}
                  onChange={() => openStatusAction(row)}
                />
              </>
            )}
          </div>
        ),
      },
    ],
    [openEditModal, openStatusAction, requestDelete, t, tForm],
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
          canAdd={projectId !== null}
          onAdd={openAddModal}
        />

        <Select
          label={t('project')}
          name="sub_projects_project"
          options={projectOptions}
          value={projectId === null ? '' : String(projectId)}
          clearable={false}
          containerClassName="mb-4 max-w-sm"
          onChange={(event) => {
            const next = Number(event.target.value);
            if (!Number.isInteger(next) || next <= 0) return;
            // A search belongs to the project it ran in.
            handleClearSearch();
            setProjectId(next);
          }}
        />

        <DefinitionSearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={handleClearSearch}
          placeholder={t('searchPlaceholder')}
          searchLabel={tForm('search')}
          searchingLabel={tForm('searching')}
          isSearching={isSearching}
          statusValue={statusFilter}
          onStatusChange={setStatusFilter}
          allLabel={tCommon('all')}
          activeLabel={tForm('isActive')}
          inactiveLabel={tForm('inactive')}
        />

        <DataTable<SubProjectDefinition>
          columns={columns}
          data={displayData}
          rowKey={(row) => row.id}
          loading={isLoading || isSearching}
          emptyState={
            isLoading || isSearching ? tForm('loading') : tCommon('noDataFound')
          }
          itemsPerPage={10}
          persistKey="definitions-sub-projects-columns"
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
        initialValues={getSubProjectInitialValues(editTarget, projectId)}
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
