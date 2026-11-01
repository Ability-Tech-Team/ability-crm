'use client';

import { useMemo } from 'react';
import { History } from 'lucide-react';
import Button from '@/src/components/ui/Button';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import type { UnitBlock } from '@/src/services/unitBlocks';

type Translate = (key: string) => string;

type BlockHistoryPanelProps = {
  rows: UnitBlock[];
  t: Translate;
  tComplaints: Translate;
  /** Hands the whole block up; the dialog lists its files. */
  onViewAttachments: (row: UnitBlock) => void;
};

/**
 * Every block this unit has carried of the kind on screen. Its own list, not
 * the block-history page's, so the two can be changed separately.
 */
export default function BlockHistoryPanel({
  rows,
  t,
  tComplaints,
  onViewAttachments,
}: BlockHistoryPanelProps) {
  const columns = useMemo<ColumnDef<UnitBlock>[]>(
    () => [
      {
        id: 'id',
        label: t('columns.id'),
        accessorKey: 'id',
        alwaysVisible: true,
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
        id: 'reason',
        label: t('columns.reason'),
        cellClassName: 'max-w-[220px]',
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
        cell: (row) => row.blocked_by_name ?? '—',
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
        cell: (row) => row.unblocked_by_name ?? '—',
      },
      {
        id: 'unblocked_date',
        label: t('columns.unblockedDate'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.unblocked_date ?? '—',
      },
    ],
    [t, onViewAttachments, tComplaints],
  );

  return (
    <MainBox>
      <div className="flex items-center gap-2 mb-4">
        <History size={20} className="text-sky-600" />
        <h2 className="text-lg font-semibold text-slate-800">
          {t('blockHistory.title')} ({rows.length})
        </h2>
      </div>

      <DataTable<UnitBlock>
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        emptyState={t('history.empty')}
        itemsPerPage={10}
        persistKey="unit-block-edit-history-columns"
        showColumnToggle
      />
    </MainBox>
  );
}
