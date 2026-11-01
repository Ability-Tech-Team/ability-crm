'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Download, History, RefreshCw } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import SectionHeader from '@/src/components/SectionHeader';
import Button from '@/src/components/ui/Button';
import DataTable, { type ColumnDef } from '@/src/components/ui/DataTable';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import type { ImportRecord } from '@/src/services/imports';
import { useImportHistoryPage } from './hooks/useImportHistoryPage';

function formatDate(value: string | null, locale: string): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString(locale, { dateStyle: 'medium', timeStyle: 'short' });
}

export default function ImportHistoryPage() {
  const t = useTranslations('imports');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const privileges = useRoutePrivileges('/imports/history');
  const {
    imports,
    totalCount,
    failed,
    isLoading,
    page,
    pageSize,
    setPage,
    handlePageSizeChange,
    reload,
    downloadingId,
    handleDownloadErrors,
  } = useImportHistoryPage();

  const columns = useMemo<ColumnDef<ImportRecord>[]>(
    () => [
      { id: 'id', label: t('history.columns.id'), accessorKey: 'id' },
      {
        id: 'kind',
        label: t('history.columns.kind'),
        cell: (row) =>
          row.kind && t.has(`kindLabels.${row.kind}`)
            ? t(`kindLabels.${row.kind}`)
            : (row.kind ?? '—'),
      },
      {
        id: 'fileName',
        label: t('history.columns.fileName'),
        cell: (row) => row.fileName ?? '—',
      },
      {
        id: 'status',
        label: t('history.columns.status'),
        cell: (row) => row.status ?? '—',
      },
      {
        id: 'insertedRows',
        label: t('counts.insertedRows'),
        cell: (row) => row.insertedRows ?? '—',
      },
      {
        id: 'updatedRows',
        label: t('counts.updatedRows'),
        cell: (row) => row.updatedRows ?? '—',
      },
      {
        id: 'skippedRows',
        label: t('counts.skippedRows'),
        cell: (row) => row.skippedRows ?? '—',
      },
      {
        id: 'createdBy',
        label: t('history.columns.createdBy'),
        cell: (row) => row.createdBy ?? '—',
      },
      {
        id: 'createdAt',
        label: t('history.columns.createdAt'),
        cell: (row) => formatDate(row.createdAt, locale),
      },
      {
        id: 'errors',
        label: t('history.columns.errors'),
        alwaysVisible: true,
        cell: (row) =>
          row.skippedRows ? (
            <Button
              variant="secondary"
              size="sm"
              isLoading={downloadingId === row.id}
              disabled={downloadingId !== null}
              onClick={() => void handleDownloadErrors(row)}
            >
              <Download size={14} />
              {t('history.downloadErrors')}
            </Button>
          ) : (
            '—'
          ),
      },
    ],
    [t, locale, downloadingId, handleDownloadErrors],
  );

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="p-6">
      <MainBox>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeader icon={History} title={t('history.title')} />
          <Button variant="secondary" size="sm" onClick={reload}>
            <RefreshCw size={14} />
            {t('history.refresh')}
          </Button>
        </div>
        {failed ? (
          <p role="alert" className="text-sm text-red-600">
            {t('history.loadError')}
          </p>
        ) : null}
        <DataTable<ImportRecord>
          columns={columns}
          data={imports}
          rowKey={(row) => row.id}
          loading={isLoading}
          emptyState={isLoading ? t('history.loading') : tCommon('noDataFound')}
          totalCount={totalCount}
          currentPage={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          persistKey="imports-history-columns"
          showColumnToggle
        />
      </MainBox>
    </div>
  );
}
