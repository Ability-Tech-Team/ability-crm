'use client';

import { useCallback, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  findUnitsByNumber,
  getUnitDebitAmount,
  setUnitDebt,
} from '@/src/services/units';
import type { EntryNoticeValue } from '../../_shared/components/EntryNotice';
import { pickUnit, unitPickMessage } from '../../_shared/utils';
import type { UnitDebtEntryValues } from '../schema';
import { parseDebitAmount } from '../utils';

/**
 * Sets one unit's debt through `POST /projects/units/debt/:unit_id`. The unit
 * is found here by its number and optional sub-project, as in the sheet; the
 * amount replaces its debt.
 */
export function useUnitDebtEntry() {
  const t = useTranslations('imports.entry');
  const locale = useLocale();
  const { error: showError } = useResponseMessage();
  const [notice, setNotice] = useState<EntryNoticeValue | null>(null);
  const [formKey, setFormKey] = useState(0);

  const save = useCallback(
    async (values: UnitDebtEntryValues) => {
      setNotice(null);
      // The schema has already refused an amount that doesn't parse.
      const amount = parseDebitAmount(values.debit_amount);
      if (amount === null) return;

      try {
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

        const previous = getUnitDebitAmount(picked.unit);
        const saved = await setUnitDebt(picked.unit.id, amount);
        const format = (value: number) => value.toLocaleString(locale);
        const current = format(saved.debitAmount ?? amount);
        const message =
          previous === null
            ? t('unitDebts.savedFirst', {
                unit: picked.unit.unit_number,
                amount: current,
              })
            : t('unitDebts.saved', {
                unit: picked.unit.unit_number,
                amount: current,
                previous: format(previous),
              });
        toast.success(message);
        setNotice({ tone: 'success', message });
        setFormKey((key) => key + 1);
      } catch (err) {
        showError(err);
      }
    },
    [locale, showError, t],
  );

  const clearNotice = useCallback(() => setNotice(null), []);

  return { save, notice, clearNotice, formKey };
}
