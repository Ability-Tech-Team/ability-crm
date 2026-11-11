import api from '@/src/lib/http';
import type { ErpAccountCode } from '@/src/services/erpAccountCodes';

export type ErpAccountCodeSummary = Pick<ErpAccountCode, 'id' | 'code' | 'name'>;

// ─── Types ───────────────────────────────────────────────────

export interface CreateInvoiceTypeDto {
  en_name: string;
  ar_name: string;
  en_description?: string;
  ar_description?: string;
  project_id?: number;
  is_active: number;
  is_rental?: number;
  is_deleted?: number;
  /** Optional since the SAP removal. */
  erp_account_code_id?: number | null;
}

export interface UpdateInvoiceTypeDto {
  en_name?: string;
  ar_name?: string;
  en_description?: string;
  ar_description?: string;
  project_id?: number;
  is_active?: number;
  is_rental?: number;
  is_deleted?: number;
  /** `null` removes the code. */
  erp_account_code_id?: number | null;
}

// ─── API calls ───────────────────────────────────────────────

export async function createInvoiceType(
  payload: CreateInvoiceTypeDto,
): Promise<void> {
  await api.post('/definitions/invoice-types', {
    invoice_types: [payload],
  });
}

export async function updateInvoiceType(
  id: number,
  payload: UpdateInvoiceTypeDto,
): Promise<void> {
  await api.post(`/definitions/invoice-types/update/${id}`, payload);
}

export async function deleteInvoiceType(id: number): Promise<void> {
  await api.post(`/definitions/invoice-types/update/${id}`, {
    is_deleted: 1,
  });
}

export async function getAllInvoiceTypes(signal?: AbortSignal) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      en_description?: string;
      ar_description?: string;
      is_active?: number | null;
      is_rental?: number | null;
      erp_account_code_id?: number | null;
      erp_account_codes?: ErpAccountCodeSummary | null;
    }>;
    success: boolean;
  }>('/definitions/search/invoice-types', { signal });
  return Array.isArray(data.result) ? data.result : [];
}

export async function searchInvoiceTypes(
  params: { name?: string },
  signal?: AbortSignal,
) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      en_description?: string;
      ar_description?: string;
      is_active?: number | null;
      is_rental?: number | null;
      erp_account_code_id?: number | null;
      erp_account_codes?: ErpAccountCodeSummary | null;
    }>;
    success: boolean;
  }>('/definitions/search/invoice-types', { params, signal });
  return Array.isArray(data.result) ? data.result : [];
}
