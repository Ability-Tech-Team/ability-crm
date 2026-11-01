'use client';

import { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { X, Upload, FileImage } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  uploadUnitMedia,
  type UploadUnitMediaParams,
} from '@/src/services/documentLibrary';
import { convertJpegToJpg } from '@/src/lib/convertJpegToJpg';

export interface MediaUploadContext {
  unit_id?: number;
  unit_number?: string;
  ticket_id?: string;
  invoice_id?: string;
  complain_id?: number;
  customer_name?: string;
  id_number?: string;
  mobile_number?: string;
  /** Every upload names its customer (`POST /projects/units/media/upload`). */
  customer_id: number;
  customer_code?: string;
}

const fileKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}`;

interface MediaUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  context: MediaUploadContext;
  /**
   * When 'stage' the modal does not call the upload API; it just runs JPEG
   * conversion and returns the resulting Files via `onStage`. Default 'upload'.
   */
  mode?: 'upload' | 'stage';
  onStage?: (data: {
    files: File[];
    description: string;
    mediaTypeId: number;
  }) => void;
  initialFiles?: File[];
  initialDescription?: string;
  confirmLabel?: string;
}

export default function MediaUploadModal({
  open,
  onClose,
  onSuccess,
  context,
  mode = 'upload',
  onStage,
  initialFiles,
  initialDescription = '',
  confirmLabel,
}: MediaUploadModalProps) {
  const t = useTranslations('upload');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  const derivedMediaTypeId = useMemo(() => {
    const types = dropdowns?.media_types ?? [];
    let keyword: string;
    if (context.ticket_id) keyword = 'ticket';
    else if (context.invoice_id) keyword = 'invoice';
    else if (context.complain_id != null) keyword = 'complain';
    else if (context.unit_number) keyword = 'unit';
    else keyword = 'customer';
    const match = types.find((type) =>
      type.name.toLowerCase().includes(keyword),
    );
    return match?.id ?? null;
  }, [context, dropdowns]);

  // Reset the form when the modal opens, prefilled for stage mode (adjusted
  // during render). The file input itself unmounts while the modal is closed.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setFiles(initialFiles ?? []);
      setDescription(initialDescription ?? '');
    }
  }

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const addFiles = (incoming: File[]) => {
    if (!incoming.length) return;
    setFiles((prev) => {
      const existing = new Set(prev.map(fileKey));
      return [...prev, ...incoming.filter((f) => !existing.has(fileKey(f)))];
    });
  };

  const handleRemove = (key: string) => {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(e.target.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    addFiles(Array.from(e.dataTransfer.files ?? []));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast.error(t('fileRequired'));
      return;
    }
    if (!derivedMediaTypeId) {
      toast.error(t('mediaTypeRequired'));
      return;
    }

    setIsUploading(true);

    try {
      const uploadFiles = await Promise.all(
        files.map(async (f) => {
          try {
            return await convertJpegToJpg(f);
          } catch {
            return f;
          }
        }),
      );

      if (mode === 'stage') {
        onStage?.({
          files: uploadFiles,
          description,
          mediaTypeId: derivedMediaTypeId,
        });
        onSuccess();
        onClose();
        return;
      }

      for (const uploadFile of uploadFiles) {
        const params: UploadUnitMediaParams = {
          file: uploadFile,
          media_type_id: derivedMediaTypeId,
          file_name: uploadFile.name,
          description: description || undefined,
          ...context,
        };
        await uploadUnitMedia(params);
      }

      showSuccess('uploadSuccess');
      onSuccess();
      onClose();
    } catch (err) {
      showError(err);
    } finally {
      setIsUploading(false);
    }
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">{t('title')}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 flex flex-col gap-4">
          {/* File input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              {t('file')} <span className="text-red-500">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-sky-400 bg-sky-50'
                  : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
              }`}
            >
              <div className="flex flex-col items-center gap-1.5">
                <Upload size={24} className="text-slate-400" />
                <span className="text-sm text-slate-500">
                  {isDragActive
                    ? t('dropHere')
                    : files.length > 0
                      ? t('dragMultipleHint')
                      : t('clickToSelect')}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="*/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {files.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {files.map((f) => {
                  const key = fileKey(f);
                  return (
                    <li
                      key={key}
                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <FileImage
                          size={16}
                          className="text-sky-600 shrink-0"
                        />
                        <span
                          className="text-xs text-slate-700 truncate"
                          title={f.name}
                        >
                          {f.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(key);
                        }}
                        className="p-1 rounded-md text-slate-500 hover:bg-slate-200 hover:text-red-600 transition-colors shrink-0"
                        aria-label="remove"
                      >
                        <X size={14} />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Description */}
          <Input
            name="description"
            label={tForm('description')}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={tForm('description')}
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-slate-100">
          <Button variant="secondary" onClick={onClose} disabled={isUploading}>
            {tForm('cancel')}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            isLoading={isUploading}
          >
            <Upload size={16} className="mr-1.5" />
            {confirmLabel ?? t('upload')}
          </Button>
        </div>
      </div>
    </div>
  );
}
