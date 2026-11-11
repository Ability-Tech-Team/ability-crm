import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface EodInvoice {
  invoice_number: string;
  total_amount: number;
  customer_name: string;
  unit_number: string;
  invoice_type: string;
  has_runner_cashier: number;
  runner_cashier_price: number;
  services: string[];
}

export interface EodSummaryGroup {
  invoice_status_id: number;
  invoice_status_name: string;
  payment_type_id: number;
  payment_type: string;
  invoices: EodInvoice[];
  count: number;
  total_amount: number;
  user_collected_amount: number;
}

export interface EodDepartment {
  department_id: number | null;
  department_name: string;
  summary: EodSummaryGroup[];
}

export interface EodPaymentTypeTotals {
  total_cash: number;
  total_visa: number;
  total_online: number;
  total_sister_company: number;
  total_cheque: number;
  total_instapay: number;
}

export interface EodTotals {
  total_pending: number;
  total_collected: number;
  total_voided: number;
  total_void_requested: number;
  net_balance: number;
  payment_type_totals: EodPaymentTypeTotals;
}

export interface EodResult {
  type: string;
  summary: EodDepartment[];
  totals: EodTotals;
}

export interface EodFlatRow {
  department_name: string;
  invoice_status: string;
  payment_type: string;
  invoice_number: string;
  customer_name: string;
  unit_number: string;
  invoice_type: string;
  total_amount: number;
  runner_cashier_price: number;
}

export interface DepartmentServiceRow {
  department_id: number;
  department_name: string;
  service_id: number;
  service_name: string;
  count: number;
  price: number;
  total_amount: number;
}

export interface DepartmentTotalRow {
  department_id: number;
  department_name: string;
  total_amount: number;
}

export interface DepartmentServicesReportResult {
  rows: DepartmentServiceRow[];
  departmentTotals: DepartmentTotalRow[];
  grandTotal: number;
}

interface DepartmentServiceItem {
  service_id: number;
  service: string;
  quantity: number;
  price: number;
  total_amount: number;
}

interface DepartmentServiceSummaryItem {
  department_id: number;
  department_name: string;
  services: DepartmentServiceItem[];
  total_amount: number;
}

interface DepartmentServicesResult {
  type: string;
  summary: DepartmentServiceSummaryItem[];
  totals: {
    total_amount: number;
  };
}

interface DepartmentServicesResponse {
  result?: DepartmentServicesResult | DepartmentServiceRow[] | null;
  success: boolean;
}

export interface DailyInvoiceRow {
  ticket_date: { dateTime: string; date: string; time: string };
  invoice_number: string;
  customer_name: string;
  service: string;
  department: string;
  quantity: number;
  unit_number: string;
  price: number;
  total_amount: number;
  runner_cashier_price: number;
  payment_type: Array<{
    payment_type_name: string;
    total_amount: string | number;
  }>;
  invoice_status: string;
  collected_by: string | null;
  void_reason: string | null;
  last_invoice_log: string | null;
  notes: string | null;
  request_source_name: string | null;
}

interface EodReportResponse {
  result?: EodResult | null;
  success: boolean;
}

interface DailyInvoicesResponse {
  result?: {
    type: string;
    total_count: number;
    invoices: DailyInvoiceRow[];
  } | null;
  success: boolean;
}

// ─── Params ──────────────────────────────────────────────────

export interface EndOfDayReportParams {
  from_date: string;
  to_date: string;
  department_id?: number;
}

export interface DailyInvoicesReportParams {
  from_date: string;
  to_date: string;
  department_id?: number;
  unit_number?: string;
  collected_by?: string;
  invoice_type_id?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getEndOfDayDepartmentsReport(
  params: EndOfDayReportParams,
  signal?: AbortSignal,
): Promise<EodResult> {
  const response = await api.get<EodReportResponse>(
    '/orders/invoices/reports/end-day/departments',
    {
      params: {
        from_date: params.from_date,
        to_date: params.to_date,
        ...(params.department_id
          ? { department_id: params.department_id }
          : {}),
      },
      signal,
    },
  );

  const defaultTotals: EodTotals = {
    total_pending: 0,
    total_collected: 0,
    total_voided: 0,
    total_void_requested: 0,
    net_balance: 0,
    payment_type_totals: {
      total_cash: 0,
      total_visa: 0,
      total_online: 0,
      total_sister_company: 0,
      total_cheque: 0,
      total_instapay: 0,
    },
  };

  return (
    response.data?.result ?? {
      type: 'end_of_day_departments',
      summary: [],
      totals: defaultTotals,
    }
  );
}

export async function getDepartmentServicesReport(
  params: EndOfDayReportParams,
  signal?: AbortSignal,
): Promise<DepartmentServicesReportResult> {
  const response = await api.get<DepartmentServicesResponse>(
    '/orders/invoices/reports/end-day/department-services',
    {
      params: {
        from_date: params.from_date,
        to_date: params.to_date,
        ...(params.department_id
          ? { department_id: params.department_id }
          : {}),
      },
      signal,
    },
  );

  const result = response.data?.result;

  if (Array.isArray(result)) {
    return { rows: result, departmentTotals: [], grandTotal: 0 };
  }

  if (!result || !Array.isArray(result.summary)) {
    return { rows: [], departmentTotals: [], grandTotal: 0 };
  }

  const rows = result.summary.flatMap((department) =>
    (department.services ?? []).map((service) => ({
      department_id: department.department_id,
      department_name: department.department_name,
      service_id: service.service_id,
      service_name: service.service,
      count: service.quantity,
      price: service.price,
      total_amount: service.total_amount,
    })),
  );

  const departmentTotals = result.summary.map((dept) => ({
    department_id: dept.department_id,
    department_name: dept.department_name,
    total_amount: dept.total_amount,
  }));

  const grandTotal = result.totals?.total_amount ?? 0;

  return { rows, departmentTotals, grandTotal };
}

export async function getDailyInvoicesReport(
  params: DailyInvoicesReportParams,
  signal?: AbortSignal,
): Promise<DailyInvoiceRow[]> {
  const response = await api.get<DailyInvoicesResponse>(
    '/orders/invoices/reports/daily/detailed',
    {
      params: {
        from_date: params.from_date,
        to_date: params.to_date,
        ...(params.department_id
          ? { department_id: params.department_id }
          : {}),
        ...(params.unit_number ? { unit_number: params.unit_number } : {}),
        ...(params.collected_by ? { collected_by: params.collected_by } : {}),
        ...(params.invoice_type_id
          ? { invoice_type_id: params.invoice_type_id }
          : {}),
      },
      signal,
    },
  );

  return Array.isArray(response.data?.result?.invoices)
    ? response.data.result.invoices
    : [];
}
