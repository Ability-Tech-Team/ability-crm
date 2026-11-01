'use client';

import { z } from 'zod';
import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AccessDenied from '@/src/components/AccessDenied';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getRoles, type RoleItem } from '@/src/services/roles';
import {
  createEmployee,
  updateEmployee,
  getEmployees,
  type CreateEmployeeDto,
  type UpdateEmployeeDto,
  type Employee,
} from '@/src/services/employees';
import type { SelectOption } from '@/src/components/ui/Select';
import type { DropdownOption } from '@/src/types/dropdowns';
import { useRouter } from '@/src/i18n/navigation';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';

const requiredNumericSelect = (requiredMessage: string) =>
  z
    .string()
    .min(1, requiredMessage)
    .refine((value) => Number.isInteger(Number(value)), {
      message: 'Invalid value',
    });

const optionalSelectString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().optional(),
);

const addUserSchema = z.object({
  user_name: z.string().trim().min(1, 'Username is required'),
  full_name: z.string().trim().min(1, 'Full name is required'),
  email: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /.+@.+\..+/.test(value), {
      message: 'Invalid email',
    }),
  phone_number: z
    .string()
    .trim()
    .min(1, 'Phone number is required')
    .min(7, 'Phone number must be between 7 and 11 characters')
    .max(11, 'Phone number must be between 7 and 11 characters'),
  is_male: requiredNumericSelect('Gender is required'),
  position_id: requiredNumericSelect('Position is required'),
  role_id: z.string().min(1, 'Role is required'),
  department_id: requiredNumericSelect('Department is required'),
  // Optional since the SAP removal; employees who don't collect have no safe.
  safe_id: optionalSelectString,
  employee_type_id: requiredNumericSelect('Employee type is required'),
  manager_id: optionalSelectString,
});

type AddUserFormData = z.infer<typeof addUserSchema>;

/** Map a DropdownOption[] to SelectOption[] */
function toSelectOptions(items?: DropdownOption[]): SelectOption[] {
  return (items ?? []).map((item) => ({
    value: String(item.id),
    label: item.name,
  }));
}

export default function AddUser() {
  const t = useTranslations('users');
  const tForm = useTranslations('form');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const editId = searchParams.get('edit');
  const isEditMode = !!editId;
  const addUserPrivileges = useRoutePrivileges('/users/add');
  const manageUserPrivileges = useRoutePrivileges('/users/manage');
  const canCreateUser = addUserPrivileges.canAccess;
  const canEditUser = manageUserPrivileges.hasPrivilege(PRIVILEGE_IDS.EDIT);

  // ── Edit-mode employee data ──────────────────────────────────
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoadingEmployee, setIsLoadingEmployee] = useState(() => isEditMode);
  const [managerOptions, setManagerOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    getEmployees({ name: '', page: 1, limit: 1000 }, controller.signal)
      .then(({ employees }) => {
        setManagerOptions(
          employees
            .filter(
              (e) => e.is_deleted !== 1 && e.is_locked !== 1 && e.id !== editId,
            )
            .map((e) => ({
              value: e.id,
              label: e.full_name || e.user_name || e.email,
            })),
        );

        if (editId) {
          const found = employees.find((e) => e.id === editId);
          if (found) setEmployee(found);
        }
      })
      .catch(() => {
        setManagerOptions([]);
      })
      .finally(() => setIsLoadingEmployee(false));

    return () => controller.abort();
  }, [editId]);

  // ── Dropdowns ────────────────────────────────────────────────
  const { data: dropdowns } = useDropdowns();
  const [roles, setRoles] = useState<SelectOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    getRoles({ limit: 1000 }, controller.signal)
      .then(({ roles: items }) =>
        setRoles(items.map((r: RoleItem) => ({ value: r.id, label: r.name }))),
      )
      .catch(() => {});
    return () => controller.abort();
  }, []);

  const positionOptions = toSelectOptions(dropdowns?.positions);
  const departmentOptions = toSelectOptions(dropdowns?.departments);
  const employeeTypeOptions = toSelectOptions(dropdowns?.employee_types);
  const safeOptions = toSelectOptions(dropdowns?.safes);
  const genderOptions = toSelectOptions(dropdowns?.gender);

  // ── Fields ───────────────────────────────────────────────────
  const fields: FieldConfig[] = [
    {
      name: 'user_name',
      label: tForm('username'),
      placeholder: tForm('username'),
      type: 'text',
    },
    {
      name: 'full_name',
      label: tForm('fullName'),
      placeholder: tForm('fullName'),
      type: 'text',
    },
    {
      name: 'position_id',
      label: tForm('position'),
      placeholder: tForm('position'),
      fieldType: 'select',
      options: positionOptions,
    },
    {
      name: 'phone_number',
      label: tForm('phoneNumber'),
      placeholder: tForm('phoneNumber'),
      type: 'tel',
      maxLength: 11,
      onlyNumbers: true,
    },
    {
      name: 'department_id',
      label: tForm('department'),
      placeholder: tForm('department'),
      fieldType: 'select',
      options: departmentOptions,
    },
    {
      name: 'employee_type_id',
      label: tForm('employeeType'),
      placeholder: tForm('employeeType'),
      fieldType: 'select',
      options: employeeTypeOptions,
    },
    {
      name: 'safe_id',
      label: tForm('safe'),
      placeholder: tForm('safe'),
      fieldType: 'select',
      options: safeOptions,
    },
    {
      name: 'manager_id',
      label: tForm('manager'),
      placeholder: tForm('manager'),
      fieldType: 'select',
      options: managerOptions,
    },
    {
      name: 'email',
      label: tForm('email'),
      placeholder: tForm('email'),
      type: 'email',
      autoComplete: 'email',
      // disabled: isEditMode,
    },
    {
      name: 'is_male',
      label: tForm('gender'),
      placeholder: tForm('gender'),
      fieldType: 'select',
      options: genderOptions,
    },
    {
      name: 'role_id',
      label: tForm('role'),
      placeholder: tForm('role'),
      fieldType: 'select',
      options: roles,
    },
  ];

  // ── Buttons ──────────────────────────────────────────────────
  const buttons: ButtonConfig[] = [
    {
      label: isEditMode ? tForm('save') : tForm('add'),
      loadingLabel: isEditMode ? tForm('updating') : tForm('adding'),
      type: 'submit',
      variant: 'primary',
    },
    {
      label: tForm('clear'),
      type: 'reset',
      variant: 'secondary',
    },
  ];

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (data: AddUserFormData) => {
    try {
      if (isEditMode && editId) {
        const payload: UpdateEmployeeDto = {};
        const originalValues = {
          user_name: employee?.user_name ?? '',
          full_name: employee?.full_name ?? '',
          email: employee?.email ?? '',
          phone_number: employee?.phone_number ?? '',
          position_id:
            employee?.position_id != null ? String(employee.position_id) : '',
          department_id:
            employee?.department_id != null
              ? String(employee.department_id)
              : '',
          employee_type_id:
            employee?.employee_type_id != null
              ? String(employee.employee_type_id)
              : '',
          safe_id: employee?.safe_id != null ? String(employee.safe_id) : '',
          manager_id: employee?.manager_id ?? '',
          is_male: String(employee?.is_male ?? ''),
          role_id: employee?.role_id ?? '',
        };

        if (data.user_name !== originalValues.user_name) {
          payload.user_name = data.user_name;
        }
        if (data.full_name !== originalValues.full_name) {
          payload.full_name = data.full_name;
        }
        if (data.phone_number !== originalValues.phone_number) {
          payload.phone_number = data.phone_number;
        }
        if (data.is_male !== originalValues.is_male) {
          payload.is_male = Number(data.is_male);
        }
        if (data.position_id !== originalValues.position_id) {
          payload.position_id = Number(data.position_id);
        }
        if (data.department_id !== originalValues.department_id) {
          payload.department_id = Number(data.department_id);
        }
        if (data.employee_type_id !== originalValues.employee_type_id) {
          payload.employee_type_id = Number(data.employee_type_id);
        }
        if (data.safe_id && data.safe_id !== originalValues.safe_id) {
          payload.safe_id = Number(data.safe_id);
        }
        if ((data.manager_id ?? '') !== originalValues.manager_id) {
          payload.manager_id = data.manager_id ?? '';
        }
        if (data.role_id !== originalValues.role_id) {
          payload.role_id = data.role_id;
        }
        if ((data.email ?? '') !== originalValues.email) {
          payload.email = data.email ?? '';
        }

        if (Object.keys(payload).length > 0) {
          await updateEmployee(editId, payload);
        }
        showSuccess('updateSuccess');
        router.push('/users/manage');
      } else {
        const payload: CreateEmployeeDto = {
          user_name: data.user_name,
          full_name: data.full_name,
          email: data.email || undefined,
          phone_number: data.phone_number,
          is_male: Number(data.is_male),
          position_id: Number(data.position_id),
          department_id: Number(data.department_id),
          employee_type_id: Number(data.employee_type_id),
          ...(data.safe_id ? { safe_id: Number(data.safe_id) } : {}),
          manager_id: data.manager_id || undefined,
          role_id: data.role_id,
        };

        await createEmployee(payload);
        showSuccess('createSuccess');
        router.push('/users/manage');
      }
    } catch (err) {
      showError(err);
    }
  };

  // ── Initial values (pre-fill from employee when editing) ─────
  const initialValues: AddUserFormData = useMemo(() => {
    if (isEditMode && employee) {
      return {
        user_name: employee.user_name ?? '',
        full_name: employee.full_name ?? '',
        email: employee.email ?? '',
        phone_number: employee.phone_number ?? '',
        position_id:
          employee.position_id != null ? String(employee.position_id) : '',
        department_id:
          employee.department_id != null ? String(employee.department_id) : '',
        employee_type_id:
          employee.employee_type_id != null
            ? String(employee.employee_type_id)
            : '',
        safe_id: employee.safe_id != null ? String(employee.safe_id) : '',
        manager_id: employee.manager_id ?? '',
        is_male: String(employee.is_male ?? ''),
        role_id: employee.role_id ?? '',
      };
    }
    return {
      user_name: '',
      full_name: '',
      email: '',
      phone_number: '',
      position_id: '',
      department_id: '',
      employee_type_id: '',
      safe_id: '',
      manager_id: '',
      is_male: '',
      role_id: '',
    };
  }, [isEditMode, employee]);

  if ((isEditMode && !canEditUser) || (!isEditMode && !canCreateUser)) {
    return (
      <AccessDenied
        fallbackHref={
          manageUserPrivileges.firstAccessibleHref ?? '/users/manage'
        }
      />
    );
  }

  if (isEditMode && isLoadingEmployee) {
    return (
      <div className="p-6 text-center text-gray-500">{tForm('loading')}</div>
    );
  }

  return (
    <div className="p-6">
      <Form
        key={isEditMode && employee ? employee.id : 'new'}
        title={`${t('title')} - ${isEditMode ? tForm('save') : tForm('add')}`}
        fields={fields}
        buttons={buttons}
        initialValues={initialValues}
        validationSchema={addUserSchema}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
