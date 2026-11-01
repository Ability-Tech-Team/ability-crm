'use client';

import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import {
  createLocationType,
  deleteLocationType,
  getAllLocationTypes,
  searchLocationTypes,
  updateLocationType,
} from '@/src/services/locationTypes';
import { buildLocationTypePayload } from '../utils';
import type { LocationTypeOption, LocationTypePayload } from '../types';

export function useLocationTypePage() {
  const { refreshDropdowns } = useDropdowns();

  return useDefinitionCrudPage<LocationTypeOption, LocationTypePayload>({
    getAll: getAllLocationTypes,
    search: searchLocationTypes,
    createItem: createLocationType,
    updateItem: updateLocationType,
    deleteItem: deleteLocationType,
    buildPayload: buildLocationTypePayload,
    afterMutation: refreshDropdowns,
  });
}
