'use client';

import { z } from 'zod';
import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useRouter } from '@/src/i18n/navigation';
import Form, { type ButtonConfig, type FieldConfig } from '@/src/components/Form';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { getUnits, type Unit } from '@/src/services/units';

const LIMIT = 10;

const searchUnitSchema = z.object({
  unit_number: z.string().optional(),
  unit_id: z.string().optional(),
  is_exact: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchUnitSchema>;

interface UnitRow {
  unitId: number;
  unitNumber: string;
  customerName: string;
  customerId: number;
  customerMobile: string;
  projectName: string;
  isLocked: number;
  unit: Unit;
  customerIndex: number;
}

function flattenUnits(units: Unit[]): UnitRow[] {
  const rows: UnitRow[] = [];

  for (const unit of units) {
    if (unit.customer_units.length > 0) {
      unit.customer_units.forEach((customer, customerIndex) => {
        rows.push({
          unitId: unit.id,
          unitNumber: unit.unit_number,
          customerName: customer.customer_name ?? '—',
          customerId: customer.customer_id,
          customerMobile: customer.mobile_number ?? '—',
          projectName: unit.project_name ?? '—',
          isLocked: unit.is_locked,
          unit,
          customerIndex,
        });
      });
      continue;
    }

    rows.push({
      unitId: unit.id,
      unitNumber: unit.unit_number,
      customerName: '—',
      customerId: 0,
      customerMobile: '—',
      projectName: unit.project_name ?? '—',
      isLocked: unit.is_locked,
      unit,
      customerIndex: -1,
    });
  }

  return rows;
}

export default function ConcessionTicketUnitSearchPage() {
  const t = useTranslations('concessionTickets');
  const tForm = useTranslations('form');
  const router = useRouter();

  const [rows, setRows] = useState<UnitRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<{
    unit_number?: string;
    unit_id?: number;
    is_exact?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchUnits = useCallback(
    async (
      params: {
        unit_number?: string;
        unit_id?: number;
        is_exact?: boolean;
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
        const result = await getUnits(
          { ...params, page, limit },
          controller.signal,
        );
        setRows(flattenUnits(result.units));
        setTotalCount(result.totalCount);
      } catch (fetchError: unknown) {
        if ((fetchError as { name?: string }).name !== 'CanceledError') {
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

  const handleSubmit = async (data: SearchFormData) => {
    const params = {
      unit_number: data.unit_number || undefined,
      unit_id: data.unit_id ? Number(data.unit_id) : undefined,
      is_exact: data.is_exact === '1',
    };
    setHasSearched(true);
    setSearchParams(params);
    setCurrentPage(1);
    await fetchUnits(params, 1, pageSize);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setRows([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(LIMIT);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
  };

  const fields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'unit_id',
      label: tForm('unitId'),
      placeholder: tForm('unitId'),
      type: 'text',
      onlyNumbers: true,
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

  const columns: ColumnDef<UnitRow>[] = [
    {
      id: 'unitNumber',
      label: t('columns.unitNumber'),
      accessorKey: 'unitNumber',
      alwaysVisible: true,
    },
    {
      id: 'customerName',
      label: t('columns.customerName'),
      accessorKey: 'customerName',
      alwaysVisible: true,
    },
    {
      id: 'customerMobile',
      label: t('columns.customerMobile'),
      accessorKey: 'customerMobile',
    },
    {
      id: 'projectName',
      label: t('columns.projectName'),
      accessorKey: 'projectName',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-6">
      <Form
        title={`${t('title')} - ${t('selectUnit')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{ unit_number: '', unit_id: '', is_exact: '1' }}
        validationSchema={searchUnitSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && (
        <MainBox>
          <DataTable<UnitRow>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={rows}
            rowKey={(row) => `${row.unitId}-${row.customerId}`}
            loading={isLoading}
            emptyState={t('noUnitsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={async (page) => {
              if (!searchParams || page === currentPage) return;
              setCurrentPage(page);
              await fetchUnits(searchParams, page, pageSize);
            }}
            onPageSizeChange={async (size) => {
              if (!searchParams) return;
              setPageSize(size);
              setCurrentPage(1);
              await fetchUnits(searchParams, 1, size);
            }}
            persistKey="concession-tickets-add-unit-columns"
            showColumnToggle
            onRowClick={(row) => {
              if (row.isLocked === 1) {
                toast.error(t('unitIsBlocked'));
                return;
              }

              sessionStorage.setItem(
                'concession-ticket-create-unit',
                JSON.stringify({
                  unit: row.unit,
                  customerIndex: row.customerIndex,
                }),
              );
              router.push(
                `/tickets/concessions/add/create?unitId=${row.unitId}&customerId=${row.customerId}`,
              );
            }}
          />
        </MainBox>
      )}
    </div>
  );
}
