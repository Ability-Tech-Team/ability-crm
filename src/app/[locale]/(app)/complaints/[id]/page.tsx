'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  User,
  Building2,
  Clock,
  FileText,
  Hash,
  Phone,
  MessageSquare,
  RefreshCw,
  MessageSquarePlus,
  FolderOpen,
  Send,
  Upload,
  Paperclip,
  Eye,
  Download,
} from 'lucide-react';
import MediaUploadModal from '@/src/components/MediaUploadModal';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import AddEntryModal from '@/src/components/ui/AddEntryModal';
import FilePreviewDialog, {
  type PreviewFile,
} from '@/src/components/ui/FilePreviewDialog';
import { downloadFile } from '@/src/lib/downloadFile';
import {
  getComplaintById,
  changeComplaintStatus,
  addComplaintResponse,
  type Complaint,
} from '@/src/services/complaints';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { runAfterCommit } from '@/src/lib/runAfterCommit';


function getStatusBg(statusName: string): string {
  const n = statusName.toLowerCase();
  if (
    n.includes('open') ||
    n.includes('new') ||
    n.includes('جديد') ||
    n.includes('مفتوح')
  )
    return 'bg-sky-50 text-sky-700';
  if (n.includes('progress') || n.includes('pending') || n.includes('قيد'))
    return 'bg-amber-50 text-amber-700';
  if (
    n.includes('closed') ||
    n.includes('resolved') ||
    n.includes('مغلق') ||
    n.includes('محلول')
  )
    return 'bg-green-50 text-green-700';
  if (
    n.includes('cancel') ||
    n.includes('rejected') ||
    n.includes('مرفوض') ||
    n.includes('ملغ')
  )
    return 'bg-red-50 text-red-700';
  return 'bg-slate-50 text-slate-700';
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
  const isEmptyValue = value === null || value === undefined || value === '';

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-sky-50 flex items-center justify-center">
        <Icon size={18} className="text-sky-600" />
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
          {label}
        </span>
        <span className="text-sm font-medium text-slate-800 mt-0.5">
          {isEmptyValue ? '—' : value}
        </span>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────
export default function ComplaintDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('complaints.detail');
  const tComplaints = useTranslations('complaints');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const complainId = Number(params.id);

  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // ── Change status state ──────────────────────────────────────
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // ── Add response state ───────────────────────────────────────
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [isAddingResponse, setIsAddingResponse] = useState(false);

  // ── Upload state ─────────────────────────────────────────────
  const [showUploadModal, setShowUploadModal] = useState(false);
  const tUpload = useTranslations('upload');
  // ── Attachments preview state ────────────────────────────────
  const [previewAttachment, setPreviewAttachment] =
    useState<PreviewFile | null>(null);
  const complainStatusOptions = useMemo(
    () =>
      (dropdowns?.complain_statuses ?? []).map((d) => ({
        value: String(d.id),
        label: d.name,
      })),
    [dropdowns],
  );

  const loadComplaint = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError('');
      setComplaint(null);

      try {
        const data = await getComplaintById(complainId, signal);
        if (signal?.aborted) return;

        if (!data) {
          setError(t('notFound'));
        } else {
          setComplaint(data);
        }
      } catch (err: unknown) {
        if (
          !signal?.aborted &&
          (err as { name?: string }).name !== 'CanceledError'
        ) {
          setError(t('notFoundMessage'));
        }
      } finally {
        if (!signal?.aborted) {
          setIsLoading(false);
        }
      }
    },
    [complainId, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      if (!complainId || isNaN(complainId)) {
        setIsLoading(false);
        setError(t('notFound'));
        return;
      }

      loadComplaint(controller.signal);
    });

    return () => {
      cancel();
      controller.abort();
    };
  }, [complainId, t, loadComplaint]);

  // ── Change status handler ────────────────────────────────────
  const handleChangeStatus = useCallback(
    async (values: Record<string, string>) => {
      setIsChangingStatus(true);
      try {
        await changeComplaintStatus(complainId, {
          status_id: Number(values.status_id),
        });
        setShowStatusModal(false);
        showSuccess('statusChangeSuccess');
        loadComplaint();
      } catch (err) {
        showError(err);
      } finally {
        setIsChangingStatus(false);
      }
    },
    [complainId, loadComplaint, showError, showSuccess],
  );

  // ── Add response handler ─────────────────────────────────────
  const handleAddResponse = useCallback(
    async (values: Record<string, string>) => {
      setIsAddingResponse(true);
      try {
        await addComplaintResponse(complainId, {
          response: values.response,
        });
        setShowResponseModal(false);
        showSuccess('responseAddedSuccess');
        loadComplaint();
      } catch (err) {
        showError(err);
      } finally {
        setIsAddingResponse(false);
      }
    },
    [complainId, loadComplaint, showError, showSuccess],
  );

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
  if (error || !complaint) {
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

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h1 className="text-2xl font-semibold text-slate-800">
              {t('title')} #{complaint.complain_id}
            </h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1 ${getStatusBg(complaint.status_name)}`}
            >
              {complaint.status_name}
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {!((): boolean => {
            const n = complaint.status_name.toLowerCase();
            return (
              n.includes('resolved') ||
              n.includes('closed') ||
              n.includes('محلول') ||
              n.includes('مغلق')
            );
          })() && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowStatusModal(true)}
            >
              <RefreshCw size={16} className="mr-1.5" />
              {tComplaints('changeStatus')}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowResponseModal(true)}
          >
            <MessageSquarePlus size={16} className="mr-1.5" />
            {tComplaints('addResponse')}
          </Button>
          {complaint.customer_id ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload size={16} className="mr-1.5" />
              {tUpload('uploadDocument')}
            </Button>
          ) : null}
        </div>
      </div>

      {/* ── Main grid ─────────────────────────────────────────── */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <MainBox>
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            {t('title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 divide-y sm:divide-y-0">
            <InfoRow
              icon={Hash}
              label={t('complainId')}
              value={String(complaint.complain_id)}
            />
            <InfoRow
              icon={User}
              label={t('customerName')}
              value={complaint.customer_name}
            />
            <InfoRow
              icon={Hash}
              label={t('customerCode')}
              value={complaint.customer_code}
            />
            <InfoRow
              icon={Phone}
              label={t('mobileNumber')}
              value={complaint.mobile_number}
            />
            <InfoRow
              icon={Hash}
              label={t('unitNumber')}
              value={complaint.unit_number}
            />
            <InfoRow
              icon={Building2}
              label={t('department')}
              value={complaint.department_name}
            />
            <InfoRow
              icon={FileText}
              label={t('type')}
              value={complaint.type_name}
            />
            <InfoRow
              icon={RefreshCw}
              label={t('status')}
              value={
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${getStatusBg(complaint.status_name)}`}
                >
                  {complaint.status_name}
                </span>
              }
            />
            <InfoRow
              icon={FolderOpen}
              label={t('project')}
              value={complaint.project_name}
            />
            <InfoRow
              icon={Send}
              label={t('requestFrom')}
              value={complaint.request_from_name}
            />
            <InfoRow
              icon={Clock}
              label={t('complainDate')}
              value={complaint.complain_date}
            />
            <InfoRow
              icon={User}
              label={t('createdBy')}
              value={complaint.created_by}
            />
            <InfoRow
              icon={Clock}
              label={t('createdAt')}
              value={complaint.created_at?.dateTime}
            />
          </div>
        </MainBox>

        {/* Details card */}
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <FileText size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('details')}
            </h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
            {complaint.details || '—'}
          </p>
        </MainBox>

        {/* Responses */}
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {t('responses')} ({(complaint.responses ?? []).length})
            </h2>
          </div>

          {(complaint.responses ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {t('noResponses')}
            </p>
          ) : (
            <div className="flex flex-col gap-3">
              {(complaint.responses ?? []).map((resp) => (
                <div
                  key={resp.response_id}
                  className="rounded-xl bg-slate-50 p-4 border border-slate-100"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center">
                        <User size={14} className="text-sky-600" />
                      </div>
                      <span className="text-sm font-medium text-slate-700">
                        {resp.created_by}
                      </span>
                    </div>
                    <span className="text-xs text-slate-400">
                      {resp.created_at.dateTime}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {resp.response}
                  </p>
                </div>
              ))}
            </div>
          )}
        </MainBox>

        {/* Attachments */}
        <MainBox>
          <div className="flex items-center gap-2 mb-4">
            <Paperclip size={20} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-800">
              {tComplaints('attachments')} ({(complaint.media ?? []).length})
            </h2>
          </div>

          {(complaint.media ?? []).length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              {tComplaints('noAttachments')}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(complaint.media ?? []).map((media) => (
                <div
                  key={`${media.id}-${media.file_name}`}
                  className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <FileText size={16} className="shrink-0 text-sky-600" />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-800">
                        {media.file_name}
                      </p>
                      {media.created_at ? (
                        <p className="text-xs text-slate-400">
                          {new Date(media.created_at).toLocaleDateString()}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        setPreviewAttachment({
                          url: media.file_path,
                          name: media.file_name,
                        })
                      }
                    >
                      <Eye size={14} className="mr-1" />
                      {tComplaints('preview')}
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        downloadFile(media.file_path, media.file_name)
                      }
                    >
                      <Download size={14} className="mr-1" />
                      {tComplaints('download')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </MainBox>
      </div>

      {/* Change status modal */}
      <AddEntryModal
        open={showStatusModal}
        title={`${tComplaints('changeStatus')} (#${complaint.complain_id})`}
        fields={[
          {
            name: 'status_id',
            label: tForm('complainStatus'),
            type: 'select',
            required: true,
            options: complainStatusOptions,
          },
        ]}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        isSaving={isChangingStatus}
        onSave={handleChangeStatus}
        onCancel={() => setShowStatusModal(false)}
      />

      {/* Add response modal */}
      <AddEntryModal
        open={showResponseModal}
        title={`${tComplaints('addResponse')} (#${complaint.complain_id})`}
        fields={[
          {
            name: 'response',
            label: tForm('response'),
            placeholder: tForm('responsePlaceholder'),
            required: true,
          },
        ]}
        saveLabel={tForm('save')}
        cancelLabel={tForm('cancel')}
        isSaving={isAddingResponse}
        onSave={handleAddResponse}
        onCancel={() => setShowResponseModal(false)}
      />

      <MediaUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onSuccess={() => setShowUploadModal(false)}
        context={{
          complain_id: complaint.complain_id,
          unit_number: complaint.unit_number,
          customer_name: complaint.customer_name,
          customer_id: complaint.customer_id ?? 0,
          customer_code: complaint.customer_code || undefined,
          mobile_number: complaint.mobile_number ?? undefined,
        }}
      />

      <FilePreviewDialog
        open={!!previewAttachment}
        file={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
