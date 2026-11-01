'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { X, ChevronDown, Plus, Trash2, Pencil } from 'lucide-react';

export interface ModulePermission {
  module: string;
  moduleLabel: string;
  permissions: string[];
  permissionLabels: string[];
}

export interface ModuleOption {
  value: string;
  label: string;
}

export interface PermissionOption {
  value: string;
  label: string;
}

const ALL_PERMISSIONS_VALUE = '__ALL_PERMISSIONS__';
const ALL_MODULES_VALUE = '__ALL_MODULES__';

interface ModulePermissionsPickerProps {
  modules: ModuleOption[];
  /** Map of module IDs to their available permissions */
  privilegeMap: Map<string, PermissionOption[]>;
  value: ModulePermission[];
  onChange: (value: ModulePermission[]) => void;
  label?: string;
  error?: string;
}

export default function ModulePermissionsPicker({
  modules,
  privilegeMap,
  value,
  onChange,
  error,
}: ModulePermissionsPickerProps) {
  const t = useTranslations('roles');
  const tCommon = useTranslations('common');

  // Current selection state - single module selection
  const [selectedModule, setSelectedModule] = useState<string>('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Dropdown open state
  const [isModuleOpen, setIsModuleOpen] = useState(false);
  const [isPermissionOpen, setIsPermissionOpen] = useState(false);

  // Whether we are editing an existing row
  const [editingModule, setEditingModule] = useState<string | null>(null);

  // Search state
  const [moduleSearch, setModuleSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');

  // Refs
  const moduleDropdownRef = useRef<HTMLDivElement>(null);
  const permissionDropdownRef = useRef<HTMLDivElement>(null);
  const moduleSearchRef = useRef<HTMLInputElement>(null);
  const permissionSearchRef = useRef<HTMLInputElement>(null);

  // Modules already assigned (can't pick again)
  const assignedModules = value.map((mp) => mp.module);
  const hasModuleSelection = !!selectedModule;
  const isEditing = editingModule !== null;

  // Available modules = all modules minus already assigned ones (unless editing)
  const availableModules = modules.filter(
    (m) => !assignedModules.includes(m.value) || m.value === editingModule,
  );

  // Get permissions available for the selected module
  const availablePermissions = selectedModule
    ? privilegeMap.get(selectedModule) || []
    : [];

  const filteredModules = availableModules.filter((m) =>
    m.label.toLowerCase().includes(moduleSearch.toLowerCase()),
  );
  const showAllModulesOption = tCommon('all')
    .toLowerCase()
    .includes(moduleSearch.toLowerCase());

  const filteredPermissions = availablePermissions.filter((p) =>
    p.label.toLowerCase().includes(permissionSearch.toLowerCase()),
  );
  const allPermissionValues = availablePermissions.map((p) => p.value);
  const isAllSelected =
    allPermissionValues.length > 0 &&
    selectedPermissions.length === allPermissionValues.length;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        moduleDropdownRef.current &&
        !moduleDropdownRef.current.contains(event.target as Node)
      ) {
        setIsModuleOpen(false);
        setModuleSearch('');
      }
      if (
        permissionDropdownRef.current &&
        !permissionDropdownRef.current.contains(event.target as Node)
      ) {
        setIsPermissionOpen(false);
        setPermissionSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isModuleOpen && moduleSearchRef.current) {
      moduleSearchRef.current.focus();
    }
  }, [isModuleOpen]);

  useEffect(() => {
    if (isPermissionOpen && permissionSearchRef.current) {
      permissionSearchRef.current.focus();
    }
  }, [isPermissionOpen]);

  // Clearing the module selection clears the permissions (adjusted during
  // render).
  if (!hasModuleSelection && !isEditing && selectedPermissions.length > 0) {
    setSelectedPermissions([]);
  }

  const handleModuleSelect = (mod: ModuleOption) => {
    if (isEditing) return;

    if (mod.value === ALL_MODULES_VALUE) {
      const allModulesWithPermissions: ModulePermission[] = modules
        .map((moduleOption) => {
          const modulePermissions = privilegeMap.get(moduleOption.value) || [];
          if (modulePermissions.length === 0) return null;

          return {
            module: moduleOption.value,
            moduleLabel: moduleOption.label,
            permissions: modulePermissions.map((perm) => perm.value),
            permissionLabels: modulePermissions.map((perm) => perm.label),
          };
        })
        .filter(Boolean) as ModulePermission[];

      onChange(allModulesWithPermissions);
      setSelectedModule('');
      setSelectedPermissions([]);
      setEditingModule(null);
      setIsModuleOpen(false);
      return;
    }

    setSelectedModule(mod.value);
    setSelectedPermissions([]); // Reset permissions when changing module
    setIsModuleOpen(false);
  };

  const handlePermissionToggle = (perm: string) => {
    if (perm === ALL_PERMISSIONS_VALUE) {
      setSelectedPermissions((prev) =>
        prev.length === allPermissionValues.length ? [] : allPermissionValues,
      );
      return;
    }

    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm],
    );
  };

  const handleAddAssignment = () => {
    if (!selectedModule || selectedPermissions.length === 0) return;

    const permLabels = selectedPermissions.map(
      (p) => availablePermissions.find((perm) => perm.value === p)?.label || p,
    );

    if (editingModule) {
      // Update existing row
      const updated = value.map((mp) => {
        if (mp.module !== editingModule) return mp;
        return {
          ...mp,
          permissions: selectedPermissions,
          permissionLabels: permLabels,
        };
      });
      onChange(updated);
      setEditingModule(null);
    } else {
      // Add new row
      const moduleOption = modules.find((m) => m.value === selectedModule);
      const newEntry: ModulePermission = {
        module: selectedModule,
        moduleLabel: moduleOption?.label || selectedModule,
        permissions: selectedPermissions,
        permissionLabels: permLabels,
      };
      onChange([...value, newEntry]);
    }

    setSelectedModule('');
    setSelectedPermissions([]);
  };

  const handleRemoveAssignment = (module: string) => {
    onChange(value.filter((mp) => mp.module !== module));
  };

  const handleRemovePermission = (module: string, permission: string) => {
    const updated = value
      .map((mp) => {
        if (mp.module !== module) return mp;
        const idx = mp.permissions.indexOf(permission);
        if (idx === -1) return mp;
        const newPerms = mp.permissions.filter((_, i) => i !== idx);
        const newLabels = mp.permissionLabels.filter((_, i) => i !== idx);
        if (newPerms.length === 0) return null; // remove entire row
        return { ...mp, permissions: newPerms, permissionLabels: newLabels };
      })
      .filter(Boolean) as ModulePermission[];
    onChange(updated);
  };

  const handleEditRow = (module: string) => {
    const mp = value.find((m) => m.module === module);
    if (!mp) return;
    setSelectedModule(mp.module);
    setSelectedPermissions([...mp.permissions]);
    setEditingModule(mp.module);
  };

  const handleCancelSelection = () => {
    setSelectedModule('');
    setSelectedPermissions([]);
    setEditingModule(null);
  };

  const selectedModuleLabel = selectedModule
    ? modules.find((m) => m.value === selectedModule)?.label || selectedModule
    : '';

  return (
    <div className="col-span-full">
      {/* Picker row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        {/* Module dropdown */}
        <div className="flex-1 w-full" ref={moduleDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('module')}
          </label>
          <div className="relative">
            <div
              onClick={() => {
                if (isEditing) return;
                setIsModuleOpen(!isModuleOpen);
                setModuleSearch('');
              }}
              className={`
                relative block w-full px-3 py-2 border rounded-md cursor-pointer
                sm:text-sm transition-all duration-200
                ${
                  isEditing
                    ? 'border-sky-300 bg-sky-50 text-sky-800 cursor-not-allowed'
                    : 'border-gray-300 bg-white hover:border-gray-400'
                }
              `}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className={
                    selectedModuleLabel ? 'text-gray-900' : 'text-gray-400'
                  }
                >
                  {selectedModuleLabel || t('selectModule')}
                </span>
                {isEditing ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCancelSelection();
                    }}
                    className="text-gray-400 hover:text-red-500 transition-colors shrink-0"
                  >
                    <X size={16} />
                  </button>
                ) : (
                  <ChevronDown
                    size={16}
                    className={`text-gray-500 shrink-0 transition-transform duration-200 ${
                      isModuleOpen ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </div>

            {isModuleOpen && !isEditing && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input
                    ref={moduleSearchRef}
                    type="text"
                    placeholder={tCommon('searchOptions')}
                    value={moduleSearch}
                    onChange={(e) => setModuleSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {filteredModules.length > 0 || showAllModulesOption ? (
                    <>
                      {showAllModulesOption && (
                        <div
                          onClick={() =>
                            handleModuleSelect({
                              value: ALL_MODULES_VALUE,
                              label: tCommon('all'),
                            })
                          }
                          className="px-3 py-2 cursor-pointer text-sm transition-colors duration-150 border-b border-gray-100 hover:bg-sky-50 hover:text-sky-700 text-gray-900"
                        >
                          {tCommon('all')}
                        </div>
                      )}

                      {filteredModules.map((mod) => (
                        <div
                          key={mod.value}
                          onClick={() => handleModuleSelect(mod)}
                          className={`
                            px-3 py-2 cursor-pointer text-sm transition-colors duration-150
                            hover:bg-sky-50 hover:text-sky-700
                            ${
                              selectedModule === mod.value
                                ? 'bg-sky-100 text-sky-800 font-medium'
                                : 'text-gray-900'
                            }
                          `}
                        >
                          {mod.label}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div className="px-3 py-6 text-sm text-gray-500 text-center">
                      {moduleSearch
                        ? tCommon('noOptionsFound')
                        : tCommon('noOptionsAvailable')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Permissions multi-select dropdown */}
        <div className="flex-1 w-full" ref={permissionDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('permissions')}
          </label>
          <div className="relative">
            <div
              onClick={() => {
                if (hasModuleSelection) {
                  setIsPermissionOpen(!isPermissionOpen);
                  setPermissionSearch('');
                }
              }}
              className={`
                relative block w-full px-3 py-2 border rounded-md
                sm:text-sm transition-all duration-200 min-h-9.5
                ${
                  !hasModuleSelection
                    ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-gray-300 bg-white hover:border-gray-400 cursor-pointer'
                }
              `}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1 flex-1">
                  {selectedPermissions.length > 0 ? (
                    isAllSelected ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 text-xs rounded-full">
                        {tCommon('all')}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePermissionToggle(ALL_PERMISSIONS_VALUE);
                          }}
                          className="hover:text-red-600 transition-colors"
                        >
                          <X size={12} />
                        </button>
                      </span>
                    ) : (
                      selectedPermissions.map((perm) => {
                        const label = availablePermissions.find(
                          (p) => p.value === perm,
                        )?.label;
                        return (
                          <span
                            key={perm}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 text-xs rounded-full"
                          >
                            {label}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePermissionToggle(perm);
                              }}
                              className="hover:text-red-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        );
                      })
                    )
                  ) : (
                    <span className="text-gray-400">
                      {hasModuleSelection
                        ? t('selectPermissions')
                        : t('selectModuleFirst')}
                    </span>
                  )}
                </div>
                <ChevronDown
                  size={16}
                  className={`text-gray-500 shrink-0 transition-transform duration-200 ${
                    isPermissionOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </div>

            {isPermissionOpen && hasModuleSelection && (
              <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-hidden">
                <div className="p-2 border-b border-gray-100">
                  <input
                    ref={permissionSearchRef}
                    type="text"
                    placeholder={tCommon('searchOptions')}
                    value={permissionSearch}
                    onChange={(e) => setPermissionSearch(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-400/20 focus:border-sky-400"
                  />
                </div>
                <div className="max-h-48 overflow-y-auto">
                  {availablePermissions.length > 0 ? (
                    <>
                      <div
                        onClick={() =>
                          handlePermissionToggle(ALL_PERMISSIONS_VALUE)
                        }
                        className={`
                          px-3 py-2 cursor-pointer text-sm transition-colors duration-150 border-b border-gray-100
                          hover:bg-sky-50 hover:text-sky-700
                          ${isAllSelected ? 'bg-sky-100 text-sky-800 font-medium' : 'text-gray-900'}
                        `}
                      >
                        <div className="flex items-center justify-between">
                          <span>{tCommon('all')}</span>
                          {isAllSelected && (
                            <svg
                              className="h-4 w-4 text-sky-600"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 20 20"
                              fill="currentColor"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </div>

                      {filteredPermissions.length > 0 ? (
                        filteredPermissions.map((perm) => {
                          const isSelected = selectedPermissions.includes(
                            perm.value,
                          );
                          return (
                            <div
                              key={perm.value}
                              onClick={() => handlePermissionToggle(perm.value)}
                              className={`
                                px-3 py-2 cursor-pointer text-sm transition-colors duration-150
                                hover:bg-sky-50 hover:text-sky-700
                                ${isSelected ? 'bg-sky-100 text-sky-800 font-medium' : 'text-gray-900'}
                              `}
                            >
                              <div className="flex items-center justify-between">
                                <span>{perm.label}</span>
                                {isSelected && (
                                  <svg
                                    className="h-4 w-4 text-sky-600"
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="px-3 py-6 text-sm text-gray-500 text-center">
                          {permissionSearch
                            ? tCommon('noOptionsFound')
                            : tCommon('noOptionsAvailable')}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="px-3 py-6 text-sm text-gray-500 text-center">
                      {permissionSearch
                        ? tCommon('noOptionsFound')
                        : tCommon('noOptionsAvailable')}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Add button */}
        <button
          type="button"
          onClick={handleAddAssignment}
          disabled={!hasModuleSelection || selectedPermissions.length === 0}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium
            transition-colors duration-200 shrink-0 h-9.5
            ${
              hasModuleSelection && selectedPermissions.length > 0
                ? 'bg-sky-400 text-white hover:bg-sky-600'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <Plus size={16} />
          {editingModule ? t('savePermission') : t('addPermission')}
        </button>
      </div>

      {/* Assigned module-permissions list */}
      {value.length > 0 && (
        <div className="mt-4 space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            {t('assignedPermissions')}
          </label>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-start px-4 py-2 font-medium text-gray-700">
                    {t('module')}
                  </th>
                  <th className="text-start px-4 py-2 font-medium text-gray-700">
                    {t('permissions')}
                  </th>
                  <th className="px-4 py-2 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {value.map((mp) => (
                  <tr
                    key={mp.module}
                    className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-2.5 font-medium text-gray-900">
                      {mp.moduleLabel}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap gap-1 items-center">
                        {mp.permissionLabels.map((label, i) => (
                          <span
                            key={mp.permissions[i]}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 text-xs rounded-full"
                          >
                            {label}
                            <button
                              type="button"
                              onClick={() =>
                                handleRemovePermission(
                                  mp.module,
                                  mp.permissions[i],
                                )
                              }
                              className="hover:text-red-600 transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditRow(mp.module)}
                          className={`transition-colors ${
                            editingModule === mp.module
                              ? 'text-sky-500'
                              : 'text-gray-400 hover:text-sky-500'
                          }`}
                          title={t('editPermissions')}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveAssignment(mp.module)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-sm text-red-600 flex items-center gap-1">
          <svg
            className="h-4 w-4 shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}
