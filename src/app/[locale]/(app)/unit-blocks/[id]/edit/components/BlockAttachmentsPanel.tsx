'use client';

import { useMemo } from 'react';
import { Download, Eye, Paperclip, X } from 'lucide-react';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import type { PreviewFile } from '@/src/components/ui/FilePreviewDialog';
import { downloadFile } from '@/src/lib/downloadFile';
import type { UnitBlock, UnitBlockAttachment } from '@/src/services/unitBlocks';

type Translate = (key: string) => string;

type BlockAttachmentsPanelProps = {
  rows: UnitBlockAttachment[];
  block: UnitBlock;
  t: Translate;
  tForm: Translate;
  tDocLib: Translate;
  onPreview: (file: PreviewFile) => void;
  onRemove: (id: string | number, name: string) => void;
};

/** The files already stored on this block; removals are queued until saved. */
export default function BlockAttachmentsPanel({
  rows,
  block,
  t,
  tForm,
  tDocLib,
  onPreview,
  onRemove,
}: BlockAttachmentsPanelProps) {
  const columns = useMemo<ColumnDef<UnitBlockAttachment>[]>(
    () => [
      {
        id: 'download',
        label: tDocLib('columns.download'),
        cell: (row) => (
          <button
            type="button"
            onClick={() => downloadFile(row.file_path, row.file_name)}
            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-all duration-200 hover:scale-110"
            title={tDocLib('downloadDocument')}
          >
            <Download size={18} />
          </button>
        ),
      },
      {
        id: 'view',
        label: tDocLib('columns.view'),
        cell: (row) => (
          <button
            type="button"
            onClick={() =>
              onPreview({ url: row.file_path, name: row.file_name })
            }
            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-all duration-200 hover:scale-110"
            title={tDocLib('viewDocument')}
          >
            <Eye size={18} />
          </button>
        ),
      },
      {
        id: 'remove',
        label: tForm('delete'),
        cell: (row) => (
          <button
            type="button"
            onClick={() => onRemove(row.id, row.file_name)}
            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-all duration-200 hover:scale-110"
            title={tForm('delete')}
          >
            <X size={18} />
          </button>
        ),
      },
      {
        id: 'file_name',
        label: tDocLib('columns.fileName'),
        alwaysVisible: true,
        cell: (row) => row.file_name,
      },
      {
        id: 'description',
        label: tForm('description'),
        cellClassName: 'max-w-[220px]',
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
        id: 'created_by_name',
        label: tForm('editedBy'),
        cellClassName: 'whitespace-nowrap',
        cell: (row) => row.created_by_name || '—',
      },
      {
        // Every row here belongs to the block on screen, so these two repeat a
        // single value. They are kept to match the add page's table.
        id: 'block_id',
        label: t('columns.id'),
        cell: () => block.id ?? '—',
      },
      {
        id: 'blocked_date',
        label: t('columns.blockedDate'),
        cellClassName: 'whitespace-nowrap',
        cell: () => block.blocked_date ?? '—',
      },
    ],
    [block, t, tForm, tDocLib, onPreview, onRemove],
  );

  return (
    <MainBox>
      <div className="flex items-center gap-2 mb-4">
        <Paperclip size={20} className="text-sky-600" />
        <h2 className="text-lg font-semibold text-slate-800">
          {t('create.attachments')} ({rows.length})
        </h2>
      </div>

      <DataTable<UnitBlockAttachment>
        columns={columns}
        data={rows}
        rowKey={(row) => row.id}
        emptyState={t('create.noAttachments')}
        itemsPerPage={10}
        persistKey="unit-block-edit-attachments-columns-v3"
        showColumnToggle
      />
    </MainBox>
  );
}
