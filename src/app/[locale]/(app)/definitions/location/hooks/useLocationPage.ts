'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import {
  createLocation,
  deleteLocation,
  getAllLocations,
  searchLocations,
  updateLocation,
} from '@/src/services/locations';
import { getAllLocationTypes } from '@/src/services/locationTypes';
import type { LocationDropdownOption } from '@/src/types/dropdowns';
import { buildLocationPayload, flattenLocationRows } from '../utils';
import type { FlatLocationRow, LocationTypeSelectOption } from '../types';
import { isNotFoundError } from '@/src/lib/apiErrors';
import { runAfterCommit } from '@/src/lib/runAfterCommit';


export function useLocationPage() {
  const { refreshDropdowns } = useDropdowns();
  const { success: showSuccess, error: showError } = useResponseMessage();
  const [locations, setLocations] = useState<LocationDropdownOption[]>([]);
  const [locationTypeOptions, setLocationTypeOptions] = useState<
    LocationTypeSelectOption[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<LocationDropdownOption | null>(
    null,
  );
  const [parentForNew, setParentForNew] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] =
    useState<LocationDropdownOption | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusTarget, setStatusTarget] =
    useState<LocationDropdownOption | null>(null);
  const [nextStatusValue, setNextStatusValue] = useState<0 | 1 | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [searchResults, setSearchResults] = useState<
    LocationDropdownOption[] | null
  >(null);
  const [isSearching, setIsSearching] = useState(false);
  const searchAbortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [locationsData, locationTypesData] = await Promise.all([
        getAllLocations(),
        getAllLocationTypes(),
      ]);

      setLocations(locationsData as LocationDropdownOption[]);
      setLocationTypeOptions(
        locationTypesData.map((item) => ({
          value: String(item.id),
          label: item.name,
        })),
      );
    } catch (err) {
      if (isNotFoundError(err)) {
        setLocations([]);
        setLocationTypeOptions([]);
      } else {
        showError(err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  useEffect(() => {
    const cancel = runAfterCommit(() => {
      void fetchData();
    });

    return () => {
      cancel();
      searchAbortRef.current?.abort();
    };
  }, [fetchData]);

  const runSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim();

      if (!trimmed) {
        setSearchResults(null);
        return;
      }

      searchAbortRef.current?.abort();
      const controller = new AbortController();
      searchAbortRef.current = controller;
      setIsSearching(true);

      try {
        const results = await searchLocations(
          { name: trimmed },
          controller.signal,
        );
        setSearchResults(results as LocationDropdownOption[]);
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

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const openAddRootModal = useCallback(() => {
    setEditTarget(null);
    setParentForNew(null);
    setModalOpen(true);
  }, []);

  const openAddChildModal = useCallback((parentId: number) => {
    setEditTarget(null);
    setParentForNew(parentId);
    setModalOpen(true);
  }, []);

  const openEditModal = useCallback(
    (row: LocationDropdownOption, parentId: number | null) => {
      setEditTarget(row);
      setParentForNew(parentId);
      setModalOpen(true);
    },
    [],
  );

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditTarget(null);
    setParentForNew(null);
  }, []);

  const requestDelete = useCallback((row: LocationDropdownOption) => {
    setDeleteTarget(row);
  }, []);

  const clearDeleteTarget = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const openStatusAction = useCallback((row: LocationDropdownOption) => {
    setStatusTarget(row);
    setNextStatusValue(Number(row.is_active ?? 1) === 1 ? 0 : 1);
  }, []);

  const clearStatusAction = useCallback(() => {
    setStatusTarget(null);
    setNextStatusValue(null);
  }, []);

  const handleSave = useCallback(
    async (values: Record<string, string>) => {
      setSaving(true);

      try {
        const payload = buildLocationPayload(values);

        if (editTarget) {
          await updateLocation(editTarget.id, {
            ...payload,
            ...(editTarget.parent_location_id != null
              ? { parent_location_id: editTarget.parent_location_id }
              : {}),
          });
        } else {
          await createLocation({
            ...payload,
            is_active: payload.is_active ?? 1,
            ...(parentForNew != null
              ? { parent_location_id: parentForNew }
              : {}),
          });
        }

        await refreshList();
        closeModal();
        refreshDropdowns();
        showSuccess(editTarget ? 'updateSuccess' : 'createSuccess');
      } catch (err) {
        showError(err);
      } finally {
        setSaving(false);
      }
    },
    [
      closeModal,
      editTarget,
      parentForNew,
      refreshDropdowns,
      refreshList,
      showError,
      showSuccess,
    ],
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) {
      return;
    }

    setIsDeleting(true);

    try {
      await deleteLocation(deleteTarget.id);
      await refreshList();
      clearDeleteTarget();
      refreshDropdowns();
      showSuccess('deleteSuccess');
    } catch (err) {
      showError(err);
    } finally {
      setIsDeleting(false);
    }
  }, [
    clearDeleteTarget,
    deleteTarget,
    refreshDropdowns,
    refreshList,
    showError,
    showSuccess,
  ]);

  const confirmStatusChange = useCallback(async () => {
    if (!statusTarget || nextStatusValue == null) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      await updateLocation(statusTarget.id, {
        ...(statusTarget.parent_location_id != null
          ? { parent_location_id: statusTarget.parent_location_id }
          : {}),
        is_active: nextStatusValue,
      });
      await refreshList();
      clearStatusAction();
      refreshDropdowns();
      showSuccess('updateSuccess');
    } catch (err) {
      showError(err);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [
    clearStatusAction,
    nextStatusValue,
    refreshDropdowns,
    refreshList,
    showError,
    showSuccess,
    statusTarget,
  ]);

  const displayData = useMemo(() => {
    const baseData = searchResults ?? locations;

    if (statusFilter === 'all') {
      return baseData;
    }

    const shouldInclude = (isActive?: number | null) => {
      const isEnabled = Number(isActive ?? 1) === 1;
      return statusFilter === 'active' ? isEnabled : !isEnabled;
    };

    return baseData.reduce<LocationDropdownOption[]>((accumulator, root) => {
      const filteredChildren = (root.children ?? []).filter((child) =>
        shouldInclude(child.is_active),
      );

      if (shouldInclude(root.is_active) || filteredChildren.length > 0) {
        accumulator.push({
          ...root,
          children: filteredChildren,
        });
      }

      return accumulator;
    }, []);
  }, [locations, searchResults, statusFilter]);

  const flattenedData = useMemo<FlatLocationRow[]>(
    () => flattenLocationRows(displayData, expanded),
    [displayData, expanded],
  );

  return {
    locationTypeOptions,
    isLoading,
    expanded,
    toggleExpand,
    modalOpen,
    editTarget,
    parentForNew,
    saving,
    deleteTarget,
    isDeleting,
    statusTarget,
    nextStatusValue,
    isUpdatingStatus,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isSearching,
    handleSearch,
    handleClearSearch,
    flattenedData,
    openAddRootModal,
    openAddChildModal,
    openEditModal,
    closeModal,
    requestDelete,
    clearDeleteTarget,
    openStatusAction,
    clearStatusAction,
    handleSave,
    confirmDelete,
    confirmStatusChange,
  };
}
