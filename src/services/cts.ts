import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CtsDateField {
  dateTime: string;
  date: string;
  time: string;
}

type CtsDate = string | CtsDateField | undefined;

export interface CtsRecord {
  id: number;
  unit_number: string;
  /** Returned since the SAP removal. */
  customer_id?: number | null;
  customer_code: string;
  customer_name?: string;
  customer_mobile?: string;
  annual_fees: number;
  notes?: string;
  collected_amount?: number;
  hotbird_receiving_date?: CtsDate;
  contracts_status?: string;
  ip_phone_activation_date?: CtsDate;
  ip_phone_status?: string;
  ip_tv_activation_date?: CtsDate;
  ip_tv_annual_fees?: number;
  ip_tv_annual_fees_status?: string;
  ip_tv_mac_address?: string;
  ip_tv_miss_payment?: string;
  ip_tv_multipoint?: string;
  ip_tv_package?: string;
  ip_tv_status?: string;
  internet_activation_date?: CtsDate;
  internet_annual_fees?: number;
  internet_annual_fees_status?: string;
  internet_status?: string;
  ip_phone_mac?: string;
  mobile?: string;
  nilesat_receiving_date?: CtsDate;
  old?: string;
  receiver?: string;
  receiving_dorm_status?: string;
  sma_tv_additional_point?: string;
  sma_tv_annual_fees_status?: string;
  sma_tv_contract_value?: number;
  sma_tv_contract_date?: CtsDate;
  sma_tv_extra?: string;
  sma_tv_multipoint?: string;
  sma_tv_multi_point_receiving_date?: CtsDate;
  sma_tv_payment_status?: string;
  sma_tv_receiving_date?: CtsDate;
  update_status?: string;
  iphone_internet_fees?: string;
  project_id?: number;
}

interface GetCtsRaw {
  result?: {
    totalCount?: number;
    cts?: CtsRecord[];
  } | null;
  success: boolean;
}

export interface GetCtsResponse {
  records: CtsRecord[];
  totalCount: number;
}

export interface GetCtsParams {
  cts_id?: number;
  unit_number?: string;
  unit_id?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getCtsRecords(
  params: GetCtsParams = {},
  signal?: AbortSignal,
): Promise<GetCtsResponse> {
  const response = await api.get<GetCtsRaw>('/orders/cts', {
    params: {
      ...(params.cts_id ? { cts_id: params.cts_id } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const records = Array.isArray(response.data?.result?.cts)
    ? response.data.result.cts
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : records.length;

  return { records, totalCount };
}

// ─── Create CTS ──────────────────────────────────────────────

export interface CreateCtsDto {
  unit_number: string;
  unit_id: number;
  /** Required since the SAP removal; `customer_code` is optional. */
  customer_id: number;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  annual_fees: number;
  notes?: string;
  collected_amount?: number;
  hotbird_receiving_date?: string;
  contracts_status?: string;
  ip_phone_activation_date?: string;
  ip_phone_status?: string;
  ip_tv_activation_date?: string;
  ip_tv_annual_fees?: number;
  ip_tv_annual_fees_status?: string;
  ip_tv_mac_address?: string;
  ip_tv_miss_payment?: string;
  ip_tv_multipoint?: string;
  ip_tv_package?: string;
  ip_tv_status?: string;
  internet_activation_date?: string;
  internet_annual_fees?: number;
  internet_annual_fees_status?: string;
  internet_status?: string;
  ip_phone_mac?: string;
  mobile?: string;
  nilesat_receiving_date?: string;
  old?: string;
  receiver?: string;
  receiving_dorm_status?: string;
  sma_tv_additional_point?: string;
  sma_tv_annual_fees_status?: string;
  sma_tv_contract_value?: number;
  sma_tv_contract_date?: string;
  sma_tv_extra?: string;
  sma_tv_multipoint?: string;
  sma_tv_multi_point_receiving_date?: string;
  sma_tv_payment_status?: string;
  sma_tv_receiving_date?: string;
  update_status?: string;
  iphone_internet_fees?: string;
  project_id?: number;
}

export async function createCts(
  payload: CreateCtsDto,
): Promise<{ success: boolean }> {
  const response = await api.post('/orders/cts', payload);
  return response.data;
}

export type UpdateCtsDto = Partial<
  Omit<
    CreateCtsDto,
    | 'unit_number'
    | 'customer_id'
    | 'customer_code'
    | 'customer_name'
    | 'customer_mobile'
  >
>;

export async function getCtsById(
  ctsId: number,
  signal?: AbortSignal,
): Promise<CtsRecord | null> {
  const data = await getCtsRecords(
    { cts_id: ctsId, page: 1, limit: 1 },
    signal,
  );
  return (
    data.records.find((record) => record.id === ctsId) ??
    data.records[0] ??
    null
  );
}

// ─── Update CTS ──────────────────────────────────────────────

export async function updateCts(
  ctsId: number,
  payload: UpdateCtsDto,
): Promise<{ success: boolean }> {
  const response = await api.post(`/orders/cts/${ctsId}/update`, payload);
  return response.data;
}
