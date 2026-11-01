'use client';

import { useEffect, useMemo, useState } from 'react';
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
import {
  formatErpAccountCode,
  getAllErpAccountCodes,
  type ErpAccountCode,
} from '@/src/services/erpAccountCodes';
import DefinitionPageHeader from '../_shared/components/DefinitionPageHeader';
import DefinitionSearchBar from '../_shared/components/DefinitionSearchBar';

import { useInvoiceTypesPage } from './hooks/useInvoiceTypesPage';
import { getInvoiceTypesModalFields } from './schema';
import type { InvoiceTypeOption } from './types';
import { getInvoiceTypeInitialValues } from './utils';

export default function InvoiceTypesPage() {
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const privileges = useRoutePrivileges('/definitions/invoice-types');
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
    clearDeleteTarget,
    handleSave,
    confirmDelete,
  } = useInvoiceTypesPage();

  const [erpAccountCodes, setErpAccountCodes] = useState<ErpAccountCode[]>(
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    getAllErpAccountCodes(controller.signal)
      .then((data) => setErpAccountCodes(data))
      .catch(() => {
        // silently ignore — the select will simply be empty
      });
    return () => controller.abort();
  }, []);

  const erpAccountCodeOptions = useMemo(
    () =>
      erpAccountCodes.map((code) => ({
        value: String(code.id),
        label: formatErpAccountCode(code),
      })),
    [erpAccountCodes],
  );

  const modalFields = useMemo(
    () => getInvoiceTypesModalFields(tForm, erpAccountCodeOptions),
    [tForm, erpAccountCodeOptions],
  );

  const columns = useMemo<ColumnDef<InvoiceTypeOption>[]>(
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
        id: 'description',
        label: tForm('description'),
        accessorKey: 'description',
      },
      {
        id: 'erp_account_code',
        label: tForm('erpAccountCode'),
        cell: (row: InvoiceTypeOption) =>
          formatErpAccountCode(row.erp_account_codes) || '—',
      },
      ...(canManageActions
        ? [
            {
              id: 'action',
              alwaysVisible: true,
              label: tForm('actions'),
              cell: (row: InvoiceTypeOption) => {
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
          title={tForm('invoiceTypes')}
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

        <DataTable<InvoiceTypeOption>
          columns={columns}
          data={displayData}
          rowKey={(row) => row.id}
          loading={isLoading || isSearching}
          emptyState={
            isLoading || isSearching ? tForm('loading') : tCommon('noDataFound')
          }
          itemsPerPage={10}
          persistKey="definitions-invoice-types-columns"
          showColumnToggle
          exportEnabled
          exportEndpoint="/definitions/search/invoice-types"
          exportParams={{
            name: searchQuery.trim() || undefined,
            is_active:
              statusFilter === 'all'
                ? undefined
                : statusFilter === 'active'
                  ? 1
                  : 0,
          }}
          exportFileName="invoice-types"
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
        initialValues={getInvoiceTypeInitialValues(editTarget)}
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
