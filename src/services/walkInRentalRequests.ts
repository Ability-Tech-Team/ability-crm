import api from '@/src/lib/http';

export interface WalkInRentalRequest {
  id: number;
  unit_number: string;
  unit_id?: number;
  customer_name?: string;
  tenant_name?: string;
  id_type?: number;
  id_type_name?: string;
  id_number: string;
  mobile_number: string;
  email?: string;
  project_id: number;
  project_name: string;
  rental_company_id: number;
  rental_company_name: string;
  is_male?: number;
  start_date: string;
  end_date: string;
  total_tenant_count: number;
  access_card_number: string | null;
  notes?: string | null;
  source_id?: number;
  source_name?: string;
  created_at?: string;
  updated_at?: string;
  rental_status_id?: number;
  rental_status_name?: string;
  reject_reason?: string | null;
  delegate_id?: number;
  delegate_name?: string;
  relative_to?: string | null;
  relative_relation?: string | null;
  message?: string;
  tenant_files?: string[];
  tenant_car_file_names?: string[][];
  relative_file_names?: string[][];
  request_id?: number;
  media?: Array<{
    id: string;
    request_id: number;
    file_name: string;
    file_path: string;
    description: string | null;
    id_number: string;
    customer_name: string;
    created_at: string;
  }>;
  relatives?: Array<{
    id: number;
    customer_name: string;
    id_type?: number;
    id_number: string;
    mobile_number: string;
    email: string;
    is_male?: number;
    notes?: string | null;
    relative_relation: string;
    relative_to: number;
    cars: Array<{
      make: string;
      model: string;
      plate_text: string;
      plate_number: number;
    }>;
    assignment?: {
      id: number;
      start_date: string;
      end_date: string;
      rental_status_id: number;
      rental_status_name: string;
      source_id: number;
      source_name: string;
    };
  }>;
  cars?: Array<{
    make: string;
    model: string;
    plate_text: string;
    plate_number: number;
  }>;
}

export interface SearchWalkInRequestsParams {
  id?: number;
  unit_number?: string;
  unit_id?: number;
  customer_name?: string;
  id_number?: string;
  project_id?: number;
  rental_status?: number;
  source?: number;
  delegate_id?: number;
  delegate_national_id?: string;
  page?: number;
  limit?: number;
}

export interface SearchWalkInRequestsResponse {
  requests: WalkInRentalRequest[];
  totalCount: number;
}

export interface UpdateWalkInRelativePayload {
  id?: number;
  is_deleted?: number;
  customer_name?: string;
  id_type?: number;
  id_number?: string;
  mobile_number?: string;
  email?: string;
  notes?: string;
  is_male?: number;
  relative_relation?: string;
}

function normalizeSearchParams(
  params: SearchWalkInRequestsParams,
): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  if (Number.isFinite(params.id) && params.id! > 0) {
    normalized.id = params.id;
  }
  if (params.unit_number?.trim()) {
    normalized.unit_number = params.unit_number.trim();
  }
  if (Number.isFinite(params.unit_id) && params.unit_id! > 0) {
    normalized.unit_id = params.unit_id;
  }
  if (params.customer_name?.trim()) {
    normalized.customer_name = params.customer_name.trim();
  }
  if (params.id_number?.trim()) {
    normalized.id_number = params.id_number.trim();
  }
  if (Number.isFinite(params.project_id) && params.project_id! > 0) {
    normalized.project_id = params.project_id;
  }
  if (Number.isFinite(params.rental_status) && params.rental_status! > 0) {
    normalized.rental_status = params.rental_status;
  }
  if (Number.isFinite(params.source) && params.source! > 0) {
    normalized.source = params.source;
  }
  if (Number.isFinite(params.delegate_id) && params.delegate_id! > 0) {
    normalized.delegate_id = params.delegate_id;
  }
  if (params.delegate_national_id?.trim()) {
    normalized.delegate_national_id = params.delegate_national_id.trim();
  }
  if (Number.isFinite(params.page) && params.page! > 0) {
    normalized.page = params.page;
  }
  if (Number.isFinite(params.limit) && params.limit! > 0) {
    normalized.limit = params.limit;
  }

  return normalized;
}

function normalizeWalkInRentalRequest(
  request: WalkInRentalRequest,
): WalkInRentalRequest {
  return {
    ...request,
    customer_name: request.customer_name ?? request.tenant_name,
  };
}

export async function searchWalkInRentalRequests(
  params: SearchWalkInRequestsParams,
): Promise<SearchWalkInRequestsResponse> {
  const normalizedParams = normalizeSearchParams(params);

  const response = await api.get<{
    data?: WalkInRentalRequest[];
    result?: {
      data?: WalkInRentalRequest[];
      requests?: WalkInRentalRequest[];
      reservations?: WalkInRentalRequest[];
      total_count?: number;
      total?: number;
    };
    total?: number;
    totalCount?: number;
  }>('/rentals/walk-in-requests', {
    params: normalizedParams,
  });

  const requests =
    response.data.data ||
    response.data.result?.data ||
    response.data.result?.requests ||
    response.data.result?.reservations ||
    [];

  const totalCount =
    response.data.result?.total_count ??
    response.data.totalCount ??
    response.data.result?.total ??
    response.data.total ??
    0;

  return {
    requests: requests.map(normalizeWalkInRentalRequest),
    totalCount,
  };
}

export async function getWalkInRentalRequestById(
  id: number | string,
): Promise<WalkInRentalRequest | null> {
  try {
    const response = await api.get<{
      data?: WalkInRentalRequest;
      result?: {
        data?: WalkInRentalRequest;
        reservation?: Omit<
          WalkInRentalRequest,
          | 'customer_name'
          | 'id_number'
          | 'mobile_number'
          | 'email'
          | 'is_male'
          | 'cars'
          | 'media'
          | 'relatives'
        >;
        tenant?: {
          id: number;
          customer_name: string;
          id_type: { id: number; name: string };
          id_number: string;
          mobile_number: string;
          email: string;
          is_male: number;
          notes: string | null;
          cars: Array<{
            make: string;
            model: string;
            plate_text: string;
            plate_number: number;
          }>;
        };
        relatives: Array<{
          id: number;
          customer_name: string;
          id_type: { id: number; name: string };
          id_number: string;
          mobile_number: string;
          email: string;
          relative_relation: string;
          relative_to: number;
          cars: Array<{
            make: string;
            model: string;
            plate_text: string;
            plate_number: number;
          }>;
          assignment?: {
            id: number;
            start_date: string;
            end_date: string;
            rental_status_id: number;
            rental_status_name: string;
            source_id: number;
            source_name: string;
          };
          source?: { id: number; name: string };
        }>;
        media: Array<{
          id: string;
          request_id: number;
          file_name: string;
          file_path: string;
          description: string | null;
          id_number: string;
          customer_name: string;
          created_at: string;
        }>;
      };
    }>(`/rentals/walk-in-requests/${id}`);

    // Try new response format first (result.reservation + tenant + relatives + media)
    if (response.data.result?.reservation && response.data.result?.tenant) {
      const reservation = response.data.result.reservation;
      const tenant = response.data.result.tenant;
      const relatives = response.data.result.relatives || [];
      const media = response.data.result.media || [];

      return {
        ...reservation,
        customer_name: tenant.customer_name,
        id_type: tenant.id_type?.id,
        id_type_name: tenant.id_type?.name,
        id_number: tenant.id_number,
        mobile_number: tenant.mobile_number,
        email: tenant.email,
        is_male: tenant.is_male,
        cars: tenant.cars,
        relatives: relatives.map((rel) => ({
          ...rel,
          id_type:
            typeof (rel.id_type as unknown) === 'object' && rel.id_type !== null
              ? (rel.id_type as unknown as { id: number }).id
              : rel.id_type,
        })),
        media,
      } as WalkInRentalRequest;
    }

    // Fallback to old response format
    return response.data.data ?? response.data.result?.data ?? null;
  } catch (error) {
    const statusCode = (error as { response?: { status?: number } }).response
      ?.status;
    if (statusCode === 404) {
      return null;
    }
    throw error;
  }
}

export async function acceptWalkInRentalRequest(
  id: number | string,
  reason?: string,
): Promise<WalkInRentalRequest> {
  const body = reason ? { reason } : {};

  const response = await api.post<{
    data?: WalkInRentalRequest;
    result?: {
      data?: WalkInRentalRequest;
    };
  }>(`/rentals/walk-in-requests/${id}/accept`, body);

  return (
    response.data.data ??
    response.data.result?.data ??
    ({} as WalkInRentalRequest)
  );
}

export async function rejectWalkInRentalRequest(
  id: number | string,
  reason?: string,
): Promise<WalkInRentalRequest> {
  const body = reason ? { reason } : {};

  const response = await api.post<{
    data?: WalkInRentalRequest;
    result?: {
      data?: WalkInRentalRequest;
    };
  }>(`/rentals/walk-in-requests/${id}/reject`, body);

  return (
    response.data.data ??
    response.data.result?.data ??
    ({} as WalkInRentalRequest)
  );
}

