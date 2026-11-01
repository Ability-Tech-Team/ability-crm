'use client';

import { useTranslations } from 'next-intl';
import { Ban } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import Form from '@/src/components/Form';
import Button from '@/src/components/ui/Button';
import MainBox from '@/src/components/ui/MainBox';
import BlockedUnitsTable from './components/BlockedUnitsTable';
import BlocksTable from './components/BlocksTable';
import { useUnitBlocksSearchPage } from './hooks/useUnitBlocksSearchPage';
import {
  getSearchButtons,
  getSearchFields,
  LIMIT,
  searchSchema,
  TABS,
} from './schema';
import { getSearchInitialValues } from './utils';

export default function UnitBlocksSearchPage() {
  const t = useTranslations('unitBlocks');
  const tForm = useTranslations('form');
  const tUnits = useTranslations('units');
  const tCommon = useTranslations('common');
  const {
    privileges,
    canRead,
    canExport,
    canEdit,
    canUseTab,
    canSeeBothKinds,
    activeTab,
    unitBlocks,
    units,
    totalCount,
    currentPage,
    pageSize,
    searchParams,
    unitExportParams,
    isLoading,
    error,
    hasSearched,
    categoryOptions,
    assigneeOptions,
    projectOptions,
    statusOptions,
    rentalCompanyMap,
    handleSubmit,
    handleTabChange,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
  } = useUnitBlocksSearchPage();

  const visibleFields = getSearchFields(
    t,
    tForm,
    tCommon,
    categoryOptions,
    projectOptions,
    assigneeOptions,
    statusOptions,
  ).filter(
    (field) =>
      !activeTab.hiddenFieldNames.includes(field.name) &&
      (field.name !== 'block_kind' || canSeeBothKinds),
  );

  if (!privileges.canAccess || !canRead) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        // Remounting on tab change resets the filters, so a value typed into a
        // field the new tab hides cannot linger in state and be submitted.
        key={activeTab.id}
        title={`${t('title')} - ${tForm('search')}`}
        fields={visibleFields}
        buttons={getSearchButtons(tForm)}
        initialValues={getSearchInitialValues(activeTab.defaultIsActive)}
        validationSchema={searchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        autoSubmit
        // The tabs swap the filters as well as the table, so they sit above
        // the fields rather than in the children slot below them.
        headerContent={
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => {
              const disabled = !canUseTab(tab);

              return (
                <Button
                  key={tab.id}
                  type="button"
                  variant={tab.id === activeTab.id ? 'primary' : 'secondary'}
                  disabled={disabled}
                  title={disabled ? t('tabs.unavailable') : undefined}
                  onClick={() => handleTabChange(tab.id)}
                >
                  {t(tab.labelKey)}
                </Button>
              );
            })}
          </div>
        }
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && (
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <Ban size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t(activeTab.titleKey)} ({totalCount})
            </h2>
          </div>

          {activeTab.showsUnits ? (
            <BlockedUnitsTable
              // Each tab stores its own column visibility, and the stored ids
              // are read once on mount, so the key must change with it.
              key={activeTab.id}
              rows={units}
              t={t}
              tUnits={tUnits}
              rentalCompanyMap={rentalCompanyMap}
              isLoading={isLoading}
              itemsPerPage={LIMIT}
              pageSize={pageSize}
              currentPage={currentPage}
              totalCount={totalCount}
              persistKey={activeTab.persistKey}
              canEdit={canEdit}
              canExport={canExport}
              exportParams={unitExportParams}
              emptyState={tCommon('noDataFound')}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          ) : (
            <BlocksTable
              key={activeTab.id}
              rows={unitBlocks}
              t={t}
              tForm={tForm}
              hiddenColumnIds={activeTab.hiddenColumnIds}
              isLoading={isLoading}
              itemsPerPage={LIMIT}
              pageSize={pageSize}
              currentPage={currentPage}
              totalCount={totalCount}
              persistKey={activeTab.persistKey}
              canEdit={canEdit}
              canExport={canExport}
              exportParams={searchParams ?? {}}
              emptyState={t('noBlocksFound')}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
            />
          )}
        </MainBox>
      )}
    </div>
  );
}
