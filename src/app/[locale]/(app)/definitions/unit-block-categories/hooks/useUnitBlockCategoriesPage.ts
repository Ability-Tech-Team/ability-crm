'use client';

import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import {
  createUnitBlockCategory,
  getAllUnitBlockCategories,
  searchUnitBlockCategories,
  updateUnitBlockCategory,
} from '@/src/services/unitBlockCategories';
import { buildUnitBlockCategoryPayload } from '../utils';
import type {
  UnitBlockCategoryOption,
  UnitBlockCategoryPayload,
} from '../types';

export function useUnitBlockCategoriesPage() {
  const { refreshDropdowns } = useDropdowns();

  return useDefinitionCrudPage<
    UnitBlockCategoryOption,
    UnitBlockCategoryPayload
  >({
    getAll: getAllUnitBlockCategories,
    search: searchUnitBlockCategories,
    createItem: createUnitBlockCategory,
    updateItem: updateUnitBlockCategory,
    buildPayload: buildUnitBlockCategoryPayload,
    afterMutation: refreshDropdowns,
  });
}
