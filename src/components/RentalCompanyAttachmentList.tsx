'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Download,
  Eye,
  FileImage,
  FileText,
  Pencil,
  Trash2,
} from 'lucide-react';
import Button from './ui/Button';
import FilePreviewDialog from './ui/FilePreviewDialog';
import SecureImage from './ui/SecureImage';
import { downloadFile } from '@/src/lib/downloadFile';
import type { RentalCompanyAttachment } from '@/src/services/rentalCompanies';

interface RentalCompanyAttachmentListProps {
  attachments: RentalCompanyAttachment[];
  emptyLabel?: string;
  onEdit?: (attachment: RentalCompanyAttachment) => void;
  onDelete?: (attachment: RentalCompanyAttachment) => void;
}

function isImageAttachment(attachment: RentalCompanyAttachment) {
  if (attachment.mime_type?.toLowerCase().startsWith('image/')) {
    return true;
  }

  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(attachment.file_name);
}

export default function RentalCompanyAttachmentList({
  attachments,
  emptyLabel,
  onEdit,
  onDelete,
}: RentalCompanyAttachmentListProps) {
  const t = useTranslations('rentalCompanies');
  const [previewTarget, setPreviewTarget] =
    useState<RentalCompanyAttachment | null>(null);

  if (!attachments.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        {emptyLabel ?? t('noAttachments')}
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {attachments.map((attachment) => {
          const imageAttachment = isImageAttachment(attachment);

          return (
            <div
              key={`${attachment.id}-${attachment.file_name}`}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex min-h-24 items-center justify-center bg-slate-50 p-3">
                {imageAttachment ? (
                  <SecureImage
                    src={attachment.file_path}
                    alt={attachment.file_name}
                    className="h-20 w-full rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-slate-500">
                    <FileText size={22} className="text-sky-600" />
                    <span className="text-xs font-medium uppercase">
                      {attachment.mime_type ?? t('fileLabel')}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-3">
                <div className="flex items-start gap-2">
                  {imageAttachment ? (
                    <FileImage size={16} className="mt-0.5 text-sky-600" />
                  ) : (
                    <FileText size={16} className="mt-0.5 text-sky-600" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {attachment.file_name}
                    </p>
                    <p className="text-xs text-slate-500">
                      {attachment.created_at
                        ? new Date(attachment.created_at).toLocaleDateString()
                        : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setPreviewTarget(attachment)}
                  >
                    <Eye size={14} className="mr-1" />
                    {t('preview')}
                  </Button>

                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() =>
                      downloadFile(attachment.file_path, attachment.file_name)
                    }
                  >
                    <Download size={14} className="mr-1" />
                    {t('download')}
                  </Button>

                  {onEdit && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => onEdit(attachment)}
                    >
                      <Pencil size={14} className="mr-1" />
                      {t('editAttachment')}
                    </Button>
                  )}

                  {onDelete && (
                    <Button
                      type="button"
                      variant="danger"
                      size="sm"
                      onClick={() => onDelete(attachment)}
                    >
                      <Trash2 size={14} className="mr-1" />
                      {t('deleteAttachment')}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <FilePreviewDialog
        open={!!previewTarget}
        file={
          previewTarget
            ? {
                url: previewTarget.file_path,
                name: previewTarget.file_name,
                mimeType: previewTarget.mime_type ?? undefined,
              }
            : null
        }
        onClose={() => setPreviewTarget(null)}
      />
    </>
  );
}
