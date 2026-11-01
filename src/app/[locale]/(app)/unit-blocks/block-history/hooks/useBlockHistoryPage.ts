'use client';

import { useCallback, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getUnitBlocks, type UnitBlock } from '@/src/services/unitBlocks';
import { LIMIT, TABS } from '../schema';
import type { HistoryFormData, HistorySearchParams, TabId } from '../types';
import { buildHistoryParams, getHistoryInitialValues } from '../utils';

export function useBlockHistoryPage() {
  const t = useTranslations('unitBlocks');
  const searchParamsFromUrl = useSearchParams();

  const privileges = useRoutePrivileges('/unit-blocks/search');
  const canRead = privileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExport = privileges.hasPrivilege(PRIVILEGE_IDS.EXPORT);

  // 63/64 hang off the /unit-blocks/add menu item, not /unit-blocks/search.
  const blockTypePrivileges = useRoutePrivileges('/unit-blocks/add');

  const initialValues = getHistoryInitialValues(searchParamsFromUrl);

  // ── Active tab ───────────────────────────────────────────────
  const [selectedTabId, setSelectedTabId] = useState<TabId>(
    searchParamsFromUrl.get('is_legal') === '1' ? 'legal' : 'finance',
  );

  const canUseTab = (tab: (typeof TABS)[number]) =>
    blockTypePrivileges.hasPrivilege(tab.privilege);

  // Privileges arrive from the store after the first render, so the tab is
  // derived rather than stored: until they land, and for a user who cannot
  // use the one they picked, this falls back to the first tab they can use.
  const activeTab =
    TABS.find((tab) => tab.id === selectedTabId && canUseTab(tab)) ??
    TABS.find(canUseTab) ??
    TABS[0];

  // ── Data state ───────────────────────────────────────────────
  const [rows, setRows] = useState<UnitBlock[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<HistorySearchParams | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // The block whose attachments the dialog is showing.
  const [attachmentsBlock, setAttachmentsBlock] = useState<UnitBlock | null>(
    null,
  );
  const abortRef = useRef<AbortController | null>(null);

  const fetchHistory = useCallback(
    async (params: HistorySearchParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getUnitBlocks(
          { ...params, page, limit },
          controller.signal,
        );
        setRows(data.unitBlocks);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setRows([]);
          setTotalCount(0);
          setError(t('loadError'));
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [t],
  );

  // ── Handlers ─────────────────────────────────────────────────
  const handleSubmit = async (data: HistoryFormData) => {
    const params = buildHistoryParams(data, activeTab.isLegal);
    setSearchParams(params);
    setCurrentPage(1);
    await fetchHistory(params, 1, pageSize);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setRows([]);
    setTotalCount(0);
    setCurrentPage(1);
    setError('');
  };

  const handleTabChange = (tabId: TabId) => {
    if (tabId === activeTab.id) return;

    setSelectedTabId(tabId);
    setRows([]);
    setTotalCount(0);
    setCurrentPage(1);
    setError('');
    // No fetch here: the Form is keyed on the tab, so it remounts and its
    // `autoSubmit` runs the search. Fetching here too would double-request.
  };

  const handlePageChange = async (page: number) => {
    if (page === currentPage || !searchParams) return;
    setCurrentPage(page);
    await fetchHistory(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchHistory(searchParams, 1, size);
  };

  return {
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
  };
}
