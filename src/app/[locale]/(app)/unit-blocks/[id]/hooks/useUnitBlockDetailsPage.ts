'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/src/i18n/navigation';
import type { PreviewFile } from '@/src/components/ui/FilePreviewDialog';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getUnitBlocks, type UnitBlock } from '@/src/services/unitBlocks';
import type { SectionId } from '../types';

export function useUnitBlockDetailsPage(blockId: number) {
  const t = useTranslations('unitBlocks');
  const router = useRouter();

  // Opened from a history row, and a role may carry read on either menu item.
  const privileges = useRoutePrivileges([
    '/unit-blocks/block-history',
    '/unit-blocks/search',
  ]);
  const canRead = privileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  // Read-only page; this only decides whether it links to the edit form,
  // which is gated on /unit-blocks/search alone — so read it from there.
  const editPrivileges = useRoutePrivileges('/unit-blocks/search');
  const canEdit = editPrivileges.hasPrivilege(PRIVILEGE_IDS.EDIT);

  const isValidId = Number.isFinite(blockId) && blockId > 0;

  const [block, setBlock] = useState<UnitBlock | null>(null);
  // Seeded from the id so the effect never sets state synchronously: a bad id
  // simply starts out not loading, and the not-found view shows.
  const [isLoading, setIsLoading] = useState(isValidId);
  const [loadError, setLoadError] = useState('');
  const [previewFile, setPreviewFile] = useState<PreviewFile | null>(null);

  // Every section starts open; the header buttons hide the ones not wanted.
  const [hiddenSections, setHiddenSections] = useState<SectionId[]>([]);
  const isSectionVisible = (id: SectionId) => !hiddenSections.includes(id);
  const toggleSection = (id: SectionId) =>
    setHiddenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );

  useEffect(() => {
    if (!isValidId) return;

    const controller = new AbortController();

    // There is no by-id endpoint; the search takes an `id` and returns one row.
    getUnitBlocks({ id: blockId, page: 1, limit: 1 }, controller.signal)
      .then(({ unitBlocks }) => {
        if (controller.signal.aborted) return;
        setBlock(unitBlocks.find((row) => row.id === blockId) ?? null);
      })
      .catch((err: unknown) => {
        if (
          !controller.signal.aborted &&
          (err as { name?: string }).name !== 'CanceledError'
        ) {
          setLoadError(t('loadError'));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [blockId, isValidId, t]);

  // Back to the history list with its filters still in the URL.
  const goBack = () => router.back();
  const goToEdit = () => router.push(`/unit-blocks/${blockId}/edit`);

  return {
    privileges,
    canRead,
    canEdit,
    block,
    isLoading,
    loadError,
    previewFile,
    setPreviewFile,
    isSectionVisible,
    toggleSection,
    goBack,
    goToEdit,
  };
}
