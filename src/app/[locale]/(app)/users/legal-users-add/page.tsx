'use client';

import { z } from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import AccessDenied from '@/src/components/AccessDenied';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  createLegalEmployee,
  getLegalEmployees,
  updateLegalEmployee,
  type LegalEmployee,
} from '@/src/services/legalEmployees';

const addLegalEmployeeSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  mobile_number: z
    .string()
    .min(1, 'Mobile number is required')
    .regex(/^\d{11}$/, 'Mobile number must be exactly 11 digits'),
});

type AddLegalEmployeeFormData = z.infer<typeof addLegalEmployeeSchema>;

export default function AddLegalUser() {
  const t = useTranslations('legalEmployees');
  const tForm = useTranslations('form');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const editId = searchParams.get('edit');
  const isEditMode = !!editId;

  const addPrivileges = useRoutePrivileges('/users/legal-users-add');
  const managePrivileges = useRoutePrivileges('/users/legal-users-manage');
  const canCreate = addPrivileges.canAccess;
  const canEdit = managePrivileges.hasPrivilege(PRIVILEGE_IDS.EDIT);

  // ── Edit-mode data ───────────────────────────────────────────
  const [legalEmployee, setLegalEmployee] = useState<LegalEmployee | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(() => isEditMode);

  useEffect(() => {
    if (!editId) return;

    const controller = new AbortController();

    getLegalEmployees({ id: editId, page: 1, limit: 1 }, controller.signal)
      .then(({ legalEmployees }) => {
        // Match on id: a backend that ignores the filter would pre-fill
        // from another record, which we would then save over this one.
        setLegalEmployee(
          legalEmployees.find((row) => row.id === editId) ?? null,
        );
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [editId]);

  // ── Fields ───────────────────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'full_name',
      label: t('columns.fullName'),
      placeholder: t('columns.fullName'),
      type: 'text',
    },
    {
      name: 'mobile_number',
      label: t('columns.mobileNumber'),
      placeholder: t('mobileHint'),
      type: 'text',
      onlyNumbers: true,
      maxLength: 11,
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: isEditMode ? tForm('save') : tForm('add'),
      loadingLabel: isEditMode ? tForm('updating') : tForm('adding'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('cancel'),
      type: 'button',
      variant: 'secondary',
      onClick: () => router.push('/users/legal-users-manage'),
    },
  ];

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (data: AddLegalEmployeeFormData) => {
    try {
      if (isEditMode && editId) {
        await updateLegalEmployee(editId, {
          full_name: data.full_name,
          mobile_number: data.mobile_number,
        });
        showSuccess('updateSuccess');
      } else {
        await createLegalEmployee({
          full_name: data.full_name,
          mobile_number: data.mobile_number,
        });
        showSuccess('createSuccess');
      }

      router.push('/users/legal-users-manage');
    } catch (err) {
      showError(err);
    }
  };

  // ── Initial values ───────────────────────────────────────────
  const initialValues: AddLegalEmployeeFormData = useMemo(() => {
    if (isEditMode && legalEmployee) {
      return {
        full_name: legalEmployee.full_name ?? '',
        mobile_number: legalEmployee.mobile_number ?? '',
      };
    }
    return { full_name: '', mobile_number: '' };
  }, [isEditMode, legalEmployee]);

  if ((isEditMode && !canEdit) || (!isEditMode && !canCreate)) {
    return (
      <AccessDenied
        fallbackHref={
          managePrivileges.firstAccessibleHref ?? '/users/legal-users-manage'
        }
      />
    );
  }

  if (isEditMode && isLoading) {
    return (
      <div className="p-6 text-center text-gray-500">{tForm('loading')}</div>
    );
  }

  if (isEditMode && !legalEmployee) {
    return (
      <div className="p-6 text-center text-gray-500">{t('notFound')}</div>
    );
  }

  return (
    <div className="p-6">
      <Form
        key={isEditMode && legalEmployee ? legalEmployee.id : 'new'}
        title={`${t('title')} - ${isEditMode ? tForm('save') : tForm('add')}`}
        fields={fields}
        buttons={buttons}
        initialValues={initialValues}
        validationSchema={addLegalEmployeeSchema}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
