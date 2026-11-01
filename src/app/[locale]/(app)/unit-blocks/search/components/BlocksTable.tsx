'use client';

import { useMemo } from 'react';
import { History } from 'lucide-react';
import { Link } from '@/src/i18n/navigation';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import type { UnitBlock } from '@/src/services/unitBlocks';
import type { SearchParams } from '../types';

type Translate = (key: string) => string;

type BlocksTableProps = {
  rows: UnitBlock[];
  t: Translate;
  tForm: Translate;
  hiddenColumnIds: string[];
  isLoading: boolean;
  itemsPerPage: number;
  pageSize: number;
  currentPage: number;
  totalCount: number;
  persistKey: string;
  canEdit: boolean;
  canExport: boolean;
  exportParams: SearchParams | Record<string, never>;
  emptyState: string;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

/** The Finance and Legal tabs. The block-history page keeps its own copy. */
export default function BlocksTable({
  rows,
  t,
  tForm,
  hiddenColumnIds,
  isLoading,
  itemsPerPage,
  pageSize,
  currentPage,
  totalCount,
  persistKey,
  canEdit,
  canExport,
  exportParams,
  emptyState,
  onPageChange,
  onPageSizeChange,
}: BlocksTableProps) {
  const columns = useMemo<ColumnDef<UnitBlock>[]>(() => {
    // Annotated before filtering: chaining onto the literal loses the element
    // type and `accessorKey` widens to `string`.
    const all: ColumnDef<UnitBlock>[] = [
      {
        id: 'id',
        label: t('columns.id'),
        accessorKey: 'id',
        alwaysVisible: true,
      },
      {
        id: 'unit_number',
        cellClassName: 'whitespace-nowrap',
        label: t('columns.unitNumber'),
        cell: (row) => row.unit_number ?? '—',
      },
      {
        id: 'history',
        label: t('columns.history'),
        // Cell has its own button; keep it out of the row <Link>.
        disableRowLink: true,
        headerTooltip: t('history.hint'),
        cell: (row) => (
          <Link
            href={{
              pathname: '/unit-blocks/block-history',
              query: {
                unit_id: row.unit_id,
                unit_number: row.unit_number ?? '',
                is_legal: row.is_legal,
              },
            }}
            title={t('history.hint')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-sky-700 transition-colors hover:bg-slate-100"
          >
            <History size={18} />
          </Link>
        ),
      },
      {
        id: 'unit_id',
        label: t('columns.unitId'),
        cell: (row) => row.unit_id ?? '—',
        defaultVisible: false,
      },
      {
        id: 'block_type',
        label: t('columns.blockType'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.is_legal === 1
                ? 'bg-amber-100 text-amber-700'
                : 'bg-sky-100 text-sky-700'
            }`}
          >
            {row.is_legal === 1 ? t('legalShort') : t('financeShort')}
          </span>
        ),
      },
      {
        id: 'project_name',
        label: t('columns.projectName'),
        cellClassName: 'max-w-[200px]',
        cell: (row) => {
          const text = row.project_name ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'sub_project_code',
        cellClassName: 'whitespace-nowrap',
        label: t('columns.subProjectCode'),
        cell: (row) => row.sub_project_code ?? '—',
      },
      {
        id: 'company_code',
        cellClassName: 'whitespace-nowrap',
        label: t('columns.companyCode'),
        cell: (row) => row.company_code ?? '—',
        defaultVisible: false,
      },
      {
        id: 'category_name',
        label: t('columns.category'),
        cellClassName: 'max-w-[160px]',
        cell: (row) => {
          const text = row.category_name ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        // Each row is a single block, so exactly one of these two reads "Yes".
        id: 'is_finance_block',
        label: t('financeBlock'),
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.is_legal === 0
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {row.is_legal === 0 ? tForm('yes') : tForm('no')}
          </span>
        ),
      },
      {
        id: 'is_legal_block',
        label: t('legalBlock'),
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.is_legal === 1
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {row.is_legal === 1 ? tForm('yes') : tForm('no')}
          </span>
        ),
      },
      {
        id: 'reason',
        label: t('columns.reason'),
        cellClassName: 'max-w-[200px]',
        cell: (row) => {
          const text = row.reason ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'blocked_by_name',
        label: t('columns.blockedBy'),
        cellClassName: 'max-w-[160px]',
        cell: (row) => {
          const text = row.blocked_by_name ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'blocked_date',
        label: t('columns.blockedDate'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.blocked_date ?? '—',
      },
      {
        id: 'unblocked_by_name',
        label: t('columns.unblockedBy'),
        cellClassName: 'max-w-[160px]',
        cell: (row) => {
          const text = row.unblocked_by_name ?? '';
          if (!text) return '—';
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'unblocked_date',
        label: t('columns.unblockedDate'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.unblocked_date ?? '—',
      },
      {
        id: 'is_active',
        label: t('columns.status'),
        cell: (row) => (
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              row.is_active === 1
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}
          >
            {row.is_active === 1 ? tForm('isActive') : tForm('inactive')}
          </span>
        ),
      },
      {
        id: 'customer_name',
        label: t('columns.customerName'),
        cellClassName: 'max-w-[200px]',
        cell: (row) => {
          const names = (row.customers ?? [])
            .map((customer) => customer.customer_name)
            .filter((name): name is string => Boolean(name));
          if (names.length === 0) return '—';
          const text = names.join(', ');
          return (
            <span className="block truncate w-full" title={text}>
              {text}
            </span>
          );
        },
      },
      {
        id: 'customer_mobile',
        cellClassName: 'whitespace-nowrap',
        label: t('columns.customerMobile'),
        cell: (row) => row.customers?.[0]?.mobile_number ?? '—',
      },
    ];

    return all.filter((column) => !hiddenColumnIds.includes(column.id));
  }, [t, tForm, hiddenColumnIds]);

  return (
    <DataTable<UnitBlock>
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      loading={isLoading}
      emptyState={emptyState}
      itemsPerPage={itemsPerPage}
      pageSize={pageSize}
      currentPage={currentPage}
      totalCount={totalCount}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      persistKey={persistKey}
      showColumnToggle
      exportEnabled={canExport}
      exportEndpoint="/projects/unit-blocks"
      exportParams={exportParams}
      exportFileName="unit-blocks"
      rowHref={canEdit ? (row) => `/unit-blocks/${row.id}/edit` : undefined}
    />
  );
}
