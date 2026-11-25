'use client';

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { UserPlus } from 'lucide-react';
import Form from '@/src/components/Form';
import SectionHeader from '@/src/components/SectionHeader';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import EntryNotice from '../../_shared/components/EntryNotice';
import { useSubProjectOptions } from '../../_shared/hooks/useSubProjectOptions';
import {
  OWNERSHIP_OWNER,
  OWNERSHIP_OWNER_RELATIVE,
  subProjectCodeOptions,
  toSelectOptions,
} from '../../_shared/utils';
import { useCustomerEntry } from '../hooks/useCustomerEntry';
import { createCustomerEntrySchema, getCustomerEntryFields } from '../schema';
import { customerEntryInitialValues } from '../utils';

/** Adds one customer with their unit, as a row of the customers sheet would. */
export default function CustomerEntryForm() {
  const t = useTranslations('imports.entry');
  const { data: dropdowns } = useDropdowns();
  const subProjects = useSubProjectOptions();
  const {
    save,
    notice,
    clearNotice,
    formKey,
    pending,
    isLinking,
    confirmPending,
    cancelPending,
  } = useCustomerEntry();
  // The chosen ownership, kept per form so a cleared form starts without one.
  const [ownership, setOwnership] = useState({ formKey, value: '' });
  const isOwner =
    ownership.formKey === formKey &&
    Number(ownership.value) === OWNERSHIP_OWNER;

  const schema = useMemo(() => createCustomerEntrySchema(t), [t]);
  // Today's date, read once for each fresh form.
  const initialValues = useMemo(
    () => customerEntryInitialValues(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [formKey],
  );
  const fields = useMemo(
    () =>
      getCustomerEntryFields(t, {
        idTypes: toSelectOptions(dropdowns?.id_types),
        countries: toSelectOptions(dropdowns?.countries),
        maritalStatuses: toSelectOptions(dropdowns?.marital_statuses),
        religions: toSelectOptions(dropdowns?.religions),
        customerTypes: toSelectOptions(dropdowns?.customer_types),
        subProjects: subProjectCodeOptions(subProjects),
        // Relatives have their own form, which records the relation too.
        ownerships: toSelectOptions(dropdowns?.ownership_types, [
          OWNERSHIP_OWNER_RELATIVE,
        ]),
        ownerTypes: toSelectOptions(dropdowns?.owner_types),
        showOwnerType: isOwner,
      }),
    [dropdowns, isOwner, subProjects, t],
  );

  return (
    <>
      <Form
        key={formKey}
        fields={fields}
        initialValues={initialValues}
        validationSchema={schema}
        onSubmit={save}
        onFieldChange={(name, value) => {
          if (name === 'ownership_id') setOwnership({ formKey, value });
        }}
        onReset={() => {
          clearNotice();
          setOwnership({ formKey, value: '' });
        }}
        headerContent={
          <div className="flex flex-col gap-3">
            <SectionHeader icon={UserPlus} title={t('customers.title')} />
            <p className="text-sm text-slate-600">
              {t('customers.description')}
            </p>
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

      <ConfirmModal
        open={pending !== null}
        title={t('customers.existingTitle')}
        message={
          pending
            ? t('customers.existingMessage', {
                name: pending.customer.customer_name,
                unit: pending.unit.unit_number,
              })
            : ''
        }
        confirmLabel={t('customers.linkExisting')}
        cancelLabel={t('cancel')}
        confirmVariant="primary"
        isLoading={isLinking}
        loadingLabel={t('saving')}
        onConfirm={() => void confirmPending()}
        onCancel={cancelPending}
      />
    </>
  );
}
