import type { SelectOption } from '@/src/components/ui/Select';
import type { LogModuleGroup } from '@/src/types/dropdowns';
import type { LogsSearchFormData, LogsSearchParams } from './types';

/**
 * `log_modules` arrives grouped by menu; the filter takes a module id, so
 * every module becomes one option, listed under its menu's name.
 */
export function buildLogModuleOptions(
  logModules: Record<string, LogModuleGroup> | undefined,
): SelectOption[] {
  return Object.values(logModules ?? {}).flatMap((group) =>
    (group.modules ?? []).map((module) => ({
      value: String(module.id),
      label: module.name,
      group: group.name,
    })),
  );
}

/** Turns the form's strings into the request's values; blanks are dropped. */
export function buildLogsSearchParams(
  data: LogsSearchFormData,
): LogsSearchParams {
  return {
    module_id: data.module_id ? Number(data.module_id) : undefined,
    log_action_id: data.log_action_id ? Number(data.log_action_id) : undefined,
    created_by: data.created_by || undefined,
    record_id: data.record_id?.trim() || undefined,
    search: data.search?.trim() || undefined,
    from_date: data.from_date || undefined,
    to_date: data.to_date || undefined,
  };
}

export function getLogsSearchInitialValues(): LogsSearchFormData {
  return {
    module_id: '',
    log_action_id: '',
    created_by: '',
    record_id: '',
    search: '',
    from_date: '',
    to_date: '',
  };
}
