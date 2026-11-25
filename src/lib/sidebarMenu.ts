import {
  BarChart3,
  BookOpen,
  Home,
  Wrench,
  User,
  TicketCheck,
  ReceiptText,
  Frown,
  FileBarChart,
  Users,
  Settings,
  UserCog2,
  List,
  Ban,
  FileSpreadsheet,
  ScrollText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  hasActivePrivileges,
  normalizeAppPathname,
  SUPER_ADMIN_HREFS,
  UNIT_DEBTS_IMPORT_ACCESS_HREFS,
  UNIT_DEBTS_IMPORT_HREF,
} from '@/src/lib/currentUserPrivileges';
import type { RoleMenu, RoleMenuItem } from '@/src/types/rolePrivileges';
import type { SidebarItem, SidebarSubItem } from '@/src/types/sidebar';

/** Maps parent menu IDs to icons. Unknown menus get the fallback icon. */
const MENU_ICON_MAP: Record<number, LucideIcon> = {
  1: BarChart3, // Dashboard
  3: BookOpen, // Definition
  7: Home, // Unit
  8: User, // Customers
  10: Wrench, // Services
  11: BookOpen, // DocumentLibrary
  12: BookOpen, // News
  14: BookOpen, // Rental
  16: TicketCheck, // Tickets
  18: Frown, // Complaints
  19: ReceiptText, // Invoices
  20: BookOpen, // Contract
  21: BookOpen, // Mobile Services
  22: FileBarChart, // Reports
  23: BookOpen, // Security
  24: Users, // Users
  25: UserCog2, // Roles
  26: Settings, // Settings
  28: Ban, // Unit Blocks
};

/**
 * Menus added in Ability CRM have ids that depend on the client's data, so
 * they are recognized by their screens' hrefs. Logs is menu 29 in Amer CRM;
 * that id isn't assumed here.
 */
const MENU_ICON_BY_HREF_PREFIX: { prefix: string; icon: LucideIcon }[] = [
  { prefix: '/imports/', icon: FileSpreadsheet },
  { prefix: '/logs/', icon: ScrollText },
];

const iconForMenuHrefs = (menu: RoleMenu): LucideIcon | undefined =>
  MENU_ICON_BY_HREF_PREFIX.find(({ prefix }) =>
    menu.menuitems?.some((item) => item.href?.startsWith(prefix)),
  )?.icon;

/** One menu lifted out of the backend's order and placed after another. */
const MENU_PLACEMENTS: { move: number; after: number }[] = [
  { move: 28, after: 7 }, // Unit Blocks, right after Unit
];

/**
 * The backend's order stands. Each placement only lifts one menu out and drops
 * it back in after another, leaving everything else exactly where it was; a
 * placement whose menus this role cannot see does nothing.
 */
const applyMenuPlacements = (menus: RoleMenu[]): RoleMenu[] => {
  let ordered = menus;

  for (const { move, after } of MENU_PLACEMENTS) {
    const moved = ordered.find((menu) => menu.id === move);
    const anchorAt = ordered.findIndex((menu) => menu.id === after);
    if (!moved || anchorAt === -1) continue;

    const rest = ordered.filter((menu) => menu.id !== move);
    const insertAt = rest.findIndex((menu) => menu.id === after) + 1;
    ordered = [...rest.slice(0, insertAt), moved, ...rest.slice(insertAt)];
  }

  return ordered;
};

const FALLBACK_ICON: LucideIcon = List;
const SUB_ITEM_ICON: LucideIcon = List;

/**
 * Screens kept off the menu even when the role has them. The page and its
 * route rule stay, so a direct link still opens it. Delete a line to show the
 * screen on the menu again.
 */
const HIDDEN_MENU_HREFS = new Set<string>([
  '/definitions/erp-codes', // ERP Codes, hidden 2026-11-22
]);

const isShownOnMenu = (
  item: RoleMenuItem,
): item is RoleMenuItem & { href: string } =>
  Boolean(item.href) &&
  !HIDDEN_MENU_HREFS.has(item.href ?? '') &&
  hasActivePrivileges(item);

/** Labels for the screens the menu adds itself, in the current language. */
export type SidebarLabels = {
  importUnitDebts: string;
  projects: string;
  subProjects: string;
};

/** Who is signed in, for the screens only some roles see. */
export type SidebarOptions = { isSuperAdmin?: boolean };

/** A screen as the menu lists it. */
type ShownItem = { key: string; name: string; href: string };

/**
 * The menu's screens to show.
 *
 * - Import Unit Debts needs no grant of its own
 *   (`UNIT_DEBTS_IMPORT_ACCESS_HREFS`), so the menu holding another import
 *   sheet screen gets it, before Import History, when the role lacks the item.
 * - For the Super Admin, the menu holding the definitions gets Projects and
 *   Sub-projects (`SUPER_ADMIN_HREFS`), which the permission tree has no
 *   items for.
 */
const shownItems = (
  menu: RoleMenu,
  labels: SidebarLabels,
  options: SidebarOptions,
): ShownItem[] => {
  const items: ShownItem[] = (menu.menuitems ?? [])
    .filter(isShownOnMenu)
    .map((item) => ({ key: String(item.id), name: item.name, href: item.href }));

  const hrefs = new Set(items.map((item) => normalizeAppPathname(item.href)));
  const grantsUnitDebts = UNIT_DEBTS_IMPORT_ACCESS_HREFS.some((href) =>
    hrefs.has(href),
  );
  if (!hrefs.has(UNIT_DEBTS_IMPORT_HREF) && grantsUnitDebts) {
    const unitDebts: ShownItem = {
      key: 'unit-debts',
      name: labels.importUnitDebts,
      href: UNIT_DEBTS_IMPORT_HREF,
    };
    const historyAt = items.findIndex(
      (item) => normalizeAppPathname(item.href) === '/imports/history',
    );
    items.splice(historyAt === -1 ? items.length : historyAt, 0, unitDebts);
  }

  const holdsDefinitions = [...hrefs].some((href) =>
    href.startsWith('/definitions/'),
  );
  if (options.isSuperAdmin && holdsDefinitions) {
    const superAdminItems: ShownItem[] = [
      { key: 'projects', name: labels.projects, href: SUPER_ADMIN_HREFS.projects },
      {
        key: 'sub-projects',
        name: labels.subProjects,
        href: SUPER_ADMIN_HREFS.subProjects,
      },
    ];
    items.push(...superAdminItems.filter((item) => !hrefs.has(item.href)));
  }

  return items;
};

/**
 * Sub-item order for one menu, by href. A menu not listed here keeps the
 * backend's order untouched, and so does any href the list omits — those
 * follow the listed ones, in the order the backend sent them.
 */
const SUB_ITEM_ORDER: Record<number, string[]> = {
  // Unit Blocks: add, then search, then block history.
  28: ['/unit-blocks/add', '/unit-blocks/search', '/unit-blocks/block-history'],
};

const orderSubItems = (
  menuId: number,
  subItems: SidebarSubItem[],
): SidebarSubItem[] => {
  const order = SUB_ITEM_ORDER[menuId];
  if (!order) return subItems;

  // An unlisted href sorts to the end; sort is stable, so those keep their
  // order relative to each other.
  const rank = (href: string) => {
    const at = order.indexOf(href);
    return at === -1 ? order.length : at;
  };

  return [...subItems].sort((a, b) => rank(a.href) - rank(b.href));
};

const buildSubItems = (
  menuId: number,
  items: ShownItem[],
): SidebarSubItem[] => {
  const subItems: SidebarSubItem[] = [];
  const seenHrefs = new Set<string>();

  for (const item of items) {
    if (seenHrefs.has(item.href)) continue;

    seenHrefs.add(item.href);
    subItems.push({
      id: `${menuId}-${item.key}`,
      label: item.name,
      icon: SUB_ITEM_ICON,
      href: item.href,
    });
  }

  return orderSubItems(menuId, subItems);
};

export const buildSidebarMenu = (
  menus: RoleMenu[],
  labels: SidebarLabels,
  options: SidebarOptions = {},
): SidebarItem[] => {
  const items: SidebarItem[] = [];

  for (const menu of applyMenuPlacements(menus)) {
    const icon =
      MENU_ICON_MAP[menu.id] ?? iconForMenuHrefs(menu) ?? FALLBACK_ICON;
    const menuItems = shownItems(menu, labels, options);

    // Single menu item → render as a direct link
    if (menuItems.length === 1) {
      items.push({
        id: String(menu.id),
        label: menu.menuName,
        icon,
        href: menuItems[0].href,
      });
      continue;
    }

    // Multiple menu items → render as expandable parent with sub-items
    const subItems = buildSubItems(menu.id, menuItems);
    if (subItems.length) {
      items.push({
        id: String(menu.id),
        label: menu.menuName,
        icon,
        subItems,
      });
    }
  }

  return items;
};
