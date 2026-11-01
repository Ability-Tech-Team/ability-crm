'use client';

import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import AccessDenied from '@/src/components/AccessDenied';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { hasActiveRentalForUnit } from '@/src/services/rentals';
import RentalAddResultsTable from './components/RentalAddResultsTable';
import { useRentalUnitSearch } from './hooks/useRentalUnitSearch';
import { searchUnitSchema, type SearchFormData } from './schema';
import type { UnitRow } from './types';
import { storeRentalCreateContext } from './utils';

export default function AddRentalPage() {
  const t = useTranslations('rentals');
  const tForm = useTranslations('form');
  const router = useRouter();
  const privileges = useRoutePrivileges('/rentals/add');
  const {
    rows,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    error,
    hasSearched,
    submitSearch,
    resetSearch,
    changePage,
    changePageSize,
  } = useRentalUnitSearch(t('loadError'));

  const handleSubmit = async (data: SearchFormData) => {
    await submitSearch({
      unit_number: data.unit_number || undefined,
      is_exact: data.is_exact === '1',
    });
  };

  const handleAddReservation = async (row: UnitRow) => {
    if (row.isLocked === 1) {
      toast.error(t('unitLockedError'));
      return;
    }

    if (row.isEligibleForRent !== 1) {
      toast.error(t('unitNotEligibleError'));
      return;
    }

    const alreadyBooked = await hasActiveRentalForUnit(row.unitId);
    if (alreadyBooked) {
      toast.error(t('activeBookingExistsError'));
      return;
    }

    storeRentalCreateContext(row);
    router.push(
      `/rentals/add/create?unitId=${row.unitId}&customerId=${row.customerId}`,
    );
  };

  const handleViewHistory = (row: UnitRow) => {
    router.push(
      `/rentals/search?unit_number=${encodeURIComponent(row.unitNumber)}`,
    );
  };

  const fields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: t('searchPlaceholder'),
      type: 'text',
    },
    {
      name: 'is_exact',
      label: tForm('isExact'),
      fieldType: 'checkbox',
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: tForm('search'),
      loadingLabel: tForm('searching'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('clear'),
      type: 'reset',
      variant: 'secondary',
    },
  ];

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Form
        title={`${t('title')} - ${tForm('add')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{ unit_number: '', is_exact: '1' }}
        validationSchema={searchUnitSchema}
        onSubmit={handleSubmit}
        onReset={resetSearch}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && (
        <RentalAddResultsTable
          rows={rows}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          isLoading={isLoading}
          onPageChange={changePage}
          onPageSizeChange={changePageSize}
          onAddReservation={handleAddReservation}
          onViewHistory={handleViewHistory}
        />
      )}
    </div>
  );
}
