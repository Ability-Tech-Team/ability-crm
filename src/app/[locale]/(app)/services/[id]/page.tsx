'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import { ArrowLeft, Pencil, FileText } from 'lucide-react';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getServiceById, type Service } from '@/src/services/services';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-slate-200 p-3">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-sm font-medium text-slate-800">
        {value !== null && value !== undefined && value !== ''
          ? String(value)
          : '—'}
      </span>
    </div>
  );
}

export default function ServiceDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('services.detail');
  const tServices = useTranslations('services');
  const tForm = useTranslations('form');
  const searchPrivileges = useRoutePrivileges('/services/search');
  const canEditService = searchPrivileges.hasAnyPrivilege([
    PRIVILEGE_IDS.EDIT,
    'edit',
  ]);
  const serviceId = Number(params.id);

  const [record, setRecord] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      if (!serviceId || Number.isNaN(serviceId)) {
        setError(t('notFound'));
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError('');
      setRecord(null);

      (async () => {
        try {
          const data = await getServiceById(serviceId, controller.signal);
          if (controller.signal.aborted) return;

          if (!data) {
            setError(t('notFound'));
            return;
          }

          setRecord(data);
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
  }, [serviceId, t]);

  const rows = useMemo(() => {
    if (!record) return [];

    return [
      { label: t('fields.serviceId'), value: record.id },
      { label: t('fields.serviceName'), value: record.service_name },
      { label: t('fields.enServiceName'), value: record.en_name },
      { label: t('fields.arServiceName'), value: record.ar_name },
      { label: t('fields.department'), value: record.department_name },
      { label: t('fields.description'), value: record.description },
      { label: t('fields.price'), value: record.price },
      { label: t('fields.startDate'), value: record.start_date },
      {
        label: t('fields.isActive'),
        value: record.is_active === 1 ? tForm('isActive') : tForm('inactive'),
      },
      {
        label: t('fields.showInMobile'),
        value: record.show_in_mobile === 1 ? tServices('yes') : tServices('no'),
      },
      {
        label: t('fields.enMobileServiceName'),
        value: record.en_mobile_service_name,
      },
      {
        label: t('fields.arMobileServiceName'),
        value: record.ar_mobile_service_name,
      },
      {
        label: t('fields.slotFromTime'),
        value: record.service_config?.slot_from_time,
      },
      {
        label: t('fields.slotToTime'),
        value: record.service_config?.slot_to_time,
      },
      {
        label: t('fields.slotTime'),
        value: record.service_config?.slot_time,
      },
      {
        label: t('fields.concurrentSlots'),
        value: record.service_config?.concurrent_slots,
      },
      {
        label: t('fields.createdAt'),
        value: record.created_at
          ? new Date(record.created_at).toLocaleString()
          : null,
      },
      {
        label: t('fields.updatedAt'),
        value: record.updated_at
          ? new Date(record.updated_at).toLocaleString()
          : null,
      },
    ];
  }, [record, t, tForm, tServices]);

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-100">
        <span className="text-sm text-slate-500">{tForm('loading')}</span>
      </div>
    );
  }

  if (error || !record) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-100 gap-4">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <FileText size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {t('notFound')}
        </h2>
        <p className="text-sm text-slate-500">{t('notFoundMessage')}</p>
        <Button
          variant="secondary"
          onClick={() => router.push('/services/search')}
        >
          {t('backToSearch')}
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.push('/services/search')}
          className="inline-flex items-center gap-2 text-sky-600 hover:text-sky-800"
        >
          <ArrowLeft size={18} />
          {t('backToSearch')}
        </button>

        {canEditService && (
          <Button
            variant="secondary"
            onClick={() => router.push(`/services/add?edit=${serviceId}`)}
          >
            <Pencil size={16} className="mr-1.5" />
            {t('edit')}
          </Button>
        )}
      </div>

      <MainBox>
        <h1 className="text-xl font-semibold text-slate-800 mb-4">
          {t('title')} #{record.id}
        </h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {rows.map((row) => (
            <InfoRow key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      </MainBox>
    </div>
  );
}
