'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import Input from '@/src/components/ui/Input';
import Select, { type SelectOption } from '@/src/components/ui/Select';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  updateCustomer,
  type Customer,
  type UpdateCustomerDto,
} from '@/src/services/customers';
import {
  isAcceptablePhoneInput,
  PHONE_INPUT_MAX_LENGTH,
} from '@/src/lib/phone';

interface CustomerEditModalProps {
  open: boolean;
  customer: Customer;
  onClose: () => void;
  onSuccess: () => void;
}

type FormState = {
  id_type: string;
  id_number: string;
  mobile_number: string;
  first_address: string;
  email: string;
};

type FormErrors = Partial<Record<keyof FormState, string>>;
type TextFormField = Extract<
  keyof FormState,
  'id_number' | 'mobile_number' | 'first_address' | 'email'
>;

function toFormState(customer: Customer): FormState {
  return {
    id_type: customer.id_type != null ? String(customer.id_type) : '',
    id_number: customer.id_number ?? '',
    mobile_number: customer.mobile_number ?? '',
    first_address: customer.first_address ?? '',
    email: customer.email ?? '',
  };
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function buildUpdatedCustomerPayload(
  customer: Customer,
  form: FormState,
): UpdateCustomerDto {
  const payload: UpdateCustomerDto = {};
  const currentIdType = form.id_type ? Number(form.id_type) : null;

  if (currentIdType !== (customer.id_type ?? null)) {
    payload.id_type = currentIdType;
  }

  const textFields: TextFormField[] = [
    'id_number',
    'mobile_number',
    'first_address',
    'email',
  ];

  for (const field of textFields) {
    const currentValue = normalizeText(form[field]);
    const originalValue = normalizeText(customer[field]);

    if (currentValue !== originalValue) {
      payload[field] = currentValue || null;
    }
  }

  return payload;
}

export default function CustomerEditModal({
  open,
  customer,
  onClose,
  onSuccess,
}: CustomerEditModalProps) {
  const t = useTranslations('customers.detail');
  const tForm = useTranslations('form');
  const tEdit = useTranslations('customers.edit');
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState<FormState>(() => toFormState(customer));
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  // Reset the form whenever the modal opens (adjusted during render).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setForm(toFormState(customer));
      setErrors({});
    }
  }

  // Escape key handler
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

  if (!open) return null;

  const idTypeOptions: SelectOption[] = (dropdowns?.id_types ?? []).map(
    (opt) => ({ value: String(opt.id), label: opt.name }),
  );
  const hasChanges =
    Object.keys(buildUpdatedCustomerPayload(customer, form)).length > 0;

  const handleChange = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const validate = (): boolean => {
    const next: FormErrors = {};

    if (form.id_number.trim()) {
      const len = form.id_number.trim().length;
      if (len < 5 || len > 14) {
        next.id_number = tEdit('idNumberLengthError');
      }
    }

    if (form.mobile_number.trim()) {
      if (!isAcceptablePhoneInput(form.mobile_number)) {
        next.mobile_number = tEdit('mobileNumberFormatError');
      }
    }

    if (form.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
        next.email = tEdit('emailFormatError');
      }
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const payload = buildUpdatedCustomerPayload(customer, form);
    if (Object.keys(payload).length === 0) {
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      await updateCustomer(customer.id, payload);
      showSuccess('updateSuccess');
      onSuccess();
    } catch (err) {
      showError(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative w-full max-w-lg mx-4 rounded-2xl bg-white p-6 shadow-xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-5">
          {tEdit('title')}
        </h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Customer Code (read-only) */}
          <Input
            label={t('customerCode')}
            name="customer_code"
            type="text"
            value={customer.customer_code ?? ''}
            onChange={() => undefined}
            readOnly
            disabled
          />

          {/* ID Type */}
          <Select
            label={t('idType')}
            name="id_type"
            options={idTypeOptions}
            placeholder={tEdit('selectIdType')}
            value={form.id_type}
            onChange={(e) => handleChange('id_type', e.target.value)}
            errors={errors.id_type ? [errors.id_type] : undefined}
            searchable
          />

          {/* ID Number */}
          <Input
            label={t('idNumber')}
            name="id_number"
            type="text"
            value={form.id_number}
            onChange={(e) => handleChange('id_number', e.target.value)}
            placeholder={tEdit('idNumberPlaceholder')}
            minLength={5}
            maxLength={14}
            errors={errors.id_number ? [errors.id_number] : undefined}
          />

          {/* Mobile Number */}
          <Input
            label={t('mobile')}
            name="mobile_number"
            type="text"
            value={form.mobile_number}
            onChange={(e) => handleChange('mobile_number', e.target.value)}
            placeholder={tEdit('mobileNumberPlaceholder')}
            maxLength={PHONE_INPUT_MAX_LENGTH}
            inputMode="tel"
            dir="ltr"
            errors={errors.mobile_number ? [errors.mobile_number] : undefined}
          />

          {/* First Address */}
          <Input
            label={t('firstAddress')}
            name="first_address"
            type="text"
            value={form.first_address}
            onChange={(e) => handleChange('first_address', e.target.value)}
            placeholder={tEdit('firstAddressPlaceholder')}
            errors={errors.first_address ? [errors.first_address] : undefined}
          />

          {/* Email */}
          <Input
            label={t('email')}
            name="email"
            type="email"
            value={form.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder={tEdit('emailPlaceholder')}
            errors={errors.email ? [errors.email] : undefined}
          />

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={isSaving}
            >
              {tForm('cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={isSaving}
              disabled={!hasChanges}
            >
              {tForm('save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
