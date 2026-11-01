import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface OwnershipManagementRequestAttachment {
  id: string | number;
  file_name: string;
  file_path: string;
}

export interface OwnershipManagementRequest {
  id: number;
  unit_id: number | null;
  project_id: number | null;
  category_id: number | null;
  description: string | null;
  /** The reason given when the request was marked as a wrong ticket. */
  comment: string | null;
  status_id: number | null;
  is_active: number;
  is_deleted: number;
  created_by: string | null;
  updated_by: string | null;
  closed_by: string | null;
  closed_date: string | null;
  created_at: string | null;
  updated_at: string | null;
  category_name: string | null;
  status_name: string | null;
  unit_number: string | null;
  company_code: string | null;
  sub_project_id: string | null;
  created_by_name: string | null;
  closed_by_name: string | null;
  attachments: OwnershipManagementRequestAttachment[] | null;
}

interface GetOwnershipManagementRequestsRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    requests?: OwnershipManagementRequest[];
  } | null;
  success: boolean;
}

export interface GetOwnershipManagementRequestsResponse {
  requests: OwnershipManagementRequest[];
  totalCount: number;
}

export interface GetOwnershipManagementRequestsParams {
  id?: number;
  unit_id?: number;
  unit_number?: string;
  /** Set to 1 to match `unit_number` exactly instead of the default contains search. */
  is_exact?: number;
  category_id?: number;
  status_id?: number;
  created_by?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface CreateOwnershipManagementRequestPayload {
  unit_id: number | string;
  category_id: number | string;
  description: string;
  files?: File[];
}

export interface WrongTicketOwnershipManagementRequestPayload {
  comment: string;
}

// ─── API calls ───────────────────────────────────────────────

export async function getOwnershipManagementRequests(
  params: GetOwnershipManagementRequestsParams = {},
  signal?: AbortSignal,
): Promise<GetOwnershipManagementRequestsResponse> {
  const response = await api.get<GetOwnershipManagementRequestsRaw>(
    '/customers/ownership-management-requests',
    {
      params: {
        ...(params.id ? { id: params.id } : {}),
        ...(params.unit_id ? { unit_id: params.unit_id } : {}),
        ...(params.unit_number ? { unit_number: params.unit_number } : {}),
        ...(params.is_exact ? { is_exact: params.is_exact } : {}),
        ...(params.category_id ? { category_id: params.category_id } : {}),
        ...(params.status_id ? { status_id: params.status_id } : {}),
        ...(params.created_by ? { created_by: params.created_by } : {}),
        ...(params.from_date ? { from_date: params.from_date } : {}),
        ...(params.to_date ? { to_date: params.to_date } : {}),
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      signal,
    },
  );

  const requests = Array.isArray(response.data?.result?.requests)
    ? response.data.result.requests
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : requests.length;

  return { requests, totalCount };
}

export async function getOwnershipManagementRequestById(
  id: number,
  signal?: AbortSignal,
): Promise<OwnershipManagementRequest | null> {
  const { requests } = await getOwnershipManagementRequests(
    { id, page: 1, limit: 1 },
    signal,
  );
  // Match on id: a backend that ignores the filter would hand back a
  // different request, and actions would then run against it.
  return requests.find((request) => Number(request.id) === id) ?? null;
}

/** `status_id` of an open ownership-management request. */
export const OWNERSHIP_REQUEST_OPEN_STATUS_ID = 1;

export async function createOwnershipManagementRequest(
  payload: CreateOwnershipManagementRequestPayload,
): Promise<void> {
  const formData = new FormData();

  formData.append('unit_id', String(payload.unit_id));
  formData.append('category_id', String(payload.category_id));
  formData.append('description', payload.description);
  // New requests must be created open.
  formData.append('status_id', String(OWNERSHIP_REQUEST_OPEN_STATUS_ID));

  payload.files?.forEach((file) => {
    formData.append('file', file, file.name);
  });

  // The shared axios instance defaults to `application/json`; clearing the
  // header lets the browser set the multipart boundary itself.
  await api.post('/customers/ownership-management-requests', formData, {
    headers: { 'Content-Type': undefined },
    transformRequest: [(data) => data],
  });
}

export async function closeOwnershipManagementRequest(
  id: number | string,
): Promise<void> {
  await api.post(`/customers/ownership-management-requests/${id}/close`, {});
}

export async function markOwnershipManagementRequestAsWrongTicket(
  id: number | string,
  payload: WrongTicketOwnershipManagementRequestPayload,
): Promise<void> {
  await api.post(
    `/customers/ownership-management-requests/${id}/wrong-ticket`,
    payload,
  );
}
