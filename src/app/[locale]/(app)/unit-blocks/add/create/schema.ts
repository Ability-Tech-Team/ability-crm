import { z } from 'zod';
import type { ButtonConfig, FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import type { BlockTypeTab } from './types';

type Translate = (key: string) => string;

/**
 * The endpoint requires `category_id` on every create, but the picker is only
 * shown for a legal block, so a finance block is filed under this one.
 */
export const FINANCE_CATEGORY_ID = 1;

/**
 * The tab strip stands in for the block-type select. `is_legal` still travels
 * through the form so the schema can require a category and a lawyer for a
 * legal block; the tab just decides its value.
 */
export const TABS: BlockTypeTab[] = [
  {
    id: 'finance',
    isLegal: 0,
    labelKey: 'tabs.finance',
    privilege: PRIVILEGE_IDS.FINANCE_BLOCK,
  },
  {
    id: 'legal',
    isLegal: 1,
    labelKey: 'tabs.legal',
    privilege: PRIVILEGE_IDS.LEGAL_BLOCK,
  },
];

/**
 * Reason is only demanded when raising a block. On a unit that already carries
 * one the form is an edit, and the action on offer is lifting it, so an empty
 * reason must not stand in the way.
 */
export function buildBlockSchema(isCreating: boolean) {
  return z
    .object({
      unitNumber: z.string().optional(),
      projectName: z.string().optional(),
      unitType: z.string().optional(),
      customerName: z.string().optional(),
      mobileNumber: z.string().optional(),
      is_legal: z.string().min(1, 'Block type is required'),
      category_id: z.string().optional(),
      reason: isCreating
        ? z.string().min(1, 'Reason is required')
        : z.string().optional(),
      assign_to_id: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      // '1' is the legal tab's `isLegal`, carried through the form.
      if (data.is_legal !== '1') return;

      if (!data.category_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['category_id'],
          message: 'Category is required',
        });
      }

      if (!data.assign_to_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['assign_to_id'],
          message: 'Assigned to is required for a legal block',
        });
      }
    });
}

export function getBlockFields(
  t: Translate,
  isLegalBlock: boolean,
  isEditing: boolean,
  categoryOptions: SelectOption[],
  assigneeOptions: SelectOption[],
): FieldConfig[] {
  const required = (label: string) => `${label} *`;

  return [
    {
      name: 'unitNumber',
      label: t('create.unitNumber'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'projectName',
      label: t('create.projectName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'unitType',
      label: t('create.unitType'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'customerName',
      label: t('create.customerName'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'mobileNumber',
      label: t('create.mobileNumber'),
      type: 'text',
      disabled: true,
    },
    ...(isLegalBlock
      ? [
          {
            name: 'category_id',
            label: required(t('create.category')),
            placeholder: t('create.selectCategory'),
            fieldType: 'select',
            options: categoryOptions,
          } satisfies FieldConfig,
          {
            name: 'assign_to_id',
            label: required(t('create.assignedTo')),
            placeholder: t('create.selectAssignedTo'),
            fieldType: 'select',
            options: assigneeOptions,
          } satisfies FieldConfig,
        ]
      : []),
    {
      name: 'reason',
      // Only demanded when raising the block; on an edit the action on offer
      // is lifting it, so the reason is left alone.
      label: isEditing ? t('create.reason') : required(t('create.reason')),
      placeholder: t('create.reasonPlaceholder'),
      fieldType: 'textarea',
      rows: 4,
      containerClassName: 'sm:col-span-2',
    },
  ];
}

export function getBlockButtons(
  t: Translate,
  tForm: Translate,
  canSave: boolean,
  isEditing: boolean,
  onCancel: () => void,
): ButtonConfig[] {
  return [
    {
      label: t('edit.saveChanges'),
      loadingLabel: t('create.submitting'),
      type: 'submit',
      variant: 'primary',
      // There is nothing to save until the unit carries a block: raising one
      // is the green button's job.
      disabled: !isEditing || !canSave,
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: onCancel,
    },
  ];
}
