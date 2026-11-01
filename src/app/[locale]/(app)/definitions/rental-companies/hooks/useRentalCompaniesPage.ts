'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { RentalCompanyFormValues } from '@/src/components/RentalCompanyEntryModal';
import {
  createRentalCompany,
  getAllRentalCompanies,
  searchRentalCompanies,
  updateRentalCompany,
  type RentalCompany,
  type RentalCompanyAttachment,
} from '@/src/services/rentalCompanies';
import {
  deleteUnitMedia,
  updateUnitMedia,
} from '@/src/services/documentLibrary';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { getNextRentalCompanyStatus } from '../utils';
import type { RentalCompanyStatusValue } from '../types';
import { isNotFoundError } from '@/src/lib/apiErrors';
import { runAfterCommit } from '@/src/lib/runAfterCommit';


export function useRentalCompaniesPage() {
  const { success: showSuccess, error: showError } = useResponseMessage();
  const { refreshDropdowns } = useDropdowns();
  const [rentalCompanies, setRentalCompanies] = useState<RentalCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  // The open viewer's company id; the company itself is looked up in the
  // latest data, so a refresh updates or closes the viewer.
  const [viewerTargetId, setViewerTargetId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [isUpdatingAttachment, setIsUpdatingAttachment] = useState(false);
  const [statusTarget, setStatusTarget] = useState<RentalCompany | null>(null);
  const [nextStatusValue, setNextStatusValue] =
    useState<RentalCompanyStatusValue>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive'
  >('all');
  const [searchResults, setSearchResults] = useState<RentalCompany[] | null>(
    null,
  );
  const [isSearching, setIsSearching] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);

    try {
      const data = await getAllRentalCompanies();
      setRentalCompanies(data);
    } catch (err) {
      if (isNotFoundError(err)) {
        setRentalCompanies([]);
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
        const results = await searchRentalCompanies(
          { name: trimmed },
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
    setModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setModalOpen(false);
  }, []);

  const handleSave = useCallback(
    async (values: RentalCompanyFormValues) => {
      setSaving(true);

      try {
        await createRentalCompany({
          en_name: values.en_name,
          ar_name: values.ar_name,
          commercial_register: values.commercial_register,
          tax_register: values.tax_register,
          ...(values.description ? { description: values.description } : {}),
          files: values.files,
        });

        await refreshList();
        await refreshDropdowns();
        closeAddModal();
        showSuccess('createSuccess');
      } catch (err) {
        showError(err);
      } finally {
        setSaving(false);
      }
    },
    [closeAddModal, refreshDropdowns, refreshList, showError, showSuccess],
  );

  const openViewer = useCallback((company: RentalCompany) => {
    setViewerTargetId(company.id);
  }, []);

  const closeViewer = useCallback(() => {
    setViewerTargetId(null);
  }, []);

  const viewerTarget = useMemo(
    () =>
      viewerTargetId === null
        ? null
        : ((searchResults ?? rentalCompanies).find(
            (company) => company.id === viewerTargetId,
          ) ?? null),
    [viewerTargetId, searchResults, rentalCompanies],
  );

  const handleEditAttachment = useCallback(
    async (attachment: RentalCompanyAttachment, file: File) => {
      setIsUpdatingAttachment(true);

      try {
        await updateUnitMedia(attachment.id, { file });
        await refreshList();
        showSuccess('updateSuccess');
      } catch (err) {
        showError(err);
      } finally {
        setIsUpdatingAttachment(false);
      }
    },
    [refreshList, showError, showSuccess],
  );

  const handleDeleteAttachment = useCallback(
    async (attachment: RentalCompanyAttachment) => {
      setIsUpdatingAttachment(true);

      try {
        await deleteUnitMedia(attachment.id);
        await refreshList();
        showSuccess('updateSuccess');
      } catch (err) {
        showError(err);
      } finally {
        setIsUpdatingAttachment(false);
      }
    },
    [refreshList, showError, showSuccess],
  );

  const openStatusAction = useCallback((company: RentalCompany) => {
    setStatusTarget(company);
    setNextStatusValue(getNextRentalCompanyStatus(company));
  }, []);

  const clearStatusAction = useCallback(() => {
    setStatusTarget(null);
    setNextStatusValue(null);
  }, []);

  const confirmStatusChange = useCallback(async () => {
    if (!statusTarget || nextStatusValue == null) {
      return;
    }

    setIsUpdatingStatus(true);

    try {
      await updateRentalCompany(statusTarget.id, {
        is_active: nextStatusValue,
      });
      await refreshList();
      await refreshDropdowns();
      clearStatusAction();
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
    const baseData = searchResults ?? rentalCompanies;

    if (statusFilter === 'active') {
      return baseData.filter((company) => Number(company.is_active ?? 1) === 1);
    }

    if (statusFilter === 'inactive') {
      return baseData.filter((company) => Number(company.is_active ?? 1) !== 1);
    }

    return baseData;
  }, [rentalCompanies, searchResults, statusFilter]);

  return {
    displayData,
    isLoading,
    modalOpen,
    closeAddModal,
    openAddModal,
    viewerTarget,
    openViewer,
    closeViewer,
    handleEditAttachment,
    handleDeleteAttachment,
    isUpdatingAttachment,
    saving,
    handleSave,
    statusTarget,
    nextStatusValue,
    openStatusAction,
    clearStatusAction,
    confirmStatusChange,
    isUpdatingStatus,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    isSearching,
    handleSearch,
    handleClearSearch,
  };
}
