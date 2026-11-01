'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { z } from 'zod';
import Button from './ui/Button';
import Input from './ui/Input';
import { changePassword } from '@/src/services/employees';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';

interface ChangePasswordFormProps {
  onSuccess: () => void;
  /** Optional cancel action; when omitted the cancel button is not rendered. */
  onCancel?: () => void;
  /** Lets the parent disable dismiss controls while a request is in flight. */
  onSubmittingChange?: (isSubmitting: boolean) => void;
}

const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[^A-Za-z0-9]).{8,}$/;

export default function ChangePasswordForm({
  onSuccess,
  onCancel,
  onSubmittingChange,
}: ChangePasswordFormProps) {
  const t = useTranslations('auth');
  const tForm = useTranslations('form');
  const { success, error: showError } = useResponseMessage();

  const [formData, setFormData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const schema = z
    .object({
      oldPassword: z.string().min(1, t('oldPassword')),
      newPassword: z
        .string()
        .min(1, t('newPassword'))
        .refine((value) => !value || passwordPattern.test(value), {
          message: t('passwordMinLength'),
        }),
      confirmPassword: z.string().min(1, t('confirmPassword')),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t('passwordsDoNotMatch'),
      path: ['confirmPassword'],
    });

  const setSubmitting = (value: boolean) => {
    setIsSubmitting(value);
    onSubmittingChange?.(value);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = schema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string[]> = {};
      for (const issue of result.error.issues) {
        const key = issue.path[0] as string;
        if (!fieldErrors[key]) fieldErrors[key] = [];
        fieldErrors[key].push(issue.message);
      }
      setErrors(fieldErrors);
      return;
    }

    setSubmitting(true);
    try {
      await changePassword(result.data);
      success('changePasswordSuccess');
      onSuccess();
    } catch (err) {
      showError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label={t('oldPassword')}
        name="oldPassword"
        type="password"
        value={formData.oldPassword}
        onChange={handleChange}
        errors={errors.oldPassword}
        autoComplete="current-password"
      />

      <Input
        label={t('newPassword')}
        name="newPassword"
        type="password"
        value={formData.newPassword}
        onChange={handleChange}
        errors={errors.newPassword}
        autoComplete="new-password"
      />

      <Input
        label={t('confirmPassword')}
        name="confirmPassword"
        type="password"
        value={formData.confirmPassword}
        onChange={handleChange}
        errors={errors.confirmPassword}
        autoComplete="new-password"
      />

      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
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
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          isLoading={isSubmitting}
          fullWidth={false}
        >
          {tForm('save')}
        </Button>
      </div>
    </form>
  );
}
