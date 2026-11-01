'use client';

import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { endOwnership, updateOwnership } from '@/src/services/customers';
import type { CustomerUnit } from '@/src/services/units';
import {
  buildOwnershipUpdatePayload,
  type OwnershipEditTarget,
} from '../utils';

/**
 * End ownership and edit ownership on the unit page, which replace what SAP
 * did on contracts. `onChanged` reloads the unit and its history.
 */
export function useOwnershipActions({
  unitId,
  onChanged,
}: {
  unitId: number | null;
  onChanged: () => void | Promise<void>;
}) {
  const t = useTranslations('units.detail.ownershipActions');
  const tCodes = useTranslations('apiCodes');
  const { error: showError } = useResponseMessage();
  const [endTarget, setEndTarget] = useState<CustomerUnit | null>(null);
  const [editTarget, setEditTarget] = useState<OwnershipEditTarget | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleEnd = useCallback(
    async (values: Record<string, string>) => {
      if (!endTarget || unitId === null || isSaving) return;

      setIsSaving(true);
      try {
        await endOwnership({
          customer_id: endTarget.customer_id,
          unit_id: unitId,
          end_date: values.end_date,
        });
        toast.success(t('endSuccess'));
        setEndTarget(null);
        await onChanged();
      } catch (err) {
        showError(err);
      } finally {
        setIsSaving(false);
      }
    },
    [endTarget, unitId, isSaving, onChanged, showError, t],
  );

  const handleEdit = useCallback(
    async (values: Record<string, string>) => {
      if (!editTarget || isSaving) return;

      const payload = buildOwnershipUpdatePayload(values, editTarget);

      if (Object.keys(payload).length === 0) {
        toast.error(tCodes('NOTHING_TO_UPDATE'));
        return;
      }

      setIsSaving(true);
      try {
        await updateOwnership(editTarget.id, payload);
        toast.success(t('editSuccess'));
        setEditTarget(null);
        await onChanged();
      } catch (err) {
        showError(err);
      } finally {
        setIsSaving(false);
      }
    },
    [editTarget, isSaving, onChanged, showError, t, tCodes],
  );

  return {
    endTarget,
    setEndTarget,
    editTarget,
    setEditTarget,
    isSaving,
    handleEnd,
    handleEdit,
  };
}
