import api from '@/src/lib/http';

// ─── Types ───────────────────────────────────────────────────

export interface CustomerUnit {
  start_date: string | null;
  sign_date: string | null;
  end_date: string | null;
  contract_number: string | null;
  is_active: number;
  is_deleted: number;
  ownership_id: number | null;
  ownership: string | null;
  unit_details: {
    project_id: number | null;
    project_name: string | null;
    id: number;
    unit_number: string | null;
    unit_specification_id: number | null;
    notes: string | null;
    is_active: number;
    is_broker: number;
    delivery_date: string | null;
    contracting_date: string | null;
    created_by: string | null;
    updated_by: string | null;
    is_eligible_for_rent: number;
    is_locked: number;
    lock_date: string | null;
    locked_by: string | null;
    unlock_date: string | null;
    unlocked_by: string | null;
    created_at: string;
    updated_at: string | null;
    unit_specifications: {
      id: number;
      unit_type_id: number | null;
      location_id: number | null;
      address: string | null;
      total_area: string | null;
      floor: number | null;
      room_no: number | null;
      path_room_no: number | null;
      living_room_no: number | null;
      balcony_no: number | null;
      created_at: string;
      updated_at: string | null;
      is_furnished: number;
      unit_type_name: string | null;
    } | null;
  } | null;
}

export interface CustomerCar {
  make: string | null;
  model: string | null;
  plate_text: string | null;
  plate_number: number | null;
}

export interface Customer {
  id: number;
  customer_name: string;
  country_id: number | null;
  id_type: number | null;
  id_number: string | null;
  mobile_number: string | null;
  telephone_number: string | null;
  first_address: string | null;
  second_address: string | null;
  city: string | null;
  marital_status_id: number | null;
  religion_id: number | null;
  email: string | null;
  emergency_contact: string | null;
  emergency_contact_relation: string | null;
  emergency_contact_phone_number: string | null;
  customer_type_id: number | null;
  notes: string | null;
  is_active: number;
  is_deleted: number;
  customer_code: string | null;
  birth_date: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  customer_type_name: string | null;
  marital_status_name: string | null;
  religion_name: string | null;
  country_name: string | null;
  id_type_name: string | null;
  customer_units: CustomerUnit[];
  customer_cars: CustomerCar[];
}

interface GetCustomersRaw {
  result?: {
    totalCount?: number;
    totalPages?: number | null;
    customers?: Customer[];
  } | null;
  success: boolean;
}

export interface GetCustomersResponse {
  customers: Customer[];
  totalCount: number;
}

export interface GetCustomersParams {
  id?: number;
  customer_name?: string;
  customer_code?: string;
  id_number?: string;
  mobile_number?: string;
  unit_number?: string;
  ownership_id?: number;
  page?: number;
  limit?: number;
}

// ─── API calls ───────────────────────────────────────────────

export async function getCustomers(
  params: GetCustomersParams = {},
  signal?: AbortSignal,
): Promise<GetCustomersResponse> {
  const response = await api.get<GetCustomersRaw>('/customers', {
    params: {
      ...(params.id ? { id: params.id } : {}),
      ...(params.customer_name ? { customer_name: params.customer_name } : {}),
      ...(params.customer_code ? { customer_code: params.customer_code } : {}),
      ...(params.id_number ? { id_number: params.id_number } : {}),
      ...(params.mobile_number ? { mobile_number: params.mobile_number } : {}),
      ...(params.unit_number ? { unit_number: params.unit_number } : {}),
      ...(params.ownership_id ? { ownership_id: params.ownership_id } : {}),
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    },
    signal,
  });

  const customers = Array.isArray(response.data?.result?.customers)
    ? response.data.result.customers
    : [];

  const totalCount =
    typeof response.data?.result?.totalCount === 'number'
      ? response.data.result.totalCount
      : customers.length;

  return { customers, totalCount };
}

export async function getCustomerById(
  id: number,
  signal?: AbortSignal,
): Promise<Customer | null> {
  const { customers } = await getCustomers({ id, limit: 1 }, signal);
  return customers.find((customer) => customer.id === id) ?? null;
}

export interface UpdateCustomerDto {
  customer_code?: string;
  id_type?: number | null;
  id_number?: string | null;
  mobile_number?: string | null;
  first_address?: string | null;
  email?: string | null;
}

export async function updateCustomer(
  customerId: number,
  body: UpdateCustomerDto,
): Promise<void> {
  await api.post(`/customers/update-customer/${customerId}`, body);
}

/**
 * Deletes a customer (`POST /customers/delete/:id`). Final: the national ID
 * can't be used again and there is no restore. The backend refuses with
 * `CUSTOMER_HAS_ACTIVE_UNITS` or `CUSTOMER_HAS_PENDING_RELATIVE_REQUESTS`.
 */
export async function deleteCustomer(
  customerId: number,
  body: { project_id?: number } = {},
): Promise<void> {
  await api.post(`/customers/delete/${customerId}`, body);
}

// ─── Ownership (replaces what SAP did on contracts) ─────────

export interface EndOwnershipDto {
  customer_id: number;
  unit_id: number;
  /** `YYYY-MM-DD`; not before the ownership's start date. */
  end_date: string;
  project_id?: number;
}

/**
 * Ends a customer's open ownership of a unit (`POST /customers/end-ownership`):
 * the row closes on `end_date` and the owner's relatives lose the unit from
 * the same date; renters and other owners are not touched. A transfer is this
 * call followed by assigning the new owner.
 */
export async function endOwnership(payload: EndOwnershipDto): Promise<void> {
  await api.post('/customers/end-ownership', payload);
}

export interface UpdateOwnershipDto {
  contract_number?: string;
  fm_contract_number?: string;
  owner_type_id?: number;
  start_date?: string;
  sign_date?: string;
  /** Only to correct an ownership that has already ended. */
  end_date?: string;
  project_id?: number;
}

/**
 * Corrects an ownership (`POST /customers/ownership/update/:id`), where the
 * id is `customer_units[].customer_unit_id`, or `ownership_history[].id` for
 * an ended one. At least one field is required.
 */
export async function updateOwnership(
  ownershipId: number,
  payload: UpdateOwnershipDto,
): Promise<void> {
  await api.post(`/customers/ownership/update/${ownershipId}`, payload);
}
