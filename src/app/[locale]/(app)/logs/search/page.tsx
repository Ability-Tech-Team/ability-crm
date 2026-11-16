'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { ScrollText } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import Form from '@/src/components/Form';
import MainBox from '@/src/components/ui/MainBox';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import LogsTable from './components/LogsTable';
import { useLogsSearchPage } from './hooks/useLogsSearchPage';
import {
  getLogsSearchButtons,
  getLogsSearchFields,
  LIMIT,
  logsSearchSchema,
} from './schema';
import { getLogsSearchInitialValues } from './utils';

export default function LogsSearchPage() {
  const t = useTranslations('logs');
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  const privileges = useRoutePrivileges('/logs/search');
  const canRead = privileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExport = privileges.hasPrivilege(PRIVILEGE_IDS.EXPORT);
  const {
    moduleOptions,
    actionOptions,
    employeeOptions,
    rows,
    totalCount,
    currentPage,
    pageSize,
    searchParams,
    isLoading,
    error,
    handleSubmit,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
  } = useLogsSearchPage();

  const searchFields = useMemo(
    () =>
      getLogsSearchFields(
        t,
        tForm,
        tCommon,
        moduleOptions,
        actionOptions,
        employeeOptions,
      ),
    [t, tForm, tCommon, moduleOptions, actionOptions, employeeOptions],
  );

  if (!privileges.canAccess || !canRead) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Form
        title={t('title')}
        fields={searchFields}
        buttons={getLogsSearchButtons(tForm)}
        initialValues={getLogsSearchInitialValues()}
        validationSchema={logsSearchSchema}
        onSubmit={handleSubmit}
        onReset={handleReset}
        autoSubmit
      />

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <MainBox>
        <div className="flex items-center gap-2 mb-4">
          <ScrollText size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t('results')} ({totalCount})
          </h2>
        </div>

        <LogsTable
          rows={rows}
          t={t}
          tForm={tForm}
          tCommon={tCommon}
          isLoading={isLoading}
          itemsPerPage={LIMIT}
          pageSize={pageSize}
          currentPage={currentPage}
          totalCount={totalCount}
          canExport={canExport}
          exportParams={searchParams ?? {}}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
        />
      </MainBox>
    </div>
  );
}
