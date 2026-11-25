import type { ModalField } from '@/src/components/ui/AddEntryModal';
import { PROJECT_CODE_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from './utils';

/** The add and edit form: the project code is fixed once the project exists. */
export function getProjectModalFields(
  t: (key: string) => string,
  tForm: (key: string) => string,
  isEditing: boolean,
): ModalField[] {
  return [
    {
      name: 'en_name',
      label: tForm('enName'),
      required: true,
      maxLength: PROJECT_NAME_MAX_LENGTH,
    },
    {
      name: 'ar_name',
      label: tForm('arName'),
      required: true,
      maxLength: PROJECT_NAME_MAX_LENGTH,
    },
    {
      name: 'company_code',
      label: t('companyCode'),
      required: true,
      maxLength: PROJECT_CODE_MAX_LENGTH,
    },
    {
      name: 'project_code',
      label: isEditing ? t('projectCodeFixed') : t('projectCode'),
      required: !isEditing,
      maxLength: PROJECT_CODE_MAX_LENGTH,
      disabled: isEditing,
    },
  ];
}
