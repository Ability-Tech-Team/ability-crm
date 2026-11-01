import api from '@/src/lib/http';
import type { TicketComment } from '@/src/services/tickets';

/**
 * Backend contract for the تنازلات-only ticket module.
 *
 * The backend should expose these routes under `/orders/concession-tickets`
 * and include `concession_ticket_reasons` in `/all-dropdowns`.
 */
const CONCESSION_TICKETS_ENDPOINT = '/orders/concession-tickets';

export interface ConcessionTicket {
  ticket_id: number;
  unit_id: number;
  unit_number: string;
  project_id?: number | null;
  project_name?: string | null;
  customer_id?: number | null;
  customer_code?: string | null;
  customer_name?: string | null;
  customer_mobile?: string | null;
  reason_id: number;
  reason_name: string;
  status_id?: number | null;
  status_name?: string | null;
  created_by?: string | null;
  created_at?: {
    dateTime: string;
    date: string;
    time: string;
  };
  comments: TicketComment[];
}

export interface CreateConcessionTicketDto {
  unit_id: number;
  unit_number: string;
  project_id?: number;
  customer_id?: number;
  customer_code?: string;
  customer_name?: string;
  customer_mobile?: string;
  reason_id: number;
  comment: string;
}

export interface CreateConcessionTicketResult {
  success: boolean;
  result?: {
    message?: string;
    ticket_id: number;
  };
}

export interface AddConcessionTicketCommentDto {
  comment: string;
}

export async function createConcessionTicket(
  payload: CreateConcessionTicketDto,
): Promise<CreateConcessionTicketResult> {
  const response = await api.post<CreateConcessionTicketResult>(
    CONCESSION_TICKETS_ENDPOINT,
    payload,
  );
  return response.data;
}

export async function getConcessionTicketById(
  ticketId: number,
  signal?: AbortSignal,
): Promise<ConcessionTicket | null> {
  const response = await api.get<{
    success: boolean;
    result?: ConcessionTicket | null;
  }>(`${CONCESSION_TICKETS_ENDPOINT}/${ticketId}`, { signal });

  const ticket = response.data?.result;
  return ticket
    ? {
        ...ticket,
        comments: Array.isArray(ticket.comments) ? ticket.comments : [],
      }
    : null;
}

export async function addConcessionTicketComment(
  ticketId: number,
  payload: AddConcessionTicketCommentDto,
): Promise<{ success: boolean }> {
  const response = await api.post<{ success: boolean }>(
    `${CONCESSION_TICKETS_ENDPOINT}/${ticketId}/comments`,
    payload,
  );
  return response.data;
}
