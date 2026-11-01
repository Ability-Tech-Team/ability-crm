'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import AccessDenied from '@/src/components/AccessDenied';
import MainBox from '@/src/components/ui/MainBox';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import DefinitionPageHeader from '../_shared/components/DefinitionPageHeader';
import DefinitionSearchBar from '../_shared/components/DefinitionSearchBar';
import LocationsTable from './components/LocationsTable';
import { useLocationPage } from './hooks/useLocationPage';
import { getLocationModalFields } from './schema';
import { getLocationInitialValues } from './utils';

export default function LocationPage() {
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const tLoc = useTranslations('locations');
  const privileges = useRoutePrivileges('/definitions/location');
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const canDelete = privileges.hasPrivilege(PRIVILEGE_IDS.DELETE);
  const {
    locationTypeOptions,
    isLoading,
    expanded,
    toggleExpand,
    modalOpen,
    editTarget,
    parentForNew,
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
    flattenedData,
    openAddRootModal,
    openAddChildModal,
    openEditModal,
    closeModal,
    requestDelete,
    clearDeleteTarget,
    handleSave,
    confirmDelete,
  } = useLocationPage();

  const modalFields = useMemo(
    () => getLocationModalFields(tForm, tLoc, locationTypeOptions),
    [locationTypeOptions, tForm, tLoc],
  );

  const modalTitle = useMemo(() => {
    if (editTarget) {
      return tForm('edit');
    }

    if (parentForNew != null) {
      return tLoc('addChild');
    }

    return tLoc('addRoot');
  }, [editTarget, parentForNew, tForm, tLoc]);

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6">
      <MainBox>
        <DefinitionPageHeader
          title={tLoc('title')}
          addLabel={tLoc('addRoot')}
          canAdd={canAdd}
          onAdd={openAddRootModal}
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

        <LocationsTable
          rows={flattenedData}
          tForm={tForm}
          tLoc={tLoc}
          expanded={expanded}
          canAdd={canAdd}
          canEdit={canEdit}
          canDelete={canDelete}
          isLoading={isLoading}
          isSearching={isSearching}
          onToggleExpand={toggleExpand}
          onAddChild={openAddChildModal}
          onEdit={openEditModal}
          onDelete={requestDelete}
          onToggleStatus={openStatusAction}
        />
      </MainBox>

      <AddEntryModal
        open={modalOpen}
        title={modalTitle}
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
        initialValues={getLocationInitialValues(editTarget)}
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
