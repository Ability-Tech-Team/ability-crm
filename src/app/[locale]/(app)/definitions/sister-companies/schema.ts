import type { ModalField } from '@/src/components/ui/AddEntryModal';

export const sisterCompaniesModalFields: ModalField[] = [
  { name: 'en_name', label: 'English Name', required: true },
  { name: 'ar_name', label: 'Arabic Name', required: true },
];

export function getSisterCompaniesModalFields(
  tForm: (key: string) => string,
): ModalField[] {
  return sisterCompaniesModalFields.map((field) => ({
    ...field,
    label: field.name === 'en_name' ? tForm('enName') : tForm('arName'),
  }));
}
