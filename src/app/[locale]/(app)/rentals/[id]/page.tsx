'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CarFront,
  CreditCard,
  Eye,
  FileText,
  IdCard,
  Paperclip,
  Phone,
  UserRound,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from '@/src/i18n/navigation';
import AccessDenied from '@/src/components/AccessDenied';
import AddEntryModal, {
  type ModalField,
} from '@/src/components/ui/AddEntryModal';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import FilePreviewDialog, {
  type PreviewFile,
} from '@/src/components/ui/FilePreviewDialog';
import { downloadFile } from '@/src/lib/downloadFile';
import type { SelectOption } from '@/src/components/ui/Select';
import PaymentMethodsModal, {
  type PaymentEntry,
} from '@/src/components/PaymentMethodsModal';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import {
  getBackendErrorMessage,
  useResponseMessage,
} from '@/src/hooks/useResponseMessage';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  RENTAL_STATUSES,
  changeRentalReservation,
  checkInRental,
  checkoutRental,
  createRentalInvoice,
  createRentalInvoiceAndGetNumber,
  getRentalById,
  terminateRental,
  updateRental,
  type RentalInvoice,
  type RentalRecord,
} from '@/src/services/rentals';
import { payInvoice } from '@/src/services/invoices';
import { getUnitById, type Unit } from '@/src/services/units';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

function normalizeStatus(status: string) {
  return status.trim().toLowerCase().replace(/\s+/g, ' ');
}

function getStatusBadgeClass(status: string) {
  const normalized = normalizeStatus(status);

  if (normalized.includes('active')) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (
    normalized.includes('fees collection') ||
    normalized.includes('pending')
  ) {
    return 'border-amber-200 bg-amber-50 text-amber-700';
  }

  if (normalized.includes('finished') || normalized.includes('completed')) {
    return 'border-blue-200 bg-blue-50 text-blue-700';
  }

  if (normalized.includes('cancel')) {
    return 'border-red-200 bg-red-50 text-red-700';
  }

  if (normalized.includes('terminat')) {
    return 'border-orange-200 bg-orange-50 text-orange-700';
  }

  return 'border-sky-200 bg-sky-50 text-sky-700';
}

function getStatusLabel(status: string, t: (key: string) => string) {
  const normalized = normalizeStatus(status);

  if (normalized === normalizeStatus(RENTAL_STATUSES.CREATED)) {
    return t('statusLabels.created');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.FEES_COLLECTION_PENDING)) {
    return t('statusLabels.feesCollectionPending');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.ACTIVE)) {
    return t('statusLabels.active');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.FINISHED)) {
    return t('statusLabels.finished');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.COMPLETED)) {
    return t('statusLabels.completed');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.CANCELLED)) {
    return t('statusLabels.cancelled');
  }

  if (normalized === normalizeStatus(RENTAL_STATUSES.TERMINATED)) {
    return t('statusLabels.terminated');
  }

  return status;
}

function getTimelineActionLabel(action: string, t: (key: string) => string) {
  const normalized = normalizeStatus(action);

  if (
    normalized.includes('reservation created') ||
    normalized.includes('rental reservation created')
  ) {
    return t('detail.timelineActions.created');
  }

  if (
    normalized.includes('invoice issued') ||
    normalized.includes('invoice created')
  ) {
    return t('detail.timelineActions.invoiceIssued');
  }

  if (normalized.includes('checked in')) {
    return t('detail.timelineActions.checkedIn');
  }

  if (normalized.includes('checked out')) {
    return t('detail.timelineActions.checkedOut');
  }

  if (
    normalized.includes('reservation changed') ||
    normalized.includes('reservation updated')
  ) {
    return t('detail.timelineActions.reservationChanged');
  }

  if (normalized.includes('cancel')) {
    return t('detail.timelineActions.cancelled');
  }

  if (normalized.includes('terminat')) {
    return t('detail.timelineActions.terminated');
  }

  if (normalized.includes('status updated')) {
    return t('detail.timelineActions.statusUpdated');
  }

  return action;
}

function getTimelineNotesLabel(
  notes: string | undefined,
  t: (key: string) => string,
) {
  if (!notes) {
    return undefined;
  }

  const normalized = normalizeStatus(notes);

  if (
    normalized ===
      normalizeStatus('Rental reservation created from the add form.') ||
    normalized ===
      normalizeStatus('Reservation created from the add-rental flow.') ||
    normalized === normalizeStatus('Reservation created and confirmed.')
  ) {
    return t('detail.timelineNotes.created');
  }

  if (
    normalized ===
    normalizeStatus('Tenant checked in and the reservation became active.')
  ) {
    return t('detail.timelineNotes.checkedIn');
  }

  if (
    normalized ===
    normalizeStatus('Tenant checked out and the rental was finished.')
  ) {
    return t('detail.timelineNotes.checkedOut');
  }

  if (normalized === normalizeStatus('Reservation details were updated.')) {
    return t('detail.timelineNotes.reservationChanged');
  }

  if (normalized.startsWith('invoice created:')) {
    return t('detail.timelineNotes.invoiceIssued');
  }

  return notes;
}

function getIdTypeLabel(idType: string, t: (key: string) => string) {
  const normalized = idType.trim().toLowerCase();

  if (normalized === '1' || normalized.includes('national')) {
    return t('create.idTypes.nationalId');
  }

  if (normalized === '2' || normalized.includes('passport')) {
    return t('create.idTypes.passport');
  }

  return idType || '—';
}

function formatDateValue(value?: string) {
  if (!value) {
    return '—';
  }

  const normalized = value.split('T')[0];
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
}

function getNestedDisplayLabel(value: unknown) {
  if (value == null) {
    return '—';
  }

  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    return text || '—';
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const label =
      record.ar_name ??
      record.en_name ??
      record.name ??
      record.label ??
      record.invoice_type_name ??
      record.invoice_status_name;

    if (typeof label === 'string' && label.trim()) {
      return label;
    }
  }

  return '—';
}

function getInvoiceAmountValue(invoice: {
  amount?: string | number | null;
  total_amount?: string | number | null;
}) {
  const value = invoice.total_amount ?? invoice.amount;

  if (value === undefined || value === null || value === '') {
    return '—';
  }

  return String(value);
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
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white shadow-sm">
        <Icon size={18} className="text-sky-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </p>
        <p className="mt-1 text-sm font-medium text-slate-800">
          {value || '—'}
        </p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
      {text}
    </div>
  );
}

function InvoiceDataTable({
  rental,
  t,
}: {
  rental: { invoices?: RentalInvoice[] };
  t: (key: string) => string;
}) {
  const columns = useMemo<ColumnDef<RentalInvoice>[]>(
    () => [
      {
        id: 'invoice_type',
        label: t('detail.invoiceType'),
        cell: (row) => getNestedDisplayLabel(row.invoice_type),
      },
      {
        id: 'amount',
        label: t('detail.amount'),
        cell: (row) =>
          getInvoiceAmountValue(
            row as {
              amount?: string | number | null;
              total_amount?: string | number | null;
            },
          ),
      },
      {
        id: 'invoice_status',
        label: t('detail.currentStatus'),
        cell: (row) =>
          getNestedDisplayLabel(
            (row as { invoice_status?: unknown; status?: unknown })
              .invoice_status ??
              (row as { invoice_status?: unknown; status?: unknown }).status,
          ),
      },
      {
        id: 'created_at',
        label: t('detail.requestCreatedAt'),
        cell: (row) => formatDateValue(row.created_at),
      },
    ],
    [t],
  );

  return (
    <DataTable<RentalInvoice>
      columns={columns}
      data={rental.invoices ?? []}
      rowKey={(row) => row.id}
      emptyState={t('detail.noInvoices')}
      showColumnToggle={false}
      itemsPerPage={5}
    />
  );
}

export default function RentalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('rentals');
  const tForm = useTranslations('form');
  const { error: showError } = useResponseMessage();
  const { data: dropdowns, refreshDropdowns } = useDropdowns();
  const rentalId = Number(params.id);
  const privileges = useRoutePrivileges('/rentals/search');

  const canReadRental =
    privileges.canAccess ||
    privileges.hasAnyPrivilege([
      PRIVILEGE_IDS.READ,
      PRIVILEGE_IDS.READ_ALL,
      PRIVILEGE_IDS.EDIT,
    ]);
  const canEditRental = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const ticketAddPrivileges = useRoutePrivileges('/tickets/add');
  const canCreateTicket = ticketAddPrivileges.hasPrivilege(PRIVILEGE_IDS.ADD);

  const [rental, setRental] = useState<RentalRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showReservationModal, setShowReservationModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [showCheckoutWarning, setShowCheckoutWarning] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showInvoicePaymentModal, setShowInvoicePaymentModal] = useState(false);
  const [invoicePaymentAmount, setInvoicePaymentAmount] = useState(0);
  const [isCollectingInvoice, setIsCollectingInvoice] = useState(false);
  const [previewAttachment, setPreviewAttachment] =
    useState<PreviewFile | null>(null);
  const pendingInvoicePayloadRef = useRef<{
    invoice_type: string;
    amount: number;
    notes?: string;
  } | null>(null);

  const checkoutEndTime = useMemo(() => {
    const configs = (dropdowns?.system_config ??
      []) as import('@/src/types/dropdowns').SystemConfigOption[];
    return (
      configs.find((c) => c.variable_name === 'checkout_end_time')
        ?.config_value ?? null
    );
  }, [dropdowns]);

  const isCurrentTimePastCheckout = useCallback(() => {
    if (!checkoutEndTime) return false;
    const now = new Date();
    const [hours, minutes] = checkoutEndTime.split(':').map(Number);
    const cutoff = new Date(now);
    cutoff.setHours(hours, minutes, 0, 0);
    return now > cutoff;
  }, [checkoutEndTime]);

  const handleOpenCheckoutModal = useCallback(() => {
    if (isCurrentTimePastCheckout()) {
      setShowCheckoutWarning(true);
    } else {
      setShowCheckoutModal(true);
    }
  }, [isCurrentTimePastCheckout]);

  const loadRental = useCallback(async () => {
    if (!rentalId || Number.isNaN(rentalId)) {
      setRental(null);
      setLoadError(t('detail.notFound'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const data = await getRentalById(rentalId);

      if (!data) {
        setRental(null);
        setLoadError(t('detail.notFoundMessage'));
      } else {
        setRental(data);
      }
    } catch (error) {
      setRental(null);
      setLoadError(getBackendErrorMessage(error) || t('loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [rentalId, t]);

  useEffect(() => {
    const cancel = runAfterCommit(() => {
      void loadRental();
    });

    return () => {
      cancel();
    };
  }, [loadRental]);

  const invoiceTypeOptions = useMemo<SelectOption[]>(() => {
    const options = (dropdowns?.rental_invoice_types ?? []).map((item) => ({
      value: String(item.id),
      label: item.name,
    }));

    if (options.length > 0) {
      return options;
    }

    return [
      {
        value: '1',
        label: t('detail.invoiceTypes.dailyFees'),
      },
      {
        value: '2',
        label: t('detail.invoiceTypes.accessCardInsurance'),
      },
      {
        value: '3',
        label: t('detail.invoiceTypes.securityDeposit'),
      },
    ];
  }, [dropdowns, t]);

  const idTypeOptions = useMemo<SelectOption[]>(
    () => [
      { value: '1', label: t('create.idTypes.nationalId') },
      { value: '2', label: t('create.idTypes.passport') },
    ],
    [t],
  );

  const ratingOptions = useMemo<SelectOption[]>(
    () => [
      { value: 'Excellent', label: t('detail.ratings.excellent') },
      { value: 'Good', label: t('detail.ratings.good') },
      { value: 'Fair', label: t('detail.ratings.fair') },
      { value: 'Poor', label: t('detail.ratings.poor') },
    ],
    [t],
  );

  const reservationMinEndDate = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }, []);

  const editFields = useMemo<ModalField[]>(
    () => [
      {
        name: 'tenant_name',
        label: t('detail.tenantName'),
        required: true,
      },
      {
        name: 'phone',
        label: t('detail.mobile'),
        required: true,
      },
      {
        name: 'email',
        label: t('detail.email'),
        type: 'email',
      },
      {
        name: 'id_type',
        label: t('detail.idType'),
        type: 'select',
        required: true,
        options: idTypeOptions,
      },
      {
        name: 'id_number',
        label: t('detail.idNumber'),
        required: true,
      },
      {
        name: 'start_date',
        label: t('detail.startDate'),
        type: 'date',
        required: true,
        disabled: rental?.status === RENTAL_STATUSES.ACTIVE,
      },
      {
        name: 'end_date',
        label: t('detail.endDate'),
        type: 'date',
        required: true,
      },
      {
        name: 'access_card_number',
        label: t('detail.accessCardNumber'),
      },
      {
        name: 'notes',
        label: t('detail.notes'),
        type: 'textarea',
      },
    ],
    [idTypeOptions, t, rental?.status],
  );

  const invoiceFields = useMemo<ModalField[]>(
    () => [
      {
        name: 'invoice_type',
        label: t('detail.invoiceType'),
        type: 'select',
        required: true,
        options: invoiceTypeOptions,
      },
      {
        name: 'amount',
        label: t('detail.amount'),
        type: 'number',
        required: true,
      },
      {
        name: 'notes',
        label: t('detail.notes'),
        type: 'textarea',
      },
    ],
    [invoiceTypeOptions, t],
  );

  const reservationFields = useMemo<ModalField[]>(
    () => [
      {
        name: 'unit_number',
        label: t('detail.unitNumber'),
        required: true,
      },
      {
        name: 'end_date',
        label: t('detail.endDate'),
        type: 'date',
        required: true,
        min: reservationMinEndDate || undefined,
      },
      {
        name: 'access_card_number',
        label: t('detail.accessCardNumber'),
      },
      {
        name: 'notes',
        label: t('detail.notes'),
        type: 'textarea',
      },
    ],
    [reservationMinEndDate, t],
  );

  const checkoutFields = useMemo<ModalField[]>(
    () => [
      {
        name: 'penalty_amount',
        label: t('detail.penaltyAmount'),
        type: 'number',
      },
      {
        name: 'invoice_type',
        label: t('detail.invoiceType'),
        type: 'select',
        options: invoiceTypeOptions,
      },
      {
        name: 'invoice_amount',
        label: t('detail.invoiceAmount'),
        type: 'number',
      },
      {
        name: 'invoice_notes',
        label: t('detail.invoiceNotes'),
        type: 'textarea',
      },
      {
        name: 'tenant_rating',
        label: t('detail.tenantRating'),
        type: 'select',
        required: true,
        options: ratingOptions,
      },
      {
        name: 'remarks',
        label: t('detail.remarks'),
        type: 'textarea',
      },
    ],
    [invoiceTypeOptions, ratingOptions, t],
  );

  const terminateFields = useMemo<ModalField[]>(
    () => [
      {
        name: 'termination_reason',
        label: t('detail.terminationReason'),
        type: 'textarea',
        required: true,
      },
      {
        name: 'penalty_amount',
        label: t('detail.penaltyAmount'),
        type: 'number',
      },
      {
        name: 'invoice_type',
        label: t('detail.invoiceType'),
        type: 'select',
        options: invoiceTypeOptions,
      },
      {
        name: 'invoice_amount',
        label: t('detail.invoiceAmount'),
        type: 'number',
      },
      {
        name: 'invoice_notes',
        label: t('detail.invoiceNotes'),
        type: 'textarea',
      },
    ],
    [invoiceTypeOptions, t],
  );

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const rentalStartDate = (rental?.start_date ?? '').split('T')[0];
  const rentalEndDate = (rental?.end_date ?? '').split('T')[0];
  const isFinished =
    rental != null &&
    (rental.status === RENTAL_STATUSES.FINISHED ||
      rental.status === RENTAL_STATUSES.COMPLETED ||
      rental.status === RENTAL_STATUSES.TERMINATED);
  const canCheckIn =
    canEditRental &&
    rental != null &&
    !isFinished &&
    rental.status !== RENTAL_STATUSES.ACTIVE &&
    rental.status !== RENTAL_STATUSES.CANCELLED &&
    rentalStartDate <= today;
  const canIssueInvoice =
    canEditRental &&
    rental != null &&
    rental.status !== RENTAL_STATUSES.CANCELLED &&
    !isFinished;
  const canChangeReservation =
    canEditRental &&
    rental != null &&
    rental.status !== RENTAL_STATUSES.CANCELLED &&
    !isFinished;
  const canCheckOut =
    canEditRental &&
    rental != null &&
    rental.status === RENTAL_STATUSES.ACTIVE &&
    rentalEndDate <= today;
  const canTerminate =
    canEditRental && rental != null && rental.status === RENTAL_STATUSES.ACTIVE;

  const handleViewAttachment = (filePath?: string, fileName?: string) => {
    if (!filePath) return;
    setPreviewAttachment({ url: filePath, name: fileName ?? 'attachment' });
  };

  const handleDownloadAttachment = (filePath?: string, fileName?: string) => {
    if (!filePath) return;
    downloadFile(filePath, fileName);
  };

  const handleCreateTicket = useCallback(async () => {
    if (!rental || !canCreateTicket) return;

    const unitIdentifier = rental.unit_id;
    if (!unitIdentifier) {
      toast.error(t('detail.unitNotAvailable'));
      return;
    }

    setIsCreatingTicket(true);

    try {
      const unit = await getUnitById(unitIdentifier);

      if (!unit) {
        toast.error(t('detail.unitNotAvailable'));
        return;
      }

      if (unit.is_locked === 1) {
        toast.error(t('detail.unitIsBlocked'));
        return;
      }

      const tenantCustomerUnit: Unit['customer_units'][number] = {
        customer_id: rental.customer_id ?? 0,
        customer_code: null,
        customer_name: rental.tenant_name,
        mobile_number: rental.phone,
        customer_type_id: null,
        customer_type_name: null,
        marital_status_id: null,
        marital_status_name: null,
        religion_id: null,
        religion_name: null,
        country_id: null,
        country_name: null,
        id_type_id: Number(rental.id_type) || null,
        id_type_name: null,
        id_number: rental.id_number ?? null,
        ownership_type_id: null,
        ownership_type_name: null,
        sign_date: null,
        contract_number: null,
      };

      const unitForTicket: Unit = {
        ...unit,
        customer_units: [tenantCustomerUnit],
      };

      sessionStorage.setItem(
        'ticket-create-unit',
        JSON.stringify({ unit: unitForTicket, customerIndex: 0 }),
      );

      router.push(
        `/tickets/add/create?unitId=${unit.unit_id ?? unit.id}&customerId=${rental.customer_id ?? 0}`,
      );
    } catch (error) {
      showError(error);
    } finally {
      setIsCreatingTicket(false);
    }
  }, [rental, canCreateTicket, router, showError, t]);

  const handleUpdateState = (updatedRental: RentalRecord | null) => {
    if (!updatedRental) {
      throw new Error('Rental not found');
    }

    setRental(updatedRental);
  };

  const handleSaveDetails = async (values: Record<string, string>) => {
    if (!rental) return;

    setIsSavingAction(true);

    try {
      handleUpdateState(
        await updateRental(rental.id, {
          tenant_name: values.tenant_name.trim(),
          phone: values.phone.trim(),
          email: values.email.trim() || undefined,
          id_type: values.id_type,
          id_number: values.id_number.trim(),
          start_date: values.start_date,
          end_date: values.end_date,
          access_card_number: values.access_card_number.trim() || undefined,
          notes: values.notes.trim() || undefined,
        }),
      );
      setShowEditModal(false);
      toast.success(t('detail.editSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleIssueInvoice = async (values: Record<string, string>) => {
    if (!rental) return;

    setIsSavingAction(true);

    try {
      handleUpdateState(
        await createRentalInvoice(rental.id, {
          invoice_type: values.invoice_type,
          amount: Number(values.amount || 0),
          notes: values.notes.trim() || undefined,
          access_card_insurance: values.access_card_insurance === '1',
        }),
      );
      setShowInvoiceModal(false);
      toast.success(t('detail.invoiceSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleIssueInvoiceAndCollect = async (
    values: Record<string, string>,
  ) => {
    if (!rental) return;

    pendingInvoicePayloadRef.current = {
      invoice_type: values.invoice_type,
      amount: Number(values.amount || 0),
      notes: values.notes.trim() || undefined,
    };
    setInvoicePaymentAmount(Number(values.amount || 0));
    setShowInvoiceModal(false);
    setShowInvoicePaymentModal(true);
  };

  const handleCollectRentalInvoice = async (entries: PaymentEntry[]) => {
    if (!rental || !pendingInvoicePayloadRef.current) {
      setShowInvoicePaymentModal(false);
      return;
    }

    setIsCollectingInvoice(true);

    try {
      const invoiceNumber = await createRentalInvoiceAndGetNumber(rental.id, {
        invoice_type: pendingInvoicePayloadRef.current.invoice_type,
        amount: pendingInvoicePayloadRef.current.amount,
        notes: pendingInvoicePayloadRef.current.notes,
      });

      if (!invoiceNumber) {
        throw new Error('Invoice number is missing from the response');
      }

      await payInvoice({
        invoice_number: invoiceNumber,
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

      pendingInvoicePayloadRef.current = null;
      setShowInvoicePaymentModal(false);
      handleUpdateState(await getRentalById(rental.id));
      toast.success(t('detail.invoiceSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsCollectingInvoice(false);
    }
  };

  const handleOpenInvoiceModal = async () => {
    try {
      await refreshDropdowns();
    } catch (error) {
      showError(error);
    } finally {
      setShowInvoiceModal(true);
    }
  };

  const handleCheckIn = async () => {
    if (!rental) return;

    setIsSavingAction(true);

    try {
      handleUpdateState(await checkInRental(rental.id));
      toast.success(t('detail.statusChangeSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleChangeReservation = async (values: Record<string, string>) => {
    if (!rental) return;

    if (values.end_date < today) {
      toast.error(t('detail.changeReservationMinDateError'));
      return;
    }

    setIsSavingAction(true);

    try {
      handleUpdateState(
        await changeRentalReservation(rental.id, {
          unit_number: values.unit_number,
          end_date: values.end_date,
          access_card_number: values.access_card_number,
          notes: values.notes,
        }),
      );
      setShowReservationModal(false);
      toast.success(t('detail.changeReservationSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleCheckOut = async (values: Record<string, string>) => {
    if (!rental) return;

    setIsSavingAction(true);

    try {
      const penaltyAmount = Number(values.penalty_amount || 0);

      await checkoutRental(rental.id, {
        penalty_amount: penaltyAmount,
        tenant_rating: values.tenant_rating,
        remarks: values.remarks,
      });

      if (penaltyAmount > 0 && values.invoice_type) {
        await createRentalInvoice(rental.id, {
          invoice_type: values.invoice_type,
          amount: Number(values.invoice_amount || penaltyAmount),
          notes: values.invoice_notes?.trim() || undefined,
        });
      }

      handleUpdateState(await getRentalById(rental.id));
      setShowCheckoutModal(false);
      toast.success(t('detail.checkOutSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleTerminate = async (values: Record<string, string>) => {
    if (!rental) return;

    setIsSavingAction(true);

    try {
      const penaltyAmount = Number(values.penalty_amount || 0);

      await terminateRental(rental.id, {
        termination_reason: values.termination_reason.trim(),
        penalty_amount: penaltyAmount || undefined,
      });

      if (penaltyAmount > 0 && values.invoice_type) {
        await createRentalInvoice(rental.id, {
          invoice_type: values.invoice_type,
          amount: Number(values.invoice_amount || penaltyAmount),
          notes: values.invoice_notes?.trim() || undefined,
        });
      }

      handleUpdateState(await getRentalById(rental.id));
      setShowTerminateModal(false);
      toast.success(t('detail.terminateSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  if (!canReadRental) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <MainBox>
          <p className="text-sm text-slate-500">{t('loading')}</p>
        </MainBox>
      </div>
    );
  }

  if (!rental) {
    return (
      <div className="p-6">
        <MainBox>
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {t('detail.notFound')}
            </h1>
            <p className="text-sm text-slate-500">
              {loadError || t('detail.notFoundMessage')}
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => router.push('/rentals/search')}
              >
                {t('detail.back')}
              </Button>
            </div>
          </div>
        </MainBox>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <button
            onClick={() => router.push('/rentals/search')}
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            <ArrowLeft size={16} />
            {t('detail.back')}
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {t('detail.title')} • {rental.rental_code}
            </h1>
            <p className="text-sm text-slate-500">
              {t('detail.manageDescription')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">

          {canEditRental ? (
            <Button variant="primary" onClick={() => setShowEditModal(true)}>
              {t('detail.editRental')}
            </Button>
          ) : null}

          {canCreateTicket && rental.unit_id ? (
            <Button
              variant="secondary"
              onClick={() => {
                void handleCreateTicket();
              }}
              isLoading={isCreatingTicket}
            >
              {t('detail.createTicket')}
            </Button>
          ) : null}

          {canIssueInvoice ? (
            <Button
              variant="secondary"
              onClick={() => {
                void handleOpenInvoiceModal();
              }}
            >
              {t('detail.issueInvoice')}
            </Button>
          ) : null}

          {canCheckIn ? (
            <Button
              variant="success"
              onClick={() => {
                void handleCheckIn();
              }}
              isLoading={isSavingAction}
            >
              {t('detail.checkIn')}
            </Button>
          ) : null}

          {canChangeReservation ? (
            <Button
              variant="secondary"
              onClick={() => setShowReservationModal(true)}
            >
              {t('detail.changeReservation')}
            </Button>
          ) : null}

          {canCheckOut ? (
            <Button variant="danger" onClick={handleOpenCheckoutModal}>
              {t('detail.checkOut')}
            </Button>
          ) : null}

          {canTerminate ? (
            <Button
              variant="danger"
              onClick={() => {
                void (async () => {
                  try {
                    await refreshDropdowns();
                  } catch (error) {
                    showError(error);
                  } finally {
                    setShowTerminateModal(true);
                  }
                })();
              }}
            >
              {t('detail.terminate')}
            </Button>
          ) : null}
        </div>
      </div>

      <MainBox>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
              rental.status,
            )}`}
          >
            {getStatusLabel(rental.status, t)}
          </span>
          <span className="text-sm text-slate-500">
            {t('detail.requestCreatedAt')}: {formatDateValue(rental.created_at)}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoRow
            icon={UserRound}
            label={t('detail.tenantName')}
            value={rental.tenant_name}
          />
          <InfoRow
            icon={Phone}
            label={t('detail.mobile')}
            value={rental.phone}
          />
          <InfoRow
            icon={IdCard}
            label={t('detail.idType')}
            value={getIdTypeLabel(rental.id_type, t)}
          />
          <InfoRow
            icon={IdCard}
            label={t('detail.idNumber')}
            value={rental.id_number}
          />
          <InfoRow
            icon={Building2}
            label={t('detail.projectName')}
            value={rental.project_name}
          />
          <InfoRow
            icon={Building2}
            label={t('detail.rentalCompany')}
            value={rental.rental_company_name}
          />
          <InfoRow
            icon={CalendarDays}
            label={t('detail.startDate')}
            value={formatDateValue(rental.start_date)}
          />
          <InfoRow
            icon={CalendarDays}
            label={t('detail.endDate')}
            value={formatDateValue(rental.end_date)}
          />
          <InfoRow
            icon={CreditCard}
            label={t('detail.accessCardNumber')}
            value={rental.access_card_number}
          />
          <InfoRow
            icon={Building2}
            label={t('detail.unitNumber')}
            value={rental.unit_number}
          />
          <InfoRow
            icon={Users}
            label={t('detail.totalTenants')}
            value={rental.total_tenants}
          />
          <InfoRow
            icon={FileText}
            label={t('detail.email')}
            value={rental.email}
          />
        </div>

        {rental.notes ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">
              {t('detail.notes')}:
            </span>{' '}
            {rental.notes}
          </div>
        ) : null}

        {!canCheckIn &&
        canEditRental &&
        rental.status !== RENTAL_STATUSES.ACTIVE &&
        rental.status !== RENTAL_STATUSES.CANCELLED &&
        !isFinished &&
        rentalStartDate > today ? (
          <p className="mt-3 text-sm text-amber-700">
            {t('detail.availableOnStartDate')}
          </p>
        ) : null}

        {!canCheckOut &&
        canEditRental &&
        rental.status === RENTAL_STATUSES.ACTIVE &&
        rentalEndDate > today ? (
          <p className="mt-2 text-sm text-amber-700">
            {t('detail.availableOnEndDate')}
          </p>
        ) : null}
      </MainBox>

      <div className="grid gap-6 xl:grid-cols-2">
        <MainBox>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {t('detail.attachments')}
          </h2>

          {rental.tenant_attachments?.length ? (
            <div className="space-y-3">
              {rental.tenant_attachments.map((attachment) => (
                <div
                  key={attachment.id}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Paperclip size={16} className="text-sky-600" />
                    <span className="truncate text-sm text-slate-700">
                      {attachment.name}
                    </span>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth={false}
                      className="shrink-0"
                      onClick={() =>
                        handleViewAttachment(
                          attachment.file_path,
                          attachment.name,
                        )
                      }
                      disabled={!attachment.file_path}
                    >
                      <Eye size={16} className="me-1 inline" />
                      {t('rentalRequests.detail.view')}
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      fullWidth={false}
                      className="shrink-0"
                      onClick={() =>
                        handleDownloadAttachment(
                          attachment.file_path,
                          attachment.name,
                        )
                      }
                      disabled={!attachment.file_path}
                    >
                      {t('rentalRequests.detail.download')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={t('detail.noAttachments')} />
          )}
        </MainBox>

        <MainBox>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {t('detail.invoiceHistory')}
          </h2>

          <InvoiceDataTable rental={rental} t={t} />
        </MainBox>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <MainBox>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {t('detail.relatives')}
          </h2>

          {rental.relatives?.length ? (
            <div className="space-y-3">
              {rental.relatives.map((relative) => (
                <div
                  key={relative.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <p className="font-semibold text-slate-800">
                    {relative.name}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {t('rentalRequests.detail.relativeIdNumber')}:{' '}
                    {relative.id_number || '—'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t('rentalRequests.detail.relativeMobile')}:{' '}
                    {relative.phone || '—'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t('rentalRequests.detail.relativeEmail')}:{' '}
                    {relative.email || '—'}
                  </p>
                  <p className="text-sm text-slate-600">
                    {t('rentalRequests.detail.relativeRelation')}:{' '}
                    {relative.relation || '—'}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={t('detail.noRelatives')} />
          )}
        </MainBox>

        <MainBox>
          <h2 className="mb-4 text-lg font-semibold text-slate-900">
            {t('detail.vehicles')}
          </h2>

          {rental.vehicles?.length ? (
            <div className="space-y-3">
              {rental.vehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-2 text-slate-800">
                    <CarFront size={16} className="text-sky-600" />
                    <span className="font-semibold">
                      {vehicle.brand} {vehicle.model}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {vehicle.plate_text} - {vehicle.plate_number}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState text={t('detail.noVehicles')} />
          )}
        </MainBox>
      </div>

      <MainBox>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">
          {t('detail.activityTimeline')}
        </h2>

        {rental.status_history?.length ? (
          <div className="space-y-4">
            {rental.status_history.map((entry) => (
              <div
                key={entry.id}
                className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <div
                  className={`mt-1 h-3 w-3 rounded-full ${getStatusBadgeClass(entry.status).split(' ')[1]}`}
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-slate-800">
                      {getTimelineActionLabel(entry.action, t)}
                    </p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                        entry.status,
                      )}`}
                    >
                      {getStatusLabel(entry.status, t)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDateValue(entry.created_at)}
                  </p>
                  {entry.notes ? (
                    <p className="mt-1 text-sm text-slate-600">
                      {getTimelineNotesLabel(entry.notes, t)}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text={t('detail.noActivity')} />
        )}

        {rental.checkout_summary || rental.termination_reason ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <p className="font-semibold text-slate-800">
              {t('detail.checkOut')}
            </p>
            {rental.termination_reason ? (
              <p>
                {t('detail.terminationReason')}: {rental.termination_reason}
              </p>
            ) : null}
            {rental.checkout_summary ? (
              <>
                <p>
                  {t('detail.penaltyAmount')}:{' '}
                  {rental.checkout_summary.penalty_amount ?? 0}
                </p>
                <p>
                  {t('detail.tenantRating')}:{' '}
                  {rental.checkout_summary.tenant_rating || '—'}
                </p>
                <p>
                  {t('detail.remarks')}:{' '}
                  {rental.checkout_summary.remarks || '—'}
                </p>
              </>
            ) : null}
          </div>
        ) : null}
      </MainBox>

      <AddEntryModal
        open={showEditModal}
        title={t('detail.editRental')}
        fields={editFields}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        onSave={handleSaveDetails}
        onCancel={() => setShowEditModal(false)}
        initialValues={{
          tenant_name: rental.tenant_name,
          phone: rental.phone,
          email: rental.email ?? '',
          id_type: rental.id_type,
          id_number: rental.id_number,
          start_date: rental.start_date,
          end_date: rental.end_date,
          access_card_number: rental.access_card_number ?? '',
          notes: rental.notes ?? '',
        }}
        isSaving={isSavingAction}
      />

      <AddEntryModal
        open={showInvoiceModal}
        title={t('detail.issueInvoice')}
        fields={invoiceFields}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        onSave={handleIssueInvoice}
        onCancel={() => setShowInvoiceModal(false)}
        initialValues={{
          invoice_type: invoiceTypeOptions[0]?.value ?? '',
          amount: '',
          notes: '',
        }}
        isSaving={isSavingAction}
        saveAndCollectLabel={t('create.createAndCollect')}
        onSaveAndCollect={handleIssueInvoiceAndCollect}
      />

      <AddEntryModal
        open={showReservationModal}
        title={t('detail.changeReservation')}
        fields={reservationFields}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        onSave={handleChangeReservation}
        onCancel={() => setShowReservationModal(false)}
        initialValues={{
          unit_number: rental.unit_number,
          end_date: rental.end_date?.split('T')[0] || today,
          access_card_number: rental.access_card_number ?? '',
          notes: rental.notes ?? '',
        }}
        isSaving={isSavingAction}
      />

      <ConfirmModal
        open={showCheckoutWarning}
        title={t('detail.checkOutLateWarningTitle')}
        message={t('detail.checkOutLateWarningMessage', {
          time: checkoutEndTime ?? '',
        })}
        confirmLabel={tForm('confirm')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        onConfirm={() => {
          setShowCheckoutWarning(false);
          setShowCheckoutModal(true);
        }}
        onCancel={() => setShowCheckoutWarning(false)}
      />

      <AddEntryModal
        open={showCheckoutModal}
        title={t('detail.checkOut')}
        fields={checkoutFields}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        onSave={handleCheckOut}
        onCancel={() => setShowCheckoutModal(false)}
        initialValues={{
          penalty_amount: String(rental.checkout_summary?.penalty_amount ?? ''),
          invoice_type: invoiceTypeOptions[0]?.value ?? '',
          invoice_amount: '',
          invoice_notes: '',
          tenant_rating: rental.checkout_summary?.tenant_rating ?? '',
          remarks: rental.checkout_summary?.remarks ?? '',
        }}
        isSaving={isSavingAction}
      />

      <AddEntryModal
        open={showTerminateModal}
        title={t('detail.terminate')}
        fields={terminateFields}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        onSave={handleTerminate}
        onCancel={() => setShowTerminateModal(false)}
        initialValues={{
          termination_reason: '',
          penalty_amount: '',
          invoice_type: invoiceTypeOptions[0]?.value ?? '',
          invoice_amount: '',
          invoice_notes: '',
        }}
        isSaving={isSavingAction}
      />

      <PaymentMethodsModal
        open={showInvoicePaymentModal}
        totalAmount={invoicePaymentAmount}
        paymentTypes={dropdowns?.payment_types ?? []}
        sisterCompanies={dropdowns?.sister_companies ?? []}
        onCollect={handleCollectRentalInvoice}
        onCancel={() => {
          setShowInvoicePaymentModal(false);
          pendingInvoicePayloadRef.current = null;
        }}
        isCollecting={isCollectingInvoice}
      />

      <FilePreviewDialog
        open={!!previewAttachment}
        file={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
