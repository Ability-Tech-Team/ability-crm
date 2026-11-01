'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  User,
  Building2,
  Clock,
  Timer,
  Download,
  Eye,
  FileText,
  MessageSquare,
  Package,
  Hash,
  Upload,
  Printer,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import MediaUploadModal from '@/src/components/MediaUploadModal';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import FilePreviewDialog from '@/src/components/ui/FilePreviewDialog';
import TicketPrintReceipt from '@/src/components/TicketPrintReceipt';
import TicketCommentComposer from '@/src/components/TicketCommentComposer';
import StatusTimeline from '@/src/components/ui/StatusTimeline';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  changeTicketStatus,
  getTicketById,
  addTicketComment,
  type Ticket,
  type TicketInvoice,
} from '@/src/services/tickets';
import { getUnitMedia, type MediaItem } from '@/src/services/documentLibrary';
import { downloadFile } from '@/src/lib/downloadFile';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import type { SystemConfigOption } from '@/src/types/dropdowns';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

// ── Status color mapping ─────────────────────────────────────
function normalizeStatus(statusName: string): string {
  return statusName.toLowerCase().replace(/\s+/g, ' ').trim();
}

function isCreatedStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('created') ||
    normalized.includes('new') ||
    normalized.includes('انشاء') ||
    normalized.includes('تم الإنشاء')
  );
}

function isPaidStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('paid') ||
    normalized.includes('payment') ||
    normalized.includes('دفع') ||
    normalized.includes('مدفوع')
  );
}

function isInvoicePaid(invoice?: TicketInvoice): boolean {
  if (!invoice || invoice.is_pending || invoice.is_voided) {
    return false;
  }

  const normalized = normalizeStatus(invoice.invoice_status_name);
  return (
    normalized.includes('paid') ||
    normalized.includes('collected') ||
    normalized.includes('settled') ||
    normalized.includes('مدفوع') ||
    normalized.includes('محصل')
  );
}

function isConfirmedStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('confirmed') ||
    normalized.includes('confirm') ||
    normalized.includes('مؤكد') ||
    normalized.includes('تأكيد')
  );
}

function isInProgressStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('inprogress') ||
    normalized.includes('in progress') ||
    normalized.includes('processing') ||
    normalized.includes('pending') ||
    normalized.includes('قيد التنفيذ') ||
    normalized.includes('قيد المعالجة')
  );
}

function isCompletedStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('completed') ||
    normalized.includes('done') ||
    normalized.includes('closed') ||
    normalized.includes('مكتمل') ||
    normalized.includes('منجز') ||
    normalized.includes('تم')
  );
}

function isCanceledOrRejectedStatus(statusName: string): boolean {
  const normalized = normalizeStatus(statusName);
  return (
    normalized.includes('cancel') ||
    normalized.includes('rejected') ||
    normalized.includes('رفض') ||
    normalized.includes('مرفوض') ||
    normalized.includes('ملغي') ||
    normalized.includes('إلغاء')
  );
}

function getStatusBg(statusName: string): string {
  if (isCreatedStatus(statusName)) return 'bg-sky-50 text-sky-700';
  if (isPaidStatus(statusName)) return 'bg-emerald-50 text-emerald-700';
  if (isConfirmedStatus(statusName)) return 'bg-blue-50 text-blue-700';
  if (isInProgressStatus(statusName)) return 'bg-amber-50 text-amber-700';
  if (isCompletedStatus(statusName)) return 'bg-green-50 text-green-700';
  if (isCanceledOrRejectedStatus(statusName)) return 'bg-red-50 text-red-700';
  return 'bg-slate-50 text-slate-700';
}

function getStatusButtonClass(statusName: string): string {
  if (isCreatedStatus(statusName)) {
    return '!border-sky-200 !bg-sky-50 !text-sky-700 hover:!bg-sky-100';
  }
  if (isPaidStatus(statusName)) {
    return '!border-emerald-200 !bg-emerald-50 !text-emerald-700 hover:!bg-emerald-100';
  }
  if (isConfirmedStatus(statusName)) {
    return '!border-blue-200 !bg-blue-50 !text-blue-700 hover:!bg-blue-100';
  }
  if (isInProgressStatus(statusName)) {
    return '!border-amber-200 !bg-amber-50 !text-amber-700 hover:!bg-amber-100';
  }
  if (isCompletedStatus(statusName)) {
    return '!border-green-200 !bg-green-50 !text-green-700 hover:!bg-green-100';
  }
  if (isCanceledOrRejectedStatus(statusName)) {
    return '!border-red-200 !bg-red-50 !text-red-700 hover:!bg-red-100';
  }
  return '!border-slate-200 !bg-slate-50 !text-slate-700 hover:!bg-slate-100';
}

function isRunnerCashierConfigName(configName: string): boolean {
  const normalized = normalizeStatus(configName);
  return (
    (normalized.includes('runner') && normalized.includes('cashier')) ||
    (normalized.includes('كاشير') && normalized.includes('متنقل')) ||
    (normalized.includes('كاشير') && normalized.includes('runner'))
  );
}

// ── Info row component ───────────────────────────────────────
function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
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
        <span className="text-sm font-medium text-slate-800 mt-0.5 wrap-break-word">
          {value || '—'}
        </span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('tickets.detail');
  const tForm = useTranslations('form');
  const ticketId = Number(params.id);

  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const tUpload = useTranslations('upload');
  const tDocLib = useTranslations('documentLibrary');
  const ticketPrivileges = useRoutePrivileges('/tickets/search');
  const documentLibraryPrivileges = useRoutePrivileges('/document-library');
  const canChangeTicketStatus = ticketPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EDIT,
  );
  const canReadTicket = ticketPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canUploadDocuments = documentLibraryPrivileges.hasPrivilege(
    PRIVILEGE_IDS.ADD,
  );
  const canReadDocuments = documentLibraryPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExportDocuments = documentLibraryPrivileges.hasPrivilege(
    PRIVILEGE_IDS.EXPORT,
  );

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);
  const [changingStatusId, setChangingStatusId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [pendingRejectStatusId, setPendingRejectStatusId] = useState<
    number | null
  >(null);
  const [printTicket, setPrintTicket] = useState<Ticket | null>(null);

  // Documents state
  const [showDocuments, setShowDocuments] = useState(false);
  const [documents, setDocuments] = useState<MediaItem[]>([]);
  const [documentsTotalCount, setDocumentsTotalCount] = useState(0);
  const [documentsCurrentPage, setDocumentsCurrentPage] = useState(1);
  const [documentsPageSize, setDocumentsPageSize] = useState(10);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);
  const documentsAbortRef = useRef<AbortController | null>(null);

  const handlePrint = useCallback(() => {
    if (!ticket) return;
    setPrintTicket(ticket);
    setTimeout(() => {
      window.print();
      setPrintTicket(null);
    }, 100);
  }, [ticket]);

  const loadTicket = useCallback(
    async (signal?: AbortSignal) => {
      if (!ticketId || isNaN(ticketId)) {
        setTicket(null);
        setIsLoading(false);
        setError(t('notFound'));
        return;
      }

      setIsLoading(true);
      setError('');

      try {
        const data = await getTicketById(ticketId, signal);
        if (signal?.aborted) return;

        if (!data) {
          setTicket(null);
          setError(t('notFound'));
        } else {
          setTicket(data);
        }
      } catch (err: unknown) {
        if (
          !signal?.aborted &&
          (err as { name?: string }).name !== 'CanceledError'
        ) {
          setTicket(null);
          setError(t('notFoundMessage'));
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [ticketId, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      setTicket(null);
      void loadTicket(controller.signal);
    });

    return () => {
      cancel();
      controller.abort();
    };
  }, [loadTicket]);

  const activeStatuses = useMemo(() => {
    const seen = new Set<number>();

    return (dropdowns?.ticket_statuses ?? []).filter((status) => {
      if (status.is_active === 0) return false;
      if (seen.has(status.id)) return false;
      seen.add(status.id);
      return true;
    });
  }, [dropdowns]);

  const paidStatusId = useMemo(() => {
    return activeStatuses.find((s) => isPaidStatus(s.name))?.id ?? null;
  }, [activeStatuses]);

  const runnerCashierAmount = useMemo(() => {
    const systemConfigs =
      (dropdowns?.system_config as SystemConfigOption[] | undefined) ?? [];

    const runnerCashierConfig = systemConfigs.find((config) =>
      isRunnerCashierConfigName(config.name),
    );

    if (runnerCashierConfig?.config_value) {
      return runnerCashierConfig.config_value;
    }

    return ticket?.runner_cashier_price ?? null;
  }, [dropdowns, ticket?.runner_cashier_price]);

  const isFirstInvoicePaid = useMemo(() => {
    if (!ticket) return false;
    return isInvoicePaid(ticket.invoices[0]);
  }, [ticket]);

  const handleChangeStatus = useCallback(
    async (statusId: number, reject_reason?: string) => {
      const targetStatus = activeStatuses.find(
        (status) => status.id === statusId,
      );
      const isRejectStatus = targetStatus
        ? isCanceledOrRejectedStatus(targetStatus.name)
        : false;
      const isPaidTargetStatus = targetStatus
        ? isPaidStatus(targetStatus.name)
        : false;
      const isPaidTransitionBlocked = isPaidTargetStatus && !isFirstInvoicePaid;
      const isPostPaidBlocked =
        !isRejectStatus &&
        paidStatusId !== null &&
        statusId > paidStatusId &&
        (ticket?.last_status_id ?? -1) < paidStatusId;

      if (
        !ticket ||
        isChangingStatus ||
        isPaidTransitionBlocked ||
        isPostPaidBlocked ||
        (!isRejectStatus && statusId <= ticket.last_status_id)
      ) {
        return;
      }

      // If reject/cancel, require a reason via modal
      if (isRejectStatus && reject_reason === undefined) {
        setPendingRejectStatusId(statusId);
        setShowRejectModal(true);
        return;
      }

      setIsChangingStatus(true);
      setChangingStatusId(statusId);

      try {
        await changeTicketStatus(ticket.ticket_id, {
          status_id: statusId,
          ...(reject_reason ? { reject_reason } : {}),
        });
        showSuccess('statusChangeSuccess');
        await loadTicket();
      } catch (err) {
        showError(err);
      } finally {
        setIsChangingStatus(false);
        setChangingStatusId(null);
      }
    },
    [
      ticket,
      activeStatuses,
      paidStatusId,
      isFirstInvoicePaid,
      isChangingStatus,
      loadTicket,
      showError,
      showSuccess,
    ],
  );

  const handleRejectModalSave = useCallback(
    async (values: Record<string, string>) => {
      if (pendingRejectStatusId === null) return;
      const statusId = pendingRejectStatusId;
      setShowRejectModal(false);
      setPendingRejectStatusId(null);
      await handleChangeStatus(statusId, values.reason);
    },
    [handleChangeStatus, pendingRejectStatusId],
  );

  const handleRejectModalCancel = useCallback(() => {
    setShowRejectModal(false);
    setPendingRejectStatusId(null);
  }, []);

  // ── Fetch documents ───────────────────────────────────────
  const fetchDocuments = useCallback(
    async (page: number, limit: number) => {
      if (!ticket) return;
      documentsAbortRef.current?.abort();
      const controller = new AbortController();
      documentsAbortRef.current = controller;

      setDocumentsLoading(true);
      try {
        const data = await getUnitMedia(
          {
            ticket_id: String(ticket.ticket_id),
            page,
            limit,
          },
          controller.signal,
        );
        setDocuments(data.media);
        setDocumentsTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setDocuments([]);
          setDocumentsTotalCount(0);
        }
      } finally {
        if (documentsAbortRef.current === controller) {
          setDocumentsLoading(false);
        }
      }
    },
    [ticket],
  );

  const handleShowDocuments = () => {
    if (!showDocuments) {
      setShowDocuments(true);
      setDocumentsCurrentPage(1);
      void fetchDocuments(1, documentsPageSize);
    } else {
      setShowDocuments(false);
    }
  };

  const handleDocumentsPageChange = async (page: number) => {
    if (page === documentsCurrentPage) return;
    setDocumentsCurrentPage(page);
    await fetchDocuments(page, documentsPageSize);
  };

  const handleDocumentsPageSizeChange = async (size: number) => {
    setDocumentsPageSize(size);
    setDocumentsCurrentPage(1);
    await fetchDocuments(1, size);
  };

  const documentsExportParams = useMemo(
    () => ({
      ticket_id: ticket ? String(ticket.ticket_id) : undefined,
    }),
    [ticket],
  );

  const handleDownload = useCallback((item: MediaItem) => {
    downloadFile(item.file_path, item.file_name);
  }, []);

  const handleAddComment = useCallback(async () => {
    if (!ticket || isAddingComment) {
      return;
    }

    const trimmedComment = commentText.trim();
    if (!trimmedComment) {
      showError(new Error(t('commentRequired')));
      return;
    }

    setIsAddingComment(true);
    try {
      await addTicketComment(ticket.ticket_id, {
        comment: trimmedComment,
      });
      showSuccess('commentAddedSuccess');
      setCommentText('');
      await loadTicket();
    } catch (err) {
      showError(err);
    } finally {
      setIsAddingComment(false);
    }
  }, [
    commentText,
    isAddingComment,
    loadTicket,
    showError,
    showSuccess,
    t,
    ticket,
  ]);

  // ── Loading state ──────────────────────────────────────────
  if (isLoading && !ticket) {
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
  if (error || !ticket) {
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

  // ── Document columns ──────────────────────────────────────
  const documentColumns: ColumnDef<MediaItem>[] = [
    {
      id: 'download',
      label: tDocLib('columns.download'),
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDownload(row);
          }}
          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
          title={tDocLib('downloadDocument')}
        >
          <Download size={18} />
        </button>
      ),
    },
    {
      id: 'view',
      label: tDocLib('columns.view'),
      cell: (row) => (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setPreviewItem(row);
          }}
          className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
          title={tDocLib('viewDocument')}
        >
          <Eye size={18} />
        </button>
      ),
    },
    {
      id: 'id',
      label: tDocLib('columns.id'),
      accessorKey: 'id',
      alwaysVisible: true,
    },
    {
      id: 'unit_number',
      label: tDocLib('columns.unitNumber'),
      accessorKey: 'unit_number',
      alwaysVisible: true,
    },
    {
      id: 'media_type_name',
      label: tDocLib('columns.mediaType'),
      accessorKey: 'media_type_name',
    },
    {
      id: 'file_name',
      label: tDocLib('columns.fileName'),
      accessorKey: 'file_name',
    },
    {
      id: 'description',
      label: tDocLib('columns.description'),
      cell: (row) => row.description ?? '—',
    },
    {
      id: 'created_by',
      label: tDocLib('columns.createdBy'),
      cell: (row) => row.created_by ?? '—',
    },
    {
      id: 'created_at',
      label: tDocLib('columns.createdAt'),
      cell: (row) =>
        row.created_at ? new Date(row.created_at).toLocaleDateString() : '—',
    },
    {
      id: 'updated_at',
      label: tDocLib('columns.updatedAt'),
      cell: (row) =>
        row.updated_at ? new Date(row.updated_at).toLocaleDateString() : '—',
    },
  ];

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
              {t('title')} #{ticket.ticket_id}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${getStatusBg(ticket.last_status_name)}`}
            >
              {ticket.last_status_name}
            </span>
          </div>
        </div>

        {(canUploadDocuments ||
          canReadTicket ||
          (canChangeTicketStatus && activeStatuses.length > 0)) && (
          <div className="flex flex-col gap-2 items-stretch sm:items-end">
            {canChangeTicketStatus && activeStatuses.length > 0 && (
              <div className="flex flex-wrap gap-2 justify-start sm:justify-end">
                {activeStatuses.map((status) => {
                  const isRejectStatus = isCanceledOrRejectedStatus(
                    status.name,
                  );
                  const isPaidTransitionBlocked =
                    isPaidStatus(status.name) && !isFirstInvoicePaid;
                  const isAfterPaidStatus =
                    paidStatusId !== null && status.id > paidStatusId;
                  const isPostPaidBlocked =
                    isAfterPaidStatus &&
                    (paidStatusId === null ||
                      ticket.last_status_id < paidStatusId);
                  const isAllowedStatus =
                    isRejectStatus ||
                    (status.id > ticket.last_status_id &&
                      !isPaidTransitionBlocked &&
                      !isPostPaidBlocked);

                  return (
                    <Button
                      key={status.id}
                      variant="secondary"
                      size="sm"
                      className={`whitespace-nowrap ${getStatusButtonClass(status.name)} ${!isAllowedStatus ? 'opacity-60' : ''}`}
                      disabled={isChangingStatus || !isAllowedStatus}
                      isLoading={
                        isChangingStatus && changingStatusId === status.id
                      }
                      onClick={() => {
                        if (!isAllowedStatus) return;
                        void handleChangeStatus(status.id);
                      }}
                    >
                      {status.name}
                    </Button>
                  );
                })}
              </div>
            )}

            {canUploadDocuments && ticket.customer_id ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowUploadModal(true)}
              >
                <Upload size={16} className="mr-1.5" />
                {tUpload('uploadDocument')}
              </Button>
            ) : null}

            {canReadDocuments && (
              <Button
                variant={showDocuments ? 'primary' : 'secondary'}
                size="sm"
                onClick={handleShowDocuments}
              >
                <FileText size={16} className="mr-1.5" />
                {t('showDocuments')}
              </Button>
            )}

            {canReadTicket && (
              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:scale-105 self-start sm:self-end"
                title={t('printTicket')}
              >
                <Printer size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left column: Ticket info ────────────────────────── */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Ticket details card */}
          <MainBox>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">
              {t('title')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 divide-y sm:divide-y-0">
              <InfoRow
                icon={User}
                label={t('customerName')}
                value={ticket.customer_name}
              />
              <InfoRow
                icon={User}
                label={t('requesterName')}
                value={ticket.requester_name}
              />
              <InfoRow
                icon={User}
                label={t('requesterMobile')}
                value={ticket.requester_mobile}
              />
              <InfoRow
                icon={Hash}
                label={t('unitNumber')}
                value={ticket.unit_number}
              />
              <InfoRow
                icon={FileText}
                label={t('invoiceNumber')}
                value={ticket.invoices[0]?.invoice_number}
              />
              <InfoRow
                icon={Building2}
                label={t('department')}
                value={ticket.department_name}
              />
              <InfoRow
                icon={Clock}
                label={t('arrivalTime')}
                value={ticket.arrival_time}
              />
              <InfoRow
                icon={Clock}
                label={t('actualArrivalTime')}
                value={ticket.actual_arrival_time}
              />
              <InfoRow
                icon={Timer}
                label={t('duration')}
                value={ticket.duration}
              />
              <InfoRow icon={Eye} label={t('seenBy')} value={ticket.seen_by} />
              <InfoRow
                icon={User}
                label={t('agentName')}
                value={ticket.agent_name}
              />
              <InfoRow
                icon={User}
                label={t('collectedBy')}
                value={ticket.collected_by}
              />
              <InfoRow
                icon={FileText}
                label={t('notes')}
                value={ticket.notes}
              />
              <InfoRow
                icon={CheckCircle}
                label={t('runnerCashier')}
                value={
                  ticket.has_runner_cashier ? (
                    <div className="inline-flex items-center gap-2">
                      <CheckCircle size={18} className="text-green-600" />
                      <span>{runnerCashierAmount || '—'}</span>
                    </div>
                  ) : (
                    <XCircle size={18} className="text-gray-400" />
                  )
                }
              />
              <InfoRow
                icon={AlertTriangle}
                label={t('urgent')}
                value={
                  ticket.is_urgent === 1 ? (
                    <AlertTriangle
                      size={18}
                      className="text-red-600 animate-pulse"
                    />
                  ) : (
                    <AlertTriangle size={18} className="text-gray-300" />
                  )
                }
              />
              {ticket.reject_reason && (
                <InfoRow
                  icon={XCircle}
                  label={t('rejectReason')}
                  value={
                    <span className="text-red-600">{ticket.reject_reason}</span>
                  }
                />
              )}
            </div>
          </MainBox>

          {/* Services table */}
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
                  {ticket.services.map((svc) => (
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
                      {t('ticketTotal')}
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-sky-700 text-center">
                      {ticket.ticket_total_price}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </MainBox>

          {/* Comments */}
          <MainBox>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {t('comments')} ({ticket.comments.length})
              </h2>
            </div>

            <div className="mb-4">
              <TicketCommentComposer
                value={commentText}
                onChange={setCommentText}
                placeholder={t('commentPlaceholder')}
                submitLabel={t('addComment')}
                onSubmit={handleAddComment}
                isSubmitting={isAddingComment}
              />
            </div>

            {ticket.comments.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-6">
                {t('noComments')}
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {ticket.comments.map((comment) => (
                  <div
                    key={comment.comment_id}
                    className="rounded-xl bg-slate-50 p-4 border border-slate-100"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center">
                          <User size={14} className="text-sky-600" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-slate-700">
                            {comment.created_by}
                          </span>
                          {comment.position && (
                            <span className="text-xs text-slate-400">
                              {comment.position}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-slate-400">
                        {comment.created_at.dateTime}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {comment.comment}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </MainBox>
        </div>

        {/* ── Right column: Timeline ──────────────────────────── */}
        <div className="lg:col-span-1">
          <StatusTimeline logs={ticket.logs} title={t('timeline')} />
        </div>
      </div>

      {canUploadDocuments && (
        <MediaUploadModal
          open={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            setShowUploadModal(false);
            if (showDocuments) {
              setDocumentsCurrentPage(1);
              void fetchDocuments(1, documentsPageSize);
            }
          }}
          context={{
            ticket_id: String(ticket.ticket_id),
            unit_number: ticket.unit_number,
            customer_name: ticket.customer_name,
            customer_id: ticket.customer_id ?? 0,
          }}
        />
      )}

      {showDocuments && canReadDocuments && (
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('documents')} ({documentsTotalCount})
            </h2>
          </div>
          <DataTable<MediaItem>
            columns={documentColumns}
            data={documents}
            rowKey={(row) => row.id}
            loading={documentsLoading}
            emptyState={t('noDocuments')}
            itemsPerPage={10}
            pageSize={documentsPageSize}
            currentPage={documentsCurrentPage}
            totalCount={documentsTotalCount}
            onPageChange={handleDocumentsPageChange}
            onPageSizeChange={handleDocumentsPageSizeChange}
            persistKey="ticket-detail-documents"
            showColumnToggle
            exportEnabled={canExportDocuments}
            exportEndpoint="/projects/units/media"
            exportParams={documentsExportParams}
            exportFileName="ticket-documents"
          />
        </MainBox>
      )}

      <FilePreviewDialog
        open={!!previewItem}
        file={
          previewItem
            ? { url: previewItem.file_path, name: previewItem.file_name }
            : null
        }
        title={tDocLib('previewTitle')}
        onClose={() => setPreviewItem(null)}
      />

      <AddEntryModal
        open={showRejectModal}
        title={`${t('rejectTitle')} #${ticket.ticket_id}`}
        fields={[
          {
            name: 'reason',
            label: t('rejectReason'),
            type: 'textarea',
            required: true,
          },
        ]}
        saveLabel={t('rejectSubmit')}
        cancelLabel={t('rejectCancel')}
        onSave={handleRejectModalSave}
        onCancel={handleRejectModalCancel}
        isSaving={isChangingStatus}
      />

      {printTicket &&
        createPortal(
          <div className="print-area">
            <TicketPrintReceipt ticket={printTicket} />
          </div>,
          document.body,
        )}
    </div>
  );
}
