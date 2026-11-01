'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import AccessDenied from '@/src/components/AccessDenied';
import Form, {
  type ButtonConfig,
  type FieldConfig,
} from '@/src/components/Form';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  searchWalkInRentalRequests,
  type WalkInRentalRequest,
} from '@/src/services/walkInRentalRequests';
import { getDelegates, type Delegate } from '@/src/services/rentals';
import { getSourceLabelKey, WALK_IN_SOURCE } from './utils';

const LIMIT = 10;

const searchWalkInRequestsSchema = z.object({
  id: z.string().optional(),
  customer_name: z.string().optional(),
  id_number: z.string().optional(),
  unit_number: z.string().optional(),
  rental_status: z.string().optional(),
  source: z.string().optional(),
  delegate_id: z.string().optional(),
  delegate_national_id: z
    .string()
    .optional()
    .refine((val) => !val || val.length === 0 || val.length >= 5, {
      message: 'Min 5 characters',
    })
    .refine((val) => !val || val.length <= 14, {
      message: 'Max 14 characters',
    }),
});

type SearchWalkInRequestsFormData = z.infer<typeof searchWalkInRequestsSchema>;


function getSourceBadgeClass(sourceId: number | undefined) {
  return sourceId === WALK_IN_SOURCE.TENANT
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';
}

function getRentalStatusBadgeClass(statusId: number | undefined) {
  return statusId === 2
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : statusId === 3
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';
}

function getRentalStatusLabel(
  statusId: number | undefined,
  statusName: string | undefined,
) {
  return (
    statusName ||
    (statusId === 2 ? 'Accepted' : statusId === 3 ? 'Rejected' : 'Pending')
  );
}


export default function RentalRequestsPage() {
  const t = useTranslations('rentals');
  const sourceLabel = (sourceId: number | undefined) => {
    const key = getSourceLabelKey(sourceId);
    return key ? t(`rentalRequests.source.${key}`) : '—';
  };
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const searchParamsFromUrl = useSearchParams();
  const privileges = useRoutePrivileges('/rentals/rental-requests');

  const canOpenRequest =
    privileges.canAccess ||
    privileges.hasAnyPrivilege([
      PRIVILEGE_IDS.READ,
      PRIVILEGE_IDS.READ_ALL,
      PRIVILEGE_IDS.ACCEPT,
      PRIVILEGE_IDS.REJECT,
    ]);

  const initialSearchParams = useMemo(
    () => ({
      id: searchParamsFromUrl.get('id') || undefined,
      customer_name:
        searchParamsFromUrl.get('customer_name') ||
        searchParamsFromUrl.get('tenant_name') ||
        undefined,
      id_number: searchParamsFromUrl.get('id_number') || undefined,
      unit_number: searchParamsFromUrl.get('unit_number') || undefined,
      rental_status: searchParamsFromUrl.get('rental_status') || undefined,
      source: searchParamsFromUrl.get('source') || undefined,
      delegate_id: searchParamsFromUrl.get('delegate_id') || undefined,
      delegate_national_id:
        searchParamsFromUrl.get('delegate_national_id') || undefined,
    }),
    [searchParamsFromUrl],
  );

  const [requests, setRequests] = useState<WalkInRentalRequest[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] =
    useState<SearchWalkInRequestsFormData>(initialSearchParams);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const hasInitialized = useRef(false);

  useEffect(() => {
    getDelegates()
      .then((list) => setDelegates(list))
      .catch((err) => console.error('Failed to load delegates:', err));
  }, []);

  const fetchRequests = useCallback(
    async (
      params: SearchWalkInRequestsFormData,
      page: number,
      limit: number,
    ) => {
      setIsLoading(true);
      setError('');

      try {
        const response = await searchWalkInRentalRequests({
          ...params,
          id: params.id ? Number(params.id) : undefined,
          rental_status: params.rental_status
            ? Number(params.rental_status)
            : undefined,
          source: params.source ? Number(params.source) : undefined,
          delegate_id: params.delegate_id
            ? Number(params.delegate_id)
            : undefined,
          delegate_national_id: params.delegate_national_id || undefined,
          page,
          limit,
        });
        setRequests(response.requests);
        setTotalCount(response.totalCount);
      } catch {
        setError(t('rentalRequests.loadError'));
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
    void fetchRequests(initialSearchParams, 1, pageSize);
  }, [fetchRequests, initialSearchParams, pageSize]);

  const handleSubmit = async (data: SearchWalkInRequestsFormData) => {
    const nextSearchParams = {
      id: data.id || undefined,
      customer_name: data.customer_name || undefined,
      id_number: data.id_number || undefined,
      unit_number: data.unit_number || undefined,
      rental_status: data.rental_status || undefined,
      source: data.source || undefined,
      delegate_id: data.delegate_id || undefined,
      delegate_national_id: data.delegate_national_id || undefined,
    };

    setSearchParams(nextSearchParams);
    setCurrentPage(1);
    await fetchRequests(nextSearchParams, 1, pageSize);
  };

  const handleReset = async () => {
    const emptyParams = {};
    setSearchParams(emptyParams);
    setCurrentPage(1);
    setPageSize(LIMIT);
    await fetchRequests(emptyParams, 1, LIMIT);
  };

  const handlePageChange = async (page: number) => {
    if (page === currentPage) {
      return;
    }

    setCurrentPage(page);
    await fetchRequests(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    setPageSize(size);
    setCurrentPage(1);
    await fetchRequests(searchParams, 1, size);
  };

  const requestsExportParams = useMemo(
    () => ({
      ...searchParams,
      id: searchParams.id ? Number(searchParams.id) : undefined,
      rental_status: searchParams.rental_status
        ? Number(searchParams.rental_status)
        : undefined,
      source: searchParams.source ? Number(searchParams.source) : undefined,
      delegate_id: searchParams.delegate_id
        ? Number(searchParams.delegate_id)
        : undefined,
      delegate_national_id: searchParams.delegate_national_id || undefined,
    }),
    [searchParams],
  );

  const sourceOptions = useMemo(
    () =>
      (dropdowns?.walk_in_tenant_sources ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  const rentalStatusOptions = useMemo(
    () =>
      (dropdowns?.walk_in_statuses ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  const delegateOptions = useMemo(
    () =>
      delegates.map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [delegates],
  );

  const fields: FieldConfig[] = [
    {
      name: 'id',
      label: t('rentalRequests.columns.referenceNumber'),
      placeholder: t('rentalRequests.columns.referenceNumber'),
      type: 'text',
    },
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'customer_name',
      label: tForm('tenantName'),
      placeholder: tForm('tenantName'),
      type: 'text',
    },
    {
      name: 'id_number',
      label: tForm('idNumber'),
      placeholder: tForm('idNumber'),
      type: 'text',
    },
    {
      name: 'source',
      label: t('rentalRequests.columns.source'),
      placeholder: t('rentalRequests.filters.allSources'),
      fieldType: 'select',
      options: sourceOptions,
    },
    {
      name: 'rental_status',
      label: tForm('status'),
      placeholder: tForm('status'),
      fieldType: 'select',
      options: rentalStatusOptions,
    },
    {
      name: 'delegate_id',
      label: t('rentalRequests.columns.delegateName'),
      placeholder: t('rentalRequests.filters.allDelegates'),
      fieldType: 'select',
      options: delegateOptions,
    },
    {
      name: 'delegate_national_id',
      label: t('rentalRequests.columns.delegateNid'),
      placeholder: t('rentalRequests.columns.delegateNid'),
      type: 'text',
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

  const columns: ColumnDef<WalkInRentalRequest>[] = [
    {
      id: 'id',
      label: t('rentalRequests.columns.referenceNumber'),
      accessorKey: 'id',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'source',
      label: t('rentalRequests.columns.source'),
      accessorKey: 'source_id',
      alwaysVisible: true,
      cell: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getSourceBadgeClass(
            row.source_id,
          )}`}
        >
          {row.source_name || sourceLabel(row.source_id)}
        </span>
      ),
    },
    {
      id: 'project_name',
      label: t('columns.projectName'),
      accessorKey: 'project_name',
      sortable: true,
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      accessorKey: 'unit_number',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'customer_name',
      label: t('columns.tenantName'),
      accessorKey: 'customer_name',
      alwaysVisible: true,
      sortable: true,
    },
    {
      id: 'delegate_name',
      label: t('rentalRequests.columns.delegateName'),
      accessorKey: 'delegate_name',
      sortable: true,
      cell: (row) => row.delegate_name || '—',
    },
    {
      id: 'mobile_number',
      label: t('columns.tenantMobile'),
      accessorKey: 'mobile_number',
      alwaysVisible: true,
    },
    {
      id: 'rental_status',
      label: t('rentalRequests.columns.reviewStatus'),
      accessorKey: 'rental_status_id',
      alwaysVisible: true,
      cell: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getRentalStatusBadgeClass(
            row.rental_status_id,
          )}`}
        >
          {getRentalStatusLabel(row.rental_status_id, row.rental_status_name)}
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
        title={`${t('title')} - ${t('rentalRequests.searchTitle')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          customer_name: searchParams.customer_name ?? '',
          id_number: searchParams.id_number ?? '',
          unit_number: searchParams.unit_number ?? '',
          source: searchParams.source ?? '',
          rental_status: searchParams.rental_status ?? '',
          delegate_id: searchParams.delegate_id ?? '',
          delegate_national_id: searchParams.delegate_national_id ?? '',
        }}
        validationSchema={searchWalkInRequestsSchema}
        onSubmit={handleSubmit}
        onReset={() => {
          void handleReset();
        }}
      />

      <MainBox>
        {error ? (
          <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <DataTable<WalkInRentalRequest>
          title={`${t('results')} (${totalCount})`}
          columns={columns}
          data={requests}
          rowKey={(row) => row.id}
          loading={isLoading}
          emptyState={t('rentalRequests.noRequestsFound')}
          pageSize={pageSize}
          currentPage={currentPage}
          totalCount={totalCount}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          rowHref={
            canOpenRequest
              ? (row) => `/rentals/rental-requests/${row.id}`
              : undefined
          }
          exportEnabled={privileges.hasPrivilege(PRIVILEGE_IDS.EXPORT)}
          exportEndpoint="/rentals/walk-in-requests"
          exportParams={requestsExportParams}
          exportFileName="rental-requests"
          persistKey="rental-requests-search-columns-v1"
          showColumnToggle
        />
      </MainBox>
    </div>
  );
}
