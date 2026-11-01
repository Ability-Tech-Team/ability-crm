'use client';

import { useTranslations } from 'next-intl';
import { History } from 'lucide-react';
import AccessDenied from '@/src/components/AccessDenied';
import Form from '@/src/components/Form';
import MainBox from '@/src/components/ui/MainBox';
import ComplaintAttachmentsModal from '@/src/components/ComplaintAttachmentsModal';
import BlockHistoryTable from './components/BlockHistoryTable';
import { useBlockHistoryPage } from './hooks/useBlockHistoryPage';
import {
  getHistoryButtons,
  getHistoryFields,
  historySchema,
  LIMIT,
  TABS,
} from './schema';

export default function UnitBlockHistoryPage() {
  const t = useTranslations('unitBlocks');
  const tForm = useTranslations('form');
  const tCommon = useTranslations('common');
  // The attachments dialog is shared with complaints, labels included.
  const tComplaints = useTranslations('complaints');
  const {
    privileges,
    canRead,
    canExport,
    canUseTab,
    activeTab,
    initialValues,
    rows,
    totalCount,
    currentPage,
    pageSize,
    searchParams,
    isLoading,
    error,
    attachmentsBlock,
    setAttachmentsBlock,
    handleSubmit,
    handleReset,
    handleTabChange,
    handlePageChange,
    handlePageSizeChange,
  } = useBlockHistoryPage();

  if (!privileges.canAccess || !canRead) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <Form
        // Remounting on the tab reseeds the filters and re-runs `autoSubmit`,
        // which is the single trigger for a fetch on this page.
        key={activeTab.id}
        title={t('blockHistory.title')}
        fields={getHistoryFields(t, tForm, tCommon)}
        buttons={getHistoryButtons(tForm)}
        headerContent={
          <div className="flex gap-1">
            {TABS.map((tab) => {
              const disabled = !canUseTab(tab);

              return (
                <button
                  key={tab.id}
                  type="button"
                  disabled={disabled}
                  title={disabled ? t('tabs.unavailable') : undefined}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    tab.id === activeTab.id
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:hover:bg-slate-100'
                  }`}
                >
                  {t(tab.labelKey)}
                </button>
              );
            })}
          </div>
        }
        initialValues={initialValues}
        validationSchema={historySchema}
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
          <History size={20} className="text-sky-600" />
          <h2 className="text-lg font-semibold text-slate-800">
            {t(activeTab.titleKey)} ({totalCount})
          </h2>
        </div>

        <BlockHistoryTable
          key={activeTab.id}
          rows={rows}
          t={t}
          tForm={tForm}
          isLoading={isLoading}
          itemsPerPage={LIMIT}
          pageSize={pageSize}
          currentPage={currentPage}
          totalCount={totalCount}
          persistKey={activeTab.persistKey}
          canExport={canExport}
          exportParams={searchParams ?? {}}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          tComplaints={tComplaints}
          onViewAttachments={setAttachmentsBlock}
        />
      </MainBox>

      <ComplaintAttachmentsModal
        open={!!attachmentsBlock}
        complainId={attachmentsBlock?.id ?? ''}
        attachments={attachmentsBlock?.attachments ?? []}
        onClose={() => setAttachmentsBlock(null)}
      />
    </div>
  );
}
