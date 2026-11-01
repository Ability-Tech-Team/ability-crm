'use client';

import { z } from 'zod';
import { useState, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { getUnits, type Unit } from '@/src/services/units';
import { toast } from 'sonner';

const LIMIT = 10;

const searchUnitSchema = z.object({
  unit_number: z.string().optional(),
  is_exact: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchUnitSchema>;

/** Flattened row: one row per customer per unit */
interface UnitRow {
  unitId: number;
  unitNumber: string;
  customerName: string;
  projectName: string;
  mobile: string;
  email: string;
  dateOfBirth: string;
  isLocked: number;
  customerId: number;
  // carry the full unit for sessionStorage
  _unit: Unit;
  _customerIndex: number;
}

function flattenUnits(units: Unit[]): UnitRow[] {
  const rows: UnitRow[] = [];
  for (const unit of units) {
    if (unit.customer_units.length > 0) {
      for (let i = 0; i < unit.customer_units.length; i++) {
        const cu = unit.customer_units[i];
        rows.push({
          unitId: unit.id,
          unitNumber: unit.unit_number,
          customerName: cu.customer_name ?? '—',
          projectName: unit.project_name ?? '—',
          mobile: cu.mobile_number ?? '—',
          email: cu.email ?? '—',
          dateOfBirth: cu.birth_date ?? '—',
          isLocked: unit.is_locked,
          customerId: cu.customer_id,
          _unit: unit,
          _customerIndex: i,
        });
      }
    } else {
      rows.push({
        unitId: unit.id,
        unitNumber: unit.unit_number,
        customerName: '—',
        projectName: unit.project_name ?? '—',
        mobile: '—',
        email: '—',
        dateOfBirth: '—',
        isLocked: unit.is_locked,
        customerId: 0,
        _unit: unit,
        _customerIndex: -1,
      });
    }
  }
  return rows;
}

export default function AddTicket() {
  const t = useTranslations('tickets');
  const tForm = useTranslations('form');
  const router = useRouter();

  const [rows, setRows] = useState<UnitRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<{
    unit_number?: string;
    is_exact?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch units ──────────────────────────────────────────────
  const fetchUnits = useCallback(
    async (
      params: { unit_number?: string; is_exact?: boolean },
      page: number,
      limit: number,
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getUnits(
          {
            unit_number: params.unit_number,
            is_exact: params.is_exact,
            page,
            limit,
          },
          controller.signal,
        );
        setRows(flattenUnits(data.units));
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
      unit_number: data.unit_number || undefined,
      is_exact: data.is_exact === '1',
    };
    setSearchParams(params);
    setCurrentPage(1);
    await fetchUnits(params, 1, pageSize);
  };

  const handleReset = () => {
    setRows([]);
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

  // ── Form fields & buttons ────────────────────────────────────
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

  // ── Table columns ────────────────────────────────────────────
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
      id: 'projectName',
      label: t('addColumns.projectName'),
      accessorKey: 'projectName',
    },
    {
      id: 'mobile',
      label: t('addColumns.mobile'),
      accessorKey: 'mobile',
    },
    {
      id: 'email',
      label: t('addColumns.email'),
      accessorKey: 'email',
    },
    {
      id: 'dateOfBirth',
      label: t('addColumns.dateOfBirth'),
      accessorKey: 'dateOfBirth',
    },
    {
      id: 'isLocked',
      label: t('addColumns.isLocked'),
      cell: (row) => (
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.isLocked === 1
              ? 'bg-red-100 text-red-700'
              : 'bg-green-100 text-green-700'
          }`}
        >
          {row.isLocked === 1 ? t('yes') : t('no')}
        </span>
      ),
    },
  ];

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('add')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{ unit_number: '', is_exact: '1' }}
        validationSchema={searchUnitSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
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
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="tickets-add-unit-columns"
            showColumnToggle
            onRowClick={(row) => {
              if (row.isLocked === 1) {
                toast.error(t('unitIsBlocked'));
                return;
              }
              sessionStorage.setItem(
                'ticket-create-unit',
                JSON.stringify({
                  unit: row._unit,
                  customerIndex: row._customerIndex,
                }),
              );
              router.push(
                `/tickets/add/create?unitId=${row.unitId}&customerId=${row.customerId}`,
              );
            }}
          />
        </MainBox>
      )}
    </div>
  );
}
