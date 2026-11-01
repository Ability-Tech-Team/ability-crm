'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getUnits, type Unit } from '@/src/services/units';
import { getUnitBlocks, type UnitBlock } from '@/src/services/unitBlocks';
import {
  getLegalEmployees,
  type LegalEmployee,
} from '@/src/services/legalEmployees';
import { LIMIT, TABS } from '../schema';
import type { SearchFormData, SearchParams, TabId } from '../types';
import { buildSearchParams } from '../utils';

export function useUnitBlocksSearchPage() {
  const t = useTranslations('unitBlocks');
  const tForm = useTranslations('form');
  const { data: dropdowns } = useDropdowns();

  const privileges = useRoutePrivileges('/unit-blocks/search');
  const canRead = privileges.hasAnyPrivilege([
    PRIVILEGE_IDS.READ,
    PRIVILEGE_IDS.READ_ALL,
  ]);
  const canExport = privileges.hasPrivilege(PRIVILEGE_IDS.EXPORT);
  const canEdit = privileges.hasPrivilege(PRIVILEGE_IDS.EDIT);

  // 63/64 hang off the /unit-blocks/add menu item, not /unit-blocks/search.
  const blockTypePrivileges = useRoutePrivileges('/unit-blocks/add');

  // ── Search & data state ──────────────────────────────────────
  const [unitBlocks, setUnitBlocks] = useState<UnitBlock[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // ── Active tab ───────────────────────────────────────────────
  const [selectedTabId, setSelectedTabId] = useState<TabId>('all');

  const canUseTab = (tab: (typeof TABS)[number]) =>
    tab.privileges.every((privilege) =>
      blockTypePrivileges.hasPrivilege(privilege),
    );

  // Privileges arrive from the store after the first render, so the tab is
  // derived rather than stored: until they land, and for a user who cannot
  // use the one they picked, this falls back to the first tab they can use.
  const activeTab =
    TABS.find((tab) => tab.id === selectedTabId && canUseTab(tab)) ??
    TABS.find(canUseTab) ??
    TABS[0];

  // ── Fetching ─────────────────────────────────────────────────
  const fetchUnitBlocks = useCallback(
    async (params: SearchParams, page: number, limit: number) => {
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
        setUnitBlocks(data.unitBlocks);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
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

  const fetchUnits = useCallback(
    async (params: SearchParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getUnits(
          {
            unit_id: params.unit_id,
            unit_number: params.unit_number,
            is_exact: params.is_exact === 1,
            // Only units that currently hold a block; the kind narrows it.
            blocked_units: 1,
            is_legal: params.block_kind,
            page,
            limit,
          },
          controller.signal,
        );
        setUnits(data.units);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
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

  /** Routes to the endpoint the active tab uses. */
  const fetchForTab = useCallback(
    async (params: SearchParams, page: number, limit: number) =>
      activeTab.showsUnits
        ? fetchUnits(params, page, limit)
        : fetchUnitBlocks(params, page, limit),
    [activeTab.showsUnits, fetchUnits, fetchUnitBlocks],
  );

  // ── Form handlers ────────────────────────────────────────────
  const handleSubmit = async (data: SearchFormData) => {
    setHasSearched(true);
    const params = buildSearchParams(data, activeTab.isLegal);
    setSearchParams(params);
    setCurrentPage(1);
    await fetchForTab(params, 1, pageSize);
  };

  const handleTabChange = (tabId: TabId) => {
    if (tabId === activeTab.id) return;

    setSelectedTabId(tabId);
    // Drop the old rows: the tabs do not even share a row type.
    setUnitBlocks([]);
    setUnits([]);
    setTotalCount(0);
    setCurrentPage(1);
    setError('');
    // No fetch here: the Form is keyed on the tab, so it remounts and its
    // `autoSubmit` runs the search. Fetching here too would double-request.
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setUnitBlocks([]);
    setUnits([]);
    setTotalCount(0);
    setCurrentPage(1);
    setError('');
    setHasSearched(false);
  };

  const handlePageChange = async (page: number) => {
    if (page === currentPage || !searchParams) return;
    setCurrentPage(page);
    await fetchForTab(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchForTab(searchParams, 1, size);
  };

  // ── Options ──────────────────────────────────────────────────
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

  const projectOptions = useMemo(
    () =>
      (dropdowns?.company_projects ?? []).map((option) => ({
        value: String(option.id),
        label: option.name,
      })),
    [dropdowns],
  );

  const statusOptions = useMemo(
    () => [
      { value: '1', label: tForm('isActive') },
      { value: '0', label: tForm('inactive') },
    ],
    [tForm],
  );

  const rentalCompanyMap = useMemo(
    () =>
      new Map<number, string>(
        (dropdowns?.rental_companies ?? []).map((d): [number, string] => [
          d.id,
          d.name,
        ]),
      ),
    [dropdowns],
  );

  /** `/projects/units` takes its own params, so it can't reuse searchParams. */
  const unitExportParams = {
    ...(searchParams?.unit_id ? { unit_id: searchParams.unit_id } : {}),
    ...(searchParams?.unit_number
      ? { unit_number: searchParams.unit_number }
      : {}),
    ...(searchParams?.is_exact ? { is_exact: searchParams.is_exact } : {}),
    blocked_units: 1,
    ...(searchParams?.block_kind !== undefined
      ? { is_legal: searchParams.block_kind }
      : {}),
  };

  // Narrowing by kind is only a choice for a user who can see both; with one
  // privilege the All tab already shows the only kind they are allowed.
  const canSeeBothKinds = TABS.filter(canUseTab).length === TABS.length;

  return {
    privileges,
    canRead,
    canExport,
    canEdit,
    canUseTab,
    canSeeBothKinds,
    activeTab,
    unitBlocks,
    units,
    totalCount,
    currentPage,
    pageSize,
    searchParams,
    unitExportParams,
    isLoading,
    error,
    hasSearched,
    categoryOptions,
    assigneeOptions,
    projectOptions,
    statusOptions,
    rentalCompanyMap,
    handleSubmit,
    handleTabChange,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
  };
}
