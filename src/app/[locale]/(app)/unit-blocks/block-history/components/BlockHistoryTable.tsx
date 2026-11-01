'use client';

import { useMemo } from 'react';
import Button from '@/src/components/ui/Button';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import type { UnitBlock } from '@/src/services/unitBlocks';
import type { HistorySearchParams } from '../types';

type Translate = (key: string) => string;

type BlockHistoryTableProps = {
  rows: UnitBlock[];
  t: Translate;
  tForm: Translate;
  isLoading: boolean;
  itemsPerPage: number;
  pageSize: number;
  currentPage: number;
  totalCount: number;
  persistKey: string;
  canExport: boolean;
  exportParams: HistorySearchParams | Record<string, never>;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  tComplaints: Translate;
  /** Hands the whole block up; the dialog lists its files. */
  onViewAttachments: (row: UnitBlock) => void;
};

/**
 * This page's own table. The search page keeps its own copy, so the two can be
 * changed without one quietly moving the other.
 */
export default function BlockHistoryTable({
  rows,
  t,
  tForm,
  isLoading,
  itemsPerPage,
  pageSize,
  currentPage,
  totalCount,
  persistKey,
  canExport,
  exportParams,
  onPageChange,
  onPageSizeChange,
  tComplaints,
  onViewAttachments,
}: BlockHistoryTableProps) {
  const columns = useMemo<ColumnDef<UnitBlock>[]>(
    () => [
      {
        id: 'unit_number',
        cellClassName: 'whitespace-nowrap',
        label: t('columns.unitNumber'),
        cell: (row) => row.unit_number ?? '—',
      },
      {
        id: 'unit_id',
        label: t('columns.unitId'),
        cell: (row) => row.unit_id ?? '—',
        defaultVisible: false,
      },
      {
        // Each row carries its own files, so a lifted block's attachments stay
        // reachable here — the Show Attachments panels only cover the live one.
        id: 'attachments',
        label: t('create.attachments'),
        // The cell has its own button; keep it out of any row link.
        disableRowLink: true,
        cellClassName: 'whitespace-nowrap',
        cell: (row) => {
          const files = row.attachments ?? [];
          if (!files.length) return '—';

          return (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              fullWidth={false}
              onClick={(event) => {
                event.stopPropagation();
                onViewAttachments(row);
              }}
            >
              {tComplaints('viewAttachments')}
            </Button>
          );
        },
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
    ],
    [t, tForm, onViewAttachments, tComplaints],
  );

  return (
    <DataTable<UnitBlock>
      columns={columns}
      data={rows}
      rowKey={(row) => row.id}
      // The attachments cell sets `disableRowLink`, so its button still wins.
      rowHref={(row) => `/unit-blocks/${row.id}`}
      loading={isLoading}
      emptyState={t('history.empty')}
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
      exportFileName="unit-block-history"
    />
  );
}
