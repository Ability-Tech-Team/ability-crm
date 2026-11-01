import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CreatePositionDto {
  en_name: string;
  ar_name: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

export interface UpdatePositionDto {
  en_name?: string;
  ar_name?: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function createPosition(
  payload: CreatePositionDto,
): Promise<void> {
  await api.post('/definitions/positions', {
    positions: [payload],
  });
}

export async function updatePosition(
  positionId: number,
  payload: UpdatePositionDto,
): Promise<void> {
  await api.post(`/definitions/positions/update/${positionId}`, payload);
}

export async function deletePosition(positionId: number): Promise<void> {
  await api.post(`/definitions/positions/update/${positionId}`, {
    is_deleted: 1,
  });
}

export async function getAllPositions(signal?: AbortSignal) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      is_active?: number | null;
    }>;
    success: boolean;
  }>('/definitions/search/positions', { signal });
  return Array.isArray(data.result) ? data.result : [];
}

export async function searchPositions(
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
  }>('/definitions/search/positions', { params, signal });
  return Array.isArray(data.result) ? data.result : [];
}
