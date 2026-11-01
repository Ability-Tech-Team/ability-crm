export type RolePrivilege = {
  id: number;
  name: string;
  status: number;
};

export type RoleMenuItem = {
  id: number;
  name: string;
  href?: string;
  privileges: RolePrivilege[];
};

export type RoleMenu = {
  menuName: string;
  id: number;
  menuitems: RoleMenuItem[];
};

export type RolePrivilegesResponse = {
  result: RoleMenu[];
  success: boolean;
};
