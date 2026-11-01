import type { ModalField } from '@/src/components/ui/AddEntryModal';
import type { LocationTypeSelectOption } from './types';

export function getLocationModalFields(
  tForm: (key: string) => string,
  tLoc: (key: string) => string,
  locationTypeOptions: LocationTypeSelectOption[],
): ModalField[] {
  return [
    { name: 'en_name', label: tForm('enName'), required: true },
    { name: 'ar_name', label: tForm('arName'), required: true },
    {
      name: 'location_type_id',
      label: tLoc('locationType'),
      type: 'select',
      options: locationTypeOptions,
      required: true,
    },
    {
      name: 'location_code',
      label: tLoc('locationCode'),
    },
  ];
}
