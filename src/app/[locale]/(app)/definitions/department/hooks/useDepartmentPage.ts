'use client';

import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import {
  createDepartment,
  deleteDepartment,
  getAllDepartments,
  searchDepartments,
  updateDepartment,
} from '@/src/services/departments';
import { buildDepartmentPayload } from '../utils';
import type { DepartmentOption, DepartmentPayload } from '../types';

export function useDepartmentPage() {
  const { refreshDropdowns } = useDropdowns();

  return useDefinitionCrudPage<DepartmentOption, DepartmentPayload>({
    getAll: getAllDepartments,
    search: searchDepartments,
    createItem: createDepartment,
    updateItem: updateDepartment,
    deleteItem: deleteDepartment,
    buildPayload: buildDepartmentPayload,
    afterMutation: refreshDropdowns,
  });
}
