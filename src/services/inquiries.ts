import api from '@/src/lib/http';
import { getContactChannelPayload } from '@/src/lib/contactChannel';

// ─── Types ───────────────────────────────────────────────────

export interface Inquiry {
  id: number;
  unit_number: string;
  requester_name: string;
  requester_mobile: string;
  contact_channel_id?: number;
  contact_channel_name?: string | null;
  inquiry: string;
  response: string;
  project_id: number | null;
  project_name: string | null;
  created_by: string | null;
  created_at: { dateTime: string; date: string; time: string } | null;
  updated_at: string | null;
}

interface GetInquiriesRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    inquiries?: Inquiry[];
  } | null;
  success: boolean;
}

export interface GetInquiriesResponse {
  inquiries: Inquiry[];
  totalCount: number;
}

export interface GetInquiriesParams {
  id?: number;
  unit_number?: string;
  unit_id?: number;
  requester_name?: string;
  requester_mobile?: string;
  project_id?: number;
  contact_channel_id?: number;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export interface CreateInquiryPayload {
  unit_number: string;
  unit_id: number;
  requester_name: string;
  requester_mobile: string;
  contact_channel_id?: number;
  inquiry: string;
  response: string;
}

export interface CreateInquiryResult {
  success: boolean;
  result?: {
    message: string;
  };
}

// ─── API calls ───────────────────────────────────────────────

export async function getInquiries(
  params: GetInquiriesParams = {},
  signal?: AbortSignal,
): Promise<GetInquiriesResponse> {
  const response = await api.get<GetInquiriesRaw>('/orders/inquiries', {
    params: {
      ...(params.id ? { id: params.id } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      ...(params.requester_name
        ? { requester_name: params.requester_name }
        : {}),
      ...(params.requester_mobile
        ? { requester_mobile: params.requester_mobile }
        : {}),
      ...(params.project_id ? { project_id: params.project_id } : {}),
      ...getContactChannelPayload(params.contact_channel_id),
      ...(params.from_date ? { from_date: params.from_date } : {}),
      ...(params.to_date ? { to_date: params.to_date } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const inquiries = Array.isArray(response.data?.result?.inquiries)
    ? response.data.result.inquiries
    : [];

  const totalCount =
    typeof response.data?.result?.total_count === 'number'
      ? response.data.result.total_count
      : inquiries.length;

  return { inquiries, totalCount };
}

export async function getInquiryById(
  id: number,
  signal?: AbortSignal,
): Promise<Inquiry | null> {
  const { inquiries } = await getInquiries({ id, page: 1, limit: 1 }, signal);
  return inquiries[0] ?? null;
}

export async function createInquiry(
  payload: CreateInquiryPayload,
): Promise<CreateInquiryResult> {
  const { contact_channel_id, ...inquiryPayload } = payload;
  const response = await api.post('/orders/inquiries', {
    ...inquiryPayload,
    ...getContactChannelPayload(contact_channel_id),
  });
  return response.data;
}
