import type { ModalField } from '@/src/components/ui/AddEntryModal';

export function getDepartmentModalFields(
  tForm: (key: string) => string,
  showInMobileOptions: { value: string; label: string }[],
): ModalField[] {
  return [
    { name: 'en_name', label: tForm('enName'), required: true },
    { name: 'ar_name', label: tForm('arName'), required: true },
    {
      name: 'show_in_mobile',
      label: tForm('showInMobile'),
      type: 'select',
      options: showInMobileOptions,
      required: true,
    },
  ];
}
