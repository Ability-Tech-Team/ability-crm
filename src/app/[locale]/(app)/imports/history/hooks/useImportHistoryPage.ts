'use client';

import { useCallback, useEffect, useState } from 'react';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  downloadImportErrors,
  getImports,
  type ImportRecord,
} from '@/src/services/imports';

const DEFAULT_PAGE_SIZE = 10;

type HistoryState = {
  key: string;
  imports: ImportRecord[];
  totalCount: number;
  failed: boolean;
};

/** The import history, one page at a time, newest as the API orders it. */
export function useImportHistoryPage() {
  const { error: showError } = useResponseMessage();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [reloadCount, setReloadCount] = useState(0);
  const [state, setState] = useState<HistoryState | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const requestKey = `${page}:${pageSize}:${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();

    getImports({ page, limit: pageSize }, controller.signal)
      .then(({ imports, totalCount }) => {
        setState({ key: requestKey, imports, totalCount, failed: false });
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        showError(err);
        setState({ key: requestKey, imports: [], totalCount: 0, failed: true });
      });

    return () => controller.abort();
  }, [page, pageSize, requestKey, showError]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  const reload = useCallback(() => setReloadCount((value) => value + 1), []);

  const handleDownloadErrors = useCallback(
    async (record: ImportRecord) => {
      if (downloadingId !== null) return;
      setDownloadingId(record.id);
      try {
        await downloadImportErrors(record.id);
      } catch (err) {
        showError(err);
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId, showError],
  );

  const isLoading = state?.key !== requestKey;

  return {
    imports: isLoading ? [] : (state?.imports ?? []),
    totalCount: state?.totalCount ?? 0,
    failed: !isLoading && Boolean(state?.failed),
    isLoading,
    page,
    pageSize,
    setPage,
    handlePageSizeChange,
    reload,
    downloadingId,
    handleDownloadErrors,
  };
}
