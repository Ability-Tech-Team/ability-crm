'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/src/i18n/navigation';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import {
  getUnits,
  type GetUnitsParams,
  type Unit,
} from '@/src/services/units';
import { LIMIT } from '../schema';
import type { UnitSearchFormData } from '../types';
import { buildUnitSearchParams } from '../utils';

export function useUnitBlocksAddPage() {
  const { data: dropdowns } = useDropdowns();
  const router = useRouter();
  const { error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/unit-blocks/add');
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);

  const [units, setUnits] = useState<Unit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<GetUnitsParams | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

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

  const fetchUnits = useCallback(
    async (params: GetUnitsParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);

      try {
        const data = await getUnits(
          { ...params, page, limit },
          controller.signal,
        );
        setUnits(data.units);
        setTotalCount(data.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          showError(err);
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [showError],
  );

  const handleSubmit = async (data: UnitSearchFormData) => {
    setHasSearched(true);
    const params = buildUnitSearchParams(data);
    setSearchParams(params);
    setCurrentPage(1);
    await fetchUnits(params, 1, pageSize);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setUnits([]);
    setTotalCount(0);
    setCurrentPage(1);
    setSearchParams(null);
    setHasSearched(false);
  };

  const handlePageChange = async (page: number) => {
    if (page === currentPage || !searchParams) return;
    setCurrentPage(page);
    await fetchUnits(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchUnits(searchParams, 1, size);
  };

  /** Stages the unit for the create page, which reads it on its first render. */
  const openUnit = (row: Unit) => {
    sessionStorage.setItem(
      'unit-block-create-unit',
      JSON.stringify({ unit: row }),
    );
    router.push(`/unit-blocks/add/create?unitId=${row.id}`);
  };

  return {
    canAdd,
    units,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    hasSearched,
    rentalCompanyMap,
    handleSubmit,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
    openUnit,
  };
}
