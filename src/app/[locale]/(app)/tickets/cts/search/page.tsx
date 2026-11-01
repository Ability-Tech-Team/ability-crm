'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { Pencil, Printer } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { getCtsRecords, type CtsRecord } from '@/src/services/cts';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import CtsPrintCard from '@/src/components/CtsPrintCard';

const LIMIT = 10;

const searchSchema = z.object({
  unit_number: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function CtsSearch() {
  const t = useTranslations('cts');
  const tForm = useTranslations('form');
  const router = useRouter();
  const ctsSearchPrivileges = useRoutePrivileges('/tickets/cts/search');
  const ctsAddPrivileges = useRoutePrivileges('/tickets/cts/add');
  const canReadCts = ctsSearchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canEditCts = ctsAddPrivileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const canExportCts = ctsSearchPrivileges.hasPrivilege(PRIVILEGE_IDS.EXPORT);
  const canPrintCts = canReadCts;

  const [records, setRecords] = useState<CtsRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchFormData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [printRecord, setPrintRecord] = useState<CtsRecord | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  const fetchRecords = useCallback(
    async (params: SearchFormData, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getCtsRecords(
          {
            unit_number: params.unit_number || undefined,
            page,
            limit,
          },
          controller.signal,
        );
        setRecords(data.records);
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
    setSearchParams(data);
    setCurrentPage(1);
    await fetchRecords(data, 1, pageSize);
  };

  const handleReset = () => {
    setRecords([]);
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
    await fetchRecords(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchRecords(searchParams, 1, size);
  };

  const ctsExportParams = useMemo(
    () =>
      searchParams
        ? {
            unit_number: searchParams.unit_number || undefined,
          }
        : {},
    [searchParams],
  );

  // ── Print handler ────────────────────────────────────────────
  const handlePrint = useCallback((record: CtsRecord) => {
    setPrintRecord(record);
    setTimeout(() => {
      window.print();
      setPrintRecord(null);
    }, 100);
  }, []);

  // ── Form fields & buttons ────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
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

  // ── Table columns ────────────────────────────────────────────
  const columns: ColumnDef<CtsRecord>[] = useMemo(
    () => [
      ...(canEditCts
        ? [
            {
              id: 'edit',
              label: t('columns.edit'),
              cell: (row: CtsRecord) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/tickets/cts/${row.id}/edit`);
                  }}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
                  title={t('editRecord')}
                >
                  <Pencil size={18} />
                </button>
              ),
            },
          ]
        : []),
      ...(canPrintCts
        ? [
            {
              id: 'print',
              label: t('columns.print'),
              cell: (row: CtsRecord) => (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(row);
                  }}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-all duration-200 hover:scale-110"
                  title={t('printRecord')}
                >
                  <Printer size={18} />
                </button>
              ),
            },
          ]
        : []),
      {
        id: 'id',
        label: t('columns.ctsId'),
        accessorKey: 'id',
        alwaysVisible: true,
      },
      {
        id: 'unit_number',
        label: t('columns.unitNumber'),
        accessorKey: 'unit_number',
        alwaysVisible: true,
      },
      {
        id: 'customer_code',
        label: t('columns.customerCode'),
        accessorKey: 'customer_code',
      },
      {
        id: 'customer_name',
        label: t('columns.customerName'),
        cell: (row) => row.customer_name ?? '—',
      },
      {
        id: 'customer_mobile',
        label: t('columns.customerMobile'),
        cell: (row) => row.customer_mobile ?? '—',
      },
      {
        id: 'annual_fees',
        label: t('columns.annualFees'),
        accessorKey: 'annual_fees',
      },
      {
        id: 'collected_amount',
        label: t('columns.collectedAmount'),
        cell: (row) => row.collected_amount ?? '—',
      },
      {
        id: 'contracts_status',
        label: t('columns.contractsStatus'),
        cell: (row) => row.contracts_status ?? '—',
      },
      {
        id: 'internet_status',
        label: t('columns.internetStatus'),
        cell: (row) => row.internet_status ?? '—',
      },
      {
        id: 'ip_tv_status',
        label: t('columns.ipTvStatus'),
        cell: (row) => row.ip_tv_status ?? '—',
      },
      {
        id: 'ip_phone_status',
        label: t('columns.ipPhoneStatus'),
        cell: (row) => row.ip_phone_status ?? '—',
      },
      {
        id: 'update_status',
        label: t('columns.updateStatus'),
        cell: (row) => row.update_status ?? '—',
      },
    ],
    [t, router, canEditCts, canPrintCts, handlePrint],
  );

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={`${t('title')} - ${tForm('search')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          unit_number: '',
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

      {/* Hidden print card — portaled to body so print CSS can target it */}
      {printRecord &&
        createPortal(
          <div className="print-area">
            <CtsPrintCard record={printRecord} />
          </div>,
          document.body,
        )}

      {hasSearched && (
        <MainBox>
          <DataTable<CtsRecord>
            title={`${t('results')} (${totalCount})`}
            columns={columns}
            data={records}
            rowKey={(row) => row.id}
            loading={isLoading}
            emptyState={t('noRecordsFound')}
            itemsPerPage={LIMIT}
            pageSize={pageSize}
            currentPage={currentPage}
            totalCount={totalCount}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            persistKey="cts-search-columns"
            showColumnToggle
            exportEnabled={canExportCts}
            exportEndpoint="/orders/cts"
            exportParams={ctsExportParams}
            exportFileName="cts-records"
            onRowClick={
              canReadCts
                ? (row) => router.push(`/tickets/cts/${row.id}`)
                : undefined
            }
          />
        </MainBox>
      )}
    </div>
  );
}
