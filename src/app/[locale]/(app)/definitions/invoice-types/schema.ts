import type { ModalField } from '@/src/components/ui/AddEntryModal';
import type { SelectOption } from '@/src/components/ui/Select';

export function getInvoiceTypesModalFields(
  tForm: (key: string) => string,
  erpAccountCodeOptions: SelectOption[] = [],
): ModalField[] {
  return [
    { name: 'en_name', label: tForm('enName'), required: true },
    { name: 'ar_name', label: tForm('arName'), required: true },
    {
      name: 'erp_account_code_id',
      label: tForm('erpAccountCode'),
      type: 'select',
      options: erpAccountCodeOptions,
    },
    {
      name: 'is_rental',
      label: tForm('isRental'),
      type: 'checkbox',
    },
    {
      name: 'description',
      label: tForm('description'),
    },
  ];
}
