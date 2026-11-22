'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { addRelative, findCustomerByIdNumber } from '@/src/services/customers';
import { findUnitsByNumber } from '@/src/services/units';
import type { EntryNoticeValue } from '../../_shared/components/EntryNotice';
import { pickUnit, unitPickMessage } from '../../_shared/utils';
import type { RelativeEntryValues } from '../schema';
import { buildRelativePayload } from '../utils';

/**
 * Adds one relative through `POST /customers/relatives`. The owner and the
 * unit are found here; the backend then applies the relatives sheet's rules,
 * and a rejection's message carries the sheet's reason.
 */
export function useRelativeEntry() {
  const t = useTranslations('imports.entry');
  const { error: showError } = useResponseMessage();
  const [notice, setNotice] = useState<EntryNoticeValue | null>(null);
  const [formKey, setFormKey] = useState(0);

  const save = useCallback(
    async (values: RelativeEntryValues) => {
      setNotice(null);
      try {
        const owner = await findCustomerByIdNumber(values.owner_id_number);
        if (!owner) {
          setNotice({
            tone: 'error',
            message: t('relatives.ownerNotFound', {
              idNumber: values.owner_id_number.trim(),
            }),
          });
          return;
        }

        const picked = pickUnit(
          await findUnitsByNumber(values.unit_number),
          values.sub_project_code,
        );
        if (!picked.unit) {
          setNotice({
            tone: 'error',
            message: unitPickMessage(
              t,
              picked.problem,
              values.unit_number,
              values.sub_project_code,
            ),
          });
          return;
        }

        await addRelative(
          buildRelativePayload(values, owner.id, picked.unit.id),
        );
        const message = t('relatives.saved', {
          name: values.relative_name.trim(),
          owner: owner.customer_name,
          unit: picked.unit.unit_number,
        });
        toast.success(message);
        setNotice({ tone: 'success', message });
        setFormKey((key) => key + 1);
      } catch (err) {
        showError(err);
      }
    },
    [showError, t],
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  return { save, notice, clearNotice, formKey };
}
