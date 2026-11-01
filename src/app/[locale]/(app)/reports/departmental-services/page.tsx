'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Printer } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import ReportPrintTable, {
  PrintColumn,
} from '@/src/components/ReportPrintTable';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import {
  getDepartmentServicesReport,
  type DepartmentServiceRow,
  type DepartmentServicesReportResult,
} from '@/src/services/reports';

const searchSchema = z.object({
  from_date: z.string().min(1),
  to_date: z.string().min(1),
  department_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function DepartmentalServicesReportPage() {
  const t = useTranslations('reports');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const reportPrivileges = useRoutePrivileges('/reports/departmental-services');
  const canReadReport = reportPrivileges.canAccess;

  const [result, setResult] = useState<DepartmentServicesReportResult | null>(
    null,
  );

  const data = result?.rows ?? [];
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);
  const [lastSearch, setLastSearch] = useState<SearchFormData | null>(null);

  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const fetchReport = useCallback(
    async (params: SearchFormData) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const res = await getDepartmentServicesReport(
          {
            from_date: params.from_date,
            to_date: params.to_date,
            department_id: params.department_id
              ? Number(params.department_id)
              : undefined,
          },
          controller.signal,
        );
        setResult(res);
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

  const handleSubmit = async (formData: SearchFormData) => {
    setHasSearched(true);
    setLastSearch(formData);
    await fetchReport(formData);
  };

  const handleReset = () => {
    setResult(null);
    setHasSearched(false);
    setError('');
    setLastSearch(null);
  };

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  }, []);

  const fields: FieldConfig[] = [
    {
      name: 'from_date',
      label: tForm('dateFrom'),
      placeholder: tForm('dateFrom'),
      type: 'date',
    },
    {
      name: 'to_date',
      label: tForm('dateTo'),
      placeholder: tForm('dateTo'),
      type: 'date',
    },
    {
      name: 'department_id',
      label: tForm('department'),
      placeholder: tForm('department'),
      fieldType: 'select',
      options: departmentOptions,
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

  const columns: ColumnDef<DepartmentServiceRow>[] = [
    {
      id: 'department_name',
      label: t('departmentalServices.columns.departmentName'),
      accessorKey: 'department_name',
      alwaysVisible: true,
    },
    {
      id: 'service_name',
      label: t('departmentalServices.columns.serviceName'),
      accessorKey: 'service_name',
      alwaysVisible: true,
    },
    {
      id: 'count',
      label: t('departmentalServices.columns.count'),
      accessorKey: 'count',
    },
    {
      id: 'price',
      label: t('departmentalServices.columns.price'),
      accessorKey: 'price',
    },
    {
      id: 'total_amount',
      label: t('departmentalServices.columns.totalAmount'),
      accessorKey: 'total_amount',
    },
  ];

  const printColumns: PrintColumn<DepartmentServiceRow>[] = [
    {
      label: t('departmentalServices.columns.departmentName'),
      accessor: (r) => r.department_name,
    },
    {
      label: t('departmentalServices.columns.serviceName'),
      accessor: (r) => r.service_name,
    },
    {
      label: t('departmentalServices.columns.count'),
      accessor: (r) => r.count,
    },
    {
      label: t('departmentalServices.columns.price'),
      accessor: (r) => r.price,
    },
    {
      label: t('departmentalServices.columns.totalAmount'),
      accessor: (r) => r.total_amount,
    },
  ];

  const dateRange = lastSearch
    ? `${lastSearch.from_date} — ${lastSearch.to_date}`
    : '';

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={t('departmentalServices.title')}
        fields={fields}
        buttons={buttons}
        initialValues={{ from_date: '', to_date: '', department_id: '' }}
        validationSchema={searchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {hasSearched && result && (
        <>
          {result.departmentTotals.length > 0 && (
            <MainBox>
              <h2 className="text-lg font-semibold text-gray-900">
                {t('departmentalServices.summary.title')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {result.departmentTotals.map((dept) => (
                  <div
                    key={dept.department_id}
                    className="flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <span className="text-xs font-medium text-slate-500">
                      {dept.department_name}
                    </span>
                    <span className="text-lg font-bold text-slate-800">
                      {dept.total_amount.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div className="flex flex-col gap-1 rounded-xl border border-sky-200 bg-sky-50 p-4">
                  <span className="text-xs font-medium text-sky-600">
                    {t('departmentalServices.summary.grandTotal')}
                  </span>
                  <span className="text-lg font-bold text-sky-800">
                    {result.grandTotal.toLocaleString()}
                  </span>
                </div>
              </div>
            </MainBox>
          )}

          <MainBox>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t('results')} ({data.length})
              </h2>
              {data.length > 0 && canReadReport && (
                <Button variant="secondary" size="sm" onClick={handlePrint}>
                  <Printer size={16} className="me-1 inline" />
                  {t('print')}
                </Button>
              )}
            </div>
            <DataTable<DepartmentServiceRow>
              columns={columns}
              data={data}
              rowKey={(_, i) => i}
              loading={isLoading}
              emptyState={t('noDataFound')}
              itemsPerPage={pageSize}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              persistKey="report-dept-services-columns"
              showColumnToggle
              exportEnabled={canReadReport}
              exportEndpoint="/invoices/reports/end-day/department-services"
              exportParams={{
                from_date: lastSearch?.from_date,
                to_date: lastSearch?.to_date,
                department_id: lastSearch?.department_id
                  ? Number(lastSearch.department_id)
                  : undefined,
              }}
              exportFileName="departmental-services-report"
            />
          </MainBox>
        </>
      )}

      {isPrinting &&
        canReadReport &&
        createPortal(
          <div className="print-area">
            <ReportPrintTable
              title={t('departmentalServices.title')}
              dateRange={dateRange}
              columns={printColumns}
              data={data}
              rowsPerPage={pageSize}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
