'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, X } from 'lucide-react';
import RentalCompanyAttachmentList from './RentalCompanyAttachmentList';
import ConfirmModal from './ui/ConfirmModal';
import type { RentalCompanyAttachment } from '@/src/services/rentalCompanies';

interface RentalCompanyAttachmentsModalProps {
  open: boolean;
  companyName: string;
  attachments: RentalCompanyAttachment[];
  onClose: () => void;
  canEdit?: boolean;
  onEditAttachment?: (attachment: RentalCompanyAttachment, file: File) => void;
  onDeleteAttachment?: (attachment: RentalCompanyAttachment) => void;
  isUpdating?: boolean;
}

export default function RentalCompanyAttachmentsModal({
  open,
  companyName,
  attachments,
  onClose,
  canEdit = false,
  onEditAttachment,
  onDeleteAttachment,
  isUpdating = false,
}: RentalCompanyAttachmentsModalProps) {
  const t = useTranslations('rentalCompanies');
  const tForm = useTranslations('form');
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<RentalCompanyAttachment | null>(null);
  const [editTarget, setEditTarget] = useState<RentalCompanyAttachment | null>(
    null,
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onClose();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-5xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Paperclip size={18} className="text-sky-600" />
              {t('attachments')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{companyName}</p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <RentalCompanyAttachmentList
            attachments={attachments}
            emptyLabel={t('noAttachments')}
            onEdit={
              canEdit && onEditAttachment
                ? (attachment) => {
                    setEditTarget(attachment);
                    fileInputRef.current?.click();
                  }
                : undefined
            }
            onDelete={
              canEdit && onDeleteAttachment
                ? (attachment) => setDeleteTarget(attachment)
                : undefined
            }
          />
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file && editTarget && onEditAttachment) {
            onEditAttachment(editTarget, file);
          }
          setEditTarget(null);
          event.target.value = '';
        }}
        className="hidden"
      />

      <ConfirmModal
        open={!!deleteTarget}
        title={t('deleteAttachmentTitle')}
        message={
          deleteTarget
            ? t('deleteAttachmentConfirm', { name: deleteTarget.file_name })
            : ''
        }
        confirmLabel={tForm('delete')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isUpdating}
        onConfirm={() => {
          if (deleteTarget && onDeleteAttachment) {
            onDeleteAttachment(deleteTarget);
            setDeleteTarget(null);
          }
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
