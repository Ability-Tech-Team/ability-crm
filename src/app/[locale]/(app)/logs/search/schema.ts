import { z } from 'zod';
import type { ButtonConfig, FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';

type Translate = (key: string) => string;

export const LIMIT = 10;

/** Every filter is optional: left blank it is simply not sent. */
export const logsSearchSchema = z.object({
  module_id: z.string().optional(),
  log_action_id: z.string().optional(),
  created_by: z.string().optional(),
  record_id: z.string().optional(),
  search: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export function getLogsSearchFields(
  t: Translate,
  tForm: Translate,
  tCommon: Translate,
  moduleOptions: SelectOption[],
  actionOptions: SelectOption[],
  employeeOptions: SelectOption[],
): FieldConfig[] {
  return [
    {
      name: 'module_id',
      label: t('filters.module'),
      placeholder: tCommon('all'),
      fieldType: 'select',
      options: moduleOptions,
    },
    {
      name: 'log_action_id',
      label: t('filters.action'),
      placeholder: tCommon('all'),
      fieldType: 'select',
      options: actionOptions,
    },
    {
      name: 'created_by',
      label: tForm('createdBy'),
      placeholder: tCommon('all'),
      fieldType: 'select',
      options: employeeOptions,
    },
    {
      name: 'record_id',
      label: t('filters.recordId'),
      placeholder: t('filters.recordId'),
      type: 'text',
    },
    {
      name: 'search',
      label: t('filters.search'),
      placeholder: t('filters.search'),
      type: 'text',
    },
    {
      name: 'from_date',
      label: tForm('dateFrom'),
      placeholder: tForm('dateFrom'),
      type: 'date',
    },
    {
      name: 'to_date',
      label: tForm('dateTo'),
      placeholder: tForm('dateTo'),
      type: 'date',
    },
  ];
}

export function getLogsSearchButtons(tForm: Translate): ButtonConfig[] {
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
