'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { z } from 'zod';
import Form, { type ButtonConfig, type FieldConfig } from '@/src/components/Form';
import TicketCommentComposer from '@/src/components/TicketCommentComposer';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { useRouter } from '@/src/i18n/navigation';
import { createConcessionTicket } from '@/src/services/concessionTickets';
import type { Unit } from '@/src/services/units';

const createConcessionTicketSchema = z.object({
  customer_name: z.string().optional(),
  customer_code: z.string().optional(),
  customer_mobile: z.string().optional(),
  unit_number: z.string().optional(),
  project_name: z.string().optional(),
  reason_id: z.string().min(1),
});

type CreateConcessionTicketFormData = z.infer<
  typeof createConcessionTicketSchema
>;

export default function CreateConcessionTicketPage() {
  const t = useTranslations('concessionTickets');
  const tForm = useTranslations('form');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: dropdowns } = useDropdowns();
  const { error: showError } = useResponseMessage();

  const unitId = searchParams.get('unitId');
  const customerId = searchParams.get('customerId');
  const [selection, setSelection] = useState<{
    unit: Unit;
    customerIndex: number;
  } | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [comment, setComment] = useState('');
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    const hydrationTimer = window.setTimeout(() => {
      try {
        const raw = sessionStorage.getItem('concession-ticket-create-unit');
        if (raw) {
          setSelection(JSON.parse(raw));
        }
      } catch {
        sessionStorage.removeItem('concession-ticket-create-unit');
      } finally {
        setIsHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(hydrationTimer);
  }, []);

  const unit = selection?.unit ?? null;
  const customer =
    unit && selection && selection.customerIndex >= 0
      ? unit.customer_units[selection.customerIndex]
      : null;

  const reasonOptions = useMemo(
    () =>
      (dropdowns?.concession_ticket_reasons ?? []).map((reason) => ({
        value: String(reason.id),
        label: reason.name,
      })),
    [dropdowns],
  );

  const fields: FieldConfig[] = [
    {
      name: 'customer_name',
      label: t('fields.customerName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customer_code',
      label: t('fields.customerCode'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customer_mobile',
      label: t('fields.customerMobile'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'unit_number',
      label: t('fields.unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'project_name',
      label: t('fields.projectName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'reason_id',
      label: t('fields.reason'),
      placeholder: t('fields.selectReason'),
      fieldType: 'select',
      options: reasonOptions,
      containerClassName: 'sm:col-span-2',
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: t('create.submit'),
      loadingLabel: t('create.submitting'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => router.push('/tickets/concessions/add'),
    },
  ];

  const handleSubmit = async (data: CreateConcessionTicketFormData) => {
    const normalizedComment = comment.trim();
    if (!normalizedComment) {
      setCommentError(t('fields.commentRequired'));
      return;
    }

    if (!unit) {
      showError(new Error(t('create.noUnitSelected')));
      return;
    }

    try {
      const result = await createConcessionTicket({
        unit_id: unit.unit_id ?? unit.id ?? Number(unitId),
        unit_number: unit.unit_number,
        project_id: unit.project_id,
        customer_id: customer?.customer_id,
        customer_code: customer?.customer_code ?? undefined,
        customer_name: customer?.customer_name ?? undefined,
        customer_mobile: customer?.mobile_number ?? undefined,
        reason_id: Number(data.reason_id),
        comment: normalizedComment,
      });

      sessionStorage.removeItem('concession-ticket-create-unit');
      toast.success(t('create.success'));

      if (result.result?.ticket_id) {
        router.push(`/tickets/concessions/${result.result.ticket_id}`);
      } else {
        router.push('/tickets/concessions/add');
      }
    } catch (error) {
      showError(error);
    }
  };

  if (!unitId || customerId === null) {
    return (
      <div className="p-6">
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">{t('create.noUnitSelected')}</p>
        </div>
      </div>
    );
  }

  if (!isHydrated) {
    return (
      <div className="p-6">
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">{tForm('loading')}</p>
        </div>
      </div>
    );
  }

  if (!unit) {
    return (
      <div className="p-6">
        <div className="flex h-64 items-center justify-center">
          <p className="text-gray-500">{t('create.noUnitSelected')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Form
        title={t('create.title')}
        fields={fields}
        buttons={buttons}
        initialValues={{
          customer_name: customer?.customer_name ?? '—',
          customer_code: customer?.customer_code ?? '—',
          customer_mobile: customer?.mobile_number ?? '—',
          unit_number: unit.unit_number,
          project_name: unit.project_name ?? '—',
          reason_id: '',
        }}
        validationSchema={createConcessionTicketSchema}
        onSubmit={handleSubmit}
      >
        <TicketCommentComposer
          label={`${t('fields.comment')} *`}
          value={comment}
          onChange={(value) => {
            setComment(value);
            if (value.trim()) setCommentError('');
          }}
          placeholder={t('fields.commentPlaceholder')}
          error={commentError}
        />
      </Form>
    </div>
  );
}
