'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { isNotFoundError } from '@/src/lib/apiErrors';
import {
  createErpAccountCode,
  getAllErpAccountCodes,
  searchErpAccountCodes,
  updateErpAccountCode,
} from '@/src/services/erpAccountCodes';
import { buildErpCodePayload, buildErpCodeUpdatePayload } from '../utils';
import type { ErpCodeOption } from '../types';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

export function useErpCodesPage() {
  const { success: showSuccess, error: showError } = useResponseMessage();

  const [items, setItems] = useState<ErpCodeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<ErpCodeOption | null>(null);
  const [saving, setSaving] = useState(false);

  const [codeQuery, setCodeQuery] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ErpCodeOption[] | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const data = await getAllErpAccountCodes(signal);
        setItems(data);
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'CanceledError') {
          return;
        }
        if (isNotFoundError(err)) {
          setItems([]);
          return;
        }
        showError(err);
      } finally {
        setIsLoading(false);
      }
    },
    [showError],
  );

  useEffect(() => {
    const controller = new AbortController();
    const cancel = runAfterCommit(() => {
      void fetchData(controller.signal);
    });

    return () => {
      cancel();
      controller.abort();
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const runSearch = useCallback(
    async (codeValue: string, nameValue: string) => {
      const trimmedCode = codeValue.trim();
      const trimmedName = nameValue.trim();

      if (!trimmedCode && !trimmedName) {
        setSearchResults(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);

      try {
        const results = await searchErpAccountCodes(
          {
            ...(trimmedCode ? { code: trimmedCode } : {}),
            ...(trimmedName ? { name: trimmedName } : {}),
          },
          controller.signal,
        );
        setSearchResults(results);
      } catch (err: unknown) {
        if ((err as { name?: string }).name === 'CanceledError') {
          return;
        }
        if (isNotFoundError(err)) {
          setSearchResults([]);
          return;
        }
        showError(err);
      } finally {
        setIsSearching(false);
      }
    },
    [showError],
  );

  const handleSearch = useCallback(async () => {
    await runSearch(codeQuery, nameQuery);
  }, [runSearch, codeQuery, nameQuery]);

  const handleClearSearch = useCallback(() => {
    setCodeQuery('');
    setNameQuery('');
    setSearchResults(null);
  }, []);

  const refreshList = useCallback(async () => {
    await fetchData();
    if (codeQuery.trim() || nameQuery.trim()) {
      await runSearch(codeQuery, nameQuery);
    }
  }, [fetchData, runSearch, codeQuery, nameQuery]);

  const openAddModal = useCallback(() => {
    setEditTarget(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: ErpCodeOption) => {
    setEditTarget(row);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
  }, []);

  const handleSave = useCallback(
    async (values: Record<string, string>) => {
      setSaving(true);
      const isEditing = Boolean(editTarget);
      try {
        if (editTarget) {
          const updatePayload = buildErpCodeUpdatePayload(values, editTarget);
          if (Object.keys(updatePayload).length === 0) {
            closeModal();
            return;
          }
          await updateErpAccountCode(editTarget.id, updatePayload);
        } else {
          await createErpAccountCode(buildErpCodePayload(values));
        }
        await refreshList();
        closeModal();
        showSuccess(isEditing ? 'updateSuccess' : 'createSuccess');
      } catch (err) {
        showError(err);
      } finally {
        setSaving(false);
      }
    },
    [editTarget, refreshList, closeModal, showSuccess, showError],
  );

  const displayData = searchResults ?? items;

  return {
    displayData,
    isLoading,
    modalOpen,
    editTarget,
    saving,
    codeQuery,
    setCodeQuery,
    nameQuery,
    setNameQuery,
    isSearching,
    handleSearch,
    handleClearSearch,
    openAddModal,
    openEditModal,
    closeModal,
    handleSave,
  };
}
