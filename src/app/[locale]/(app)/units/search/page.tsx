'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getUnits, type Unit } from '@/src/services/units';
import { useSelectedUnitStore } from '@/src/store/useSelectedUnitStore';

const LIMIT = 10;

const searchSchema = z.object({
  unit_number: z.string().optional(),
  is_exact: z.string().optional(),
  project_id: z.string().optional(),
  is_active: z.string().optional(),
  is_locked: z.string().optional(),
  is_furnished: z.string().optional(),
  is_eligible_for_rent: z.string().optional(),
  rental_company_id: z.string().optional(),
  delivery_date: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function UnitsSearch() {
  const t = useTranslations('units');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const router = useRouter();
  const { error: showError } = useResponseMessage();
  const setSelectedUnit = useSelectedUnitStore((s) => s.setUnit);
  const unitPrivileges = useRoutePrivileges('/units/search');
  const canReadUnits = unitPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExportUnits = unitPrivileges.hasPrivilege(PRIVILEGE_IDS.EXPORT);

  const [units, setUnits] = useState<Unit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const projectOptions = useMemo(
    () =>
      (dropdowns?.company_projects ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const isActiveOptions = useMemo(
    () => [
      { value: '1', label: tForm('isActive') },
      { value: '0', label: tForm('inactive') },
    ],
    [tForm],
  );

  const isLockedOptions = useMemo(
    () => [
      { value: '1', label: t('yes') },
      { value: '0', label: t('no') },
    ],
    [t],
  );

  const isEligibleForRentOptions = useMemo(
    () => [
      { value: '1', label: t('yes') },
      { value: '0', label: t('no') },
    ],
    [t],
  );

  const rentalCompanyOptions = useMemo(
    () =>
      (dropdowns?.rental_companies ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const rentalCompanyMap = useMemo(
    () =>
      new Map<number, string>(
        (dropdowns?.rental_companies ?? []).map((d): [number, string] => [
          d.id,
          d.name,
        ]),
      ),
    [dropdowns],
  );

  const fetchUnits = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getUnits(
          {
            unit_number: params.unit_number || undefined,
            is_exact: params.is_exact === '1',
            project_id: params.project_id
              ? Number(params.project_id)
              : undefined,
            is_active:
              params.is_active !== '' ? Number(params.is_active) : undefined,
            is_locked:
              params.is_locked !== '' ? Number(params.is_locked) : undefined,
            is_furnished: params.is_furnished === '1' ? 1 : undefined,
            is_eligible_for_rent:
              params.is_eligible_for_rent !== ''
                ? Number(params.is_eligible_for_rent)
                : undefined,
            rental_company_id: params.rental_company_id
              ? Number(params.rental_company_id)
              : undefined,
            delivery_date: params.delivery_date || undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setUnits(data.units);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          showError(err);
          setError(t('loadError'));
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [showError, t],
  );

  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    setSearchParams(data);
    setCurrentPage(1);
    await fetchUnits(data, 1, pageSize);
  };

  const handleReset = () => {
    setUnits([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
  };

  const handlePageChange = async (page: number) => {
    if (!searchParams || page === currentPage) return;
    setCurrentPage(page);
    await fetchUnits(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchUnits(searchParams, 1, size);
  };

  const unitsExportParams = useMemo(
    () =>
      searchParams
        ? {
            unit_number: searchParams.unit_number || undefined,
            is_exact: searchParams.is_exact === '1' ? 1 : 0,
            project_id: searchParams.project_id
              ? Number(searchParams.project_id)
              : undefined,
            is_active:
              searchParams.is_active !== ''
                ? Number(searchParams.is_active)
                : undefined,
            is_locked:
              searchParams.is_locked !== ''
                ? Number(searchParams.is_locked)
                : undefined,
            is_furnished: searchParams.is_furnished === '1' ? 1 : undefined,
            is_eligible_for_rent:
              searchParams.is_eligible_for_rent !== ''
                ? Number(searchParams.is_eligible_for_rent)
                : undefined,
            rental_company_id: searchParams.rental_company_id
              ? Number(searchParams.rental_company_id)
              : undefined,
            delivery_date: searchParams.delivery_date || undefined,
          }
        : {},
    [searchParams],
  );

  const fields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'is_exact',
      label: tForm('isExact'),
      fieldType: 'checkbox',
    },
    {
      name: 'project_id',
      label: tForm('project'),
      placeholder: tForm('project'),
      fieldType: 'select',
      options: projectOptions,
    },
    {
      name: 'is_active',
      label: tForm('isActive'),
      placeholder: tForm('isActive'),
      fieldType: 'select',
      options: isActiveOptions,
    },
    {
      name: 'is_locked',
      label: t('columns.isLocked'),
      placeholder: t('columns.isLocked'),
      fieldType: 'select',
      options: isLockedOptions,
    },
    {
      name: 'is_furnished',
      label: tForm('isFurnished'),
      fieldType: 'checkbox',
    },
    {
      name: 'is_eligible_for_rent',
      label: t('columns.isEligibleForRent'),
      placeholder: t('columns.isEligibleForRent'),
      fieldType: 'select',
      options: isEligibleForRentOptions,
    },
    {
      name: 'rental_company_id',
      label: t('columns.rentalCompany'),
      placeholder: t('columns.rentalCompany'),
      fieldType: 'select',
      options: rentalCompanyOptions,
    },
    {
      name: 'delivery_date',
      label: tForm('deliveryDate'),
      placeholder: tForm('deliveryDate'),
      type: 'date',
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

  const columns: ColumnDef<Unit>[] = [
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      accessorKey: 'unit_number',
      alwaysVisible: true,
    },
    {
      id: 'project_name',
      label: t('columns.projectName'),
      accessorKey: 'project_name',
      alwaysVisible: true,
    },
    {
      id: 'sub_project_code',
      label: t('columns.subProjectCode'),
      cell: (row) => row.sub_project_code ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'unit_type_name',
      label: t('columns.unitType'),
      cell: (row) => row.unit_specifications?.unit_type_name ?? '—',
    },
    {
      id: 'total_owners',
      label: t('columns.totalOwners'),
      headerTooltip: t('ownersHistoryHoverHint'),
      cell: (row) => {
        const ownersCount =
          row.unit_customers_count ?? row.customer_units?.length ?? 0;
        return (
          <span
            title={t('ownersHistoryHoverHint')}
            className={canReadUnits ? 'cursor-pointer' : 'cursor-help'}
          >
            {ownersCount}
          </span>
        );
      },
    },
    {
      id: 'address',
      label: t('columns.address'),
      cell: (row) => row.unit_specifications?.address ?? '—',
    },
    {
      id: 'total_area',
      label: t('columns.totalArea'),
      cell: (row) => row.unit_specifications?.total_area ?? '—',
    },
    {
      id: 'floor',
      label: t('columns.floor'),
      cell: (row) =>
        row.unit_specifications?.floor != null
          ? row.unit_specifications.floor
          : '—',
    },
    {
      id: 'is_furnished',
      label: t('columns.isFurnished'),
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.unit_specifications?.is_furnished === 1
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.unit_specifications?.is_furnished === 1 ? t('yes') : t('no')}
        </span>
      ),
    },
    {
      id: 'is_active',
      label: t('columns.isActive'),
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.is_active === 1
              ? 'bg-green-100 text-green-700'
              : 'bg-red-100 text-red-700'
          }`}
        >
          {row.is_active === 1 ? t('yes') : t('no')}
        </span>
      ),
    },
    {
      id: 'is_eligible_for_rent',
      label: t('columns.isEligibleForRent'),
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.is_eligible_for_rent === 1
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}
        >
          {row.is_eligible_for_rent === 1 ? t('yes') : t('no')}
        </span>
      ),
    },
    {
      id: 'rental_company',
      label: t('columns.rentalCompany'),
      cell: (row) => {
        const name =
          row.rental_company_name ??
          (row.rental_company_id != null
            ? rentalCompanyMap.get(row.rental_company_id)
            : null);
        return name ?? '—';
      },
    },
    {
      id: 'is_locked',
      label: t('columns.isLocked'),
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.is_locked === 1
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {row.is_locked === 1 ? t('yes') : t('no')}
        </span>
      ),
    },
    {
      id: 'locked_by',
      label: t('columns.lockedBy'),
      cell: (row) => row.locked_by ?? '—',
    },
    {
      id: 'customer_name',
      label: t('columns.customerName'),
      cell: (row) => {
        const names = (row.customer_units ?? [])
          .map((c) => c.customer_name)
          .filter((n): n is string => Boolean(n));
        return names.length > 0 ? names.join(', ') : '—';
      },
    },
    {
      id: 'mobile_number',
      label: t('columns.mobileNumber'),
      cell: (row) => row.customer_units?.[0]?.mobile_number ?? '—',
    },
    {
      id: 'sign_date',
      label: t('columns.signDate'),
      cell: (row) => {
        const date = row.customer_units?.[0]?.sign_date;
        if (!date) return '—';
        return new Date(date).toLocaleDateString();
      },
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          unit_number: '',
          is_exact: '1',
          project_id: '',
          is_active: '',
          is_locked: '',
          is_furnished: '0',
          is_eligible_for_rent: '',
          rental_company_id: '',
          delivery_date: '',
        }}
        validationSchema={searchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        autoSubmit
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && (
        <MainBox>
          <DataTable<Unit>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={units}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noUnitsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="units-search-columns"
            showColumnToggle
            exportEnabled={canExportUnits}
            exportEndpoint="/projects/units"
            exportParams={unitsExportParams}
            exportFileName="units"
            onRowClick={
              canReadUnits
                ? (row) => {
                    setSelectedUnit(row);
                    router.push(`/units/${row.unit_id ?? row.id}`);
                  }
                : undefined
            }
          />
        </MainBox>
      )}
    </div>
  );
}
