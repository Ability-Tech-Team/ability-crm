'use client';

import { useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import Button from './ui/Button';
import Input from './ui/Input';
import Select from './ui/Select';
import { usePathname } from '@/src/i18n/navigation';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { getErrorCode } from '@/src/lib/apiErrors';
import {
  buildSupportRequestPayload,
  createSupportRequestSchema,
  SUPPORT_CATEGORIES,
  SUPPORT_LIMITS,
  toFieldErrors,
  type SupportRequestValues,
} from '@/src/lib/supportRequest';
import {
  sendSupportRequest,
  type SentSupportRequest,
} from '@/src/services/support';

interface ContactSupportFormProps {
  onSent: (sent: SentSupportRequest) => void;
  onCancel: () => void;
  /** Lets the modal refuse to close while the request is in flight. */
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

const EMPTY: SupportRequestValues = { category: '', subject: '', message: '' };

export default function ContactSupportForm({
  onSent,
  onCancel,
  onSubmittingChange,
}: ContactSupportFormProps) {
  const t = useTranslations('support');
  const tForm = useTranslations('form');
  const { error: showError } = useResponseMessage();
  const pathname = usePathname();

  const [values, setValues] = useState<SupportRequestValues>(EMPTY);
  const [errors, setErrors] = useState<ReturnType<typeof toFieldErrors>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  // A second click lands before React re-renders the disabled button.
  const inFlight = useRef(false);

  const schema = useMemo(
    () =>
      createSupportRequestSchema({
        categoryRequired: t('validation.categoryRequired'),
        subjectLength: t('validation.subjectLength', {
          min: SUPPORT_LIMITS.subjectMin,
          max: SUPPORT_LIMITS.subjectMax,
        }),
        subjectSingleLine: t('validation.subjectSingleLine'),
        messageLength: t('validation.messageLength', {
          min: SUPPORT_LIMITS.messageMin,
          max: SUPPORT_LIMITS.messageMax,
        }),
      }),
    [t],
  );

  const categoryOptions = SUPPORT_CATEGORIES.map((category) => ({
    value: category,
    label: t(`categories.${category}`),
  }));

  const setField = (name: keyof SupportRequestValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const setSubmitting = (value: boolean) => {
    inFlight.current = value;
    setIsSubmitting(value);
    onSubmittingChange?.(value);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (inFlight.current) return;

    const result = schema.safeParse(values);
    if (!result.success) {
      setErrors(toFieldErrors(result.error.issues));
      return;
    }

    setSubmitting(true);
    try {
      const sent = await sendSupportRequest(
        buildSupportRequestPayload(result.data, pathname),
      );
      onSent(sent);
    } catch (err) {
      if (getErrorCode(err) === 'AUTH_TOO_MANY_ATTEMPTS') {
        toast.error(t('tooManyRequests'));
      } else {
        showError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const messageErrors = errors.message ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <p className="text-sm text-gray-600">{t('intro')}</p>

      <Select
        label={t('category')}
        name="support-category"
        options={categoryOptions}
        value={values.category}
        placeholder={t('categoryPlaceholder')}
        searchable={false}
        clearable={false}
        errors={errors.category}
        disabled={isSubmitting}
        onChange={(event) => setField('category', event.target.value)}
      />

      <Input
        label={t('subject')}
        name="support-subject"
        value={values.subject}
        placeholder={t('subjectPlaceholder')}
        maxLength={SUPPORT_LIMITS.subjectMax}
        errors={errors.subject}
        disabled={isSubmitting}
        onChange={(event) => setField('subject', event.target.value)}
      />

      <div>
        <label
          htmlFor="support-message"
          className="block text-sm font-medium mb-1 text-gray-700"
        >
          {t('message')}
        </label>
        <textarea
          id="support-message"
          name="support-message"
          dir="auto"
          rows={6}
          maxLength={SUPPORT_LIMITS.messageMax}
          value={values.message}
          placeholder={t('messagePlaceholder')}
          disabled={isSubmitting}
          aria-invalid={messageErrors.length > 0}
          aria-describedby="support-message-count"
          onChange={(event) => setField('message', event.target.value)}
          className={`appearance-none block w-full px-3 py-2 border rounded-md placeholder-gray-400 sm:text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-y [unicode-bidi:plaintext] ${
            messageErrors.length > 0
              ? 'border-red-500 focus:ring-red-500/20 focus:border-red-500 bg-red-50'
              : isSubmitting
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'border-gray-300 bg-white hover:border-gray-400 focus:ring-sky-400/20 focus:border-sky-400'
          }`}
        />
        <div className="mt-1.5 flex items-start justify-between gap-3">
          <div>
            {messageErrors.map((message) => (
              <p key={message} className="text-sm text-red-600">
                {message}
              </p>
            ))}
          </div>
          <p
            id="support-message-count"
            className="shrink-0 text-xs text-gray-400 tabular-nums"
          >
            {t('messageCounter', {
              count: values.message.length,
              max: SUPPORT_LIMITS.messageMax,
            })}
          </p>
        </div>
      </div>

      <div className="flex gap-3 justify-end pt-2">
        <Button
          type="button"
          variant="secondary"
          size="md"
          onClick={onCancel}
          disabled={isSubmitting}
          fullWidth={false}
        >
          {tForm('cancel')}
        </Button>
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          fullWidth={false}
        >
          {t('send')}
        </Button>
      </div>
    </form>
  );
}
