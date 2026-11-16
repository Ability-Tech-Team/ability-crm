import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface ModuleLog {
  /** Unique within one module's log table only, not across modules. */
  id: number;
  module_id: number;
  /** Localized by the request locale. */
  module: string;
  module_key: string;
  table: string;
  project_id: number | null;
  /** A uuid for employees and roles, a number everywhere else. */
  record_id: number | string;
  record_label: string | null;
  log_action_id: number;
  /** Localized by the request locale. */
  log_action: string;
  /** Already localized by the backend; prefer this over the en_/ar_ pair. */
  description: string;
  en_description: string;
  ar_description: string;
  change_description: string | null;
  created_by_id: string | null;
  /** Null when the action was not done by an employee. */
  created_by: string | null;
  /** Display string, not ISO — e.g. "2026-09-06, 16:08". */
  created_at: string;
}

interface GetModuleLogsRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    logs?: ModuleLog[];
  } | null;
  success: boolean;
}

export interface GetModuleLogsResponse {
  logs: ModuleLog[];
  totalCount: number;
}

export interface GetModuleLogsParams {
  /** Omit to search every module at once. */
  module_id?: number;
  log_action_id?: number;
  /** Employee uuid. */
  created_by?: string;
  /** Id of one audited record. */
  record_id?: string;
  /** Matched against the English and Arabic descriptions. */
  search?: string;
  /** Inclusive on both ends (to_date covers the whole day). */
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getModuleLogs(
  params: GetModuleLogsParams = {},
  signal?: AbortSignal,
): Promise<GetModuleLogsResponse> {
  const response = await api.get<GetModuleLogsRaw>('/module-logs', {
    params: {
      ...(params.module_id ? { module_id: params.module_id } : {}),
      ...(params.log_action_id ? { log_action_id: params.log_action_id } : {}),
      ...(params.created_by ? { created_by: params.created_by } : {}),
      ...(params.record_id ? { record_id: params.record_id } : {}),
      ...(params.search ? { search: params.search } : {}),
      ...(params.from_date ? { from_date: params.from_date } : {}),
      ...(params.to_date ? { to_date: params.to_date } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const logs = Array.isArray(response.data?.result?.logs)
    ? response.data.result.logs
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : logs.length;

  return { logs, totalCount };
}
