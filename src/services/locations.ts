import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CreateLocationDto {
  en_name: string;
  ar_name: string;
  location_type_id?: number;
  project_id?: number;
  parent_location_id?: number;
  location_code?: string;
  is_deleted?: number;
  is_active?: number;
}

export interface UpdateLocationDto {
  en_name?: string;
  ar_name?: string;
  location_type_id?: number;
  project_id?: number;
  parent_location_id?: number;
  location_code?: string;
  is_deleted?: number;
  is_active?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function createLocation(
  payload: CreateLocationDto,
): Promise<void> {
  await api.post('/definitions/create-locations', {
    locations: [payload],
  });
}

export async function updateLocation(
  id: number,
  payload: UpdateLocationDto,
): Promise<void> {
  await api.post(`/definitions/update-location/${id}`, payload);
}

export async function deleteLocation(id: number): Promise<void> {
  await api.post(`/definitions/update-location/${id}`, {
    is_deleted: 1,
  });
}

export async function getAllLocations(signal?: AbortSignal) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      is_active?: number | null;
      location_type_id?: number | null;
      location_code?: string;
      parent_location_id?: number | null;
      children?: Array<{
        id: number;
        name: string;
        en_name?: string;
        ar_name?: string;
        is_active?: number | null;
        location_type_id?: number | null;
        location_code?: string;
        parent_location_id?: number | null;
      }>;
    }>;
    success: boolean;
  }>('/definitions/search/locations', { signal });
  return Array.isArray(data.result) ? data.result : [];
}

export async function searchLocations(
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
      location_type_id?: number | null;
      location_code?: string;
      parent_location_id?: number | null;
      children?: Array<{
        id: number;
        name: string;
        en_name?: string;
        ar_name?: string;
        is_active?: number | null;
        location_type_id?: number | null;
        location_code?: string;
        parent_location_id?: number | null;
      }>;
    }>;
    success: boolean;
  }>('/definitions/search/locations', { params, signal });
  return Array.isArray(data.result) ? data.result : [];
}
