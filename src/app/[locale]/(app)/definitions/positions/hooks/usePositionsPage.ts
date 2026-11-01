'use client';

import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import {
  createPosition,
  deletePosition,
  getAllPositions,
  searchPositions,
  updatePosition,
} from '@/src/services/positions';
import { buildPositionPayload } from '../utils';
import type { PositionOption, PositionPayload } from '../types';

export function usePositionsPage() {
  const { refreshDropdowns } = useDropdowns();

  return useDefinitionCrudPage<PositionOption, PositionPayload>({
    getAll: getAllPositions,
    search: searchPositions,
    createItem: createPosition,
    updateItem: updatePosition,
    deleteItem: deletePosition,
    buildPayload: buildPositionPayload,
    afterMutation: refreshDropdowns,
  });
}
