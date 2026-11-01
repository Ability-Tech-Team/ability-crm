'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CarFront,
  CircleCheckBig,
  Eye,
  FileText,
  IdCard,
  Phone,
  UserRound,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from '@/src/i18n/navigation';
import AccessDenied from '@/src/components/AccessDenied';
import AddEntryModal, {
  type ModalField,
} from '@/src/components/ui/AddEntryModal';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import MainBox from '@/src/components/ui/MainBox';
import FilePreviewDialog, {
  type PreviewFile,
} from '@/src/components/ui/FilePreviewDialog';
import { downloadFile } from '@/src/lib/downloadFile';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  acceptWalkInRentalRequest,
  getWalkInRentalRequestById,
  rejectWalkInRentalRequest,
  type WalkInRentalRequest,
} from '@/src/services/walkInRentalRequests';
import { getSourceLabelKey, WALK_IN_SOURCE } from '../utils';

function getSourceBadgeClass(sourceId: number | undefined) {
  return sourceId === WALK_IN_SOURCE.TENANT
    ? 'border-violet-200 bg-violet-50 text-violet-700'
    : 'border-sky-200 bg-sky-50 text-sky-700';
}

function getRentalStatusBadgeClass(statusId: number | undefined) {
  return statusId === 2
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : statusId === 3
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700';
}

function getRentalStatusLabel(
  statusId: number | undefined,
  statusName: string | undefined,
) {
  return (
    statusName ||
    (statusId === 2 ? 'Accepted' : statusId === 3 ? 'Rejected' : 'Pending')
  );
}

function formatDateValue(value?: string) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString();
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

function MediaList({
  title,
  media,
  emptyText,
  onView,
}: {
  title: string;
  media: Array<{
    id: string;
    file_name: string;
    file_path: string;
    description?: string | null;
  }>;
  emptyText: string;
  onView: (file: PreviewFile) => void;
}) {
  const t = useTranslations('rentals');

  const handleView = (file: { file_path: string; file_name: string }) => {
    onView({ url: file.file_path, name: file.file_name });
  };

  const handleDownload = (filePath: string, fileName: string) => {
    downloadFile(filePath, fileName);
  };

  return (
    <MainBox>
      <h2 className="mb-4 text-lg font-semibold text-slate-900">{title}</h2>
      {media.length ? (
        <div className="space-y-3">
          {media.map((file) => (
            <div
              key={file.id}
              className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{file.file_name}</p>
                {file.description ? (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {file.description}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  className="shrink-0"
                  onClick={() => handleView(file)}
                >
                  <Eye size={16} className="me-1 inline" />
                  {t('rentalRequests.detail.view')}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  fullWidth={false}
                  className="shrink-0"
                  onClick={() => handleDownload(file.file_path, file.file_name)}
                >
                  {t('rentalRequests.detail.download')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
          {emptyText}
        </div>
      )}
    </MainBox>
  );
}

export default function WalkInRentalRequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('rentals');
  const sourceLabel = (sourceId: number | undefined) => {
    const key = getSourceLabelKey(sourceId);
    return key ? t(`rentalRequests.source.${key}`) : '—';
  };
  const tForm = useTranslations('form');
  const { error: showError } = useResponseMessage();
  const requestId = Number(params.id);
  const privileges = useRoutePrivileges('/rentals/rental-requests');

  const canOpenRequest =
    privileges.canAccess ||
    privileges.hasAnyPrivilege([
      PRIVILEGE_IDS.READ,
      PRIVILEGE_IDS.READ_ALL,
      PRIVILEGE_IDS.ACCEPT,
      PRIVILEGE_IDS.REJECT,
    ]);
  const canAcceptRequest = privileges.hasPrivilege(PRIVILEGE_IDS.ACCEPT);
  const canRejectRequest = privileges.hasPrivilege(PRIVILEGE_IDS.REJECT);

  const [request, setRequest] = useState<WalkInRentalRequest | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [isSavingAction, setIsSavingAction] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [previewAttachment, setPreviewAttachment] =
    useState<PreviewFile | null>(null);

  const loadRequest = useCallback(async () => {
    if (!requestId || Number.isNaN(requestId)) {
      setRequest(null);
      setLoadError(t('rentalRequests.detail.notFoundMessage'));
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError('');

    try {
      const data = await getWalkInRentalRequestById(requestId);

      if (!data) {
        setRequest(null);
        setLoadError(t('rentalRequests.detail.notFoundMessage'));
      } else {
        setRequest(data);
      }
    } catch {
      setRequest(null);
      setLoadError(t('rentalRequests.loadError'));
    } finally {
      setIsLoading(false);
    }
  }, [requestId, t]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadRequest();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadRequest]);

  const rejectFields = useMemo<ModalField[]>(
    () => [
      {
        name: 'reason',
        label: t('rentalRequests.detail.rejectReason'),
        type: 'textarea',
        required: true,
      },
    ],
    [t],
  );

  const canReview = request?.rental_status_id === 1;

  // Filter media by person
  const tenantMedia = useMemo(
    () =>
      request?.media?.filter(
        (m) =>
          m.id_number === request.id_number &&
          !m.description?.startsWith('Car:'),
      ) || [],
    [request],
  );

  const carMedia = useMemo(
    () =>
      request?.media?.filter(
        (m) =>
          m.id_number === request.id_number &&
          m.description?.startsWith('Car:'),
      ) || [],
    [request],
  );

  const openAcceptModal = () => {
    setShowAcceptModal(true);
  };

  const handleAccept = async () => {
    if (!request) {
      return;
    }

    setIsSavingAction(true);

    try {
      const nextRequest = await acceptWalkInRentalRequest(request.id);
      setRequest(nextRequest);
      setShowAcceptModal(false);
      toast.success(t('rentalRequests.detail.acceptSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  const handleReject = async (values: Record<string, string>) => {
    if (!request) {
      return;
    }

    setIsSavingAction(true);

    try {
      const nextRequest = await rejectWalkInRentalRequest(
        request.id,
        values.reason || undefined,
      );
      setRequest(nextRequest);
      setShowRejectModal(false);
      toast.success(t('rentalRequests.detail.rejectSuccess'));
    } catch (error) {
      showError(error);
    } finally {
      setIsSavingAction(false);
    }
  };

  if (!canOpenRequest) {
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

  if (!request) {
    return (
      <div className="p-6">
        <MainBox>
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-semibold text-slate-900">
              {t('rentalRequests.detail.notFound')}
            </h1>
            <p className="text-sm text-slate-500">
              {loadError || t('rentalRequests.detail.notFoundMessage')}
            </p>
            <div>
              <Button
                variant="secondary"
                onClick={() => router.push('/rentals/rental-requests')}
              >
                {t('rentalRequests.detail.back')}
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
            onClick={() => router.push('/rentals/rental-requests')}
            className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 hover:text-sky-800"
          >
            <ArrowLeft size={16} />
            {t('rentalRequests.detail.back')}
          </button>

          <div>
            <h1 className="text-2xl font-semibold text-slate-900">
              {t('rentalRequests.detail.title')} • {request.id}
            </h1>
            <p className="text-sm text-slate-500">
              {t('rentalRequests.detail.description')}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Editing a walk-in request isn't offered: its route
              (POST /rentals/walk-in-requests/:id/update) was removed from
              the backend. */}
          {canAcceptRequest && canReview ? (
            <Button
              variant="success"
              onClick={() => {
                openAcceptModal();
              }}
              isLoading={isSavingAction}
            >
              <CircleCheckBig size={16} className="me-1 inline" />
              {t('rentalRequests.detail.accept')}
            </Button>
          ) : null}

          {canRejectRequest && canReview ? (
            <Button
              variant="danger"
              onClick={() => setShowRejectModal(true)}
              isLoading={isSavingAction}
            >
              <XCircle size={16} className="me-1 inline" />
              {t('rentalRequests.detail.reject')}
            </Button>
          ) : null}
        </div>
      </div>

      <MainBox>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSourceBadgeClass(
              request.source_id,
            )}`}
          >
            {request.source_name || sourceLabel(request.source_id)}
          </span>
          <span
            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getRentalStatusBadgeClass(
              request.rental_status_id,
            )}`}
          >
            {getRentalStatusLabel(
              request.rental_status_id,
              request.rental_status_name,
            )}
          </span>
          <span className="text-sm text-slate-500">
            {t('detail.requestCreatedAt')}:{' '}
            {formatDateValue(request.created_at)}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <InfoRow
            icon={FileText}
            label={t('rentalRequests.columns.referenceNumber')}
            value={request.id}
          />
          <InfoRow
            icon={Building2}
            label={t('detail.projectName')}
            value={request.project_name}
          />
          <InfoRow
            icon={Building2}
            label={t('detail.unitNumber')}
            value={request.unit_number}
          />
          <InfoRow
            icon={UserRound}
            label={t('detail.tenantName')}
            value={request.customer_name}
          />
          <InfoRow
            icon={Phone}
            label={t('detail.mobile')}
            value={request.mobile_number}
          />
          <InfoRow
            icon={IdCard}
            label={t('detail.idNumber')}
            value={request.id_number}
          />
          <InfoRow
            icon={CalendarDays}
            label={t('detail.startDate')}
            value={formatDateValue(request.start_date)}
          />
          <InfoRow
            icon={CalendarDays}
            label={t('detail.endDate')}
            value={formatDateValue(request.end_date)}
          />
          <InfoRow
            icon={Users}
            label={t('detail.totalTenants')}
            value={request.total_tenant_count}
          />
          <InfoRow
            icon={Building2}
            label={t('detail.rentalCompany')}
            value={request.rental_company_name}
          />
        </div>

        {request.notes ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            <span className="font-semibold text-slate-700">
              {t('detail.notes')}:
            </span>{' '}
            {request.notes}
          </div>
        ) : null}

        {request.reject_reason ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span className="font-semibold text-red-800">
              {t('rentalRequests.detail.rejectReason')}:
            </span>{' '}
            {request.reject_reason}
          </div>
        ) : null}
      </MainBox>

      {tenantMedia.length > 0 ? (
        <MediaList
          title={t('rentalRequests.detail.tenantAttachments')}
          media={tenantMedia}
          emptyText={t('rentalRequests.detail.noTenantAttachments')}
          onView={setPreviewAttachment}
        />
      ) : null}

      {request.cars && request.cars.length > 0 ? (
        <MainBox>
          <div className="mb-4 flex items-center gap-2">
            <CarFront size={18} className="text-sky-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {t('rentalRequests.detail.vehiclesTitle', {
                count: request.cars.length,
              })}
            </h2>
          </div>

          <div className="space-y-3">
            {request.cars.map((car, index) => (
              <div
                key={index}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <InfoRow
                    icon={CarFront}
                    label={t('rentalRequests.detail.vehicleMake')}
                    value={car.make}
                  />
                  <InfoRow
                    icon={CarFront}
                    label={t('rentalRequests.detail.vehicleModel')}
                    value={car.model}
                  />
                  <InfoRow
                    icon={FileText}
                    label={t('rentalRequests.detail.vehiclePlateText')}
                    value={car.plate_text}
                  />
                  <InfoRow
                    icon={IdCard}
                    label={t('rentalRequests.detail.vehiclePlateNumber')}
                    value={car.plate_number}
                  />
                </div>
              </div>
            ))}
          </div>
        </MainBox>
      ) : null}

      {carMedia.length > 0 ? (
        <MediaList
          title={t('rentalRequests.detail.vehicleAttachments')}
          media={carMedia}
          emptyText={t('rentalRequests.detail.noTenantAttachments')}
          onView={setPreviewAttachment}
        />
      ) : null}

      {request.relatives && request.relatives.length > 0 ? (
        <MainBox>
          <div className="mb-4 flex items-center gap-2">
            <Users size={18} className="text-violet-600" />
            <h2 className="text-lg font-semibold text-slate-900">
              {t('rentalRequests.detail.relativesTitle', {
                count: request.relatives.length,
              })}
            </h2>
          </div>

          <div className="space-y-4">
            {request.relatives.map((relative) => (
              <div
                key={relative.id}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UserRound size={16} className="text-violet-600" />
                    <h3 className="font-semibold text-slate-900">
                      {relative.customer_name}
                    </h3>
                    <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-xs font-semibold text-violet-700">
                      {relative.relative_relation}
                    </span>
                  </div>
                  {relative.assignment && (
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${getRentalStatusBadgeClass(
                        relative.assignment.rental_status_id,
                      )}`}
                    >
                      {getRentalStatusLabel(
                        relative.assignment.rental_status_id,
                        relative.assignment.rental_status_name,
                      )}
                    </span>
                  )}
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <InfoRow
                    icon={IdCard}
                    label={t('rentalRequests.detail.relativeIdNumber')}
                    value={relative.id_number}
                  />
                  <InfoRow
                    icon={Phone}
                    label={t('rentalRequests.detail.relativeMobile')}
                    value={relative.mobile_number}
                  />
                  <InfoRow
                    icon={FileText}
                    label={t('rentalRequests.detail.relativeEmail')}
                    value={relative.email}
                  />
                  {relative.assignment && (
                    <>
                      <InfoRow
                        icon={CalendarDays}
                        label={t('rentalRequests.detail.relativeStartDate')}
                        value={formatDateValue(relative.assignment.start_date)}
                      />
                      <InfoRow
                        icon={CalendarDays}
                        label={t('rentalRequests.detail.relativeEndDate')}
                        value={formatDateValue(relative.assignment.end_date)}
                      />
                    </>
                  )}
                </div>

                {relative.cars && relative.cars.length > 0 ? (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {t('rentalRequests.detail.relativeVehicles')}
                    </p>
                    <div className="space-y-2">
                      {relative.cars.map((car, carIndex) => (
                        <div
                          key={carIndex}
                          className="rounded border border-slate-100 bg-slate-50 p-2 text-sm"
                        >
                          <p className="text-slate-700">
                            <span className="font-semibold">{car.make}</span>{' '}
                            {car.model} ({car.plate_text} {car.plate_number})
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {(() => {
                  const relativeMedia =
                    request.media?.filter(
                      (m) => m.id_number === relative.id_number,
                    ) || [];
                  if (!relativeMedia.length) return null;
                  return (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {t('rentalRequests.detail.tenantAttachments')}
                      </p>
                      <div className="space-y-2">
                        {relativeMedia.map((file) => (
                          <div
                            key={file.id}
                            className="flex flex-col gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between"
                          >
                            <p className="min-w-0 flex-1 truncate font-medium">
                              {file.file_name}
                            </p>
                            <div className="flex shrink-0 gap-2">
                              <Button
                                type="button"
                                variant="secondary"
                                fullWidth={false}
                                className="shrink-0"
                                onClick={() => {
                                  setPreviewAttachment({
                                    url: file.file_path,
                                    name: file.file_name,
                                  });
                                }}
                              >
                                <Eye size={16} className="me-1 inline" />
                                {t('rentalRequests.detail.view')}
                              </Button>
                              <Button
                                type="button"
                                variant="secondary"
                                fullWidth={false}
                                className="shrink-0"
                                onClick={() => {
                                  downloadFile(file.file_path, file.file_name);
                                }}
                              >
                                {t('rentalRequests.detail.download')}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>
        </MainBox>
      ) : null}

      <AddEntryModal
        open={showRejectModal}
        title={t('rentalRequests.detail.rejectTitle')}
        fields={rejectFields}
        saveLabel={t('rentalRequests.detail.reject')}
        cancelLabel={tForm('cancel')}
        onSave={handleReject}
        onCancel={() => setShowRejectModal(false)}
        initialValues={{
          reason: '',
        }}
        isSaving={isSavingAction}
      />

      <ConfirmModal
        open={showAcceptModal}
        title={t('rentalRequests.detail.acceptTitle')}
        message={t('rentalRequests.detail.acceptMessage')}
        subtitle={t('rentalRequests.detail.acceptBrokerSubtitle')}
        confirmLabel={t('rentalRequests.detail.accept')}
        cancelLabel={tForm('cancel')}
        confirmVariant="success"
        isLoading={isSavingAction}
        loadingLabel={t('rentalRequests.detail.accepting')}
        onConfirm={() => {
          void handleAccept();
        }}
        onCancel={() => setShowAcceptModal(false)}
      />

      <FilePreviewDialog
        open={!!previewAttachment}
        file={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </div>
  );
}
