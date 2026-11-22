import { z } from 'zod';
import type { FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import type { Translate } from '../_shared/types';
import { NON_NEGATIVE_WHOLE_NUMBER, WHOLE_NUMBER } from '../_shared/utils';

/** The manual unit form: `POST /projects/unit`, into the sign-in project. */
export function createUnitEntrySchema(t: Translate) {
  const required = t('required');
  const blankOr = (pattern: RegExp, message: string) =>
    z
      .string()
      .optional()
      .refine((value) => !value?.trim() || pattern.test(value.trim()), message);

  return z.object({
    unit_number: z.string().trim().min(1, required).max(255, t('tooLong')),
    sub_project_id: z.string().optional(),
    unit_type_id: z.string().min(1, required),
    location_id: z.string().min(1, required),
    total_area: z
      .string()
      .trim()
      .min(1, required)
      .refine(
        (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
        t('nonNegativeNumber'),
      ),
    floor: blankOr(WHOLE_NUMBER, t('wholeNumber')),
    address: z.string().max(255, t('tooLong')).optional(),
    room_no: blankOr(NON_NEGATIVE_WHOLE_NUMBER, t('wholeNumber')),
    path_room_no: blankOr(NON_NEGATIVE_WHOLE_NUMBER, t('wholeNumber')),
    living_room_no: blankOr(NON_NEGATIVE_WHOLE_NUMBER, t('wholeNumber')),
    balcony_no: blankOr(NON_NEGATIVE_WHOLE_NUMBER, t('wholeNumber')),
    delivery_date: z.string().optional(),
    contracting_date: z.string().optional(),
    notes: z.string().max(1000, t('tooLong')).optional(),
    is_active: z.string().optional(),
    is_furnished: z.string().optional(),
    is_broker: z.string().optional(),
    is_eligible_for_rent: z.string().optional(),
  });
}

export type UnitEntryValues = z.infer<ReturnType<typeof createUnitEntrySchema>>;

export type UnitEntryOptions = {
  subProjects: SelectOption[];
  unitTypes: SelectOption[];
  locations: SelectOption[];
};

export function getUnitEntryFields(
  t: Translate,
  options: UnitEntryOptions,
): FieldConfig[] {
  const number = (name: string, label: string): FieldConfig => ({
    name,
    label: t(label),
    inputMode: 'numeric',
    maxLength: 9,
  });

  return [
    { name: 'unit_number', label: t('units.unitNumber'), maxLength: 255 },
    {
      name: 'sub_project_id',
      label: t('units.subProject'),
      fieldType: 'select',
      options: options.subProjects,
      placeholder: t('units.noSubProject'),
    },
    {
      name: 'unit_type_id',
      label: t('units.unitType'),
      fieldType: 'select',
      options: options.unitTypes,
    },
    {
      name: 'location_id',
      label: t('units.location'),
      fieldType: 'select',
      options: options.locations,
    },
    {
      name: 'total_area',
      label: t('units.totalArea'),
      inputMode: 'decimal',
      positiveNumberOnly: true,
      maxLength: 12,
    },
    number('floor', 'units.floor'),
    { name: 'address', label: t('units.address'), maxLength: 255 },
    number('room_no', 'units.rooms'),
    number('path_room_no', 'units.bathrooms'),
    number('living_room_no', 'units.livingRooms'),
    number('balcony_no', 'units.balconies'),
    { name: 'delivery_date', label: t('units.deliveryDate'), type: 'date' },
    {
      name: 'contracting_date',
      label: t('units.contractingDate'),
      type: 'date',
    },
    {
      name: 'notes',
      label: t('units.notes'),
      fieldType: 'textarea',
      rows: 2,
      maxLength: 1000,
      containerClassName: 'sm:col-span-2',
    },
    { name: 'is_active', label: t('units.isActive'), fieldType: 'checkbox' },
    {
      name: 'is_eligible_for_rent',
      label: t('units.isEligibleForRent'),
      fieldType: 'checkbox',
    },
    {
      name: 'is_furnished',
      label: t('units.isFurnished'),
      fieldType: 'checkbox',
    },
    { name: 'is_broker', label: t('units.isBroker'), fieldType: 'checkbox' },
  ];
}
