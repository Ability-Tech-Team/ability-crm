'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { Printer, CheckCircle } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import ReportPrintTable, {
  PrintColumn,
} from '@/src/components/ReportPrintTable';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import PaymentStatisticsGroups from '@/src/components/PaymentStatisticsGroups';
import {
  getEndDaySummary,
  settleEndDay,
  type EndOfDayResult,
  type EndOfDaySummaryItem,
} from '@/src/services/invoices';

const searchSchema = z.object({
  date: z.string().min(1),
});

type SearchFormData = z.infer<typeof searchSchema>;

// Flattened row for the DataTable
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
  pending_date: string | null;
  collected_date: string | null;
  void_date: string | null;
  under_payment_process_date: string | null;
  void_requested_date: string | null;
  partially_collected_date: string | null;
  refunded_date: string | null;
  refund_requested_date: string | null;
  partially_refunded_date: string | null;
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
        pending_date: inv.pending_date,
        collected_date: inv.collected_date,
        void_date: inv.void_date,
        under_payment_process_date: inv.under_payment_process_date,
        void_requested_date: inv.void_requested_date,
        partially_collected_date: inv.partially_collected_date,
        refunded_date: inv.refunded_date,
        refund_requested_date: inv.refund_requested_date,
        partially_refunded_date: inv.partially_refunded_date,
        has_runner_cashier: inv.has_runner_cashier,
        runner_cashier_price: inv.runner_cashier_price,
      });
    }
  }
  return rows;
}

export default function EndOfDayPage() {
  const t = useTranslations('invoices.endOfDay');
  const tForm = useTranslations('form');
  const { success: showSuccess, error: showError } = useResponseMessage();
  const endOfDayPrivileges = useRoutePrivileges('/invoices/end-of-day');
  const canSettleEndOfDay = endOfDayPrivileges.hasPrivilege(
    PRIVILEGE_IDS.END_OF_DAY,
  );
  const canExportEndOfDay = endOfDayPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EXPORT,
  );
  const today = new Date().toISOString().slice(0, 10);

  const [result, setResult] = useState<EndOfDayResult | null>(null);
  const [rows, setRows] = useState<EndOfDayRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [lastDate, setLastDate] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (date: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getEndDaySummary(
          { date, end_of_day: 1 },
          controller.signal,
        );
        const eodResult: EndOfDayResult = {
          type: 'end_of_day',
          employee_name: (data as EndOfDayResult).employee_name ?? '',
          safe_name: (data as EndOfDayResult).safe_name ?? '',
          summary: (data as EndOfDayResult).summary ?? [],
          totals: {
            ...data.totals,
            payment_type_totals: data.totals.payment_type_totals ?? {
              total_cash: 0,
              total_visa: 0,
              total_online: 0,
              total_sister_company: 0,
              total_cheque: 0,
              total_instapay: 0,
              total_estimated_cost_refund: 0,
            },
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
    setLastDate(formData.date);
    await fetchData(formData.date);
  };

  const handleReset = () => {
    setResult(null);
    setRows([]);
    setHasSearched(false);
    setError('');
    setLastDate('');
  };

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  }, []);

  const handleSettle = async () => {
    setIsSettling(true);
    try {
      await settleEndDay({ date: lastDate, end_of_day: 1 });
      showSuccess('settleSuccess');
      setSettleModalOpen(false);
      // Refresh data after settlement
      await fetchData(lastDate);
    } catch (err) {
      showError(err);
    } finally {
      setIsSettling(false);
    }
  };

  const fields: FieldConfig[] = [
    {
      name: 'date',
      label: tForm('date'),
      placeholder: tForm('date'),
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
        label: t('columns.employee'),
        accessorKey: 'employee_name',
      },
      {
        id: 'safe_name',
        label: t('columns.safe'),
        accessorKey: 'safe_name',
      },
      {
        id: 'payment_type',
        label: t('columns.paymentType'),
        accessorKey: 'payment_type',
      },
      {
        id: 'invoice_status_name',
        label: t('columns.status'),
        accessorKey: 'invoice_status_name',
      },
      {
        id: 'invoice_number',
        label: t('columns.invoiceNumber'),
        accessorKey: 'invoice_number',
        alwaysVisible: true,
      },
      {
        id: 'customer_name',
        label: t('columns.customer'),
        accessorKey: 'customer_name',
        alwaysVisible: true,
      },
      {
        id: 'unit_number',
        label: t('columns.unit'),
        accessorKey: 'unit_number',
      },
      {
        id: 'invoice_type',
        label: t('columns.invoiceType'),
        accessorKey: 'invoice_type',
      },
      {
        id: 'total_amount',
        label: t('columns.amount'),
        accessorKey: 'total_amount',
      },
      {
        id: 'pending_date',
        label: t('columns.pendingDate'),
        cell: (row) => row.pending_date || '—',
      },
      {
        id: 'collected_date',
        label: t('columns.collectedDate'),
        cell: (row) => row.collected_date || '—',
      },
      {
        id: 'void_date',
        label: t('columns.voidDate'),
        cell: (row) => row.void_date || '—',
      },
      {
        id: 'under_payment_process_date',
        label: t('columns.underPaymentProcessDate'),
        cell: (row) => row.under_payment_process_date || '—',
      },
      {
        id: 'void_requested_date',
        label: t('columns.voidRequestedDate'),
        cell: (row) => row.void_requested_date || '—',
      },
      {
        id: 'partially_collected_date',
        label: t('columns.partiallyCollectedDate'),
        cell: (row) => row.partially_collected_date || '—',
      },
      {
        id: 'refunded_date',
        label: t('columns.refundedDate'),
        cell: (row) => row.refunded_date || '—',
      },
      {
        id: 'refund_requested_date',
        label: t('columns.refundRequestedDate'),
        cell: (row) => row.refund_requested_date || '—',
      },
      {
        id: 'partially_refunded_date',
        label: t('columns.partiallyRefundedDate'),
        cell: (row) => row.partially_refunded_date || '—',
      },
      {
        id: 'runner_cashier',
        label: t('columns.runnerCashier'),
        cell: (row) =>
          row.has_runner_cashier ? row.runner_cashier_price : '—',
      },
    ],
    [t],
  );

  const printColumns: PrintColumn<EndOfDayRow>[] = useMemo(
    () => [
      { label: t('columns.employee'), accessor: (r) => r.employee_name },
      { label: t('columns.safe'), accessor: (r) => r.safe_name },
      { label: t('columns.paymentType'), accessor: (r) => r.payment_type },
      { label: t('columns.status'), accessor: (r) => r.invoice_status_name },
      { label: t('columns.invoiceNumber'), accessor: (r) => r.invoice_number },
      { label: t('columns.customer'), accessor: (r) => r.customer_name },
      { label: t('columns.unit'), accessor: (r) => r.unit_number },
      { label: t('columns.invoiceType'), accessor: (r) => r.invoice_type },
      { label: t('columns.amount'), accessor: (r) => r.total_amount },
      { label: t('columns.pendingDate'), accessor: (r) => r.pending_date },
      { label: t('columns.collectedDate'), accessor: (r) => r.collected_date },
      { label: t('columns.voidDate'), accessor: (r) => r.void_date },
      {
        label: t('columns.underPaymentProcessDate'),
        accessor: (r) => r.under_payment_process_date,
      },
      {
        label: t('columns.voidRequestedDate'),
        accessor: (r) => r.void_requested_date,
      },
      {
        label: t('columns.partiallyCollectedDate'),
        accessor: (r) => r.partially_collected_date,
      },
      { label: t('columns.refundedDate'), accessor: (r) => r.refunded_date },
      {
        label: t('columns.refundRequestedDate'),
        accessor: (r) => r.refund_requested_date,
      },
      {
        label: t('columns.partiallyRefundedDate'),
        accessor: (r) => r.partially_refunded_date,
      },
    ],
    [t],
  );

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={t('title')}
        fields={fields}
        buttons={buttons}
        initialValues={{ date: today }}
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

      {hasSearched && result && (
        <>
          {/* Employee info */}
          {result.employee_name && (
            <MainBox>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <span className="font-medium text-slate-500">
                  {t('employee')}:
                </span>
                <span className="font-semibold">{result.employee_name}</span>
              </div>
            </MainBox>
          )}

          {/* Payment statistics grouped by payment type */}
          <PaymentStatisticsGroups
            summary={result.summary}
            totals={result.totals}
            t={(key) => t(`totals.${key}`)}
          />

          {/* Data table */}
          <MainBox>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {rows.length} {t('columns.invoiceNumber')}
              </h2>
              {rows.length > 0 && (
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={handlePrint}>
                    <Printer size={16} className="me-1 inline" />
                    {t('print')}
                  </Button>
                  {canSettleEndOfDay && (
                    <Button
                      variant="success"
                      size="sm"
                      onClick={() => setSettleModalOpen(true)}
                    >
                      <CheckCircle size={16} className="me-1 inline" />
                      {t('settle')}
                    </Button>
                  )}
                </div>
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
              persistKey="invoices-eod-columns"
              showColumnToggle
              exportEnabled={canExportEndOfDay}
              exportEndpoint="/orders/invoices/end-day/summary"
              exportParams={{ date: lastDate, end_of_day: 1 }}
              exportFileName="end-of-day"
            />
          </MainBox>
        </>
      )}

      {hasSearched && !isLoading && !result && !error && (
        <MainBox>
          <p className="text-center text-slate-500 py-4">{t('noDataFound')}</p>
        </MainBox>
      )}

      {/* Settle confirmation modal */}
      <ConfirmModal
        open={settleModalOpen}
        title={t('settleConfirmTitle')}
        message={t('settleConfirmMessage')}
        confirmLabel={t('settle')}
        cancelLabel={tForm('cancel')}
        confirmVariant="success"
        isLoading={isSettling}
        loadingLabel={t('settling')}
        onConfirm={handleSettle}
        onCancel={() => setSettleModalOpen(false)}
      />

      {/* Print portal */}
      {isPrinting &&
        createPortal(
          <div className="print-area">
            <ReportPrintTable
              title={t('title')}
              dateRange={lastDate}
              columns={printColumns}
              data={rows}
              rowsPerPage={pageSize}
              summarySection={result && <PrintSummary result={result} t={t} />}
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
    { label: t('totals.totalCash'), value: pt.total_cash },
    { label: t('totals.totalVisa'), value: pt.total_visa },
    { label: t('totals.totalOnline'), value: pt.total_online },
    { label: t('totals.totalSisterCompany'), value: pt.total_sister_company },
    { label: t('totals.totalCheque'), value: pt.total_cheque },
    { label: t('totals.totalInstapay'), value: pt.total_instapay },
    {
      label: t('totals.totalEstimatedCostRefund'),
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
                {g.payment_type} {t('totals.paymentsSuffix')}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{t('totals.totalCollected')}</td>
              <td>{g.total_collected}</td>
            </tr>
            <tr>
              <td>{t('totals.totalVoided')}</td>
              <td>{g.total_voided}</td>
            </tr>
            <tr>
              <td>{t('totals.totalVoidRequested')}</td>
              <td>{g.total_void_requested}</td>
            </tr>
            <tr>
              <td>{t('totals.totalRefunded')}</td>
              <td>{g.total_refunded}</td>
            </tr>
            <tr>
              <td>{t('totals.totalPartiallyRefunded')}</td>
              <td>{g.total_partially_refunded}</td>
            </tr>
            <tr>
              <td>{t('totals.totalRefundRequested')}</td>
              <td>{g.total_refund_requested}</td>
            </tr>
            <tr>
              <td>{t('totals.netBalance')}</td>
              <td>{g.user_collected_amount}</td>
            </tr>
          </tbody>
        </table>
      ))}
      {(totalRows.length > 0 || result.totals.total_pending !== 0) && (
        <table style={{ width: 'auto' }}>
          <thead>
            <tr>
              <th colSpan={2}>{t('totals.paymentTotalsTitle')}</th>
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
                <td>{t('totals.totalPending')}</td>
                <td>{result.totals.total_pending}</td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
