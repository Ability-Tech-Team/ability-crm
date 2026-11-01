import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CreateEmployeeDto {
  email?: string;
  user_name: string;
  full_name: string;
  phone_number?: string;
  is_male: number;
  role_id?: string;
  department_id?: number;
  position_id: number;
  safe_id?: number;
  employee_type_id?: number;
  manager_id?: string;
}

export interface UpdateEmployeeDto {
  user_name?: string;
  full_name?: string;
  phone_number?: string;
  is_male?: number;
  role_id?: string;
  department_id?: number;
  position_id?: number;
  safe_id?: number;
  employee_type_id?: number;
  is_locked?: number;
  is_deleted?: number;
  manager_id?: string;
  email?: string;
}

export interface Employee {
  id: string;
  email: string;
  user_name: string;
  full_name: string;
  phone_number: string | null;
  is_male: number;
  is_locked: number;
  is_deleted: number;
  role_id: string | null;
  department_id: number | null;
  position_id: number | null;
  safe_id: number | null;
  employee_type_id: number | null;
  created_at: string;
  updated_at: string;
  last_login_date: string | null;
  manager_id: string | null;
  role_name: string | null;
  department_name: string | null;
  position_name: string | null;
  project_id: number | null;
  project_name: string | null;
  manager: string | null;
}

interface GetEmployeesRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    employees?: Employee[];
  } | null;
  success: boolean;
}

export interface GetEmployeesResponse {
  employees: Employee[];
  totalCount: number;
}

export interface GetEmployeesParams {
  name?: string;
  role_id?: string;
  employee_type_id?: number;
  is_locked?: number;
  page?: number;
  limit?: number;
}

interface EmployeeMutationResponse {
  success?: boolean;
  message?: string;
  result?: {
    message?: string;
  };
}

const getMutationErrorMessage = (
  data: EmployeeMutationResponse | undefined,
  fallback: string,
) => {
  return data?.result?.message || data?.message || fallback;
};

const assertMutationSuccess = (
  data: EmployeeMutationResponse | undefined,
  fallbackMessage: string,
) => {
  if (data?.success === false) {
    throw new Error(getMutationErrorMessage(data, fallbackMessage));
  }
};

// ─── API calls ───────────────────────────────────────────────

export async function getEmployees(
  params: GetEmployeesParams = {},
  signal?: AbortSignal,
): Promise<GetEmployeesResponse> {
  const response = await api.get<GetEmployeesRaw>('/get-employees', {
    params: {
      ...(params.name ? { name: params.name } : {}),
      ...(params.role_id ? { role_id: params.role_id } : {}),
      ...(params.employee_type_id !== undefined
        ? { employee_type_id: params.employee_type_id }
        : {}),
      ...(params.is_locked !== undefined
        ? { is_locked: params.is_locked }
        : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const employees = Array.isArray(response.data?.result?.employees)
    ? response.data.result.employees
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : employees.length;

  return { employees, totalCount };
}

export async function createEmployee(
  payload: CreateEmployeeDto,
): Promise<{ success: boolean }> {
  const response = await api.post<EmployeeMutationResponse>(
    '/employee/create',
    payload,
  );
  assertMutationSuccess(response.data, 'Failed to create employee');
  return { success: response.data?.success !== false };
}

export async function updateEmployee(
  employeeId: string,
  payload: UpdateEmployeeDto,
): Promise<{ success: boolean }> {
  const response = await api.post<EmployeeMutationResponse>(
    `/employee/update/${employeeId}`,
    payload,
  );
  assertMutationSuccess(response.data, 'Failed to update employee');
  return { success: response.data?.success !== false };
}

export async function sendPasswordResetMail(
  employeeId: string,
): Promise<{ success: boolean }> {
  const response = await api.post<EmployeeMutationResponse>(
    `/employee/reset-password/${employeeId}`,
  );
  assertMutationSuccess(response.data, 'Failed to send password reset email');
  return { success: response.data?.success !== false };
}

export interface ChangePasswordDto {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function changePassword(
  payload: ChangePasswordDto,
): Promise<{ success: boolean }> {
  // A wrong current password must not end the session.
  const response = await api.post<EmployeeMutationResponse>(
    '/auth/change-password',
    payload,
    { skipSessionRedirect: true },
  );
  assertMutationSuccess(response.data, 'Failed to change password');
  return { success: response.data?.success !== false };
}
