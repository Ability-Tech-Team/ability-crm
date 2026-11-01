'use client';

import { z } from 'zod';
import { useState, useCallback, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Printer, CheckCircle } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import DataTable, { ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import ReportPrintTable, {
  PrintColumn,
} from '@/src/components/ReportPrintTable';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { useSession } from '@/src/hooks/useSession';
import {
  getEndDaySummary,
  settleEndDay,
  type FullEndOfDayResult,
  type FullEndOfDayEmployeeSummary,
} from '@/src/services/invoices';

const searchSchema = z.object({
  date: z.string().min(1),
  safe_id: z.string().optional(),
  employee_name: z.string().optional(),
});

type SearchFormData = z.infer<typeof searchSchema>;

// Flattened row for the DataTable
interface FullEndOfDayRow {
  key: string;
  employee_name: string;
  safe_name: string;
  payment_type: string;
  invoice_status_name: string;
  invoice_number: string;
  customer_name: string;
  service_names: string;
  unit_number: string;
  invoice_type: string;
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

// Per-employee payment statistics row
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
  total_estimated_cost_refund: number;
  net_balance: number;
}

const PAYMENT_TYPE_KEY_BY_ID: Record<number, keyof EmployeeStatsRow> = {
  1: 'total_cash',
  2: 'total_visa',
  3: 'total_online',
  4: 'total_sister_company',
  5: 'total_cheque',
  6: 'total_instapay',
  7: 'total_estimated_cost_refund',
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
      total_estimated_cost_refund: 0,
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

function flattenSummary(
  summary: FullEndOfDayEmployeeSummary[],
): FullEndOfDayRow[] {
  const rows: FullEndOfDayRow[] = [];
  for (const emp of summary) {
    for (const pt of emp.payment_types) {
      for (const inv of pt.invoices) {
        rows.push({
          key: `${emp.employee_id ?? 'none'}-${pt.payment_type_id ?? 'none'}-${inv.invoice_number}`,
          employee_name: emp.employee_name,
          safe_name: emp.safe_name ?? '',
          payment_type: pt.payment_type,
          invoice_status_name: inv.invoice_status_name,
          invoice_number: inv.invoice_number,
          customer_name: inv.customer_name,
          service_names:
            inv.services
              ?.map((service) => service.service_name?.trim())
              .filter(Boolean)
              .join(', ') || '—',
          unit_number: inv.unit_number,
          invoice_type: inv.invoice_type ?? '—',
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
  }
  return rows;
}

export default function FullEndOfDayPage() {
  const t = useTranslations('invoices.fullEndOfDay');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const fullEndOfDayPrivileges = useRoutePrivileges(
    '/invoices/full-end-of-day',
  );
  const canSettleFullEndOfDay = fullEndOfDayPrivileges.hasPrivilege(
    PRIVILEGE_IDS.FULL_END_OF_DAY,
  );
  const userSafeId = useSession().details.safeId;
  const canPrintFullEndOfDay = fullEndOfDayPrivileges.canAccess;
  const canExportFullEndOfDay = fullEndOfDayPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EXPORT,
  );
  const today = new Date().toISOString().slice(0, 10);

  const [result, setResult] = useState<FullEndOfDayResult | null>(null);
  const [rows, setRows] = useState<FullEndOfDayRow[]>([]);
  const [employeeStats, setEmployeeStats] = useState<EmployeeStatsRow[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [isSettling, setIsSettling] = useState(false);
  const [lastParams, setLastParams] = useState<{
    date: string;
    safe_id?: number;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const safeOptions = useMemo(
    () =>
      (dropdowns?.safes ?? []).map((s) => ({
        value: String(s.id),
        label: s.name,
      })),
    [dropdowns],
  );

  const fetchData = useCallback(
    async (date: string, safeId?: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getEndDaySummary(
          {
            date,
            full_end_of_day: 1,
            ...(safeId ? { safe_id: safeId } : {}),
          },
          controller.signal,
        );
        const feodResult: FullEndOfDayResult = {
          type: 'full_end_of_day',
          summary: (data as FullEndOfDayResult).summary ?? [],
          unsettled_employees:
            (data as FullEndOfDayResult).unsettled_employees ?? [],
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
        setResult(feodResult);
        setRows(flattenSummary(feodResult.summary));
        setEmployeeStats(buildEmployeeStats(feodResult.summary));
        setSelectedEmployee('');
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
    const safeId = formData.safe_id ? Number(formData.safe_id) : undefined;
    const employeeName = formData.employee_name ?? '';
    // If only the employee filter changed, skip refetch and just update the
    // client-side filter.
    if (
      lastParams &&
      lastParams.date === formData.date &&
      lastParams.safe_id === safeId
    ) {
      setSelectedEmployee(employeeName);
      return;
    }
    setLastParams({ date: formData.date, safe_id: safeId });
    setSelectedEmployee(employeeName);
    await fetchData(formData.date, safeId);
  };

  const handleReset = () => {
    setResult(null);
    setRows([]);
    setEmployeeStats([]);
    setSelectedEmployee('');
    setHasSearched(false);
    setError('');
    setLastParams(null);
  };

  const employeeOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    for (const emp of employeeStats) {
      if (!emp.employee_name || seen.has(emp.employee_name)) continue;
      seen.add(emp.employee_name);
      opts.push({ value: emp.employee_name, label: emp.employee_name });
    }
    return opts;
  }, [employeeStats]);

  const unsettledEmployeeNames = useMemo(() => {
    const names = (result?.unsettled_employees ?? [])
      .map((employee) => employee.name?.trim())
      .filter((name): name is string => Boolean(name));

    return Array.from(new Set(names));
  }, [result]);

  const filteredRows = useMemo(
    () =>
      selectedEmployee
        ? rows.filter((r) => r.employee_name === selectedEmployee)
        : rows,
    [rows, selectedEmployee],
  );

  const filteredEmployeeStats = useMemo(
    () =>
      selectedEmployee
        ? employeeStats.filter((e) => e.employee_name === selectedEmployee)
        : employeeStats,
    [employeeStats, selectedEmployee],
  );

  // Settle is only allowed when the user has not narrowed the result by
  // employee, and when a safe filter is selected that matches the user's
  // own safe.
  const isSettleAllowed = useMemo(() => {
    if (selectedEmployee) return false;
    const filterSafeId = lastParams?.safe_id ?? null;
    if (filterSafeId == null) return false;
    if (filterSafeId !== userSafeId) return false;
    return true;
  }, [selectedEmployee, lastParams, userSafeId]);

  const handlePrint = useCallback(() => {
    setIsPrinting(true);
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
  }, []);

  const handleSettle = async () => {
    if (!lastParams) return;
    setIsSettling(true);
    try {
      await settleEndDay({
        date: lastParams.date,
        full_end_of_day: 1,
        ...(lastParams.safe_id ? { safe_id: lastParams.safe_id } : {}),
      });
      showSuccess('settleSuccess');
      setSettleModalOpen(false);
      // Refresh data after settlement
      await fetchData(lastParams.date, lastParams.safe_id);
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
    {
      name: 'safe_id',
      label: tForm('safe'),
      placeholder: tForm('safe'),
      fieldType: 'select',
      options: safeOptions,
    },
    {
      name: 'employee_name',
      label: t('columns.employee'),
      placeholder: t('columns.employee'),
      fieldType: 'select',
      options: employeeOptions,
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

  const columns: ColumnDef<FullEndOfDayRow>[] = useMemo(
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
        id: 'service_names',
        label: t('columns.serviceName'),
        cell: (row) => (
          <span className="block min-w-64 whitespace-normal">
            {row.service_names}
          </span>
        ),
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
        alwaysVisible: true,
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

  const printColumns: PrintColumn<FullEndOfDayRow>[] = useMemo(
    () => [
      { label: t('columns.employee'), accessor: (r) => r.employee_name },
      { label: t('columns.safe'), accessor: (r) => r.safe_name },
      { label: t('columns.paymentType'), accessor: (r) => r.payment_type },
      { label: t('columns.status'), accessor: (r) => r.invoice_status_name },
      { label: t('columns.invoiceNumber'), accessor: (r) => r.invoice_number },
      { label: t('columns.customer'), accessor: (r) => r.customer_name },
      { label: t('columns.serviceName'), accessor: (r) => r.service_names },
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

  const employeeStatsColumns: ColumnDef<EmployeeStatsRow>[] = useMemo(
    () => [
      {
        id: 'employee_name',
        label: t('columns.employee'),
        accessorKey: 'employee_name',
        alwaysVisible: true,
      },
      {
        id: 'safe_name',
        label: t('columns.safe'),
        accessorKey: 'safe_name',
      },
      {
        id: 'total_cash',
        label: t('totals.totalCash'),
        accessorKey: 'total_cash',
      },
      {
        id: 'total_visa',
        label: t('totals.totalVisa'),
        accessorKey: 'total_visa',
      },
      {
        id: 'total_online',
        label: t('totals.totalOnline'),
        accessorKey: 'total_online',
      },
      {
        id: 'total_sister_company',
        label: t('totals.totalSisterCompany'),
        accessorKey: 'total_sister_company',
      },
      {
        id: 'total_cheque',
        label: t('totals.totalCheque'),
        accessorKey: 'total_cheque',
      },
      {
        id: 'total_instapay',
        label: t('totals.totalInstapay'),
        accessorKey: 'total_instapay',
      },
      {
        id: 'total_voided',
        label: t('totals.totalVoided'),
        accessorKey: 'total_voided',
      },
      {
        id: 'total_void_requested',
        label: t('totals.totalVoidRequested'),
        accessorKey: 'total_void_requested',
      },
      {
        id: 'total_refunded',
        label: t('totals.totalRefunded'),
        accessorKey: 'total_refunded',
      },
      {
        id: 'total_partially_refunded',
        label: t('totals.totalPartiallyRefunded'),
        accessorKey: 'total_partially_refunded',
      },
      {
        id: 'total_refund_requested',
        label: t('totals.totalRefundRequested'),
        accessorKey: 'total_refund_requested',
      },
      {
        id: 'total_estimated_cost_refund',
        label: t('totals.totalEstimatedCostRefund'),
        accessorKey: 'total_estimated_cost_refund',
      },
      {
        id: 'net_balance',
        label: t('totals.netBalance'),
        accessorKey: 'net_balance',
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
        initialValues={{ date: today, safe_id: '', employee_name: '' }}
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
          {unsettledEmployeeNames.length > 0 && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-amber-900"
            >
              <AlertTriangle
                size={20}
                className="mt-0.5 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <h2 className="font-semibold">{t('unsettledEmployees.title')}</h2>
                <p className="mt-1 text-sm text-amber-800">
                  {t('unsettledEmployees.description')}
                </p>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {unsettledEmployeeNames.map((name) => (
                    <li
                      key={name}
                      className="rounded-full border border-amber-200 bg-white px-3 py-1 text-sm font-medium shadow-sm"
                    >
                      {name}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Per-employee payment statistics */}
          <MainBox>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('employeeStats.title')}
            </h2>
            <DataTable<EmployeeStatsRow>
              columns={employeeStatsColumns}
              data={filteredEmployeeStats}
              rowKey={(row) => row.key}
              loading={isLoading}
              emptyState={t('noDataFound')}
              itemsPerPage={10}
              persistKey="invoices-full-eod-employee-stats-columns"
              showColumnToggle
              exportEnabled={canExportFullEndOfDay}
              exportEndpoint="/orders/invoices/end-day/summary"
              exportParams={{
                date: lastParams?.date,
                full_end_of_day: 1,
                safe_id: lastParams?.safe_id,
                employee_name: selectedEmployee || undefined,
              }}
              exportFileName="full-end-of-day-employee-stats"
            />
          </MainBox>

          {/* Data table */}
          <MainBox>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {filteredRows.length} {t('columns.invoiceNumber')}
              </h2>
              {filteredRows.length > 0 && (
                <div className="flex items-center gap-2">
                  {canPrintFullEndOfDay && (
                    <Button variant="secondary" size="sm" onClick={handlePrint}>
                      <Printer size={16} className="me-1 inline" />
                      {t('print')}
                    </Button>
                  )}
                  {canSettleFullEndOfDay && isSettleAllowed && (
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
            <DataTable<FullEndOfDayRow>
              columns={columns}
              data={filteredRows}
              rowKey={(row) => row.key}
              loading={isLoading}
              emptyState={t('noDataFound')}
              itemsPerPage={pageSize}
              pageSize={pageSize}
              onPageSizeChange={setPageSize}
              persistKey="invoices-full-eod-columns"
              showColumnToggle
              exportEnabled={canExportFullEndOfDay}
              exportEndpoint="/orders/invoices/end-day/summary"
              exportParams={{
                date: lastParams?.date,
                full_end_of_day: 1,
                safe_id: lastParams?.safe_id,
                employee_name: selectedEmployee || undefined,
              }}
              exportFileName="full-end-of-day"
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
              dateRange={lastParams?.date ?? ''}
              columns={printColumns}
              data={filteredRows}
              rowsPerPage={pageSize}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
