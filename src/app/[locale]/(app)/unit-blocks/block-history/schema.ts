import { z } from 'zod';
import type { ButtonConfig, FieldConfig } from '@/src/components/Form';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import type { HistoryTab } from './types';

type Translate = (key: string) => string;

export const LIMIT = 10;

/** One tab per block kind; the tab supplies `is_legal`, not a filter field. */
export const TABS: HistoryTab[] = [
  {
    id: 'finance',
    isLegal: 0,
    labelKey: 'tabs.finance',
    titleKey: 'blockHistory.financeTitle',
    privilege: PRIVILEGE_IDS.FINANCE_BLOCK,
    persistKey: 'unit-blocks-history-columns-finance',
  },
  {
    id: 'legal',
    isLegal: 1,
    labelKey: 'tabs.legal',
    titleKey: 'blockHistory.legalTitle',
    privilege: PRIVILEGE_IDS.LEGAL_BLOCK,
    persistKey: 'unit-blocks-history-columns-legal',
  },
];

/** Every filter is optional: left blank it is simply not sent. */
export const historySchema = z.object({
  unit_id: z.string().optional(),
  unit_number: z.string().optional(),
  is_active: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
  is_exact: z.string().optional(),
});

export function getHistoryFields(
  t: Translate,
  tForm: Translate,
  tCommon: Translate,
): FieldConfig[] {
  return [
    {
      name: 'unit_number',
      label: t('columns.unitNumber'),
      placeholder: t('columns.unitNumber'),
      type: 'text',
    },
    {
      name: 'unit_id',
      label: t('columns.unitId'),
      placeholder: t('columns.unitId'),
      type: 'text',
      onlyNumbers: true,
    },
    {
      name: 'is_active',
      label: t('columns.status'),
      placeholder: tCommon('all'),
      fieldType: 'select',
      options: [
        { value: '1', label: tForm('isActive') },
        { value: '0', label: tForm('inactive') },
      ],
    },
    {
      name: 'from_date',
      label: t('filters.fromDate'),
      type: 'date',
    },
    {
      name: 'to_date',
      label: t('filters.toDate'),
      type: 'date',
    },
    {
      name: 'is_exact',
      label: t('filters.isExact'),
      fieldType: 'checkbox',
    },
  ];
}

export function getHistoryButtons(tForm: Translate): ButtonConfig[] {
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
