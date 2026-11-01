'use client';

import { z } from 'zod';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import { getCtsById, updateCts, type CtsRecord } from '@/src/services/cts';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

const ctsSchema = z.object({
  unit_number: z.string().min(1),
  customer_code: z.string().min(1),
  customer_name: z.string().optional(),
  customer_mobile: z.string().optional(),
  annual_fees: z.string().min(1),
  notes: z.string().optional(),
  collected_amount: z.string().optional(),
  mobile: z.string().optional(),
  old: z.string().optional(),
  receiver: z.string().optional(),
  contracts_status: z.string().optional(),
  update_status: z.string().optional(),
  internet_activation_date: z.string().optional(),
  internet_annual_fees: z.string().optional(),
  internet_annual_fees_status: z.string().optional(),
  internet_status: z.string().optional(),
  ip_tv_activation_date: z.string().optional(),
  ip_tv_annual_fees: z.string().optional(),
  ip_tv_annual_fees_status: z.string().optional(),
  ip_tv_mac_address: z.string().optional(),
  ip_tv_miss_payment: z.string().optional(),
  ip_tv_multipoint: z.string().optional(),
  ip_tv_package: z.string().optional(),
  ip_tv_status: z.string().optional(),
  ip_phone_activation_date: z.string().optional(),
  ip_phone_status: z.string().optional(),
  ip_phone_mac: z.string().optional(),
  iphone_internet_fees: z.string().optional(),
  hotbird_receiving_date: z.string().optional(),
  nilesat_receiving_date: z.string().optional(),
  receiving_dorm_status: z.string().optional(),
  sma_tv_additional_point: z.string().optional(),
  sma_tv_annual_fees_status: z.string().optional(),
  sma_tv_contract_value: z.string().optional(),
  sma_tv_contract_date: z.string().optional(),
  sma_tv_extra: z.string().optional(),
  sma_tv_multipoint: z.string().optional(),
  sma_tv_multi_point_receiving_date: z.string().optional(),
  sma_tv_payment_status: z.string().optional(),
  sma_tv_receiving_date: z.string().optional(),
});

type CtsFormData = z.infer<typeof ctsSchema>;

// Old migrated data may store dates as { dateTime, date, time } objects
function normalizeDate(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null && 'date' in value) {
    return (value as { date: string }).date;
  }
  return '';
}

function recordToFormData(record: CtsRecord): CtsFormData {
  return {
    unit_number: record.unit_number ?? '',
    customer_code: record.customer_code ?? '',
    customer_name: record.customer_name ?? '',
    customer_mobile: record.customer_mobile ?? '',
    annual_fees: record.annual_fees != null ? String(record.annual_fees) : '',
    notes: record.notes ?? '',
    collected_amount:
      record.collected_amount != null ? String(record.collected_amount) : '',
    mobile: record.mobile ?? '',
    old: record.old ?? '',
    receiver: record.receiver ?? '',
    contracts_status: record.contracts_status ?? '',
    update_status: record.update_status ?? '',
    internet_activation_date: normalizeDate(record.internet_activation_date),
    internet_annual_fees:
      record.internet_annual_fees != null
        ? String(record.internet_annual_fees)
        : '',
    internet_annual_fees_status: record.internet_annual_fees_status ?? '',
    internet_status: record.internet_status ?? '',
    ip_tv_activation_date: normalizeDate(record.ip_tv_activation_date),
    ip_tv_annual_fees:
      record.ip_tv_annual_fees != null ? String(record.ip_tv_annual_fees) : '',
    ip_tv_annual_fees_status: record.ip_tv_annual_fees_status ?? '',
    ip_tv_mac_address: record.ip_tv_mac_address ?? '',
    ip_tv_miss_payment: record.ip_tv_miss_payment ?? '',
    ip_tv_multipoint: record.ip_tv_multipoint ?? '',
    ip_tv_package: record.ip_tv_package ?? '',
    ip_tv_status: record.ip_tv_status ?? '',
    ip_phone_activation_date: normalizeDate(record.ip_phone_activation_date),
    ip_phone_status: record.ip_phone_status ?? '',
    ip_phone_mac: record.ip_phone_mac ?? '',
    iphone_internet_fees: record.iphone_internet_fees ?? '',
    hotbird_receiving_date: normalizeDate(record.hotbird_receiving_date),
    nilesat_receiving_date: normalizeDate(record.nilesat_receiving_date),
    receiving_dorm_status: record.receiving_dorm_status ?? '',
    sma_tv_additional_point: record.sma_tv_additional_point ?? '',
    sma_tv_annual_fees_status: record.sma_tv_annual_fees_status ?? '',
    sma_tv_contract_value:
      record.sma_tv_contract_value != null
        ? String(record.sma_tv_contract_value)
        : '',
    sma_tv_contract_date: normalizeDate(record.sma_tv_contract_date),
    sma_tv_extra: record.sma_tv_extra ?? '',
    sma_tv_multipoint: record.sma_tv_multipoint ?? '',
    sma_tv_multi_point_receiving_date: normalizeDate(
      record.sma_tv_multi_point_receiving_date,
    ),
    sma_tv_payment_status: record.sma_tv_payment_status ?? '',
    sma_tv_receiving_date: normalizeDate(record.sma_tv_receiving_date),
  };
}

function buildPayload(data: CtsFormData) {
  return {
    annual_fees: Number(data.annual_fees),
    notes: data.notes || undefined,
    collected_amount: data.collected_amount
      ? Number(data.collected_amount)
      : undefined,
    mobile: data.mobile || undefined,
    old: data.old || undefined,
    receiver: data.receiver || undefined,
    contracts_status: data.contracts_status || undefined,
    update_status: data.update_status || undefined,
    internet_activation_date: data.internet_activation_date || undefined,
    internet_annual_fees: data.internet_annual_fees
      ? Number(data.internet_annual_fees)
      : undefined,
    internet_annual_fees_status: data.internet_annual_fees_status || undefined,
    internet_status: data.internet_status || undefined,
    ip_tv_activation_date: data.ip_tv_activation_date || undefined,
    ip_tv_annual_fees: data.ip_tv_annual_fees
      ? Number(data.ip_tv_annual_fees)
      : undefined,
    ip_tv_annual_fees_status: data.ip_tv_annual_fees_status || undefined,
    ip_tv_mac_address: data.ip_tv_mac_address || undefined,
    ip_tv_miss_payment: data.ip_tv_miss_payment || undefined,
    ip_tv_multipoint: data.ip_tv_multipoint || undefined,
    ip_tv_package: data.ip_tv_package || undefined,
    ip_tv_status: data.ip_tv_status || undefined,
    ip_phone_activation_date: data.ip_phone_activation_date || undefined,
    ip_phone_status: data.ip_phone_status || undefined,
    ip_phone_mac: data.ip_phone_mac || undefined,
    iphone_internet_fees: data.iphone_internet_fees || undefined,
    hotbird_receiving_date: data.hotbird_receiving_date || undefined,
    nilesat_receiving_date: data.nilesat_receiving_date || undefined,
    receiving_dorm_status: data.receiving_dorm_status || undefined,
    sma_tv_additional_point: data.sma_tv_additional_point || undefined,
    sma_tv_annual_fees_status: data.sma_tv_annual_fees_status || undefined,
    sma_tv_contract_value: data.sma_tv_contract_value
      ? Number(data.sma_tv_contract_value)
      : undefined,
    sma_tv_contract_date: data.sma_tv_contract_date || undefined,
    sma_tv_extra: data.sma_tv_extra || undefined,
    sma_tv_multipoint: data.sma_tv_multipoint || undefined,
    sma_tv_multi_point_receiving_date:
      data.sma_tv_multi_point_receiving_date || undefined,
    sma_tv_payment_status: data.sma_tv_payment_status || undefined,
    sma_tv_receiving_date: data.sma_tv_receiving_date || undefined,
  };
}

export default function CtsEdit() {
  const t = useTranslations('cts');
  const tForm = useTranslations('form');
  const router = useRouter();
  const params = useParams();
  const ctsId = Number(params.id);

  const [record, setRecord] = useState<CtsRecord | null>(null);
  const [isLoadingRecord, setIsLoadingRecord] = useState(true);
  const [error, setError] = useState('');
  const { success: showSuccess, error: showError } = useResponseMessage();

  const loadRecord = useCallback(async () => {
    try {
      setIsLoadingRecord(true);
      const found = await getCtsById(ctsId);
      setRecord(found ?? null);
    } catch {
      setError(t('edit.loadError'));
    } finally {
      setIsLoadingRecord(false);
    }
  }, [ctsId, t]);

  useEffect(() => {
    const cancel = runAfterCommit(() => {
      loadRecord();
    });

    return () => {
      cancel();
    };
  }, [loadRecord]);

  const handleSubmit = async (data: CtsFormData) => {
    setError('');
    try {
      const initial = recordToFormData(record!);
      const fullPayload = buildPayload(data);
      const changedPayload: Record<string, unknown> = {};

      for (const key of Object.keys(
        fullPayload,
      ) as (keyof typeof fullPayload)[]) {
        if (
          data[key as keyof CtsFormData] !== initial[key as keyof CtsFormData]
        ) {
          changedPayload[key] = fullPayload[key];
        }
      }

      await updateCts(ctsId, changedPayload);
      showSuccess('updateSuccess');
      setTimeout(() => router.push('/tickets/cts/search'), 1500);
    } catch (err) {
      showError(err);
    }
  };

  const fields: FieldConfig[] = [
    // ── General ──────────────────────────────────────────────
    {
      name: 'unit_number',
      label: t('fields.unitNumber'),
      placeholder: t('fields.unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customer_code',
      label: t('fields.customerCode'),
      placeholder: t('fields.customerCode'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customer_name',
      label: t('fields.customerName'),
      placeholder: t('fields.customerName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customer_mobile',
      label: t('fields.customerMobile'),
      placeholder: t('fields.customerMobile'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'mobile',
      label: t('fields.mobile'),
      placeholder: t('fields.mobile'),
      type: 'text',
    },
    {
      name: 'annual_fees',
      label: t('fields.annualFees'),
      placeholder: t('fields.annualFees'),
      type: 'number',
    },
    {
      name: 'collected_amount',
      label: t('fields.collectedAmount'),
      placeholder: t('fields.collectedAmount'),
      type: 'number',
    },
    {
      name: 'contracts_status',
      label: t('fields.contractsStatus'),
      placeholder: t('fields.contractsStatus'),
      type: 'text',
    },
    {
      name: 'update_status',
      label: t('fields.updateStatus'),
      placeholder: t('fields.updateStatus'),
      type: 'text',
    },
    {
      name: 'old',
      label: t('fields.old'),
      placeholder: t('fields.old'),
      type: 'text',
    },
    {
      name: 'receiver',
      label: t('fields.receiver'),
      placeholder: t('fields.receiver'),
      type: 'text',
    },
    {
      name: 'notes',
      label: t('fields.notes'),
      placeholder: t('fields.notes'),
      type: 'text',
    },
    // ── Internet ─────────────────────────────────────────────
    {
      name: 'internet_activation_date',
      label: t('fields.internetActivationDate'),
      type: 'date',
    },
    {
      name: 'internet_annual_fees',
      label: t('fields.internetAnnualFees'),
      placeholder: t('fields.internetAnnualFees'),
      type: 'number',
    },
    {
      name: 'internet_annual_fees_status',
      label: t('fields.internetAnnualFeesStatus'),
      placeholder: t('fields.internetAnnualFeesStatus'),
      type: 'text',
    },
    {
      name: 'internet_status',
      label: t('fields.internetStatus'),
      placeholder: t('fields.internetStatus'),
      type: 'text',
    },
    // ── IP TV ────────────────────────────────────────────────
    {
      name: 'ip_tv_activation_date',
      label: t('fields.ipTvActivationDate'),
      type: 'date',
    },
    {
      name: 'ip_tv_annual_fees',
      label: t('fields.ipTvAnnualFees'),
      placeholder: t('fields.ipTvAnnualFees'),
      type: 'number',
    },
    {
      name: 'ip_tv_annual_fees_status',
      label: t('fields.ipTvAnnualFeesStatus'),
      placeholder: t('fields.ipTvAnnualFeesStatus'),
      type: 'text',
    },
    {
      name: 'ip_tv_mac_address',
      label: t('fields.ipTvMacAddress'),
      placeholder: t('fields.ipTvMacAddress'),
      type: 'text',
    },
    {
      name: 'ip_tv_miss_payment',
      label: t('fields.ipTvMissPayment'),
      placeholder: t('fields.ipTvMissPayment'),
      type: 'text',
    },
    {
      name: 'ip_tv_multipoint',
      label: t('fields.ipTvMultipoint'),
      placeholder: t('fields.ipTvMultipoint'),
      type: 'text',
    },
    {
      name: 'ip_tv_package',
      label: t('fields.ipTvPackage'),
      placeholder: t('fields.ipTvPackage'),
      type: 'text',
    },
    {
      name: 'ip_tv_status',
      label: t('fields.ipTvStatus'),
      placeholder: t('fields.ipTvStatus'),
      type: 'text',
    },
    // ── IP Phone ─────────────────────────────────────────────
    {
      name: 'ip_phone_activation_date',
      label: t('fields.ipPhoneActivationDate'),
      type: 'date',
    },
    {
      name: 'ip_phone_status',
      label: t('fields.ipPhoneStatus'),
      placeholder: t('fields.ipPhoneStatus'),
      type: 'text',
    },
    {
      name: 'ip_phone_mac',
      label: t('fields.ipPhoneMac'),
      placeholder: t('fields.ipPhoneMac'),
      type: 'text',
    },
    {
      name: 'iphone_internet_fees',
      label: t('fields.iphoneInternetFees'),
      placeholder: t('fields.iphoneInternetFees'),
      type: 'text',
    },
    // ── Satellite ────────────────────────────────────────────
    {
      name: 'hotbird_receiving_date',
      label: t('fields.hotbirdReceivingDate'),
      type: 'date',
    },
    {
      name: 'nilesat_receiving_date',
      label: t('fields.nilesatReceivingDate'),
      type: 'date',
    },
    {
      name: 'receiving_dorm_status',
      label: t('fields.receivingDormStatus'),
      placeholder: t('fields.receivingDormStatus'),
      type: 'text',
    },
    // ── SMA TV ───────────────────────────────────────────────
    {
      name: 'sma_tv_receiving_date',
      label: t('fields.smaTvReceivingDate'),
      type: 'date',
    },
    {
      name: 'sma_tv_contract_date',
      label: t('fields.smaTvContractDate'),
      type: 'date',
    },
    {
      name: 'sma_tv_contract_value',
      label: t('fields.smaTvContractValue'),
      placeholder: t('fields.smaTvContractValue'),
      type: 'number',
    },
    {
      name: 'sma_tv_annual_fees_status',
      label: t('fields.smaTvAnnualFeesStatus'),
      placeholder: t('fields.smaTvAnnualFeesStatus'),
      type: 'text',
    },
    {
      name: 'sma_tv_payment_status',
      label: t('fields.smaTvPaymentStatus'),
      placeholder: t('fields.smaTvPaymentStatus'),
      type: 'text',
    },
    {
      name: 'sma_tv_additional_point',
      label: t('fields.smaTvAdditionalPoint'),
      placeholder: t('fields.smaTvAdditionalPoint'),
      type: 'text',
    },
    {
      name: 'sma_tv_multipoint',
      label: t('fields.smaTvMultipoint'),
      placeholder: t('fields.smaTvMultipoint'),
      type: 'text',
    },
    {
      name: 'sma_tv_multi_point_receiving_date',
      label: t('fields.smaTvMultiPointReceivingDate'),
      type: 'date',
    },
    {
      name: 'sma_tv_extra',
      label: t('fields.smaTvExtra'),
      placeholder: t('fields.smaTvExtra'),
      type: 'text',
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: tForm('save'),
      loadingLabel: tForm('updating'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => router.push('/tickets/cts/search'),
    },
  ];

  if (isLoadingRecord) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          {t('edit.notFound')}
        </h2>
        <p className="text-gray-500 mb-4">{t('edit.notFoundMessage')}</p>
        <button
          onClick={() => router.push('/tickets/cts/search')}
          className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800"
        >
          <ArrowLeft size={18} />
          {t('edit.backToSearch')}
        </button>
      </div>
    );
  }

  const initialValues = recordToFormData(record);

  return (
    <div className="p-6 flex flex-col gap-6">
      <button
        onClick={() => router.push('/tickets/cts/search')}
        className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800 self-start"
      >
        <ArrowLeft size={18} />
        {t('edit.backToSearch')}
      </button>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <Form
        title={`${t('edit.title')} #${ctsId}`}
        fields={fields}
        buttons={buttons}
        initialValues={initialValues}
        validationSchema={ctsSchema}
        onSubmit={handleSubmit}
        fieldsClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 py-3 gap-4"
      />
    </div>
  );
}
