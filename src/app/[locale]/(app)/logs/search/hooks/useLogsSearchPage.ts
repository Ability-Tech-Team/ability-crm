'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SelectOption } from '@/src/components/ui/Select';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { runAfterCommit } from '@/src/lib/runAfterCommit';
import { getEmployees } from '@/src/services/employees';
import { getModuleLogs } from '@/src/services/moduleLogs';
import { LIMIT } from '../schema';
import type { LogsSearchFormData, LogsSearchParams, ModuleLog } from '../types';
import { buildLogModuleOptions, buildLogsSearchParams } from '../utils';

export function useLogsSearchPage() {
  const t = useTranslations('logs');
  const { data: dropdowns } = useDropdowns();

  // ── Filter options ───────────────────────────────────────────
  const [employeeOptions, setEmployeeOptions] = useState<SelectOption[]>([]);

  useEffect(() => {
    const controller = new AbortController();

    const fetchEmployees = async () => {
      try {
        const data = await getEmployees(
          { page: 1, limit: 1000 },
          controller.signal,
        );
        setEmployeeOptions(
          data.employees
            .filter((employee) => employee.is_deleted !== 1)
            .sort((a, b) => a.full_name.localeCompare(b.full_name))
            .map((employee) => ({
              value: employee.id,
              label: employee.full_name || employee.user_name,
            })),
        );
      } catch {
        // The "created by" filter is optional; without the list it is empty.
        if (!controller.signal.aborted) setEmployeeOptions([]);
      }
    };

    const cancel = runAfterCommit(() => void fetchEmployees());
    return () => {
      cancel();
      controller.abort();
    };
  }, []);

  const moduleOptions = useMemo(
    () => buildLogModuleOptions(dropdowns?.log_modules),
    [dropdowns?.log_modules],
  );

  const actionOptions = useMemo<SelectOption[]>(
    () =>
      (dropdowns?.log_actions ?? []).map((action) => ({
        value: String(action.id),
        label: action.name,
      })),
    [dropdowns?.log_actions],
  );

  // ── Data state ───────────────────────────────────────────────
  const [rows, setRows] = useState<ModuleLog[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(LIMIT);
  const [searchParams, setSearchParams] = useState<LogsSearchParams | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  const fetchLogs = useCallback(
    async (params: LogsSearchParams, page: number, limit: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setError('');

      try {
        const data = await getModuleLogs(
          { ...params, page, limit },
          controller.signal,
        );
        setRows(data.logs);
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
  const handleSubmit = async (data: LogsSearchFormData) => {
    const params = buildLogsSearchParams(data);
    setSearchParams(params);
    setCurrentPage(1);
    await fetchLogs(params, 1, pageSize);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setRows([]);
    setTotalCount(0);
    setCurrentPage(1);
    // Otherwise the export would still use the cleared filters.
    setSearchParams(null);
    setError('');
  };

  const handlePageChange = async (page: number) => {
    if (page === currentPage || !searchParams) return;
    setCurrentPage(page);
    await fetchLogs(searchParams, page, pageSize);
  };

  const handlePageSizeChange = async (size: number) => {
    if (!searchParams) return;
    setPageSize(size);
    setCurrentPage(1);
    await fetchLogs(searchParams, 1, size);
  };

  return {
    moduleOptions,
    actionOptions,
    employeeOptions,
    rows,
    totalCount,
    currentPage,
    pageSize,
    searchParams,
    isLoading,
    error,
    handleSubmit,
    handleReset,
    handlePageChange,
    handlePageSizeChange,
  };
}
