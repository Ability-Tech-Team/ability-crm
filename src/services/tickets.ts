import api from '@/src/lib/http';
import { getContactChannelPayload } from '@/src/lib/contactChannel';

// ─── Types ───────────────────────────────────────────────────

export interface TicketService {
  service_id: number;
  service_name: string;
  quantity: number;
  price: number;
  total_price: number;
}

export interface TicketLog {
  log_id: number;
  ticket_status_id: number;
  ticket_status_name: string;
  log_description: string;
  created_by: string;
  created_at: {
    dateTime: string;
    date: string;
    time: string;
  };
}

export interface TicketComment {
  comment_id: number;
  comment: string;
  created_by: string;
  position: string;
  created_at: {
    dateTime: string;
    date: string;
    time: string;
  };
}

export interface TicketInvoice {
  invoice_number: string;
  invoice_status_id: number;
  invoice_status_name: string;
  is_pending: boolean;
  is_voided: boolean;
}

export interface Ticket {
  ticket_id: number;
  /** Returned since the SAP removal. */
  customer_id?: number | null;
  customer_name: string;
  customer_mobile: string;
  reject_reason: string | null;
  collected_by: string | null;
  requester_name: string;
  requester_mobile: string;
  unit_number: string;
  unit_id?: number;
  unit_type: string;
  notes: string | null;
  has_runner_cashier: number;
  is_urgent: number;
  sla_status: number;
  delay_status: number;
  runner_cashier_price: string;
  ticket_total_price: number;
  department_id: number;
  department_name: string;
  arrival_time: string | null;
  actual_arrival_time: string | null;
  duration: string | null;
  request_from_id: number;
  ticket_source_name: string;
  contact_channel_name?: string | null;
  last_status_id: number;
  last_status_name: string;
  seen_by: string | null;
  agent_id: string;
  agent_name: string;
  done_by: string | null;
  created_by: string | null;
  request_time: {
    dateTime: string;
    date: string;
    time: string;
  };
  services: TicketService[];
  logs: TicketLog[];
  comments: TicketComment[];
  invoices: TicketInvoice[];
}

interface GetTicketsRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    tickets?: Ticket[];
  } | null;
  success: boolean;
}

export type TicketLocale = 'ar' | 'en';

/**
 * Merge a localized `ticket_snapshot[locale]` (returned by the
 * ticket-notifications endpoint and the realtime socket) into the raw
 * notification row, so the table can read fully localized values
 * (department_name, last_status_name, ticket_source_name, ...).
 */
export function localizeTicketNotification(
  raw: Ticket & { ticket_snapshot?: unknown },
  locale?: TicketLocale,
): Ticket {
  if (!raw || typeof raw !== 'object') return raw;
  const localized = pickLocalizedSnapshot(raw.ticket_snapshot, locale);
  return localized ? { ...raw, ...localized } : raw;
}

/** The snapshot's values for `locale`, else English, else Arabic. */
export function pickLocalizedSnapshot(
  snapshot: unknown,
  locale?: TicketLocale,
): Record<string, unknown> | null {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const byLocale = snapshot as Partial<Record<TicketLocale, unknown>>;
  const localized =
    (locale && byLocale[locale]) ?? byLocale.en ?? byLocale.ar ?? null;
  return localized && typeof localized === 'object'
    ? (localized as Record<string, unknown>)
    : null;
}

interface GetTicketByIdRaw {
  result?: Ticket | null;
  success: boolean;
}

export interface GetTicketsResponse {
  tickets: Ticket[];
  totalCount: number;
}

export interface GetTicketsParams {
  department_id?: number;
  ticket_id?: number;
  service_id?: number;
  status_id?: number;
  created_by?: string;
  customer_name?: string;
  requester_name?: string;
  unit_number?: string;
  unit_id?: number;
  from_date?: string;
  to_date?: string;
  request_from_id?: number;
  contact_channel_id?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getTickets(
  params: GetTicketsParams = {},
  signal?: AbortSignal,
): Promise<GetTicketsResponse> {
  const response = await api.get<GetTicketsRaw>('/orders/tickets', {
    params: {
      ...(params.department_id ? { department_id: params.department_id } : {}),
      ...(params.ticket_id ? { ticket_id: params.ticket_id } : {}),
      ...(params.service_id ? { service_id: params.service_id } : {}),
      ...(params.status_id ? { status_id: params.status_id } : {}),
      ...(params.created_by ? { created_by: params.created_by } : {}),
      ...(params.customer_name ? { customer_name: params.customer_name } : {}),
      ...(params.requester_name
        ? { requester_name: params.requester_name }
        : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      ...(params.from_date ? { from_date: params.from_date } : {}),
      ...(params.to_date ? { to_date: params.to_date } : {}),
      ...(params.request_from_id
        ? { request_from_id: params.request_from_id }
        : {}),
      ...getContactChannelPayload(params.contact_channel_id),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const tickets = Array.isArray(response.data?.result?.tickets)
    ? response.data.result.tickets
    : [];

  const totalCount =
    typeof response.data?.result?.total_count === 'number'
      ? response.data.result.total_count
      : tickets.length;

  return { tickets, totalCount };
}

export async function getTicketById(
  ticketId: number,
  signal?: AbortSignal,
): Promise<Ticket | null> {
  const response = await api.get<GetTicketByIdRaw>(
    `/orders/tickets/${ticketId}`,
    {
      signal,
    },
  );

  return response.data?.result ?? null;
}

// ─── Create ticket ───────────────────────────────────────────

export interface CreateTicketServiceDto {
  service_id: number;
  quantity: number;
  price: number;
}

export interface CreateTicketDto {
  customer_name: string;
  customer_mobile: string;
  /** Required since the SAP removal; `customer_code` is optional. */
  customer_id: number;
  customer_code?: string;
  unit_number: string;
  unit_id: number;
  unit_type?: string;
  project_id?: number;
  request_from_id?: number;
  department_id: number;
  contact_channel_id?: number;
  requester_name: string;
  requester_mobile: string;
  has_runner_cashier?: number;
  is_urgent?: number;
  notes?: string;
  arrival_time: string;
  paid_status?: number;
  services: CreateTicketServiceDto[];
}

export interface CreateTicketResult {
  success: boolean;
  result?: {
    message: string;
    ticket_id: number;
    invoice_number: string;
  };
}

export async function createTicket(
  payload: CreateTicketDto,
): Promise<CreateTicketResult> {
  const { contact_channel_id, ...ticketPayload } = payload;
  const response = await api.post('/orders/tickets', {
    ...ticketPayload,
    ...getContactChannelPayload(contact_channel_id),
  });
  return response.data;
}

// ─── Update ticket ───────────────────────────────────────────

export interface UpdateTicketServiceDto {
  service_id: number;
  quantity?: number;
  price?: number;
  is_deleted?: number;
}

export interface UpdateTicketDto {
  department_id?: number;
  arrival_time?: string;
  notes?: string;
  unit_id?: number;
  services?: UpdateTicketServiceDto[];
}

export async function updateTicket(
  ticketId: number,
  payload: UpdateTicketDto,
): Promise<{ success: boolean }> {
  const response = await api.post(
    `/orders/tickets/${ticketId}/update`,
    payload,
  );
  return response.data;
}

export interface ChangeTicketStatusDto {
  status_id: number;
  reject_reason?: string;
}

export interface AddTicketCommentDto {
  comment: string;
}

export async function changeTicketStatus(
  ticketId: number,
  payload: ChangeTicketStatusDto,
): Promise<{ success: boolean }> {
  const response = await api.post(
    `/orders/tickets/${ticketId}/change-status`,
    payload,
  );
  return response.data;
}

export async function addTicketComment(
  ticketId: number,
  payload: AddTicketCommentDto,
): Promise<{ success: boolean }> {
  const response = await api.post(
    `/orders/tickets/${ticketId}/comments`,
    payload,
  );
  return response.data;
}

export async function deleteTicket(
  ticketId: number,
): Promise<{ success: boolean }> {
  const response = await api.post(`/orders/tickets/${ticketId}/update`, {
    is_deleted: 1,
  });
  return response.data;
}

// ─── Ticket notifications (real-time list source) ────────────

export type TicketNotification = Ticket;

interface GetTicketNotificationsRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    notifications?: TicketNotification[];
    tickets?: TicketNotification[];
  } | null;
  success: boolean;
}

export interface GetTicketNotificationsParams {
  project_id?: number;
  page?: number;
  limit?: number;
  locale?: TicketLocale;
}

export interface GetTicketNotificationsResponse {
  notifications: TicketNotification[];
  totalCount: number;
}

export async function getTicketNotifications(
  params: GetTicketNotificationsParams = {},
  signal?: AbortSignal,
): Promise<GetTicketNotificationsResponse> {
  const response = await api.get<GetTicketNotificationsRaw>(
    '/orders/ticket-notifications',
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
    : Array.isArray(result?.tickets)
      ? result.tickets
      : [];

  const list = rawList.map((row) =>
    localizeTicketNotification(row, params.locale),
  );

  const totalCount =
    typeof result?.total_count === 'number' ? result.total_count : list.length;

  return { notifications: list, totalCount };
}
