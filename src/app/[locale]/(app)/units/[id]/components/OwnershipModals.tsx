'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import AddEntryModal, {
  type ModalField,
} from '@/src/components/ui/AddEntryModal';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import type { CustomerUnit } from '@/src/services/units';
import { getOwnershipInitialValues, type OwnershipEditTarget } from '../utils';

type OwnershipModalsProps = {
  endTarget: CustomerUnit | null;
  editTarget: OwnershipEditTarget | null;
  isSaving: boolean;
  onEnd: (values: Record<string, string>) => void | Promise<void>;
  onEdit: (values: Record<string, string>) => void | Promise<void>;
  onCancelEnd: () => void;
  onCancelEdit: () => void;
};

/** The End ownership and Edit ownership forms on the unit page. */
export default function OwnershipModals({
  endTarget,
  editTarget,
  isSaving,
  onEnd,
  onEdit,
  onCancelEnd,
  onCancelEdit,
}: OwnershipModalsProps) {
  const t = useTranslations('units.detail.ownershipActions');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();
  const today = new Date().toISOString().slice(0, 10);

  const endFields = useMemo<ModalField[]>(
    () => [{ name: 'end_date', label: t('endDate'), type: 'date', required: true }],
    [t],
  );

  const editFields = useMemo<ModalField[]>(() => {
    if (!editTarget) return [];

    const ownerTypeOptions = (dropdowns?.owner_types ?? []).map((item) => ({
      value: String(item.id),
      label: item.name,
    }));

    return [
      { name: 'contract_number', label: t('contractNumber') },
      ...(editTarget.isEnded
        ? []
        : [{ name: 'fm_contract_number', label: t('fmContractNumber') }]),
      ...(editTarget.hasOwnerType
        ? [
            {
              name: 'owner_type_id',
              label: t('ownerType'),
              type: 'select' as const,
              options: ownerTypeOptions,
            },
          ]
        : []),
      { name: 'start_date', label: t('startDate'), type: 'date' as const },
      { name: 'sign_date', label: t('signDate'), type: 'date' as const },
      ...(editTarget.isEnded
        ? [{ name: 'end_date', label: t('endDate'), type: 'date' as const }]
        : []),
    ];
  }, [dropdowns?.owner_types, editTarget, t]);

  return (
    <>
      <AddEntryModal
        open={endTarget !== null}
        title={t('endTitle', { name: endTarget?.customer_name ?? '' })}
        fields={endFields}
        initialValues={{ end_date: today }}
        saveLabel={isSaving ? tForm('updating') : t('endConfirm')}
        cancelLabel={tForm('cancel')}
        isSaving={isSaving}
        onSave={onEnd}
        onCancel={onCancelEnd}
      />
      <AddEntryModal
        open={editTarget !== null}
        title={t('editTitle', { name: editTarget?.customerName ?? '' })}
        fields={editFields}
        initialValues={editTarget ? getOwnershipInitialValues(editTarget) : {}}
        saveLabel={isSaving ? tForm('updating') : tForm('save')}
        cancelLabel={tForm('cancel')}
        isSaving={isSaving}
        onSave={onEdit}
        onCancel={onCancelEdit}
      />
    </>
  );
}
