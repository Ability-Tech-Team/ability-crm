'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { CircleCheck, LifeBuoy, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Button from './ui/Button';
import ContactSupportForm from './ContactSupportForm';
import type { SentSupportRequest } from '@/src/services/support';

interface ContactSupportModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * "Contact support" from the user menu: the form, then the reference the API gave the
 * request and where the answer will go. Same shell as ChangePasswordModal.
 */
export default function ContactSupportModal({
  open,
  onClose,
}: ContactSupportModalProps) {
  const t = useTranslations('support');
  const tForm = useTranslations('form');
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState<SentSupportRequest | null>(null);

  const close = () => {
    if (isSubmitting) return;
    setSent(null);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        setSent(null);
        onClose();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, isSubmitting, onClose]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 backdrop-blur-sm py-6 transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="relative w-full max-w-lg mx-4 my-auto rounded-2xl bg-white p-6 shadow-xl outline-none animate-in fade-in zoom-in-95 duration-200"
      >
        <button
          type="button"
          onClick={close}
          disabled={isSubmitting}
          className="absolute top-4 end-4 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label={tForm('close')}
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-100">
            <LifeBuoy size={20} className="text-sky-600" />
          </div>
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {sent ? t('sentTitle') : t('title')}
          </h2>
        </div>

        {sent ? (
          <div className="space-y-4" role="status">
            <div className="flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-800">
              <CircleCheck size={20} className="mt-0.5 shrink-0 text-green-600" />
              <p>
                {t.rich('sentReference', {
                  reference: sent.reference,
                  strong: (chunks) => (
                    <strong className="font-semibold" dir="ltr">
                      {chunks}
                    </strong>
                  ),
                })}
              </p>
            </div>
            <p className="text-sm text-gray-600">
              {sent.replyTo ? (
                t.rich('sentReplyTo', {
                  email: sent.replyTo,
                  strong: (chunks) => (
                    <bdi className="font-medium text-gray-800">{chunks}</bdi>
                  ),
                })
              ) : (
                <span className="text-amber-700">{t('sentNoEmail')}</span>
              )}
            </p>
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={close}
                fullWidth={false}
              >
                {tForm('close')}
              </Button>
            </div>
          </div>
        ) : (
          // The form unmounts when the modal closes, so each opening starts empty.
          <ContactSupportForm
            onSent={setSent}
            onCancel={close}
            onSubmittingChange={setIsSubmitting}
          />
        )}
      </div>
    </div>
  );
}
