'use client';

import { useMemo } from 'react';
import type { SelectOption } from '@/src/components/ui/Select';
import { useDropdowns } from '@/src/hooks/useDropdowns';
import type { RentalCompanyValue } from '../types';

type TranslateFn = (key: string) => string;

type UseCreateRentalOptionsArgs = {
  defaultRentalCompany: RentalCompanyValue;
  t: TranslateFn;
};

export function useCreateRentalOptions({
  defaultRentalCompany,
  t,
}: UseCreateRentalOptionsArgs) {
  const { data: dropdowns } = useDropdowns();

  const genderOptions = useMemo<SelectOption[]>(() => {
    const options = (dropdowns?.gender ?? []).map((item) => ({
      value: String(item.id),
      label: item.name,
    }));

    if (options.length > 0) {
      return options;
    }

    return [
      { value: '1', label: t('create.genderOptions.male') },
      { value: '0', label: t('create.genderOptions.female') },
    ];
  }, [dropdowns, t]);

  const rentalCompanyOptions = useMemo<SelectOption[]>(() => {
    const options = (dropdowns?.rental_companies ?? []).map((item) => ({
      value: String(item.id),
      label: item.name,
    }));

    if (
      defaultRentalCompany.id != null &&
      defaultRentalCompany.name &&
      !options.some(
        (option) => option.value === String(defaultRentalCompany.id),
      )
    ) {
      return [
        {
          value: String(defaultRentalCompany.id),
          label: defaultRentalCompany.name,
        },
        ...options,
      ];
    }

    return options;
  }, [defaultRentalCompany.id, defaultRentalCompany.name, dropdowns]);

  const idTypeOptions = useMemo<SelectOption[]>(() => {
    const options = (dropdowns?.id_types ?? []).map((item) => ({
      value: String(item.id),
      label: item.name,
    }));

    if (options.length > 0) {
      return options;
    }

    return [
      { value: '1', label: t('create.idTypes.nationalId') },
      { value: '2', label: t('create.idTypes.passport') },
    ];
  }, [dropdowns, t]);

  return {
    genderOptions,
    rentalCompanyOptions,
    idTypeOptions,
  };
}
