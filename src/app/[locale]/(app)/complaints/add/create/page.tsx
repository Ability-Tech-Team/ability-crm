'use client';

import { useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { createComplaint } from '@/src/services/complaints';
import type { Unit } from '@/src/services/units';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getContactChannelPayload } from '@/src/lib/contactChannel';
import { useSessionStorageJson } from '@/src/hooks/useSessionStorageJson';

const createComplaintSchema = z.object({
  customerName: z.string().optional(),
  customerCode: z.string().optional(),
  mobileNumber: z.string().optional(),
  unitNumber: z.string().optional(),
  projectName: z.string().optional(),
  details: z.string().min(1, 'Details are required'),
  department_id: z.string().optional(),
  type_id: z.string().min(1, 'Complaint type is required'),
  status_id: z.string().min(1, 'Status is required'),
  contact_channel_id: z.string().min(1, 'Contact channel is required'),
  complain_date: z.string().min(1, 'Complaint date is required'),
});

type FormData = z.infer<typeof createComplaintSchema>;

export default function CreateComplaintPage() {
  const t = useTranslations('complaints');
  const tForm = useTranslations('form');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const unitId = searchParams.get('unitId');
  // The customer's id (`customer_units[].customer_id`), not their code.
  const customerIdParam = Number(searchParams.get('customerId'));
  const customerId =
    Number.isInteger(customerIdParam) && customerIdParam > 0
      ? customerIdParam
      : null;

  // ── Hydrate unit data from sessionStorage ────────────────────
  const { value: unitData, isHydrated } = useSessionStorageJson<{
    unit: Unit;
    customerIndex: number;
  }>('complaint-create-unit');

  const unit = unitData?.unit ?? null;
  const customer =
    unit && unitData && unitData.customerIndex >= 0
      ? unit.customer_units[unitData.customerIndex]
      : null;

  // ── Derived read-only values ─────────────────────────────────
  const customerName = customer?.customer_name ?? '—';
  const customerCode = customer?.customer_code ?? '—';
  const mobileNumber = customer?.mobile_number ?? '—';
  const unitNumber = unit?.unit_number ?? '—';
  const projectName = unit?.project_name ?? '—';
  const today = useMemo(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().split('T')[0];
  }, []);

  // ── Dropdown options ─────────────────────────────────────────
  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const complainTypeOptions = useMemo(
    () =>
      (dropdowns?.complain_types ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const complainStatusOptions = useMemo(
    () =>
      (dropdowns?.complain_statuses ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const contactChannelOptions = useMemo(
    () =>
      (dropdowns?.contact_channels ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  // ── Form config ──────────────────────────────────────────────
  const [submitError, setSubmitError] = useState('');

  const fields: FieldConfig[] = [
    {
      name: 'customerName',
      label: tForm('customerName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customerCode',
      label: tForm('customerCode'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'mobileNumber',
      label: tForm('mobileNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'unitNumber',
      label: tForm('unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'projectName',
      label: tForm('project'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'department_id',
      label: tForm('department'),
      placeholder: tForm('department'),
      fieldType: 'select',
      options: departmentOptions,
    },
    {
      name: 'type_id',
      label: tForm('complainType'),
      placeholder: tForm('complainType'),
      fieldType: 'select',
      options: complainTypeOptions,
    },
    {
      name: 'status_id',
      label: tForm('complainStatus'),
      placeholder: tForm('complainStatus'),
      fieldType: 'select',
      options: complainStatusOptions,
    },
    {
      name: 'contact_channel_id',
      label: tForm('contactChannel'),
      placeholder: tForm('contactChannel'),
      fieldType: 'select',
      options: contactChannelOptions,
    },
    {
      name: 'complain_date',
      label: tForm('complainDate'),
      type: 'date',
    },
    {
      name: 'details',
      label: tForm('details'),
      placeholder: tForm('details'),
      fieldType: 'textarea',
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: tForm('add'),
      loadingLabel: tForm('adding'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => router.push('/complaints/add'),
    },
  ];

  const handleSubmit = async (data: FormData) => {
    setSubmitError('');

    try {
      await createComplaint({
        unit_number: unitNumber,
        unit_id: unit?.unit_id ?? unit?.id ?? Number(unitId),
        customer_name: customerName,
        customer_id: customerId!,
        ...(customerCode !== '—' ? { customer_code: customerCode } : {}),
        mobile_number: mobileNumber !== '—' ? mobileNumber : undefined,
        details: data.details,
        department_id: data.department_id
          ? Number(data.department_id)
          : undefined,
        type_id: Number(data.type_id),
        status_id: Number(data.status_id),
        ...getContactChannelPayload(data.contact_channel_id),
        project_id: unit?.project_id ?? undefined,
        request_from_id: 1,
        complain_date: data.complain_date,
      });

      sessionStorage.removeItem('complaint-create-unit');
      showSuccess('createSuccess');
      router.push('/complaints/search');
    } catch (err) {
      showError(err);
    }
  };

  // ── Guard: redirect if no data ──────────────────────────────
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
    <div className="p-6">
      <Form
        title={`${t('title')} - ${t('create.title')}`}
        fields={fields}
        buttons={buttons}
        initialValues={{
          customerName,
          customerCode,
          mobileNumber,
          unitNumber,
          projectName,
          details: '',
          department_id: '',
          type_id: '',
          status_id: '',
          contact_channel_id: '',
          complain_date: today,
        }}
        validationSchema={createComplaintSchema}
        onSubmit={handleSubmit}
      >
        {submitError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </Form>
    </div>
  );
}
