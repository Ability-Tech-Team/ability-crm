import type { ModalField } from '@/src/components/ui/AddEntryModal';

export function getUnitBlockCategoriesModalFields(
  tForm: (key: string) => string,
): ModalField[] {
  return [
    {
      name: 'en_name',
      label: tForm('enName'),
      required: true,
    },
    {
      name: 'ar_name',
      label: tForm('arName'),
      required: true,
    },
  ];
}
