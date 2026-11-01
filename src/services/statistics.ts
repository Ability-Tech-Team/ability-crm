import api from '@/src/lib/http';

export enum DateType {
  DAILY = 1,
  WEEKLY = 2,
  MONTHLY = 3,
  YEARLY = 4,
}

export interface ComplaintByStatus {
  status_id: number;
  status_name: string;
  data: number[];
}

export interface TicketsByDepartment {
  department_id: number;
  department_name: string;
  data: number[];
}

export interface Statistics {
  date_type: DateType;
  date: string;
  x_labels: number[];
  statistics: {
    tickets: { data: number[] };
    tickets_by_department: TicketsByDepartment[];
    complains_by_status: ComplaintByStatus[];
    collected_invoices: { data: number[] };
    sla_delay: { sla: number[]; delay: number[] };
  };
}

export interface GetStatisticsParams {
  date_type: DateType;
  date?: string;
}

export async function getStatistics(
  params: GetStatisticsParams,
  signal?: AbortSignal,
): Promise<Statistics> {
  const response = await api.get('/orders/statistics', {
    params: {
      date_type: params.date_type,
      ...(params.date ? { date: params.date } : {}),
    },
    signal,
  });

  return response.data?.result;
}
