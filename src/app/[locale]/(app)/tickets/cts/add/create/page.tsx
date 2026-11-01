'use client';

import { z } from 'zod';
import { useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import PaymentMethodsModal, {
  type PaymentEntry,
} from '@/src/components/PaymentMethodsModal';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { createCts } from '@/src/services/cts';
import { createInvoice, payInvoice } from '@/src/services/invoices';
import type { Unit } from '@/src/services/units';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { useSessionStorageJson } from '@/src/hooks/useSessionStorageJson';

const DEFAULT_REQUEST_FROM_ID = 1;

const ctsSchema = z.object({
  unit_number: z.string().min(1),
  customer_code: z.string().min(1),
  customer_name: z.string().optional(),
  customer_mobile: z.string().optional(),
  annual_fees: z.string().min(1),
  invoice_type_id: z.string().min(1, 'Invoice type is required'),
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

function buildPayload(
  data: CtsFormData,
  unitId: number,
  customerId: number,
) {
  return {
    unit_number: data.unit_number,
    unit_id: unitId,
    customer_id: customerId,
    ...(data.customer_code ? { customer_code: data.customer_code } : {}),
    customer_name: data.customer_name || undefined,
    customer_mobile: data.customer_mobile || undefined,
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

export default function CtsCreate() {
  const t = useTranslations('cts');
  const tForm = useTranslations('form');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: dropdowns } = useDropdowns();

  const unitId = searchParams.get('unitId');
  // The customer's id (`customer_units[].customer_id`), not their code.
  const customerIdParam = Number(searchParams.get('customerId'));
  const customerId =
    Number.isInteger(customerIdParam) && customerIdParam > 0
      ? customerIdParam
      : null;

  const { value: unitData, isHydrated } = useSessionStorageJson<{
    unit: Unit;
    customerIndex: number;
  }>('cts-create-unit');

  // ── Payment modal state ──────────────────────────────────
  const collectAfterCreateRef = useRef(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState(0);
  const [pendingCollectData, setPendingCollectData] = useState<{
    ctsPayload: ReturnType<typeof buildPayload>;
    invoicePayload: Parameters<typeof createInvoice>[0];
  } | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  const selectedUnit = unitData?.unit ?? null;
  const selectedCustomer =
    selectedUnit && unitData && unitData.customerIndex >= 0
      ? selectedUnit.customer_units[unitData.customerIndex]
      : null;

  const { success: showSuccess, error: showError } = useResponseMessage();

  const invoiceTypeOptions = useMemo(
    () =>
      (dropdowns?.invoice_types ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const sisterCompanyOptions = useMemo(
    () => dropdowns?.sister_companies ?? [],
    [dropdowns],
  );

  const paymentTypeOptions = useMemo(
    () => dropdowns?.payment_types ?? [],
    [dropdowns],
  );

  const handleSubmit = async (data: CtsFormData) => {
    const shouldCollect = collectAfterCreateRef.current;
    collectAfterCreateRef.current = false;

    const annualFees = Number(data.annual_fees);
    const invoicePayload: Parameters<typeof createInvoice>[0] = {
      unit_number: data.unit_number,
      unit_id: selectedUnit?.unit_id ?? selectedUnit?.id ?? Number(unitId),
      customer_id: customerId!,
      ...(data.customer_code ? { customer_code: data.customer_code } : {}),
      customer_name: data.customer_name || '',
      customer_mobile: data.customer_mobile || '',
      project_id: selectedUnit?.project_id,
      invoice_type_id: Number(data.invoice_type_id),
      request_from_id: DEFAULT_REQUEST_FROM_ID,
      total_amount: annualFees,
      notes: data.notes || undefined,
    };

    if (shouldCollect) {
      setInvoiceTotalAmount(annualFees);
      setPendingCollectData({
        ctsPayload: buildPayload(
          data,
          selectedUnit?.unit_id ?? selectedUnit?.id ?? Number(unitId),
          customerId!,
        ),
        invoicePayload,
      });
      setPaymentModalOpen(true);
      return;
    }

    try {
      await createCts(
        buildPayload(
          data,
          selectedUnit?.unit_id ?? selectedUnit?.id ?? Number(unitId),
          customerId!,
        ),
      );
      await createInvoice(invoicePayload);
      sessionStorage.removeItem('cts-create-unit');
      showSuccess('createSuccess');
      setTimeout(() => router.push('/tickets/cts/search'), 1500);
    } catch (err) {
      showError(err);
    }
  };

  const handleCollect = async (entries: PaymentEntry[]) => {
    if (!pendingCollectData) {
      setPaymentModalOpen(false);
      return;
    }

    setIsCollecting(true);
    try {
      await createCts(pendingCollectData.ctsPayload);
      const invoiceResult = await createInvoice(
        pendingCollectData.invoicePayload,
      );

      const invoiceNumber = invoiceResult.result?.invoice_number;
      if (!invoiceNumber) {
        throw new Error('Invoice number is missing for collection');
      }

      await payInvoice({
        invoice_number: invoiceNumber,
        project_id: pendingCollectData.invoicePayload.project_id,
        unit_id: pendingCollectData.invoicePayload.unit_id,
        transactions: entries.map((e) => ({
          total_amount: parseFloat(e.total_amount),
          payment_type_id: parseInt(e.payment_type_id, 10),
          ...(e.reference_number
            ? { reference_number: e.reference_number }
            : {}),
          ...(e.visa_number ? { visa_number: e.visa_number } : {}),
          ...(e.batch_number ? { batch_number: e.batch_number } : {}),
          ...(e.bank_name ? { bank_name: e.bank_name } : {}),
          ...(e.cheque_due_date
            ? { cheque_due_date: e.cheque_due_date }
            : {}),
          ...(e.sister_company_id
            ? { sister_company_id: parseInt(e.sister_company_id, 10) }
            : {}),
          ...(e.mobile_number ? { mobile_number: e.mobile_number } : {}),
          transaction_at: new Date().toISOString(),
        })),
      });

      sessionStorage.removeItem('cts-create-unit');
      setPendingCollectData(null);
      setPaymentModalOpen(false);
      showSuccess('collectSuccess');
      router.push('/tickets/cts/search');
    } catch (err) {
      showError(err);
    } finally {
      setIsCollecting(false);
    }
  };

  const fields = useMemo<FieldConfig[]>(
    () => [
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
        name: 'invoice_type_id',
        label: tForm('invoiceTypes'),
        placeholder: tForm('invoiceTypes'),
        fieldType: 'select',
        options: invoiceTypeOptions,
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
    ],
    [t, tForm, invoiceTypeOptions],
  );

  const buttons: ButtonConfig[] = [
    {
      label: tForm('submit'),
      loadingLabel: tForm('adding'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: t('create.createAndCollect'),
      loadingLabel: t('create.creatingAndCollecting'),
      type: 'submit',
      variant: 'success',
      onClick: () => {
        collectAfterCreateRef.current = true;
      },
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => router.push('/tickets/cts/add'),
    },
  ];

  const initialValues = useMemo(
    () =>
      ({
        ...Object.fromEntries(fields.map((field) => [field.name, ''])),
        unit_number: selectedUnit?.unit_number ?? '',
        customer_code: selectedCustomer?.customer_code ?? '',
        customer_name: selectedCustomer?.customer_name ?? '',
        customer_mobile: selectedCustomer?.mobile_number ?? '',
        invoice_type_id: '',
      }) as z.infer<typeof ctsSchema>,
    [fields, selectedUnit, selectedCustomer],
  );

  if (!unitId || !customerId) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('create.noUnitSelected')}</p>
        </div>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{tForm('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        title={t('create.title')}
        fields={fields}
        buttons={buttons}
        initialValues={initialValues}
        validationSchema={ctsSchema}
        onSubmit={handleSubmit}
        fieldsClassName="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 py-3 gap-4"
      />

      <PaymentMethodsModal
        open={paymentModalOpen}
        totalAmount={invoiceTotalAmount}
        paymentTypes={paymentTypeOptions}
        sisterCompanies={sisterCompanyOptions}
        onCollect={handleCollect}
        onCancel={() => {
          if (!isCollecting) setPaymentModalOpen(false);
        }}
        isCollecting={isCollecting}
      />
    </div>
  );
}
