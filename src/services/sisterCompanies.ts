import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CreateSisterCompanyDto {
  en_name: string;
  ar_name: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

export interface UpdateSisterCompanyDto {
  en_name?: string;
  ar_name?: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function createSisterCompany(
  payload: CreateSisterCompanyDto,
): Promise<void> {
  await api.post('/definitions/sister-companies', {
    sister_companies: [payload],
  });
}

export async function updateSisterCompany(
  id: number,
  payload: UpdateSisterCompanyDto,
): Promise<void> {
  await api.post(`/definitions/sister-companies/update/${id}`, payload);
}

export async function deleteSisterCompany(id: number): Promise<void> {
  await api.post(`/definitions/sister-companies/update/${id}`, {
    is_deleted: 1,
  });
}

export async function getAllSisterCompanies(signal?: AbortSignal) {
  const { data } = await api.get<{
    result: Array<{
      id: number;
      name: string;
      en_name?: string;
      ar_name?: string;
      is_active?: number | null;
    }>;
    success: boolean;
  }>('/definitions/search/sister-companies', { signal });
  return Array.isArray(data.result) ? data.result : [];
}

export async function searchSisterCompanies(
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
  }>('/definitions/search/sister-companies', { params, signal });
  return Array.isArray(data.result) ? data.result : [];
}
