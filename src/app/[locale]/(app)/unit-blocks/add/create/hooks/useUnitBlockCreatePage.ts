'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import type { PreviewFile } from '@/src/components/ui/FilePreviewDialog';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import type { Unit } from '@/src/services/units';
import {
  createUnitBlock,
  getUnitBlocks,
  updateUnitBlock,
  UNIT_ALREADY_HAS_BLOCK,
  type UnitBlock,
} from '@/src/services/unitBlocks';
import {
  getLegalEmployees,
  type LegalEmployee,
} from '@/src/services/legalEmployees';
import { validateStagedFiles } from '../../../_shared/utils';
import { FINANCE_CATEGORY_ID, TABS } from '../schema';
import type { BlockFormData, TabId } from '../types';
import {
  collectUnitAttachments,
  getUnitDetails,
  loadStagedUnit,
} from '../utils';
import { getErrorCode } from '@/src/lib/apiErrors';

export function useUnitBlockCreatePage() {
  const t = useTranslations('unitBlocks');
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: dropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/unit-blocks/add');

  // Editing a block that already stands is the edit page's job, so it takes
  // the same privileges. Checked across both menu items, since a role may
  // carry them on either one.
  const blockPrivileges = useRoutePrivileges([
    '/unit-blocks/add',
    '/unit-blocks/search',
  ]);
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);
  const canEdit = blockPrivileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  const canUnblock = blockPrivileges.hasPrivilege(PRIVILEGE_IDS.UNBLOCK);

  const unitId = searchParams.get('unitId');
  const [unit] = useState<Unit | null>(loadStagedUnit);
  const unitDetails = getUnitDetails(unit);

  // ── The tab decides the block type ───────────────────────────
  const [selectedTabId, setSelectedTabId] = useState<TabId>('finance');

  const canUseTab = (tab: (typeof TABS)[number]) =>
    privileges.hasPrivilege(tab.privilege);

  // Privileges arrive from the store after the first render, so the tab is
  // derived rather than stored: until they land, and for a user who cannot
  // use the one they picked, this falls back to the first tab they can use.
  const activeTab =
    TABS.find((tab) => tab.id === selectedTabId && canUseTab(tab)) ??
    TABS.find(canUseTab) ??
    TABS[0];

  const isLegalBlock = activeTab.isLegal === 1;

  // ── The unit's live block for the tab on screen ──────────────
  // A unit holds at most one live block per kind. When one exists this page is
  // an edit form for it; with none, it is the create form it has always been.
  // Both kinds are fetched at once so switching tabs shows the right data
  // immediately instead of the previous tab's until a new request lands.
  const [liveBlocks, setLiveBlocks] = useState<UnitBlock[]>([]);
  const unitKey = unit?.id ?? Number(unitId);

  // Nothing to wait for when there is no usable unit id.
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(() =>
    Number.isFinite(unitKey),
  );

  /**
   * Also re-run after a save, since the page stays put. Written as a promise
   * chain rather than async/await so no state is set synchronously when the
   * effect below calls it.
   */
  const loadLiveBlocks = useCallback(
    (signal?: AbortSignal) => {
      if (!Number.isFinite(unitKey)) return Promise.resolve();

      return getUnitBlocks(
        { unit_id: unitKey, is_active: 1, limit: 100 },
        signal,
      )
        .then(({ unitBlocks }) => {
          setLiveBlocks(unitBlocks);
          setIsLoadingBlocks(false);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name !== 'CanceledError') {
            setLiveBlocks([]);
            setIsLoadingBlocks(false);
          }
        });
    },
    [unitKey],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadLiveBlocks(controller.signal);
    return () => controller.abort();
  }, [loadLiveBlocks]);

  const existingBlock =
    liveBlocks.find((row) => row.is_legal === activeTab.isLegal) ?? null;

  // ── Assignee and category options ────────────────────────────
  const [legalEmployees, setLegalEmployees] = useState<LegalEmployee[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    getLegalEmployees({ is_active: 1, limit: 1000 }, controller.signal)
      .then(({ legalEmployees: rows }) => setLegalEmployees(rows))
      .catch(() => setLegalEmployees([]));

    return () => controller.abort();
  }, []);

  const categoryOptions = useMemo(
    () =>
      (dropdowns?.unit_block_categories ?? [])
        .filter((option) => option.is_active !== 0)
        .map((option) => ({ value: String(option.id), label: option.name })),
    [dropdowns],
  );

  const assigneeOptions = useMemo(
    () =>
      legalEmployees.map((employee) => ({
        value: employee.id,
        label: employee.full_name,
      })),
    [legalEmployees],
  );

  // ── Attachments ──────────────────────────────────────────────
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<
    (string | number)[]
  >([]);
  const [attachmentsError, setAttachmentsError] = useState('');
  const [showAttachments, setShowAttachments] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  const unitAttachments = useMemo(
    () =>
      collectUnitAttachments(
        liveBlocks,
        activeTab.isLegal,
        removedAttachmentIds,
      ),
    [liveBlocks, activeTab.isLegal, removedAttachmentIds],
  );

  // One description for the staged batch; the endpoint takes one per save.
  const [fileDescription, setFileDescription] = useState('');

  /** `FileDropZone` owns the whole list and hands all of it back each time. */
  const handleStagedFilesChange = useCallback((files: File[]) => {
    setAttachmentsError('');
    setStagedFiles(files);
    // The box hides with the last file, so it must not keep text that would
    // go out, unseen, with the next batch.
    if (!files.length) setFileDescription('');
  }, []);

  // Queued, not sent: the removal only reaches the backend on save.
  const [attachmentToRemove, setAttachmentToRemove] = useState<{
    id: string | number;
    name: string;
  } | null>(null);

  const requestRemoveAttachment = useCallback(
    (id: string | number, name: string) => setAttachmentToRemove({ id, name }),
    [],
  );

  const confirmRemoveAttachment = useCallback(() => {
    setAttachmentToRemove((target) => {
      if (target) setRemovedAttachmentIds((prev) => [...prev, target.id]);
      return null;
    });
  }, []);

  const cancelRemoveAttachment = useCallback(
    () => setAttachmentToRemove(null),
    [],
  );

  // ── Block / unblock ──────────────────────────────────────────
  const [isSaving, setIsSaving] = useState(false);
  const [blockActionOpen, setBlockActionOpen] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);

  // Only ever flips the block's status; the fields belong to Save Changes.
  const confirmBlockAction = async () => {
    if (!existingBlock) return;

    setIsTogglingBlock(true);
    try {
      await updateUnitBlock(existingBlock.id, { is_active: 0 });
      showSuccess('updateSuccess');
      router.push('/unit-blocks/add');
    } catch (err) {
      showError(err);
    } finally {
      setIsTogglingBlock(false);
    }
  };

  // ── Submit ───────────────────────────────────────────────────
  const canSave = existingBlock ? canEdit : canAdd;

  const saveBlock = async (data: BlockFormData) => {
    if (!canSave) return;

    const invalid = validateStagedFiles(stagedFiles, t);
    if (invalid) {
      setAttachmentsError(invalid);
      return;
    }

    setAttachmentsError('');

    try {
      if (existingBlock) {
        // The unit is already blocked for this kind, so this is an edit. It
        // must not go through createUnitBlock, which would be refused with
        // UNIT_ALREADY_HAS_BLOCK.
        await updateUnitBlock(existingBlock.id, {
          reason: data.reason,
          assign_to_id: data.assign_to_id || undefined,
          deleted_attachment_ids: removedAttachmentIds.length
            ? removedAttachmentIds
            : undefined,
          files: stagedFiles.length ? stagedFiles : undefined,
          file_description: fileDescription || undefined,
        });
      } else {
        await createUnitBlock({
          unit_id: unit?.id ?? Number(unitId),
          category_id: data.category_id
            ? Number(data.category_id)
            : FINANCE_CATEGORY_ID,
          is_legal: Number(data.is_legal),
          // The schema only makes reason optional on an edit, so it is always
          // present here; the fallback is for the type, not for the user.
          reason: data.reason ?? '',
          assign_to_id: data.assign_to_id || undefined,
          files: stagedFiles,
          file_description: fileDescription || undefined,
        });
      }

      showSuccess(existingBlock ? 'updateSuccess' : 'createSuccess');

      // Stays on the page. The staged files are stored on the block now, so
      // the lists are dropped and the block reloaded - which is also what
      // turns a create into an edit, `existingBlock` no longer being null.
      setStagedFiles([]);
      setRemovedAttachmentIds([]);
      setFileDescription('');
      await loadLiveBlocks();
    } catch (err) {
      if (getErrorCode(err) === UNIT_ALREADY_HAS_BLOCK) {
        showError(new Error(t('create.alreadyBlocked')));
        return;
      }

      showError(err);
    }
  };

  const handleSubmit = async (data: BlockFormData) => {
    setIsSaving(true);
    try {
      await saveBlock(data);
    } finally {
      setIsSaving(false);
    }
  };

  const goToAdd = () => router.push('/unit-blocks/add');

  /**
   * Staged work belongs to the block it was staged for. Each tab is a
   * different block, so switching drops it rather than letting a save file it
   * under the other one.
   */
  const selectTab = (tabId: TabId) => {
    if (tabId === activeTab.id) return;

    setSelectedTabId(tabId);
    setStagedFiles([]);
    setRemovedAttachmentIds([]);
    setFileDescription('');
    setAttachmentsError('');
    setAttachmentToRemove(null);
  };

  return {
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
  };
}
