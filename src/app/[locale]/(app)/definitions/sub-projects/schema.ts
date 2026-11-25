import type { ModalField } from '@/src/components/ui/AddEntryModal';
import type { SelectOption } from '@/src/components/ui/Select';
import {
  SUB_PROJECT_CODE_MAX_LENGTH,
  SUB_PROJECT_NAME_MAX_LENGTH,
} from './utils';

/** The add and edit form: the project is fixed once the sub-project exists. */
export function getSubProjectModalFields(
  t: (key: string) => string,
  tForm: (key: string) => string,
  projectOptions: SelectOption[],
  isEditing: boolean,
): ModalField[] {
  return [
    {
      name: 'project_id',
      label: t('project'),
      type: 'select',
      options: projectOptions,
      required: true,
      disabled: isEditing,
    },
    {
      name: 'project_code',
      label: t('code'),
      required: true,
      maxLength: SUB_PROJECT_CODE_MAX_LENGTH,
    },
    {
      name: 'en_name',
      label: tForm('enName'),
      required: true,
      maxLength: SUB_PROJECT_NAME_MAX_LENGTH,
    },
    {
      name: 'ar_name',
      label: tForm('arName'),
      required: true,
      maxLength: SUB_PROJECT_NAME_MAX_LENGTH,
    },
  ];
}
