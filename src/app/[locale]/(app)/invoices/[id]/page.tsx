'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createPortal } from 'react-dom';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  User,
  Hash,
  FileText,
  Package,
  CreditCard,
  Calendar,
  CheckCircle,
  XCircle,
  Upload,
  Printer,
} from 'lucide-react';
import MediaUploadModal from '@/src/components/MediaUploadModal';
import InvoicePrintReceipt from '@/src/components/InvoicePrintReceipt';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import StatusTimeline from '@/src/components/ui/StatusTimeline';
import {
  getInvoiceById,
  payInvoice,
  changeInvoiceStatus,
  INVOICE_STATUS,
  type Invoice,
  type ChangeInvoiceStatusPayload,
} from '@/src/services/invoices';
import PaymentMethodsModal, {
  type PaymentEntry,
} from '@/src/components/PaymentMethodsModal';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import type { DropdownOption } from '@/src/types/dropdowns';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

// ── Status color mapping ─────────────────────────────────────
function normalizeStatus(statusName: string): string {
  return statusName.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isPendingStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('pending') ||
    normalized.includes('معلق') ||
    normalized.includes('قيد') ||
    normalized.includes('بانتظار') ||
    normalized.includes('انتظار')
  );
}

function isPendingInvoiceStatus(
  invoiceStatusId: number,
  invoiceStatusName: string,
  statuses?: DropdownOption[],
): boolean {
  const matchedStatus = statuses?.find(
    (status) => status.id === invoiceStatusId,
  );

  if (matchedStatus) {
    const candidateNames = [
      matchedStatus.name,
      matchedStatus.en_name,
      matchedStatus.ar_name,
      invoiceStatusName,
    ].filter((name): name is string => Boolean(name));

    return candidateNames.some((name) => isPendingStatus(name));
  }

  return isPendingStatus(invoiceStatusName);
}

function isVoidRequestedStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);

  return (
    normalized.includes('void requested') ||
    normalized.includes('void request') ||
    normalized.includes('request void') ||
    normalized.includes('requested for void') ||
    normalized.includes('طلب إلغاء') ||
    normalized.includes('طلب الغاء')
  );
}

function isVoidedStatus(statusName: string): boolean {
  if (isVoidRequestedStatus(statusName)) {
    return false;
  }

  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('cancel') ||
    normalized.includes('void') ||
    normalized.includes('ملغي')
  );
}

function isCollectedStatus(
  invoiceStatusId: number,
  invoiceStatusName: string,
  statuses?: DropdownOption[],
): boolean {
  if (
    invoiceStatusId === INVOICE_STATUS.REFUNDED ||
    invoiceStatusId === INVOICE_STATUS.PARTIALLY_REFUNDED
  ) {
    return true;
  }

  const candidateNames: string[] = [];
  const matchedStatus = statuses?.find((s) => s.id === invoiceStatusId);
  if (matchedStatus) {
    if (matchedStatus.en_name) candidateNames.push(matchedStatus.en_name);
    if (matchedStatus.ar_name) candidateNames.push(matchedStatus.ar_name);
    if (matchedStatus.name) candidateNames.push(matchedStatus.name);
  }
  candidateNames.push(invoiceStatusName);
  return candidateNames.some((name) => {
    const n = normalizeStatus(name);
    return (
      n.includes('collected') ||
      n.includes('paid') ||
      n.includes('مدفوع') ||
      n.includes('محصل')
    );
  });
}

function getStatusBg(statusName: string): string {
  const normalized = normalizeStatus(statusName);
  if (normalized.includes('paid') || normalized.includes('مدفوع'))
    return 'bg-emerald-50 text-emerald-700';
  if (isPendingStatus(statusName)) return 'bg-amber-50 text-amber-700';
  if (isVoidRequestedStatus(statusName)) return 'bg-orange-50 text-orange-700';
  if (isVoidedStatus(statusName)) return 'bg-red-50 text-red-700';
  if (normalized.includes('confirmed') || normalized.includes('مؤكد'))
    return 'bg-blue-50 text-blue-700';
  return 'bg-slate-50 text-slate-700';
}

// ── Info row component ───────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
  valueClassName,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3 py-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
        <Icon size={18} className="text-sky-600" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <span
          className={`text-sm font-medium text-slate-800 mt-0.5 ${valueClassName ?? ''}`}
        >
          {value || '—'}
        </span>
      </div>
    </div>
  );
}

// ── Invoice action config ────────────────────────────────────
type InvoiceActionKind =
  | 'void'
  | 'voidRequest'
  | 'rejectVoid'
  | 'acceptVoid'
  | 'refund'
  | 'refundRequest'
  | 'rejectRefund'
  | 'acceptRefund';

type ReasonField =
  | 'void_reason'
  | 'void_request_reason'
  | 'reject_reason'
  | 'refund_reason'
  | 'refund_request_reason';

interface InvoiceActionConfig {
  /** Target status id, or 'current' to keep the invoice's current status. */
  status: number | 'current';
  isReject?: number;
  reasonField?: ReasonField;
  requiresReason: boolean;
  titleKey: string;
  messageKey: string;
  placeholderKey?: string;
  confirmKey: string;
  successKey: string;
  variant: 'primary' | 'secondary' | 'danger' | 'success';
}

const INVOICE_ACTION_CONFIG: Record<InvoiceActionKind, InvoiceActionConfig> = {
  void: {
    status: INVOICE_STATUS.VOID,
    reasonField: 'void_reason',
    requiresReason: true,
    titleKey: 'voidInvoice',
    messageKey: 'voidConfirmMessage',
    placeholderKey: 'voidReasonPlaceholder',
    confirmKey: 'voidInvoice',
    successKey: 'voidSuccess',
    variant: 'danger',
  },
  voidRequest: {
    status: INVOICE_STATUS.VOID_REQUESTED,
    reasonField: 'void_request_reason',
    requiresReason: true,
    titleKey: 'voidRequest',
    messageKey: 'voidRequestConfirmMessage',
    placeholderKey: 'voidRequestReasonPlaceholder',
    confirmKey: 'voidRequest',
    successKey: 'voidRequestSuccess',
    variant: 'primary',
  },
  rejectVoid: {
    status: 'current',
    isReject: 1,
    reasonField: 'reject_reason',
    requiresReason: true,
    titleKey: 'rejectVoidRequest',
    messageKey: 'rejectVoidConfirmMessage',
    placeholderKey: 'rejectVoidReasonPlaceholder',
    confirmKey: 'rejectVoidRequest',
    successKey: 'rejectVoidSuccess',
    variant: 'danger',
  },
  acceptVoid: {
    status: 'current',
    isReject: 0,
    requiresReason: false,
    titleKey: 'acceptVoidRequest',
    messageKey: 'acceptVoidConfirmMessage',
    confirmKey: 'acceptVoidRequest',
    successKey: 'acceptVoidSuccess',
    variant: 'success',
  },
  refund: {
    status: INVOICE_STATUS.REFUNDED,
    reasonField: 'refund_reason',
    requiresReason: true,
    titleKey: 'refund',
    messageKey: 'refundConfirmMessage',
    placeholderKey: 'refundReasonPlaceholder',
    confirmKey: 'refund',
    successKey: 'refundSuccess',
    variant: 'danger',
  },
  refundRequest: {
    status: INVOICE_STATUS.REFUND_REQUESTED,
    reasonField: 'refund_request_reason',
    requiresReason: true,
    titleKey: 'refundRequest',
    messageKey: 'refundRequestConfirmMessage',
    placeholderKey: 'refundRequestReasonPlaceholder',
    confirmKey: 'refundRequest',
    successKey: 'refundRequestSuccess',
    variant: 'primary',
  },
  rejectRefund: {
    status: 'current',
    isReject: 1,
    reasonField: 'reject_reason',
    requiresReason: true,
    titleKey: 'rejectRefundRequest',
    messageKey: 'rejectRefundConfirmMessage',
    placeholderKey: 'rejectRefundReasonPlaceholder',
    confirmKey: 'rejectRefundRequest',
    successKey: 'rejectRefundSuccess',
    variant: 'danger',
  },
  acceptRefund: {
    status: 'current',
    isReject: 0,
    requiresReason: false,
    titleKey: 'acceptRefundRequest',
    messageKey: 'acceptRefundConfirmMessage',
    confirmKey: 'acceptRefundRequest',
    successKey: 'acceptRefundSuccess',
    variant: 'success',
  },
};

// ── Main page ────────────────────────────────────────────────
export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('invoices.detail');
  const tForm = useTranslations('form');
  const invoiceId = params.id as string;

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [isCollecting, setIsCollecting] = useState(false);
  const [actionKind, setActionKind] = useState<InvoiceActionKind | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const tUpload = useTranslations('upload');

  const { data: dropdowns } = useDropdowns();
  const msg = useResponseMessage();
  const invoicePrivileges = useRoutePrivileges('/invoices/search');
  const canVoidInvoice = invoicePrivileges.hasPrivilege(PRIVILEGE_IDS.VOID);
  const canRequestVoid = invoicePrivileges.hasPrivilege(
    PRIVILEGE_IDS.VOID_REQUEST,
  );
  const canRejectVoidRequest = invoicePrivileges.hasPrivilege(
    PRIVILEGE_IDS.VOID_REJECT_REQUEST,
  );
  const canAcceptVoidRequest = invoicePrivileges.hasPrivilege(
    PRIVILEGE_IDS.ACCEPT_VOID_REQUEST,
  );
  const canRefund = invoicePrivileges.hasPrivilege(PRIVILEGE_IDS.REFUND);
  const canRequestRefund = invoicePrivileges.hasPrivilege(
    PRIVILEGE_IDS.REFUND_REQUEST,
  );
  const canAcceptRefundRequest = invoicePrivileges.hasPrivilege(
    PRIVILEGE_IDS.ACCEPT_REFUND_REQUEST,
  );
  const canRejectRefundRequest = invoicePrivileges.hasPrivilege(
    PRIVILEGE_IDS.REJECT_REFUND_REQUEST,
  );

  const handlePrint = useCallback(() => {
    if (!invoice) return;
    setPrintInvoice(invoice);
    setTimeout(() => {
      window.print();
      setPrintInvoice(null);
    }, 100);
  }, [invoice]);

  useEffect(() => {
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      if (!invoiceId) {
        setIsLoading(false);
        setError(t('notFound'));
        return;
      }


      setIsLoading(true);
      setError('');
      setInvoice(null);

      (async () => {
        try {
          const data = await getInvoiceById(invoiceId, controller.signal);
          if (controller.signal.aborted) return;

          if (!data) {
            setError(t('notFound'));
          } else {
            setInvoice(data);
          }
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
  }, [invoiceId, t]);

  // ── Loading state ──────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-100">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500">{tForm('loading')}</span>
        </div>
      </div>
    );
  }

  // ── Error / not found ──────────────────────────────────────
  if (error || !invoice) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <FileText size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {t('notFound')}
        </h2>
        <p className="text-sm text-slate-500">{t('notFoundMessage')}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          {t('back')}
        </Button>
      </div>
    );
  }

  const servicesTotal =
    invoice.services?.reduce((sum, svc) => sum + svc.total_price, 0) ?? 0;
  const runnerCashierAmount = Number(invoice.runner_cashier_price || 0);

  const isPending = isPendingInvoiceStatus(
    invoice.invoice_status_id,
    invoice.invoice_status_name,
    dropdowns?.invoice_statuses,
  );
  const isVoidRequested = isVoidRequestedStatus(invoice.invoice_status_name);
  const isVoided = isVoidedStatus(invoice.invoice_status_name);
  const isVoidRequestDisabled = Number(invoice.has_void_request) === 1;
  const isVoidDisabled = Number(invoice.has_void) === 1;
  const canPrint = isCollectedStatus(
    invoice.invoice_status_id,
    invoice.invoice_status_name,
    dropdowns?.invoice_statuses,
  );

  const statusId = invoice.invoice_status_id;
  const isCollected =
    statusId === INVOICE_STATUS.COLLECTED ||
    statusId === INVOICE_STATUS.PARTIALLY_COLLECTED;
  const isRefundRequested = statusId === INVOICE_STATUS.REFUND_REQUESTED;
  const hasRefundActivity = Boolean(
    invoice.refund_reason ||
      invoice.refund_by ||
      invoice.refund_request_reason,
  );

  const handleCollect = async (entries: PaymentEntry[]) => {
    setIsCollecting(true);
    try {
      await payInvoice({
        invoice_number: invoice.invoice_number,
        project_id: invoice.project_id,
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
      msg.success('collectSuccess');
      setPaymentModalOpen(false);
      // Re-fetch invoice to reflect updated state
      const updated = await getInvoiceById(invoiceId);
      if (updated) setInvoice(updated);
    } catch (err) {
      msg.error(err);
    } finally {
      setIsCollecting(false);
    }
  };

  const openAction = (kind: InvoiceActionKind) => {
    setActionKind(kind);
    setActionReason('');
  };

  const closeAction = () => {
    if (isSubmittingAction) return;
    setActionKind(null);
    setActionReason('');
  };

  const handleActionSubmit = async () => {
    if (!actionKind) return;
    const config = INVOICE_ACTION_CONFIG[actionKind];
    const trimmedReason = actionReason.trim();

    if (config.requiresReason && !trimmedReason) {
      msg.error(new Error(t('voidReasonRequired')));
      return;
    }

    setIsSubmittingAction(true);
    try {
      const payload: ChangeInvoiceStatusPayload = {
        status_id:
          config.status === 'current'
            ? invoice.invoice_status_id
            : config.status,
      };
      if (config.isReject !== undefined) {
        payload.is_reject = config.isReject;
      }
      if (config.reasonField && trimmedReason) {
        payload[config.reasonField] = trimmedReason;
      }

      await changeInvoiceStatus(invoice.invoice_number, payload);
      msg.success(config.successKey);
      setActionKind(null);
      setActionReason('');
      const updated = await getInvoiceById(invoiceId);
      if (updated) setInvoice(updated);
    } catch (err) {
      msg.error(err);
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const activeAction = actionKind ? INVOICE_ACTION_CONFIG[actionKind] : null;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600 hidden rtl:block" />
            <ArrowLeft size={20} className="text-slate-600 block rtl:hidden" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {t('title')} #{invoice.invoice_number}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${getStatusBg(invoice.invoice_status_name)}`}
            >
              {invoice.invoice_status_name}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canRejectVoidRequest && isVoidRequested && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openAction('rejectVoid')}
            >
              {t('rejectVoidRequest')}
            </Button>
          )}
          {canAcceptVoidRequest && isVoidRequested && (
            <Button
              variant="success"
              size="sm"
              onClick={() => openAction('acceptVoid')}
            >
              {t('acceptVoidRequest')}
            </Button>
          )}
          {canRequestVoid && !isVoided && !isVoidRequested && (
            <Button
              variant="primary"
              size="sm"
              disabled={isVoidRequestDisabled}
              onClick={() => openAction('voidRequest')}
            >
              {t('voidRequest')}
            </Button>
          )}
          {canVoidInvoice && !isVoided && !isVoidRequested && (
            <Button
              variant="danger"
              size="sm"
              disabled={isVoidDisabled}
              onClick={() => openAction('void')}
            >
              {t('voidInvoice')}
            </Button>
          )}
          {canRequestRefund && isCollected && !hasRefundActivity && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => openAction('refundRequest')}
            >
              {t('refundRequest')}
            </Button>
          )}
          {canRefund && isCollected && !hasRefundActivity && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => openAction('refund')}
            >
              {t('refund')}
            </Button>
          )}
          {canRejectRefundRequest && isRefundRequested && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => openAction('rejectRefund')}
            >
              {t('rejectRefundRequest')}
            </Button>
          )}
          {canAcceptRefundRequest && isRefundRequested && (
            <Button
              variant="success"
              size="sm"
              onClick={() => openAction('acceptRefund')}
            >
              {t('acceptRefundRequest')}
            </Button>
          )}
          {invoice.customer_id ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} className="mr-1.5" />
              {tUpload('uploadDocument')}
            </Button>
          ) : null}
          <button
            onClick={handlePrint}
            disabled={!canPrint}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              canPrint
                ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:scale-105'
                : 'bg-slate-50 border border-slate-100 text-slate-300 cursor-not-allowed'
            }`}
            title={t('print')}
          >
            <Printer size={16} />
          </button>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────── */}
      <div className="flex flex-col gap-6">
        {/* Invoice details card */}
        <MainBox>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {t('title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-1">
            <InfoRow
              icon={Hash}
              label={t('invoiceNumber')}
              value={invoice.invoice_number}
            />
            <InfoRow
              icon={FileText}
              label={t('status')}
              value={
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBg(invoice.invoice_status_name)}`}
                >
                  {invoice.invoice_status_name}
                </span>
              }
            />
            <InfoRow
              icon={FileText}
              label={t('invoiceType')}
              value={invoice.invoice_type_name}
            />
            <InfoRow
              icon={User}
              label={t('customer')}
              value={invoice.customer_name}
            />
            <InfoRow
              icon={FileText}
              label={t('customerMobile')}
              value={invoice.customer_mobile}
            />
            <InfoRow
              icon={Hash}
              label={t('unit')}
              value={invoice.unit_number}
            />
            <InfoRow
              icon={CreditCard}
              label={t('totalAmount')}
              value={invoice.total_amount}
            />
            <InfoRow
              icon={User}
              label={t('cashier')}
              value={invoice.invoice_created_by}
            />
            <InfoRow
              icon={Calendar}
              label={t('creationDate')}
              value={
                invoice.invoice_date
                  ? new Date(invoice.invoice_date).toLocaleDateString()
                  : null
              }
            />
            <InfoRow
              icon={Hash}
              label={t('ticketId')}
              value={invoice.ticket_id ? String(invoice.ticket_id) : null}
            />
            <InfoRow
              icon={User}
              label={t('voidRequestedBy')}
              value={invoice.void_requested_by}
            />
            <InfoRow icon={User} label={t('voidBy')} value={invoice.void_by} />
            <InfoRow
              icon={User}
              label={t('refundBy')}
              value={invoice.refund_by}
            />
            <InfoRow
              icon={CheckCircle}
              label={t('eod')}
              value={
                invoice.is_end_of_day ? (
                  <CheckCircle size={18} className="text-green-600" />
                ) : (
                  <XCircle size={18} className="text-gray-400" />
                )
              }
            />
            <InfoRow
              icon={CheckCircle}
              label={t('fullEod')}
              value={
                invoice.is_full_end_of_day ? (
                  <CheckCircle size={18} className="text-green-600" />
                ) : (
                  <XCircle size={18} className="text-gray-400" />
                )
              }
            />
            {invoice.end_of_day_date && (
              <InfoRow
                icon={Calendar}
                label={t('eodDate')}
                value={new Date(invoice.end_of_day_date).toLocaleDateString()}
              />
            )}
            {invoice.full_end_of_day_date && (
              <InfoRow
                icon={Calendar}
                label={t('fullEodDate')}
                value={new Date(
                  invoice.full_end_of_day_date,
                ).toLocaleDateString()}
              />
            )}
            <InfoRow
              icon={CheckCircle}
              label={t('runnerCashier')}
              value={
                invoice.has_runner_cashier ? (
                  <CheckCircle size={18} className="text-green-600" />
                ) : (
                  <XCircle size={18} className="text-gray-400" />
                )
              }
            />
            <InfoRow
              icon={CreditCard}
              label={t('runnerCashierAmount')}
              value={runnerCashierAmount.toFixed(2)}
            />
          </div>

          <div className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 overflow-hidden">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                  <FileText size={18} className="text-sky-600" />
                </div>
                <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start gap-x-4 gap-y-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide sm:w-32 sm:shrink-0">
                    {t('notes')}
                  </div>
                  <div className="min-w-0 max-w-full text-sm font-medium text-slate-800 whitespace-pre-wrap break-all">
                    {invoice.notes || '—'}
                  </div>
                </div>
              </div>
            </div>

            {invoice.void_request_reason && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-sky-200 flex items-center justify-center">
                    <FileText size={18} className="text-sky-600" />
                  </div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start gap-x-4 gap-y-1">
                    <div className="text-xs font-semibold text-sky-600 uppercase tracking-wide sm:w-32 sm:shrink-0">
                      {t('voidRequestReason')}
                    </div>
                    <div className="min-w-0 max-w-full text-sm font-medium text-sky-800 whitespace-pre-wrap break-all">
                      {invoice.void_request_reason}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invoice.void_reason && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-red-200 flex items-center justify-center">
                    <FileText size={18} className="text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start gap-x-4 gap-y-1">
                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wide sm:w-32 sm:shrink-0">
                      {t('voidReason')}
                    </div>
                    <div className="min-w-0 max-w-full text-sm font-medium text-red-800 whitespace-pre-wrap break-all">
                      {invoice.void_reason}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invoice.reject_void_request_reason && (
              <div className="rounded-xl border border-orange-200 bg-orange-50/70 p-4 overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-orange-200 flex items-center justify-center">
                    <FileText size={18} className="text-orange-600" />
                  </div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start gap-x-4 gap-y-1">
                    <div className="text-xs font-semibold text-orange-600 uppercase tracking-wide sm:w-32 sm:shrink-0">
                      {t('rejectVoidRequestReason')}
                    </div>
                    <div className="min-w-0 max-w-full text-sm font-medium text-orange-800 whitespace-pre-wrap break-all">
                      {invoice.reject_void_request_reason}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invoice.refund_request_reason && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-4 overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-sky-200 flex items-center justify-center">
                    <FileText size={18} className="text-sky-600" />
                  </div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start gap-x-4 gap-y-1">
                    <div className="text-xs font-semibold text-sky-600 uppercase tracking-wide sm:w-32 sm:shrink-0">
                      {t('refundRequestReason')}
                    </div>
                    <div className="min-w-0 max-w-full text-sm font-medium text-sky-800 whitespace-pre-wrap break-all">
                      {invoice.refund_request_reason}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {invoice.refund_reason && (
              <div className="rounded-xl border border-red-200 bg-red-50/70 p-4 overflow-hidden">
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-white border border-red-200 flex items-center justify-center">
                    <FileText size={18} className="text-red-600" />
                  </div>
                  <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-start gap-x-4 gap-y-1">
                    <div className="text-xs font-semibold text-red-600 uppercase tracking-wide sm:w-32 sm:shrink-0">
                      {t('refundReason')}
                    </div>
                    <div className="min-w-0 max-w-full text-sm font-medium text-red-800 whitespace-pre-wrap break-all">
                      {invoice.refund_reason}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </MainBox>

        <StatusTimeline logs={invoice.logs ?? []} title={t('timeline')} />

        {/* Services table */}
        {invoice.services && invoice.services.length > 0 && (
          <MainBox>
            <div className="flex items-center gap-2 mb-4">
              <Package size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {t('services')}
              </h2>
            </div>

            <div className="overflow-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      {t('serviceName')}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center">
                      {t('quantity')}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center">
                      {t('price')}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center">
                      {t('totalPrice')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.services.map((svc) => (
                    <tr key={svc.service_id} className="border-t">
                      <td className="px-4 py-3 text-slate-700">
                        {svc.service_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center">
                        {svc.quantity}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center">
                        {svc.price}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center font-medium">
                        {svc.total_price}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-slate-50">
                    <td
                      colSpan={3}
                      className="px-4 py-3 text-sm font-semibold text-slate-700 text-right"
                    >
                      {t('servicesTotal')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-sky-700 text-center">
                      {servicesTotal}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </MainBox>
        )}

        {/* Payment Methods table */}
        <MainBox>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {t('paymentMethods')}
              </h2>
            </div>
            {isPending && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => setPaymentModalOpen(true)}
              >
                {t('addPaymentMethod')}
              </Button>
            )}
          </div>

          {invoice.invoice_transactions &&
          invoice.invoice_transactions.length > 0 ? (
            <div className="overflow-auto rounded-xl border border-slate-100">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">
                      {t('paymentType')}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center">
                      {t('paymentAmount')}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center">
                      {t('referenceNumber')}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center">
                      {t('cardNumber')}
                    </th>
                    <th className="px-4 py-3 font-semibold text-center">
                      {t('transactionDate')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {invoice.invoice_transactions.map((txn) => (
                    <tr key={txn.id} className="border-t">
                      <td className="px-4 py-3 text-slate-700">
                        {txn.payment_type_name}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center">
                        {txn.total_amount}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center">
                        {txn.reference_number || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center">
                        {txn.bank_reference?.card_no || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 text-center">
                        {txn.transaction_date
                          ? new Date(txn.transaction_date).toLocaleDateString()
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-slate-50">
                    <td className="px-4 py-3 text-sm font-semibold text-slate-700 text-right">
                      {t('paymentsTotal')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-sky-700 text-center">
                      {invoice.invoice_transactions.reduce(
                        (sum, txn) => sum + Number(txn.total_amount),
                        0,
                      )}
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-400 text-center py-6">
              {t('noPaymentMethods')}
            </p>
          )}
        </MainBox>
      </div>

      {/* Payment Methods Modal */}
      <PaymentMethodsModal
        open={paymentModalOpen}
        totalAmount={parseFloat(invoice.total_amount) || 0}
        runnerCashierAmount={runnerCashierAmount}
        paymentTypes={dropdowns?.payment_types ?? []}
        sisterCompanies={dropdowns?.sister_companies ?? []}
        onCollect={handleCollect}
        onCancel={() => setPaymentModalOpen(false)}
        isCollecting={isCollecting}
      />

      {/* Invoice Action Modal */}
      {actionKind && activeAction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeAction();
          }}
        >
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={closeAction}
              disabled={isSubmittingAction}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              aria-label="Close"
            >
              <XCircle size={18} />
            </button>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t(activeAction.titleKey)}
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              {t(activeAction.messageKey)}
            </p>
            {activeAction.requiresReason && (
              <textarea
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400/20 focus:border-red-400 mb-4 resize-none"
                rows={3}
                placeholder={
                  activeAction.placeholderKey
                    ? t(activeAction.placeholderKey)
                    : undefined
                }
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                disabled={isSubmittingAction}
              />
            )}
            <div className="flex gap-3 justify-end">
              <Button
                variant="secondary"
                size="md"
                onClick={closeAction}
                disabled={isSubmittingAction}
              >
                {tForm('cancel')}
              </Button>
              <Button
                variant={activeAction.variant}
                size="md"
                isLoading={isSubmittingAction}
                disabled={
                  activeAction.requiresReason && !actionReason.trim()
                }
                onClick={handleActionSubmit}
              >
                {t(activeAction.confirmKey)}
              </Button>
            </div>
          </div>
        </div>
      )}

      <MediaUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => setShowUploadModal(false)}
        context={{
          invoice_id: invoice.id,
          unit_number: invoice.unit_number,
          customer_name: invoice.customer_name,
          customer_id: invoice.customer_id ?? 0,
          customer_code: invoice.customer_code || undefined,
        }}
      />

      {printInvoice &&
        createPortal(
          <div className="print-area">
            <InvoicePrintReceipt invoice={printInvoice} />
          </div>,
          document.body,
        )}
    </div>
  );
}
