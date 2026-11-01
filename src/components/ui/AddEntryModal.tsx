'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import Select, { type SelectOption } from './Select';

export type ModalField = {
  name: string;
  label: string;
  type?:
    | 'text'
    | 'number'
    | 'email'
    | 'date'
    | 'select'
    | 'checkbox'
    | 'textarea';
  placeholder?: string;
  required?: boolean;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  disabled?: boolean;
  /** For select-type fields */
  options?: SelectOption[];
  searchable?: boolean;
};

interface AddEntryModalProps {
  open: boolean;
  title: string;
  fields: ModalField[];
  saveLabel: string;
  cancelLabel: string;
  onSave: (values: Record<string, string>) => void | Promise<void>;
  onCancel: () => void;
  /** Pre-fill values for edit mode */
  initialValues?: Record<string, string>;
  /** Disables the form and shows the save label as-is while saving */
  isSaving?: boolean;
  /** Optional second action button (e.g. "Create & Collect") */
  saveAndCollectLabel?: string;
  onSaveAndCollect?: (values: Record<string, string>) => void | Promise<void>;
}

function buildDefaultValues(
  fields: ModalField[],
  initialValues?: Record<string, string>,
) {
  const defaults: Record<string, string> = {};

  for (const field of fields) {
    defaults[field.name] = initialValues?.[field.name] ?? '';
  }

  return defaults;
}

export default function AddEntryModal(props: AddEntryModalProps) {
  const { open, fields, initialValues } = props;

  if (!open) {
    return null;
  }

  const resetKey = JSON.stringify({
    fieldNames: fields.map((field) => field.name),
    initialValues,
  });

  return <AddEntryModalContent key={resetKey} {...props} />;
}

function AddEntryModalContent({
  open,
  title,
  fields,
  saveLabel,
  cancelLabel,
  onSave,
  onCancel,
  initialValues,
  isSaving = false,
  saveAndCollectLabel,
  onSaveAndCollect,
}: AddEntryModalProps) {
  const collectIntentRef = useRef(false);
  const tForm = useTranslations('form');
  const overlayRef = useRef<HTMLDivElement>(null);
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildDefaultValues(fields, initialValues),
  );
  const [errors, setErrors] = useState<Partial<Record<string, string[]>>>({});

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const handleChange = (name: string, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({
      ...prev,
      [name]: undefined,
    }));
  };

  const getFieldLabel = (field: ModalField) => {
    if (field.required && !field.label.trim().endsWith('*')) {
      return `${field.label} *`;
    }
    return field.label;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextErrors: Partial<Record<string, string[]>> = {};

    // Validate required fields
    for (const field of fields) {
      if (field.required && !values[field.name]?.trim()) {
        nextErrors[field.name] = [tForm('requiredField')];
      }
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    if (collectIntentRef.current) {
      collectIntentRef.current = false;
      await onSaveAndCollect?.(values);
    } else {
      await onSave(values);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current) onCancel();
      }}
    >
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
        {/* Close button */}
        <button
          onClick={onCancel}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{title}</h2>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {fields.map((field) => {
            if (field.type === 'select' && field.options) {
              return (
                <Select
                  key={field.name}
                  label={getFieldLabel(field)}
                  name={field.name}
                  options={field.options}
                  placeholder={field.placeholder ?? field.label}
                  value={values[field.name] ?? ''}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  errors={errors[field.name]}
                  searchable={field.searchable ?? true}
                />
              );
            }

            if (field.type === 'checkbox') {
              return (
                <label
                  key={field.name}
                  className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={values[field.name] === '1'}
                    onChange={(e) =>
                      handleChange(field.name, e.target.checked ? '1' : '0')
                    }
                    className="h-4 w-4 accent-sky-500"
                  />
                  <span>{getFieldLabel(field)}</span>
                </label>
              );
            }

            if (field.type === 'textarea') {
              return (
                <div key={field.name} className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">
                    {getFieldLabel(field)}
                  </label>
                  <textarea
                    name={field.name}
                    dir="auto"
                    rows={4}
                    placeholder={field.placeholder ?? field.label}
                    value={values[field.name] ?? ''}
                    onChange={(e) => handleChange(field.name, e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm transition-all duration-200 hover:border-gray-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-400/20 [unicode-bidi:plaintext]"
                  />
                  {errors[field.name]?.length ? (
                    <p className="text-sm text-red-600">
                      {errors[field.name]?.[0]}
                    </p>
                  ) : null}
                </div>
              );
            }

            return (
              <Input
                key={field.name}
                label={getFieldLabel(field)}
                name={field.name}
                type={field.type ?? 'text'}
                placeholder={field.placeholder ?? field.label}
                value={values[field.name] ?? ''}
                onChange={(e) => handleChange(field.name, e.target.value)}
                required={field.required}
                min={field.min}
                max={field.max}
                step={field.step}
                disabled={field.disabled}
                errors={errors[field.name]}
              />
            );
          })}

          {/* Actions */}
          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={onCancel}
              disabled={isSaving}
              fullWidth={false}
            >
              {cancelLabel}
            </Button>
            {saveAndCollectLabel && onSaveAndCollect && (
              <Button
                type="submit"
                variant="success"
                size="md"
                fullWidth={false}
                disabled={isSaving}
                isLoading={isSaving}
                onClick={() => {
                  collectIntentRef.current = true;
                }}
              >
                {saveAndCollectLabel}
              </Button>
            )}
            <Button
              type="submit"
              variant="primary"
              size="md"
              fullWidth={false}
              disabled={isSaving}
              isLoading={isSaving}
            >
              {saveLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
