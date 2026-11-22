'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { createUnit } from '@/src/services/units';
import type { EntryNoticeValue } from '../../_shared/components/EntryNotice';
import type { UnitEntryValues } from '../schema';
import { buildUnitPayload } from '../utils';

/** Adds one unit through `POST /projects/unit` and clears the form after it. */
export function useUnitEntry() {
  const t = useTranslations('imports.entry');
  const { error: showError } = useResponseMessage();
  const [notice, setNotice] = useState<EntryNoticeValue | null>(null);
  const [formKey, setFormKey] = useState(0);

  const save = useCallback(
    async (values: UnitEntryValues) => {
      setNotice(null);
      const payload = buildUnitPayload(values);
      try {
        await createUnit(payload);
      } catch (err) {
        showError(err);
        return;
      }

      const message = t('units.saved', { unit: payload.unit_number });
      toast.success(message);
      setNotice({ tone: 'success', message });
      setFormKey((key) => key + 1);
    },
    [showError, t],
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  return { save, notice, clearNotice, formKey };
}
