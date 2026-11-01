import { z } from 'zod';
import type { ButtonConfig, FieldConfig } from '@/src/components/Form';

type Translate = (key: string) => string;

/** Only the unit is searched here; the block itself is raised on the next page. */
export const unitSearchSchema = z.object({
  unit_number: z.string().optional(),
  unit_id: z.string().optional(),
  is_exact: z.string().optional(),
});

export function getUnitSearchFields(tForm: Translate): FieldConfig[] {
  return [
    {
      name: 'unit_number',
      label: tForm('unitNumber'),
      placeholder: tForm('unitNumber'),
      type: 'text',
    },
    {
      name: 'unit_id',
      label: tForm('unitId'),
      placeholder: tForm('unitId'),
      type: 'text',
      onlyNumbers: true,
    },
    {
      name: 'is_exact',
      label: tForm('isExact'),
      fieldType: 'checkbox',
    },
  ];
}

export function getUnitSearchButtons(tForm: Translate): ButtonConfig[] {
  return [
    {
      label: tForm('search'),
      loadingLabel: tForm('searching'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('clear'),
      type: 'reset',
      variant: 'secondary',
    },
  ];
}
