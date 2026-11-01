import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface LegalEmployee {
  id: string;
  full_name: string;
  /** Exactly 11 digits, unique across legal employees. */
  mobile_number: string;
  is_active: number;
  is_deleted: number;
  /**
   * Owning project. `1` (ALL_PROJECTS) means the row is shared.
   * The response carries the id only — resolve the name from the
   * `company_projects` dropdown.
   */
  project_id: number;
  created_by: string;
  created_by_name: string;
  updated_by: string | null;
  updated_by_name: string | null;
  /** ISO timestamp, e.g. "2026-09-04T20:34:08.000Z". */
  created_at: string;
  updated_at: string | null;
}

interface GetLegalEmployeesRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    currentPage?: number | null;
    legal_employees?: LegalEmployee[];
  } | null;
  success: boolean;
}

export interface GetLegalEmployeesResponse {
  legalEmployees: LegalEmployee[];
  totalCount: number;
}

export interface GetLegalEmployeesParams {
  id?: string;
  full_name?: string;
  mobile_number?: string;
  is_active?: number;
  project_id?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getLegalEmployees(
  params: GetLegalEmployeesParams = {},
  signal?: AbortSignal,
): Promise<GetLegalEmployeesResponse> {
  const response = await api.get<GetLegalEmployeesRaw>(
    '/employees/legal-employees',
    {
      params: {
        ...(params.id ? { id: params.id } : {}),
        ...(params.full_name ? { full_name: params.full_name } : {}),
        ...(params.mobile_number
          ? { mobile_number: params.mobile_number }
          : {}),
        // `is_active` is a real 0 value, so it can't use the truthy spread.
        ...(params.is_active !== undefined
          ? { is_active: params.is_active }
          : {}),
        ...(params.project_id ? { project_id: params.project_id } : {}),
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      signal,
    },
  );

  const legalEmployees = Array.isArray(
    response.data?.result?.legal_employees,
  )
    ? response.data.result.legal_employees
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : legalEmployees.length;

  return { legalEmployees, totalCount };
}

// ─── Create legal employee ───────────────────────────────────

export interface CreateLegalEmployeeDto {
  full_name: string;
  mobile_number: string;
  /** Optional; defaults to the caller's project. Pass 1 to share it. */
  project_id?: number;
}

export async function createLegalEmployee(
  payload: CreateLegalEmployeeDto,
): Promise<void> {
  await api.post('/employees/legal-employees', payload);
}

// ─── Update legal employee ───────────────────────────────────

export interface UpdateLegalEmployeeDto {
  full_name?: string;
  mobile_number?: string;
  is_active?: number;
  /**
   * The column exists on the entity (it is returned by the list endpoint),
   * but the backend's .http file does not document it as an accepted update
   * field. Follows the soft-delete convention used by the definitions
   * services. Confirm the update endpoint honours it.
   */
  is_deleted?: number;
}

export async function updateLegalEmployee(
  legalEmployeeId: string,
  payload: UpdateLegalEmployeeDto,
): Promise<void> {
  await api.post(`/employees/legal-employees/update/${legalEmployeeId}`, payload);
}

/**
 * Soft-deletes a legal employee, mirroring the definitions services.
 * See the `is_deleted` note on UpdateLegalEmployeeDto — unverified.
 */
export async function deleteLegalEmployee(
  legalEmployeeId: string,
): Promise<void> {
  await api.post(`/employees/legal-employees/update/${legalEmployeeId}`, {
    is_deleted: 1,
  });
}
