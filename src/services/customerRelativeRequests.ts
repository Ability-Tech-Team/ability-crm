import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface OwnerRelativeRequestPayload {
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  project?: number | string | null;
  owner_id?: string | number | null;
  relation?: string | null;
  last_name?: string | null;
  unit_code?: string | null;
  first_name?: string | null;
  profile_image?: string | null;
  identification_type?: string | null;
  identification_value?: string | null;
  identification_images?: string[] | null;
  [key: string]: unknown;
}

export interface OwnerRelativeRequestStatus {
  id: number;
  name: string;
  en_name?: string | null;
  ar_name?: string | null;
}

export interface OwnerRelativeRequestOwner {
  id: number;
  customer_name: string | null;
  customer_code: string | null;
  id_number: string | null;
}

export interface OwnerRelativeRequestUnit {
  id: number;
  unit_number: string | null;
}

export interface OwnerRelativeRequest {
  id: number;
  unit_id: number | null;
  unit_number: string | null;
  project_id: number | null;
  owner_id: number | null;
  relative_identification_id: string | null;
  payload: OwnerRelativeRequestPayload | null;
  request_status_id: number | null;
  /** Request source (`request_from_id`); replaced `from_app`. */
  request_from_id: number | null;
  is_active: number;
  is_deleted: number;
  created_by: string | null;
  updated_by: string | null;
  action_by: string | null;
  created_at: string;
  updated_at: string | null;
  status: OwnerRelativeRequestStatus | null;
  owner: OwnerRelativeRequestOwner | null;
  unit: OwnerRelativeRequestUnit | null;
}

interface GetOwnerRelativeRequestsRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    requests?: OwnerRelativeRequest[];
  } | null;
  success: boolean;
}

export interface GetOwnerRelativeRequestsResponse {
  requests: OwnerRelativeRequest[];
  totalCount: number;
}

export interface GetOwnerRelativeRequestsParams {
  id?: number;
  owner_id?: number;
  project_id?: number;
  unit_number?: string;
  mobile_number?: string;
  relative_identification_id?: string;
  request_status_id?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getOwnerRelativeRequests(
  params: GetOwnerRelativeRequestsParams = {},
  signal?: AbortSignal,
): Promise<GetOwnerRelativeRequestsResponse> {
  const response = await api.get<GetOwnerRelativeRequestsRaw>(
    '/customers/owner-relative-requests',
    {
      params: {
        ...(params.id ? { id: params.id } : {}),
        ...(params.owner_id ? { owner_id: params.owner_id } : {}),
        ...(params.project_id ? { project_id: params.project_id } : {}),
        ...(params.unit_number ? { unit_number: params.unit_number } : {}),
        ...(params.mobile_number
          ? { mobile_number: params.mobile_number }
          : {}),
        ...(params.relative_identification_id
          ? { relative_identification_id: params.relative_identification_id }
          : {}),
        ...(params.request_status_id
          ? { request_status_id: params.request_status_id }
          : {}),
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      signal,
    },
  );

  const requests = Array.isArray(response.data?.result?.requests)
    ? response.data!.result!.requests!
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : requests.length;

  return { requests, totalCount };
}

export async function acceptOwnerRelativeRequest(
  id: number | string,
): Promise<void> {
  await api.post(`/customers/owner-relative-requests/${id}/accept`, {});
}

export async function rejectOwnerRelativeRequest(
  id: number | string,
): Promise<void> {
  await api.post(`/customers/owner-relative-requests/${id}/reject`, {});
}

export async function revertAcceptOwnerRelativeRequest(
  id: number | string,
): Promise<void> {
  await api.post(`/customers/owner-relative-requests/${id}/revert-accept`, {});
}
