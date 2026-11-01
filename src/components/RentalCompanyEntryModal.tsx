'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Paperclip, Upload, X } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import RentalCompanyAttachmentList from './RentalCompanyAttachmentList';
import type { RentalCompanyAttachment } from '@/src/services/rentalCompanies';

type FieldName =
  | 'en_name'
  | 'ar_name'
  | 'commercial_register'
  | 'tax_register'
  | 'description';

export interface RentalCompanyFormValues {
  en_name: string;
  ar_name: string;
  commercial_register: string;
  tax_register: string;
  description?: string;
  files: File[];
}

interface RentalCompanyEntryModalProps {
  open: boolean;
  title: string;
  saveLabel: string;
  cancelLabel: string;
  onSave: (values: RentalCompanyFormValues) => void | Promise<void>;
  onCancel: () => void;
  initialValues?: {
    en_name?: string;
    ar_name?: string;
    commercial_register?: string;
    tax_register?: string;
    description?: string;
    attachments?: RentalCompanyAttachment[];
  };
  isSaving?: boolean;
}

export default function RentalCompanyEntryModal({
  open,
  title,
  saveLabel,
  cancelLabel,
  onSave,
  onCancel,
  initialValues,
  isSaving = false,
}: RentalCompanyEntryModalProps) {
  const tForm = useTranslations('form');
  const t = useTranslations('rentalCompanies');
  const overlayRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [values, setValues] = useState(() => ({
    en_name: initialValues?.en_name ?? '',
    ar_name: initialValues?.ar_name ?? '',
    commercial_register: initialValues?.commercial_register ?? '',
    tax_register: initialValues?.tax_register ?? '',
    description: initialValues?.description ?? '',
  }));
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errors, setErrors] = useState<
    Partial<
      Record<
        'en_name' | 'ar_name' | 'commercial_register' | 'tax_register',
        string[]
      >
    >
  >({});

  useEffect(() => {
    if (!open) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  const existingAttachments = initialValues?.attachments ?? [];

  const handleFieldChange = (fieldName: FieldName, fieldValue: string) => {
    setValues((prev) => ({
      ...prev,
      [fieldName]: fieldValue,
    }));

    if (fieldName === 'commercial_register' || fieldName === 'tax_register') {
      setErrors((prev) => ({
        ...prev,
        [fieldName]: fieldValue.trim() ? undefined : prev[fieldName],
      }));
      return;
    }

    setErrors((prev) => ({
      ...prev,
      [fieldName]: undefined,
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(Array.from(event.target.files ?? []));
    event.target.value = '';
  };

  const addFiles = (incomingFiles: File[]) => {
    if (!incomingFiles.length) {
      return;
    }

    setFiles((prev) => {
      const seen = new Set(
        prev.map((file) => `${file.name}-${file.size}-${file.lastModified}`),
      );

      const uniqueFiles = incomingFiles.filter((file) => {
        const key = `${file.name}-${file.size}-${file.lastModified}`;
        if (seen.has(key)) {
          return false;
        }

        seen.add(key);
        return true;
      });

      return [...prev, ...uniqueFiles];
    });
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) {
      return;
    }
    setIsDragActive(false);
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragActive(false);
    addFiles(Array.from(event.dataTransfer.files ?? []));
  };

  const handleRemoveFile = (fileToRemove: File) => {
    setFiles((prev) => prev.filter((file) => file !== fileToRemove));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const nextErrors: Partial<
      Record<
        'en_name' | 'ar_name' | 'commercial_register' | 'tax_register',
        string[]
      >
    > = {};
    const trimmedEnglishName = values.en_name.trim();
    const trimmedArabicName = values.ar_name.trim();
    const trimmedCommercialRegister = values.commercial_register.trim();
    const trimmedTaxRegister = values.tax_register.trim();
    const trimmedDescription = values.description.trim();

    if (!trimmedEnglishName) {
      nextErrors.en_name = [tForm('requiredField')];
    }

    if (!trimmedArabicName) {
      nextErrors.ar_name = [tForm('requiredField')];
    }

    if (!trimmedCommercialRegister) {
      nextErrors.commercial_register = [tForm('requiredField')];
    }

    if (!trimmedTaxRegister) {
      nextErrors.tax_register = [tForm('requiredField')];
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    await onSave({
      en_name: trimmedEnglishName,
      ar_name: trimmedArabicName,
      commercial_register: trimmedCommercialRegister,
      tax_register: trimmedTaxRegister,
      description: trimmedDescription || undefined,
      files,
    });
  };

  return (
    <div
      ref={overlayRef}
      onClick={(event) => {
        if (event.target === overlayRef.current) {
          onCancel();
        }
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    >
      <div className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-600"
          aria-label={t('close')}
        >
          <X size={18} />
        </button>

        <div className="mb-5">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{t('multiUploadHint')}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label={`${tForm('enName')} *`}
              name="en_name"
              value={values.en_name}
              onChange={(event) =>
                handleFieldChange('en_name', event.target.value)
              }
              placeholder={tForm('enName')}
              errors={errors.en_name}
              required
            />

            <Input
              label={`${tForm('arName')} *`}
              name="ar_name"
              value={values.ar_name}
              onChange={(event) =>
                handleFieldChange('ar_name', event.target.value)
              }
              placeholder={tForm('arName')}
              errors={errors.ar_name}
              required
            />

            <Input
              label={`${t('commercialRegister')} *`}
              name="commercial_register"
              value={values.commercial_register}
              onChange={(event) =>
                handleFieldChange('commercial_register', event.target.value)
              }
              placeholder={t('commercialRegister')}
              errors={errors.commercial_register}
              required
            />

            <Input
              label={`${t('taxRegister')} *`}
              name="tax_register"
              value={values.tax_register}
              onChange={(event) =>
                handleFieldChange('tax_register', event.target.value)
              }
              placeholder={t('taxRegister')}
              errors={errors.tax_register}
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              {tForm('description')}
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={values.description}
              onChange={(event) =>
                handleFieldChange('description', event.target.value)
              }
              placeholder={tForm('description')}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm transition-all duration-200 placeholder-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20"
            />
          </div>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`rounded-2xl border p-4 transition-colors ${
              isDragActive
                ? 'border-sky-400 bg-sky-50'
                : 'border-slate-200 bg-slate-50'
            }`}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                  <Paperclip size={16} className="text-sky-600" />
                  {t('attachments')}
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {isDragActive ? t('dropHere') : t('multiUploadHint')}
                </p>
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={16} className="mr-1.5" />
                {t('uploadFiles')}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
              className="hidden"
            />

            {files.length > 0 && (
              <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('selectedFilesTitle')}
                </p>
                <div className="flex flex-wrap gap-2">
                  {files.map((file) => (
                    <div
                      key={`${file.name}-${file.lastModified}`}
                      className="flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs text-sky-800"
                    >
                      <span className="max-w-48 truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(file)}
                        className="rounded-full p-0.5 text-sky-700 transition-colors hover:bg-sky-100"
                        aria-label={`${t('remove')} ${file.name}`}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {existingAttachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('currentAttachmentsTitle')}
                </p>
                <RentalCompanyAttachmentList
                  attachments={existingAttachments}
                  emptyLabel={t('noAttachments')}
                />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onCancel}
              disabled={isSaving}
            >
              {cancelLabel}
            </Button>
            <Button type="submit" variant="primary" isLoading={isSaving}>
              {saveLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
