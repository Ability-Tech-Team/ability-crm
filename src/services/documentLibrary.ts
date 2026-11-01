import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  unit_id?: number;
  unit_number: string;
  media_type_id: number;
  media_type_name: string;
  file_name: string;
  file_path: string;
  description: string;
  customer_name: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface GetUnitMediaRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    media?: MediaItem[];
  } | null;
  success: boolean;
}

export interface GetUnitMediaResponse {
  media: MediaItem[];
  totalCount: number;
}

export interface GetUnitMediaParams {
  project_id?: number;
  unit_id?: number;
  unit_number?: string;
  media_type_id?: number;
  file_name?: string;
  description?: string;
  customer_name?: string;
  id_number?: string;
  mobile_number?: string;
  customer_id?: number;
  customer_code?: string;
  ticket_id?: string;
  invoice_id?: string;
  complain_id?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getUnitMedia(
  params: GetUnitMediaParams = {},
  signal?: AbortSignal,
): Promise<GetUnitMediaResponse> {
  const response = await api.get<GetUnitMediaRaw>('/projects/units/media', {
    params: {
      ...(params.project_id ? { project_id: params.project_id } : {}),
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.media_type_id ? { media_type_id: params.media_type_id } : {}),
      ...(params.file_name ? { file_name: params.file_name } : {}),
      ...(params.description ? { description: params.description } : {}),
      ...(params.customer_name ? { customer_name: params.customer_name } : {}),
      ...(params.id_number ? { id_number: params.id_number } : {}),
      ...(params.mobile_number ? { mobile_number: params.mobile_number } : {}),
      ...(params.customer_id ? { customer_id: params.customer_id } : {}),
      ...(params.customer_code ? { customer_code: params.customer_code } : {}),
      ...(params.ticket_id ? { ticket_id: params.ticket_id } : {}),
      ...(params.invoice_id ? { invoice_id: params.invoice_id } : {}),
      ...(params.complain_id ? { complain_id: params.complain_id } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const media = Array.isArray(response.data?.result?.media)
    ? response.data.result.media
    : [];

  const totalCount =
    typeof response.data?.result?.total_count === 'number'
      ? response.data.result.total_count
      : media.length;

  return { media, totalCount };
}

// ─── Upload ──────────────────────────────────────────────────

export interface UploadUnitMediaParams {
  file: File;
  media_type_id: number;
  unit_id?: number;
  unit_number?: string;
  file_name?: string;
  description?: string;
  ticket_id?: string;
  invoice_id?: string;
  complain_id?: number;
  customer_name?: string;
  id_number?: string;
  mobile_number?: string;
  /** Required since the SAP removal; `customer_code` is optional. */
  customer_id: number;
  customer_code?: string;
}

export async function uploadUnitMedia(
  params: UploadUnitMediaParams,
): Promise<{ success: boolean }> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('media_type_id', String(params.media_type_id));

  if (params.unit_id != null)
    formData.append('unit_id', String(params.unit_id));
  if (params.unit_number) formData.append('unit_number', params.unit_number);
  if (params.file_name) formData.append('file_name', params.file_name);
  if (params.description) formData.append('description', params.description);
  if (params.ticket_id) formData.append('ticket_id', params.ticket_id);
  if (params.invoice_id) formData.append('invoice_id', params.invoice_id);
  if (params.complain_id != null)
    formData.append('complain_id', String(params.complain_id));
  if (params.customer_name)
    formData.append('customer_name', params.customer_name);
  if (params.id_number) formData.append('id_number', params.id_number);
  if (params.mobile_number)
    formData.append('mobile_number', params.mobile_number);
  formData.append('customer_id', String(params.customer_id));
  if (params.customer_code)
    formData.append('customer_code', params.customer_code);

  const response = await api.post('/projects/units/media/upload', formData, {
    headers: { 'Content-Type': undefined },
    transformRequest: [(data) => data],
  });

  return response.data;
}

// ─── Update / Delete ─────────────────────────────────────────

export async function updateUnitMedia(
  id: string | number,
  params: { file?: File; is_deleted?: number },
): Promise<{ success: boolean }> {
  const file = params.file;

  if (file instanceof File) {
    const formData = new FormData();
    formData.append('file', file, file.name);

    if (params.is_deleted != null) {
      formData.append('is_deleted', String(params.is_deleted));
    }

    const response = await api.post(
      `/projects/units/media/update/${id}`,
      formData,
      {
        headers: { 'Content-Type': undefined },
        transformRequest: [(data) => data],
      },
    );

    return response.data;
  }

  const response = await api.post(`/projects/units/media/update/${id}`, {
    ...(params.is_deleted != null ? { is_deleted: params.is_deleted } : {}),
  });

  return response.data;
}

export async function deleteUnitMedia(
  id: string | number,
): Promise<{ success: boolean }> {
  return updateUnitMedia(id, { is_deleted: 1 });
}
