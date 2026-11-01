'use client';

import { useCallback, useRef, useState } from 'react';
import { getRentalUnits } from '@/src/services/rentals';
import type { RentalUnitSearchParams, UnitRow } from '../types';
import { flattenUnits, RENTAL_SEARCH_PAGE_SIZE } from '../utils';

export function useRentalUnitSearch(loadErrorMessage: string) {
  const [rows, setRows] = useState<UnitRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(RENTAL_SEARCH_PAGE_SIZE);
  const [searchParams, setSearchParams] =
    useState<RentalUnitSearchParams | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchUnits = useCallback(
    async (params: RentalUnitSearchParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const unitsData = await getRentalUnits(
          {
            unit_number: params.unit_number,
            is_exact: params.is_exact,
            page,
            limit,
          },
          controller.signal,
        );

        setRows(flattenUnits(unitsData.units, new Set()));
        setTotalCount(unitsData.totalCount);
      } catch (err: unknown) {
        if ((err as { name?: string }).name !== 'CanceledError') {
          setError(loadErrorMessage);
        }
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [loadErrorMessage],
  );

  const submitSearch = useCallback(
    async (params: RentalUnitSearchParams) => {
      setHasSearched(true);
      setSearchParams(params);
      setCurrentPage(1);
      await fetchUnits(params, 1, pageSize);
    },
    [fetchUnits, pageSize],
  );

  const resetSearch = useCallback(() => {
    abortRef.current?.abort();
    setRows([]);
    setTotalCount(0);
    setCurrentPage(1);
    setPageSize(RENTAL_SEARCH_PAGE_SIZE);
    setSearchParams(null);
    setHasSearched(false);
    setError('');
    setIsLoading(false);
  }, []);

  const changePage = useCallback(
    async (page: number) => {
      if (!searchParams || page === currentPage) return;
      setCurrentPage(page);
      await fetchUnits(searchParams, page, pageSize);
    },
    [currentPage, fetchUnits, pageSize, searchParams],
  );

  const changePageSize = useCallback(
    async (size: number) => {
      if (!searchParams) return;
      setPageSize(size);
      setCurrentPage(1);
      await fetchUnits(searchParams, 1, size);
    },
    [fetchUnits, searchParams],
  );

  return {
    rows,
    totalCount,
    currentPage,
    pageSize,
    isLoading,
    error,
    hasSearched,
    submitSearch,
    resetSearch,
    changePage,
    changePageSize,
  };
}
