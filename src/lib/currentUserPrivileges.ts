import type {
  RoleMenu,
  RoleMenuItem,
  RolePrivilege,
} from '@/src/types/rolePrivileges';

export const PRIVILEGE_IDS = {
  ADD: 1,
  ASSIGN_EMPLOYEE: 3,
  COLLECT_INVOICE: 7,
  DELETE: 13,
  EDIT: 17,
  END_OF_DAY: 19,
  EXPORT: 21,
  FULL_END_OF_DAY: 23,
  READ: 34,
  READ_ALL: 35,
  VOID: 49,
  VOID_REJECT_REQUEST: 52,
  VOID_REQUEST: 50,
  ACCEPT: 53,
  REJECT: 54,
  ACCEPT_VOID_REQUEST: 55,
  REFUND: 56,
  REFUND_REQUEST: 57,
  REJECT_REFUND_REQUEST: 58,
  ACCEPT_REFUND_REQUEST: 59,
  REVERT_ACCEPT: 60,
  CLOSE: 61,
  INVALID: 62,
  FINANCE_BLOCK: 63,
  LEGAL_BLOCK: 64,
  UNBLOCK: 65,
} as const;

export type PrivilegeRequirement = number | string;

export type AppRouteAccessRule = {
  pattern: string;
  allowedHrefs: string[];
  requiredPrivileges?: PrivilegeRequirement[];
};

export type CurrentUserPrivilegeIndexes = {
  activeRouteHrefs: Set<string>;
  menuItemsById: Map<number, RoleMenuItem>;
  menuItemsByHref: Map<string, RoleMenuItem[]>;
};

const DETAIL_READ_PRIVILEGES = [PRIVILEGE_IDS.READ, PRIVILEGE_IDS.READ_ALL];

const PRIVILEGE_NAME_FALLBACKS: Partial<Record<number, string[]>> = {
  [PRIVILEGE_IDS.ADD]: ['add', 'create'],
  [PRIVILEGE_IDS.ASSIGN_EMPLOYEE]: ['assign employee', 'assign'],
  [PRIVILEGE_IDS.COLLECT_INVOICE]: ['collect invoice', 'collect'],
  [PRIVILEGE_IDS.DELETE]: ['delete', 'remove'],
  [PRIVILEGE_IDS.EDIT]: ['edit', 'update'],
  [PRIVILEGE_IDS.END_OF_DAY]: ['end of day'],
  [PRIVILEGE_IDS.EXPORT]: ['export'],
  [PRIVILEGE_IDS.FULL_END_OF_DAY]: ['full end of day'],
  [PRIVILEGE_IDS.READ]: ['read', 'view'],
  [PRIVILEGE_IDS.READ_ALL]: ['read all', 'view all'],
  [PRIVILEGE_IDS.VOID]: ['void'],
  [PRIVILEGE_IDS.VOID_REJECT_REQUEST]: [
    'void reject request',
    'reject void request',
    'reject void',
  ],
  [PRIVILEGE_IDS.VOID_REQUEST]: [
    'void request',
    'request void',
    'void requested',
  ],
  [PRIVILEGE_IDS.ACCEPT_VOID_REQUEST]: ['accept void request', 'accept void'],
  [PRIVILEGE_IDS.REFUND]: ['refund'],
  [PRIVILEGE_IDS.REFUND_REQUEST]: [
    'refund request',
    'request refund',
    'refund requested',
  ],
  [PRIVILEGE_IDS.REJECT_REFUND_REQUEST]: [
    'reject refund request',
    'reject refund',
  ],
  [PRIVILEGE_IDS.ACCEPT_REFUND_REQUEST]: [
    'accept refund request',
    'accept refund',
  ],
  [PRIVILEGE_IDS.REVERT_ACCEPT]: [
    'revert accept',
    'revert accepted',
    'undo accept',
    'undo',
  ],
  [PRIVILEGE_IDS.CLOSE]: ['close'],
  [PRIVILEGE_IDS.INVALID]: ['invalid', 'wrong ticket'],
  [PRIVILEGE_IDS.FINANCE_BLOCK]: ['finance block', 'finance'],
  [PRIVILEGE_IDS.LEGAL_BLOCK]: ['legal block', 'legal'],
  [PRIVILEGE_IDS.UNBLOCK]: ['unblock'],
};

export const APP_ROUTE_ACCESS_RULES: AppRouteAccessRule[] = [
  // Bare `/dashboard` server-redirects to a sub-tab; allow it whenever the
  // user has access to ANY of the new dashboard menu items.
  {
    pattern: '/dashboard',
    allowedHrefs: [
      '/dashboard',
      '/dashboard/statistics',
      '/dashboard/tickets',
      '/dashboard/complaints',
    ],
  },
  {
    pattern: '/dashboard/statistics',
    allowedHrefs: ['/dashboard/statistics', '/dashboard'],
  },
  {
    pattern: '/dashboard/tickets',
    allowedHrefs: ['/dashboard/tickets'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/dashboard/complaints',
    allowedHrefs: ['/dashboard/complaints'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/definitions/department',
    allowedHrefs: ['/definitions/department'],
  },
  {
    pattern: '/definitions/invoice-types',
    allowedHrefs: ['/definitions/invoice-types'],
  },
  {
    pattern: '/definitions/location',
    allowedHrefs: ['/definitions/location'],
  },
  {
    pattern: '/definitions/location-type',
    allowedHrefs: ['/definitions/location-type'],
  },
  {
    pattern: '/definitions/positions',
    allowedHrefs: ['/definitions/positions'],
  },
  {
    pattern: '/definitions/unit-block-categories',
    allowedHrefs: ['/definitions/unit-block-categories'],
  },
  {
    pattern: '/definitions/sister-companies',
    allowedHrefs: ['/definitions/sister-companies'],
  },
  {
    pattern: '/definitions/rental-companies',
    allowedHrefs: ['/definitions/rental-companies'],
  },
  // The permission tree's screen key for ERP account codes (formerly
  // `/definitions/sap-z-codes`).
  {
    pattern: '/definitions/erp-codes',
    allowedHrefs: ['/definitions/erp-codes'],
  },
  { pattern: '/document-library', allowedHrefs: ['/document-library'] },
  // Excel imports (new in Ability CRM); each screen has its own menu item.
  { pattern: '/imports/units', allowedHrefs: ['/imports/units'] },
  { pattern: '/imports/customers', allowedHrefs: ['/imports/customers'] },
  { pattern: '/imports/relatives', allowedHrefs: ['/imports/relatives'] },
  { pattern: '/imports/unit-debts', allowedHrefs: ['/imports/unit-debts'] },
  { pattern: '/imports/history', allowedHrefs: ['/imports/history'] },

  { pattern: '/complaints/add', allowedHrefs: ['/complaints/add'] },
  { pattern: '/complaints/add/create', allowedHrefs: ['/complaints/add'] },
  { pattern: '/complaints/search', allowedHrefs: ['/complaints/search'] },
  {
    pattern: '/complaints/[id]',
    allowedHrefs: ['/complaints/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  { pattern: '/customers/search', allowedHrefs: ['/customers/search'] },
  {
    pattern: '/customers/[id]',
    allowedHrefs: ['/customers/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/customers/relative-requests',
    allowedHrefs: ['/customers/relative-requests'],
  },
  { pattern: '/inquiries/add', allowedHrefs: ['/inquiries/add'] },
  { pattern: '/inquiries/search', allowedHrefs: ['/inquiries/search'] },
  {
    pattern: '/inquiries/[id]',
    allowedHrefs: ['/inquiries/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/invoices/end-of-day',
    allowedHrefs: ['/invoices/end-of-day'],
  },
  {
    pattern: '/invoices/full-end-of-day',
    allowedHrefs: ['/invoices/full-end-of-day'],
  },
  { pattern: '/invoices/search', allowedHrefs: ['/invoices/search'] },
  { pattern: '/invoices/refund', allowedHrefs: ['/invoices/refund'] },
  {
    pattern: '/invoices/[id]',
    allowedHrefs: ['/invoices/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/ownership-management/add',
    allowedHrefs: ['/ownership-management/add'],
  },
  {
    pattern: '/ownership-management/search',
    allowedHrefs: ['/ownership-management/search'],
  },
  {
    pattern: '/ownership-management/[id]',
    allowedHrefs: ['/ownership-management/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/reports/daily-invoices',
    allowedHrefs: ['/reports/daily-invoices'],
  },
  {
    pattern: '/reports/departmental-services',
    allowedHrefs: ['/reports/departmental-services'],
  },
  {
    pattern: '/reports/end-of-day',
    allowedHrefs: ['/reports/end-of-day'],
  },
  { pattern: '/rentals/add', allowedHrefs: ['/rentals/add'] },
  {
    pattern: '/rentals/add/create',
    allowedHrefs: ['/rentals/add'],
    requiredPrivileges: [PRIVILEGE_IDS.ADD],
  },
  {
    pattern: '/rentals/rental-requests',
    allowedHrefs: ['/rentals/rental-requests'],
  },
  {
    pattern: '/rentals/rental-requests/[id]',
    allowedHrefs: ['/rentals/rental-requests'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/rentals/rentals-walk-in',
    allowedHrefs: ['/rentals/rentals-walk-in'],
    requiredPrivileges: [PRIVILEGE_IDS.ADD],
  },
  { pattern: '/rentals/search', allowedHrefs: ['/rentals/search'] },
  {
    pattern: '/rentals/[id]',
    allowedHrefs: ['/rentals/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  { pattern: '/roles/add', allowedHrefs: ['/roles/add'] },
  { pattern: '/roles/manage', allowedHrefs: ['/roles/manage'] },
  { pattern: '/services/add', allowedHrefs: ['/services/add'] },
  { pattern: '/services/search', allowedHrefs: ['/services/search'] },
  {
    pattern: '/services/[id]',
    allowedHrefs: ['/services/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  { pattern: '/settings/search', allowedHrefs: ['/settings/search'] },
  { pattern: '/tickets/add', allowedHrefs: ['/tickets/add'] },
  { pattern: '/tickets/add/create', allowedHrefs: ['/tickets/add'] },
  { pattern: '/tickets/search', allowedHrefs: ['/tickets/search'] },
  {
    pattern: '/tickets/[id]',
    allowedHrefs: ['/tickets/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  { pattern: '/tickets/cts/add', allowedHrefs: ['/tickets/cts/add'] },
  {
    pattern: '/tickets/cts/add/create',
    allowedHrefs: ['/tickets/cts/add'],
  },
  { pattern: '/tickets/cts/search', allowedHrefs: ['/tickets/cts/search'] },
  {
    pattern: '/tickets/cts/[id]',
    allowedHrefs: ['/tickets/cts/search', '/tickets/cts/add'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  {
    pattern: '/tickets/cts/[id]/edit',
    allowedHrefs: ['/tickets/cts/add'],
    requiredPrivileges: [PRIVILEGE_IDS.EDIT],
  },
  {
    pattern: '/tickets/concessions/add',
    allowedHrefs: ['/tickets/concessions/add'],
  },
  {
    pattern: '/tickets/concessions/add/create',
    allowedHrefs: ['/tickets/concessions/add'],
    requiredPrivileges: [PRIVILEGE_IDS.ADD],
  },
  {
    pattern: '/tickets/concessions/[id]',
    allowedHrefs: ['/tickets/concessions/add', '/tickets/concessions/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  { pattern: '/units/search', allowedHrefs: ['/units/search'] },
  {
    pattern: '/units/[id]',
    allowedHrefs: ['/units/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
  { pattern: '/users/add', allowedHrefs: ['/users/add'] },
  { pattern: '/users/manage', allowedHrefs: ['/users/manage'] },
  { pattern: '/unit-blocks/add', allowedHrefs: ['/unit-blocks/add'] },
  { pattern: '/unit-blocks/add/create', allowedHrefs: ['/unit-blocks/add'] },
  { pattern: '/unit-blocks/search', allowedHrefs: ['/unit-blocks/search'] },
  {
    pattern: '/unit-blocks/[id]/edit',
    allowedHrefs: ['/unit-blocks/search'],
    requiredPrivileges: [PRIVILEGE_IDS.EDIT],
  },

  {
    pattern: '/users/legal-users-add',
    allowedHrefs: ['/users/legal-users-add'],
  },
  {
    pattern: '/users/legal-users-manage',
    allowedHrefs: ['/users/legal-users-manage'],
  },

  {
    // Reached from the history icon on the search page, so it opens for
    // anyone who can see that page; a menu item of its own also works.
    pattern: '/unit-blocks/block-history',
    allowedHrefs: ['/unit-blocks/block-history', '/unit-blocks/search'],
  },
  {
    // One block, read-only, opened from a history row. Must stay below the
    // literal /unit-blocks/* rules: the matcher takes the first rule whose
    // segment count lines up, and `[id]` matches `add` and `search` too.
    pattern: '/unit-blocks/[id]',
    allowedHrefs: ['/unit-blocks/block-history', '/unit-blocks/search'],
    requiredPrivileges: DETAIL_READ_PRIVILEGES,
  },
];

export function normalizeAppPathname(pathname: string): string {
  const normalizedPath = pathname.replace(/^\/(en|ar)(?=\/|$)/, '') || '/';
  if (normalizedPath === '/') {
    return normalizedPath;
  }

  return normalizedPath.replace(/\/+$/, '');
}

export function normalizePrivilegeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function matchesPrivilegeName(
  privilegeName: string,
  requirement: string,
): boolean {
  const normalizedPrivilegeName = normalizePrivilegeName(privilegeName);
  const normalizedRequirement = normalizePrivilegeName(requirement);

  if (normalizedPrivilegeName === normalizedRequirement) {
    return true;
  }

  // Support common backend variants like "Delete Role" or "Edit User".
  return normalizedPrivilegeName.includes(normalizedRequirement);
}

function normalizePrivilegeId(id: unknown): number | null {
  const numericId = Number(id);
  return Number.isFinite(numericId) ? numericId : null;
}

/**
 * Find the most specific PRIVILEGE_ID whose fallback name list best matches
 * the given privilege name. Uses the longest matching fallback string as the
 * tiebreaker so e.g. "Void Request" maps to VOID_REQUEST, not VOID.
 *
 * Returns null when no fallback list matches the name.
 */
function findBestFallbackPrivilegeId(privilegeName: string): number | null {
  const normalizedName = normalizePrivilegeName(privilegeName);
  let bestId: number | null = null;
  let bestLength = -1;

  for (const [idKey, names] of Object.entries(PRIVILEGE_NAME_FALLBACKS)) {
    const id = Number(idKey);
    if (!Number.isFinite(id) || !names) continue;

    for (const candidate of names) {
      const normalizedCandidate = normalizePrivilegeName(candidate);
      if (
        normalizedName === normalizedCandidate ||
        normalizedName.includes(normalizedCandidate)
      ) {
        if (normalizedCandidate.length > bestLength) {
          bestLength = normalizedCandidate.length;
          bestId = id;
        }
      }
    }
  }

  return bestId;
}

export function getActivePrivileges(item: RoleMenuItem): RolePrivilege[] {
  return item.privileges.filter((privilege) => Number(privilege.status) === 1);
}

export function hasActivePrivileges(item: RoleMenuItem): boolean {
  return getActivePrivileges(item).length > 0;
}

export function buildCurrentUserPrivilegeIndexes(
  menus: RoleMenu[],
): CurrentUserPrivilegeIndexes {
  const activeRouteHrefs = new Set<string>();
  const menuItemsById = new Map<number, RoleMenuItem>();
  const menuItemsByHref = new Map<string, RoleMenuItem[]>();

  for (const menu of menus) {
    for (const menuItem of menu.menuitems ?? []) {
      menuItemsById.set(menuItem.id, menuItem);

      if (!menuItem.href) {
        continue;
      }

      const normalizedHref = normalizeAppPathname(menuItem.href);
      const currentItems = menuItemsByHref.get(normalizedHref) ?? [];

      currentItems.push(menuItem);
      menuItemsByHref.set(normalizedHref, currentItems);

      if (hasActivePrivileges(menuItem)) {
        activeRouteHrefs.add(normalizedHref);
      }
    }
  }

  return {
    activeRouteHrefs,
    menuItemsById,
    menuItemsByHref,
  };
}

export function matchesRoutePattern(
  pathname: string,
  pattern: string,
): boolean {
  const normalizedPathname = normalizeAppPathname(pathname);
  const normalizedPattern = normalizeAppPathname(pattern);

  const pathnameSegments = normalizedPathname.split('/').filter(Boolean);
  const patternSegments = normalizedPattern.split('/').filter(Boolean);

  if (pathnameSegments.length !== patternSegments.length) {
    return false;
  }

  return patternSegments.every((segment, index) => {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      return true;
    }

    return pathnameSegments[index] === segment;
  });
}

export function findRouteAccessRule(
  pathname: string,
): AppRouteAccessRule | undefined {
  return APP_ROUTE_ACCESS_RULES.find((rule) =>
    matchesRoutePattern(pathname, rule.pattern),
  );
}

export function hasRequiredPrivilege(
  menuItem: RoleMenuItem,
  requirement: PrivilegeRequirement,
): boolean {
  const activePrivileges = getActivePrivileges(menuItem);

  if (typeof requirement === 'number') {
    const normalizedRequirementId = normalizePrivilegeId(requirement);
    if (normalizedRequirementId === null) {
      return false;
    }

    if (
      activePrivileges.some(
        (privilege) =>
          normalizePrivilegeId(privilege.id) === normalizedRequirementId,
      )
    ) {
      return true;
    }

    const fallbackNames =
      PRIVILEGE_NAME_FALLBACKS[normalizedRequirementId] ?? [];

    return fallbackNames.some((fallbackName) =>
      activePrivileges.some((privilege) => {
        if (!matchesPrivilegeName(privilege.name, fallbackName)) {
          return false;
        }

        // Disambiguate when one privilege name is a substring of another
        // (e.g. "Void" vs "Void Request"). Only accept this privilege as a
        // match for the requested ID if it isn't a better fit for a
        // different, more specific privilege ID.
        const bestId = findBestFallbackPrivilegeId(privilege.name);
        return bestId === null || bestId === normalizedRequirementId;
      }),
    );
  }

  return activePrivileges.some((privilege) =>
    matchesPrivilegeName(privilege.name, requirement),
  );
}

export function canAccessMenuHref(
  href: string,
  activeRouteHrefs: Set<string>,
): boolean {
  return activeRouteHrefs.has(normalizeAppPathname(href));
}

export function hasPrivilegeForHref(
  href: string,
  requirement: PrivilegeRequirement,
  menuItemsByHref: Map<string, RoleMenuItem[]>,
): boolean {
  const menuItems = menuItemsByHref.get(normalizeAppPathname(href)) ?? [];

  return menuItems.some((menuItem) =>
    hasRequiredPrivilege(menuItem, requirement),
  );
}

export function hasAnyPrivilegeForHrefs(
  hrefs: string[],
  requirements: PrivilegeRequirement[],
  menuItemsByHref: Map<string, RoleMenuItem[]>,
): boolean {
  return hrefs.some((href) =>
    requirements.some((requirement) =>
      hasPrivilegeForHref(href, requirement, menuItemsByHref),
    ),
  );
}

export function getFirstAccessibleHref(
  activeRouteHrefs: Set<string>,
): string | null {
  const [firstAccessibleHref] = Array.from(activeRouteHrefs);
  return firstAccessibleHref ?? null;
}

export function canAccessAppPath(
  pathname: string,
  indexes: Pick<
    CurrentUserPrivilegeIndexes,
    'activeRouteHrefs' | 'menuItemsByHref'
  >,
): boolean {
  const rule = findRouteAccessRule(pathname);

  if (!rule) {
    return false;
  }

  const accessibleMenuHrefs = rule.allowedHrefs.filter((href) =>
    canAccessMenuHref(href, indexes.activeRouteHrefs),
  );

  if (!accessibleMenuHrefs.length) {
    return false;
  }

  if (!rule.requiredPrivileges?.length) {
    return true;
  }

  return hasAnyPrivilegeForHrefs(
    accessibleMenuHrefs,
    rule.requiredPrivileges,
    indexes.menuItemsByHref,
  );
}
