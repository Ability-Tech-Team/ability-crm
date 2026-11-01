import api from '@/src/lib/http';
import { getContactChannelPayload } from '@/src/lib/contactChannel';
import { pickLocalizedSnapshot } from '@/src/services/tickets';

// ─── Types ───────────────────────────────────────────────────

export interface ComplaintLog {
  log_id: number;
  complain_status_id: number;
  complain_status_name: string;
  log_description: string;
  created_by: string;
  created_at: {
    dateTime: string;
    date: string;
    time: string;
  };
}

export interface ComplaintResponse {
  response_id: number;
  response: string;
  created_by: string;
  created_at: {
    dateTime: string;
    date: string;
    time: string;
  };
}

export interface ComplaintMedia {
  id: string | number;
  file_name: string;
  file_path: string;
  media_type_id?: number;
  show_in_mobile?: number;
  created_at?: string;
}

export interface Complaint {
  complain_id: number;
  id?: number;
  unit_number: string;
  customer_name: string;
  /** Returned since the SAP removal. */
  customer_id?: number | null;
  customer_code: string;
  mobile_number: string | null;
  details: string;
  department_id: number | null;
  department_name: string | null;
  type_id: number;
  type_name: string;
  status_id: number;
  status_name: string;
  project_id: number | null;
  project_name: string | null;
  request_from_id: number;
  request_from_name: string;
  contact_channel_name?: string | null;
  complain_date: string;
  created_by: string;
  created_at: {
    dateTime: string;
    date: string;
    time: string;
  };
  logs?: ComplaintLog[];
  responses?: ComplaintResponse[];
  media?: ComplaintMedia[];
}

export type ComplaintLocale = 'ar' | 'en';

/**
 * Merge a localized `complain_snapshot[locale]` (returned by the
 * complain-notifications endpoint and the realtime socket) into the raw
 * notification row, so that the table can read fully localized values
 * (department_name, status_name, type_name, request_sources, ...).
 */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : {};
}

/**
 * Normalize an API complaint row (list, notifications, socket) to the
 * Complaint interface: the localized `complain_snapshot` wins over the
 * top-level fields, and the field names that differ between endpoints are
 * unified.
 */
function normalizeComplaint(raw: unknown, locale?: ComplaintLocale): Complaint {
  const base = asRecord(raw);
  const merged = {
    ...base,
    ...(pickLocalizedSnapshot(base.complain_snapshot, locale) ?? {}),
  };
  const rawResponses = Array.isArray(merged.responses)
    ? merged.responses
    : Array.isArray(merged.complain_responses)
      ? merged.complain_responses
      : [];
  const responses = rawResponses.map((response: unknown) => {
    const row = asRecord(response);
    const date = typeof row.Date === 'string' ? row.Date : '';
    return {
      ...row,
      created_at: row.created_at ?? { dateTime: date, date, time: date },
    };
  });

  // The API's row is the source of the remaining Complaint fields.
  return {
    ...merged,
    complain_id: merged.complain_id ?? merged.id,
    request_from_name:
      merged.request_from_name ?? merged.request_sources ?? null,
    responses,
    media: Array.isArray(merged.media) ? merged.media : [],
  } as unknown as Complaint;
}

/**
 * Public helper for callers (e.g. the realtime socket hook) that already have
 * raw notification rows and need to apply the localized snapshot before
 * displaying them.
 */
export function localizeComplaintNotification(
  raw: unknown,
  locale?: ComplaintLocale,
): Complaint {
  return normalizeComplaint(raw, locale);
}

interface GetComplaintsRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    complains?: Complaint[];
  } | null;
  success: boolean;
}

export interface GetComplaintsResponse {
  complaints: Complaint[];
  totalCount: number;
}

export interface GetComplaintsParams {
  complain_id?: number;
  department_id?: number;
  type_id?: number;
  status_id?: number;
  customer_name?: string;
  unit_number?: string;
  unit_id?: number;
  from_date?: string;
  to_date?: string;
  project_id?: number;
  request_from_id?: number;
  contact_channel_id?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getComplaints(
  params: GetComplaintsParams = {},
  signal?: AbortSignal,
): Promise<GetComplaintsResponse> {
  const response = await api.get<GetComplaintsRaw>('/orders/complains', {
    params: {
      ...(params.complain_id ? { complain_id: params.complain_id } : {}),
      ...(params.department_id ? { department_id: params.department_id } : {}),
      ...(params.type_id ? { type_id: params.type_id } : {}),
      ...(params.status_id ? { status_id: params.status_id } : {}),
      ...(params.customer_name ? { customer_name: params.customer_name } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      ...(params.from_date ? { from_date: params.from_date } : {}),
      ...(params.to_date ? { to_date: params.to_date } : {}),
      ...(params.project_id ? { project_id: params.project_id } : {}),
      ...(params.request_from_id
        ? { request_from_id: params.request_from_id }
        : {}),
      ...getContactChannelPayload(params.contact_channel_id),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const rawComplaints = Array.isArray(response.data?.result?.complains)
    ? response.data.result.complains
    : [];

  const complaints = rawComplaints.map((raw: unknown) =>
    normalizeComplaint(raw),
  );

  const totalCount =
    typeof response.data?.result?.total_count === 'number'
      ? response.data.result.total_count
      : complaints.length;

  return { complaints, totalCount };
}

export async function getComplaintById(
  complainId: number,
  signal?: AbortSignal,
): Promise<Complaint | null> {
  const { complaints } = await getComplaints(
    { complain_id: complainId, page: 1, limit: 1 },
    signal,
  );
  return complaints[0] ?? null;
}

// ─── Create complaint ────────────────────────────────────────

export interface CreateComplaintDto {
  unit_number: string;
  unit_id: number;
  customer_name: string;
  /** Required since the SAP removal; `customer_code` is optional. */
  customer_id: number;
  customer_code?: string;
  mobile_number?: string;
  details: string;
  department_id?: number;
  type_id: number;
  status_id: number;
  contact_channel_id?: number;
  project_id?: number;
  request_from_id: number;
  complain_date: string;
}

export async function createComplaint(
  payload: CreateComplaintDto,
): Promise<{ success: boolean }> {
  const { contact_channel_id, ...complaintPayload } = payload;
  const response = await api.post('/orders/complains', {
    ...complaintPayload,
    ...getContactChannelPayload(contact_channel_id),
  });
  return response.data;
}

// ─── Change complaint status ─────────────────────────────────

export interface ChangeComplaintStatusDto {
  status_id: number;
}

export async function changeComplaintStatus(
  complainId: number,
  payload: ChangeComplaintStatusDto,
): Promise<{ success: boolean }> {
  const response = await api.post(
    `/orders/complains/${complainId}/change-status`,
    payload,
  );
  return response.data;
}

// ─── Add complaint response ─────────────────────────────────

export interface CreateComplaintResponseDto {
  response: string;
}

export async function addComplaintResponse(
  complainId: number,
  payload: CreateComplaintResponseDto,
): Promise<{ success: boolean }> {
  const response = await api.post(
    `/orders/complains/${complainId}/response`,
    payload,
  );
  return response.data;
}

// ─── Complaint notifications (real-time list source) ─────────

export type ComplaintNotification = Complaint;

interface GetComplaintNotificationsRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    notifications?: ComplaintNotification[];
    complains?: ComplaintNotification[];
  } | null;
  success: boolean;
}

export interface GetComplaintNotificationsParams {
  project_id?: number;
  page?: number;
  limit?: number;
  locale?: ComplaintLocale;
}

export interface GetComplaintNotificationsResponse {
  notifications: ComplaintNotification[];
  totalCount: number;
}

export async function getComplaintNotifications(
  params: GetComplaintNotificationsParams = {},
  signal?: AbortSignal,
): Promise<GetComplaintNotificationsResponse> {
  const response = await api.get<GetComplaintNotificationsRaw>(
    '/orders/complain-notifications',
    {
      params: {
        ...(params.project_id ? { project_id: params.project_id } : {}),
        page: String(params.page ?? 1),
        limit: String(params.limit ?? 10),
      },
      signal,
    },
  );

  const result = response.data?.result;
  const rawList = Array.isArray(result?.notifications)
    ? result.notifications
    : Array.isArray(result?.complains)
      ? result.complains
      : [];

  const notifications = rawList.map((row) =>
    normalizeComplaint(row, params.locale),
  );

  const totalCount =
    typeof result?.total_count === 'number'
      ? result.total_count
      : notifications.length;

  return { notifications, totalCount };
}
