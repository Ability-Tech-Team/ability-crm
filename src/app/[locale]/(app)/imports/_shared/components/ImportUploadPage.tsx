'use client';

import { useId } from 'react';
import { useTranslations } from 'next-intl';
import { FileSpreadsheet, History, Upload } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import SectionHeader from '@/src/components/SectionHeader';
import Button from '@/src/components/ui/Button';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { Link } from '@/src/i18n/navigation';
import type { ImportKind } from '@/src/services/imports';
import { useImportUpload } from '../hooks/useImportUpload';
import ImportCounts from './ImportCounts';

const ACCEPTED_TYPES =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';

type ImportUploadPageProps = {
  kind: ImportKind;
  /** The screen's menu href, e.g. `/imports/units`. */
  href: string;
};

/** Upload a units, customers, relatives, or unit-debts sheet. */
export default function ImportUploadPage({ kind, href }: ImportUploadPageProps) {
  const t = useTranslations('imports');
  const privileges = useRoutePrivileges(href);
  const historyPrivileges = useRoutePrivileges('/imports/history');
  const inputId = useId();
  const hintId = useId();
  const { file, selectFile, isUploading, result, hasUploaded, handleUpload } =
    useImportUpload(kind);

  if (!privileges.canAccess) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <MainBox>
        <SectionHeader icon={FileSpreadsheet} title={t(`${kind}.title`)} />
        <p id={hintId} className="text-sm text-slate-600">
          {t(`${kind}.description`)}
        </p>
        <p className="text-sm text-slate-600">
          <span className="font-medium text-slate-700">
            {t('columnsLabel')}
          </span>{' '}
          {t(`${kind}.columns`)}
        </p>

        <form
          className="flex flex-col gap-3 sm:flex-row sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            void handleUpload();
          }}
        >
          <div className="flex flex-1 flex-col gap-1">
            <label
              htmlFor={inputId}
              className="text-sm font-medium text-slate-700"
            >
              {t('fileLabel')}
            </label>
            <input
              key={hasUploaded ? 'uploaded' : 'pending'}
              id={inputId}
              type="file"
              accept={ACCEPTED_TYPES}
              aria-describedby={hintId}
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:me-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
          <Button type="submit" disabled={!file} isLoading={isUploading}>
            <Upload size={16} />
            {t('upload')}
          </Button>
        </form>
      </MainBox>

      {hasUploaded ? (
        <MainBox>
          <div role="status" className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {t('resultTitle')}
            </h2>
            {result ? (
              <ImportCounts record={result} />
            ) : (
              <p className="text-sm text-slate-600">{t('resultPending')}</p>
            )}
            {historyPrivileges.canAccess ? (
              <Link
                href="/imports/history"
                className="inline-flex items-center gap-2 text-sm font-medium text-sky-700 underline-offset-4 hover:underline"
              >
                <History size={16} />
                {t('viewHistory')}
              </Link>
            ) : null}
          </div>
        </MainBox>
      ) : null}
    </div>
  );
}
