'use client';

import { useTranslations } from 'next-intl';
import AccessDenied from '@/src/components/AccessDenied';
import MainBox from '@/src/components/ui/MainBox';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import RentalCompanyEntryModal from '@/src/components/RentalCompanyEntryModal';
import RentalCompanyAttachmentsModal from '@/src/components/RentalCompanyAttachmentsModal';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import DefinitionPageHeader from '../_shared/components/DefinitionPageHeader';
import DefinitionSearchBar from '../_shared/components/DefinitionSearchBar';
import RentalCompaniesTable from './components/RentalCompaniesTable';
import { useRentalCompaniesPage } from './hooks/useRentalCompaniesPage';

export default function RentalCompaniesPage() {
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const t = useTranslations('rentalCompanies');
  const privileges = useRoutePrivileges('/definitions/rental-companies');
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const {
    displayData,
    isLoading,
    modalOpen,
    closeAddModal,
    openAddModal,
    viewerTarget,
    openViewer,
    closeViewer,
    handleEditAttachment,
    handleDeleteAttachment,
    isUpdatingAttachment,
    saving,
    handleSave,
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
  } = useRentalCompaniesPage();

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6">
      <MainBox>
        <DefinitionPageHeader
          title={t('title')}
          description={t('description')}
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

        <RentalCompaniesTable
          data={displayData}
          tForm={tForm}
          t={t}
          canEdit={canEdit}
          isLoading={isLoading}
          isSearching={isSearching}
          onViewAttachments={openViewer}
          onToggleStatus={openStatusAction}
        />
      </MainBox>

      <RentalCompanyEntryModal
        key={modalOpen ? 'add-open' : 'add-closed'}
        open={modalOpen}
        title={t('addTitle')}
        saveLabel={saving ? tForm('adding') : tForm('save')}
        cancelLabel={tForm('cancel')}
        onSave={handleSave}
        onCancel={closeAddModal}
        isSaving={saving}
      />

      <RentalCompanyAttachmentsModal
        open={!!viewerTarget}
        companyName={viewerTarget?.name ?? t('title')}
        attachments={viewerTarget?.attachments ?? []}
        onClose={closeViewer}
        canEdit={canEdit}
        onEditAttachment={handleEditAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        isUpdating={isUpdatingAttachment}
      />

      <ConfirmModal
        open={!!statusTarget && nextStatusValue !== null}
        title={nextStatusValue === 1 ? t('activate') : t('deactivate')}
        message={
          statusTarget
            ? nextStatusValue === 1
              ? t('activateConfirm', { name: statusTarget.name })
              : t('deactivateConfirm', { name: statusTarget.name })
            : ''
        }
        confirmLabel={nextStatusValue === 1 ? t('activate') : t('deactivate')}
        cancelLabel={tForm('cancel')}
        subtitle={nextStatusValue === 0 ? t('deactivateNote') : undefined}
        confirmVariant={nextStatusValue === 1 ? 'success' : 'danger'}
        isLoading={isUpdatingStatus}
        onConfirm={confirmStatusChange}
        onCancel={clearStatusAction}
      />
    </div>
  );
}
