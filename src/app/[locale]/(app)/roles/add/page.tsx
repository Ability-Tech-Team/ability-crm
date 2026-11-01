'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import Form, { FieldConfig, ButtonConfig } from '@/src/components/Form';
import ModulePermissionsPicker, {
  ModulePermission,
  ModuleOption,
  PermissionOption,
} from '@/src/components/ModulePermissionsPicker';
import AccessDenied from '@/src/components/AccessDenied';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { usePrivileges } from '@/src/hooks/usePrivileges';
import {
  buildPrivilegeMap,
  flattenMenuItems,
  createRole,
  type PrivilegeDto,
} from '@/src/services/privileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getRolePrivilegesById, updateRole } from '@/src/services/roles';
import { useRouter } from '@/src/i18n/navigation';
import { useSidebarStore } from '@/src/store/useSidebarStore';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';

const PERMISSIONS_STORAGE_KEY = 'roles-add-permissions';
const MAX_ROLE_NAME_LENGTH = 50;

const addRoleSchema = z.object({
  roleNameEn: z
    .string()
    .trim()
    .min(1, 'English role name is required')
    .max(
      MAX_ROLE_NAME_LENGTH,
      `English role name must not exceed ${MAX_ROLE_NAME_LENGTH} characters`,
    ),
  roleNameAr: z
    .string()
    .trim()
    .min(1, 'Arabic role name is required')
    .max(
      MAX_ROLE_NAME_LENGTH,
      `Arabic role name must not exceed ${MAX_ROLE_NAME_LENGTH} characters`,
    ),
});

type StoredPermission = { module: string; permissions: string[] };

export default function RolesAdd() {
  const t = useTranslations('roles');
  const tForm = useTranslations('form');
  const router = useRouter();
  const searchParams = useSearchParams();
  const refreshSidebarMenu = useSidebarStore((s) => s.refreshSidebarMenu);
  const { success: showSuccess, error: showError } = useResponseMessage();

  const editId = searchParams.get('edit');
  const isEditMode = Boolean(editId);
  const addRolePrivileges = useRoutePrivileges('/roles/add');
  const manageRolePrivileges = useRoutePrivileges('/roles/manage');
  const canCreateRole = addRolePrivileges.canAccess;
  const canEditRole = manageRolePrivileges.hasPrivilege(PRIVILEGE_IDS.EDIT);

  const { data: privilegesData, isLoading: privilegesLoading } =
    usePrivileges();

  const [modulePermissions, setModulePermissions] = useState<
    ModulePermission[]
  >([]);
  const [permissionsError, setPermissionsError] = useState('');
  const [editInitialValues, setEditInitialValues] = useState<{
    roleNameEn: string;
    roleNameAr: string;
  } | null>(null);
  const [isEditLoading, setIsEditLoading] = useState(() => isEditMode);
  const [originalPrivileges, setOriginalPrivileges] = useState<PrivilegeDto[]>(
    [],
  );

  // Build module options from menu items
  const moduleOptions: ModuleOption[] = useMemo(() => {
    if (!privilegesData) return [];
    const menuitems = flattenMenuItems(privilegesData.result);
    return menuitems.map((item) => ({
      value: String(item.id),
      label: item.name,
    }));
  }, [privilegesData]);

  // Build privilege map: menuItemId -> available privileges
  const privilegeMap: Map<string, PermissionOption[]> = useMemo(() => {
    if (!privilegesData) return new Map();
    const rawMap = buildPrivilegeMap(privilegesData.result);
    // Convert to PermissionOption format
    const formattedMap = new Map<string, PermissionOption[]>();
    rawMap.forEach((privileges, menuItemId) => {
      formattedMap.set(
        String(menuItemId),
        privileges.map((p) => ({
          value: String(p.id),
          label: p.name,
        })),
      );
    });
    return formattedMap;
  }, [privilegesData]);

  // Rebuild full ModulePermission[] from stored raw data + current locale labels
  const hydrate = useCallback(
    (stored: StoredPermission[]): ModulePermission[] =>
      stored
        .map((sp) => {
          const mod = moduleOptions.find((m) => m.value === sp.module);
          if (!mod) return null;

          // Get available permissions for this module
          const availablePerms = privilegeMap.get(sp.module) || [];

          return {
            module: sp.module,
            moduleLabel: mod.label,
            permissions: sp.permissions,
            permissionLabels: sp.permissions.map(
              (p) => availablePerms.find((po) => po.value === p)?.label || p,
            ),
          };
        })
        .filter(Boolean) as ModulePermission[],
    [moduleOptions, privilegeMap],
  );

  // Load persisted permissions on mount & re-hydrate labels on language change
  // Skip localStorage hydration in edit mode — we load from API instead
  useEffect(() => {
    if (isEditMode) return;
    // Wait for privileges to load
    if (!moduleOptions.length || !privilegeMap.size) {
      return;
    }

    let isActive = true;
    const timer = window.setTimeout(() => {
      if (!isActive) {
        return;
      }

      try {
        const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
        if (raw) {
          const stored: StoredPermission[] = JSON.parse(raw);
          setModulePermissions(hydrate(stored));
        }
      } catch {
        // ignore corrupt data
      }

      isActive = false;
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timer);
    };
  }, [hydrate, moduleOptions.length, privilegeMap.size, isEditMode]);

  // ── Edit mode: Fetch existing role privileges ──
  useEffect(() => {
    if (!editId || !moduleOptions.length || !privilegeMap.size) return;

    const controller = new AbortController();

    getRolePrivilegesById(editId, controller.signal)
      .then((data) => {
        // data.result is MenuGroup[] — same shape as get-privileges
        // Build StoredPermission[] from it and hydrate
        const stored: StoredPermission[] = [];
        const groups = Array.isArray(data.result) ? data.result : [];
        for (const group of groups) {
          if (!group.menuitems) continue;
          for (const item of group.menuitems) {
            const activePrivileges = item.privileges
              .filter((p) => p.status === 1)
              .map((p) => String(p.id));
            if (activePrivileges.length > 0) {
              stored.push({
                module: String(item.id),
                permissions: activePrivileges,
              });
            }
          }
        }
        setModulePermissions(hydrate(stored));

        // Store original privileges so we can diff on update
        const origPrivileges: PrivilegeDto[] = [];
        for (const group of groups) {
          if (!group.menuitems) continue;
          for (const item of group.menuitems) {
            for (const p of item.privileges) {
              if (p.status === 1) {
                origPrivileges.push({
                  menuitem_id: item.id,
                  privilege_id: p.id,
                  status: 1,
                });
              }
            }
          }
        }
        setOriginalPrivileges(origPrivileges);

        // Pre-fill role names from query params
        setEditInitialValues({
          roleNameEn:
            searchParams.get('en_name') || searchParams.get('name') || '',
          roleNameAr:
            searchParams.get('ar_name') || searchParams.get('name') || '',
        });
      })
      .catch((err) => {
        if (err?.name !== 'CanceledError') {
          console.error('Failed to load role privileges:', err);
        }
      })
      .finally(() => setIsEditLoading(false));

    return () => controller.abort();
  }, [editId, moduleOptions.length, privilegeMap.size, hydrate, searchParams]);

  // Persist whenever modulePermissions changes (skip persistence in edit mode)
  const updateModulePermissions = (next: ModulePermission[]) => {
    setModulePermissions(next);
    if (!isEditMode) {
      const toStore: StoredPermission[] = next.map((mp) => ({
        module: mp.module,
        permissions: mp.permissions,
      }));
      localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(toStore));
    }
    if (next.length > 0) setPermissionsError('');
  };

  const fields: FieldConfig[] = [
    {
      name: 'roleNameEn',
      label: tForm('roleNameEn'),
      placeholder: tForm('roleNameEn'),
    },
    {
      name: 'roleNameAr',
      label: tForm('roleNameAr'),
      placeholder: tForm('roleNameAr'),
    },
  ];

  const buttons: ButtonConfig[] = [
    {
      label: isEditMode ? tForm('save') : tForm('add'),
      loadingLabel: isEditMode ? tForm('updating') : tForm('adding'),
      type: 'submit',
      variant: 'primary',
      onClick: () => {
        if (modulePermissions.length === 0) {
          setPermissionsError(t('permissionsRequired'));
        } else {
          setPermissionsError('');
        }
      },
    },
    {
      label: isEditMode ? tForm('cancel') : tForm('clear'),
      type: isEditMode ? 'button' : 'reset',
      variant: 'secondary',
      ...(isEditMode ? { onClick: () => router.push('/roles/manage') } : {}),
    },
  ];

  const handleSubmit = async (data: z.infer<typeof addRoleSchema>) => {
    // Validate that at least one module-permission is assigned
    if (modulePermissions.length === 0) {
      setPermissionsError(t('permissionsRequired'));
      return;
    }
    setPermissionsError('');

    // Transform modulePermissions to backend format
    const currentPrivileges: PrivilegeDto[] = modulePermissions.flatMap((mp) =>
      mp.permissions.map((permId) => ({
        menuitem_id: Number(mp.module),
        privilege_id: Number(permId),
        status: 1,
      })),
    );

    let privileges = currentPrivileges;

    // In edit mode, also send status:0 for removed privileges
    if (isEditMode) {
      const currentSet = new Set(
        currentPrivileges.map((p) => `${p.menuitem_id}:${p.privilege_id}`),
      );
      const removedPrivileges = originalPrivileges
        .filter((op) => !currentSet.has(`${op.menuitem_id}:${op.privilege_id}`))
        .map((op) => ({ ...op, status: 0 as number }));
      privileges = [...currentPrivileges, ...removedPrivileges];
    }

    const payload = {
      en_name: data.roleNameEn,
      ar_name: data.roleNameAr,
      privileges,
    };

    try {
      if (isEditMode && editId) {
        await updateRole(editId, payload);
        refreshSidebarMenu();
        showSuccess('updateSuccess');
        router.push('/roles/manage');
      } else {
        await createRole(payload);
        refreshSidebarMenu();
        showSuccess('createSuccess');
        // Clear form and permissions on success
        setModulePermissions([]);
        setPermissionsError('');
        localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
        router.replace('/roles/manage');
      }
    } catch (err) {
      showError(err);
    }
  };

  if ((isEditMode && !canEditRole) || (!isEditMode && !canCreateRole)) {
    return (
      <AccessDenied
        fallbackHref={
          manageRolePrivileges.firstAccessibleHref ?? '/roles/manage'
        }
      />
    );
  }

  if (privilegesLoading || isEditLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{tForm('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Form
        title={
          isEditMode
            ? `${t('title')} - ${t('editRole')}`
            : `${t('title')} - ${tForm('add')}`
        }
        fields={fields}
        buttons={buttons}
        initialValues={
          editInitialValues ?? {
            roleNameEn: '',
            roleNameAr: '',
          }
        }
        validationSchema={addRoleSchema}
        onSubmit={handleSubmit}
        onReset={
          isEditMode
            ? undefined
            : () => {
                setModulePermissions([]);
                setPermissionsError('');
                localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
              }
        }
        persistKey={isEditMode ? undefined : 'roles-add-form'}
      >
        <ModulePermissionsPicker
          modules={moduleOptions}
          privilegeMap={privilegeMap}
          value={modulePermissions}
          onChange={updateModulePermissions}
          label={t('modulePermissions')}
          error={permissionsError}
        />
      </Form>
    </div>
  );
}
