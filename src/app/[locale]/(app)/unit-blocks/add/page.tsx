'use client';

import { useTranslations } from 'next-intl';
import Form from '@/src/components/Form';
import MainBox from '@/src/components/ui/MainBox';
import UnitsTable from './components/UnitsTable';
import { useUnitBlocksAddPage } from './hooks/useUnitBlocksAddPage';
import {
  getUnitSearchButtons,
  getUnitSearchFields,
  LIMIT,
  unitSearchSchema,
} from './schema';
import { UNIT_SEARCH_INITIAL_VALUES } from './utils';

export default function UnitBlocksAddPage() {
  const t = useTranslations('unitBlocks');
  const tForm = useTranslations('form');
  const tUnits = useTranslations('units');
  const {
    canAdd,
    units,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    hasSearched,
    rentalCompanyMap,
    handleSubmit,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
    openUnit,
  } = useUnitBlocksAddPage();

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={t('addTitle')}
        fields={getUnitSearchFields(tForm)}
        buttons={getUnitSearchButtons(tForm)}
        initialValues={UNIT_SEARCH_INITIAL_VALUES}
        validationSchema={unitSearchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {hasSearched && (
        <MainBox>
          <UnitsTable
            rows={units}
            t={t}
            tUnits={tUnits}
            rentalCompanyMap={rentalCompanyMap}
            isLoading={isLoading}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onRowClick={canAdd ? openUnit : undefined}
          />
        </MainBox>
      )}
    </div>
  );
}
