'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Eye, FileText, Paperclip, X } from 'lucide-react';
import Button from './ui/Button';
import FilePreviewDialog, { type PreviewFile } from './ui/FilePreviewDialog';
import SecureImage from './ui/SecureImage';
import { downloadFile } from '@/src/lib/downloadFile';
import type { ComplaintMedia } from '@/src/services/complaints';

interface ComplaintAttachmentsModalProps {
  open: boolean;
  complainId: number | string;
  attachments: ComplaintMedia[];
  onClose: () => void;
}

function isImageMedia(media: ComplaintMedia) {
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(media.file_name);
}

export default function ComplaintAttachmentsModal({
  open,
  complainId,
  attachments,
  onClose,
}: ComplaintAttachmentsModalProps) {
  const t = useTranslations('complaints');
  const tForm = useTranslations('form');
  const overlayRef = useRef<HTMLDivElement>(null);
  const [previewTarget, setPreviewTarget] = useState<PreviewFile | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Paperclip size={18} className="text-sky-600" />
              {t('attachments')}
            </h2>
            <p className="mt-1 text-sm text-slate-500">#{complainId}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label={tForm('close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
          {attachments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
              {t('noAttachments')}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {attachments.map((attachment) => {
                const image = isImageMedia(attachment);
                return (
                  <div
                    key={`${attachment.id}-${attachment.file_name}`}
                    className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
                  >
                    <div className="flex min-h-24 items-center justify-center bg-slate-50 p-3">
                      {image ? (
                        <SecureImage
                          src={attachment.file_path}
                          alt={attachment.file_name}
                          className="h-20 w-full rounded-lg object-cover"
                        />
                      ) : (
                        <FileText size={28} className="text-sky-600" />
                      )}
                    </div>
                    <div className="space-y-3 p-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-800">
                          {attachment.file_name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {attachment.created_at
                            ? new Date(
                                attachment.created_at,
                              ).toLocaleDateString()
                            : '—'}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            setPreviewTarget({
                              url: attachment.file_path,
                              name: attachment.file_name,
                            })
                          }
                        >
                          <Eye size={14} className="mr-1" />
                          {t('preview')}
                        </Button>
                        <Button
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() =>
                            downloadFile(
                              attachment.file_path,
                              attachment.file_name,
                            )
                          }
                        >
                          <Download size={14} className="mr-1" />
                          {t('download')}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <FilePreviewDialog
        open={!!previewTarget}
        file={previewTarget}
        onClose={() => setPreviewTarget(null)}
      />
    </div>
  );
}
