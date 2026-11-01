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
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { hasActivePrivileges } from '@/src/lib/currentUserPrivileges';
import type { RoleMenu } from '@/src/types/rolePrivileges';
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
 * they are recognized by their screens' hrefs.
 */
const MENU_ICON_BY_HREF_PREFIX: { prefix: string; icon: LucideIcon }[] = [
  { prefix: '/imports/', icon: FileSpreadsheet },
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

const buildSubItems = (menu: RoleMenu): SidebarSubItem[] => {
  if (!menu.menuitems?.length) return [];

  const subItems: SidebarSubItem[] = [];
  const seenHrefs = new Set<string>();

  for (const item of menu.menuitems) {
    if (!item.href || seenHrefs.has(item.href) || !hasActivePrivileges(item)) {
      continue;
    }

    seenHrefs.add(item.href);
    subItems.push({
      id: `${menu.id}-${item.id}`,
      label: item.name,
      icon: SUB_ITEM_ICON,
      href: item.href,
    });
  }

  return orderSubItems(menu.id, subItems);
};

export const buildSidebarMenu = (menus: RoleMenu[]): SidebarItem[] => {
  const items: SidebarItem[] = [];

  for (const menu of applyMenuPlacements(menus)) {
    const icon =
      MENU_ICON_MAP[menu.id] ?? iconForMenuHrefs(menu) ?? FALLBACK_ICON;
    const menuItems =
      menu.menuitems?.filter(
        (menuItem) => menuItem.href && hasActivePrivileges(menuItem),
      ) ?? [];

    // Single menu item → render as a direct link
    if (menuItems.length === 1) {
      items.push({
        id: String(menu.id),
        label: menu.menuName,
        icon,
        href: menuItems[0].href!,
      });
      continue;
    }

    // Multiple menu items → render as expandable parent with sub-items
    const subItems = buildSubItems(menu);
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
