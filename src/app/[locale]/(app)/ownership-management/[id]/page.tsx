'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Ban,
  Briefcase,
  Building2,
  CalendarCheck,
  CalendarPlus,
  CircleCheck,
  CircleDot,
  Download,
  Eye,
  FileText,
  FolderOpen,
  Hash,
  Layers,
  Paperclip,
  RefreshCw,
  Tag,
  User,
  UserCheck,
} from 'lucide-react';
import { useRouter } from '@/src/i18n/navigation';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import FilePreviewDialog, {
  type PreviewFile,
} from '@/src/components/ui/FilePreviewDialog';
import MainBox from '@/src/components/ui/MainBox';
import SecureImage from '@/src/components/ui/SecureImage';
import StatusTimeline, {
  type StatusTimelineLog,
} from '@/src/components/ui/StatusTimeline';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { downloadFile } from '@/src/lib/downloadFile';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  closeOwnershipManagementRequest,
  getOwnershipManagementRequestById,
  markOwnershipManagementRequestAsWrongTicket,
  type OwnershipManagementRequest,
} from '@/src/services/ownershipManagementRequests';
import {
  OPEN_STATUS_ID,
  getAttachments,
  getStatusBadgeClass,
  isActionableStatus,
} from '../utils';

type InfoItem = {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
};

function renderInfoItems(items: InfoItem[]) {
  return items.map(({ icon: Icon, label, value }) => (
    <div key={label} className="flex items-start gap-3 py-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
        <Icon size={18} className="text-sky-600" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-medium text-slate-800 mt-0.5 wrap-break-word">
          {value === null || value === undefined || value === '' ? '—' : value}
        </span>
      </div>
    </div>
  ));
}

export default function OwnershipManagementDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('ownershipManagement');
  const tForm = useTranslations('form');
  const tFilePreview = useTranslations('common.filePreview');
  const { success: showSuccess, error: showError } = useResponseMessage();
  const requestId = Number(params.id);
  const isValidId = Number.isInteger(requestId) && requestId > 0;

  const privileges = useRoutePrivileges('/ownership-management/search');
  const canClose = privileges.hasPrivilege(PRIVILEGE_IDS.CLOSE);
  const canMarkWrongTicket = privileges.hasPrivilege(PRIVILEGE_IDS.INVALID);

  const [request, setRequest] = useState<OwnershipManagementRequest | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(isValidId);
  const [error, setError] = useState('');

  const [isCloseOpen, setIsCloseOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [isWrongTicketOpen, setIsWrongTicketOpen] = useState(false);
  const [isMarkingWrongTicket, setIsMarkingWrongTicket] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  // ── Fetch ────────────────────────────────────────────────────
  /**
   * Also re-run after an action, since the page stays put. Written as a
   * promise chain rather than async/await so no state is set synchronously
   * when the effect below calls it.
   */
  const loadRequest = useCallback(
    (signal?: AbortSignal) => {
      if (!isValidId) return Promise.resolve();

      return getOwnershipManagementRequestById(requestId, signal)
        .then((data) => {
          setRequest(data);
          setError(data ? '' : t('detail.notFound'));
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name !== 'CanceledError') {
            setError(t('detail.notFoundMessage'));
            setIsLoading(false);
          }
        });
    },
    [isValidId, requestId, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadRequest(controller.signal);
    return () => controller.abort();
  }, [loadRequest]);

  // ── Action handlers ──────────────────────────────────────────
  const handleConfirmClose = async () => {
    setIsClosing(true);
    try {
      await closeOwnershipManagementRequest(requestId);
      showSuccess('statusChangeSuccess');
      setIsCloseOpen(false);
      await loadRequest();
    } catch (err) {
      showError(err);
    } finally {
      setIsClosing(false);
    }
  };

  const handleWrongTicket = async (values: Record<string, string>) => {
    const comment = values.comment?.trim();
    if (!comment) return;

    setIsMarkingWrongTicket(true);
    try {
      await markOwnershipManagementRequestAsWrongTicket(requestId, { comment });
      showSuccess('statusChangeSuccess');
      setIsWrongTicketOpen(false);
      await loadRequest();
    } catch (err) {
      showError(err);
    } finally {
      setIsMarkingWrongTicket(false);
    }
  };

  const goBackToSearch = () => router.push('/ownership-management/search');

  // ── Loading state ────────────────────────────────────────────
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

  // ── Error / not found ────────────────────────────────────────
  if (!isValidId || error || !request) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <FileText size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {t('detail.notFound')}
        </h2>
        <p className="text-sm text-slate-500">{t('detail.notFoundMessage')}</p>
        <Button variant="secondary" onClick={goBackToSearch}>
          {t('detail.backToSearch')}
        </Button>
      </div>
    );
  }

  const attachments = getAttachments(request);
  const canAct =
    isActionableStatus(request.status_id) && (canClose || canMarkWrongTicket);

  const statusBadge = (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
        request.status_id,
      )}`}
    >
      {request.status_name ?? '—'}
    </span>
  );

  const requestItems: InfoItem[] = [
    { icon: Hash, label: t('columns.id'), value: request.id },
    { icon: Tag, label: t('columns.category'), value: request.category_name },
    { icon: CircleDot, label: t('columns.status'), value: statusBadge },
    {
      icon: User,
      label: t('columns.createdBy'),
      value: request.created_by_name,
    },
    {
      icon: CalendarPlus,
      label: t('columns.createdAt'),
      value: request.created_at,
    },
    {
      icon: RefreshCw,
      label: t('columns.updatedAt'),
      value: request.updated_at,
    },
    {
      icon: UserCheck,
      label: t('columns.closedBy'),
      value: request.closed_by_name,
    },
    {
      icon: CalendarCheck,
      label: t('columns.closedDate'),
      value: request.closed_date,
    },
  ];

  const unitItems: InfoItem[] = [
    {
      icon: Building2,
      label: t('columns.unitNumber'),
      value: request.unit_number,
    },
    { icon: Hash, label: t('columns.unitId'), value: request.unit_id },
    {
      icon: FolderOpen,
      label: t('columns.projectId'),
      value: request.project_id,
    },
    {
      icon: Layers,
      label: t('columns.subProjectId'),
      value: request.sub_project_id,
    },
    {
      icon: Briefcase,
      label: t('columns.companyCode'),
      value: request.company_code,
    },
  ];

  // The response carries no logs, so the timeline is built from the request's
  // own creation and last status change.
  const timelineLogs: StatusTimelineLog[] = [
    {
      log_id: 1,
      status_name: t('detail.created'),
      description: t('detail.createdDescription'),
      created_by: request.created_by_name ?? '—',
      created_at: request.created_at ?? '—',
    },
  ];

  const statusChangedAt =
    request.closed_date ??
    (request.status_id !== OPEN_STATUS_ID ? request.updated_at : null);

  if (statusChangedAt) {
    timelineLogs.push({
      log_id: 2,
      status_name: request.status_name,
      description: t('detail.statusChangedDescription', {
        status: request.status_name ?? '—',
      }),
      created_by: request.closed_by_name ?? '',
      created_at: statusChangedAt,
    });
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={goBackToSearch}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label={t('detail.backToSearch')}
          >
            <ArrowLeft size={20} className="text-slate-600 rtl:rotate-180" />
          </button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-semibold text-slate-800">
                {t('detail.title')} #{request.id}
              </h1>
              {statusBadge}
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {[t('title'), request.unit_number, request.category_name]
                .filter(Boolean)
                .join(' · ')}
            </p>
          </div>
        </div>

        {canAct && (
          <div className="flex flex-wrap gap-2">
            {canMarkWrongTicket && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setIsWrongTicketOpen(true)}
              >
                <Ban size={16} className="me-1.5 inline" />
                {t('actions.wrongTicket')}
              </Button>
            )}
            {canClose && (
              <Button
                variant="success"
                size="sm"
                onClick={() => setIsCloseOpen(true)}
              >
                <CircleCheck size={16} className="me-1.5 inline" />
                {t('actions.close')}
              </Button>
            )}
          </div>
        )}
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <MainBox>
            <h2 className="text-lg font-semibold text-slate-800">
              {t('detail.requestInfo')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 divide-y divide-slate-100 sm:divide-y-0">
              {renderInfoItems(requestItems)}
            </div>
          </MainBox>

          <MainBox>
            <div className="flex items-center gap-2">
              <FileText size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {t('columns.description')}
              </h2>
            </div>
            <p className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap wrap-break-word">
              {request.description || '—'}
            </p>
          </MainBox>

          {request.comment && (
            <MainBox>
              <div className="flex items-center gap-2">
                <Ban size={20} className="text-red-500" />
                <h2 className="text-lg font-semibold text-slate-800">
                  {t('columns.wrongTicketComment')}
                </h2>
              </div>
              <p className="rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 leading-relaxed whitespace-pre-wrap wrap-break-word">
                {request.comment}
              </p>
            </MainBox>
          )}

          <MainBox>
            <div className="flex items-center gap-2">
              <Paperclip size={20} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-800">
                {t('attachments.title')} ({attachments.length})
              </h2>
            </div>

            {attachments.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                {t('attachments.empty')}
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {attachments.map((attachment) => {
                  const file = {
                    url: attachment.file_path,
                    name: attachment.file_name,
                  };
                  return (
                    <div
                      key={attachment.id}
                      className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                    >
                      <button
                        type="button"
                        onClick={() => setPreviewFile(file)}
                        className="aspect-square w-full overflow-hidden bg-slate-100"
                        aria-label={`${t('detail.preview')} ${attachment.file_name}`}
                      >
                        <SecureImage
                          src={attachment.file_path}
                          alt={attachment.file_name}
                          className="block h-full w-full object-cover transition-transform hover:scale-105"
                        />
                      </button>
                      <div className="flex flex-col gap-2 p-3">
                        <span
                          className="truncate text-xs font-medium text-slate-700"
                          title={attachment.file_name}
                        >
                          {attachment.file_name}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1"
                            onClick={() => setPreviewFile(file)}
                          >
                            <Eye size={14} className="me-1 inline" />
                            {t('detail.preview')}
                          </Button>
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => downloadFile(file.url, file.name)}
                            aria-label={tFilePreview('download')}
                            title={tFilePreview('download')}
                          >
                            <Download size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </MainBox>
        </div>

        <div className="flex flex-col gap-6">
          <MainBox>
            <h2 className="text-lg font-semibold text-slate-800">
              {t('detail.unitInfo')}
            </h2>
            <div className="flex flex-col divide-y divide-slate-100">
              {renderInfoItems(unitItems)}
            </div>
          </MainBox>

          <StatusTimeline logs={timelineLogs} title={t('detail.timeline')} />
        </div>
      </div>

      <ConfirmModal
        open={isCloseOpen}
        title={t('actions.closeTitle')}
        message={t('actions.closeMessage', { id: request.id })}
        confirmLabel={t('actions.close')}
        cancelLabel={tForm('cancel')}
        confirmVariant="success"
        isLoading={isClosing}
        loadingLabel={t('actions.closing')}
        onConfirm={() => {
          void handleConfirmClose();
        }}
        onCancel={() => {
          if (isClosing) return;
          setIsCloseOpen(false);
        }}
      />

      <AddEntryModal
        open={isWrongTicketOpen}
        title={t('actions.wrongTicketTitle')}
        fields={[
          {
            name: 'comment',
            label: t('actions.comment'),
            placeholder: t('actions.commentPlaceholder'),
            type: 'textarea',
            required: true,
          },
        ]}
        saveLabel={t('actions.wrongTicket')}
        cancelLabel={tForm('cancel')}
        isSaving={isMarkingWrongTicket}
        onSave={handleWrongTicket}
        onCancel={() => {
          if (isMarkingWrongTicket) return;
          setIsWrongTicketOpen(false);
        }}
      />

      <FilePreviewDialog
        open={!!previewFile}
        file={previewFile}
        title={t('attachments.title')}
        onClose={() => setPreviewFile(null)}
      />
    </div>
  );
}
