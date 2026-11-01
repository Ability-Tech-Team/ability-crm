'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo, useEffect } from 'react';
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
import { getEmployees } from '@/src/services/employees';
import {
  getDailyInvoicesReport,
  type DailyInvoiceRow,
} from '@/src/services/reports';

const searchSchema = z.object({
  from_date: z.string().min(1),
  to_date: z.string().min(1),
  department_id: z.string().optional(),
  unit_number: z.string().optional(),
  collected_by: z.string().optional(),
  invoice_type_id: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

export default function DailyInvoicesReportPage() {
  const t = useTranslations('reports');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const reportPrivileges = useRoutePrivileges('/reports/daily-invoices');
  const canReadReport = reportPrivileges.canAccess;

  const [data, setData] = useState<DailyInvoiceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);
  const [lastSearch, setLastSearch] = useState<SearchFormData | null>(null);
  const [collectedByOptions, setCollectedByOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const invoiceTypeOptions = useMemo(
    () =>
      (dropdowns?.invoice_types ?? []).map((it) => ({
        value: String(it.id),
        label: it.name,
      })),
    [dropdowns],
  );

  const agentEmployeeTypeId = useMemo(() => {
    const employeeTypes = dropdowns?.employee_types ?? [];

    const agentType = employeeTypes.find((type) => {
      const labels = [type.name, type.en_name, type.ar_name]
        .filter(Boolean)
        .map((label) => String(label).trim().toLowerCase());

      return labels.some(
        (label) => label === 'agent' || label.includes('agent'),
      );
    });

    return agentType?.id;
  }, [dropdowns]);

  useEffect(() => {
    let isActive = true;

    const fetchAgents = async () => {
      if (!agentEmployeeTypeId) {
        setCollectedByOptions([]);
        return;
      }

      try {
        const employeesData = await getEmployees({
          employee_type_id: agentEmployeeTypeId,
          page: 1,
          limit: 1000,
        });

        if (!isActive) return;

        setCollectedByOptions(
          employeesData.employees
            .filter((employee) => employee.is_deleted !== 1)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((employee) => ({
              value: employee.id,
              label: employee.full_name || employee.user_name,
            })),
        );
      } catch {
        if (isActive) {
          setCollectedByOptions([]);
        }
      }
    };

    fetchAgents();

    return () => {
      isActive = false;
    };
  }, [agentEmployeeTypeId]);

  const fetchReport = useCallback(
    async (params: SearchFormData) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const result = await getDailyInvoicesReport(
          {
            from_date: params.from_date,
            to_date: params.to_date,
            department_id: params.department_id
              ? Number(params.department_id)
              : undefined,
            unit_number: params.unit_number || undefined,
            collected_by: params.collected_by || undefined,
            invoice_type_id: params.invoice_type_id
              ? Number(params.invoice_type_id)
              : undefined,
          },
          controller.signal,
        );
        setData(result);
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
    setData([]);
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
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'collected_by',
      label: t('dailyInvoices.collectedBy'),
      placeholder: t('dailyInvoices.collectedBy'),
      fieldType: 'select',
      options: collectedByOptions,
    },
    {
      name: 'invoice_type_id',
      label: t('dailyInvoices.invoiceType'),
      placeholder: t('dailyInvoices.invoiceType'),
      fieldType: 'select',
      options: invoiceTypeOptions,
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

  const columns: ColumnDef<DailyInvoiceRow>[] = [
    {
      id: 'invoice_number',
      label: t('dailyInvoices.columns.invoiceNumber'),
      accessorKey: 'invoice_number',
      alwaysVisible: true,
    },
    {
      id: 'customer_name',
      label: t('dailyInvoices.columns.customer'),
      accessorKey: 'customer_name',
    },
    {
      id: 'notes',
      label: t('dailyInvoices.columns.notes'),
      cell: (row) => row.notes ?? '—',
    },
    {
      id: 'service',
      label: t('dailyInvoices.columns.service'),
      accessorKey: 'service',
      alwaysVisible: true,
    },
    {
      id: 'department',
      label: t('dailyInvoices.columns.department'),
      accessorKey: 'department',
    },
    {
      id: 'unit_number',
      label: t('dailyInvoices.columns.unitNumber'),
      accessorKey: 'unit_number',
    },
    {
      id: 'quantity',
      label: t('dailyInvoices.columns.quantity'),
      accessorKey: 'quantity',
    },
    {
      id: 'price',
      label: t('dailyInvoices.columns.price'),
      accessorKey: 'price',
    },
    {
      id: 'total_amount',
      label: t('dailyInvoices.columns.totalAmount'),
      accessorKey: 'total_amount',
    },
    {
      id: 'invoice_status',
      label: t('dailyInvoices.columns.invoiceStatus'),
      accessorKey: 'invoice_status',
    },
    {
      id: 'payment_method',
      label: t('dailyInvoices.columns.paymentMethod'),
      cell: (row) =>
        row.payment_type && row.payment_type.length > 0
          ? row.payment_type.map((p) => p.payment_type_name).join(', ')
          : '—',
    },
    {
      id: 'collected_by',
      label: t('dailyInvoices.columns.collectedBy'),
      cell: (row) => row.collected_by ?? '—',
    },
    {
      id: 'ticket_date',
      label: t('dailyInvoices.columns.invoiceDate'),
      cell: (row) => row.ticket_date?.dateTime ?? '—',
    },
    {
      id: 'request_source_name',
      label: t('dailyInvoices.columns.requestSource'),
      cell: (row) => row.request_source_name ?? '—',
    },
  ];

  const printColumns: PrintColumn<DailyInvoiceRow>[] = [
    {
      label: t('dailyInvoices.columns.invoiceNumber'),
      accessor: (r) => r.invoice_number,
    },
    {
      label: t('dailyInvoices.columns.notes'),
      accessor: (r) => r.notes ?? '—',
    },
    {
      label: t('dailyInvoices.columns.service'),
      accessor: (r) => r.service,
    },
    {
      label: t('dailyInvoices.columns.department'),
      accessor: (r) => r.department,
    },
    {
      label: t('dailyInvoices.columns.unitNumber'),
      accessor: (r) => r.unit_number,
    },
    {
      label: t('dailyInvoices.columns.quantity'),
      accessor: (r) => String(r.quantity),
    },
    {
      label: t('dailyInvoices.columns.price'),
      accessor: (r) => String(r.price),
    },
    {
      label: t('dailyInvoices.columns.totalAmount'),
      accessor: (r) => String(r.total_amount),
    },
    {
      label: t('dailyInvoices.columns.invoiceStatus'),
      accessor: (r) => r.invoice_status,
    },
    {
      label: t('dailyInvoices.columns.paymentMethod'),
      accessor: (r) =>
        r.payment_type && r.payment_type.length > 0
          ? r.payment_type.map((p) => p.payment_type_name).join(', ')
          : '—',
    },
    {
      label: t('dailyInvoices.columns.collectedBy'),
      accessor: (r) => r.collected_by ?? '—',
    },
    {
      label: t('dailyInvoices.columns.invoiceDate'),
      accessor: (r) => r.ticket_date?.dateTime ?? '—',
    },
    {
      label: t('dailyInvoices.columns.requestSource'),
      accessor: (r) => r.request_source_name ?? '—',
    },
  ];

  const dateRange = lastSearch
    ? `${lastSearch.from_date} — ${lastSearch.to_date}`
    : '';

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={t('dailyInvoices.title')}
        fields={fields}
        buttons={buttons}
        initialValues={{
          from_date: '',
          to_date: '',
          department_id: '',
          unit_number: '',
          collected_by: '',
          invoice_type_id: '',
        }}
        validationSchema={searchSchema}
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
          <DataTable<DailyInvoiceRow>
            columns={columns}
            data={data}
            rowKey={(_, i) => i}
            loading={isLoading}
            emptyState={t('noDataFound')}
            itemsPerPage={pageSize}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            persistKey="report-daily-invoices-columns"
            showColumnToggle
            exportEnabled={canReadReport}
            exportEndpoint="/invoices/reports/daily/detailed"
            exportParams={{
              from_date: lastSearch?.from_date,
              to_date: lastSearch?.to_date,
              department_id: lastSearch?.department_id
                ? Number(lastSearch.department_id)
                : undefined,
              unit_number: lastSearch?.unit_number || undefined,
              collected_by: lastSearch?.collected_by || undefined,
              invoice_type_id: lastSearch?.invoice_type_id
                ? Number(lastSearch.invoice_type_id)
                : undefined,
            }}
            exportFileName="daily-invoices-report"
          />
        </MainBox>
      )}

      {isPrinting &&
        canReadReport &&
        createPortal(
          <div className="print-area">
            <ReportPrintTable
              title={t('dailyInvoices.title')}
              dateRange={dateRange}
              columns={printColumns}
              data={data}
              rowsPerPage={pageSize}
              orientation="landscape"
              // summarySection={
              //   data.length > 0 && (
              //     <table style={{ marginBottom: '16px', width: 'auto' }}>
              //       <thead>
              //         <tr>
              //           <th colSpan={2}>{t('dailyInvoices.totals.title')}</th>
              //         </tr>
              //       </thead>
              //       <tbody>
              //         <tr>
              //           <td>{t('dailyInvoices.totals.totalInvoices')}</td>
              //           <td>{totals.totalInvoices}</td>
              //         </tr>
              //         <tr>
              //           <td>{t('dailyInvoices.totals.totalAmount')}</td>
              //           <td>{totals.totalAmount}</td>
              //         </tr>
              //         {totals.byStatus.map((s) => (
              //           <tr key={`st-${s.name}`}>
              //             <td>{s.name}</td>
              //             <td>
              //               {s.count} / {s.amount}
              //             </td>
              //           </tr>
              //         ))}
              //         {totals.byPaymentMethod.map((p) => (
              //           <tr key={`pm-${p.name}`}>
              //             <td>{p.name}</td>
              //             <td>{p.amount}</td>
              //           </tr>
              //         ))}
              //       </tbody>
              //     </table>
              //   )
              // }
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
