'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { useRouter } from '@/src/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  ArrowLeft,
  Hash,
  User,
  Phone,
  MessageSquare,
  FileText,
  Clock,
} from 'lucide-react';
import MainBox from '@/src/components/ui/MainBox';
import Button from '@/src/components/ui/Button';
import { getInquiryById, type Inquiry } from '@/src/services/inquiries';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

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
export default function InquiryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('inquiries.detail');
  const tForm = useTranslations('form');
  const inquiryId = Number(params.id);

  const [inquiry, setInquiry] = useState<Inquiry | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const loadInquiry = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      setError('');
      setInquiry(null);

      try {
        const data = await getInquiryById(inquiryId, signal);
        if (signal?.aborted) return;

        if (!data) {
          setError(t('notFound'));
        } else {
          setInquiry(data);
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
    [inquiryId, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      if (!inquiryId || isNaN(inquiryId)) {
        setIsLoading(false);
        setError(t('notFound'));
        return;
      }

      loadInquiry(controller.signal);
    });

    return () => {
      cancel();
      controller.abort();
    };
  }, [inquiryId, t, loadInquiry]);

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
  if (error || !inquiry) {
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
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft size={20} className="text-slate-600" />
        </button>
        <h1 className="text-2xl font-semibold text-slate-800">
          {t('title')} #{inquiry.id}
        </h1>
      </div>

      {/* ── Details card ──────────────────────────────────────── */}
      <MainBox>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">
          {t('title')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 divide-y sm:divide-y-0">
          <InfoRow icon={Hash} label={t('id')} value={String(inquiry.id)} />
          <InfoRow
            icon={Hash}
            label={t('unitNumber')}
            value={inquiry.unit_number}
          />
          <InfoRow
            icon={User}
            label={t('requesterName')}
            value={inquiry.requester_name}
          />
          <InfoRow
            icon={Phone}
            label={t('requesterMobile')}
            value={inquiry.requester_mobile}
          />
          <InfoRow
            icon={Clock}
            label={t('createdAt')}
            value={inquiry.created_at?.date}
          />
          <InfoRow
            icon={User}
            label={t('createdBy')}
            value={inquiry.created_by}
          />
        </div>
      </MainBox>

      {/* ── Inquiry text ──────────────────────────────────────── */}
      <MainBox>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t('inquiry')}
          </h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
          {inquiry.inquiry || '—'}
        </p>
      </MainBox>

      {/* ── Response ──────────────────────────────────────────── */}
      <MainBox>
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare size={20} className="text-green-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t('response')}
          </h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
          {inquiry.response || '—'}
        </p>
      </MainBox>
    </div>
  );
}
