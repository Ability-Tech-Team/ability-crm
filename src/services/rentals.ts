import api from '@/src/lib/http';
import type { CustomerUnit, Unit, UnitLocation } from '@/src/services/units';

export const RENTAL_STATUSES = {
  CREATED: 'Created',
  FEES_COLLECTION_PENDING: 'Fees Collection Pending',
  ACTIVE: 'Active',
  FINISHED: 'Finished',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  TERMINATED: 'Terminated',
} as const;

export const RENTAL_INVOICE_TYPES = {
  DAILY_FEES: 'Rental daily fees',
  ACCESS_CARD_INSURANCE: 'Access Card Insurance',
  SECURITY_DEPOSIT: 'Security Deposit',
} as const;

export type RentalStatus =
  (typeof RENTAL_STATUSES)[keyof typeof RENTAL_STATUSES];

export type RentalInvoiceType =
  (typeof RENTAL_INVOICE_TYPES)[keyof typeof RENTAL_INVOICE_TYPES];

export interface RentalAttachment {
  id: string;
  name: string;
  file_path?: string;
}

export interface RentalRelative {
  id: string;
  name: string;
  gender: string;
  id_number?: string;
  email?: string;
  phone?: string;
  relation?: string;
  attachments?: RentalAttachment[];
}

export interface RentalVehicle {
  id: string;
  brand: string;
  model: string;
  plate_text: string;
  plate_number: string;
  attachments?: RentalAttachment[];
}

interface RentalInvoiceLookup {
  id?: number | string;
  ar_name?: string;
  en_name?: string;
  name?: string;
}

export interface RentalInvoice {
  id: string;
  invoice_number?: string;
  invoice_type: RentalInvoiceType | string | RentalInvoiceLookup;
  invoice_status?: string | RentalInvoiceLookup;
  amount: number;
  total_amount?: number | string;
  notes?: string;
  access_card_insurance?: boolean;
  status?: string;
  created_at: string;
}

export interface RentalStatusHistoryEntry {
  id: string;
  action: string;
  status: RentalStatus;
  notes?: string;
  created_at: string;
}

export interface RentalCheckoutSummary {
  penalty_amount?: number;
  tenant_rating?: string;
  remarks?: string;
  checked_out_at?: string;
}

export interface CreateRentalPayload {
  unit_id: number;
  customer_id?: number;
  unit_number: string;
  project_name?: string;
  customer_name?: string;
  rental_company_id?: number | null;
  rental_company_name?: string;
  tenant_name: string;
  gender: string;
  id_type: string;
  id_number: string;
  email?: string;
  phone: string;
  start_date: string;
  sign_date?: string;
  end_date: string;
  total_tenants: number;
  access_card_number?: string;
  notes?: string;
  tenant_attachments?: RentalAttachment[];
  relatives?: RentalRelative[];
  vehicles?: RentalVehicle[];
}

export interface RentalRecord extends CreateRentalPayload {
  id: number;
  rental_code: string;
  project_id?: number;
  initial_status: typeof RENTAL_STATUSES.CREATED;
  status: RentalStatus;
  rental_status_id?: number | null;
  sign_date?: string;
  created_at: string;
  updated_at: string;
  invoices?: RentalInvoice[];
  status_history?: RentalStatusHistoryEntry[];
  checkout_summary?: RentalCheckoutSummary;
  termination_reason?: string;
  penalty_amount?: number | null;
  tenant_rating?: string | null;
  request_source_name?: string | null;
}

export interface GetRentalsParams {
  customer_name?: string;
  mobile_number?: string;
  id_number?: string;
  start_date?: string;
  end_date?: string;
  rental_status?: number | RentalStatus | string;
  unit_number?: string;
  unit_id?: number;
  project_id?: number;
  onlyActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateRentalInvoicePayload {
  invoice_type?: RentalInvoiceType | string;
  invoice_type_id?: number;
  amount?: number;
  total_amount?: number;
  notes?: string;
  access_card_insurance?: boolean;
}

export interface ChangeRentalReservationPayload {
  unit_number?: string;
  unit_id?: number;
  new_unit_number?: string;
  new_unit_id?: number;
  access_card_number?: string;
  end_date?: string;
  new_end_date?: string;
  notes?: string;
}

export interface RentalCheckoutPayload {
  penalty_amount?: number;
  tenant_rating?: string | number;
  remarks?: string;
  penalty_notes?: string;
}

export interface ExtendRentalPayload {
  new_end_date: string;
}

export interface TerminateRentalPayload {
  termination_reason: string;
  penalty_amount?: number;
}

export interface GetRentalsResponse {
  rentals: RentalRecord[];
  totalCount: number;
}

export interface GetRentalUnitsParams {
  unit_number?: string;
  unit_id?: number;
  is_exact?: boolean;
  page?: number;
  limit?: number;
}

export interface GetRentalUnitsResponse {
  units: Unit[];
  totalCount: number;
}

interface GetRentalUnitsRaw {
  success: boolean;
  result?:
    | {
        units?: unknown[];
        rental_units?: unknown[];
        items?: unknown[];
        data?: unknown[];
        total_count?: number;
        totalCount?: number;
        count?: number;
      }
    | unknown[]
    | null;
}

interface GetReservationsRaw {
  success?: boolean;
  result?:
    | {
        totalCount?: number;
        total_count?: number;
        count?: number;
        currentPage?: number;
        current_page?: number;
        totalPages?: number;
        total_pages?: number;
        rentals?: unknown[];
        history?: unknown[];
        reservations?: unknown[];
        items?: unknown[];
        data?: unknown[];
      }
    | unknown[]
    | null;
}

interface GetReservationByIdRaw {
  success?: boolean;
  result?: {
    reservation?: unknown;
    tenant?: unknown;
    relatives?: unknown[];
    media?: unknown[];
    invoices?: unknown[];
    status_history?: unknown[];
    history?: unknown[];
  } | null;
}

const RENTAL_STATUS_ID_MAP: Record<number, RentalStatus> = {
  1: RENTAL_STATUSES.CREATED,
  2: RENTAL_STATUSES.FEES_COLLECTION_PENDING,
  3: RENTAL_STATUSES.ACTIVE,
  4: RENTAL_STATUSES.FINISHED,
  5: RENTAL_STATUSES.COMPLETED,
  6: RENTAL_STATUSES.CANCELLED,
  7: RENTAL_STATUSES.TERMINATED,
};

const RENTAL_STATUS_TO_ID_MAP: Record<RentalStatus, number> = {
  [RENTAL_STATUSES.CREATED]: 1,
  [RENTAL_STATUSES.FEES_COLLECTION_PENDING]: 2,
  [RENTAL_STATUSES.ACTIVE]: 3,
  [RENTAL_STATUSES.FINISHED]: 4,
  [RENTAL_STATUSES.COMPLETED]: 5,
  [RENTAL_STATUSES.CANCELLED]: 6,
  [RENTAL_STATUSES.TERMINATED]: 7,
};

const RENTAL_INVOICE_TYPE_ID_MAP: Record<string, number> = {
  [normalizeValue(RENTAL_INVOICE_TYPES.DAILY_FEES)]: 1,
  [normalizeValue(RENTAL_INVOICE_TYPES.ACCESS_CARD_INSURANCE)]: 2,
  [normalizeValue(RENTAL_INVOICE_TYPES.SECURITY_DEPOSIT)]: 3,
};

const RENTAL_INVOICE_TYPE_BY_ID_MAP: Record<number, string> = {
  1: RENTAL_INVOICE_TYPES.DAILY_FEES,
  2: RENTAL_INVOICE_TYPES.ACCESS_CARD_INSURANCE,
  3: RENTAL_INVOICE_TYPES.SECURITY_DEPOSIT,
};

const RENTAL_TENANT_RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Poor',
  3: 'Fair',
  4: 'Good',
  5: 'Excellent',
};

function toNullableNumber(value: unknown): number | null {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : null;
}

function toNumber(value: unknown, fallback = 0): number {
  return toNullableNumber(value) ?? fallback;
}

function toNullableString(value: unknown): string | null {
  if (typeof value === 'string') {
    return value;
  }

  if (value == null) {
    return null;
  }

  if (typeof value === 'object') {
    const candidate = value as Record<string, unknown>;

    if (typeof candidate.date === 'string') {
      return candidate.date;
    }

    if (typeof candidate.dateTime === 'string') {
      return candidate.dateTime;
    }

    if (typeof candidate.time === 'string') {
      return candidate.time;
    }

    if (typeof candidate.en_name === 'string') {
      return candidate.en_name;
    }

    if (typeof candidate.name === 'string') {
      return candidate.name;
    }
  }

  return String(value);
}

function toStringValue(value: unknown, fallback = ''): string {
  return toNullableString(value) ?? fallback;
}

function normalizeLocations(rawLocations: unknown): UnitLocation[] {
  return Array.isArray(rawLocations) ? (rawLocations as UnitLocation[]) : [];
}

function normalizeCustomerUnit(rawCustomer: unknown): CustomerUnit {
  const candidate =
    rawCustomer && typeof rawCustomer === 'object'
      ? (rawCustomer as Record<string, unknown>)
      : {};

  return {
    customer_id: toNumber(candidate.customer_id ?? candidate.id),
    mobile_number: toNullableString(
      candidate.mobile_number ?? candidate.phone_number ?? candidate.phone,
    ),
    customer_name: toStringValue(
      candidate.customer_name ?? candidate.name,
      '—',
    ),
    customer_code: toNullableString(candidate.customer_code ?? candidate.code),
    customer_type_id: toNullableNumber(candidate.customer_type_id),
    customer_type_name: toNullableString(candidate.customer_type_name),
    marital_status_id: toNullableNumber(candidate.marital_status_id),
    marital_status_name: toNullableString(candidate.marital_status_name),
    religion_id: toNullableNumber(candidate.religion_id),
    religion_name: toNullableString(candidate.religion_name),
    country_id: toNullableNumber(candidate.country_id),
    country_name: toNullableString(candidate.country_name),
    id_type_id: toNullableNumber(candidate.id_type_id),
    id_type_name: toNullableString(candidate.id_type_name),
    ownership_type_id: toNullableNumber(candidate.ownership_type_id),
    ownership_type_name: toNullableString(candidate.ownership_type_name),
    sign_date: toNullableString(candidate.sign_date),
    contract_number: toNullableString(candidate.contract_number),
  };
}

function normalizeCustomerUnits(
  rawUnit: Record<string, unknown>,
): CustomerUnit[] {
  if (Array.isArray(rawUnit.customer_units)) {
    return rawUnit.customer_units.map((customer) =>
      normalizeCustomerUnit(customer),
    );
  }

  const embeddedCustomer =
    rawUnit.owner ?? rawUnit.customer ?? rawUnit.current_customer;
  if (embeddedCustomer && typeof embeddedCustomer === 'object') {
    return [normalizeCustomerUnit(embeddedCustomer)];
  }

  if (
    rawUnit.customer_name != null ||
    rawUnit.customer_id != null ||
    rawUnit.mobile_number != null ||
    rawUnit.customer_code != null
  ) {
    return [normalizeCustomerUnit(rawUnit)];
  }

  return [];
}

function normalizeRentalUnit(rawUnit: unknown): Unit {
  const candidate =
    rawUnit && typeof rawUnit === 'object'
      ? (rawUnit as Record<string, unknown>)
      : {};
  const specification =
    candidate.unit_specifications &&
    typeof candidate.unit_specifications === 'object'
      ? (candidate.unit_specifications as Record<string, unknown>)
      : {};

  return {
    id: toNumber(candidate.id ?? candidate.unit_id),
    unit_number: toStringValue(
      candidate.unit_number ?? candidate.unit_no ?? candidate.unitNumber,
      '—',
    ),
    project_id: toNumber(candidate.project_id),
    unit_specification_id: toNumber(
      candidate.unit_specification_id ?? specification.id,
    ),
    notes: toNullableString(candidate.notes),
    is_active: toNumber(candidate.is_active, 1),
    is_broker: toNumber(candidate.is_broker),
    delivery_date: toNullableString(candidate.delivery_date),
    contracting_date: toNullableString(candidate.contracting_date),
    created_at: toStringValue(candidate.created_at),
    updated_at: toNullableString(candidate.updated_at),
    is_eligible_for_rent: toNumber(
      candidate.is_eligible_for_rent ??
        candidate.eligible_for_rent ??
        candidate.isEligibleForRent,
    ),
    is_locked: toNumber(candidate.is_locked ?? candidate.isLocked),
    locked_by: toNullableString(candidate.locked_by ?? candidate.lockedBy),
    project_name: toStringValue(
      candidate.project_name ?? candidate.project ?? candidate.projectName,
      '—',
    ),
    unit_specifications: {
      id: toNumber(specification.id),
      unit_type_id: toNumber(specification.unit_type_id),
      location_id: toNumber(specification.location_id),
      address: toStringValue(specification.address),
      total_area: toStringValue(
        specification.total_area ?? candidate.total_area,
      ),
      floor: toNumber(specification.floor),
      room_no: toNumber(specification.room_no),
      path_room_no: toNumber(specification.path_room_no),
      living_room_no: toNumber(specification.living_room_no),
      balcony_no: toNumber(specification.balcony_no),
      is_furnished: toNumber(
        specification.is_furnished ?? candidate.is_furnished,
      ),
      unit_type_name: toStringValue(
        specification.unit_type_name ??
          candidate.unit_type_name ??
          candidate.unit_type ??
          candidate.unitTypeName,
        '—',
      ),
      locations: normalizeLocations(
        specification.locations ?? candidate.locations,
      ),
    },
    customer_units: normalizeCustomerUnits(candidate),
    rental_company_id: toNullableNumber(
      candidate.rental_company_id ??
        candidate.rentalCompanyId ??
        specification.rental_company_id ??
        specification.rentalCompanyId,
    ),
    rental_company_name:
      toNullableString(
        candidate.rental_company_name ??
          candidate.rentalCompanyName ??
          specification.rental_company_name ??
          specification.rentalCompanyName,
      ) ?? undefined,
    has_active_booking: toNumber(
      candidate.has_active_booking ??
        candidate.hasActiveBooking ??
        candidate.is_booked ??
        candidate.isBooked,
    ),
    rental_status:
      toNullableString(candidate.rental_status ?? candidate.rentalStatus) ??
      undefined,
  } as Unit;
}

function extractRentalUnits(data: GetRentalUnitsRaw): Unit[] {
  if (Array.isArray(data.result)) {
    return data.result.map((unit) => normalizeRentalUnit(unit));
  }

  if (!data.result || typeof data.result !== 'object') {
    return [];
  }

  const result = data.result as {
    units?: unknown[];
    rental_units?: unknown[];
    items?: unknown[];
    data?: unknown[];
  };

  const rawUnits = Array.isArray(result.units)
    ? result.units
    : Array.isArray(result.rental_units)
      ? result.rental_units
      : Array.isArray(result.items)
        ? result.items
        : Array.isArray(result.data)
          ? result.data
          : [];

  return rawUnits.map((unit) => normalizeRentalUnit(unit));
}

export async function getRentalUnits(
  params: GetRentalUnitsParams = {},
  signal?: AbortSignal,
): Promise<GetRentalUnitsResponse> {
  try {
    const response = await api.get<GetRentalUnitsRaw>('/rentals/units', {
      params: {
        ...(params.unit_number ? { unit_number: params.unit_number } : {}),
        ...(params.unit_id ? { unit_id: params.unit_id } : {}),
        ...(params.is_exact !== undefined
          ? { is_exact: params.is_exact ? 1 : 0 }
          : {}),
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      signal,
    });

    const units = extractRentalUnits(response.data);
    const result =
      response.data.result && typeof response.data.result === 'object'
        ? response.data.result
        : null;
    const totalCount =
      toNullableNumber(
        (result as { total_count?: number } | null)?.total_count,
      ) ??
      toNullableNumber(
        (result as { totalCount?: number } | null)?.totalCount,
      ) ??
      toNullableNumber((result as { count?: number } | null)?.count) ??
      units.length;

    return { units, totalCount };
  } catch (error: unknown) {
    const statusCode = (error as { response?: { status?: number } }).response
      ?.status;
    if (statusCode === 404) {
      return { units: [], totalCount: 0 };
    }

    throw error;
  }
}

function hydrateRentalRecord(rental: RentalRecord): RentalRecord {
  return {
    ...rental,
    email: rental.email?.trim() || undefined,
    access_card_number: rental.access_card_number?.trim() || undefined,
    notes: rental.notes?.trim() || undefined,
    tenant_attachments: sanitizeAttachments(rental.tenant_attachments),
    relatives: sanitizeRelatives(rental.relatives),
    vehicles: sanitizeVehicles(rental.vehicles),
    invoices: Array.isArray(rental.invoices) ? rental.invoices : [],
    status_history: Array.isArray(rental.status_history)
      ? rental.status_history
      : [],
    checkout_summary: rental.checkout_summary ?? undefined,
  };
}

function normalizeValue(value?: string) {
  return value?.trim().toLowerCase() ?? '';
}

export function isRentalCurrentlyActive(rental: RentalRecord) {
  const status = normalizeValue(rental.status);
  if (status === normalizeValue(RENTAL_STATUSES.CANCELLED)) {
    return false;
  }

  if (
    status === normalizeValue(RENTAL_STATUSES.COMPLETED) ||
    status === normalizeValue(RENTAL_STATUSES.FINISHED)
  ) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const endDate = new Date(rental.end_date);
  if (Number.isNaN(endDate.getTime())) {
    return true;
  }

  endDate.setHours(0, 0, 0, 0);
  return endDate.getTime() >= today.getTime();
}

function buildRentalCode(id: number) {
  return `RNT-${String(id).padStart(5, '0')}`;
}

function createHistoryEntry(
  action: string,
  status: RentalStatus,
  notes?: string,
  createdAt = new Date().toISOString(),
): RentalStatusHistoryEntry {
  return {
    id: `history-${createdAt}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    status,
    notes: notes?.trim() || undefined,
    created_at: createdAt,
  };
}

function sanitizeAttachments(attachments?: RentalAttachment[]) {
  return (attachments ?? []).filter(
    (attachment) =>
      typeof attachment.name === 'string' && attachment.name.trim().length > 0,
  );
}

function sanitizeRelatives(relatives?: RentalRelative[]) {
  return (relatives ?? [])
    .map((relative) => ({
      ...relative,
      name: relative.name.trim(),
      gender: relative.gender.trim(),
      email: relative.email?.trim() || undefined,
      phone: relative.phone?.trim() || undefined,
      relation: relative.relation?.trim() || undefined,
      attachments: sanitizeAttachments(relative.attachments),
    }))
    .filter(
      (relative) =>
        relative.name ||
        relative.gender ||
        relative.email ||
        relative.phone ||
        relative.relation ||
        (relative.attachments?.length ?? 0) > 0,
    );
}

function sanitizeVehicles(vehicles?: RentalVehicle[]) {
  return (vehicles ?? [])
    .map((vehicle) => ({
      ...vehicle,
      brand: vehicle.brand.trim(),
      model: vehicle.model.trim(),
      plate_text: vehicle.plate_text.trim(),
      plate_number: vehicle.plate_number.trim(),
      attachments: sanitizeAttachments(vehicle.attachments),
    }))
    .filter(
      (vehicle) =>
        vehicle.brand ||
        vehicle.model ||
        vehicle.plate_text ||
        vehicle.plate_number ||
        (vehicle.attachments?.length ?? 0) > 0,
    );
}

function resolveRentalStatus(statusId: number | null, rawStatus: unknown) {
  const normalizedStatus = normalizeValue(toNullableString(rawStatus) ?? '');

  if (
    normalizedStatus.includes('fees collection') ||
    normalizedStatus.includes('pending') ||
    normalizedStatus.includes('بانتظار') ||
    normalizedStatus.includes('تحصيل')
  ) {
    return RENTAL_STATUSES.FEES_COLLECTION_PENDING;
  }

  if (
    normalizedStatus.includes('active') ||
    normalizedStatus.includes('نشط') ||
    normalizedStatus.includes('فعال')
  ) {
    return RENTAL_STATUSES.ACTIVE;
  }

  if (
    normalizedStatus.includes('finished') ||
    normalizedStatus.includes('منتهي')
  ) {
    return RENTAL_STATUSES.FINISHED;
  }

  if (
    normalizedStatus.includes('completed') ||
    normalizedStatus.includes('مكتمل')
  ) {
    return RENTAL_STATUSES.COMPLETED;
  }

  if (
    normalizedStatus.includes('cancel') ||
    normalizedStatus.includes('ملغ') ||
    normalizedStatus.includes('إلغاء')
  ) {
    return RENTAL_STATUSES.CANCELLED;
  }

  if (
    normalizedStatus.includes('terminat') ||
    normalizedStatus.includes('منهي') ||
    normalizedStatus.includes('إنهاء')
  ) {
    return RENTAL_STATUSES.TERMINATED;
  }

  if (
    normalizedStatus.includes('created') ||
    normalizedStatus.includes('إنشاء') ||
    normalizedStatus.includes('جديد')
  ) {
    return RENTAL_STATUSES.CREATED;
  }

  return (
    (statusId != null && RENTAL_STATUS_ID_MAP[statusId]) ||
    RENTAL_STATUSES.CREATED
  );
}

function getRentalStatusId(status?: RentalStatus | string) {
  if (!status) {
    return undefined;
  }

  const normalizedStatus = normalizeValue(status);

  if (
    normalizedStatus.includes('fees collection') ||
    normalizedStatus.includes('pending') ||
    normalizedStatus.includes('بانتظار') ||
    normalizedStatus.includes('تحصيل')
  ) {
    return RENTAL_STATUS_TO_ID_MAP[RENTAL_STATUSES.FEES_COLLECTION_PENDING];
  }

  if (
    normalizedStatus.includes('active') ||
    normalizedStatus.includes('نشط') ||
    normalizedStatus.includes('فعال')
  ) {
    return RENTAL_STATUS_TO_ID_MAP[RENTAL_STATUSES.ACTIVE];
  }

  if (
    normalizedStatus.includes('finished') ||
    normalizedStatus.includes('منتهي')
  ) {
    return RENTAL_STATUS_TO_ID_MAP[RENTAL_STATUSES.FINISHED];
  }

  if (
    normalizedStatus.includes('completed') ||
    normalizedStatus.includes('مكتمل')
  ) {
    return RENTAL_STATUS_TO_ID_MAP[RENTAL_STATUSES.COMPLETED];
  }

  if (
    normalizedStatus.includes('cancel') ||
    normalizedStatus.includes('ملغ') ||
    normalizedStatus.includes('إلغاء')
  ) {
    return RENTAL_STATUS_TO_ID_MAP[RENTAL_STATUSES.CANCELLED];
  }

  if (
    normalizedStatus.includes('terminat') ||
    normalizedStatus.includes('منهي') ||
    normalizedStatus.includes('إنهاء')
  ) {
    return RENTAL_STATUS_TO_ID_MAP[RENTAL_STATUSES.TERMINATED];
  }

  if (
    normalizedStatus.includes('created') ||
    normalizedStatus.includes('إنشاء') ||
    normalizedStatus.includes('جديد')
  ) {
    return RENTAL_STATUS_TO_ID_MAP[RENTAL_STATUSES.CREATED];
  }

  return undefined;
}

function normalizeIdTypeValue(rawValue: unknown, rawId: unknown) {
  const id = toNullableNumber(rawId);
  if (id != null) {
    return String(id);
  }

  const normalizedValue = normalizeValue(toNullableString(rawValue) ?? '');
  if (normalizedValue.includes('national')) {
    return '1';
  }

  if (normalizedValue.includes('passport')) {
    return '2';
  }

  return toStringValue(rawValue);
}

function normalizeTenantRatingLabel(rawRating: unknown) {
  const numericRating = toNullableNumber(rawRating);
  if (numericRating != null) {
    return RENTAL_TENANT_RATING_LABELS[numericRating] ?? String(numericRating);
  }

  const ratingValue = toNullableString(rawRating);
  if (!ratingValue) {
    return undefined;
  }

  const normalizedRating = normalizeValue(ratingValue);
  if (normalizedRating.includes('excellent')) {
    return 'Excellent';
  }

  if (normalizedRating.includes('good')) {
    return 'Good';
  }

  if (normalizedRating.includes('fair')) {
    return 'Fair';
  }

  if (normalizedRating.includes('poor')) {
    return 'Poor';
  }

  return ratingValue;
}

function getTenantRatingScore(rating?: string | number) {
  const numericRating = toNullableNumber(rating);
  if (numericRating != null) {
    return numericRating;
  }

  const normalizedRating = normalizeValue(
    typeof rating === 'string' ? rating : undefined,
  );

  if (normalizedRating.includes('excellent')) {
    return 5;
  }

  if (normalizedRating.includes('good')) {
    return 4;
  }

  if (normalizedRating.includes('fair')) {
    return 3;
  }

  if (normalizedRating.includes('poor')) {
    return 2;
  }

  return undefined;
}

function getInvoiceTypeId(value?: string | number) {
  const numericValue = toNullableNumber(value);
  if (numericValue != null) {
    return numericValue;
  }

  const normalizedValue = normalizeValue(
    typeof value === 'string' ? value : undefined,
  );
  return normalizedValue
    ? RENTAL_INVOICE_TYPE_ID_MAP[normalizedValue]
    : undefined;
}

function resolveInvoiceTypeLabel(rawInvoice: Record<string, unknown>) {
  const nestedType =
    rawInvoice.invoice_type && typeof rawInvoice.invoice_type === 'object'
      ? (rawInvoice.invoice_type as Record<string, unknown>)
      : {};
  const typeId = toNullableNumber(rawInvoice.invoice_type_id ?? nestedType.id);

  return (
    toNullableString(
      rawInvoice.invoice_type_name ??
        nestedType.ar_name ??
        nestedType.en_name ??
        nestedType.name ??
        rawInvoice.invoice_type,
    ) ??
    (typeId != null ? RENTAL_INVOICE_TYPE_BY_ID_MAP[typeId] : null) ??
    RENTAL_INVOICE_TYPES.DAILY_FEES
  );
}

function resolveInvoiceStatusLabel(rawInvoice: Record<string, unknown>) {
  const nestedStatus =
    rawInvoice.invoice_status && typeof rawInvoice.invoice_status === 'object'
      ? (rawInvoice.invoice_status as Record<string, unknown>)
      : {};

  return (
    toNullableString(
      rawInvoice.invoice_status_name ??
        nestedStatus.ar_name ??
        nestedStatus.en_name ??
        nestedStatus.name ??
        rawInvoice.invoice_status,
    ) ?? 'Created'
  );
}

function normalizeRentalAttachment(
  rawAttachment: unknown,
  fallbackId: string,
): RentalAttachment {
  const candidate =
    rawAttachment && typeof rawAttachment === 'object'
      ? (rawAttachment as Record<string, unknown>)
      : {};

  return {
    id: toStringValue(
      candidate.id ??
        candidate.file_id ??
        candidate.media_id ??
        candidate.path ??
        fallbackId,
      fallbackId,
    ),
    name: toStringValue(
      candidate.name ??
        candidate.file_name ??
        candidate.originalname ??
        candidate.url ??
        candidate.path,
      'Attachment',
    ),
    file_path:
      toNullableString(candidate.file_path) ??
      toNullableString(candidate.url) ??
      toNullableString(candidate.path) ??
      undefined,
  };
}

function normalizeRentalVehicle(rawVehicle: unknown): RentalVehicle {
  const candidate =
    rawVehicle && typeof rawVehicle === 'object'
      ? (rawVehicle as Record<string, unknown>)
      : {};

  return {
    id: toStringValue(
      candidate.id,
      `vehicle-${Math.random().toString(36).slice(2, 8)}`,
    ),
    brand: toStringValue(candidate.make ?? candidate.brand),
    model: toStringValue(candidate.model),
    plate_text: toStringValue(candidate.plate_text),
    plate_number: toStringValue(candidate.plate_number),
    attachments: Array.isArray(candidate.attachments)
      ? candidate.attachments.map((attachment, index) =>
          normalizeRentalAttachment(attachment, `vehicle-attachment-${index}`),
        )
      : undefined,
  };
}

function normalizeRentalRelative(rawRelative: unknown): RentalRelative {
  const candidate =
    rawRelative && typeof rawRelative === 'object'
      ? (rawRelative as Record<string, unknown>)
      : {};

  return {
    id: toStringValue(
      candidate.id,
      `relative-${Math.random().toString(36).slice(2, 8)}`,
    ),
    name: toStringValue(candidate.customer_name ?? candidate.name, '—'),
    gender: toStringValue(
      candidate.gender ??
        (toNullableNumber(candidate.is_male) === 1 ? 'male' : 'female'),
      '',
    ),
    id_number:
      toNullableString(candidate.id_number ?? candidate.national_id) ??
      undefined,
    email: toNullableString(candidate.email) ?? undefined,
    phone:
      toNullableString(candidate.mobile_number ?? candidate.phone) ?? undefined,
    relation:
      toNullableString(candidate.relative_relation ?? candidate.relation) ??
      undefined,
    attachments: Array.isArray(candidate.attachments)
      ? candidate.attachments.map((attachment, index) =>
          normalizeRentalAttachment(attachment, `relative-attachment-${index}`),
        )
      : undefined,
  };
}

function normalizeRentalInvoice(rawInvoice: unknown): RentalInvoice {
  const candidate =
    rawInvoice && typeof rawInvoice === 'object'
      ? (rawInvoice as Record<string, unknown>)
      : {};

  const amount = toNumber(candidate.total_amount ?? candidate.amount);

  return {
    id: toStringValue(
      candidate.id,
      `invoice-${Math.random().toString(36).slice(2, 8)}`,
    ),
    invoice_number: toNullableString(candidate.invoice_number) ?? undefined,
    invoice_type: resolveInvoiceTypeLabel(candidate),
    invoice_status: resolveInvoiceStatusLabel(candidate),
    amount,
    total_amount: amount,
    notes: toNullableString(candidate.notes) ?? undefined,
    access_card_insurance: Boolean(candidate.access_card_insurance),
    status: resolveInvoiceStatusLabel(candidate),
    created_at: toStringValue(
      candidate.created_at ?? candidate.updated_at,
      new Date().toISOString(),
    ),
  };
}

function normalizeStatusHistoryEntry(
  rawEntry: unknown,
): RentalStatusHistoryEntry {
  const candidate =
    rawEntry && typeof rawEntry === 'object'
      ? (rawEntry as Record<string, unknown>)
      : {};

  const statusId = toNullableNumber(
    candidate.rental_status_id ?? candidate.status_id,
  );

  return createHistoryEntry(
    toStringValue(candidate.action ?? candidate.title, 'Status updated'),
    resolveRentalStatus(statusId, candidate.status ?? candidate.status_name),
    toNullableString(candidate.notes ?? candidate.description) ?? undefined,
    toStringValue(
      candidate.created_at ?? candidate.updated_at,
      new Date().toISOString(),
    ),
  );
}

function buildDerivedStatusHistory(
  reservation: Record<string, unknown>,
  invoices: RentalInvoice[],
  rawHistory?: unknown,
) {
  if (Array.isArray(rawHistory) && rawHistory.length > 0) {
    return rawHistory.map((entry) => normalizeStatusHistoryEntry(entry));
  }

  const statusId = toNullableNumber(
    reservation.rental_status_id ?? reservation.status_id,
  );
  const currentStatus = resolveRentalStatus(
    statusId,
    reservation.status ?? reservation.status_name,
  );
  const createdAt = toStringValue(
    reservation.created_at ?? reservation.sign_date ?? reservation.start_date,
    new Date().toISOString(),
  );
  const history: RentalStatusHistoryEntry[] = [
    createHistoryEntry(
      'Reservation created',
      RENTAL_STATUSES.CREATED,
      toNullableString(reservation.notes) ?? undefined,
      createdAt,
    ),
  ];

  invoices.forEach((invoice) => {
    history.push(
      createHistoryEntry(
        'Invoice issued',
        currentStatus,
        invoice.notes || `Invoice created: ${invoice.invoice_type}`,
        invoice.created_at,
      ),
    );
  });

  if (
    currentStatus === RENTAL_STATUSES.FINISHED ||
    currentStatus === RENTAL_STATUSES.COMPLETED
  ) {
    history.push(
      createHistoryEntry(
        'Checked out',
        currentStatus,
        toNullableString(reservation.penalty_notes ?? reservation.remarks) ??
          undefined,
        toStringValue(
          reservation.updated_at ?? reservation.end_date,
          createdAt,
        ),
      ),
    );
  }

  if (currentStatus === RENTAL_STATUSES.CANCELLED) {
    history.push(
      createHistoryEntry(
        'Reservation cancelled',
        currentStatus,
        toNullableString(reservation.termination_reason) ?? undefined,
        toStringValue(reservation.updated_at ?? createdAt, createdAt),
      ),
    );
  }

  return history.sort(
    (left, right) =>
      new Date(right.created_at).getTime() -
      new Date(left.created_at).getTime(),
  );
}

export function normalizeReservationRecord(
  rawReservation: unknown,
  detail?: GetReservationByIdRaw['result'] | null,
): RentalRecord {
  const reservation =
    rawReservation && typeof rawReservation === 'object'
      ? (rawReservation as Record<string, unknown>)
      : {};
  const tenant =
    detail?.tenant && typeof detail.tenant === 'object'
      ? (detail.tenant as Record<string, unknown>)
      : reservation.tenant && typeof reservation.tenant === 'object'
        ? (reservation.tenant as Record<string, unknown>)
        : {};
  const idType =
    tenant.id_type && typeof tenant.id_type === 'object'
      ? (tenant.id_type as Record<string, unknown>)
      : {};
  const rentalCompany =
    reservation.rental_company && typeof reservation.rental_company === 'object'
      ? (reservation.rental_company as Record<string, unknown>)
      : {};
  const statusId = toNullableNumber(
    reservation.rental_status_id ?? reservation.status_id,
  );
  const status = resolveRentalStatus(
    statusId,
    reservation.status ??
      reservation.status_name ??
      reservation.rental_status ??
      reservation.rental_status_name,
  );
  const invoices = (
    Array.isArray(detail?.invoices)
      ? detail?.invoices
      : Array.isArray(reservation.invoices)
        ? reservation.invoices
        : []
  ).map((invoice) => normalizeRentalInvoice(invoice));
  const tenantAttachments = (
    Array.isArray(detail?.media)
      ? detail?.media
      : Array.isArray(reservation.media)
        ? reservation.media
        : []
  ).map((attachment, index) =>
    normalizeRentalAttachment(attachment, `attachment-${index}`),
  );
  const relatives = (
    Array.isArray(detail?.relatives)
      ? detail?.relatives
      : Array.isArray(reservation.relatives)
        ? reservation.relatives
        : []
  ).map((relative) => normalizeRentalRelative(relative));
  const vehicles = (
    Array.isArray(tenant.cars)
      ? tenant.cars
      : Array.isArray(reservation.cars)
        ? reservation.cars
        : []
  ).map((vehicle) => normalizeRentalVehicle(vehicle));
  const createdAt = toStringValue(
    reservation.created_at ?? reservation.sign_date ?? reservation.start_date,
    new Date().toISOString(),
  );
  const tenantRating = normalizeTenantRatingLabel(reservation.tenant_rating);
  const penaltyAmount = toNullableNumber(reservation.penalty_amount);
  const remarks =
    toNullableString(reservation.penalty_notes ?? reservation.remarks) ??
    undefined;
  const checkoutSummary =
    tenantRating || penaltyAmount != null || remarks
      ? {
          penalty_amount: penaltyAmount ?? undefined,
          tenant_rating: tenantRating,
          remarks,
          checked_out_at:
            toNullableString(
              reservation.checked_out_at ?? reservation.updated_at,
            ) ?? undefined,
        }
      : undefined;
  const id = toNumber(reservation.id);

  return hydrateRentalRecord({
    id,
    rental_code: toStringValue(
      reservation.rental_code ?? reservation.reservation_code,
      buildRentalCode(id || 0),
    ),
    initial_status: RENTAL_STATUSES.CREATED,
    status,
    rental_status_id: statusId,
    unit_id: toNumber(reservation.unit_id),
    customer_id:
      toNullableNumber(tenant.id ?? reservation.customer_id) ?? undefined,
    unit_number: toStringValue(reservation.unit_number, '—'),
    project_id: toNullableNumber(reservation.project_id) ?? undefined,
    project_name: toNullableString(reservation.project_name) ?? undefined,
    customer_name:
      toNullableString(reservation.customer_name ?? tenant.customer_name) ??
      undefined,
    rental_company_id:
      toNullableNumber(rentalCompany.id ?? reservation.rental_company_id) ??
      undefined,
    rental_company_name:
      toNullableString(
        rentalCompany.en_name ??
          rentalCompany.name ??
          reservation.rental_company_name,
      ) ?? undefined,
    tenant_name: toStringValue(
      tenant.customer_name ??
        reservation.tenant_name ??
        reservation.customer_name,
      '—',
    ),
    gender: toStringValue(
      tenant.gender ??
        reservation.gender ??
        (toNullableNumber(tenant.is_male ?? reservation.is_male) === 1
          ? 'male'
          : 'female'),
      '',
    ),
    id_type: normalizeIdTypeValue(
      idType.en_name ??
        idType.name ??
        reservation.id_type_name ??
        reservation.id_type,
      idType.id ?? reservation.id_type_id,
    ),
    id_number: toStringValue(
      tenant.id_number ?? reservation.id_number ?? reservation.tenant_id_number,
      '—',
    ),
    email: toNullableString(tenant.email ?? reservation.email) ?? undefined,
    phone: toStringValue(
      tenant.mobile_number ??
        reservation.mobile_number ??
        reservation.tenant_mobile ??
        reservation.phone ??
        reservation.phone_number,
      '—',
    ),
    start_date: toStringValue(reservation.start_date),
    sign_date: toNullableString(reservation.sign_date) ?? undefined,
    end_date: toStringValue(reservation.end_date),
    total_tenants: toNumber(
      reservation.total_tenant_count ?? reservation.total_tenants,
    ),
    access_card_number:
      toNullableString(reservation.access_card_number) ?? undefined,
    notes: toNullableString(reservation.notes) ?? undefined,
    tenant_attachments: tenantAttachments,
    relatives,
    vehicles,
    invoices,
    status_history: buildDerivedStatusHistory(
      reservation,
      invoices,
      detail?.status_history ?? detail?.history ?? reservation.status_history,
    ),
    checkout_summary: checkoutSummary,
    termination_reason:
      toNullableString(reservation.termination_reason) ?? undefined,
    penalty_amount: penaltyAmount,
    tenant_rating: tenantRating,
    request_source_name:
      toNullableString(reservation.request_source_name) ?? undefined,
    created_at: createdAt,
    updated_at: toStringValue(reservation.updated_at ?? createdAt, createdAt),
  });
}

function appendFormDataValue(formData: FormData, key: string, value: unknown) {
  if (value == null || value === '') {
    return;
  }

  if (Array.isArray(value)) {
    formData.append(key, JSON.stringify(value));
    return;
  }

  formData.append(key, String(value));
}

export async function getRentals(
  params: GetRentalsParams = {},
): Promise<GetRentalsResponse> {
  const response = await api.get<GetReservationsRaw>(
    '/rentals/reservations',
    {
      params: {
        ...(params.customer_name
          ? { customer_name: params.customer_name }
          : {}),
        ...(params.mobile_number
          ? { mobile_number: params.mobile_number }
          : {}),
        ...(params.id_number ? { id_number: params.id_number } : {}),
        ...(params.start_date ? { start_date: params.start_date } : {}),
        ...(params.end_date ? { end_date: params.end_date } : {}),
        ...(params.rental_status != null
          ? {
              rental_status:
                typeof params.rental_status === 'number'
                  ? params.rental_status
                  : /^\d+$/.test(String(params.rental_status).trim())
                    ? Number(params.rental_status)
                    : (getRentalStatusId(params.rental_status) ??
                      params.rental_status),
            }
          : {}),
        ...(params.unit_number ? { unit_number: params.unit_number } : {}),
        ...(params.unit_id ? { unit_id: params.unit_id } : {}),
        ...(params.project_id ? { project_id: params.project_id } : {}),
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
    },
  );

  const result =
    response.data.result && typeof response.data.result === 'object'
      ? response.data.result
      : null;
  const rawReservations = Array.isArray(response.data.result)
    ? response.data.result
    : Array.isArray((result as { rentals?: unknown[] } | null)?.rentals)
      ? ((result as { rentals?: unknown[] }).rentals ?? [])
      : Array.isArray((result as { history?: unknown[] } | null)?.history)
        ? ((result as { history?: unknown[] }).history ?? [])
        : Array.isArray(
              (result as { reservations?: unknown[] } | null)?.reservations,
            )
          ? ((result as { reservations?: unknown[] }).reservations ?? [])
          : Array.isArray((result as { items?: unknown[] } | null)?.items)
            ? ((result as { items?: unknown[] }).items ?? [])
            : Array.isArray((result as { data?: unknown[] } | null)?.data)
              ? ((result as { data?: unknown[] }).data ?? [])
              : [];

  let rentals = rawReservations.map((reservation) =>
    normalizeReservationRecord(reservation),
  );

  if (params.onlyActive) {
    rentals = rentals.filter((rental) => isRentalCurrentlyActive(rental));
  }

  const totalCount =
    toNullableNumber(
      (result as { totalCount?: number } | null)?.totalCount,
    ) ??
    toNullableNumber(
      (result as { total_count?: number } | null)?.total_count,
    ) ??
    toNullableNumber((result as { count?: number } | null)?.count) ??
    rentals.length;

  return { rentals, totalCount };
}

/** Whether the unit has a current rental (`GET /rentals/reservations`). */
export async function hasActiveRentalForUnit(unitId: number): Promise<boolean> {
  const { rentals } = await getRentals({
    unit_id: unitId,
    onlyActive: true,
    limit: 100,
  });
  return rentals.length > 0;
}

export async function getRentalById(id: number): Promise<RentalRecord | null> {
  const response = await api.get<GetReservationByIdRaw>(
    `/rentals/reservations/${id}`,
  );
  const reservation = response.data.result?.reservation;

  if (!reservation) {
    return null;
  }

  return normalizeReservationRecord(reservation, response.data.result);
}

export async function updateRental(
  id: number,
  payload: Partial<CreateRentalPayload> & {
    status?: RentalStatus;
    checkout_summary?: RentalCheckoutSummary;
  },
): Promise<RentalRecord | null> {
  const formData = new FormData();
  appendFormDataValue(formData, 'notes', payload.notes?.trim());
  appendFormDataValue(
    formData,
    'access_card_number',
    payload.access_card_number?.trim(),
  );
  appendFormDataValue(formData, 'total_tenant_count', payload.total_tenants);
  appendFormDataValue(
    formData,
    'customer_name',
    payload.tenant_name?.trim() || payload.customer_name?.trim(),
  );
  appendFormDataValue(formData, 'id_type', toNullableNumber(payload.id_type));
  appendFormDataValue(formData, 'id_number', payload.id_number?.trim());
  appendFormDataValue(formData, 'email', payload.email?.trim());
  appendFormDataValue(formData, 'mobile_number', payload.phone?.trim());
  appendFormDataValue(formData, 'start_date', payload.start_date);
  appendFormDataValue(formData, 'sign_date', payload.sign_date);
  appendFormDataValue(formData, 'end_date', payload.end_date);
  appendFormDataValue(formData, 'cars', payload.vehicles);
  appendFormDataValue(formData, 'relatives', payload.relatives);

  await api.post(`/rentals/reservations/${id}/update`, formData, {
    headers: { 'Content-Type': undefined },
    transformRequest: [(data: FormData) => data],
  });

  return getRentalById(id);
}

export async function createRentalInvoiceAndGetNumber(
  id: number,
  payload: CreateRentalInvoicePayload,
): Promise<string | null> {
  const response = await api.post(`/rentals/reservations/${id}/invoice`, {
    invoice_type_id:
      payload.invoice_type_id ?? getInvoiceTypeId(payload.invoice_type),
    total_amount: Number(payload.total_amount ?? payload.amount ?? 0),
    ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
  });
  return (
    (response.data?.result?.invoice_number as string | undefined) ??
    (response.data?.invoice_number as string | undefined) ??
    null
  );
}

export async function createRentalInvoice(
  id: number,
  payload: CreateRentalInvoicePayload,
): Promise<RentalRecord | null> {
  await api.post(`/rentals/reservations/${id}/invoice`, {
    invoice_type_id:
      payload.invoice_type_id ?? getInvoiceTypeId(payload.invoice_type),
    total_amount: Number(payload.total_amount ?? payload.amount ?? 0),
    ...(payload.notes?.trim() ? { notes: payload.notes.trim() } : {}),
  });

  return getRentalById(id);
}

export async function checkInRental(id: number): Promise<RentalRecord | null> {
  await api.post(`/rentals/reservations/${id}/check-in`);
  return getRentalById(id);
}

export async function changeRentalReservation(
  id: number,
  payload: ChangeRentalReservationPayload,
): Promise<RentalRecord | null> {
  await api.post(`/rentals/reservations/${id}/change-unit`, {
    ...(payload.new_unit_number?.trim() || payload.unit_number?.trim()
      ? {
          new_unit_number:
            payload.new_unit_number?.trim() || payload.unit_number?.trim(),
        }
      : {}),
    ...(payload.new_end_date || payload.end_date
      ? { new_end_date: payload.new_end_date || payload.end_date }
      : {}),
    ...(payload.access_card_number?.trim()
      ? { access_card_number: payload.access_card_number.trim() }
      : {}),
  });

  if (payload.notes?.trim()) {
    await updateRental(id, { notes: payload.notes.trim() });
  }

  return getRentalById(id);
}

export async function checkoutRental(
  id: number,
  payload: RentalCheckoutPayload,
): Promise<RentalRecord | null> {
  await api.post(`/rentals/reservations/${id}/check-out`, {
    tenant_rating: getTenantRatingScore(payload.tenant_rating) ?? 1,
    ...(payload.penalty_amount != null
      ? { penalty_amount: Number(payload.penalty_amount) || 0 }
      : {}),
    ...((typeof payload.penalty_notes === 'string' &&
      payload.penalty_notes.trim()) ||
    (typeof payload.remarks === 'string' && payload.remarks.trim())
      ? {
          penalty_notes:
            (typeof payload.penalty_notes === 'string' &&
              payload.penalty_notes.trim()) ||
            (typeof payload.remarks === 'string'
              ? payload.remarks.trim()
              : ''),
        }
      : {}),
  });

  return getRentalById(id);
}

export async function terminateRental(
  id: number,
  payload: TerminateRentalPayload,
): Promise<RentalRecord | null> {
  await api.post(`/rentals/reservations/${id}/terminate`, payload);
  return getRentalById(id);
}

// ---------------------------------------------------------------------------
// Backend integration: POST /rentals/tenants
// ---------------------------------------------------------------------------

export interface CarPayload {
  // TEMP (revert in 1 week): make/model are now optional so the QR form can
  // omit them when the user leaves them blank.
  make?: string;
  model?: string;
  plate_text: string;
  plate_number: number;
}

export interface RelativePayload {
  customer_name: string;
  id_type: number;
  id_number: string;
  mobile_number?: string;
  email?: string;
  notes?: string;
  is_male?: number;
  relative_relation?: string;
  cars?: CarPayload[];
}

export interface CreateRentalTenantPayload {
  customer_name: string;
  id_type: number;
  id_number: string;
  mobile_number?: string;
  email: string;
  is_male?: number;
  unit_number: string;
  unit_id: number;
  start_date: string;
  sign_date?: string;
  end_date?: string;
  access_card_number?: string;
  permission_rules?: string;
  total_tenant_count: number;
  rental_company_id: number;
  cars?: CarPayload[];
  relatives?: RelativePayload[];
}

export interface CreateRentalTenantFiles {
  tenant_files?: File[];
  tenant_car_files?: File[][];
  relative_files?: File[][];
}

function appendCreateRentalTenantScalarFields(
  formData: FormData,
  payload: CreateRentalTenantPayload,
) {
  appendFormDataValue(formData, 'customer_name', payload.customer_name.trim());
  appendFormDataValue(formData, 'id_type', payload.id_type);
  appendFormDataValue(formData, 'id_number', payload.id_number.trim());
  appendFormDataValue(formData, 'email', payload.email.trim());
  appendFormDataValue(formData, 'unit_number', payload.unit_number);
  appendFormDataValue(formData, 'unit_id', payload.unit_id);
  appendFormDataValue(formData, 'start_date', payload.start_date);
  appendFormDataValue(
    formData,
    'total_tenant_count',
    payload.total_tenant_count,
  );
  appendFormDataValue(formData, 'rental_company_id', payload.rental_company_id);
  appendFormDataValue(formData, 'mobile_number', payload.mobile_number?.trim());
  appendFormDataValue(formData, 'is_male', payload.is_male);
  appendFormDataValue(formData, 'sign_date', payload.sign_date);
  appendFormDataValue(formData, 'end_date', payload.end_date);
  appendFormDataValue(
    formData,
    'access_card_number',
    payload.access_card_number?.trim(),
  );
  appendFormDataValue(
    formData,
    'permission_rules',
    payload.permission_rules?.trim(),
  );
}

function appendCreateRentalTenantFileFields(
  formData: FormData,
  files: CreateRentalTenantFiles,
) {
  files.tenant_files?.forEach((file) => {
    formData.append('tenant_files', file, file.name);
  });

  files.tenant_car_files?.forEach((carFiles, carIndex) => {
    carFiles.forEach((file) => {
      formData.append(`tenant_car_${carIndex}_files`, file, file.name);
    });
  });

  files.relative_files?.forEach((relativeFiles, relativeIndex) => {
    relativeFiles.forEach((file) => {
      formData.append(`relative_${relativeIndex}_files`, file, file.name);
    });
  });
}

function buildCreateRentalTenantFormData(
  payload: CreateRentalTenantPayload,
  files: CreateRentalTenantFiles,
) {
  const formData = new FormData();

  appendCreateRentalTenantScalarFields(formData, payload);
  appendFormDataValue(formData, 'cars', payload.cars);
  appendFormDataValue(formData, 'relatives', payload.relatives);
  appendCreateRentalTenantFileFields(formData, files);

  return formData;
}

export async function createRentalTenant(
  payload: CreateRentalTenantPayload,
  files: CreateRentalTenantFiles,
) {
  const response = await api.post(
    '/rentals/tenants',
    buildCreateRentalTenantFormData(payload, files),
    {
      headers: { 'Content-Type': undefined },
      transformRequest: [(data: FormData) => data],
    },
  );
  return response.data;
}

export interface CreateRentalCompanyUnitDto {
  rental_company_id: number;
  unit_number: string;
  unit_area?: number;
}

export interface CreateRentalCompanyDelegateDto {
  rental_company_id: number;
  delegate_name: string;
  delegate_national_id: string;
  delegate_phone_number?: string;
}

export interface CreateRentalCompanyDelegatesUnitsDto {
  units?: CreateRentalCompanyUnitDto[];
  delegates?: CreateRentalCompanyDelegateDto[];
}

export async function createRentalCompanyDelegatesUnits(
  payload: CreateRentalCompanyDelegatesUnitsDto,
) {
  const { data } = await api.post(
    '/rentals/rental-companies/delegates-units',
    payload,
  );

  return data;
}

export interface Delegate {
  id: number;
  name: string;
}

interface DelegateRaw {
  id?: unknown;
  name?: unknown;
  en_name?: unknown;
  ar_name?: unknown;
  delegate_name?: unknown;
  customer_name?: unknown;
}

function normalizeDelegate(raw: DelegateRaw): Delegate {
  return {
    id: Number(raw.id) || 0,
    name:
      String(
        raw.name ??
          raw.en_name ??
          raw.ar_name ??
          raw.delegate_name ??
          raw.customer_name ??
          raw.id ??
          '',
      ).trim() || String(raw.id ?? ''),
  };
}

function extractDelegates(raw: unknown): Delegate[] {
  if (Array.isArray(raw)) {
    return (raw as DelegateRaw[]).map(normalizeDelegate).filter((d) => d.id);
  }

  if (raw && typeof raw === 'object') {
    const obj = raw as Record<string, unknown>;

    for (const key of [
      'delegates',
      'data',
      'items',
      'result',
      'rental_delegates',
    ]) {
      if (Array.isArray(obj[key])) {
        return (obj[key] as DelegateRaw[])
          .map(normalizeDelegate)
          .filter((d) => d.id);
      }
    }
  }

  return [];
}

export async function getDelegates(): Promise<Delegate[]> {
  const response = await api.get<unknown>('/rentals/delegates');
  const body = response.data as Record<string, unknown> | undefined;

  if (!body) return [];

  // Try top-level array first
  if (Array.isArray(body)) return extractDelegates(body);

  // Try data field
  if (Array.isArray(body.data)) return extractDelegates(body.data);

  // Try result field (array or object with nested list)
  if (body.result !== undefined) return extractDelegates(body.result);

  return [];
}
