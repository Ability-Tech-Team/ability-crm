import type { DropdownOption } from '@/src/types/dropdowns';
import type { ErpAccountCodeSummary } from '@/src/services/invoiceTypes';

export type InvoiceTypeOption = DropdownOption & {
  description?: string;
  en_description?: string;
  ar_description?: string;
  is_active?: number | null;
  is_rental?: number | null;
  erp_account_code_id?: number | null;
  erp_account_codes?: ErpAccountCodeSummary | null;
};

export type InvoiceTypePayload = {
  en_name: string;
  ar_name: string;
  en_description?: string;
  ar_description?: string;
  is_active: number;
  is_rental?: number;
  erp_account_code_id?: number | null;
};
