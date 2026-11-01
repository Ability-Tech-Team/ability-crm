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
import { useSession } from '@/src/hooks/useSession';
import ReportPrintTable, {
  PrintColumn,
} from '@/src/components/ReportPrintTable';
import PaymentStatisticsGroups from '@/src/components/PaymentStatisticsGroups';
import {
  getEndDaySummary,
  type EndOfDayResult,
  type EndOfDaySummaryItem,
  type FullEndOfDayResult,
  type FullEndOfDayEmployeeSummary,
} from '@/src/services/invoices';

const searchSchema = z.object({
  from_date: z.string().min(1),
  to_date: z.string().min(1),
});

type SearchFormData = z.infer<typeof searchSchema>;

interface EndOfDayRow {
  key: string;
  employee_name: string;
  safe_name: string;
  invoice_number: string;
  customer_name: string;
  unit_number: string;
  invoice_type: string;
  invoice_status_name: string;
  payment_type: string;
  total_amount: number;
  has_runner_cashier: number;
  runner_cashier_price: number;
}

function flattenSummary(
  summary: EndOfDaySummaryItem[],
  employeeName: string,
  safeName: string,
): EndOfDayRow[] {
  const rows: EndOfDayRow[] = [];
  for (const item of summary) {
    for (const inv of item.invoices) {
      rows.push({
        key: `${item.payment_type_id ?? 'none'}-${inv.invoice_number}`,
        employee_name: employeeName,
        safe_name: safeName,
        invoice_number: inv.invoice_number,
        customer_name: inv.customer_name,
        unit_number: inv.unit_number,
        invoice_type: inv.invoice_type ?? '—',
        invoice_status_name: inv.invoice_status_name,
        payment_type: item.payment_type,
        total_amount: inv.total_amount,
        has_runner_cashier: inv.has_runner_cashier,
        runner_cashier_price: inv.runner_cashier_price,
      });
    }
  }
  return rows;
}

function flattenFullSummary(
  summary: FullEndOfDayEmployeeSummary[],
): EndOfDayRow[] {
  const rows: EndOfDayRow[] = [];
  for (const emp of summary) {
    for (const pt of emp.payment_types) {
      for (const inv of pt.invoices) {
        rows.push({
          key: `${emp.employee_id ?? 'none'}-${pt.payment_type_id ?? 'none'}-${inv.invoice_number}`,
          employee_name: emp.employee_name,
          safe_name: emp.safe_name ?? '',
          invoice_number: inv.invoice_number,
          customer_name: inv.customer_name,
          unit_number: inv.unit_number,
          invoice_type: inv.invoice_type ?? '—',
          invoice_status_name: inv.invoice_status_name,
          payment_type: pt.payment_type,
          total_amount: inv.total_amount,
          has_runner_cashier: inv.has_runner_cashier,
          runner_cashier_price: inv.runner_cashier_price,
        });
      }
    }
  }
  return rows;
}

interface EmployeeStatsRow {
  key: string;
  employee_name: string;
  safe_name: string;
  total_cash: number;
  total_visa: number;
  total_online: number;
  total_sister_company: number;
  total_cheque: number;
  total_instapay: number;
  total_voided: number;
  total_void_requested: number;
  total_refunded: number;
  total_partially_refunded: number;
  total_refund_requested: number;
  net_balance: number;
}

const PAYMENT_TYPE_KEY_BY_ID: Record<number, keyof EmployeeStatsRow> = {
  1: 'total_cash',
  2: 'total_visa',
  3: 'total_online',
  4: 'total_sister_company',
  5: 'total_cheque',
  6: 'total_instapay',
};

function buildEmployeeStats(
  summary: FullEndOfDayEmployeeSummary[],
): EmployeeStatsRow[] {
  return summary.map((emp, idx) => {
    const row: EmployeeStatsRow = {
      key: `${emp.employee_id ?? `none-${idx}`}`,
      employee_name: emp.employee_name,
      safe_name: emp.safe_name ?? '',
      total_cash: 0,
      total_visa: 0,
      total_online: 0,
      total_sister_company: 0,
      total_cheque: 0,
      total_instapay: 0,
      total_voided: 0,
      total_void_requested: 0,
      total_refunded: 0,
      total_partially_refunded: 0,
      total_refund_requested: 0,
      net_balance: emp.net_balance ?? 0,
    };
    for (const pt of emp.payment_types) {
      row.total_voided += pt.total_voided ?? 0;
      row.total_void_requested += pt.total_void_requested ?? 0;
      row.total_refunded += pt.total_refunded ?? 0;
      row.total_partially_refunded += pt.total_partially_refunded ?? 0;
      row.total_refund_requested += pt.total_refund_requested ?? 0;
      if (pt.payment_type_id != null) {
        const key = PAYMENT_TYPE_KEY_BY_ID[pt.payment_type_id];
        if (key) {
          (row[key] as number) += pt.user_collected_amount ?? 0;
        }
      }
    }
    return row;
  });
}

export default function EndOfDayReportPage() {
  const t = useTranslations('reports');
  const tForm = useTranslations('form');
  const reportPrivileges = useRoutePrivileges('/reports/end-of-day');
  const canReadReport = reportPrivileges.canAccess;

  const { fullName, employeeTypeName } = useSession().details;
  const isMaster = employeeTypeName === 'Master Account';

  const [result, setResult] = useState<
    EndOfDayResult | FullEndOfDayResult | null
  >(null);
  const [rows, setRows] = useState<EndOfDayRow[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatsRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isStatsPrinting, setIsStatsPrinting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const abortRef = useRef<AbortController | null>(null);
  const [lastSearch, setLastSearch] = useState<SearchFormData | null>(null);

  const fetchReport = useCallback(
    async (params: SearchFormData) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getEndDaySummary(
          {
            date: params.from_date,
            to_date: params.to_date,
            is_report: 1,
            ...(isMaster ? { full_end_of_day: 1 } : { end_of_day: 1 }),
          },
          controller.signal,
        );
        const fallbackPaymentTypeTotals = {
          total_cash: 0,
          total_visa: 0,
          total_online: 0,
          total_sister_company: 0,
          total_cheque: 0,
          total_instapay: 0,
          total_estimated_cost_refund: 0,
        };
        if (data.type === 'full_end_of_day') {
          const feodResult: FullEndOfDayResult = {
            type: 'full_end_of_day',
            summary: data.summary ?? [],
            totals: {
              ...data.totals,
              payment_type_totals:
                data.totals.payment_type_totals ?? fallbackPaymentTypeTotals,
            },
          };
          setResult(feodResult);
          setRows(flattenFullSummary(feodResult.summary));
          setEmployeeStats(buildEmployeeStats(feodResult.summary));
        } else {
          const eodResult: EndOfDayResult = {
            type: 'end_of_day',
            employee_name: data.employee_name ?? '',
            safe_name: data.safe_name ?? '',
            summary: data.summary ?? [],
            totals: {
              ...data.totals,
              payment_type_totals:
                data.totals.payment_type_totals ?? fallbackPaymentTypeTotals,
            },
          };
          setResult(eodResult);
          setRows(
            flattenSummary(
              eodResult.summary,
              eodResult.employee_name,
              eodResult.safe_name,
            ),
          );
          setEmployeeStats([]);
        }
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
    [t, isMaster],
  );

  const handleSubmit = async (formData: SearchFormData) => {
    setHasSearched(true);
    setLastSearch(formData);
    await fetchReport(formData);
  };

  const handleReset = () => {
    setResult(null);
    setRows([]);
    setEmployeeStats([]);
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

  const handleStatsPrint = useCallback(() => {
    setIsStatsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsStatsPrinting(false);
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

  const columns: ColumnDef<EndOfDayRow>[] = useMemo(
    () => [
      {
        id: 'employee_name',
        label: t('endOfDay.columns.employee'),
        accessorKey: 'employee_name',
      },
      {
        id: 'safe_name',
        label: t('endOfDay.columns.safe'),
        accessorKey: 'safe_name',
      },
      {
        id: 'payment_type',
        label: t('endOfDay.columns.paymentType'),
        accessorKey: 'payment_type',
      },
      {
        id: 'invoice_status_name',
        label: t('endOfDay.columns.status'),
        accessorKey: 'invoice_status_name',
      },
      {
        id: 'invoice_number',
        label: t('endOfDay.columns.invoiceNumber'),
        accessorKey: 'invoice_number',
        alwaysVisible: true,
      },
      {
        id: 'customer_name',
        label: t('endOfDay.columns.customer'),
        accessorKey: 'customer_name',
        alwaysVisible: true,
      },
      {
        id: 'unit_number',
        label: t('endOfDay.columns.unit'),
        accessorKey: 'unit_number',
      },
      {
        id: 'invoice_type',
        label: t('endOfDay.columns.invoiceType'),
        accessorKey: 'invoice_type',
      },
      {
        id: 'total_amount',
        label: t('endOfDay.columns.amount'),
        accessorKey: 'total_amount',
      },
      {
        id: 'runner_cashier',
        label: t('endOfDay.columns.runnerCashier'),
        cell: (row) =>
          row.has_runner_cashier ? row.runner_cashier_price : '—',
      },
    ],
    [t],
  );

  const employeeStatsColumns: ColumnDef<EmployeeStatsRow>[] = useMemo(
    () => [
      {
        id: 'employee_name',
        label: t('endOfDay.columns.employee'),
        accessorKey: 'employee_name',
        alwaysVisible: true,
      },
      {
        id: 'safe_name',
        label: t('endOfDay.columns.safe'),
        accessorKey: 'safe_name',
      },
      {
        id: 'total_cash',
        label: t('endOfDay.totals.totalCash'),
        accessorKey: 'total_cash',
      },
      {
        id: 'total_visa',
        label: t('endOfDay.totals.totalVisa'),
        accessorKey: 'total_visa',
      },
      {
        id: 'total_online',
        label: t('endOfDay.totals.totalOnline'),
        accessorKey: 'total_online',
      },
      {
        id: 'total_sister_company',
        label: t('endOfDay.totals.totalSisterCompany'),
        accessorKey: 'total_sister_company',
      },
      {
        id: 'total_cheque',
        label: t('endOfDay.totals.totalCheque'),
        accessorKey: 'total_cheque',
      },
      {
        id: 'total_instapay',
        label: t('endOfDay.totals.totalInstapay'),
        accessorKey: 'total_instapay',
      },
      {
        id: 'total_voided',
        label: t('endOfDay.totals.totalVoided'),
        accessorKey: 'total_voided',
      },
      {
        id: 'total_void_requested',
        label: t('endOfDay.totals.totalVoidRequested'),
        accessorKey: 'total_void_requested',
      },
      {
        id: 'total_refunded',
        label: t('endOfDay.totals.totalRefunded'),
        accessorKey: 'total_refunded',
      },
      {
        id: 'total_partially_refunded',
        label: t('endOfDay.totals.totalPartiallyRefunded'),
        accessorKey: 'total_partially_refunded',
      },
      {
        id: 'total_refund_requested',
        label: t('endOfDay.totals.totalRefundRequested'),
        accessorKey: 'total_refund_requested',
      },
      {
        id: 'net_balance',
        label: t('endOfDay.totals.netBalance'),
        accessorKey: 'net_balance',
      },
    ],
    [t],
  );

  const statsPrintColumns: PrintColumn<EmployeeStatsRow>[] = useMemo(
    () => [
      {
        label: t('endOfDay.columns.employee'),
        accessor: (r) => r.employee_name,
      },
      {
        label: t('endOfDay.columns.safe'),
        accessor: (r) => r.safe_name,
      },
      {
        label: t('endOfDay.totals.totalCash'),
        accessor: (r) => r.total_cash,
      },
      {
        label: t('endOfDay.totals.totalVisa'),
        accessor: (r) => r.total_visa,
      },
      {
        label: t('endOfDay.totals.totalOnline'),
        accessor: (r) => r.total_online,
      },
      {
        label: t('endOfDay.totals.totalSisterCompany'),
        accessor: (r) => r.total_sister_company,
      },
      {
        label: t('endOfDay.totals.totalCheque'),
        accessor: (r) => r.total_cheque,
      },
      {
        label: t('endOfDay.totals.totalInstapay'),
        accessor: (r) => r.total_instapay,
      },
      {
        label: t('endOfDay.totals.totalVoided'),
        accessor: (r) => r.total_voided,
      },
      {
        label: t('endOfDay.totals.totalVoidRequested'),
        accessor: (r) => r.total_void_requested,
      },
      {
        label: t('endOfDay.totals.totalRefunded'),
        accessor: (r) => r.total_refunded,
      },
      {
        label: t('endOfDay.totals.totalPartiallyRefunded'),
        accessor: (r) => r.total_partially_refunded,
      },
      {
        label: t('endOfDay.totals.totalRefundRequested'),
        accessor: (r) => r.total_refund_requested,
      },
      {
        label: t('endOfDay.totals.netBalance'),
        accessor: (r) => r.net_balance,
      },
    ],
    [t],
  );

  const printColumns: PrintColumn<EndOfDayRow>[] = useMemo(
    () => [
      {
        label: t('endOfDay.columns.employee'),
        accessor: (r) => r.employee_name,
      },
      {
        label: t('endOfDay.columns.safe'),
        accessor: (r) => r.safe_name,
      },
      {
        label: t('endOfDay.columns.paymentType'),
        accessor: (r) => r.payment_type,
      },
      {
        label: t('endOfDay.columns.status'),
        accessor: (r) => r.invoice_status_name,
      },
      {
        label: t('endOfDay.columns.invoiceNumber'),
        accessor: (r) => r.invoice_number,
      },
      {
        label: t('endOfDay.columns.customer'),
        accessor: (r) => r.customer_name,
      },
      { label: t('endOfDay.columns.unit'), accessor: (r) => r.unit_number },
      {
        label: t('endOfDay.columns.invoiceType'),
        accessor: (r) => r.invoice_type,
      },
      {
        label: t('endOfDay.columns.amount'),
        accessor: (r) => r.total_amount,
      },
    ],
    [t],
  );

  const dateRange = lastSearch
    ? `${lastSearch.from_date} — ${lastSearch.to_date}`
    : '';

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={t('endOfDay.title')}
        fields={fields}
        buttons={buttons}
        initialValues={{ from_date: '', to_date: '' }}
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
          {result.type === 'full_end_of_day' ? (
            <MainBox>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('endOfDay.employeeStats.title')}
                </h2>
                {employeeStats.length > 0 && canReadReport && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleStatsPrint}
                  >
                    <Printer size={16} className="me-1 inline" />
                    {t('print')}
                  </Button>
                )}
              </div>
              <DataTable<EmployeeStatsRow>
                columns={employeeStatsColumns}
                data={employeeStats}
                rowKey={(row) => row.key}
                loading={isLoading}
                emptyState={t('noDataFound')}
                itemsPerPage={10}
                persistKey="report-eod-employee-stats-columns"
                showColumnToggle
                exportEnabled={canReadReport}
                exportEndpoint="/orders/invoices/end-day/summary"
                exportParams={{
                  date: lastSearch?.from_date,
                  to_date: lastSearch?.to_date,
                  is_report: 1,
                  ...(isMaster ? { full_end_of_day: 1 } : { end_of_day: 1 }),
                }}
                exportFileName="end-of-day-report-employee-stats"
              />
            </MainBox>
          ) : (
            <PaymentStatisticsGroups
              summary={result.summary}
              totals={result.totals}
              t={(key) => t(`endOfDay.totals.${key}`)}
            />
          )}

          <MainBox>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {t('results')} ({rows.length})
              </h2>
              {rows.length > 0 && canReadReport && (
                <Button variant="secondary" size="sm" onClick={handlePrint}>
                  <Printer size={16} className="me-1 inline" />
                  {t('print')}
                </Button>
              )}
            </div>
            <DataTable<EndOfDayRow>
              columns={columns}
              data={rows}
              rowKey={(row) => row.key}
              loading={isLoading}
              emptyState={t('noDataFound')}
              itemsPerPage={pageSize}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              persistKey="report-eod-columns"
              showColumnToggle
              exportEnabled={canReadReport}
              exportEndpoint="/orders/invoices/end-day/summary"
              exportParams={{
                date: lastSearch?.from_date,
                to_date: lastSearch?.to_date,
                is_report: 1,
                is_excel: 2,
                ...(isMaster ? { full_end_of_day: 1 } : { end_of_day: 1 }),
              }}
              exportFileName="end-of-day-report"
            />
          </MainBox>
        </>
      )}

      {isStatsPrinting &&
        canReadReport &&
        createPortal(
          <div className="print-area">
            <ReportPrintTable
              title={t('endOfDay.employeeStats.title')}
              dateRange={dateRange}
              printedBy={fullName}
              columns={statsPrintColumns}
              data={employeeStats}
              rowsPerPage={pageSize}
            />
          </div>,
          document.body,
        )}

      {isPrinting &&
        canReadReport &&
        createPortal(
          <div className="print-area">
            <ReportPrintTable
              title={t('endOfDay.title')}
              dateRange={dateRange}
              printedBy={fullName}
              columns={printColumns}
              data={rows}
              rowsPerPage={pageSize}
              summarySection={
                result && result.type === 'end_of_day' ? (
                  <PrintSummary result={result} t={t} />
                ) : null
              }
            />
          </div>,
          document.body,
        )}
    </div>
  );
}

function PrintSummary({
  result,
  t,
}: {
  result: EndOfDayResult;
  t: (key: string) => string;
}) {
  const groups = result.summary.filter(
    (g) =>
      g.payment_type_id != null &&
      (g.total_collected !== 0 ||
        g.total_voided !== 0 ||
        g.total_void_requested !== 0 ||
        g.total_refunded !== 0 ||
        g.total_partially_refunded !== 0 ||
        g.total_refund_requested !== 0 ||
        g.user_collected_amount !== 0),
  );
  const pt = result.totals.payment_type_totals;
  const totalRows: { label: string; value: number }[] = [
    { label: t('endOfDay.totals.totalCash'), value: pt.total_cash },
    { label: t('endOfDay.totals.totalVisa'), value: pt.total_visa },
    { label: t('endOfDay.totals.totalOnline'), value: pt.total_online },
    {
      label: t('endOfDay.totals.totalSisterCompany'),
      value: pt.total_sister_company,
    },
    { label: t('endOfDay.totals.totalCheque'), value: pt.total_cheque },
    { label: t('endOfDay.totals.totalInstapay'), value: pt.total_instapay },
    {
      label: t('endOfDay.totals.totalEstimatedCostRefund'),
      value: pt.total_estimated_cost_refund ?? 0,
    },
  ].filter((r) => r.value !== 0);

  return (
    <div
      style={{
        marginBottom: '16px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '16px',
        alignItems: 'flex-start',
      }}
    >
      {groups.map((g) => (
        <table
          key={g.payment_type_id ?? g.payment_type}
          style={{ width: 'auto' }}
        >
          <thead>
            <tr>
              <th colSpan={2}>
                {g.payment_type} {t('endOfDay.totals.paymentsSuffix')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('endOfDay.totals.totalCollected')}</td>
              <td>{g.total_collected}</td>
            </tr>
            <tr>
              <td>{t('endOfDay.totals.totalVoided')}</td>
              <td>{g.total_voided}</td>
            </tr>
            <tr>
              <td>{t('endOfDay.totals.totalVoidRequested')}</td>
              <td>{g.total_void_requested}</td>
            </tr>
            <tr>
              <td>{t('endOfDay.totals.totalRefunded')}</td>
              <td>{g.total_refunded}</td>
            </tr>
            <tr>
              <td>{t('endOfDay.totals.totalPartiallyRefunded')}</td>
              <td>{g.total_partially_refunded}</td>
            </tr>
            <tr>
              <td>{t('endOfDay.totals.totalRefundRequested')}</td>
              <td>{g.total_refund_requested}</td>
            </tr>
            <tr>
              <td>{t('endOfDay.totals.netBalance')}</td>
              <td>{g.user_collected_amount}</td>
            </tr>
          </tbody>
        </table>
      ))}
      {(totalRows.length > 0 || result.totals.total_pending !== 0) && (
        <table style={{ width: 'auto' }}>
          <thead>
            <tr>
              <th colSpan={2}>{t('endOfDay.totals.paymentTotalsTitle')}</th>
            </tr>
          </thead>
          <tbody>
            {totalRows.map((r) => (
              <tr key={r.label}>
                <td>{r.label}</td>
                <td>{r.value}</td>
              </tr>
            ))}
            {result.totals.total_pending !== 0 && (
              <tr>
                <td>{t('endOfDay.totals.totalPending')}</td>
                <td>{result.totals.total_pending}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
