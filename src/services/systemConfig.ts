import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface UpdateProjectSystemConfigDto {
  project_system_config_id: number;
  config_list?: string[];
  config_value: string;
  is_deleted?: number;
  is_active?: number;
}

export interface UpdateProjectSystemConfigsDto {
  project_system_configs: UpdateProjectSystemConfigDto[];
}

// ─── API calls ───────────────────────────────────────────────

export async function updateSystemConfigs(
  payload: UpdateProjectSystemConfigsDto,
): Promise<void> {
  await api.post('/definitions/project-system-configs/update', payload);
}
