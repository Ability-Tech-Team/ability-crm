'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { ArrowLeft, Pencil, FileText } from 'lucide-react';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import {
  getCtsById,
  type CtsRecord,
  type CtsDateField,
} from '@/src/services/cts';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800">
        {value !== null && value !== undefined && value !== ''
          ? String(value)
          : '—'}
      </span>
    </div>
  );
}

export default function CtsDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('cts.detail');
  const tForm = useTranslations('form');
  const ctsId = Number(params.id);

  const [record, setRecord] = useState<CtsRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      if (!ctsId || Number.isNaN(ctsId)) {
        setError(t('notFound'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      setRecord(null);

      (async () => {
        try {
          const data = await getCtsById(ctsId, controller.signal);
          if (controller.signal.aborted) return;

          if (!data) {
            setError(t('notFound'));
            return;
          }

          setRecord(data);
        } catch (err: unknown) {
          if (
            !controller.signal.aborted &&
            (err as { name?: string }).name !== 'CanceledError'
          ) {
            setError(t('notFoundMessage'));
          }
        } finally {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        }
      })();
    });

    return () => {
      cancel();
      controller.abort();
    };
  }, [ctsId, t]);

  const rows = useMemo(() => {
    if (!record) return [];

    const d = (v: string | CtsDateField | undefined) =>
      v && typeof v === 'object' ? v.dateTime : v;

    return [
      { label: t('fields.unitNumber'), value: record.unit_number },
      { label: t('fields.customerCode'), value: record.customer_code },
      { label: t('fields.customerName'), value: record.customer_name },
      { label: t('fields.customerMobile'), value: record.customer_mobile },
      { label: t('fields.mobile'), value: record.mobile },
      { label: t('fields.annualFees'), value: record.annual_fees },
      { label: t('fields.collectedAmount'), value: record.collected_amount },
      { label: t('fields.contractsStatus'), value: record.contracts_status },
      { label: t('fields.updateStatus'), value: record.update_status },
      { label: t('fields.old'), value: record.old },
      { label: t('fields.receiver'), value: record.receiver },
      { label: t('fields.notes'), value: record.notes },
      {
        label: t('fields.internetActivationDate'),
        value: d(record.internet_activation_date),
      },
      {
        label: t('fields.internetAnnualFees'),
        value: record.internet_annual_fees,
      },
      {
        label: t('fields.internetAnnualFeesStatus'),
        value: record.internet_annual_fees_status,
      },
      { label: t('fields.internetStatus'), value: record.internet_status },
      {
        label: t('fields.ipTvActivationDate'),
        value: d(record.ip_tv_activation_date),
      },
      { label: t('fields.ipTvAnnualFees'), value: record.ip_tv_annual_fees },
      {
        label: t('fields.ipTvAnnualFeesStatus'),
        value: record.ip_tv_annual_fees_status,
      },
      { label: t('fields.ipTvMacAddress'), value: record.ip_tv_mac_address },
      { label: t('fields.ipTvMissPayment'), value: record.ip_tv_miss_payment },
      { label: t('fields.ipTvMultipoint'), value: record.ip_tv_multipoint },
      { label: t('fields.ipTvPackage'), value: record.ip_tv_package },
      { label: t('fields.ipTvStatus'), value: record.ip_tv_status },
      {
        label: t('fields.ipPhoneActivationDate'),
        value: d(record.ip_phone_activation_date),
      },
      { label: t('fields.ipPhoneStatus'), value: record.ip_phone_status },
      { label: t('fields.ipPhoneMac'), value: record.ip_phone_mac },
      {
        label: t('fields.iphoneInternetFees'),
        value: record.iphone_internet_fees,
      },
      {
        label: t('fields.hotbirdReceivingDate'),
        value: d(record.hotbird_receiving_date),
      },
      {
        label: t('fields.nilesatReceivingDate'),
        value: d(record.nilesat_receiving_date),
      },
      {
        label: t('fields.receivingDormStatus'),
        value: record.receiving_dorm_status,
      },
      {
        label: t('fields.smaTvReceivingDate'),
        value: d(record.sma_tv_receiving_date),
      },
      {
        label: t('fields.smaTvContractDate'),
        value: d(record.sma_tv_contract_date),
      },
      {
        label: t('fields.smaTvContractValue'),
        value: record.sma_tv_contract_value,
      },
      {
        label: t('fields.smaTvAnnualFeesStatus'),
        value: record.sma_tv_annual_fees_status,
      },
      {
        label: t('fields.smaTvPaymentStatus'),
        value: record.sma_tv_payment_status,
      },
      {
        label: t('fields.smaTvAdditionalPoint'),
        value: record.sma_tv_additional_point,
      },
      { label: t('fields.smaTvMultipoint'), value: record.sma_tv_multipoint },
      {
        label: t('fields.smaTvMultiPointReceivingDate'),
        value: d(record.sma_tv_multi_point_receiving_date),
      },
      { label: t('fields.smaTvExtra'), value: record.sma_tv_extra },
    ];
  }, [record, t]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-100">
        <span className="text-sm text-slate-500">{tForm('loading')}</span>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <FileText size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {t('notFound')}
        </h2>
        <p className="text-sm text-slate-500">{t('notFoundMessage')}</p>
        <Button
          variant="secondary"
          onClick={() => router.push('/tickets/cts/search')}
        >
          {t('backToSearch')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={() => router.push('/tickets/cts/search')}
          className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800"
        >
          <ArrowLeft size={18} />
          {t('backToSearch')}
        </button>

        <Button
          variant="secondary"
          onClick={() => router.push(`/tickets/cts/${ctsId}/edit`)}
        >
          <Pencil size={16} className="mr-1.5" />
          {t('edit')}
        </Button>
      </div>

      <MainBox>
        <h1 className="text-xl font-semibold text-slate-800 mb-4">
          {t('title')} #{record.id}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </MainBox>
    </div>
  );
}
