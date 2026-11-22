'use client';

import { useCallback, useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  assignUnitToCustomer,
  createCustomer,
  findCustomerByIdNumber,
  updateOwnership,
} from '@/src/services/customers';
import { findUnitsByNumber, type Unit } from '@/src/services/units';
import type { EntryNoticeValue } from '../../_shared/components/EntryNotice';
import { pickUnit, unitPickMessage } from '../../_shared/utils';
import type { CustomerEntryValues } from '../schema';
import {
  buildAssignPayload,
  buildCustomerPayload,
  ownerTypeToSet,
} from '../utils';

type EntryCustomer = { id: number; customer_name: string };

/** A customer already in the project, waiting for the user to confirm the link. */
export type PendingCustomerLink = {
  values: CustomerEntryValues;
  customer: EntryCustomer;
  unit: Unit;
};

/**
 * Adds one customer with their unit, as one row of the customers sheet: the
 * unit must exist, a customer already in the project is linked (after the
 * user confirms) rather than created again, and a failed link after a
 * create says so, so submitting again links the customer created.
 */
export function useCustomerEntry() {
  const t = useTranslations('imports.entry');
  const { error: showError } = useResponseMessage();
  const [notice, setNotice] = useState<EntryNoticeValue | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState<PendingCustomerLink | null>(null);
  const [isLinking, setIsLinking] = useState(false);

  const done = useCallback((tone: EntryNoticeValue['tone'], message: string) => {
    if (tone === 'success') toast.success(message);
    setNotice({ tone, message });
    setFormKey((key) => key + 1);
  }, []);

  const link = useCallback(
    async (
      values: CustomerEntryValues,
      customer: EntryCustomer,
      unit: Unit,
      created: boolean,
    ) => {
      const names = { name: customer.customer_name, unit: unit.unit_number };
      let ownershipId: number | null;
      try {
        ({ ownershipId } = await assignUnitToCustomer(
          buildAssignPayload(values, customer.id, unit),
        ));
      } catch (err) {
        showError(err);
        if (created) {
          setNotice({
            tone: 'warning',
            message: t('customers.createdNotLinked', names),
          });
        }
        return;
      }

      const ownerType = ownerTypeToSet(values);
      if (ownerType) {
        try {
          if (!ownershipId) throw new Error('The link was created without an id.');
          await updateOwnership(ownershipId, { owner_type_id: ownerType });
        } catch (err) {
          showError(err);
          done('warning', t('customers.ownerTypeNotSet', names));
          return;
        }
      }

      done(
        'success',
        t(created ? 'customers.saved' : 'customers.linked', names),
      );
    },
    [done, showError, t],
  );

  const save = useCallback(
    async (values: CustomerEntryValues) => {
      setNotice(null);
      try {
        // The unit first, so a mistyped unit number creates nothing.
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

        const existing = await findCustomerByIdNumber(values.id_number);
        if (existing) {
          setPending({
            values,
            customer: { id: existing.id, customer_name: existing.customer_name },
            unit: picked.unit,
          });
          return;
        }

        const created = await createCustomer(buildCustomerPayload(values));
        await link(values, created, picked.unit, true);
      } catch (err) {
        showError(err);
      }
    },
    [link, showError, t],
  );

  const confirmPending = useCallback(async () => {
    if (!pending || isLinking) return;
    setIsLinking(true);
    try {
      await link(pending.values, pending.customer, pending.unit, false);
    } finally {
      setIsLinking(false);
      setPending(null);
    }
  }, [isLinking, link, pending]);

  const cancelPending = useCallback(() => {
    if (!isLinking) setPending(null);
  }, [isLinking]);

  const clearNotice = useCallback(() => setNotice(null), []);

  return {
    save,
    notice,
    clearNotice,
    formKey,
    pending,
    isLinking,
    confirmPending,
    cancelPending,
  };
}
