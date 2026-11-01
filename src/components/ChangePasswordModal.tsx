'use client';

import { useEffect, useRef, useState } from 'react';
import { X, Lock } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ChangePasswordForm from './ChangePasswordForm';

interface ChangePasswordModalProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordModal({
  open,
  onClose,
}: ChangePasswordModalProps) {
  const t = useTranslations('auth');
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, isSubmitting, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current && !isSubmitting) onClose();
      }}
    >
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-sky-100">
            <Lock size={20} className="text-sky-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('changePassword')}
          </h2>
        </div>

        {/* Form state resets naturally because the modal unmounts when closed. */}
        <ChangePasswordForm
          onSuccess={onClose}
          onCancel={onClose}
          onSubmittingChange={setIsSubmitting}
        />
      </div>
    </div>
  );
}
