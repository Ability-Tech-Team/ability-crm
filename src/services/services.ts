import api from '@/src/lib/http';
import type { ErpAccountCodeSummary } from '@/src/services/invoiceTypes';

// ─── Types ───────────────────────────────────────────────────

export interface CreateServiceDto {
  en_name: string;
  ar_name: string;
  description?: string;
  department_id: number;
  price: number;
  is_active?: number;
  show_in_mobile?: number;
  en_mobile_service_name?: string;
  ar_mobile_service_name?: string;
  start_date?: string;
  /** Optional since the SAP removal. */
  erp_account_code_id?: number | null;
}

export interface UpdateServiceDto {
  en_name?: string;
  ar_name?: string;
  description?: string;
  department_id?: number;
  price?: number;
  is_active?: number;
  is_deleted?: number;
  show_in_mobile?: number;
  en_mobile_service_name?: string;
  ar_mobile_service_name?: string;
  start_date?: string;
  /** `null` removes the code. */
  erp_account_code_id?: number | null;
}

export interface Service {
  id: number;
  service_name: string;
  en_name?: string | null;
  ar_name?: string | null;
  en_mobile_service_name?: string | null;
  ar_mobile_service_name?: string | null;
  service_mobile_name: string | null;
  department_name: string | null;
  created_by_name: string | null;
  description: string | null;
  department_id: number;
  price: string;
  is_active: number;
  is_deleted: number;
  created_by: string | null;
  updated_by: string | null;
  show_in_mobile: number;
  service_config_id: number | null;
  start_date: string | null;
  erp_account_code_id?: number | null;
  erp_account_codes?: ErpAccountCodeSummary | null;
  service_config?: {
    id: number;
    slot_from_time: string;
    slot_to_time: string;
    slot_time: number;
    concurrent_slots: number;
  } | null;
  created_at: string;
  updated_at: string;
  project_id: number | null;
}

interface GetServicesRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    services?: Service[];
  } | null;
  success: boolean;
}

export interface GetServicesResponse {
  services: Service[];
  totalCount: number;
}

export interface GetServicesParams {
  service_id?: number;
  service_name?: string;
  department_id?: number;
  is_active?: number;
  show_in_mobile?: number;
  start_date?: string;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getServices(
  params: GetServicesParams = {},
  signal?: AbortSignal,
): Promise<GetServicesResponse> {
  const response = await api.get<GetServicesRaw>('/services', {
    params: {
      ...(params.service_id ? { service_id: params.service_id } : {}),
      ...(params.service_name ? { service_name: params.service_name } : {}),
      ...(params.department_id ? { department_id: params.department_id } : {}),
      ...(params.is_active !== undefined
        ? { is_active: params.is_active }
        : {}),
      ...(params.show_in_mobile !== undefined
        ? { show_in_mobile: params.show_in_mobile }
        : {}),
      ...(params.start_date ? { start_date: params.start_date } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const services = Array.isArray(response.data?.result?.services)
    ? response.data.result.services
    : [];

  const filteredServices =
    params.is_active !== undefined
      ? services.filter(
          (service) => Number(service.is_active ?? 1) === params.is_active,
        )
      : services;

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : filteredServices.length;

  return { services: filteredServices, totalCount };
}

export async function getServiceById(
  serviceId: number,
  signal?: AbortSignal,
): Promise<Service | null> {
  const { services } = await getServices(
    {
      service_id: serviceId,
      page: 1,
      limit: 1,
    },
    signal,
  );

  return (
    services.find((service) => service.id === serviceId) ?? services[0] ?? null
  );
}

export async function createService(payload: CreateServiceDto): Promise<void> {
  await api.post('/service', payload);
}

export async function updateService(
  serviceId: number,
  payload: UpdateServiceDto,
): Promise<void> {
  await api.post(`/services/update/${serviceId}`, payload);
}
