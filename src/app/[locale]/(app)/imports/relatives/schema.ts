import { z } from 'zod';
import type { FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import { isAcceptablePhoneInput, PHONE_INPUT_MAX_LENGTH } from '@/src/lib/phone';
import type { Translate } from '../_shared/types';
import {
  EMAIL,
  ID_TYPE_NATIONAL_ID,
  idNumberProblem,
  optionalId,
} from '../_shared/utils';

/**
 * The manual relative form: one row of the relatives sheet
 * (`POST /customers/relatives`). The owner and the unit are found by ID
 * number and unit number, as in the sheet.
 */
export function createRelativeEntrySchema(t: Translate) {
  const required = t('required');

  return z
    .object({
      owner_id_number: z.string().trim().min(1, required).max(50, t('tooLong')),
      unit_number: z.string().trim().min(1, required).max(255, t('tooLong')),
      sub_project_code: z.string().optional(),
      relative_name: z.string().trim().min(1, required).max(255, t('tooLong')),
      id_type: z.string().optional(),
      relative_id_number: z.string().trim().min(1, required),
      is_male: z.string().optional(),
      relation: z.string().max(255, t('tooLong')).optional(),
      mobile_number: z
        .string()
        .optional()
        .refine(
          (value) => !value?.trim() || isAcceptablePhoneInput(value),
          t('invalidPhone'),
        ),
      email: z
        .string()
        .optional()
        .refine(
          (value) => !value?.trim() || EMAIL.test(value.trim()),
          t('invalidEmail'),
        ),
    })
    .superRefine((values, ctx) => {
      // Without a type the backend checks the number as a National ID, as the sheet does.
      const problem = idNumberProblem(
        values.relative_id_number,
        optionalId(values.id_type) ?? ID_TYPE_NATIONAL_ID,
      );
      if (values.relative_id_number.trim() && problem) {
        ctx.addIssue({
          code: 'custom',
          path: ['relative_id_number'],
          message: t(problem),
        });
      }
      if (
        values.relative_id_number.trim() &&
        values.relative_id_number.trim().toUpperCase() ===
          values.owner_id_number.trim().toUpperCase()
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['relative_id_number'],
          message: t('relatives.sameAsOwner'),
        });
      }
    });
}

export type RelativeEntryValues = z.infer<
  ReturnType<typeof createRelativeEntrySchema>
>;

export type RelativeEntryOptions = {
  subProjects: SelectOption[];
  idTypes: SelectOption[];
  genders: SelectOption[];
};

export function getRelativeEntryFields(
  t: Translate,
  options: RelativeEntryOptions,
): FieldConfig[] {
  return [
    {
      name: 'owner_id_number',
      label: t('relatives.ownerIdNumber'),
      maxLength: 50,
    },
    { name: 'unit_number', label: t('relatives.unitNumber'), maxLength: 255 },
    {
      name: 'sub_project_code',
      label: t('relatives.subProject'),
      fieldType: 'select',
      options: options.subProjects,
      placeholder: t('relatives.anySubProject'),
    },
    {
      name: 'relative_name',
      label: t('relatives.relativeName'),
      maxLength: 255,
      containerClassName: 'sm:col-start-1',
    },
    {
      name: 'id_type',
      label: t('relatives.idType'),
      fieldType: 'select',
      options: options.idTypes,
      placeholder: t('relatives.idTypeDefault'),
    },
    {
      name: 'relative_id_number',
      label: t('relatives.relativeIdNumber'),
      maxLength: 50,
    },
    {
      name: 'is_male',
      label: t('relatives.gender'),
      fieldType: 'select',
      options: options.genders,
    },
    { name: 'relation', label: t('relatives.relation'), maxLength: 255 },
    {
      name: 'mobile_number',
      label: t('relatives.mobile'),
      type: 'tel',
      inputMode: 'tel',
      maxLength: PHONE_INPUT_MAX_LENGTH,
    },
    { name: 'email', label: t('relatives.email'), type: 'email', maxLength: 255 },
  ];
}
