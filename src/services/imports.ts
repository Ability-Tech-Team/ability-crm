import { z } from 'zod';
import api from '@/src/lib/http';
import { ApiError, readEnvelopeFailure } from '@/src/lib/apiErrors';

/**
 * Excel imports (new in Ability CRM; docs/ABILITY-CRM-BACKEND-CHANGES.md,
 * section 9): multipart uploads to `POST /imports/<kind>`, the import history
 * (`GET /imports`, `GET /imports/:id`), and a CSV of the rejected rows
 * (`GET /imports/:id/errors`). Re-uploading a customers sheet updates what it
 * carries, so each import reports inserted, updated, and skipped rows.
 */

export const IMPORT_KINDS = [
  'units',
  'customers',
  'relatives',
  'unit-debts',
] as const;

export type ImportKind = (typeof IMPORT_KINDS)[number];

export type ImportRecord = {
  id: number;
  kind: string | null;
  fileName: string | null;
  status: string | null;
  totalRows: number | null;
  insertedRows: number | null;
  updatedRows: number | null;
  skippedRows: number | null;
  createdAt: string | null;
  createdBy: string | null;
};

const count = z.union([z.number(), z.string()]).nullish();
const text = z.string().nullish();

// Only the row counts are named by the backend's change list; the other
// fields accept the spellings its other records use.
const importRecordSchema = z.object({
  id: z.union([z.number(), z.string().regex(/^\d+$/)]),
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

  return {
    id: Number(record.id),
    kind: record.type ?? record.import_type ?? null,
    fileName: record.file_name ?? record.original_name ?? null,
    status: record.status_name ?? record.status ?? null,
    totalRows: toCount(record.total_rows),
    insertedRows: toCount(record.inserted_rows),
    updatedRows: toCount(record.updated_rows),
    skippedRows: toCount(record.skipped_rows),
    createdAt: record.created_at ?? null,
    createdBy: record.created_by_name ?? record.created_by ?? null,
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

export async function uploadImport(
  kind: ImportKind,
  file: File,
): Promise<ImportRecord | null> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post<{ result?: unknown }>(
    `/imports/${kind}`,
    formData,
    {
      headers: { 'Content-Type': undefined },
      transformRequest: [(data) => data],
    },
  );

  return toImportRecord(response.data?.result);
}

export async function getImports(
  params: { page?: number; limit?: number } = {},
  signal?: AbortSignal,
): Promise<{ imports: ImportRecord[]; totalCount: number }> {
  const response = await api.get<{ result?: unknown }>('/imports', {
    params: { page: params.page ?? 1, limit: params.limit ?? 10 },
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
    signal,
  });
  return toImportRecord(response.data?.result);
}

/** Saves the CSV of an import's rejected rows. */
export async function downloadImportErrors(id: number): Promise<void> {
  const response = await api.get<Blob>(`/imports/${id}/errors`, {
    responseType: 'blob',
  });
  const blob = response.data;

  // A failure still arrives as a JSON envelope.
  if (blob.type.includes('json')) {
    const data: unknown = JSON.parse(await blob.text());
    const failure = readEnvelopeFailure(data, response.status);

    if (failure) {
      throw new ApiError(failure, data, response.status);
    }
  }

  const objectUrl = URL.createObjectURL(
    blob.type ? blob : new Blob([blob], { type: 'text/csv' }),
  );
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = `import-${id}-errors.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}
