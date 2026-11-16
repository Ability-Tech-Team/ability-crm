'use client';

import { useMemo } from 'react';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import type { LogsSearchParams, ModuleLog } from '../types';

type Translate = (key: string) => string;

type LogsTableProps = {
  rows: ModuleLog[];
  t: Translate;
  tForm: Translate;
  tCommon: Translate;
  isLoading: boolean;
  itemsPerPage: number;
  pageSize: number;
  currentPage: number;
  totalCount: number;
  canExport: boolean;
  exportParams: LogsSearchParams | Record<string, never>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export default function LogsTable({
  rows,
  t,
  tForm,
  tCommon,
  isLoading,
  itemsPerPage,
  pageSize,
  currentPage,
  totalCount,
  canExport,
  exportParams,
  onPageChange,
  onPageSizeChange,
}: LogsTableProps) {
  const columns = useMemo<ColumnDef<ModuleLog>[]>(
    () => [
      {
        id: 'module',
        label: t('columns.module'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.module || '—',
      },
      {
        id: 'log_action',
        label: t('columns.action'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.log_action || '—',
      },
      {
        id: 'description',
        label: tForm('description'),
        cellClassName: 'max-w-[480px]',
        cell: (row) => {
          const text = row.description ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'created_by',
        label: tForm('createdBy'),
        cellClassName: 'max-w-[160px]',
        cell: (row) => {
          const text = row.created_by ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'created_at',
        label: tForm('createdAt'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.created_at || '—',
      },
    ],
    [t, tForm],
  );

  return (
    <DataTable<ModuleLog>
      columns={columns}
      data={rows}
      // Log ids restart in every module's table, so the module keeps them apart.
      rowKey={(row) => `${row.module_id}-${row.id}`}
      loading={isLoading}
      emptyState={isLoading ? tForm('loading') : tCommon('noDataFound')}
      itemsPerPage={itemsPerPage}
      pageSize={pageSize}
      currentPage={currentPage}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      persistKey="logs-search-columns"
      showColumnToggle
      exportEnabled={canExport}
      exportEndpoint="/module-logs"
      exportParams={exportParams}
      exportFileName="module-logs"
    />
  );
}
