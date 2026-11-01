'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { useRouter } from '@/src/i18n/navigation';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useRoutePrivileges } from '@/src/hooks/useCurrentUserPrivileges';
import { useResponseMessage } from '@/src/hooks/useResponseMessage';
import { PRIVILEGE_IDS } from '@/src/lib/currentUserPrivileges';
import { getUnits, type Unit } from '@/src/services/units';
import type { UnitSearchFormData } from '../types';
import { buildUnitSearchParams } from '../utils';

export function useUnitBlocksAddPage() {
  const { data: dropdowns } = useDropdowns();
  const router = useRouter();
  const { error: showError } = useResponseMessage();

  const privileges = useRoutePrivileges('/unit-blocks/add');
  const canAdd = privileges.hasPrivilege(PRIVILEGE_IDS.ADD);

  const [units, setUnits] = useState<Unit[]>([]);
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
    async (params: UnitSearchFormData) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setHasSearched(true);

      try {
        const data = await getUnits(
          buildUnitSearchParams(params),
          controller.signal,
        );
        setUnits(data.units);
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
    await fetchUnits(data);
  };

  const handleReset = () => {
    abortRef.current?.abort();
    setUnits([]);
    setHasSearched(false);
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
    isLoading,
    hasSearched,
    rentalCompanyMap,
    handleSubmit,
    handleReset,
    openUnit,
  };
}
