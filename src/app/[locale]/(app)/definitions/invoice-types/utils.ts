import type { InvoiceTypeOption, InvoiceTypePayload } from './types';

/**
 * The ERP account code is optional: it is sent when chosen, and sent as
 * `null` only to remove one the invoice type had.
 */
export function buildInvoiceTypePayload(
  values: Record<string, string>,
  editTarget: InvoiceTypeOption | null = null,
): InvoiceTypePayload {
  const description = values.description?.trim();
  const erpAccountCodeId = values.erp_account_code_id
    ? Number(values.erp_account_code_id)
    : editTarget?.erp_account_code_id
      ? null
      : undefined;

  return {
    en_name: values.en_name,
    ar_name: values.ar_name,
    ...(description
      ? {
          en_description: description,
          ar_description: description,
        }
      : {}),
    is_active: Number(values.is_active || '1'),
    is_rental: Number(values.is_rental || '0'),
    ...(erpAccountCodeId !== undefined
      ? { erp_account_code_id: erpAccountCodeId }
      : {}),
  };
}

export function getInvoiceTypeInitialValues(
  editTarget: InvoiceTypeOption | null,
): Record<string, string> {
  if (!editTarget) {
    return {
      en_name: '',
      ar_name: '',
      description: '',
      is_active: '1',
      is_rental: '0',
      erp_account_code_id: '',
    };
  }

  return {
    en_name: editTarget.en_name ?? editTarget.name,
    ar_name: editTarget.ar_name ?? editTarget.name,
    description:
      editTarget.description ??
      editTarget.en_description ??
      editTarget.ar_description ??
      '',
    is_active: String(editTarget.is_active ?? 1),
    is_rental: String(editTarget.is_rental ?? 0),
    erp_account_code_id: editTarget.erp_account_code_id
      ? String(editTarget.erp_account_code_id)
      : '',
  };
}
