'use client';

import { useMemo } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Pencil,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import ToggleSwitch from '@/src/components/ui/ToggleSwitch';
import type { FlatLocationRow } from '../types';

type LocationsTableProps = {
  rows: FlatLocationRow[];
  tForm: (key: string) => string;
  tLoc: (key: string) => string;
  expanded: Set<number>;
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
  isLoading: boolean;
  isSearching: boolean;
  onToggleExpand: (id: number) => void;
  onAddChild: (parentId: number) => void;
  onEdit: (row: FlatLocationRow, parentId: number | null) => void;
  onDelete: (row: FlatLocationRow) => void;
  onToggleStatus: (row: FlatLocationRow) => void;
};

export default function LocationsTable({
  rows,
  tForm,
  tLoc,
  expanded,
  canAdd,
  canEdit,
  canDelete,
  isLoading,
  isSearching,
  onToggleExpand,
  onAddChild,
  onEdit,
  onDelete,
  onToggleStatus,
}: LocationsTableProps) {
  const canManageActions = canAdd || canEdit || canDelete;

  const columns = useMemo<ColumnDef<FlatLocationRow>[]>(
    () => [
      {
        id: 'reference_number',
        label: tForm('referenceNumber'),
        cell: (_, index) => index,
      },
      {
        id: 'expand',
        label: '',
        alwaysVisible: true,
        cell: (row) => {
          const hasChildren = row.children?.length > 0;
          const isExpanded = expanded.has(row.id);

          if (row._isChild) {
            return null;
          }

          if (!hasChildren) {
            return <span className="inline-block w-4" />;
          }

          return (
            <button
              onClick={() => onToggleExpand(row.id)}
              className="rounded p-1 text-gray-500 transition-colors hover:bg-sky-100 hover:text-sky-600"
            >
              {isExpanded ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
          );
        },
      },
      {
        id: 'name',
        label: tForm('name'),
        alwaysVisible: true,
        cell: (row) => (
          <div className="flex items-center gap-2">
            {row._isChild ? (
              <span className="text-gray-300 ltr:ml-4 rtl:mr-4">└</span>
            ) : null}
            <span className={row._isChild ? 'text-gray-700' : 'font-medium'}>
              {row.name}
            </span>
          </div>
        ),
      },
      ...(canManageActions
        ? [
            {
              id: 'action',
              alwaysVisible: true,
              label: tLoc('actions'),
              cell: (row: FlatLocationRow) => {
                const isActive = Number(row.is_active ?? 1) === 1;

                return (
                  <div className="flex flex-wrap items-center gap-1">
                    {canEdit ? (
                      <button
                        onClick={() => onEdit(row, row._parentId)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-blue-100 px-2.5 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-200"
                      >
                        <Pencil size={14} />
                        {tForm('edit')}
                      </button>
                    ) : null}
                    {canDelete ? (
                      <button
                        onClick={() => onDelete(row)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-red-100 px-2.5 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-200"
                      >
                        <Trash2 size={14} />
                        {tForm('delete')}
                      </button>
                    ) : null}
                    {canEdit ? (
                      <ToggleSwitch
                        checked={isActive}
                        onChange={() => onToggleStatus(row)}
                      />
                    ) : null}
                    {!row._isChild && canAdd ? (
                      <button
                        onClick={() => onAddChild(row.id)}
                        className="inline-flex items-center gap-1.5 rounded-md bg-green-100 px-2.5 py-1.5 text-xs font-medium text-green-700 transition-colors hover:bg-green-200"
                      >
                        <PlusCircle size={14} />
                        {tLoc('addChild')}
                      </button>
                    ) : null}
                  </div>
                );
              },
            },
          ]
        : []),
    ],
    [
      canAdd,
      canDelete,
      canEdit,
      canManageActions,
      expanded,
      onAddChild,
      onDelete,
      onEdit,
      onToggleExpand,
      onToggleStatus,
      tForm,
      tLoc,
    ],
  );

  return (
    <DataTable<FlatLocationRow>
      columns={columns}
      data={rows}
      rowKey={(row) => `${row._isChild ? 'child' : 'root'}-${row.id}`}
      loading={isLoading || isSearching}
      emptyState={
        isLoading || isSearching ? tForm('loading') : tLoc('noLocations')
      }
      itemsPerPage={10}
      persistKey="definitions-location-columns"
      showColumnToggle
    />
  );
}
