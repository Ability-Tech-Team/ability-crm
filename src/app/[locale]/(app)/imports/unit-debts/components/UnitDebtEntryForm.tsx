'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import EgpSign from '@/src/components/EgpSign';
import Form from '@/src/components/Form';
import SectionHeader from '@/src/components/SectionHeader';
import EntryNotice from '../../_shared/components/EntryNotice';
import { useSubProjectOptions } from '../../_shared/hooks/useSubProjectOptions';
import { subProjectCodeOptions } from '../../_shared/utils';
import { useUnitDebtEntry } from '../hooks/useUnitDebtEntry';
import { createUnitDebtEntrySchema, getUnitDebtEntryFields } from '../schema';
import { UNIT_DEBT_ENTRY_INITIAL_VALUES } from '../utils';

/** Sets one unit's debt by hand, as a row of the unit debts sheet would. */
export default function UnitDebtEntryForm() {
  const t = useTranslations('imports.entry');
  const subProjects = useSubProjectOptions();
  const { save, notice, clearNotice, formKey } = useUnitDebtEntry();

  const schema = useMemo(() => createUnitDebtEntrySchema(t), [t]);
  const fields = useMemo(
    () =>
      getUnitDebtEntryFields(t, {
        subProjects: subProjectCodeOptions(subProjects),
      }),
    [subProjects, t],
  );

  return (
    <Form
      key={formKey}
      fields={fields}
      initialValues={UNIT_DEBT_ENTRY_INITIAL_VALUES}
      validationSchema={schema}
      onSubmit={save}
      onReset={clearNotice}
      headerContent={
        <div className="flex flex-col gap-3">
          <SectionHeader icon={EgpSign} title={t('unitDebts.title')} />
          <p className="text-sm text-slate-600">{t('unitDebts.description')}</p>
          <EntryNotice notice={notice} />
        </div>
      }
      buttonsClassName="flex flex-wrap gap-3"
      buttons={[
        {
          label: t('unitDebts.save'),
          loadingLabel: t('unitDebts.saving'),
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
