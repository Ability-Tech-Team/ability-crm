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

  it('denies screens whose privileges are all inactive', () => {
    expect(canAccessAppPath('/definitions/department', indexes)).toBe(false);
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
  const items = buildSidebarMenu(MENUS);

  it('shows only screens with an active privilege', () => {
    const definitions = items.find((item) => item.id === '3');
    // One active item left: a direct link, not a group.
    expect(definitions).toMatchObject({ href: '/definitions/erp-codes' });
  });

  it('groups menus with several screens', () => {
    const imports = items.find((item) => item.id === '90');
    expect(imports?.subItems?.map((sub) => sub.href)).toEqual([
      '/imports/customers',
      '/imports/history',
    ]);
  });
});
