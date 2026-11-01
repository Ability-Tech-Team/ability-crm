'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { getCustomers, type Customer } from '@/src/services/customers';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import MainBox from '@/src/components/ui/MainBox';
import { useSelectedCustomerStore } from '@/src/store/useSelectedCustomerStore';

const LIMIT = 10;

// Define your validation schema
const customerSearchSchema = z.object({
  name: z.string().optional(),
  phone: z.string().optional(),
  code: z.string().optional(),
  idNumber: z.string().optional(),
  unitNumber: z.string().optional(),
  ownership_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof customerSearchSchema>;

export default function CustomersSearch() {
  const t = useTranslations('customers');
  const tForm = useTranslations('form');
  const router = useRouter();
  const { data: dropdowns } = useDropdowns();
  const setSelectedCustomer = useSelectedCustomerStore((s) => s.setCustomer);
  const customerPrivileges = useRoutePrivileges('/customers/search');
  const canReadCustomers = customerPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExportCustomers = customerPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EXPORT,
  );

  // ── Search & data state ──────────────────────────────────────
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<{
    customer_name?: string;
    customer_code?: string;
    id_number?: string;
    mobile_number?: string;
    unit_number?: string;
    ownership_id?: number;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchCustomers = useCallback(
    async (
      params: {
        customer_name?: string;
        customer_code?: string;
        id_number?: string;
        mobile_number?: string;
        unit_number?: string;
        ownership_id?: number;
      },
      page: number,
      limit: number,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getCustomers(
          { ...params, page, limit },
          controller.signal,
        );
        setCustomers(data.customers);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setError(t('loadError'));
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  // ── Form handlers ────────────────────────────────────────────
  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    const params = {
      customer_name: data.name || undefined,
      customer_code: data.code || undefined,
      id_number: data.idNumber || undefined,
      mobile_number: data.phone || undefined,
      unit_number: data.unitNumber || undefined,
      ownership_id: data.ownership_id ? Number(data.ownership_id) : undefined,
    };
    setSearchParams(params);
    setCurrentPage(1);
    await fetchCustomers(params, 1, pageSize);
  };

  const handleReset = () => {
    setCustomers([]);
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
    await fetchCustomers(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchCustomers(searchParams, 1, size);
  };

  // Define your inputs
  const ownershipOptions = useMemo(
    () =>
      (dropdowns?.ownership_types ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const fields: FieldConfig[] = [
    {
      name: 'name',
      label: tForm('name'),
      placeholder: tForm('name'),
      type: 'text',
    },
    {
      name: 'code',
      label: tForm('code'),
      placeholder: tForm('code'),
      type: 'text',
    },
    {
      name: 'idNumber',
      label: tForm('idNumber'),
      placeholder: tForm('idNumber'),
      type: 'text',
    },
    {
      name: 'phone',
      label: tForm('phone'),
      placeholder: tForm('phone'),
      type: 'text',
    },
    {
      name: 'unitNumber',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'ownership_id',
      label: tForm('ownership'),
      placeholder: tForm('ownership'),
      fieldType: 'select',
      options: ownershipOptions,
    },
  ];

  // Define your buttons
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

  // ── Table columns ────────────────────────────────────────────
  const columns: ColumnDef<Customer>[] = [
    {
      id: 'customer_name',
      label: t('columns.customerName'),
      accessorKey: 'customer_name',
      alwaysVisible: true,
    },
    {
      id: 'type',
      label: t('columns.customerType'),
      cell: (row) => {
        const units = row.customer_units ?? [];
        const types = units
          .map((u) => u.ownership)
          .filter((t): t is string => Boolean(t));
        return types.length > 0 ? types.join(', ') : '—';
      },
    },
    {
      id: 'mobile_number',
      label: t('columns.mobileNumber'),
      cell: (row) => row.mobile_number ?? '—',
      alwaysVisible: true,
    },
    {
      id: 'customer_code',
      label: t('columns.customerCode'),
      cell: (row) => row.customer_code ?? '—',
    },
    {
      id: 'unit_number',
      label: t('columns.unitNumber'),
      cell: (row) => {
        const units = (row.customer_units ?? [])
          .map((u) => u.unit_details?.unit_number)
          .filter((n): n is string => Boolean(n));
        return units.length > 0 ? units.join(', ') : '—';
      },
    },
    {
      id: 'id_type_name',
      label: t('columns.idType'),
      cell: (row) => row.id_type_name ?? '—',
    },
    {
      id: 'id_number',
      label: t('columns.idNumber'),
      cell: (row) => row.id_number ?? '—',
    },
    {
      id: 'contract_end_date',
      label: t('columns.contractEndDate'),
      cell: (row) => {
        const dates = (row.customer_units ?? [])
          .map((u) => u.end_date)
          .filter((d): d is string => Boolean(d));
        return dates.length > 0 ? dates.join(', ') : '—';
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
          name: '',
          phone: '',
          code: '',
          idNumber: '',
          unitNumber: '',
          ownership_id: '',
        }}
        validationSchema={customerSearchSchema}
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
          <DataTable<Customer>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={customers}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noCustomersFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="customers-search-columns"
            showColumnToggle
            exportEnabled={canExportCustomers}
            exportEndpoint="/customers"
            exportParams={searchParams ?? {}}
            exportFileName="customers"
            onRowClick={
              canReadCustomers
                ? (row) => {
                    setSelectedCustomer(row);
                    router.push(`/customers/${row.id}`);
                  }
                : undefined
            }
          />
        </MainBox>
      )}
    </div>
  );
}
