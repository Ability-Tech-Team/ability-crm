import type { CreateUnitPayload } from '@/src/services/units';
import {
  optionalId,
  optionalInt,
  optionalText,
} from '../_shared/utils';
import type { UnitEntryValues } from './schema';

/** A new unit is active and can be rented, as in the units sheet. */
export const UNIT_ENTRY_INITIAL_VALUES: UnitEntryValues = {
  unit_number: '',
  sub_project_id: '',
  unit_type_id: '',
  location_id: '',
  total_area: '',
  floor: '',
  address: '',
  room_no: '',
  path_room_no: '',
  living_room_no: '',
  balcony_no: '',
  delivery_date: '',
  contracting_date: '',
  notes: '',
  is_active: '1',
  is_furnished: '0',
  is_broker: '0',
  is_eligible_for_rent: '1',
};

const flag = (value: string | undefined) => (value === '1' ? 1 : 0);

/**
 * The create body. Blank optional fields are left out. A unit is never
 * created locked: locking belongs to Unit blocks.
 */
export function buildUnitPayload(values: UnitEntryValues): CreateUnitPayload {
  const specifications: CreateUnitPayload['unit_specifications'] = {
    unit_type_id: Number(values.unit_type_id),
    location_id: Number(values.location_id),
    total_area: Number(values.total_area.trim()),
    is_furnished: flag(values.is_furnished),
  };
  const address = optionalText(values.address);
  if (address) specifications.address = address;
  for (const key of [
    'floor',
    'room_no',
    'path_room_no',
    'living_room_no',
    'balcony_no',
  ] as const) {
    const value = optionalInt(values[key]);
    if (value !== undefined) specifications[key] = value;
  }

  const payload: CreateUnitPayload = {
    unit_number: values.unit_number.trim(),
    is_active: flag(values.is_active),
    is_broker: flag(values.is_broker),
    is_eligible_for_rent: flag(values.is_eligible_for_rent),
    is_locked: 0,
    unit_specifications: specifications,
  };
  const subProjectId = optionalId(values.sub_project_id);
  if (subProjectId) payload.sub_project_id = subProjectId;
  const notes = optionalText(values.notes);
  if (notes) payload.notes = notes;
  const deliveryDate = optionalText(values.delivery_date);
  if (deliveryDate) payload.delivery_date = deliveryDate;
  const contractingDate = optionalText(values.contracting_date);
  if (contractingDate) payload.contracting_date = contractingDate;

  return payload;
}
