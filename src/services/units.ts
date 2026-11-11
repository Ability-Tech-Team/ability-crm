import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CustomerUnit {
  customer_id: number;
  mobile_number: string | null;
  customer_name: string;
  customer_code: string | null;
  customer_type_id: number | null;
  customer_type_name: string | null;
  marital_status_id: number | null;
  marital_status_name: string | null;
  religion_id: number | null;
  religion_name: string | null;
  country_id: number | null;
  country_name: string | null;
  id_type_id: number | null;
  id_type_name: string | null;
  id_number?: string | null;
  ownership_type_id: number | null;
  ownership_type_name: string | null;
  owner_type_name?: string | null;
  sign_date: string | null;
  contract_number: string | null;
  /** The ownership row, for `POST /customers/ownership/update/:id`. */
  customer_unit_id?: number | null;
  fm_contract_number?: string | null;
  owner_type_id?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  is_owner?: number | boolean | null;
  email?: string | null;
  birth_date?: string | null;
}

export interface UnitLocation {
  id: number;
  name: string;
  parent_location_id: number | null;
  is_active: number;
  children: UnitLocation[];
}

export interface UnitActiveBlock {
  id: number;
  category_id: number;
  category_name: string;
  /** "finance" | "legal" */
  block_type: string;
  is_legal: number;
  is_active: number;
  reason: string;
}

export interface Unit {
  id: number;
  unit_id?: number;
  unit_number: string;
  sub_project_code?: string;
  project_id: number;
  unit_specification_id: number;
  notes: string | null;
  is_active: number;
  is_broker: number;
  delivery_date: string | null;
  contracting_date: string | null;
  created_at: string;
  updated_at: string | null;
  is_eligible_for_rent: number;
  rental_company_id?: number | null;
  rental_company_name?: string | null;
  is_locked: number;
  locked_by: string | null;
  /**
   * Reads "legal" whenever a legal block stands, alone or alongside a
   * finance one, and "finance/<reason>" when only a finance block does.
   * Use `active_unit_blocks` to tell which kinds are actually in force.
   */
  lock_reason?: string | null;
  project_name: string;
  unit_customers_count?: number;
  unit_specifications: {
    id: number;
    unit_type_id: number;
    location_id: number;
    address: string;
    total_area: string;
    floor: number;
    room_no: number;
    path_room_no: number;
    living_room_no: number;
    balcony_no: number;
    is_furnished: number;
    unit_type_name: string;
    locations?: UnitLocation[];
  } | null;
  /** Live blocks on the unit. A unit may hold one legal AND one finance block. */
  active_unit_blocks?: UnitActiveBlock[];
  customer_units: CustomerUnit[];
  /** Uploaded debt; null if never uploaded. See `getUnitDebitAmount`. */
  debit_amount?: number | string | null;
  /** When the last debt upload set it (Cairo time), or null. */
  debt_updated_at?: string | null;
}

interface GetUnitsRaw {
  result?: {
    totalCount?: number;
    totalPages?: number;
    currentPage?: number;
    units?: Unit[];
  } | null;
  success: boolean;
}

export interface GetUnitsResponse {
  units: Unit[];
  totalCount: number;
}

export interface GetUnitsParams {
  unit_id?: number;
  unit_number?: string;
  is_exact?: boolean;
  project_id?: number;
  is_active?: number;
  is_locked?: number;
  is_furnished?: number;
  is_eligible_for_rent?: number;
  rental_company_id?: number;
  delivery_date?: string;
  ownership_id?: number;
  all_units?: number;
  /** 1 = only units that currently hold a block. */
  blocked_units?: number;
  /** With `blocked_units`: 0 = holding a finance block, 1 = a legal one. */
  is_legal?: number;
  page?: number;
  limit?: number;
}

function normalizeUnit(unit: Unit): Unit {
  return {
    ...unit,
    unit_id: unit.unit_id ?? unit.id,
  };
}

// ─── API calls ───────────────────────────────────────────────

export async function getUnits(
  params: GetUnitsParams = {},
  signal?: AbortSignal,
): Promise<GetUnitsResponse> {
  const response = await api.get<GetUnitsRaw>('/projects/units', {
    params: {
      ...(params.unit_id ? { unit_id: params.unit_id } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.is_exact !== undefined
        ? { is_exact: params.is_exact ? 1 : 0 }
        : {}),
      ...(params.project_id ? { project_id: params.project_id } : {}),
      ...(params.is_active !== undefined
        ? { is_active: params.is_active }
        : {}),
      ...(params.is_furnished !== undefined
        ? { is_furnished: params.is_furnished }
        : {}),
      ...(params.is_locked !== undefined
        ? { is_locked: params.is_locked }
        : {}),
      ...(params.is_eligible_for_rent !== undefined
        ? { is_eligible_for_rent: params.is_eligible_for_rent }
        : {}),
      ...(params.rental_company_id
        ? { rental_company_id: params.rental_company_id }
        : {}),
      ...(params.delivery_date ? { delivery_date: params.delivery_date } : {}),
      ...(params.ownership_id ? { ownership_id: params.ownership_id } : {}),
      ...(params.all_units ? { all_units: params.all_units } : {}),
      ...(params.blocked_units ? { blocked_units: params.blocked_units } : {}),
      // `is_legal: 0` means "finance", not "no filter", so no truthy check.
      ...(params.is_legal !== undefined ? { is_legal: params.is_legal } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const units = Array.isArray(response.data?.result?.units)
    ? response.data.result.units.map((unit) => normalizeUnit(unit))
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : units.length;

  return { units, totalCount };
}

export async function getUnitById(
  unitId: number,
  signal?: AbortSignal,
): Promise<Unit | null> {
  if (!Number.isFinite(unitId) || unitId <= 0) {
    return null;
  }

  const { units } = await getUnits({ unit_id: unitId, limit: 1 }, signal);

  return units[0] ?? null;
}

export interface UpdateUnitPayload {
  unit_id?: number;
  is_locked?: number;
  lock_reason?: string;
  is_eligible_for_rent?: number;
  is_active?: number;
  is_broker?: number;
  notes?: string;
  delivery_date?: string;
  contracting_date?: string;
  project_id?: number;
  unit_specifications?: {
    unit_type_id?: number;
    location_id?: number;
    address?: string;
    total_area?: number;
    floor?: number;
    room_no?: number;
    path_room_no?: number;
    living_room_no?: number;
    balcony_no?: number;
    is_furnished?: number;
  };
}

export async function updateUnit(
  unitId: number,
  payload: UpdateUnitPayload,
): Promise<void> {
  await api.post(`/projects/units/update/${unitId}`, payload);
}

// ─── Ownership History ──────────────────────────────────────

export interface OwnershipHistory {
  id: string;
  customer_id: number;
  customer_name: string;
  customer_code: string;
  contract: string | null;
  sign_date: string | null;
  end_date: string | null;
  id_number: string | null;
  ownership_type_id: number;
  ownership_type_name: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

interface GetOwnershipHistoryRaw {
  result?: {
    total_count?: number;
    total_pages?: number;
    ownership_history?: OwnershipHistory[];
  } | null;
  success: boolean;
}

export interface GetOwnershipHistoryResponse {
  ownershipHistory: OwnershipHistory[];
  totalCount: number;
}

export async function getOwnershipHistory(
  unitId: number,
  params: {
    unit_id?: number;
    page?: number;
    limit?: number;
    ownership_id?: number;
  } = {},
  signal?: AbortSignal,
): Promise<GetOwnershipHistoryResponse> {
  const response = await api.get<GetOwnershipHistoryRaw>(
    `/projects/units/${unitId}/owner-ship-history`,
    {
      params: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        ...(params.unit_id ? { unit_id: params.unit_id } : {}),
        ...(params.ownership_id ? { ownership_id: params.ownership_id } : {}),
      },
      signal,
    },
  );

  const ownershipHistory = Array.isArray(
    response.data?.result?.ownership_history,
  )
    ? response.data.result.ownership_history
    : [];

  const totalCount =
    typeof response.data?.result?.total_count === 'number'
      ? response.data.result.total_count
      : ownershipHistory.length;

  return { ownershipHistory, totalCount };
}

/**
 * The customer a unit-level upload names (`customer_id` is required on
 * `POST /projects/units/media/upload`): the unit's owner, else its first
 * linked customer, else null.
 */
export function getPrimaryCustomer(
  unit: Pick<Unit, 'customer_units'> | null | undefined,
): CustomerUnit | null {
  const customers = unit?.customer_units ?? [];
  return customers.find((cu) => Boolean(cu.is_owner)) ?? customers[0] ?? null;
}

// ─── Unit Debt ──────────────────────────────────────────────

/**
 * The unit's debt as last uploaded through "Import Unit Debts"
 * (`debit_amount`), or null if never uploaded. Replaces Amer CRM's SAP debt
 * route.
 */
export function getUnitDebitAmount(
  unit: Pick<Unit, 'debit_amount'> | null | undefined,
): number | null {
  const raw = unit?.debit_amount;

  if (raw === null || raw === undefined || raw === '') {
    return null;
  }

  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}
