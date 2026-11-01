import { z } from 'zod';
import type { ButtonConfig, FieldConfig } from '@/src/components/Form';
import type { SelectOption } from '@/src/components/ui/Select';
import type { EditBlockTab } from './types';

type Translate = (key: string) => string;

/** The tab strip stands in for the block-type select this page used to show. */
export const TABS: EditBlockTab[] = [
  { id: 'finance', isLegal: 0, labelKey: 'tabs.finance' },
  { id: 'legal', isLegal: 1, labelKey: 'tabs.legal' },
];

export const editBlockSchema = z.object({
  unitNumber: z.string().optional(),
  projectName: z.string().optional(),
  categoryName: z.string().optional(),
  blockedByName: z.string().optional(),
  blockedDate: z.string().optional(),
  // Not demanded here: this page always has a block, and the action on offer
  // is lifting it, so an empty reason must not block the save.
  reason: z.string().optional(),
  assign_to_id: z.string().optional(),
});

export function getEditBlockFields(
  t: Translate,
  isLegalBlock: boolean,
  assigneeOptions: SelectOption[],
): FieldConfig[] {
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
      // The update endpoint takes no `category_id`, so a change here would be
      // dropped; it is shown read-only rather than offered.
      name: 'categoryName',
      label: t('create.category'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'blockedByName',
      label: t('columns.blockedBy'),
      type: 'text',
      disabled: true,
    },
    {
      name: 'blockedDate',
      label: t('columns.blockedDate'),
      type: 'text',
      disabled: true,
    },
    ...(isLegalBlock
      ? [
          {
            name: 'assign_to_id',
            label: t('create.assignedTo'),
            placeholder: t('create.selectAssignedTo'),
            fieldType: 'select',
            options: assigneeOptions,
          } satisfies FieldConfig,
        ]
      : []),
    {
      name: 'reason',
      label: t('create.reason'),
      placeholder: t('create.reasonPlaceholder'),
      fieldType: 'textarea',
      rows: 4,
      containerClassName: 'sm:col-span-2',
    },
  ];
}

export function getEditBlockButtons(
  t: Translate,
  tForm: Translate,
  canEdit: boolean,
  onCancel: () => void,
): ButtonConfig[] {
  return [
    {
      label: t('edit.saveChanges'),
      loadingLabel: tForm('updating'),
      type: 'submit',
      variant: 'primary',
      disabled: !canEdit,
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: onCancel,
    },
  ];
}
