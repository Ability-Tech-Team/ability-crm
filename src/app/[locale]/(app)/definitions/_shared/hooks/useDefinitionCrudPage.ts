'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { isNotFoundError } from '@/src/lib/apiErrors';
import { runAfterCommit } from '@/src/lib/runAfterCommit';

type SearchParams = {
  name?: string;
};

export type DefinitionStatusFilter = 'all' | 'active' | 'inactive';

type DefinitionEntity = {
  id: number;
  is_active?: number | null;
};

type SuccessMessageKeys = {
  create?: string;
  update?: string;
  delete?: string;
};


function getNextStatusValue(isActive?: number | null) {
  return Number(isActive ?? 1) === 1 ? 0 : 1;
}

type UseDefinitionCrudPageOptions<
  TEntity extends DefinitionEntity,
  TPayload extends { is_active?: number },
> = {
  getAll: (signal?: AbortSignal) => Promise<TEntity[]>;
  search: (params: SearchParams, signal?: AbortSignal) => Promise<TEntity[]>;
  createItem: (payload: TPayload) => Promise<void>;
  updateItem: (id: number, payload: Partial<TPayload>) => Promise<void>;
  /** Omit for definitions that are retired with the active toggle instead. */
  deleteItem?: (id: number) => Promise<void>;
  /** `editTarget` is the row being edited, or null when adding. */
  buildPayload: (
    values: Record<string, string>,
    editTarget: TEntity | null,
  ) => TPayload;
  afterMutation?: () => void | Promise<void>;
  successMessageKeys?: SuccessMessageKeys;
};

export function useDefinitionCrudPage<
  TEntity extends DefinitionEntity,
  TPayload extends { is_active?: number },
>({
  getAll,
  search,
  createItem,
  updateItem,
  deleteItem,
  buildPayload,
  afterMutation,
  successMessageKeys,
}: UseDefinitionCrudPageOptions<TEntity, TPayload>) {
  const createSuccessKey = successMessageKeys?.create ?? 'createSuccess';
  const updateSuccessKey = successMessageKeys?.update ?? 'updateSuccess';
  const deleteSuccessKey = successMessageKeys?.delete ?? 'deleteSuccess';
  const { success: showSuccess, error: showError } = useResponseMessage();
  const [items, setItems] = useState<TEntity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TEntity | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TEntity | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusTarget, setStatusTarget] = useState<TEntity | null>(null);
  const [nextStatusValue, setNextStatusValue] = useState<0 | 1 | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<DefinitionStatusFilter>('all');
  const [searchResults, setSearchResults] = useState<TEntity[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (signal?: AbortSignal) => {
      setIsLoading(true);
      try {
        const data = await getAll(signal);
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
    [getAll, showError],
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
    async (query: string) => {
      const trimmed = query.trim();

      if (!trimmed) {
        setSearchResults(null);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setIsSearching(true);

      try {
        const results = await search({ name: trimmed }, controller.signal);
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
    [search, showError],
  );

  const handleSearch = useCallback(async () => {
    await runSearch(searchQuery);
  }, [runSearch, searchQuery]);

  const refreshList = useCallback(async () => {
    await fetchData();

    if (searchQuery.trim()) {
      await runSearch(searchQuery);
    }
  }, [fetchData, runSearch, searchQuery]);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    setSearchResults(null);
  }, []);

  const openAddModal = useCallback(() => {
    setEditTarget(null);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback((row: TEntity) => {
    setEditTarget(row);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
  }, []);

  const requestDelete = useCallback((row: TEntity) => {
    setDeleteTarget(row);
  }, []);

  const clearDeleteTarget = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const openStatusAction = useCallback((row: TEntity) => {
    setStatusTarget(row);
    setNextStatusValue(getNextStatusValue(row.is_active));
  }, []);

  const clearStatusAction = useCallback(() => {
    setStatusTarget(null);
    setNextStatusValue(null);
  }, []);

  const handleSave = useCallback(
    async (values: Record<string, string>) => {
      setSaving(true);
      const isEditing = Boolean(editTarget);

      try {
        const payload = buildPayload(values, editTarget);
        const createPayload =
          !editTarget &&
          !Object.prototype.hasOwnProperty.call(payload, 'is_active')
            ? ({ ...payload, is_active: 1 } as TPayload)
            : payload;

        if (editTarget) {
          await updateItem(editTarget.id, payload);
        } else {
          await createItem(createPayload);
        }

        await refreshList();
        closeModal();

        if (afterMutation) {
          await afterMutation();
        }

        showSuccess(
          isEditing
            ? updateSuccessKey
            : createSuccessKey,
        );
      } catch (err) {
        showError(err);
      } finally {
        setSaving(false);
      }
    },
    [
      afterMutation,
      buildPayload,
      closeModal,
      createItem,
      editTarget,
      refreshList,
      showError,
      showSuccess,
      createSuccessKey,
      updateSuccessKey,
      updateItem,
    ],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    // Nothing to call: close the dialog rather than leaving it open with a
    // spinner that never resolves.
    if (!deleteItem) {
      clearDeleteTarget();
      return;
    }

    setIsDeleting(true);

    try {
      await deleteItem(deleteTarget.id);
      await refreshList();
      clearDeleteTarget();

      if (afterMutation) {
        await afterMutation();
      }

      showSuccess(deleteSuccessKey);
    } catch (err) {
      showError(err);
    } finally {
      setIsDeleting(false);
    }
  }, [
    afterMutation,
    clearDeleteTarget,
    deleteItem,
    deleteTarget,
    refreshList,
    showError,
    showSuccess,
    deleteSuccessKey,
  ]);

  const confirmStatusChange = useCallback(async () => {
    if (!statusTarget || nextStatusValue == null) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      await updateItem(statusTarget.id, {
        is_active: nextStatusValue,
      } as unknown as Partial<TPayload>);
      await refreshList();
      clearStatusAction();

      if (afterMutation) {
        await afterMutation();
      }

      showSuccess(updateSuccessKey);
    } catch (err) {
      showError(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [
    afterMutation,
    clearStatusAction,
    nextStatusValue,
    refreshList,
    showError,
    showSuccess,
    statusTarget,
    updateSuccessKey,
    updateItem,
  ]);

  const displayData = useMemo(() => {
    const baseData = searchResults ?? items;

    if (statusFilter === 'active') {
      return baseData.filter((item) => Number(item.is_active ?? 1) === 1);
    }

    if (statusFilter === 'inactive') {
      return baseData.filter((item) => Number(item.is_active ?? 1) !== 1);
    }

    return baseData;
  }, [items, searchResults, statusFilter]);

  return {
    items,
    displayData,
    isLoading,
    modalOpen,
    editTarget,
    saving,
    deleteTarget,
    isDeleting,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isSearching,
    handleSearch,
    handleClearSearch,
    refreshList,
    openAddModal,
    openEditModal,
    closeModal,
    requestDelete,
    clearDeleteTarget,
    statusTarget,
    nextStatusValue,
    openStatusAction,
    clearStatusAction,
    confirmStatusChange,
    isUpdatingStatus,
    handleSave,
    confirmDelete,
  };
}
