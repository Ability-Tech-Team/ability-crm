import api from '@/src/lib/http';
import { getContactChannelPayload } from '@/src/lib/contactChannel';

// ─── Types ───────────────────────────────────────────────────

export interface InvoiceService {
  service_id: number;
  service_name: string;
  quantity: number;
  price: number;
  total_price: number;
}

export interface InvoiceTransaction {
  id: string;
  invoice_id: string;
  invoice_number: string;
  project_id: number;
  total_amount: string;
  payment_type_id: number;
  reference_number: string;
  bank_reference: {
    card_no: string;
    auth_code: string;
  } | null;
  visa_number: string | null;
  sister_company_id: number | null;
  sister_company_name: string | null;
  bank_name: string | null;
  transaction_date: string;
  transaction_at: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
  payment_type_name: string;
  transactions_created_by: string | null;
  mobile_number?: string | null;
}

/**
 * One settlement item of an invoice. There is no ERP integration: the ERP
 * references are only filled when someone enters them by hand, and no
 * accounting payload is returned.
 */
export interface SettlementItem {
  id: string;
  invoice_id: string;
  invoice_number: string;
  invoice_number_item: string;
  erp_reference_id: string | null;
  erp_refund_reference_id: string | null;
  project_id: number | null;
  owner_customer_id: number | null;
  owner_customer_code: string | null;
  customer_unit_id: number | null;
  fm_contract: string | null;
  unit_number: string | null;
  payment_type_id: number | null;
  payment_type_name: string | null;
  total_amount: string | null;
  created_by: string | null;
  updated_by: string | null;
  refunded_by: string | null;
  refund_requested_by: string | null;
  refund_status_id: number | null;
  refund_request_reason: string | null;
  refund_reason: string | null;
  reject_refund_request_reason: string | null;
  failed_to_settle: number | null;
  failed_to_refund: number | null;
  created_at: string | null;
  updated_at: string | null;
  refund_status_name: string | null;
  refunded_by_name: string | null;
  refund_requested_by_name: string | null;
}

export interface InvoiceLog {
  log_id: number;
  ticket_status_id: number;
  ticket_status_name?: string | null;
  invoice_status_name?: string | null;
  status_name?: string | null;
  description?: string | null;
  log_description?: string | null;
  created_by: string;
  created_at: string | {
    dateTime: string;
    date: string;
    time: string;
  };
}

export interface Invoice {
  id: string;
  unit_number: string;
  department_id?: number;
  department_name?: string;
  /** Returned since the SAP removal. */
  customer_id?: number | null;
  customer_code: string;
  invoice_number: string;
  project_id: number;
  ticket_id: number;
  invoice_type_id: number;
  invoice_status_id: number;
  total_amount: string;
  refunded_amount?: string | number | null;
  remaining_amount?: string | number | null;
  has_runner_cashier: number;
  runner_cashier_price: string;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  notes: string | null;
  invoice_date: string;
  is_end_of_day: number;
  end_of_day_date: string | null;
  is_full_end_of_day: number;
  full_end_of_day_date: string | null;
  request_from_id: number;
  contact_channel_name?: string | null;
  customer_name: string;
  customer_mobile: string;
  void_requested_by?: string | null;
  void_reason: string | null;
  void_request_reason?: string | null;
  reject_void_request_reason?: string | null;
  void_by?: string | null;
  has_void_request?: number | null;
  has_void?: number | null;
  refund_reason?: string | null;
  refund_by?: string | null;
  refund_request_reason?: string | null;
  settlement?: SettlementItem[] | null;
  invoice_transactions: InvoiceTransaction[];
  invoice_status_name: string;
  invoice_type_name: string;
  invoice_created_by: string;
  collected_by?: string;
  invoice_collected_by?: string | null;
  invoice_collected_date?: string | null;
  invoice_types: string;
  ticket_source_name?: string | null;
  requester_name?: string | null;
  services: InvoiceService[];
  logs?: InvoiceLog[];
}

interface GetInvoicesRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    invoices?: Invoice[];
  } | null;
  success: boolean;
}

export interface GetInvoicesResponse {
  invoices: Invoice[];
  totalCount: number;
}

export interface GetInvoicesParams {
  ticket_id?: number;
  invoice_number?: string;
  invoice_status_id?: number;
  invoice_type_id?: number;
  service_id?: number;
  department_id?: number;
  collected_by?: string;
  created_by?: string;
  customer_name?: string;
  unit_number?: string;
  unit_id?: number;
  from_date?: string;
  to_date?: string;
  request_from_id?: number;
  contact_channel_id?: number;
  is_settled?: 0 | 1;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getInvoices(
  params: GetInvoicesParams = {},
  signal?: AbortSignal,
): Promise<GetInvoicesResponse> {
  const response = await api.get<GetInvoicesRaw>('/orders/invoices', {
    params: {
      ...(params.ticket_id ? { ticket_id: params.ticket_id } : {}),
      ...(params.invoice_number
        ? { invoice_number: params.invoice_number }
        : {}),
      ...(params.invoice_status_id
        ? { invoice_status_id: params.invoice_status_id }
        : {}),
      ...(params.invoice_type_id
        ? { invoice_type_id: params.invoice_type_id }
        : {}),
      ...(params.service_id ? { service_id: params.service_id } : {}),
      ...(params.department_id ? { department_id: params.department_id } : {}),
      ...(params.collected_by ? { collected_by: params.collected_by } : {}),
      ...(params.created_by ? { created_by: params.created_by } : {}),
      ...(params.customer_name ? { customer_name: params.customer_name } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      ...(params.from_date ? { from_date: params.from_date } : {}),
      ...(params.to_date ? { to_date: params.to_date } : {}),
      ...(params.request_from_id
        ? { request_from_id: params.request_from_id }
        : {}),
      ...getContactChannelPayload(params.contact_channel_id),
      ...(params.is_settled !== undefined
        ? { is_settled: params.is_settled }
        : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const invoices = Array.isArray(response.data?.result?.invoices)
    ? response.data.result.invoices
    : [];

  const totalCount =
    typeof response.data?.result?.total_count === 'number'
      ? response.data.result.total_count
      : invoices.length;

  return { invoices, totalCount };
}

export async function getInvoiceById(
  invoiceId: string,
  signal?: AbortSignal,
): Promise<Invoice | null> {
  const response = await api.get<GetInvoicesRaw>('/orders/invoices', {
    params: { invoice_id: invoiceId, page: 1, limit: 1 },
    signal,
  });

  const invoices = Array.isArray(response.data?.result?.invoices)
    ? response.data.result.invoices
    : [];

  return invoices.length > 0 ? invoices[0] : null;
}

// ─── Create invoice ──────────────────────────────────────────

export interface CreateInvoicePayload {
  unit_number: string;
  unit_id: number;
  /** Required since the SAP removal; `customer_code` is optional. */
  customer_id: number;
  customer_code?: string;
  customer_name: string;
  customer_mobile: string;
  project_id?: number;
  ticket_id?: number;
  notes?: string;
  invoice_type_id: number;
  contact_channel_id?: number;
  invoice_status_id?: number;
  request_from_id: number;
  total_amount: number;
  has_runner_cashier?: number;
  runner_cashier_price?: number;
}

export interface CreateInvoiceResult {
  success: boolean;
  result?: {
    message: string;
    invoice_number: string;
  };
}

export async function createInvoice(
  payload: CreateInvoicePayload,
): Promise<CreateInvoiceResult> {
  const { contact_channel_id, ...invoicePayload } = payload;
  const response = await api.post('/orders/invoices', {
    ...invoicePayload,
    ...getContactChannelPayload(contact_channel_id),
  });
  return response.data;
}

// ─── Pay invoice (collect) ───────────────────────────────────

export interface InvoiceTransactionPayload {
  total_amount: number;
  payment_type_id: number;
  contact_channel_id?: number;
  reference_number?: string;
  bank_reference?: Record<string, string>;
  visa_number?: string;
  batch_number?: string;
  sister_company_id?: number;
  bank_name?: string;
  cheque_due_date?: string;
  mobile_number?: string;
  transaction_at: string;
}

export interface PayInvoicePayload {
  invoice_number: string;
  project_id?: number;
  unit_id?: number;
  transactions: InvoiceTransactionPayload[];
}

export async function payInvoice(payload: PayInvoicePayload): Promise<void> {
  await api.post('/orders/invoices/transactions/pay', {
    ...payload,
    transactions: payload.transactions.map(
      ({ contact_channel_id, ...transaction }) => {
        return {
          ...transaction,
          ...getContactChannelPayload(contact_channel_id),
        };
      },
    ),
  });
}

// ─── Void invoice (change status) ────────────────────────────

export const INVOICE_STATUS = {
  PENDING: 1,
  COLLECTED: 2,
  VOID: 3,
  UNDER_PAYMENT_PROCESS: 4,
  VOID_REQUESTED: 5,
  PARTIALLY_COLLECTED: 6,
  REFUNDED: 7,
  REFUND_REQUESTED: 8,
  PARTIALLY_REFUNDED: 9,
} as const;

export interface ChangeInvoiceStatusPayload {
  status_id: number;
  void_reason?: string;
  void_request_reason?: string;
  reject_reason?: string;
  refund_reason?: string;
  refund_request_reason?: string;
  is_reject?: number;
}

export async function changeInvoiceStatus(
  invoiceNumber: string,
  payload: ChangeInvoiceStatusPayload,
): Promise<void> {
  await api.post(`/orders/invoices/${invoiceNumber}/change-status`, payload);
}

// ─── Settlements (refund) ────────────────────────────────────

export interface GetSettlementInvoicesParams {
  invoice_number?: string;
  invoice_status_id?: number;
  invoice_number_item?: string;
  erp_reference_id?: string;
  erp_refund_reference_id?: string;
  owner_customer_id?: number;
  owner_customer_code?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

export async function getSettlementInvoices(
  params: GetSettlementInvoicesParams = {},
  signal?: AbortSignal,
): Promise<GetInvoicesResponse> {
  const response = await api.get<GetInvoicesRaw>(
    '/orders/invoices/settlements',
    {
      params: {
        ...(params.invoice_number
          ? { invoice_number: params.invoice_number }
          : {}),
        ...(params.invoice_status_id
          ? { invoice_status_id: params.invoice_status_id }
          : {}),
        ...(params.invoice_number_item
          ? { invoice_number_item: params.invoice_number_item }
          : {}),
        ...(params.erp_reference_id
          ? { erp_reference_id: params.erp_reference_id }
          : {}),
        ...(params.erp_refund_reference_id
          ? { erp_refund_reference_id: params.erp_refund_reference_id }
          : {}),
        ...(params.owner_customer_id
          ? { owner_customer_id: params.owner_customer_id }
          : {}),
        ...(params.owner_customer_code
          ? { owner_customer_code: params.owner_customer_code }
          : {}),
        ...(params.from_date ? { from_date: params.from_date } : {}),
        ...(params.to_date ? { to_date: params.to_date } : {}),
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      signal,
    },
  );

  const invoices = Array.isArray(response.data?.result?.invoices)
    ? response.data.result.invoices
    : [];

  const totalCount =
    typeof response.data?.result?.total_count === 'number'
      ? response.data.result.total_count
      : invoices.length;

  return { invoices, totalCount };
}

export interface ChangeInvoiceItemRefundStatusPayload {
  status_id: number;
  is_reject?: number;
  refund_request_reason?: string;
  refund_reason?: string;
  reject_reason?: string;
}

export async function changeInvoiceItemRefundStatus(
  invoiceId: string,
  invoiceNumberItem: string,
  payload: ChangeInvoiceItemRefundStatusPayload,
): Promise<void> {
  await api.post(
    `/orders/invoices/${invoiceId}/${invoiceNumberItem}/refund`,
    payload,
  );
}

// ─── End of Day / Full End of Day ────────────────────────────

export interface EndOfDayInvoiceService {
  service_name: string;
  quantity: number;
  price: number;
  total_price: number;
}

export interface EndOfDayInvoice {
  invoice_number: string;
  total_amount: number;
  invoice_status_id: number;
  invoice_status_name: string;
  pending_date: string | null;
  collected_date: string | null;
  void_date: string | null;
  under_payment_process_date: string | null;
  void_requested_date: string | null;
  partially_collected_date: string | null;
  refunded_date: string | null;
  refund_requested_date: string | null;
  partially_refunded_date: string | null;
  customer_name: string;
  unit_number: string;
  invoice_type?: string;
  has_runner_cashier: number;
  runner_cashier_price: number;
  services: EndOfDayInvoiceService[];
}

export interface EndOfDayPaymentTypeTotals {
  total_cash: number;
  total_visa: number;
  total_online: number;
  total_sister_company: number;
  total_cheque: number;
  total_instapay: number;
  total_estimated_cost_refund: number;
}

export interface EndOfDayTotals {
  total_pending: number;
  total_collected: number;
  total_voided: number;
  total_void_requested: number;
  net_balance: number;
  payment_type_totals: EndOfDayPaymentTypeTotals;
}

// ── End of Day response shape ────────────────────────────────

export interface EndOfDaySummaryItem {
  payment_type_id: number | null;
  payment_type: string;
  total_pending: number;
  total_collected: number;
  total_voided: number;
  total_void_requested: number;
  total_refunded: number;
  total_partially_refunded: number;
  total_refund_requested: number;
  invoices: EndOfDayInvoice[];
  count: number;
  total_amount: number;
  user_collected_amount: number;
}

export interface EndOfDayResult {
  type: 'end_of_day';
  employee_name: string;
  safe_name: string;
  summary: EndOfDaySummaryItem[];
  totals: EndOfDayTotals;
}

// ── Full End of Day response shape ───────────────────────────

export interface FullEndOfDayPaymentType {
  payment_type_id: number | null;
  payment_type: string;
  total_pending: number;
  total_collected: number;
  total_voided: number;
  total_void_requested: number;
  total_refunded: number;
  total_partially_refunded: number;
  total_refund_requested: number;
  invoices: EndOfDayInvoice[];
  count: number;
  total_amount: number;
  user_collected_amount: number;
}

export interface FullEndOfDayEmployeeSummary {
  employee_id: string | null;
  employee_name: string;
  safe_name: string | null;
  net_balance: number;
  payment_types: FullEndOfDayPaymentType[];
}

export interface FullEndOfDayUnsettledEmployee {
  name: string;
}

export interface FullEndOfDayResult {
  type: 'full_end_of_day';
  summary: FullEndOfDayEmployeeSummary[];
  unsettled_employees?: FullEndOfDayUnsettledEmployee[];
  totals: EndOfDayTotals;
}

// ── Params & API calls ──────────────────────────────────────

export interface GetEndDaySummaryParams {
  date?: string;
  end_of_day?: number;
  full_end_of_day?: number;
  safe_id?: number;
  to_date?: string;
  is_report?: number;
}

export interface SettleEndDayParams {
  date: string;
  end_of_day?: number;
  full_end_of_day?: number;
  safe_id?: number;
}

interface EndDaySummaryRaw {
  result: EndOfDayResult | FullEndOfDayResult;
  success: boolean;
}

export async function getEndDaySummary(
  params: GetEndDaySummaryParams,
  signal?: AbortSignal,
): Promise<EndOfDayResult | FullEndOfDayResult> {
  const response = await api.get<EndDaySummaryRaw>(
    '/orders/invoices/end-day/summary',
    {
      params: {
        ...(params.date ? { date: params.date } : {}),
        ...(params.end_of_day ? { end_of_day: params.end_of_day } : {}),
        ...(params.full_end_of_day
          ? { full_end_of_day: params.full_end_of_day }
          : {}),
        ...(params.safe_id ? { safe_id: params.safe_id } : {}),
        ...(params.to_date ? { to_date: params.to_date } : {}),
        ...(params.is_report ? { is_report: params.is_report } : {}),
      },
      signal,
    },
  );

  return response.data.result;
}

export async function settleEndDay(params: SettleEndDayParams): Promise<void> {
  await api.post('/orders/invoices/end-day/settle', {
    date: params.date,
    ...(params.end_of_day ? { end_of_day: params.end_of_day } : {}),
    ...(params.full_end_of_day
      ? { full_end_of_day: params.full_end_of_day }
      : {}),
    ...(params.safe_id ? { safe_id: params.safe_id } : {}),
  });
}
