import axios from '@/src/lib/http';

export interface Privilege {
  id: number;
  name: string;
  status: number;
}

export interface MenuItem {
  id: number;
  name: string;
  privileges: Privilege[];
}

export interface MenuGroup {
  menuName: string;
  id: number;
  menuitems: MenuItem[];
}

export interface PrivilegesResponse {
  result: MenuGroup[];
  success: boolean;
}

export interface PrivilegeDto {
  menuitem_id: number;
  privilege_id: number;
  status?: number;
}

export interface CreateRoleDto {
  en_name: string;
  ar_name: string;
  company_project_id?: number;
  is_deleted?: number;
  privileges: PrivilegeDto[];
}

export interface CreateRoleResponse {
  result: {
    /** The new role's id (a UUID). */
    id: string;
    message?: string;
  };
  success: boolean;
}

/**
 * Fetches the hierarchical menu structure with menu items and their specific privileges
 */
export async function getPrivileges(): Promise<PrivilegesResponse> {
  const response = await axios.get<PrivilegesResponse>('/definitions/privileges');
  return response.data;
}

/**
 * Transforms the nested privilege structure into a flat map for quick lookups
 * Returns: Map<menuItemId, Privilege[]>
 */
export function buildPrivilegeMap(
  data: MenuGroup[] | null | undefined,
): Map<number, Privilege[]> {
  const map = new Map<number, Privilege[]>();

  if (!data || !Array.isArray(data)) return map;

  data.forEach((group) => {
    if (!group?.menuitems || !Array.isArray(group.menuitems)) return;
    group.menuitems.forEach((item) => {
      if (item?.id && item?.privileges) {
        map.set(item.id, item.privileges);
      }
    });
  });

  return map;
}

/**
 * Flattens menu items across all groups
 */
export function flattenMenuItems(
  data: MenuGroup[] | null | undefined,
): MenuItem[] {
  if (!data || !Array.isArray(data)) return [];
  return data.flatMap((group) => group?.menuitems || []);
}

/**
 * Saves a role's privileges (`POST /roles/assign-privilege-to-role`): `status`
 * 1 grants one, 0 takes it back. The API refuses a privilege the editor's own
 * role doesn't hold (`CANNOT_GRANT_UNHELD_PRIVILEGE`).
 */
export async function assignRolePrivileges(
  roleId: string,
  privileges: PrivilegeDto[],
): Promise<void> {
  if (!privileges.length) return;
  await axios.post('/roles/assign-privilege-to-role', {
    privileges: privileges.map((privilege) => ({
      role_id: roleId,
      menuitem_id: privilege.menuitem_id,
      privilege_id: privilege.privilege_id,
      status: privilege.status ?? 1,
    })),
  });
}

/**
 * Creates a role with its privileges. Amer CRM's API took both in one call
 * (`/create-role`); Ability CRM's takes the role (`POST /roles`, which refuses
 * a `privileges` field) and then its privileges. A role whose privileges can't
 * be saved is removed again, so a failed save leaves no empty role behind.
 */
export async function createRole(
  payload: CreateRoleDto,
): Promise<CreateRoleResponse> {
  const { privileges, ...role } = payload;
  const response = await axios.post<CreateRoleResponse>('/roles', role);
  const roleId = response.data?.result?.id;
  if (!roleId) throw new Error("The new role's id is missing from the answer");

  try {
    await assignRolePrivileges(String(roleId), privileges);
  } catch (err) {
    await axios
      .post(`/roles/update/${roleId}`, { is_deleted: 1 })
      .catch(() => undefined);
    throw err;
  }

  return response.data;
}
