import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface UnitBlockCategory {
  id: number;
  /** Localized by the request locale. */
  name: string;
  en_name?: string;
  ar_name?: string;
  /** Owning project. `1` (ALL_PROJECTS) means the row is shared. */
  project_id: number;
  is_active?: number | null;
}

interface GetUnitBlockCategoriesRaw {
  result?: {
    totalCount?: number;
    unit_block_categories?: UnitBlockCategory[];
  } | null;
  success: boolean;
}

export interface CreateUnitBlockCategoryDto {
  en_name: string;
  ar_name: string;
  /** Optional; defaults to the caller's project. Pass 1 to share it. */
  project_id?: number;
}

export interface UpdateUnitBlockCategoryDto {
  en_name?: string;
  ar_name?: string;
  is_active?: number;
}

// ─── API calls ───────────────────────────────────────────────

/**
 * Returns the caller's own categories plus the shared (project_id = 1) ones.
 * Pass `is_active: 1` to list only the live ones.
 */
export async function getAllUnitBlockCategories(
  signal?: AbortSignal,
): Promise<UnitBlockCategory[]> {
  const { data } = await api.get<GetUnitBlockCategoriesRaw>(
    '/definitions/unit-block-categories',
    { signal },
  );

  return Array.isArray(data?.result?.unit_block_categories)
    ? data.result.unit_block_categories
    : [];
}

export async function searchUnitBlockCategories(
  params: { name?: string; is_active?: number },
  signal?: AbortSignal,
): Promise<UnitBlockCategory[]> {
  const { data } = await api.get<GetUnitBlockCategoriesRaw>(
    '/definitions/unit-block-categories',
    {
      params: {
        ...(params.name ? { name: params.name } : {}),
        ...(params.is_active !== undefined
          ? { is_active: params.is_active }
          : {}),
      },
      signal,
    },
  );

  return Array.isArray(data?.result?.unit_block_categories)
    ? data.result.unit_block_categories
    : [];
}

export async function createUnitBlockCategory(
  payload: CreateUnitBlockCategoryDto,
): Promise<void> {
  await api.post('/definitions/unit-block-categories', {
    unit_block_categories: [payload],
  });
}

export async function updateUnitBlockCategory(
  categoryId: number,
  payload: UpdateUnitBlockCategoryDto,
): Promise<void> {
  await api.post(
    `/definitions/unit-block-categories/update/${categoryId}`,
    payload,
  );
}
