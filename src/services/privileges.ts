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
    id: number;
    name: string;
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
 * Creates a new role with the specified privileges
 */
export async function createRole(
  payload: CreateRoleDto,
): Promise<CreateRoleResponse> {
  const response = await axios.post<CreateRoleResponse>(
    '/roles',
    payload,
  );

  return response.data;
}
