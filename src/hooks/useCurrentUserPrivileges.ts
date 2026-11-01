'use client';

import {
  canAccessAppPath,
  canAccessMenuHref,
  getFirstAccessibleHref,
  hasAnyPrivilegeForHrefs,
  hasPrivilegeForHref,
  normalizeAppPathname,
  type PrivilegeRequirement,
} from '@/src/lib/currentUserPrivileges';
import { useCurrentUserPrivilegesStore } from '@/src/store/useCurrentUserPrivilegesStore';

export function useCurrentUserPrivileges() {
  const data = useCurrentUserPrivilegesStore((state) => state.data);
  const isLoading = useCurrentUserPrivilegesStore((state) => state.isLoading);
  const error = useCurrentUserPrivilegesStore((state) => state.error);
  const activeRouteHrefs = useCurrentUserPrivilegesStore(
    (state) => state.activeRouteHrefs,
  );
  const menuItemsByHref = useCurrentUserPrivilegesStore(
    (state) => state.menuItemsByHref,
  );
  const menuItemsById = useCurrentUserPrivilegesStore(
    (state) => state.menuItemsById,
  );

  return {
    data,
    isLoading,
    error,
    firstAccessibleHref: getFirstAccessibleHref(activeRouteHrefs),
    canAccessPath: (pathname: string) =>
      canAccessAppPath(pathname, { activeRouteHrefs, menuItemsByHref }),
    canAccessMenuHref: (href: string) =>
      canAccessMenuHref(href, activeRouteHrefs),
    hasPrivilegeForHref: (href: string, requirement: PrivilegeRequirement) =>
      hasPrivilegeForHref(href, requirement, menuItemsByHref),
    hasAnyPrivilegeForHrefs: (
      hrefs: string[],
      requirements: PrivilegeRequirement[],
    ) => hasAnyPrivilegeForHrefs(hrefs, requirements, menuItemsByHref),
    getMenuItemsByHref: (href: string) =>
      menuItemsByHref.get(href.replace(/^\/(en|ar)(?=\/|$)/, '') || '/') ?? [],
    getMenuItemById: (menuItemId: number) => menuItemsById.get(menuItemId),
  };
}

export function useRoutePrivileges(routeHref: string | string[]) {
  const hrefs = (Array.isArray(routeHref) ? routeHref : [routeHref]).map(
    normalizeAppPathname,
  );
  const privileges = useCurrentUserPrivileges();

  return {
    ...privileges,
    hrefs,
    canAccess: hrefs.some((href) => privileges.canAccessMenuHref(href)),
    hasPrivilege: (requirement: PrivilegeRequirement) =>
      hrefs.some((href) => privileges.hasPrivilegeForHref(href, requirement)),
    hasAnyPrivilege: (requirements: PrivilegeRequirement[]) =>
      privileges.hasAnyPrivilegeForHrefs(hrefs, requirements),
  };
}
