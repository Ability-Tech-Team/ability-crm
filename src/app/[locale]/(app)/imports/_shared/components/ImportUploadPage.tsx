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
import {
  hasImportTemplate,
  isFinishedImportStatus,
  type ImportKind,
} from '@/src/services/imports';
import { useImportUpload } from '../hooks/useImportUpload';
import ImportCounts from './ImportCounts';
import ImportProgress from './ImportProgress';
import TemplateDownloadButton from './TemplateDownloadButton';

const ACCEPTED_TYPES =
  '.xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv';

type ImportUploadPageProps = {
  kind: ImportKind;
  /**
   * The screen's menu href, e.g. `/imports/units`, or the hrefs any one of
   * which opens it (`UNIT_DEBTS_IMPORT_ACCESS_HREFS`).
   */
  href: string | string[];
  /** The manual entry form, shown under the upload to whoever can open the screen. */
  children?: React.ReactNode;
};

/**
 * Upload a units, customers, relatives, or unit-debts sheet, download the
 * empty sheet to fill, or add one record by hand.
 */
export default function ImportUploadPage({
  kind,
  href,
  children,
}: ImportUploadPageProps) {
  const t = useTranslations('imports');
  const privileges = useRoutePrivileges(href);
  const historyPrivileges = useRoutePrivileges('/imports/history');
  const inputId = useId();
  const hintId = useId();
  const {
    file,
    selectFile,
    phase,
    isUploading,
    uploadFraction,
    result,
    acceptedCount,
    hasUploaded,
    handleUpload,
  } = useImportUpload(kind);
  // The worker's counts, once it has finished with the sheet.
  const finishedRecord =
    result && isFinishedImportStatus(result.status) ? result : null;
  const rejectedRows = finishedRecord?.failedRows ?? 0;

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
        {hasImportTemplate(kind) ? (
          <div className="flex flex-wrap items-center gap-3">
            <TemplateDownloadButton kind={kind} />
            <span className="text-sm text-slate-500">{t('template.hint')}</span>
          </div>
        ) : null}

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
              key={acceptedCount}
              id={inputId}
              type="file"
              accept={ACCEPTED_TYPES}
              aria-describedby={hintId}
              disabled={isUploading}
              onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
              className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 file:me-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            />
          </div>
          <Button
            type="submit"
            disabled={!file || isUploading}
            isLoading={isUploading}
          >
            <Upload size={16} />
            {t('upload')}
          </Button>
        </form>
      </MainBox>

      {phase !== 'idle' ? (
        <MainBox>
          <div className="flex flex-col gap-4">
            <h2 className="text-lg font-semibold text-slate-800">
              {t('resultTitle')}
            </h2>
            <ImportProgress
              phase={phase}
              uploadFraction={uploadFraction}
              record={result}
            />
            {finishedRecord ? <ImportCounts record={finishedRecord} /> : null}
            {rejectedRows > 0 ? (
              <p className="text-sm text-amber-800">
                {t('progress.rejectedRows', { count: rejectedRows })}
              </p>
            ) : null}
            {phase === 'finished' && !finishedRecord ? (
              <p className="text-sm text-slate-600">{t('resultPending')}</p>
            ) : null}
            {hasUploaded && historyPrivileges.canAccess ? (
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

      {children}
    </div>
  );
}
