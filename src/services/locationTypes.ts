import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CreateLocationTypeDto {
  en_name: string;
  ar_name: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

export interface UpdateLocationTypeDto {
  en_name?: string;
  ar_name?: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function createLocationType(
  payload: CreateLocationTypeDto,
): Promise<void> {
  await api.post('/definitions/location-types', {
    location_types: [payload],
  });
}

export async function updateLocationType(
  id: number,
  payload: UpdateLocationTypeDto,
): Promise<void> {
  await api.post(`/definitions/location-types/update/${id}`, payload);
}

export async function deleteLocationType(id: number): Promise<void> {
  await api.post(`/definitions/location-types/update/${id}`, {
    is_deleted: 1,
  });
}

export async function getAllLocationTypes(signal?: AbortSignal) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      is_active?: number | null;
    }>;
    success: boolean;
  }>('/definitions/search/location-types', { signal });
  return Array.isArray(data.result) ? data.result : [];
}

export async function searchLocationTypes(
  params: { name?: string },
  signal?: AbortSignal,
) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      is_active?: number | null;
    }>;
    success: boolean;
  }>('/definitions/search/location-types', { params, signal });
  return Array.isArray(data.result) ? data.result : [];
}
