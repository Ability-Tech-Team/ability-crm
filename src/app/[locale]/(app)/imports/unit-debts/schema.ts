import { z } from 'zod';
import type { FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import type { Translate } from '../_shared/types';
import { debitAmountProblem } from './utils';

/**
 * The manual unit debt form: one row of the unit debts sheet, saved through
 * `POST /projects/units/debt/:unit_id`. The unit is found by its number and
 * optional sub-project code, as in the sheet.
 */
export function createUnitDebtEntrySchema(t: Translate) {
  const required = t('required');

  return z.object({
    unit_number: z.string().trim().min(1, required).max(255, t('tooLong')),
    sub_project_code: z.string().optional(),
    debit_amount: z
      .string()
      .trim()
      .min(1, required)
      .superRefine((value, ctx) => {
        const problem = debitAmountProblem(value);
        if (problem) ctx.addIssue({ code: 'custom', message: t(problem) });
      }),
  });
}

export type UnitDebtEntryValues = z.infer<
  ReturnType<typeof createUnitDebtEntrySchema>
>;

export function getUnitDebtEntryFields(
  t: Translate,
  options: { subProjects: SelectOption[] },
): FieldConfig[] {
  return [
    { name: 'unit_number', label: t('unitDebts.unitNumber'), maxLength: 255 },
    {
      name: 'sub_project_code',
      label: t('unitDebts.subProject'),
      fieldType: 'select',
      options: options.subProjects,
      placeholder: t('unitDebts.anySubProject'),
    },
    {
      name: 'debit_amount',
      label: t('unitDebts.debitAmount'),
      inputMode: 'decimal',
      autoComplete: 'off',
      maxLength: 24,
    },
  ];
}
