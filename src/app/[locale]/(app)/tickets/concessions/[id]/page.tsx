'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, FileText, MessageSquare, User } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Button from '@/src/components/ui/Button';
import MainBox from '@/src/components/ui/MainBox';
import TicketCommentComposer from '@/src/components/TicketCommentComposer';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { useRouter } from '@/src/i18n/navigation';
import {
  addConcessionTicketComment,
  getConcessionTicketById,
  type ConcessionTicket,
} from '@/src/services/concessionTickets';

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <div className="mt-1 text-sm font-medium text-slate-700">
        {value || '—'}
      </div>
    </div>
  );
}

export default function ConcessionTicketDetailPage() {
  const t = useTranslations('concessionTickets');
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { error: showError } = useResponseMessage();
  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<ConcessionTicket | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [comment, setComment] = useState('');
  const [isAddingComment, setIsAddingComment] = useState(false);

  const loadTicket = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isFinite(ticketId) || ticketId <= 0) {
        setLoadError(true);
        setIsLoading(false);
        return;
      }

      try {
        const result = await getConcessionTicketById(ticketId, signal);
        setTicket(result);
        setLoadError(!result);
      } catch (error) {
        if ((error as { name?: string }).name !== 'CanceledError') {
          setLoadError(true);
        }
      } finally {
        setIsLoading(false);
      }
    },
    [ticketId],
  );

  useEffect(() => {
    const controller = new AbortController();
    const loadTimer = window.setTimeout(() => {
      void loadTicket(controller.signal);
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      controller.abort();
    };
  }, [loadTicket]);

  const handleAddComment = async () => {
    const normalizedComment = comment.trim();
    if (!ticket || !normalizedComment || isAddingComment) return;

    setIsAddingComment(true);
    try {
      await addConcessionTicketComment(ticket.ticket_id, {
        comment: normalizedComment,
      });
      setComment('');
      await loadTicket();
    } catch (error) {
      showError(error);
    } finally {
      setIsAddingComment(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-100 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-3 border-sky-200 border-t-sky-600" />
      </div>
    );
  }

  if (loadError || !ticket) {
    return (
      <div className="flex min-h-100 flex-col items-center justify-center gap-4 p-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50">
          <FileText size={28} className="text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-slate-700">
          {t('detail.notFound')}
        </h2>
        <Button variant="secondary" onClick={() => router.back()}>
          {t('detail.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg p-2 transition-colors hover:bg-slate-100"
          aria-label={t('detail.back')}
        >
          <ArrowLeft size={20} className="text-slate-600 rtl:rotate-180" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            {t('detail.title')} #{ticket.ticket_id}
          </h1>
          {ticket.status_name && (
            <span className="mt-1 inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700">
              {ticket.status_name}
            </span>
          )}
        </div>
      </div>

      <MainBox>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <DetailItem label={t('fields.unitNumber')} value={ticket.unit_number} />
          <DetailItem label={t('fields.projectName')} value={ticket.project_name} />
          <DetailItem label={t('fields.customerName')} value={ticket.customer_name} />
          <DetailItem
            label={t('fields.customerMobile')}
            value={ticket.customer_mobile}
          />
          <DetailItem label={t('fields.reason')} value={ticket.reason_name} />
          <DetailItem
            label={t('detail.createdBy')}
            value={ticket.created_by}
          />
        </div>
      </MainBox>

      <MainBox>
        <div className="mb-4 flex items-center gap-2">
          <MessageSquare size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t('detail.comments')} ({ticket.comments.length})
          </h2>
        </div>

        <div className="mb-4">
          <TicketCommentComposer
            value={comment}
            onChange={setComment}
            placeholder={t('fields.commentPlaceholder')}
            submitLabel={t('detail.addComment')}
            onSubmit={handleAddComment}
            isSubmitting={isAddingComment}
          />
        </div>

        {ticket.comments.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            {t('detail.noComments')}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            {ticket.comments.map((item) => (
              <div
                key={item.comment_id}
                className="rounded-xl border border-slate-100 bg-slate-50 p-4"
              >
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-100">
                      <User size={14} className="text-sky-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-700">
                        {item.created_by}
                      </span>
                      {item.position && (
                        <span className="text-xs text-slate-400">
                          {item.position}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400">
                    {item.created_at?.dateTime}
                  </span>
                </div>
                <p
                  dir="auto"
                  className="text-sm leading-relaxed text-slate-600 [unicode-bidi:plaintext]"
                >
                  {item.comment}
                </p>
              </div>
            ))}
          </div>
        )}
      </MainBox>
    </div>
  );
}
