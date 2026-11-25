import api from '@/src/lib/http';
import type { RolePrivilegesResponse } from '@/src/types/rolePrivileges';
import type { CreateRoleDto } from '@/src/services/privileges';

// ─── List / Search ───────────────────────────────────────────────

export interface RoleItem {
  id: string;
  name: string;
  en_name?: string;
  ar_name?: string;
  /** The role's project: a user works in their role's project. */
  project_id?: number | null;
}

interface GetRolesRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    roles?: RoleItem[];
  } | null;
  success: boolean;
}

export interface GetRolesResponse {
  roles: RoleItem[];
  totalCount: number;
}

export interface GetRolesParams {
  role_name?: string;
  page?: number;
  limit?: number;
  /** The Super Admin's project, or 1 for every project's roles. */
  project_id?: number;
}

export async function getRoles(
  params: GetRolesParams = {},
  signal?: AbortSignal,
): Promise<GetRolesResponse> {
  const response = await api.get<GetRolesRaw>('/roles', {
    params: {
      ...(params.role_name ? { role_name: params.role_name } : {}),
      ...(params.project_id ? { project_id: params.project_id } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const roles = Array.isArray(response.data?.result?.roles)
    ? response.data.result.roles
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : roles.length;

  return {
    roles,
    totalCount,
  };
}

// ─── Single role privileges ──────────────────────────────────────

export async function getRolePrivilegesById(
  roleId: string,
  signal?: AbortSignal,
): Promise<RolePrivilegesResponse> {
  const response = await api.get<RolePrivilegesResponse>(
    '/roles/get-role-privileges',
    { params: { role_id: roleId }, signal },
  );

  return response.data;
}

// ─── Update role ─────────────────────────────────────────────────

export async function updateRole(
  roleId: string,
  payload: CreateRoleDto,
): Promise<void> {
  await api.post(`/roles/update/${roleId}`, payload);
}

// ─── Delete role (soft-delete via update endpoint) ───────────────

export async function deleteRole(roleId: string): Promise<void> {
  await api.post(`/roles/update/${roleId}`, { is_deleted: 1 });
}
