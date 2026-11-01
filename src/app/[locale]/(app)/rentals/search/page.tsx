'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import AccessDenied from '@/src/components/AccessDenied';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  RENTAL_STATUSES,
  getRentals,
  type RentalRecord,
} from '@/src/services/rentals';

const LIMIT = 10;

const searchRentalsSchema = z
  .object({
    customer_name: z.string().optional(),
    mobile_number: z.string().optional(),
    id_number: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    rental_status: z.string().optional(),
    unit_number: z.string().optional(),
    project_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.start_date || !data.end_date) {
      return;
    }

    const startDate = new Date(data.start_date);
    const endDate = new Date(data.end_date);

    if (
      !Number.isNaN(startDate.getTime()) &&
      !Number.isNaN(endDate.getTime()) &&
      endDate.getTime() < startDate.getTime()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['end_date'],
        message: 'Check-out date cannot be before the start date.',
      });
    }
  });

type SearchRentalsFormData = z.infer<typeof searchRentalsSchema>;

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getStatusBadgeClass(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized.includes('active')) {
    return 'bg-emerald-50 text-emerald-700 border-emerald-200';
  }

  if (
    normalized.includes('fees collection') ||
    normalized.includes('pending')
  ) {
    return 'bg-amber-50 text-amber-700 border-amber-200';
  }

  if (normalized.includes('finished') || normalized.includes('completed')) {
    return 'bg-blue-50 text-blue-700 border-blue-200';
  }

  if (normalized.includes('cancel')) {
    return 'bg-red-50 text-red-700 border-red-200';
  }

  return 'bg-sky-50 text-sky-700 border-sky-200';
}

function getStatusLabel(status: string, t: (key: string) => string) {
  const normalized = normalizeStatus(status);

  if (normalized === normalizeStatus(RENTAL_STATUSES.CREATED)) {
    return t('statusLabels.created');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.FEES_COLLECTION_PENDING)) {
    return t('statusLabels.feesCollectionPending');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.ACTIVE)) {
    return t('statusLabels.active');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.FINISHED)) {
    return t('statusLabels.finished');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.COMPLETED)) {
    return t('statusLabels.completed');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.CANCELLED)) {
    return t('statusLabels.cancelled');
  }

  return status;
}

function formatDateValue(value?: string) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

export default function SearchRentalsPage() {
  const t = useTranslations('rentals');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const searchParamsFromUrl = useSearchParams();
  const privileges = useRoutePrivileges('/rentals/search');

  const canOpenRental =
    privileges.canAccess ||
    privileges.hasAnyPrivilege([
      PRIVILEGE_IDS.READ,
      PRIVILEGE_IDS.READ_ALL,
      PRIVILEGE_IDS.EDIT,
    ]);

  const initialSearchParams = useMemo(
    () => ({
      customer_name:
        searchParamsFromUrl.get('customer_name') ||
        searchParamsFromUrl.get('tenant_name') ||
        undefined,
      mobile_number:
        searchParamsFromUrl.get('mobile_number') ||
        searchParamsFromUrl.get('mobile') ||
        undefined,
      id_number: searchParamsFromUrl.get('id_number') || undefined,
      start_date:
        searchParamsFromUrl.get('start_date') ||
        searchParamsFromUrl.get('start_date_from') ||
        undefined,
      end_date:
        searchParamsFromUrl.get('end_date') ||
        searchParamsFromUrl.get('end_date_to') ||
        undefined,
      rental_status:
        searchParamsFromUrl.get('rental_status') ||
        searchParamsFromUrl.get('status') ||
        undefined,
      unit_number: searchParamsFromUrl.get('unit_number') || undefined,
      project_id: searchParamsFromUrl.get('project_id') || undefined,
    }),
    [searchParamsFromUrl],
  );

  const [rentals, setRentals] = useState<RentalRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] =
    useState<SearchRentalsFormData>(initialSearchParams);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const hasInitialized = useRef(false);

  const fetchRentals = useCallback(
    async (params: SearchRentalsFormData, page: number, limit: number) => {
      setIsLoading(true);
      setError('');

      try {
        const response = await getRentals({
          ...params,
          project_id: params.project_id ? Number(params.project_id) : undefined,
          page,
          limit,
        });
        setRentals(response.rentals);
        setTotalCount(response.totalCount);
      } catch {
        setError(t('loadError'));
      } finally {
        setIsLoading(false);
      }
    },
    [t],
  );

  useEffect(() => {
    if (hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    setSearchParams(initialSearchParams);
    void fetchRentals(initialSearchParams, 1, pageSize);
  }, [fetchRentals, initialSearchParams, pageSize]);

  const handleSubmit = async (data: SearchRentalsFormData) => {
    const nextSearchParams = {
      customer_name: data.customer_name || undefined,
      mobile_number: data.mobile_number || undefined,
      id_number: data.id_number || undefined,
      start_date: data.start_date || undefined,
      end_date: data.end_date || undefined,
      rental_status: data.rental_status || undefined,
      unit_number: data.unit_number || undefined,
      project_id: data.project_id || undefined,
    };

    setSearchParams(nextSearchParams);
    setCurrentPage(1);
    await fetchRentals(nextSearchParams, 1, pageSize);
  };

  const handleReset = async () => {
    const emptyParams = {};
    setSearchParams(emptyParams);
    setCurrentPage(1);
    setPageSize(LIMIT);
    await fetchRentals(emptyParams, 1, LIMIT);
  };

  const handlePageChange = async (page: number) => {
    if (page === currentPage) return;
    setCurrentPage(page);
    await fetchRentals(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    await fetchRentals(searchParams, 1, size);
  };

  const rentalsExportParams = useMemo(
    () => ({
      ...searchParams,
      project_id: searchParams.project_id
        ? Number(searchParams.project_id)
        : undefined,
    }),
    [searchParams],
  );

  const projectOptions = useMemo(
    () =>
      (dropdowns?.company_projects ?? []).map((project) => ({
        value: String(project.id),
        label: project.name,
      })),
    [dropdowns],
  );

  const statusOptions = useMemo(() => {
    const dropdownStatusOptions = (dropdowns?.rental_statuses ?? []).map(
      (status) => ({
        value: String(status.id),
        label: status.name,
      }),
    );

    if (dropdownStatusOptions.length > 0) {
      return dropdownStatusOptions;
    }

    return Array.from(
      new Set([
        RENTAL_STATUSES.CREATED,
        RENTAL_STATUSES.FEES_COLLECTION_PENDING,
        RENTAL_STATUSES.ACTIVE,
        RENTAL_STATUSES.FINISHED,
        RENTAL_STATUSES.COMPLETED,
        RENTAL_STATUSES.CANCELLED,
      ]),
    ).map((status) => ({
      value: String(
        status === RENTAL_STATUSES.CREATED
          ? 1
          : status === RENTAL_STATUSES.FEES_COLLECTION_PENDING
            ? 2
            : status === RENTAL_STATUSES.ACTIVE
              ? 3
              : status === RENTAL_STATUSES.FINISHED
                ? 4
                : status === RENTAL_STATUSES.COMPLETED
                  ? 5
                  : 6,
      ),
      label: getStatusLabel(status, t),
    }));
  }, [dropdowns, t]);

  const fields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: t('searchPlaceholder'),
      type: 'text',
    },
    {
      name: 'customer_name',
      label: tForm('tenantName'),
      placeholder: tForm('tenantName'),
      type: 'text',
    },
    {
      name: 'mobile_number',
      label: tForm('mobileNumber'),
      placeholder: tForm('mobileNumber'),
      type: 'text',
    },
    {
      name: 'id_number',
      label: tForm('idNumber'),
      placeholder: tForm('idNumber'),
      type: 'text',
    },
    {
      name: 'project_id',
      label: tForm('project'),
      placeholder: tForm('project'),
      fieldType: 'select',
      options: projectOptions,
    },
    {
      name: 'rental_status',
      label: t('filters.status'),
      placeholder: t('filters.allStatuses'),
      fieldType: 'select',
      options: statusOptions,
    },
    {
      name: 'start_date',
      label: t('filters.startDateFrom'),
      type: 'date',
    },
    {
      name: 'end_date',
      label: t('filters.checkOutDate'),
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

  const columns: ColumnDef<RentalRecord>[] = [
    // {
    //   id: 'manage',
    //   label: t('columns.actions'),
    //   alwaysVisible: true,
    //   cell: (row) =>
    //     canOpenRental ? (
    //       <button
    //         onClick={(event) => {
    //           event.stopPropagation();
    //           router.push(`/rentals/${row.id}`);
    //         }}
    //         className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition-colors hover:bg-sky-100"
    //       >
    //         <Pencil size={14} />
    //         {canManageRental ? t('detail.editRental') : t('detail.viewRental')}
    //       </button>
    //     ) : (
    //       '—'
    //     ),
    // },
    {
      id: 'created_at',
      label: t('columns.requestCreationDate'),
      accessorKey: 'created_at',
      alwaysVisible: true,
      sortable: true,
      cell: (row) => formatDateValue(row.created_at),
    },
    {
      id: 'start_date',
      label: t('columns.startDate'),
      accessorKey: 'start_date',
      alwaysVisible: true,
      sortable: true,
      cell: (row) => formatDateValue(row.start_date),
    },
    {
      id: 'end_date',
      label: t('columns.checkOutDate'),
      accessorKey: 'end_date',
      alwaysVisible: true,
      sortable: true,
      cell: (row) => formatDateValue(row.end_date),
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      accessorKey: 'unit_number',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'tenant_name',
      label: t('columns.tenantName'),
      accessorKey: 'tenant_name',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'phone',
      label: t('columns.tenantMobile'),
      accessorKey: 'phone',
      alwaysVisible: true,
    },
    {
      id: 'request_source_name',
      label: t('columns.requestSourceName'),
      accessorKey: 'request_source_name',
      sortable: true,
      cell: (row) => row.request_source_name ?? '—',
    },
    {
      id: 'status',
      label: t('columns.status'),
      accessorKey: 'status',
      alwaysVisible: true,
      cell: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(
            row.status,
          )}`}
        >
          {getStatusLabel(row.status, t)}
        </span>
      ),
    },
  ];

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Form
        title={`${t('title')} - ${t('searchTitle')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          customer_name: searchParams.customer_name ?? '',
          mobile_number: searchParams.mobile_number ?? '',
          id_number: searchParams.id_number ?? '',
          start_date: searchParams.start_date ?? '',
          end_date: searchParams.end_date ?? '',
          rental_status: searchParams.rental_status ?? '',
          unit_number: searchParams.unit_number ?? '',
          project_id: searchParams.project_id ?? '',
        }}
        validationSchema={searchRentalsSchema}
        onSubmit={handleSubmit}
        onReset={() => {
          void handleReset();
        }}
      ></Form>

      <MainBox>
        {error ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <DataTable<RentalRecord>
          title={`${t('results')} (${totalCount})`}
          columns={columns}
          data={rentals}
          rowKey={(row) => row.id}
          loading={isLoading}
          emptyState={t('noRentalsFound')}
          pageSize={pageSize}
          currentPage={currentPage}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          rowHref={canOpenRental ? (row) => `/rentals/${row.id}` : undefined}
          exportEnabled={privileges.hasPrivilege(PRIVILEGE_IDS.EXPORT)}
          exportEndpoint="/rentals/reservations"
          exportParams={rentalsExportParams}
          exportFileName="rentals"
          persistKey="rentals-search-columns-v2"
          showColumnToggle
        />
      </MainBox>
    </div>
  );
}
