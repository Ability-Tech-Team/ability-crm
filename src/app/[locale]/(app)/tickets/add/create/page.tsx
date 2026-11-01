'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Paperclip, FileImage, X } from 'lucide-react';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import Button from '@/src/components/ui/Button';
import ServicesPicker, {
  SelectedService,
  ServiceOption,
} from '@/src/components/ServicesPicker';
import PaymentMethodsModal, {
  type PaymentEntry,
} from '@/src/components/PaymentMethodsModal';
import MediaUploadModal from '@/src/components/MediaUploadModal';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { getServices } from '@/src/services/services';
import { createTicket } from '@/src/services/tickets';
import { payInvoice } from '@/src/services/invoices';
import { uploadUnitMedia } from '@/src/services/documentLibrary';
import type { Unit, UnitLocation } from '@/src/services/units';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getContactChannelPayload } from '@/src/lib/contactChannel';
import { useSessionStorageJson } from '@/src/hooks/useSessionStorageJson';

function getLocalNowParts() {
  const now = new Date();

  if (now.getSeconds() > 0 || now.getMilliseconds() > 0) {
    now.setMinutes(now.getMinutes() + 1);
  }

  now.setSeconds(0, 0);

  const localNow = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  const [date, timeWithSeconds] = localNow.toISOString().split('T');

  return {
    date,
    time: timeWithSeconds.slice(0, 5),
  };
}

function isPastArrival(arrivalDate?: string, arrivalTime?: string) {
  if (!arrivalDate || !arrivalTime) return false;

  const arrival = new Date(`${arrivalDate}T${arrivalTime}`);
  return !Number.isNaN(arrival.getTime()) && arrival.getTime() < Date.now();
}

const createTicketSchema = z
  .object({
    customerName: z.string().optional(),
    mobileNumber: z.string().optional(),
    unitType: z.string().optional(),
    unitNumber: z.string().optional(),
    area: z.string().optional(),
    location: z.string().optional(),
    requesterName: z.string().min(1, 'Requester name is required'),
    requesterMobile: z
      .string()
      .min(1, 'Requester mobile is required')
      .regex(/^\d{11}$/, 'Requester mobile must be exactly 11 digits'),
    department_id: z.string().min(1, 'Department is required'),
    contact_channel_id: z.string().optional(),
    has_runner_cashier: z.string().optional(),
    is_urgent: z.string().optional(),
    notes: z.string().optional(),
    arrivalDate: z.string().optional(),
    arrivalTime: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (!isPastArrival(data.arrivalDate, data.arrivalTime)) {
      return;
    }

    const message = 'Arrival date and time cannot be in the past';

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['arrivalDate'],
      message,
    });

    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['arrivalTime'],
      message,
    });
  });

type FormData = z.infer<typeof createTicketSchema>;

/** Flatten nested locations into a readable path */
function flattenLocationNames(locations?: UnitLocation[]): string {
  if (!locations || locations.length === 0) return '—';
  const names: string[] = [];
  function walk(locs: UnitLocation[]) {
    for (const loc of locs) {
      names.push(loc.name);
      if (loc.children?.length) walk(loc.children);
    }
  }
  walk(locations);
  return names.join(' > ') || '—';
}

export default function CreateTicketPage() {
  const t = useTranslations('tickets');
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
  }>('ticket-create-unit');

  const unit = unitData?.unit ?? null;
  const customer =
    unit && unitData && unitData.customerIndex >= 0
      ? unit.customer_units[unitData.customerIndex]
      : null;
  const customerCode = customer?.customer_code ?? undefined;

  // ── Department options from dropdowns ────────────────────────
  const departmentOptions = useMemo(
    () =>
      (dropdowns?.departments ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const contactChannelOptions = useMemo(
    () =>
      (dropdowns?.contact_channels ?? []).map((channel) => ({
        value: String(channel.id),
        label: channel.name,
      })),
    [dropdowns],
  );

  // ── Services by department ───────────────────────────────────
  const [serviceOptions, setServiceOptions] = useState<ServiceOption[]>([]);
  const [selectedServices, setSelectedServices] = useState<SelectedService[]>(
    [],
  );
  const [servicesError, setServicesError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [selectedArrivalDate, setSelectedArrivalDate] = useState('');
  const [minArrival, setMinArrival] = useState(getLocalNowParts);

  // ── Payment modal state ──────────────────────────────────────
  const collectAfterCreateRef = useRef(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [invoiceTotalAmount, setInvoiceTotalAmount] = useState(0);
  const [pendingCollectData, setPendingCollectData] = useState<{
    payload: Parameters<typeof createTicket>[0];
    projectId?: number;
  } | null>(null);
  const [isCollecting, setIsCollecting] = useState(false);

  // ── Document attachment staging ──────────────────────────────
  const [attachModalOpen, setAttachModalOpen] = useState(false);
  const [stagedAttachments, setStagedAttachments] = useState<
    { file: File; description: string; mediaTypeId: number }[]
  >([]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMinArrival(getLocalNowParts());
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, []);

  const fetchServicesByDepartment = useCallback(
    async (departmentId: string) => {
      if (!departmentId) {
        setServiceOptions([]);
        return;
      }
      try {
        const data = await getServices({
          department_id: Number(departmentId),
          is_active: 1,
          page: 1,
          limit: 1000,
        });
        setServiceOptions(
          data.services.map((s) => ({
            value: String(s.id),
            label: s.service_name,
            price: s.price,
          })),
        );
      } catch {
        setServiceOptions([]);
      }
    },
    [],
  );

  const handleFieldChange = useCallback(
    (name: string, value: string) => {
      if (name === 'arrivalDate') {
        setSelectedArrivalDate(value);
      }

      if (name === 'department_id') {
        setSelectedServices([]);
        setServicesError('');
        fetchServicesByDepartment(value);
      }
    },
    [fetchServicesByDepartment],
  );

  const minArrivalTime =
    selectedArrivalDate === minArrival.date ? minArrival.time : undefined;

  // ── Services total ───────────────────────────────────────────
  const servicesTotal = selectedServices.reduce(
    (sum, s) => sum + parseFloat(s.price) * s.quantity,
    0,
  );

  // ── Derived read-only values ─────────────────────────────────
  const customerName = customer?.customer_name ?? '—';
  const mobileNumber = customer?.mobile_number ?? '—';
  const unitType = unit?.unit_specifications?.unit_type_name ?? '—';
  const unitNumber = unit?.unit_number ?? '—';
  const area = unit?.unit_specifications?.total_area ?? '—';
  const location = flattenLocationNames(unit?.unit_specifications?.locations);

  // ── Form config ──────────────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'customerName',
      label: tForm('customerName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'mobileNumber',
      label: t('create.mobileNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'unitType',
      label: t('create.unitType'),
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
      name: 'area',
      label: t('create.area'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'location',
      label: t('create.location'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'requesterName',
      label: t('create.requesterName'),
      placeholder: t('create.requesterName'),
      type: 'text',
    },
    {
      name: 'requesterMobile',
      label: t('create.requesterMobile'),
      placeholder: t('create.requesterMobile'),
      type: 'text',
      inputMode: 'numeric',
      onlyNumbers: true,
      maxLength: 11,
    },
    {
      name: 'department_id',
      label: tForm('department'),
      placeholder: tForm('department'),
      fieldType: 'select',
      options: departmentOptions,
    },
    {
      name: 'contact_channel_id',
      label: tForm('contactChannel'),
      placeholder: tForm('contactChannel'),
      fieldType: 'select',
      options: contactChannelOptions,
    },

    {
      name: 'arrivalDate',
      label: t('create.arrivalDate'),
      type: 'date',
      min: minArrival.date,
    },
    {
      name: 'notes',
      label: t('create.notes'),
      placeholder: t('create.notes'),
      fieldType: 'textarea',
      rows: 6,
    },
    {
      name: 'arrivalTime',
      label: t('create.arrivalTime'),
      type: 'time',
      min: minArrivalTime,
    },

    {
      name: 'has_runner_cashier',
      label: t('create.runnerCashier'),
      fieldType: 'checkbox',
    },
    {
      name: 'is_urgent',
      label: t('create.urgent'),
      fieldType: 'checkbox',
    },
  ];

  const buttons: ButtonConfig[] = [
    ...(!(selectedServices.length > 0 && servicesTotal === 0)
      ? [
          {
            label: tForm('add'),
            loadingLabel: tForm('adding'),
            type: 'submit' as const,
            variant: 'primary' as const,
          },
        ]
      : []),
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
      onClick: () => router.push('/tickets/add'),
    },
  ];

  const uploadStagedDocument = useCallback(
    async (ticketId?: number) => {
      if (!stagedAttachments.length || !ticketId) return;
      for (const attachment of stagedAttachments) {
        try {
          await uploadUnitMedia({
            file: attachment.file,
            media_type_id: attachment.mediaTypeId,
            file_name: attachment.file.name,
            description: attachment.description || undefined,
            ticket_id: String(ticketId),
            unit_id: unit?.unit_id ?? unit?.id ?? Number(unitId),
            unit_number: unitNumber !== '—' ? unitNumber : undefined,
            customer_name: customerName !== '—' ? customerName : undefined,
            customer_id: customerId!,
            customer_code: customerCode,
          });
        } catch (err) {
          // Ticket already exists; surface the error but don't block navigation.
          showError(err);
        }
      }
    },
    [
      stagedAttachments,
      unit,
      unitId,
      unitNumber,
      customerName,
      customerId,
      customerCode,
      showError,
    ],
  );

  const handleSubmit = async (data: FormData) => {
    if (selectedServices.length === 0) {
      setServicesError(t('create.servicesRequired'));
      collectAfterCreateRef.current = false;
      return;
    }
    setServicesError('');
    setSubmitError('');

    const shouldCollect = collectAfterCreateRef.current;
    collectAfterCreateRef.current = false;

    const now = getLocalNowParts();
    const resolvedDate = data.arrivalDate || now.date;
    const resolvedTime = data.arrivalTime || now.time;
    const arrivalTime = `${resolvedDate} ${resolvedTime}`;
    const ticketPayload: Parameters<typeof createTicket>[0] = {
      customer_name: customerName,
      customer_mobile: mobileNumber,
      customer_id: customerId!,
      ...(customer?.customer_code
        ? { customer_code: customer.customer_code }
        : {}),
      unit_number: unitNumber,
      unit_id: unit?.unit_id ?? unit?.id ?? Number(unitId),
      unit_type: unitType !== '—' ? unitType : undefined,
      project_id: unit?.project_id,
      department_id: Number(data.department_id),
      ...getContactChannelPayload(data.contact_channel_id),
      requester_name: data.requesterName!,
      requester_mobile: data.requesterMobile!,
      ...(data.has_runner_cashier === '1' ? { has_runner_cashier: 1 } : {}),
      ...(data.is_urgent === '1' ? { is_urgent: 1 } : {}),
      notes: data.notes || undefined,
      arrival_time: arrivalTime,
      services: selectedServices.map((s) => ({
        service_id: Number(s.serviceId),
        quantity: s.quantity,
        price: parseFloat(s.price),
      })),
    };

    if (shouldCollect) {
      const totalAmount = selectedServices.reduce(
        (sum, s) => sum + parseFloat(s.price) * s.quantity,
        0,
      );

      if (totalAmount === 0) {
        setIsCollecting(true);
        try {
          const created = await createTicket(ticketPayload);
          const invoiceNumber = created.result?.invoice_number;

          if (!invoiceNumber) {
            throw new Error('Invoice number is missing for collection');
          }

          await payInvoice({
            invoice_number: invoiceNumber,
            project_id: unit?.project_id,
            unit_id: unit?.unit_id ?? unit?.id ?? Number(unitId),
            transactions: [],
          });

          await uploadStagedDocument(created.result?.ticket_id);

          sessionStorage.removeItem('ticket-create-unit');
          showSuccess('collectSuccess');
          router.push('/tickets/search');
        } catch (err) {
          showError(err);
        } finally {
          setIsCollecting(false);
        }
        return;
      }

      setInvoiceTotalAmount(totalAmount);
      setPendingCollectData({
        payload: ticketPayload,
        projectId: unit?.project_id,
      });
      setPaymentModalOpen(true);
      return;
    }

    try {
      const created = await createTicket(ticketPayload);

      await uploadStagedDocument(created.result?.ticket_id);

      sessionStorage.removeItem('ticket-create-unit');
      showSuccess('createSuccess');
      router.push('/tickets/search');
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
      const created = await createTicket(pendingCollectData.payload);
      const invoiceNumber = created.result?.invoice_number;

      if (!invoiceNumber) {
        throw new Error('Invoice number is missing for collection');
      }

      await payInvoice({
        invoice_number: invoiceNumber,
        project_id: pendingCollectData.projectId,
        unit_id: unit?.unit_id ?? unit?.id ?? Number(unitId),
        transactions: entries.map((e) => ({
          total_amount: parseFloat(e.total_amount),
          payment_type_id: parseInt(e.payment_type_id, 10),
          ...(e.reference_number
            ? { reference_number: e.reference_number }
            : {}),
          ...(e.visa_number ? { visa_number: e.visa_number } : {}),
          ...(e.batch_number ? { batch_number: e.batch_number } : {}),
          ...(e.bank_name ? { bank_name: e.bank_name } : {}),
          ...(e.cheque_due_date ? { cheque_due_date: e.cheque_due_date } : {}),
          ...(e.sister_company_id
            ? { sister_company_id: parseInt(e.sister_company_id, 10) }
            : {}),
          ...(e.mobile_number ? { mobile_number: e.mobile_number } : {}),
          transaction_at: new Date().toISOString(),
        })),
      });

      await uploadStagedDocument(created.result?.ticket_id);

      sessionStorage.removeItem('ticket-create-unit');
      setPendingCollectData(null);
      setPaymentModalOpen(false);
      showSuccess('collectSuccess');
      router.push('/tickets/search');
    } catch (err) {
      showError(err);
    } finally {
      setIsCollecting(false);
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

  // Wait for sessionStorage hydration before rendering the form
  // so initialValues contain the actual unit/customer data
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
          mobileNumber,
          unitType,
          unitNumber,
          area,
          location,
          requesterName: '',
          requesterMobile: '',
          department_id: '',
          contact_channel_id: '',
          has_runner_cashier: '0',
          is_urgent: '0',
          notes: '',
          arrivalDate: '',
          arrivalTime: '',
        }}
        validationSchema={createTicketSchema}
        onSubmit={handleSubmit}
        onFieldChange={handleFieldChange}
      >
        <ServicesPicker
          services={serviceOptions}
          value={selectedServices}
          onChange={(next) => {
            setSelectedServices(next);
            if (next.length > 0) setServicesError('');
          }}
          label={t('create.servicesLabel')}
          error={servicesError}
        />

        {/* Document attachment ─────────────────────────────────── */}
        <div className="flex flex-col gap-2">
          <label className="block text-sm font-medium text-slate-700">
            {t('create.attachDocument')}
          </label>
          {stagedAttachments.length > 0 && (
            <div className="flex flex-col gap-2">
              {stagedAttachments.map((attachment, index) => (
                <div
                  key={`${attachment.file.name}-${attachment.file.size}-${attachment.file.lastModified}-${index}`}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5"
                >
                  <FileImage size={18} className="shrink-0 text-sky-600" />
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-medium text-slate-700">
                      {attachment.file.name}
                    </span>
                    {attachment.description && (
                      <span className="truncate text-xs text-slate-500">
                        {attachment.description}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setStagedAttachments((prev) =>
                        prev.filter((_, i) => i !== index),
                      )
                    }
                    className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200 hover:text-red-600"
                    aria-label={t('create.removeDocument')}
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="secondary"
            onClick={() => setAttachModalOpen(true)}
            className="self-start"
          >
            <Paperclip size={16} className="mr-1.5" />
            {t('create.attachDocument')}
          </Button>
        </div>

        {submitError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {submitError}
          </div>
        )}
      </Form>

      <PaymentMethodsModal
        open={paymentModalOpen}
        totalAmount={invoiceTotalAmount}
        paymentTypes={dropdowns?.payment_types ?? []}
        sisterCompanies={dropdowns?.sister_companies ?? []}
        onCollect={handleCollect}
        onCancel={() => {
          setPaymentModalOpen(false);
          setPendingCollectData(null);
        }}
        isCollecting={isCollecting}
      />

      <MediaUploadModal
        open={attachModalOpen}
        mode="stage"
        confirmLabel={tForm('attach')}
        onClose={() => setAttachModalOpen(false)}
        onSuccess={() => setAttachModalOpen(false)}
        onStage={({ files, description, mediaTypeId }) => {
          setStagedAttachments((prev) => [
            ...prev,
            ...files.map((file) => ({ file, description, mediaTypeId })),
          ]);
        }}
        context={{
          // Placeholder – the real ticket_id is supplied at upload time.
          // The modal only uses this to derive the media type.
          ticket_id: 'pending',
          unit_id: unit?.unit_id ?? unit?.id ?? Number(unitId),
          unit_number: unitNumber !== '—' ? unitNumber : undefined,
          customer_name: customerName !== '—' ? customerName : undefined,
          customer_id: customerId ?? 0,
          customer_code: customer?.customer_code ?? undefined,
        }}
      />
    </div>
  );
}
