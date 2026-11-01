'use client';

import { useTranslations } from 'next-intl';
import { Lock, Paperclip, Unlock } from 'lucide-react';
import Form from '@/src/components/Form';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import FileDropZone from '@/src/components/ui/FileDropZone';
import FilePreviewDialog from '@/src/components/ui/FilePreviewDialog';
import Input from '@/src/components/ui/Input';
import { UNIT_BLOCK_ATTACHMENT_ACCEPT } from '@/src/services/unitBlocks';
import UnitAttachmentsPanel from './components/UnitAttachmentsPanel';
import { useUnitBlockCreatePage } from './hooks/useUnitBlockCreatePage';
import {
  buildBlockSchema,
  getBlockButtons,
  getBlockFields,
  TABS,
} from './schema';

export default function UnitBlocksCreatePage() {
  const t = useTranslations('unitBlocks');
  const tForm = useTranslations('form');
  const tDocLib = useTranslations('documentLibrary');
  const {
    unitId,
    unitDetails,
    canAdd,
    canUnblock,
    canSave,
    canUseTab,
    activeTab,
    selectTab,
    isLegalBlock,
    existingBlock,
    isLoadingBlocks,
    categoryOptions,
    assigneeOptions,
    stagedFiles,
    unitAttachments,
    attachmentsError,
    showAttachments,
    setShowAttachments,
    previewFile,
    setPreviewFile,
    handleStagedFilesChange,
    fileDescription,
    setFileDescription,
    requestRemoveAttachment,
    attachmentToRemove,
    confirmRemoveAttachment,
    cancelRemoveAttachment,
    isSaving,
    blockActionOpen,
    setBlockActionOpen,
    isTogglingBlock,
    confirmBlockAction,
    handleSubmit,
    goToAdd,
  } = useUnitBlockCreatePage();

  if (!unitId) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{t('create.noUnitSelected')}</p>
        </div>
      </div>
    );
  }

  // The form seeds its fields once, so it must not mount before we know
  // whether this unit already carries a block.
  if (isLoadingBlocks) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{tForm('loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Form
        // `useForm` seeds itself once, so the form has to remount when the
        // block behind it changes — on a tab switch, or when the fetch lands.
        key={`${activeTab.id}-${existingBlock?.id ?? 'new'}`}
        title={`${t('title')} - ${t('create.title')}`}
        fields={getBlockFields(
          t,
          isLegalBlock,
          !!existingBlock,
          categoryOptions,
          assigneeOptions,
        )}
        buttons={getBlockButtons(t, tForm, canSave, !!existingBlock, goToAdd)}
        headerContent={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-1">
              {TABS.map((tab) => {
                const disabled = !canUseTab(tab);

                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={disabled}
                    title={disabled ? t('tabs.unavailable') : undefined}
                    onClick={() => selectTab(tab.id)}
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

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant={showAttachments ? 'primary' : 'secondary'}
                onClick={() => setShowAttachments((open) => !open)}
              >
                <Paperclip size={16} />
                {t('create.showAttachments')}
              </Button>

              {/* Status only. With a block standing it lifts it; with none,
                  the unit is not blocked yet, so blocking it means
                  submitting the fields below. */}
              {existingBlock
                ? canUnblock && (
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => setBlockActionOpen(true)}
                    >
                      <Unlock size={16} />
                      {t('edit.unblock')}
                    </Button>
                  )
                : canAdd && (
                    <Button
                      type="submit"
                      variant="success"
                      isLoading={isSaving}
                    >
                      <Lock size={16} />
                      {isSaving ? t('create.submitting') : t('create.submit')}
                    </Button>
                  )}
            </div>
          </div>
        }
        initialValues={{
          ...unitDetails,
          is_legal: String(activeTab.isLegal),
          category_id: existingBlock ? String(existingBlock.category_id) : '',
          assign_to_id: existingBlock?.assign_to_id ?? '',
          reason: existingBlock?.reason ?? '',
        }}
        validationSchema={buildBlockSchema(!existingBlock)}
        onSubmit={handleSubmit}
      >
        {/* ── Files being added now; the stored ones have their own panel ── */}
        <div className="flex flex-col gap-3 py-3">
          <FileDropZone
            label={t('create.attachments')}
            name="block-attachments"
            files={stagedFiles}
            onChange={handleStagedFilesChange}
            accept={UNIT_BLOCK_ATTACHMENT_ACCEPT}
          />

          {/* Only once there is something to describe. */}
          {stagedFiles.length > 0 && (
            <Input
              name="file_description"
              label={t('create.attachmentDescription')}
              value={fileDescription}
              onChange={(event) => setFileDescription(event.target.value)}
              placeholder={t('create.attachmentDescriptionPlaceholder')}
            />
          )}

          {attachmentsError && (
            <p className="text-sm text-red-600">{attachmentsError}</p>
          )}
        </div>
      </Form>

      {showAttachments && (
        <UnitAttachmentsPanel
          key={activeTab.id}
          rows={unitAttachments}
          t={t}
          tForm={tForm}
          tDocLib={tDocLib}
          onPreview={setPreviewFile}
          onRemove={requestRemoveAttachment}
        />
      )}

      <FilePreviewDialog
        open={!!previewFile}
        file={previewFile}
        title={t('create.attachments')}
        onClose={() => setPreviewFile(null)}
      />

      <ConfirmModal
        open={!!attachmentToRemove}
        title={tForm('delete')}
        message={`${tForm('delete')} "${attachmentToRemove?.name ?? ''}"?`}
        confirmLabel={tForm('delete')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        onConfirm={confirmRemoveAttachment}
        onCancel={cancelRemoveAttachment}
      />

      <ConfirmModal
        open={blockActionOpen}
        title={t('edit.unblockTitle')}
        message={t('edit.unblockMessage', {
          unitNumber:
            unitDetails.unitNumber !== '—' ? unitDetails.unitNumber : '',
        })}
        confirmLabel={t('edit.unblock')}
        cancelLabel={tForm('cancel')}
        confirmVariant="danger"
        isLoading={isTogglingBlock}
        loadingLabel={tForm('updating')}
        onConfirm={confirmBlockAction}
        onCancel={() => {
          if (isTogglingBlock) return;
          setBlockActionOpen(false);
        }}
      />
    </div>
  );
}
