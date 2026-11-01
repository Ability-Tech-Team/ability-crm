import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CreateDepartmentDto {
  en_name: string;
  ar_name: string;
  show_in_mobile: number;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

export interface UpdateDepartmentDto {
  en_name?: string;
  ar_name?: string;
  show_in_mobile?: number;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function createDepartment(
  payload: CreateDepartmentDto,
): Promise<void> {
  await api.post('/definitions/department', {
    departments: [payload],
  });
}

export async function updateDepartment(
  departmentId: number,
  payload: UpdateDepartmentDto,
): Promise<void> {
  await api.post(`/definitions/department/update/${departmentId}`, payload);
}

export async function deleteDepartment(departmentId: number): Promise<void> {
  await api.post(`/definitions/department/update/${departmentId}`, {
    is_deleted: 1,
  });
}

export async function getAllDepartments(signal?: AbortSignal) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      is_active?: number | null;
      show_in_mobile?: number | null;
    }>;
    success: boolean;
  }>('/definitions/search/departments', { signal });
  return Array.isArray(data.result) ? data.result : [];
}

export async function searchDepartments(
  params: { name?: string },
  signal?: AbortSignal,
) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      is_active?: number | null;
      show_in_mobile?: number | null;
    }>;
    success: boolean;
  }>('/definitions/search/departments', { params, signal });
  return Array.isArray(data.result) ? data.result : [];
}
