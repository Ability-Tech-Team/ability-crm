'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Search } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import DefinitionPageHeader from '../_shared/components/DefinitionPageHeader';

import { useErpCodesPage } from './hooks/useErpCodesPage';
import { getErpCodesModalFields } from './schema';
import type { ErpCodeOption } from './types';
import { getErpCodeInitialValues } from './utils';

/** ERP account codes; the permission tree's screen key is `/definitions/erp-codes`. */
export default function ErpCodesPage() {
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const privileges = useRoutePrivileges('/definitions/erp-codes');
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);

  const {
    displayData,
    isLoading,
    modalOpen,
    editTarget,
    saving,
    codeQuery,
    setCodeQuery,
    nameQuery,
    setNameQuery,
    isSearching,
    handleSearch,
    handleClearSearch,
    openAddModal,
    openEditModal,
    closeModal,
    handleSave,
  } = useErpCodesPage();

  const modalFields = useMemo(() => getErpCodesModalFields(tForm), [tForm]);

  const columns = useMemo<ColumnDef<ErpCodeOption>[]>(
    () => [
      {
        id: 'reference_number',
        label: tForm('referenceNumber'),
        cell: (_, index) => index,
      },
      {
        id: 'code',
        label: tForm('erpCode'),
        accessorKey: 'code',
        alwaysVisible: true,
      },
      {
        id: 'name',
        label: tForm('erpName'),
        accessorKey: 'name',
        alwaysVisible: true,
      },
      ...(canEdit
        ? [
            {
              id: 'action',
              alwaysVisible: true,
              label: tForm('actions'),
              cell: (row: ErpCodeOption) => (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => openEditModal(row)}
                    className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
                  >
                    <Pencil size={14} />
                    {tForm('edit')}
                  </button>
                </div>
              ),
            },
          ]
        : []),
    ],
    [canEdit, openEditModal, tForm],
  );

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  const hasAnyQuery = Boolean(codeQuery || nameQuery);

  return (
    <div className="p-6">
      <MainBox>
        <DefinitionPageHeader
          title={tForm('erpAccountCode')}
          addLabel={tForm('add')}
          canAdd={canAdd}
          onAdd={openAddModal}
        />

        <div className="mb-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={codeQuery}
            onChange={(event) => setCodeQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSearch();
            }}
            placeholder={tForm('searchByCode')}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <input
            type="text"
            value={nameQuery}
            onChange={(event) => setNameQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleSearch();
            }}
            placeholder={tForm('searchByName')}
            className="w-full max-w-xs rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
          <button
            onClick={() => void handleSearch()}
            disabled={isSearching}
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-400 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:opacity-50"
          >
            <Search size={16} />
            {isSearching ? tForm('searching') : tForm('search')}
          </button>
          {hasAnyQuery ? (
            <button
              onClick={handleClearSearch}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-200"
            >
              {tForm('clear')}
            </button>
          ) : null}
        </div>

        <DataTable<ErpCodeOption>
          columns={columns}
          data={displayData}
          rowKey={(row) => row.id}
          loading={isLoading || isSearching}
          emptyState={
            isLoading || isSearching ? tForm('loading') : tCommon('noDataFound')
          }
          itemsPerPage={10}
          persistKey="definitions-erp-codes-columns"
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
        initialValues={getErpCodeInitialValues(editTarget)}
      />
    </div>
  );
}
