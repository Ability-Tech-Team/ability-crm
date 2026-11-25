/**
 * The backend's Super Admin role (`superAdminEnums.ROLE_EN_NAME` in
 * ability-crm-api); the session carries the role's English name. Only the
 * Super Admin manages projects and works across them. This decides what the
 * app shows; the API checks the role on every call.
 */
export const SUPER_ADMIN_ROLE_NAME = 'Super Admin';

export function isSuperAdminRole(roleName: string | null | undefined): boolean {
  return roleName === SUPER_ADMIN_ROLE_NAME;
}
