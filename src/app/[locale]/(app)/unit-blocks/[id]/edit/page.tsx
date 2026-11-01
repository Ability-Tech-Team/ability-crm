'use client';

import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { History, Lock, Paperclip, Unlock } from 'lucide-react';
import Form from '@/src/components/Form';
import Button from '@/src/components/ui/Button';
import ConfirmModal from '@/src/components/ui/ConfirmModal';
import FileDropZone from '@/src/components/ui/FileDropZone';
import FilePreviewDialog from '@/src/components/ui/FilePreviewDialog';
import Input from '@/src/components/ui/Input';
import AccessDenied from '@/src/components/AccessDenied';
import ComplaintAttachmentsModal from '@/src/components/ComplaintAttachmentsModal';
import { UNIT_BLOCK_ATTACHMENT_ACCEPT } from '@/src/services/unitBlocks';
import BlockAttachmentsPanel from './components/BlockAttachmentsPanel';
import BlockHistoryPanel from './components/BlockHistoryPanel';
import { useUnitBlockEditPage } from './hooks/useUnitBlockEditPage';
import {
  editBlockSchema,
  getEditBlockButtons,
  getEditBlockFields,
  TABS,
} from './schema';
import { getEditBlockInitialValues } from './utils';

export default function UnitBlockEditPage() {
  const params = useParams();

  // Keyed so opening a different block remounts: the route param changes in
  // place, and the editor's state — the loaded block, staged files, queued
  // removals — all belongs to the one block that was loaded.
  return (
    <UnitBlockEditor key={String(params?.id)} blockId={Number(params?.id)} />
  );
}

function UnitBlockEditor({ blockId }: { blockId: number }) {
  const t = useTranslations('unitBlocks');
  const tForm = useTranslations('form');
  const tDocLib = useTranslations('documentLibrary');
  // The attachments dialog is shared with complaints, labels included.
  const tComplaints = useTranslations('complaints');
  const {
    privileges,
    canEdit,
    canUnblock,
    canEditType,
    block,
    blockByType,
    isLoading,
    loadError,
    isLegalBlock,
    isBlockActive,
    historyRows,
    assigneeOptions,
    showAttachments,
    setShowAttachments,
    showHistory,
    setShowHistory,
    previewFile,
    setPreviewFile,
    attachmentsBlock,
    setAttachmentsBlock,
    stagedFiles,
    existingAttachments,
    attachmentsError,
    handleStagedFilesChange,
    fileDescription,
    setFileDescription,
    requestRemoveAttachment,
    attachmentToRemove,
    confirmRemoveAttachment,
    cancelRemoveAttachment,
    blockActionOpen,
    setBlockActionOpen,
    isTogglingBlock,
    confirmBlockAction,
    handleSubmit,
    goToSearch,
    selectTab,
  } = useUnitBlockEditPage(blockId);

  if (!privileges.canAccess || !canEdit) {
    return <AccessDenied fallbackHref={privileges.firstAccessibleHref} />;
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{tForm('loading')}</p>
        </div>
      </div>
    );
  }

  if (loadError || !block) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">{loadError || t('edit.notFound')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <Form
        // `useForm` seeds its fields once, and the tabs swap the block without
        // remounting the page, so the key has to carry the block.
        key={block.id}
        title={`${t('edit.title')} #${block.id}`}
        fields={getEditBlockFields(t, isLegalBlock, assigneeOptions)}
        buttons={getEditBlockButtons(t, tForm, canEdit, goToSearch)}
        headerContent={
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {TABS.map((tab) => {
                const isActive = block.is_legal === tab.isLegal;
                const target = blockByType[tab.isLegal];
                // The tab you are on stays enabled whatever the privileges
                // say, so a user who can open this block can still edit it.
                const disabled =
                  !isActive && (!canEditType[tab.isLegal] || !target);

                return (
                  <Button
                    key={tab.id}
                    type="button"
                    variant={isActive ? 'primary' : 'secondary'}
                    disabled={disabled}
                    title={disabled ? t('edit.tabUnavailable') : undefined}
                    onClick={() => {
                      if (isActive || !target) return;
                      selectTab(tab.isLegal);
                    }}
                  >
                    {t(tab.labelKey)}
                  </Button>
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

              <Button
                type="button"
                variant={showHistory ? 'primary' : 'secondary'}
                onClick={() => setShowHistory((open) => !open)}
              >
                <History size={16} />
                {t('edit.showHistory')}
              </Button>

              {(isBlockActive ? canUnblock : canEdit) && (
                <Button
                  type="button"
                  variant={isBlockActive ? 'danger' : 'success'}
                  onClick={() => setBlockActionOpen(true)}
                >
                  {isBlockActive ? <Unlock size={16} /> : <Lock size={16} />}
                  {isBlockActive ? t('edit.unblock') : t('edit.block')}
                </Button>
              )}
            </div>
          </div>
        }
        initialValues={getEditBlockInitialValues(block)}
        validationSchema={editBlockSchema}
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
        <BlockAttachmentsPanel
          rows={existingAttachments}
          block={block}
          t={t}
          tForm={tForm}
          tDocLib={tDocLib}
          onPreview={setPreviewFile}
          onRemove={requestRemoveAttachment}
        />
      )}

      {showHistory && (
        <BlockHistoryPanel
          rows={historyRows}
          t={t}
          tComplaints={tComplaints}
          onViewAttachments={setAttachmentsBlock}
        />
      )}

      <ComplaintAttachmentsModal
        open={!!attachmentsBlock}
        complainId={attachmentsBlock?.id ?? ''}
        attachments={attachmentsBlock?.attachments ?? []}
        onClose={() => setAttachmentsBlock(null)}
      />

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
        title={isBlockActive ? t('edit.unblockTitle') : t('edit.blockTitle')}
        message={
          isBlockActive
            ? t('edit.unblockMessage', { unitNumber: block.unit_number ?? '' })
            : t('edit.blockMessage', { unitNumber: block.unit_number ?? '' })
        }
        confirmLabel={isBlockActive ? t('edit.unblock') : t('edit.block')}
        cancelLabel={tForm('cancel')}
        confirmVariant={isBlockActive ? 'danger' : 'success'}
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
