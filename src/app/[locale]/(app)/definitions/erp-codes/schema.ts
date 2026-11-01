import type { ModalField } from '@/src/components/ui/AddEntryModal';

export function getErpCodesModalFields(
  tForm: (key: string) => string,
): ModalField[] {
  return [
    { name: 'code', label: tForm('erpCode'), required: true },
    { name: 'name', label: tForm('erpName'), required: true },
  ];
}
