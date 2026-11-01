import type { ModalField } from '@/src/components/ui/AddEntryModal';

export const positionsModalFields: ModalField[] = [
  { name: 'en_name', label: 'English Name', required: true },
  { name: 'ar_name', label: 'Arabic Name', required: true },
];

export function getPositionsModalFields(
  tForm: (key: string) => string,
): ModalField[] {
  return positionsModalFields.map((field) => ({
    ...field,
    label: field.name === 'en_name' ? tForm('enName') : tForm('arName'),
  }));
}
