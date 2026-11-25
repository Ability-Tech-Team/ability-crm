'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Building2 } from 'lucide-react';
import Form from '@/src/components/Form';
import SectionHeader from '@/src/components/SectionHeader';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import EntryNotice from '../../_shared/components/EntryNotice';
import { useSubProjectOptions } from '../../_shared/hooks/useSubProjectOptions';
import {
  flattenLocationOptions,
  subProjectIdOptions,
  toSelectOptions,
} from '../../_shared/utils';
import { useUnitEntry } from '../hooks/useUnitEntry';
import { createUnitEntrySchema, getUnitEntryFields } from '../schema';
import { UNIT_ENTRY_INITIAL_VALUES } from '../utils';

/** Adds one unit by hand, as the units sheet would. */
export default function UnitEntryForm() {
  const t = useTranslations('imports.entry');
  const { data: dropdowns } = useDropdowns();
  const subProjects = useSubProjectOptions();
  const { save, notice, clearNotice, formKey } = useUnitEntry();

  const schema = useMemo(() => createUnitEntrySchema(t), [t]);
  const fields = useMemo(
    () =>
      getUnitEntryFields(t, {
        subProjects: subProjectIdOptions(subProjects),
        unitTypes: toSelectOptions(dropdowns?.unit_types),
        locations: flattenLocationOptions(dropdowns?.locations),
      }),
    [dropdowns?.locations, subProjects, dropdowns?.unit_types, t],
  );

  return (
    <Form
      key={formKey}
      fields={fields}
      initialValues={UNIT_ENTRY_INITIAL_VALUES}
      validationSchema={schema}
      onSubmit={save}
      onReset={clearNotice}
      headerContent={
        <div className="flex flex-col gap-3">
          <SectionHeader icon={Building2} title={t('units.title')} />
          <p className="text-sm text-slate-600">{t('units.description')}</p>
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
