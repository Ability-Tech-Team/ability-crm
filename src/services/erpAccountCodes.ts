import api from '@/src/lib/http';

/**
 * ERP account codes (`/definitions/erp-account-codes`), which replaced Amer
 * CRM's SAP Z codes. The client enters them by hand; nothing posts to an ERP.
 */

// ─── Types ───────────────────────────────────────────────────

export interface ErpAccountCode {
  id: number;
  code: string;
  name: string;
}

export interface CreateErpAccountCodeDto {
  code: string;
  name: string;
}

export interface UpdateErpAccountCodeDto {
  code?: string;
  name?: string;
}

export interface SearchErpAccountCodesParams {
  code?: string;
  name?: string;
}

const ENDPOINT = '/definitions/erp-account-codes';

// ─── API calls ───────────────────────────────────────────────

export async function createErpAccountCode(
  payload: CreateErpAccountCodeDto,
): Promise<void> {
  await api.post(ENDPOINT, { erp_account_codes: [payload] });
}

export async function updateErpAccountCode(
  erpAccountCodeId: number,
  payload: UpdateErpAccountCodeDto,
): Promise<void> {
  await api.post(`${ENDPOINT}/update/${erpAccountCodeId}`, payload);
}

export async function getAllErpAccountCodes(
  signal?: AbortSignal,
): Promise<ErpAccountCode[]> {
  return searchErpAccountCodes({}, signal);
}

export async function searchErpAccountCodes(
  params: SearchErpAccountCodesParams,
  signal?: AbortSignal,
): Promise<ErpAccountCode[]> {
  const { data } = await api.get<{
    result: ErpAccountCode[];
    success: boolean;
  }>(ENDPOINT, {
    params: {
      ...(params.code ? { code: params.code } : {}),
      ...(params.name ? { name: params.name } : {}),
    },
    signal,
  });
  return Array.isArray(data.result) ? data.result : [];
}

/** The option label used wherever an ERP account code is picked or shown. */
export function formatErpAccountCode(
  code: Pick<ErpAccountCode, 'code' | 'name'> | null | undefined,
): string {
  if (!code) return '';
  return [code.code, code.name].filter(Boolean).join(' - ');
}
