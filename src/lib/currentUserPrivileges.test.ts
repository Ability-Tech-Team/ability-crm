import { FileSpreadsheet, ScrollText } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import type { RoleMenu } from '@/src/types/rolePrivileges';
import {
  buildCurrentUserPrivilegeIndexes,
  canAccessAppPath,
  PRIVILEGE_IDS,
} from './currentUserPrivileges';
import { buildSidebarMenu } from './sidebarMenu';

const active = (id: number, name: string) => ({ id, name, status: 1 });

const MENUS: RoleMenu[] = [
  {
    id: 3,
    menuName: 'Definitions',
    menuitems: [
      { id: 31, name: 'ERP codes', href: '/definitions/erp-codes', privileges: [active(PRIVILEGE_IDS.READ, 'Read')] },
      { id: 32, name: 'Departments', href: '/definitions/department', privileges: [{ id: 34, name: 'Read', status: 0 }] },
      { id: 33, name: 'Locations', href: '/definitions/location', privileges: [active(PRIVILEGE_IDS.READ, 'Read')] },
    ],
  },
  {
    id: 90,
    menuName: 'Imports',
    menuitems: [
      { id: 91, name: 'Customers', href: '/imports/customers', privileges: [active(PRIVILEGE_IDS.ADD, 'Add')] },
      { id: 92, name: 'History', href: '/imports/history', privileges: [active(PRIVILEGE_IDS.READ, 'Read')] },
    ],
  },
  {
    // Amer CRM's Logs menu is 29; here the id is whatever the client's data says.
    id: 96,
    menuName: 'Logs',
    menuitems: [
      { id: 961, name: 'Search', href: '/logs/search', privileges: [active(PRIVILEGE_IDS.READ, 'Read')] },
    ],
  },
  {
    id: 19,
    menuName: 'Invoices',
    menuitems: [
      { id: 191, name: 'Search', href: '/invoices/search', privileges: [active(PRIVILEGE_IDS.EXPORT, 'Export')] },
    ],
  },
];

const indexes = buildCurrentUserPrivilegeIndexes(MENUS);

describe('canAccessAppPath', () => {
  it('opens the renamed ERP codes screen by its new key', () => {
    expect(canAccessAppPath('/definitions/erp-codes', indexes)).toBe(true);
    expect(canAccessAppPath('/en/definitions/erp-codes', indexes)).toBe(true);
    // The old SAP route is not a route any more.
    expect(canAccessAppPath('/definitions/sap-z-codes', indexes)).toBe(false);
  });

  it('opens the import screens the role has', () => {
    expect(canAccessAppPath('/imports/customers', indexes)).toBe(true);
    expect(canAccessAppPath('/imports/history', indexes)).toBe(true);
    expect(canAccessAppPath('/imports/units', indexes)).toBe(false);
  });

  it('opens Import Unit Debts for whoever has another import sheet screen', () => {
    expect(canAccessAppPath('/imports/unit-debts', indexes)).toBe(true);
    expect(canAccessAppPath('/ar/imports/unit-debts', indexes)).toBe(true);

    // Import History alone is not an import sheet screen.
    const historyOnly = buildCurrentUserPrivilegeIndexes([
      {
        id: 90,
        menuName: 'Imports',
        menuitems: [
          { id: 92, name: 'History', href: '/imports/history', privileges: [active(PRIVILEGE_IDS.READ, 'Read')] },
        ],
      },
    ]);
    expect(canAccessAppPath('/imports/unit-debts', historyOnly)).toBe(false);
    expect(canAccessAppPath('/imports/unit-debts', buildCurrentUserPrivilegeIndexes([]))).toBe(false);
  });

  it('opens the logs search the role has', () => {
    expect(canAccessAppPath('/logs/search', indexes)).toBe(true);
    expect(canAccessAppPath('/ar/logs/search', indexes)).toBe(true);
  });

  it('denies screens whose privileges are all inactive', () => {
    expect(canAccessAppPath('/definitions/department', indexes)).toBe(false);
  });

  it('opens the projects definitions for the Super Admin only, whatever the tree holds', () => {
    expect(canAccessAppPath('/definitions/projects', indexes, { isSuperAdmin: true })).toBe(true);
    expect(canAccessAppPath('/ar/definitions/sub-projects', indexes, { isSuperAdmin: true })).toBe(true);
    expect(canAccessAppPath('/definitions/projects', indexes)).toBe(false);
    expect(canAccessAppPath('/definitions/sub-projects', indexes, { isSuperAdmin: false })).toBe(false);
    const withItem = buildCurrentUserPrivilegeIndexes([
      {
        id: 3,
        menuName: 'Definitions',
        menuitems: [
          { id: 39, name: 'Projects', href: '/definitions/projects', privileges: [active(PRIVILEGE_IDS.READ, 'Read')] },
        ],
      },
    ]);
    expect(canAccessAppPath('/definitions/projects', withItem)).toBe(false);
  });

  it('denies paths without a rule (fails closed)', () => {
    expect(canAccessAppPath('/something-new', indexes)).toBe(false);
  });

  it('requires a read privilege for detail pages', () => {
    // The role holds Export on invoices, not Read or Read All.
    expect(canAccessAppPath('/invoices/search', indexes)).toBe(true);
    expect(canAccessAppPath('/invoices/12', indexes)).toBe(false);
  });
});

describe('buildSidebarMenu', () => {
  const labels = {
    importUnitDebts: 'Import Unit Debts',
    projects: 'Projects',
    subProjects: 'Sub-projects',
  };
  const items = buildSidebarMenu(MENUS, labels);

  it('shows only screens with an active privilege', () => {
    const definitions = items.find((item) => item.id === '3');
    // Departments is inactive and ERP codes is hidden, so one item is left:
    // a direct link, not a group.
    expect(definitions).toMatchObject({ href: '/definitions/location' });
    expect(definitions?.subItems).toBeUndefined();
  });

  it('keeps ERP codes off the menu even when the role has it', () => {
    const hrefs = items.flatMap((item) => [
      item.href,
      ...(item.subItems?.map((sub) => sub.href) ?? []),
    ]);
    expect(hrefs).not.toContain('/definitions/erp-codes');
    // The page itself still opens for the role.
    expect(canAccessAppPath('/definitions/erp-codes', indexes)).toBe(true);
  });

  it('groups menus with several screens, adding Import Unit Debts before the history', () => {
    const imports = items.find((item) => item.id === '90');
    expect(imports?.subItems?.map((sub) => sub.href)).toEqual([
      '/imports/customers',
      '/imports/unit-debts',
      '/imports/history',
    ]);
    expect(imports?.subItems?.[1]).toMatchObject({
      id: '90-unit-debts',
      label: 'Import Unit Debts',
    });
  });

  it('lists Import Unit Debts once when the role has its menu item', () => {
    const withItem = buildSidebarMenu(
      [
        {
          id: 90,
          menuName: 'Imports',
          menuitems: [
            { id: 91, name: 'Import Customers', href: '/imports/customers', privileges: [active(66, 'Import')] },
            { id: 143, name: 'Import Unit Debts', href: '/imports/unit-debts', privileges: [active(66, 'Import')] },
          ],
        },
      ],
      labels,
    );
    expect(withItem[0].subItems?.map((sub) => sub.id)).toEqual(['90-91', '90-143']);
  });

  it('adds Import Unit Debts to no menu without an import sheet screen', () => {
    const hrefs = buildSidebarMenu(MENUS.filter((menu) => menu.id !== 90), labels).flatMap((item) => [
      item.href,
      ...(item.subItems?.map((sub) => sub.href) ?? []),
    ]);
    expect(hrefs).not.toContain('/imports/unit-debts');
  });

  it('adds Projects and Sub-projects to the Definitions menu for the Super Admin only', () => {
    const definitionsHrefs = (isSuperAdmin: boolean) =>
      buildSidebarMenu(MENUS, labels, { isSuperAdmin })
        .find((item) => item.id === '3')
        ?.subItems?.map((sub) => sub.href) ?? [];
    expect(definitionsHrefs(true)).toEqual([
      '/definitions/location',
      '/definitions/projects',
      '/definitions/sub-projects',
    ]);
    // Without them the one screen left is a direct link.
    expect(buildSidebarMenu(MENUS, labels).find((item) => item.id === '3')).toMatchObject({
      href: '/definitions/location',
    });
  });

  it('recognizes the Logs and Imports menus by their screens, not their ids', () => {
    expect(items.find((item) => item.id === '96')?.icon).toBe(ScrollText);
    expect(items.find((item) => item.id === '90')?.icon).toBe(FileSpreadsheet);
  });
});
