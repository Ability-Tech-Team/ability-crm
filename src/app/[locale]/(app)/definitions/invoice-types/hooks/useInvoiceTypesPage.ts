'use client';

import { useDropdowns } from '@/src/hooks/useDropdowns';
import { useDefinitionCrudPage } from '../../_shared/hooks/useDefinitionCrudPage';
import {
  createInvoiceType,
  deleteInvoiceType,
  getAllInvoiceTypes,
  searchInvoiceTypes,
  updateInvoiceType,
} from '@/src/services/invoiceTypes';
import { buildInvoiceTypePayload } from '../utils';
import type { InvoiceTypeOption, InvoiceTypePayload } from '../types';

export function useInvoiceTypesPage() {
  const { refreshDropdowns } = useDropdowns();

  return useDefinitionCrudPage<InvoiceTypeOption, InvoiceTypePayload>({
    getAll: getAllInvoiceTypes,
    search: searchInvoiceTypes,
    createItem: createInvoiceType,
    updateItem: updateInvoiceType,
    deleteItem: deleteInvoiceType,
    buildPayload: buildInvoiceTypePayload,
    afterMutation: refreshDropdowns,
  });
}
