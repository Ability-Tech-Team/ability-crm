import { z } from 'zod';
import api from '@/src/lib/http';
import { projectScopeParam } from '@/src/lib/projectScope';
import { ApiError, readEnvelopeFailure } from '@/src/lib/apiErrors';

/**
 * Excel imports (new in Ability CRM; docs/ABILITY-CRM-BACKEND-CHANGES.md,
 * section 9): multipart uploads to `POST /imports/<kind>`, the import history
 * (`GET /imports`, `GET /imports/:id`), the file of the rejected rows
 * (`GET /imports/:id/errors`), and the empty sheets to fill
 * (`GET /imports/<kind>/template`). Re-uploading a customers sheet updates
 * what it carries, so each import reports inserted, updated, and skipped rows.
 *
 * An upload only queues the sheet; the API's import worker reads it later.
 * While it runs, `GET /imports/:id` carries its `progress`.
 */

export const IMPORT_KINDS = [
  'units',
  'customers',
  'relatives',
  'unit-debts',
] as const;

export type ImportKind = (typeof IMPORT_KINDS)[number];

/** Where a running import is: reading the file, checking its rows, or writing the valid ones. */
export type ImportStage = 'reading' | 'checking' | 'writing';

export type ImportProgress = {
  stage: ImportStage;
  /** Rows checked, or records written, so far. */
  done: number;
  total: number;
  /** The whole import's percentage (the API weighs the stages). */
  percent: number;
};

export type ImportRecord = {
  id: number;
  kind: string | null;
  fileName: string | null;
  status: string | null;
  totalRows: number | null;
  insertedRows: number | null;
  updatedRows: number | null;
  skippedRows: number | null;
  /** Rows rejected; the history offers them as a file. */
  failedRows: number | null;
  createdAt: string | null;
  createdBy: string | null;
  /** While the import is queued or running; null otherwise or when unknown. */
  progress: ImportProgress | null;
};

/** The statuses the import worker leaves an import in (`IMPORT_STATUS` in the API). */
const FINISHED_STATUSES = new Set([
  'COMPLETED',
  'COMPLETED_WITH_ERRORS',
  'FAILED',
]);

export function isFinishedImportStatus(status: string | null): boolean {
  return status !== null && FINISHED_STATUSES.has(status.toUpperCase());
}

const count = z.union([z.number(), z.string()]).nullish();
const text = z.string().nullish();
const idValue = z.union([z.number(), z.string().regex(/^\d+$/)]);

const progressSchema = z.object({
  stage: z.enum(['reading', 'checking', 'writing']),
  done: z.number().nonnegative(),
  total: z.number().nonnegative(),
  percent: z.number().min(0).max(100),
});

// Only the row counts are named by the backend's change list; the other
// fields accept the spellings its other records use. The upload answers
// `import_id` where the import's own routes answer `id`.
const importRecordSchema = z.object({
  id: idValue.optional(),
  import_id: idValue.optional(),
  type: text,
  import_type: text,
  file_name: text,
  original_name: text,
  status: text,
  status_name: text,
  total_rows: count,
  inserted_rows: count,
  updated_rows: count,
  skipped_rows: count,
  failed_rows: count,
  // A progress the app can't read is left out rather than failing the record.
  progress: progressSchema.nullish().catch(null),
  created_at: text,
  created_by_name: text,
  created_by: text,
});

function toCount(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function toImportRecord(raw: unknown): ImportRecord | null {
  const parsed = importRecordSchema.safeParse(raw);

  if (!parsed.success) {
    return null;
  }

  const record = parsed.data;
  const id = record.id ?? record.import_id;

  if (id === undefined) {
    return null;
  }

  return {
    id: Number(id),
    kind: record.type ?? record.import_type ?? null,
    fileName: record.file_name ?? record.original_name ?? null,
    status: record.status_name ?? record.status ?? null,
    totalRows: toCount(record.total_rows),
    insertedRows: toCount(record.inserted_rows),
    updatedRows: toCount(record.updated_rows),
    skippedRows: toCount(record.skipped_rows),
    failedRows: toCount(record.failed_rows),
    createdAt: record.created_at ?? null,
    createdBy: record.created_by_name ?? record.created_by ?? null,
    progress: record.progress ?? null,
  };
}

/** The list in a paginated result, which may be an array or `{ <key>: [] }`. */
function readList(result: unknown): { items: unknown[]; total: number | null } {
  if (Array.isArray(result)) {
    return { items: result, total: result.length };
  }

  if (!result || typeof result !== 'object') {
    return { items: [], total: null };
  }

  const record = result as Record<string, unknown>;
  const list = ['imports', 'items', 'data', 'rows']
    .map((key) => record[key])
    .find(Array.isArray);
  const total = ['total_count', 'totalCount', 'total']
    .map((key) => record[key])
    .find((value) => typeof value === 'number');

  return {
    items: list ?? [],
    total: typeof total === 'number' ? total : null,
  };
}

export type UploadImportOptions = {
  /** The share of the file sent so far, from 0 to 1. */
  onUploadProgress?: (fraction: number) => void;
};

export async function uploadImport(
  kind: ImportKind,
  file: File,
  { onUploadProgress }: UploadImportOptions = {},
): Promise<ImportRecord | null> {
  const formData = new FormData();
  formData.append('file', file);
  // The Super Admin imports into the project they work in (src/lib/projectScope.ts).
  const projectId = projectScopeParam().project_id;
  if (projectId) formData.append('project_id', String(projectId));

  const response = await api.post<{ result?: unknown }>(
    `/imports/${kind}`,
    formData,
    {
      headers: { 'Content-Type': undefined },
      transformRequest: [(data) => data],
      onUploadProgress: onUploadProgress
        ? (event) => {
            const total = event.total ?? file.size;
            if (total > 0) onUploadProgress(Math.min(event.loaded / total, 1));
          }
        : undefined,
    },
  );

  return toImportRecord(response.data?.result);
}

export async function getImports(
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ imports: ImportRecord[]; totalCount: number }> {
  const response = await api.get<{ result?: unknown }>('/imports', {
    params: {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
      ...projectScopeParam(),
    },
    signal,
  });
  const { items, total } = readList(response.data?.result);
  const imports = items
    .map(toImportRecord)
    .filter((item): item is ImportRecord => item !== null);

  return { imports, totalCount: total ?? imports.length };
}

export async function getImport(
  id: number,
  signal?: AbortSignal,
): Promise<ImportRecord | null> {
  const response = await api.get<{ result?: unknown }>(`/imports/${id}`, {
    params: projectScopeParam(),
    signal,
  });
  return toImportRecord(response.data?.result);
}

/** The kinds with an empty sheet to download (`GET /imports/<kind>/template`). */
export const IMPORT_TEMPLATE_KINDS = [
  'units',
  'customers',
  'relatives',
  'unit-debts',
] as const;

export type ImportTemplateKind = (typeof IMPORT_TEMPLATE_KINDS)[number];

export function hasImportTemplate(kind: ImportKind): kind is ImportTemplateKind {
  return (IMPORT_TEMPLATE_KINDS as readonly string[]).includes(kind);
}

const XLSX_CONTENT_TYPE =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** A download's file, or the API's failure when the answer is a JSON envelope. */
async function readDownload(
  path: string,
  params: Record<string, unknown> = {},
): Promise<Blob> {
  const response = await api.get<Blob>(path, { params, responseType: 'blob' });
  const blob = response.data;

  // A failure still arrives as a JSON envelope.
  if (blob.type.includes('json')) {
    const data: unknown = JSON.parse(await blob.text());
    const failure = readEnvelopeFailure(data, response.status);

    if (failure) {
      throw new ApiError(failure, data, response.status);
    }
  }

  return blob;
}

/** Hands a file to the browser's download. */
function saveBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

/** The file name for an import's rejected rows: xlsx now, CSV for reports made before. */
export function importErrorsFileName(id: number, contentType: string): string {
  const extension = contentType.includes('spreadsheetml') ? 'xlsx' : 'csv';
  return `import-${id}-errors.${extension}`;
}

/** Saves the file of an import's rejected rows. */
export async function downloadImportErrors(id: number): Promise<void> {
  const blob = await readDownload(`/imports/${id}/errors`, projectScopeParam());
  const file = blob.type ? blob : new Blob([blob], { type: 'text/csv' });
  saveBlob(file, importErrorsFileName(id, file.type));
}

/**
 * Saves the empty sheet for `kind`: the header row in the column names the
 * import reads, required columns first, and a second tab listing which are
 * required. The backend builds it from the columns it reads, so the two
 * can't drift apart.
 */
export async function downloadImportTemplate(
  kind: ImportTemplateKind,
): Promise<void> {
  const blob = await readDownload(`/imports/${kind}/template`);
  const file = blob.type ? blob : new Blob([blob], { type: XLSX_CONTENT_TYPE });
  saveBlob(file, `${kind}-template.xlsx`);
}
