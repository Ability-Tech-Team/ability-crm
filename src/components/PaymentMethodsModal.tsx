'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { X, Plus, Trash2 } from 'lucide-react';
import Button from './ui/Button';
import Input from './ui/Input';
import Select, { type SelectOption } from './ui/Select';
import type { DropdownOption } from '@/src/types/dropdowns';

export interface PaymentEntry {
  payment_type_id: string;
  total_amount: string;
  reference_number: string;
  visa_number: string;
  batch_number: string;
  bank_name: string;
  cheque_due_date: string;
  sister_company_id: string;
  mobile_number: string;
}

const emptyEntry = (): PaymentEntry => ({
  payment_type_id: '',
  total_amount: '',
  reference_number: '',
  visa_number: '',
  batch_number: '',
  bank_name: '',
  cheque_due_date: '',
  sister_company_id: '',
  mobile_number: '',
});

type PaymentTypeKey =
  | 'cash'
  | 'estimated_cost_refund'
  | 'visa'
  | 'online'
  | 'cheque'
  | 'instapay'
  | 'sister_company'
  | 'unknown';

const PAYMENT_TYPE_ID_MAP: Record<number, PaymentTypeKey> = {
  1: 'cash',
  2: 'visa',
  3: 'online',
  4: 'sister_company',
  5: 'cheque',
  6: 'instapay',
  7: 'estimated_cost_refund',
};

function getPaymentTypeKey(paymentTypeId: string): PaymentTypeKey {
  if (!paymentTypeId) return 'unknown';
  const id = Number(paymentTypeId);
  if (Number.isNaN(id)) return 'unknown';
  return PAYMENT_TYPE_ID_MAP[id] ?? 'unknown';
}

type ExtraField =
  | 'reference_number'
  | 'visa_number'
  | 'batch_number'
  | 'bank_name'
  | 'cheque_due_date'
  | 'sister_company_id'
  | 'mobile_number';

const ALL_EXTRA_FIELDS: ExtraField[] = [
  'reference_number',
  'visa_number',
  'batch_number',
  'bank_name',
  'cheque_due_date',
  'sister_company_id',
  'mobile_number',
];

const MOBILE_NUMBER_PATTERN = /^\d{11}$/;

function getVisibleFields(typeKey: PaymentTypeKey): Set<ExtraField> {
  switch (typeKey) {
    case 'cash':
    case 'estimated_cost_refund':
      return new Set();
    case 'visa':
      return new Set(['visa_number', 'reference_number', 'batch_number']);
    case 'online':
      return new Set(['visa_number', 'reference_number']);
    case 'cheque':
      return new Set(['bank_name', 'cheque_due_date', 'reference_number']);
    case 'instapay':
      return new Set(['reference_number', 'mobile_number']);
    case 'sister_company':
      return new Set(['sister_company_id']);
    default:
      return new Set(ALL_EXTRA_FIELDS);
  }
}

interface PaymentMethodsModalProps {
  open: boolean;
  totalAmount: number;
  runnerCashierAmount?: number;
  paymentTypes: DropdownOption[];
  sisterCompanies: DropdownOption[];
  onCollect: (entries: PaymentEntry[]) => void | Promise<void>;
  onCancel: () => void;
  isCollecting?: boolean;
}

export default function PaymentMethodsModal({
  open,
  totalAmount,
  runnerCashierAmount = 0,
  paymentTypes,
  sisterCompanies,
  onCollect,
  onCancel,
  isCollecting = false,
}: PaymentMethodsModalProps) {
  const t = useTranslations('invoices.detail');
  const tForm = useTranslations('form');
  const EPSILON = 0.0001;
  const overlayRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<PaymentEntry[]>([emptyEntry()]);
  const [focusedReferenceIndex, setFocusedReferenceIndex] = useState<
    number | null
  >(null);

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEntries([emptyEntry()]);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isCollecting) onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, isCollecting, onCancel]);

  // Prevent body scroll
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const updateEntry = useCallback(
    (index: number, field: keyof PaymentEntry, value: string) => {
      setEntries((prev) => {
        const updated = [...prev];

        if (field === 'payment_type_id') {
          const typeKey = getPaymentTypeKey(value);
          const visible = getVisibleFields(typeKey);
          const cleared: Partial<PaymentEntry> = {};
          for (const f of ALL_EXTRA_FIELDS) {
            if (!visible.has(f)) cleared[f] = '';
          }
          updated[index] = {
            ...updated[index],
            ...cleared,
            payment_type_id: value,
          };
          return updated;
        }

        if (field === 'total_amount') {
          const parsed = parseFloat(value);
          if (!value.trim() || Number.isNaN(parsed)) {
            updated[index] = { ...updated[index], [field]: value };
            return updated;
          }

          const othersTotal = prev.reduce((sum, entry, i) => {
            if (i === index) return sum;
            return sum + (parseFloat(entry.total_amount) || 0);
          }, 0);

          const maxForEntry = Math.max(totalAmount - othersTotal, 0);
          const safeAmount = Math.max(0, Math.min(parsed, maxForEntry));

          updated[index] = {
            ...updated[index],
            [field]: safeAmount.toString(),
          };
          return updated;
        }

        if (field === 'mobile_number') {
          updated[index] = {
            ...updated[index],
            [field]: value.replace(/\D/g, '').slice(0, 11),
          };
          return updated;
        }

        if (field === 'reference_number') {
          updated[index] = {
            ...updated[index],
            [field]: value.replace(/\D/g, '').slice(0, 10),
          };
          return updated;
        }

        updated[index] = { ...updated[index], [field]: value };
        return updated;
      });
    },
    [totalAmount],
  );

  const addEntry = useCallback(() => {
    setEntries((prev) => [...prev, emptyEntry()]);
  }, []);

  const removeEntry = useCallback((index: number) => {
    setEntries((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
    );
  }, []);

  if (!open) return null;

  const paymentTypeOptions: SelectOption[] = paymentTypes.map((pt) => ({
    value: String(pt.id),
    label: pt.name,
  }));

  const sisterCompanyOptions: SelectOption[] = sisterCompanies.map((sc) => ({
    value: String(sc.id),
    label: sc.name,
  }));

  const entriesTotal = entries.reduce(
    (sum, e) => sum + (parseFloat(e.total_amount) || 0),
    0,
  );
  const remaining = totalAmount - entriesTotal;
  const isOverpaid = entriesTotal - totalAmount > EPSILON;
  const isExactTotal = Math.abs(remaining) <= EPSILON;
  const canCollect =
    !isOverpaid &&
    isExactTotal &&
    entries.every((e) => {
      if (!e.payment_type_id || !(parseFloat(e.total_amount) > 0)) return false;
      const typeKey = getPaymentTypeKey(e.payment_type_id);
      const visible = getVisibleFields(typeKey);
      for (const f of visible) {
        if (!e[f]?.trim()) return false;
      }
      if (
        visible.has('mobile_number') &&
        !MOBILE_NUMBER_PATTERN.test(e.mobile_number.trim())
      ) {
        return false;
      }
      return true;
    });

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => {
        if (e.target === overlayRef.current && !isCollecting) onCancel();
      }}
    >
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button
          onClick={onCancel}
          disabled={isCollecting}
          className="absolute top-4 inset-e-4 p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <h2 className="text-lg font-semibold text-gray-900 mb-1">
          {t('paymentMethods')}
        </h2>
        <p className="text-sm text-slate-500 mb-4">
          {t('totalAmount')}:{' '}
          <span className="font-semibold text-slate-800">{totalAmount}</span>
        </p>
        <p className="text-sm text-slate-500 mb-4">
          {t('runnerCashierAmount')}:{' '}
          <span className="font-semibold text-slate-800">
            {runnerCashierAmount.toFixed(2)}
          </span>
        </p>

        {/* Entries */}
        <div className="flex flex-col gap-4">
          {entries.map((entry, index) => {
            const typeKey = getPaymentTypeKey(entry.payment_type_id);
            const visibleFields = entry.payment_type_id
              ? getVisibleFields(typeKey)
              : new Set<ExtraField>();
            const mobileNumberError =
              visibleFields.has('mobile_number') &&
              entry.mobile_number.trim() &&
              !MOBILE_NUMBER_PATTERN.test(entry.mobile_number.trim())
                ? 'Mobile number must be exactly 11 digits'
                : undefined;

            return (
              <div
                key={index}
                className="border border-slate-200 rounded-xl p-4 relative"
              >
                {entries.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeEntry(index)}
                    disabled={isCollecting}
                    className="absolute top-3 inset-e-3 p-1 text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    aria-label="Remove"
                  >
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Select
                    label={t('paymentType')}
                    name={`payment_type_${index}`}
                    options={paymentTypeOptions}
                    value={entry.payment_type_id}
                    disabled={isCollecting}
                    onChange={(e) =>
                      updateEntry(index, 'payment_type_id', e.target.value)
                    }
                  />
                  <Input
                    label={t('paymentAmount')}
                    name={`amount_${index}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={entry.total_amount}
                    disabled={isCollecting}
                    onChange={(e) =>
                      updateEntry(index, 'total_amount', e.target.value)
                    }
                    placeholder="0.00"
                  />

                  {visibleFields.has('reference_number') && (
                    <div>
                      <Input
                        label={
                          typeKey === 'cheque'
                            ? t('chequeNumber')
                            : t('referenceNumber')
                        }
                        name={`ref_${index}`}
                        type="tel"
                        inputMode="numeric"
                        maxLength={10}
                        value={entry.reference_number}
                        disabled={isCollecting}
                        aria-describedby={
                          typeKey === 'cheque'
                            ? `cheque_hint_${index}`
                            : undefined
                        }
                        onFocus={
                          typeKey === 'cheque'
                            ? () => setFocusedReferenceIndex(index)
                            : undefined
                        }
                        onBlur={
                          typeKey === 'cheque'
                            ? () => setFocusedReferenceIndex(null)
                            : undefined
                        }
                        onChange={(e) =>
                          updateEntry(index, 'reference_number', e.target.value)
                        }
                      />
                      {typeKey === 'cheque' &&
                        focusedReferenceIndex === index && (
                          <p
                            id={`cheque_hint_${index}`}
                            className="mt-1.5 text-sm text-slate-500"
                          >
                            {t('chequeNumberHint')}
                          </p>
                        )}
                    </div>
                  )}

                  {visibleFields.has('visa_number') && (
                    <Input
                      label={t('visaNumber')}
                      name={`visa_${index}`}
                      value={entry.visa_number}
                      disabled={isCollecting}
                      maxLength={16}
                      onChange={(e) =>
                        updateEntry(index, 'visa_number', e.target.value)
                      }
                    />
                  )}

                  {visibleFields.has('batch_number') && (
                    <Input
                      label={t('batchNumber')}
                      name={`batch_${index}`}
                      value={entry.batch_number}
                      disabled={isCollecting}
                      maxLength={18}
                      onChange={(e) =>
                        updateEntry(index, 'batch_number', e.target.value)
                      }
                    />
                  )}

                  {visibleFields.has('bank_name') && (
                    <Input
                      label={t('bankName')}
                      name={`bank_${index}`}
                      value={entry.bank_name}
                      disabled={isCollecting}
                      onChange={(e) =>
                        updateEntry(index, 'bank_name', e.target.value)
                      }
                    />
                  )}

                  {visibleFields.has('cheque_due_date') && (
                    <Input
                      label={t('chequeDueDate')}
                      name={`cheque_due_date_${index}`}
                      type="date"
                      value={entry.cheque_due_date}
                      disabled={isCollecting}
                      onChange={(e) =>
                        updateEntry(index, 'cheque_due_date', e.target.value)
                      }
                    />
                  )}

                  {visibleFields.has('mobile_number') && (
                    <Input
                      label={t('mobileNumber')}
                      name={`mobile_${index}`}
                      type="tel"
                      inputMode="numeric"
                      maxLength={11}
                      value={entry.mobile_number}
                      errors={
                        mobileNumberError ? [mobileNumberError] : undefined
                      }
                      disabled={isCollecting}
                      onChange={(e) =>
                        updateEntry(index, 'mobile_number', e.target.value)
                      }
                    />
                  )}

                  {visibleFields.has('sister_company_id') && (
                    <Select
                      label={t('sisterCompany')}
                      name={`sister_company_${index}`}
                      options={sisterCompanyOptions}
                      value={entry.sister_company_id}
                      disabled={isCollecting}
                      onChange={(e) =>
                        updateEntry(index, 'sister_company_id', e.target.value)
                      }
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add another method */}
        <button
          type="button"
          onClick={addEntry}
          disabled={isCollecting}
          className="mt-3 flex items-center gap-1.5 text-sm text-sky-600 hover:text-sky-700 font-medium transition-colors disabled:opacity-50"
        >
          <Plus size={16} />
          {t('addPaymentMethod')}
        </button>

        {/* Summary */}
        <div className="mt-4 p-3 rounded-lg bg-slate-50 flex flex-wrap items-center justify-between gap-2 text-sm">
          <div className="flex gap-4">
            <span className="text-slate-600">
              {t('paymentsTotal')}:{' '}
              <span className="font-semibold text-slate-800">
                {entriesTotal.toFixed(2)}
              </span>
            </span>
            <span
              className={
                isOverpaid
                  ? 'text-red-600'
                  : remaining > 0
                    ? 'text-amber-600'
                    : 'text-emerald-600'
              }
            >
              {t('remaining')}:{' '}
              <span className="font-semibold">
                {isOverpaid
                  ? '0.00'
                  : remaining > 0
                    ? remaining.toFixed(2)
                    : '0.00'}
              </span>
            </span>
          </div>
        </div>

        {isOverpaid && (
          <p className="mt-2 text-sm text-red-600">
            {t('paymentsTotal')} {t('totalAmount').toLowerCase()}.
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end mt-5">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={onCancel}
            disabled={isCollecting}
          >
            {tForm('cancel')}
          </Button>
          <Button
            type="button"
            variant="success"
            size="md"
            isLoading={isCollecting}
            disabled={!canCollect}
            onClick={() => onCollect(entries)}
          >
            {t('collect')}
          </Button>
        </div>
      </div>
    </div>
  );
}
