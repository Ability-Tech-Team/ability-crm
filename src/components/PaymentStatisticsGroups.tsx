'use client';

import MainBox from '@/src/components/ui/MainBox';
import type {
  EndOfDaySummaryItem,
  EndOfDayTotals,
} from '@/src/services/invoices';

interface Props {
  summary: EndOfDaySummaryItem[];
  totals: EndOfDayTotals;
  /**
   * Receives flat keys: 'paymentsSuffix' | 'totalCollected' | 'totalVoided' |
   * 'totalVoidRequested' | 'totalRefunded' | 'totalPartiallyRefunded' |
   * 'totalRefundRequested' | 'netBalance' | 'paymentTotalsTitle' |
   * 'totalPending' | 'totalCash' | 'totalVisa' | 'totalOnline' |
   * 'totalSisterCompany' | 'totalCheque' | 'totalInstapay' |
   * 'totalEstimatedCostRefund'
   */
  t: (key: string) => string;
}

function Box({
  label,
  value,
  variant = 'group',
}: {
  label: string;
  value: number;
  variant?: 'group' | 'total';
}) {
  return (
    <div
      className={
        variant === 'group'
          ? 'flex flex-col gap-1 rounded-xl border border-slate-200 bg-slate-50 p-4'
          : 'flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-3'
      }
    >
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <span
        className={
          variant === 'group'
            ? 'text-lg font-bold text-slate-800'
            : 'text-base font-semibold text-slate-700'
        }
      >
        {value}
      </span>
    </div>
  );
}

export default function PaymentStatisticsGroups({ summary, totals, t }: Props) {
  // Filter out "No Payment" groups and all-zero groups.
  const groups = summary.filter((g) => {
    if (g.payment_type_id == null) return false;
    return (
      g.total_collected !== 0 ||
      g.total_voided !== 0 ||
      g.total_void_requested !== 0 ||
      g.total_refunded !== 0 ||
      g.total_partially_refunded !== 0 ||
      g.total_refund_requested !== 0 ||
      g.user_collected_amount !== 0
    );
  });

  const pt = totals.payment_type_totals;
  const paymentTotalItems = [
    { key: 'total_cash', label: t('totalCash'), value: pt.total_cash },
    { key: 'total_visa', label: t('totalVisa'), value: pt.total_visa },
    { key: 'total_online', label: t('totalOnline'), value: pt.total_online },
    {
      key: 'total_sister_company',
      label: t('totalSisterCompany'),
      value: pt.total_sister_company,
    },
    { key: 'total_cheque', label: t('totalCheque'), value: pt.total_cheque },
    {
      key: 'total_instapay',
      label: t('totalInstapay'),
      value: pt.total_instapay,
    },
    {
      key: 'total_estimated_cost_refund',
      label: t('totalEstimatedCostRefund'),
      value: pt.total_estimated_cost_refund ?? 0,
    },
  ].filter((item) => item.value !== 0);

  return (
    <div className="flex flex-col gap-4">
      {groups.map((g) => (
        <MainBox key={g.payment_type_id ?? g.payment_type}>
          <h2 className="text-lg font-semibold text-gray-900">
            {g.payment_type} {t('paymentsSuffix')}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Box label={t('totalCollected')} value={g.total_collected} />
            <Box label={t('totalVoided')} value={g.total_voided} />
            <Box
              label={t('totalVoidRequested')}
              value={g.total_void_requested}
            />
            <Box label={t('totalRefunded')} value={g.total_refunded} />
            <Box
              label={t('totalPartiallyRefunded')}
              value={g.total_partially_refunded}
            />
            <Box
              label={t('totalRefundRequested')}
              value={g.total_refund_requested}
            />
            <Box label={t('netBalance')} value={g.user_collected_amount} />
          </div>
        </MainBox>
      ))}

      {(paymentTotalItems.length > 0 || totals.total_pending !== 0) && (
        <MainBox>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('paymentTotalsTitle')}
          </h2>
          {paymentTotalItems.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
              {paymentTotalItems.map((item) => (
                <Box
                  key={item.key}
                  label={item.label}
                  value={item.value}
                  variant="total"
                />
              ))}
            </div>
          )}
          {totals.total_pending !== 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-6 gap-4 mt-2">
              <Box
                label={t('totalPending')}
                value={totals.total_pending}
                variant="total"
              />
            </div>
          )}
        </MainBox>
      )}
    </div>
  );
}
