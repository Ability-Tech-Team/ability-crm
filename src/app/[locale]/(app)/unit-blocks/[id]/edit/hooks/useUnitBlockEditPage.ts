'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import type { PreviewFile } from '@/src/components/ui/FilePreviewDialog';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  getUnitBlocks,
  updateUnitBlock,
  UNIT_ALREADY_HAS_BLOCK,
  type UnitBlock,
  type UnitBlockAttachment,
} from '@/src/services/unitBlocks';
import {
  getLegalEmployees,
  type LegalEmployee,
} from '@/src/services/legalEmployees';
import { validateStagedFiles } from '../../../_shared/utils';
import type { EditBlockFormData } from '../types';
import { pickBlockByType } from '../utils';
import { getErrorCode } from '@/src/lib/apiErrors';

export function useUnitBlockEditPage(blockId: number) {
  const t = useTranslations('unitBlocks');
  const router = useRouter();
  const { success: showSuccess, error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/unit-blocks/search');
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);
  // Lifting a block is its own privilege, separate from editing its fields.
  const canUnblock = privileges.hasPrivilege(PRIVILEGE_IDS.UNBLOCK);

  // 63/64 hang off the /unit-blocks/add menu item, not /unit-blocks/search.
  const blockTypePrivileges = useRoutePrivileges('/unit-blocks/add');
  const canEditType: Record<number, boolean> = {
    0: blockTypePrivileges.hasPrivilege(PRIVILEGE_IDS.FINANCE_BLOCK),
    1: blockTypePrivileges.hasPrivilege(PRIVILEGE_IDS.LEGAL_BLOCK),
  };

  // ── Load the block ───────────────────────────────────────────
  const [loadedBlock, setLoadedBlock] = useState<UnitBlock | null>(null);
  // Which kind is on screen. Null until a tab is clicked, so the block the
  // route named picks the first one.
  const [selectedIsLegal, setSelectedIsLegal] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(() => Number.isFinite(blockId));
  const [loadError, setLoadError] = useState('');

  /**
   * Also re-run after a save, since the page stays put. Written as a promise
   * chain rather than async/await so no state is set synchronously when the
   * effect below calls it.
   */
  const loadBlock = useCallback(
    (signal?: AbortSignal) => {
      if (!Number.isFinite(blockId)) return Promise.resolve();

      return getUnitBlocks({ id: blockId, page: 1, limit: 1 }, signal)
        .then(({ unitBlocks }) => {
          // Match on id: a backend that ignores the filter would hand us
          // a different block, and we would then save over it.
          setLoadedBlock(unitBlocks.find((row) => row.id === blockId) ?? null);
          setIsLoading(false);
        })
        .catch((err: unknown) => {
          if ((err as { name?: string }).name !== 'CanceledError') {
            setLoadError(t('loadError'));
            setIsLoading(false);
          }
        });
    },
    [blockId, t],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadBlock(controller.signal);
    return () => controller.abort();
  }, [loadBlock]);

  // ── The unit's other block, so a tab can switch to it ────────
  const [unitBlocksForUnit, setUnitBlocksForUnit] = useState<UnitBlock[]>([]);

  const unitId = loadedBlock?.unit_id;

  const loadUnitBlocks = useCallback(
    (signal?: AbortSignal) => {
      if (!unitId) return Promise.resolve();

      return getUnitBlocks({ unit_id: unitId, limit: 100 }, signal)
        .then(({ unitBlocks }) => setUnitBlocksForUnit(unitBlocks))
        .catch(() => setUnitBlocksForUnit([]));
    },
    [unitId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void loadUnitBlocks(controller.signal);
    return () => controller.abort();
  }, [loadUnitBlocks]);

  const blockByType = useMemo(
    () => pickBlockByType(unitBlocksForUnit),
    [unitBlocksForUnit],
  );

  // Switching tabs swaps the block in place rather than navigating: the
  // unit's blocks are already loaded, so it costs no request and no remount.
  const block =
    selectedIsLegal === null || selectedIsLegal === loadedBlock?.is_legal
      ? loadedBlock
      : (blockByType[selectedIsLegal] ?? loadedBlock);

  const isLegalBlock = block?.is_legal === 1;
  const isBlockActive = block?.is_active === 1;

  const historyRows = useMemo(
    () => unitBlocksForUnit.filter((row) => row.is_legal === block?.is_legal),
    [unitBlocksForUnit, block?.is_legal],
  );

  // ── Assignee options ─────────────────────────────────────────
  const [legalEmployees, setLegalEmployees] = useState<LegalEmployee[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    getLegalEmployees({ is_active: 1, limit: 1000 }, controller.signal)
      .then(({ legalEmployees: rows }) => setLegalEmployees(rows))
      .catch(() => setLegalEmployees([]));

    return () => controller.abort();
  }, []);

  const assigneeOptions = useMemo(
    () =>
      legalEmployees.map((employee) => ({
        value: employee.id,
        label: employee.full_name,
      })),
    [legalEmployees],
  );

  // ── Panels ───────────────────────────────────────────────────
  const [showAttachments, setShowAttachments] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);
  // The block whose attachments the history dialog is showing.
  const [attachmentsBlock, setAttachmentsBlock] = useState<UnitBlock | null>(
    null,
  );

  // ── Attachments ──────────────────────────────────────────────
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [removedAttachmentIds, setRemovedAttachmentIds] = useState<
    (string | number)[]
  >([]);
  const [attachmentsError, setAttachmentsError] = useState('');

  const existingAttachments = useMemo(
    () =>
      (block?.attachments ?? []).filter(
        (attachment: UnitBlockAttachment) =>
          !removedAttachmentIds.includes(attachment.id),
      ),
    [block, removedAttachmentIds],
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
  const [blockActionOpen, setBlockActionOpen] = useState(false);
  const [isTogglingBlock, setIsTogglingBlock] = useState(false);

  const confirmBlockAction = async () => {
    if (!block) return;

    setIsTogglingBlock(true);
    try {
      await updateUnitBlock(block.id, {
        is_active: isBlockActive ? 0 : 1,
      });
      showSuccess('updateSuccess');
      router.push('/unit-blocks/search');
    } catch (err) {
      showError(err);
    } finally {
      setIsTogglingBlock(false);
    }
  };

  // ── Submit ───────────────────────────────────────────────────
  const handleSubmit = async (data: EditBlockFormData) => {
    if (!block) return;

    const invalid = validateStagedFiles(stagedFiles, t);
    if (invalid) {
      setAttachmentsError(invalid);
      return;
    }

    setAttachmentsError('');

    try {
      await updateUnitBlock(block.id, {
        reason: data.reason,
        assign_to_id: data.assign_to_id || undefined,
        deleted_attachment_ids: removedAttachmentIds.length
          ? removedAttachmentIds
          : undefined,
        files: stagedFiles.length ? stagedFiles : undefined,
        file_description: fileDescription || undefined,
      });

      showSuccess('updateSuccess');

      // Stays on the page. The staged files are stored on the block now, so
      // the lists are dropped and both fetches re-run: the route's block for
      // the form and its attachments, the unit's blocks for the history.
      setStagedFiles([]);
      setRemovedAttachmentIds([]);
      setFileDescription('');
      await Promise.all([loadBlock(), loadUnitBlocks()]);
    } catch (err) {
      if (getErrorCode(err) === UNIT_ALREADY_HAS_BLOCK) {
        showError(new Error(t('create.alreadyBlocked')));
        return;
      }

      showError(err);
    }
  };

  const goToSearch = () => router.push('/unit-blocks/search');

  /** Swaps the block on screen without a route change. */
  const selectTab = (isLegal: number) => {
    if (isLegal === block?.is_legal) return;

    setSelectedIsLegal(isLegal);
    // Staged work belongs to the block it was staged on.
    setStagedFiles([]);
    setRemovedAttachmentIds([]);
    setFileDescription('');
    setAttachmentsError('');
    setAttachmentToRemove(null);
  };

  return {
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
  };
}
