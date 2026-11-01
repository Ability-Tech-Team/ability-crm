import { CalendarClock } from 'lucide-react';
import { useLocale } from 'next-intl';
import MainBox from '@/src/components/ui/MainBox';
import SectionHeader from '@/src/components/SectionHeader';
import EgpSign from '@/src/components/EgpSign';

interface UnitDebtDisplayProps {
  /** The unit's uploaded debt (`debit_amount`); null if never uploaded. */
  debitAmount: number | null;
  /** When the last "Import Unit Debts" upload set it (`debt_updated_at`). */
  debtUpdatedAt: string | null;
  labels: {
    title: string;
    noDebt: string;
    debitAmount: string;
    updatedAt: string;
  };
}

function formatUpdatedAt(value: string, locale: string): string {
  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

/**
 * The unit's debt as the client last uploaded it. There is no live ERP
 * lookup any more: the value comes with the unit (`GET /projects/units`).
 */
export default function UnitDebtDisplay({
  debitAmount,
  debtUpdatedAt,
  labels,
}: UnitDebtDisplayProps) {
  const locale = useLocale();

  return (
    <MainBox>
      <SectionHeader icon={EgpSign} title={labels.title} />
      {debitAmount === null ? (
        <p className="text-sm text-slate-500 py-4">{labels.noDebt}</p>
      ) : (
        <div>
          <InfoRow
            icon={EgpSign}
            label={labels.debitAmount}
            value={debitAmount.toLocaleString(locale)}
          />
          {debtUpdatedAt ? (
            <InfoRow
              icon={CalendarClock}
              label={labels.updatedAt}
              value={formatUpdatedAt(debtUpdatedAt, locale)}
            />
          ) : null}
        </div>
      )}
    </MainBox>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-b-0">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
        <Icon size={18} className="text-sky-600" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-medium text-slate-800 mt-0.5 wrap-break-word">
          {value ?? '—'}
        </span>
      </div>
    </div>
  );
}
