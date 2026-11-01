import { z } from 'zod';
import type { ButtonConfig, FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import type { SearchTab } from './types';

type Translate = (key: string) => string;

export const LIMIT = 10;

export const TABS: SearchTab[] = [
  {
    id: 'all',
    labelKey: 'tabs.all',
    titleKey: 'tabs.allTitle',
    isLegal: undefined,
    showsUnits: true,
    // `is_active` is not sent to /projects/units; the endpoint's own
    // `blocked_units=1` already limits it to units holding a block.
    defaultIsActive: '',
    // The overview mixes both kinds of block, so it takes both privileges.
    privileges: [PRIVILEGE_IDS.FINANCE_BLOCK, PRIVILEGE_IDS.LEGAL_BLOCK],
    hiddenColumnIds: [],
    // `/projects/units` only accepts these three of our filters.
    hiddenFieldNames: [
      'category_id',
      'project_id',
      'customer_name',
      'customer_mobile',
      'assign_to_id',
      'is_active',
      'from_date',
      'to_date',
    ],
    // Unchanged from before the tabs existed, so saved columns survive.
    persistKey: 'unit-blocks-search-columns',
  },
  {
    // A finance block carries no category and no lawyer, and every row here
    // is a finance block, so the type badge says nothing.
    id: 'finance',
    labelKey: 'tabs.finance',
    titleKey: 'tabs.financeTitle',
    isLegal: 0,
    defaultIsActive: '1',
    privileges: [PRIVILEGE_IDS.FINANCE_BLOCK],
    hiddenColumnIds: [
      'category_name',
      'block_type',
      'is_finance_block',
      'is_legal_block',
    ],
    hiddenFieldNames: [
      'category_id',
      'assign_to_id',
      'is_active',
      'block_kind',
    ],
    persistKey: 'unit-blocks-search-columns-finance',
  },
  {
    id: 'legal',
    labelKey: 'tabs.legal',
    titleKey: 'tabs.legalTitle',
    isLegal: 1,
    defaultIsActive: '1',
    privileges: [PRIVILEGE_IDS.LEGAL_BLOCK],
    hiddenColumnIds: ['block_type', 'is_finance_block', 'is_legal_block'],
    hiddenFieldNames: ['is_active', 'block_kind'],
    persistKey: 'unit-blocks-search-columns-legal',
  },
];

export const searchSchema = z.object({
  unit_id: z.string().optional(),
  unit_number: z.string().optional(),
  is_exact: z.string().optional(),
  category_id: z.string().optional(),
  project_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_mobile: z.string().optional(),
  assign_to_id: z.string().optional(),
  is_active: z.string().optional(),
  block_kind: z.string().optional(),
  from_date: z.string().optional(),
  to_date: z.string().optional(),
});

export function getSearchFields(
  t: Translate,
  tForm: Translate,
  tCommon: Translate,
  categoryOptions: SelectOption[],
  projectOptions: SelectOption[],
  assigneeOptions: SelectOption[],
  statusOptions: SelectOption[],
): FieldConfig[] {
  return [
    {
      name: 'unit_number',
      label: t('filters.unitNumber'),
      placeholder: t('filters.unitNumber'),
      type: 'text',
    },
    {
      name: 'unit_id',
      label: t('filters.unitId'),
      placeholder: t('filters.unitId'),
      type: 'text',
      onlyNumbers: true,
    },
    {
      name: 'category_id',
      label: t('filters.category'),
      placeholder: t('filters.selectCategory'),
      fieldType: 'select',
      options: categoryOptions,
    },
    {
      name: 'project_id',
      label: t('filters.project'),
      placeholder: t('filters.selectProject'),
      fieldType: 'select',
      options: projectOptions,
    },
    {
      name: 'customer_name',
      label: t('filters.customerName'),
      placeholder: t('filters.customerName'),
      type: 'text',
    },
    {
      name: 'customer_mobile',
      label: t('filters.customerMobile'),
      placeholder: t('filters.customerMobile'),
      type: 'text',
    },
    {
      name: 'assign_to_id',
      label: t('filters.assignedTo'),
      placeholder: t('filters.selectAssignedTo'),
      fieldType: 'select',
      options: assigneeOptions,
    },
    {
      name: 'block_kind',
      label: t('columns.blockType'),
      placeholder: tCommon('all'),
      fieldType: 'select',
      options: [
        { value: '0', label: t('financeShort') },
        { value: '1', label: t('legalShort') },
      ],
    },
    {
      name: 'is_active',
      label: t('filters.status'),
      placeholder: t('filters.selectStatus'),
      fieldType: 'select',
      options: statusOptions,
    },
    {
      name: 'from_date',
      label: t('filters.fromDate'),
      placeholder: t('filters.fromDate'),
      type: 'date',
    },
    {
      name: 'to_date',
      label: t('filters.toDate'),
      placeholder: t('filters.toDate'),
      type: 'date',
    },
    {
      name: 'is_exact',
      label: t('filters.isExact'),
      fieldType: 'checkbox',
    },
  ];
}

export function getSearchButtons(tForm: Translate): ButtonConfig[] {
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
