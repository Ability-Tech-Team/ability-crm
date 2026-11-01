'use client';

import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Download, Eye, X } from 'lucide-react';
import { downloadFile, openMediaInNewTab } from '@/src/lib/downloadFile';
import { useSecureMediaUrl } from './SecureImage';

export interface PreviewFile {
  url: string;
  name: string;
  mimeType?: string | null;
}

interface FilePreviewDialogProps {
  open: boolean;
  file: PreviewFile | null;
  onClose: () => void;
  title?: string;
  showDownload?: boolean;
}

function isImageFile(file: PreviewFile): boolean {
  if (file.mimeType?.toLowerCase().startsWith('image/')) return true;
  return /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name);
}

function isPdfFile(file: PreviewFile): boolean {
  if (file.mimeType?.toLowerCase().includes('pdf')) return true;
  return /\.pdf$/i.test(file.name);
}

export default function FilePreviewDialog({
  open,
  file,
  onClose,
  title,
  showDownload = true,
}: FilePreviewDialogProps) {
  const t = useTranslations('common.filePreview');
  const overlayRef = useRef<HTMLDivElement>(null);
  const { objectUrl, failed } = useSecureMediaUrl(open ? file?.url ?? null : null);

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

  if (!open || !file) return null;

  const isImage = isImageFile(file);
  const isPdf = isPdfFile(file);
  const canPreview = isImage || isPdf;

  return (
    <div
      ref={overlayRef}
      onClick={(event) => {
        if (event.target === overlayRef.current) onClose();
      }}
      className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4"
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-slate-800">
              {title ?? t('title')}
            </h3>
            <p className="truncate text-sm text-slate-500">{file.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100"
            aria-label={t('close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-6 py-5">
          {canPreview && objectUrl ? (
            isImage ? (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={objectUrl}
                  alt={file.name}
                  className="max-h-[70vh] w-full object-contain"
                />
              </div>
            ) : (
              <iframe
                src={objectUrl}
                title={file.name}
                sandbox=""
                referrerPolicy="no-referrer"
                className="h-[70vh] w-full rounded-xl border border-slate-200"
              />
            )
          ) : failed || !canPreview ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              {t('unavailable')}
            </div>
          ) : (
            <div className="h-40 animate-pulse rounded-xl bg-slate-100" />
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => openMediaInNewTab(file.url)}
              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              <Eye size={16} className="mr-1.5" />
              {t('openInTab')}
            </button>
            {showDownload && (
              <button
                type="button"
                onClick={() => downloadFile(file.url, file.name)}
                className="inline-flex items-center justify-center rounded-md border border-transparent bg-sky-400 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700"
              >
                <Download size={16} className="mr-1.5" />
                {t('download')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
