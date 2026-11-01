'use client';

import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import {
  createSisterCompany,
  deleteSisterCompany,
  getAllSisterCompanies,
  searchSisterCompanies,
  updateSisterCompany,
} from '@/src/services/sisterCompanies';
import { buildSisterCompanyPayload } from '../utils';
import type { SisterCompanyOption, SisterCompanyPayload } from '../types';

export function useSisterCompaniesPage() {
  const { refreshDropdowns } = useDropdowns();

  return useDefinitionCrudPage<SisterCompanyOption, SisterCompanyPayload>({
    getAll: getAllSisterCompanies,
    search: searchSisterCompanies,
    createItem: createSisterCompany,
    updateItem: updateSisterCompany,
    deleteItem: deleteSisterCompany,
    buildPayload: buildSisterCompanyPayload,
    afterMutation: refreshDropdowns,
  });
}
