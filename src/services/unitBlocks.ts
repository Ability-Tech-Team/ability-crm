import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface UnitBlockAttachment {
  id: string | number;
  file_name: string;
  file_path: string;
  /** What the uploader typed in the attach dialog; may be empty. */
  description?: string | null;
  /** Who uploaded the file. Absent on attachments stored before the backend
   *  started returning it. */
  created_by_name?: string | null;
}

export interface UnitBlockCustomer {
  customer_id: number;
  customer_name: string;
  mobile_number: string;
  customer_code: string;
}

export interface UnitBlockLog {
  id: number;
  log_action_id: number;
  log_action_name: string;
  /** Already localized by the backend; prefer this over the en_/ar_ pair. */
  description: string;
  en_description: string;
  ar_description: string;
  change_description: string | null;
  action_by_id: string;
  action_by: string;
  /** Display string, not ISO — e.g. "2026-09-03, 14:34". */
  created_at: string;
}

export interface UnitBlock {
  id: number;
  unit_id: number;
  project_id: number;
  category_id: number;
  reason: string;
  /** 0 = finance block, 1 = legal block. Mirrors `block_type`. */
  is_legal: number;
  /** The legal employee handling the case. Null on a finance block. */
  assign_to_id: string | null;
  assign_to_name: string | null;
  assign_to_mobile: string | null;
  blocked_by: string;
  blocked_by_name: string;
  blocked_date: string;
  unblocked_by: string | null;
  unblocked_by_name: string | null;
  unblocked_date: string | null;
  is_active: number;
  is_deleted: number;
  created_by: string;
  updated_by: string | null;
  created_at: string;
  updated_at: string | null;
  /** "finance" | "legal" — string form of `is_legal`. */
  block_type: string;
  /** Localized by the request locale. */
  category_name: string;
  unit_number: string;
  unit_is_locked: number;
  /** Composed by the backend as `<block_type>/<reason>`. */
  unit_lock_reason: string;
  project_name: string;
  company_code: string;
  sub_project_code: string;
  customers: UnitBlockCustomer[];
  attachments: UnitBlockAttachment[];
  logs: UnitBlockLog[];
  /** Same as the newest entry in `logs`; convenient for list rows. */
  latest_log: UnitBlockLog | null;
}

interface GetUnitBlocksRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    currentPage?: number | null;
    unit_blocks?: UnitBlock[];
  } | null;
  success: boolean;
}

export interface GetUnitBlocksResponse {
  unitBlocks: UnitBlock[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export interface GetUnitBlocksParams {
  id?: number;
  unit_id?: number;
  unit_number?: string;
  /** Set to 1 to match `unit_number` exactly instead of the default contains search. */
  is_exact?: number;
  category_id?: number;
  project_id?: number;
  blocked_by?: string;
  unblocked_by?: string;
  assign_to_id?: string;
  /** Creation date window, inclusive on both ends (to_date covers the whole day). */
  from_date?: string;
  to_date?: string;
  customer_name?: string;
  customer_mobile?: string;
  is_active?: number;
  /** 0 = finance blocks only, 1 = legal blocks only. Omit for both. */
  is_legal?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getUnitBlocks(
  params: GetUnitBlocksParams = {},
  signal?: AbortSignal,
): Promise<GetUnitBlocksResponse> {
  const response = await api.get<GetUnitBlocksRaw>('/projects/unit-blocks', {
    params: {
      ...(params.id ? { id: params.id } : {}),
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.is_exact ? { is_exact: params.is_exact } : {}),
      ...(params.category_id ? { category_id: params.category_id } : {}),
      ...(params.project_id ? { project_id: params.project_id } : {}),
      ...(params.blocked_by ? { blocked_by: params.blocked_by } : {}),
      ...(params.unblocked_by ? { unblocked_by: params.unblocked_by } : {}),
      ...(params.assign_to_id ? { assign_to_id: params.assign_to_id } : {}),
      ...(params.from_date ? { from_date: params.from_date } : {}),
      ...(params.to_date ? { to_date: params.to_date } : {}),
      ...(params.customer_name ? { customer_name: params.customer_name } : {}),
      ...(params.customer_mobile
        ? { customer_mobile: params.customer_mobile }
        : {}),
      // `is_active` is a real 0 value, so it can't use the truthy spread above.
      ...(params.is_active !== undefined
        ? { is_active: params.is_active }
        : {}),
      // Same here: `is_legal: 0` means "finance blocks", not "no filter".
      ...(params.is_legal !== undefined ? { is_legal: params.is_legal } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const unitBlocks = Array.isArray(response.data?.result?.unit_blocks)
    ? response.data.result.unit_blocks
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : unitBlocks.length;

  const totalPages =
    typeof response.data?.result?.totalPages === 'number'
      ? response.data.result.totalPages
      : 1;

  const currentPage =
    typeof response.data?.result?.currentPage === 'number'
      ? response.data.result.currentPage
      : (params.page ?? 1);

  return { unitBlocks, totalCount, totalPages, currentPage };
}

// ─── Create unit block ───────────────────────────────────────

/** A unit may hold one legal and one finance block, but not two of a kind. */
export const UNIT_ALREADY_HAS_BLOCK = 'UNIT_ALREADY_HAS_BLOCK';

/**
 * An unsupported extension is rejected by the reverse proxy with an opaque
 * HTML 403, not a JSON error, so callers check before sending.
 */
export const UNIT_BLOCK_ALLOWED_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'webp',
  'bmp',
  'pdf',
  'docx',
  'xlsx',
  'zip',
  'rar',
  '7z',
  'tar',
  'gz',
] as const;

/** The same list, in the form a file input's `accept` attribute takes. */
export const UNIT_BLOCK_ATTACHMENT_ACCEPT = UNIT_BLOCK_ALLOWED_EXTENSIONS.map(
  (extension) => `.${extension}`,
).join(',');

/** The backend accepts at most 5 attachments per request. */
export const UNIT_BLOCK_MAX_FILES = 5;

function getFileExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.');
  return dot === -1 ? '' : fileName.slice(dot + 1).toLowerCase();
}

/** Names of any files the backend will not accept; empty means all are fine. */
export function getUnsupportedAttachments(files: File[] = []): string[] {
  const allowed = UNIT_BLOCK_ALLOWED_EXTENSIONS as readonly string[];
  return files
    .filter((file) => !allowed.includes(getFileExtension(file.name)))
    .map((file) => file.name);
}

export interface CreateUnitBlockDto {
  unit_id: number;
  /** Legal blocks only; the form hides the picker for a finance block. */
  category_id?: number;
  is_legal: number;
  reason: string;
  is_active?: number;
  assign_to_id?: string;
  files?: File[];
  /** Describes the uploaded files; the endpoint takes one for the request. */
  file_description?: string;
}

export async function createUnitBlock(
  payload: CreateUnitBlockDto,
): Promise<void> {
  const formData = new FormData();

  formData.append('unit_id', String(payload.unit_id));
  if (payload.category_id !== undefined) {
    formData.append('category_id', String(payload.category_id));
  }
  formData.append('is_legal', String(payload.is_legal));
  formData.append('reason', payload.reason);
  formData.append('is_active', String(payload.is_active ?? 1));

  if (payload.assign_to_id) {
    formData.append('assign_to_id', payload.assign_to_id);
  }

  payload.files?.forEach((file) => {
    formData.append('file', file, file.name);
  });

  if (payload.files?.length && payload.file_description) {
    formData.append('description', payload.file_description);
  }

  // Clearing the header lets the browser set the multipart boundary.
  await api.post('/projects/unit-blocks', formData, {
    headers: { 'Content-Type': undefined },
    transformRequest: [(data) => data],
  });
}

// ─── Update unit block ───────────────────────────────────────

export interface UpdateUnitBlockDto {
  reason?: string;
  /** 0 lifts the block: stamps unblocked_by / unblocked_date, unlocks the unit. */
  is_active?: number;
  // No `is_legal`: the backend reads the kind off the row, and sending it
  // trips its type-change guard for non-legal accounts.
  assign_to_id?: string;
  deleted_attachment_ids?: (string | number)[];
  files?: File[];
  /** Describes the uploaded files; the endpoint takes one for the request. */
  file_description?: string;
}

export async function updateUnitBlock(
  unitBlockId: number,
  payload: UpdateUnitBlockDto,
): Promise<void> {
  const formData = new FormData();

  if (payload.reason !== undefined) formData.append('reason', payload.reason);
  if (payload.is_active !== undefined) {
    formData.append('is_active', String(payload.is_active));
  }
  if (payload.assign_to_id) {
    formData.append('assign_to_id', payload.assign_to_id);
  }
  if (payload.deleted_attachment_ids?.length) {
    formData.append(
      'deleted_attachment_ids',
      payload.deleted_attachment_ids.join(','),
    );
  }

  payload.files?.forEach((file) => {
    formData.append('file', file, file.name);
  });

  if (payload.files?.length && payload.file_description) {
    formData.append('description', payload.file_description);
  }

  await api.post(`/projects/unit-blocks/update/${unitBlockId}`, formData, {
    headers: { 'Content-Type': undefined },
    transformRequest: [(data) => data],
  });
}
