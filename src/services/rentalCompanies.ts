import api from '@/src/lib/http';

export interface RentalCompanyAttachment {
  id: number | string;
  file_name: string;
  file_path: string;
  mime_type?: string | null;
  created_at?: string | null;
}

export interface RentalCompany {
  id: number;
  name: string;
  en_name?: string;
  ar_name?: string;
  commercial_register?: string;
  tax_register?: string;
  description?: string;
  is_active?: number | null;
  attachments: RentalCompanyAttachment[];
  attachmentsCount: number;
}

export interface CreateRentalCompanyDto {
  en_name: string;
  ar_name: string;
  commercial_register: string;
  tax_register: string;
  description?: string;
  files?: File[];
  media_type_id?: number;
  file_name?: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

export interface UpdateRentalCompanyDto {
  en_name?: string;
  ar_name?: string;
  commercial_register?: string;
  tax_register?: string;
  description?: string;
  files?: File[];
  media_type_id?: number;
  file_name?: string;
  project_id?: number;
  is_deleted?: number;
  is_active?: number;
}

type RentalCompanyRaw = {
  id: number | string;
  name?: string;
  en_name?: string;
  ar_name?: string;
  commercial_register?: string;
  tax_register?: string;
  commercialRegister?: string;
  taxRegister?: string;
  description?: string | null;
  is_active?: number | string | null;
  attachments?: unknown[];
  media?: unknown[];
  files?: unknown[];
  attachments_count?: number | string | null;
  media_count?: number | string | null;
  files_count?: number | string | null;
};

type SearchRentalCompaniesRaw = {
  success: boolean;
  statusCode?: number;
  result?:
    | RentalCompanyRaw[]
    | {
        data?: RentalCompanyRaw[];
        items?: RentalCompanyRaw[];
        rental_companies?: RentalCompanyRaw[];
        message?: string;
      }
    | null;
};

function toNumber(value: unknown): number | null {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function normalizeAttachment(
  rawAttachment: unknown,
): RentalCompanyAttachment | null {
  if (!rawAttachment || typeof rawAttachment !== 'object') {
    return null;
  }

  const candidate = rawAttachment as Record<string, unknown>;
  const fileName =
    typeof candidate.file_name === 'string'
      ? candidate.file_name
      : typeof candidate.name === 'string'
        ? candidate.name
        : typeof candidate.fileName === 'string'
          ? candidate.fileName
          : null;
  const filePath =
    typeof candidate.file_path === 'string'
      ? candidate.file_path
      : typeof candidate.url === 'string'
        ? candidate.url
        : typeof candidate.path === 'string'
          ? candidate.path
          : typeof candidate.fileUrl === 'string'
            ? candidate.fileUrl
            : null;

  if (!fileName || !filePath) {
    return null;
  }

  return {
    id:
      typeof candidate.id === 'number' || typeof candidate.id === 'string'
        ? candidate.id
        : filePath,
    file_name: fileName,
    file_path: filePath,
    mime_type:
      typeof candidate.mime_type === 'string' ? candidate.mime_type : null,
    created_at:
      typeof candidate.created_at === 'string' ? candidate.created_at : null,
  };
}

function normalizeRentalCompany(rawCompany: RentalCompanyRaw): RentalCompany {
  const rawAttachments = Array.isArray(rawCompany.attachments)
    ? rawCompany.attachments
    : Array.isArray(rawCompany.media)
      ? rawCompany.media
      : Array.isArray(rawCompany.files)
        ? rawCompany.files
        : [];

  const attachments = rawAttachments
    .map((attachment) => normalizeAttachment(attachment))
    .filter((attachment): attachment is RentalCompanyAttachment =>
      Boolean(attachment),
    );

  const attachmentsCount =
    toNumber(rawCompany.attachments_count) ??
    toNumber(rawCompany.media_count) ??
    toNumber(rawCompany.files_count) ??
    attachments.length;
  const id = toNumber(rawCompany.id) ?? 0;

  return {
    id,
    name:
      rawCompany.name ?? rawCompany.en_name ?? rawCompany.ar_name ?? String(id),
    en_name: rawCompany.en_name,
    ar_name: rawCompany.ar_name,
    commercial_register:
      rawCompany.commercial_register ?? rawCompany.commercialRegister,
    tax_register: rawCompany.tax_register ?? rawCompany.taxRegister,
    description:
      typeof rawCompany.description === 'string'
        ? rawCompany.description
        : undefined,
    is_active: toNumber(rawCompany.is_active) ?? 1,
    attachments,
    attachmentsCount,
  };
}

function extractRentalCompanies(
  data: SearchRentalCompaniesRaw,
): RentalCompany[] {
  if (Array.isArray(data.result)) {
    return data.result.map((company) => normalizeRentalCompany(company));
  }

  if (Array.isArray(data.result?.rental_companies)) {
    return data.result.rental_companies.map((company) =>
      normalizeRentalCompany(company),
    );
  }

  if (Array.isArray(data.result?.items)) {
    return data.result.items.map((company) => normalizeRentalCompany(company));
  }

  if (Array.isArray(data.result?.data)) {
    return data.result.data.map((company) => normalizeRentalCompany(company));
  }

  return [];
}

function getRentalCompanyScalarPayload(
  payload: CreateRentalCompanyDto | UpdateRentalCompanyDto,
) {
  return {
    ...(payload.en_name ? { en_name: payload.en_name } : {}),
    ...(payload.ar_name ? { ar_name: payload.ar_name } : {}),
    ...(payload.commercial_register
      ? { commercial_register: payload.commercial_register }
      : {}),
    ...(payload.tax_register ? { tax_register: payload.tax_register } : {}),
    ...(payload.description ? { description: payload.description } : {}),
    ...(payload.media_type_id != null
      ? { media_type_id: payload.media_type_id }
      : {}),
    ...(payload.file_name ? { file_name: payload.file_name } : {}),
    ...(payload.project_id != null ? { project_id: payload.project_id } : {}),
    ...(payload.is_deleted != null ? { is_deleted: payload.is_deleted } : {}),
    ...(payload.is_active != null ? { is_active: payload.is_active } : {}),
  };
}

function buildRentalCompanyFormData(
  payload: CreateRentalCompanyDto | UpdateRentalCompanyDto,
) {
  const formData = new FormData();
  const scalarPayload = getRentalCompanyScalarPayload(payload);

  Object.entries(scalarPayload).forEach(([key, value]) => {
    formData.append(key, String(value));
  });

  payload.files?.forEach((file) => {
    formData.append('file', file, file.name);
  });

  return formData;
}

async function postRentalCompanyPayload(
  url: string,
  payload: CreateRentalCompanyDto | UpdateRentalCompanyDto,
  alwaysFormData = false,
) {
  const hasFiles = Array.isArray(payload.files) && payload.files.length > 0;

  if (hasFiles || alwaysFormData) {
    const formData = buildRentalCompanyFormData(payload);
    await api.post(url, formData, {
      headers: { 'Content-Type': undefined },
      transformRequest: [(data) => data],
    });
    return;
  }

  await api.post(url, getRentalCompanyScalarPayload(payload));
}

export async function createRentalCompany(
  payload: CreateRentalCompanyDto,
): Promise<void> {
  await postRentalCompanyPayload(
    '/definitions/rental-companies',
    payload,
    true,
  );
}

export async function updateRentalCompany(
  id: number,
  payload: UpdateRentalCompanyDto,
): Promise<void> {
  await postRentalCompanyPayload(
    `/definitions/rental-companies/update/${id}`,
    payload,
  );
}

export async function deleteRentalCompany(id: number): Promise<void> {
  await api.post(`/definitions/rental-companies/update/${id}`, {
    is_deleted: 1,
  });
}

export async function getAllRentalCompanies(signal?: AbortSignal) {
  const { data } = await api.get<SearchRentalCompaniesRaw>(
    '/definitions/search/rental-companies',
    { signal },
  );

  if (data.success === false && Number(data.statusCode) === 404) {
    return [];
  }

  return extractRentalCompanies(data);
}

export async function searchRentalCompanies(
  params: { name?: string },
  signal?: AbortSignal,
) {
  const { data } = await api.get<SearchRentalCompaniesRaw>(
    '/definitions/search/rental-companies',
    {
      params,
      signal,
    },
  );

  if (data.success === false && Number(data.statusCode) === 404) {
    return [];
  }

  return extractRentalCompanies(data);
}
