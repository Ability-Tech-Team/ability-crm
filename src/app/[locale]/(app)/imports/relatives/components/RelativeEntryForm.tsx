'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Users } from 'lucide-react';
import Form from '@/src/components/Form';
import SectionHeader from '@/src/components/SectionHeader';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import EntryNotice from '../../_shared/components/EntryNotice';
import {
  ID_TYPE_NATIONAL_ID,
  ID_TYPE_PASSPORT,
  subProjectCodeOptions,
  toSelectOptions,
} from '../../_shared/utils';
import { useRelativeEntry } from '../hooks/useRelativeEntry';
import { createRelativeEntrySchema, getRelativeEntryFields } from '../schema';
import { RELATIVE_ENTRY_INITIAL_VALUES } from '../utils';

/** Adds one owner's relative by hand, as a row of the relatives sheet would. */
export default function RelativeEntryForm() {
  const t = useTranslations('imports.entry');
  const { data: dropdowns } = useDropdowns();
  const { save, notice, clearNotice, formKey } = useRelativeEntry();

  const schema = useMemo(() => createRelativeEntrySchema(t), [t]);
  const fields = useMemo(
    () =>
      getRelativeEntryFields(t, {
        subProjects: subProjectCodeOptions(dropdowns?.sub_projects),
        // The relatives sheet takes these two ID types only.
        idTypes: toSelectOptions(
          dropdowns?.id_types?.filter((item) =>
            [ID_TYPE_PASSPORT, ID_TYPE_NATIONAL_ID].includes(item.id),
          ),
        ),
        genders: [
          { value: '1', label: t('relatives.male') },
          { value: '0', label: t('relatives.female') },
        ],
      }),
    [dropdowns?.id_types, dropdowns?.sub_projects, t],
  );

  return (
    <Form
      key={formKey}
      fields={fields}
      initialValues={RELATIVE_ENTRY_INITIAL_VALUES}
      validationSchema={schema}
      onSubmit={save}
      onReset={clearNotice}
      headerContent={
        <div className="flex flex-col gap-3">
          <SectionHeader icon={Users} title={t('relatives.title')} />
          <p className="text-sm text-slate-600">{t('relatives.description')}</p>
          <EntryNotice notice={notice} />
        </div>
      }
      buttonsClassName="flex flex-wrap gap-3"
      buttons={[
        {
          label: t('save'),
          loadingLabel: t('saving'),
          type: 'submit',
          fullWidth: false,
        },
        {
          label: t('reset'),
          type: 'reset',
          variant: 'secondary',
          fullWidth: false,
        },
      ]}
    />
  );
}
