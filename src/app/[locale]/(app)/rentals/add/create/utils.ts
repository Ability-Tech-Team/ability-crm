import type { Unit, UnitLocation } from '@/src/services/units';
import type { LocalRelative, LocalVehicle, RentalCompanyValue } from './types';

export function createTempId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createEmptyRelative(): LocalRelative {
  return {
    id: createTempId('relative'),
    customer_name: '',
    idType: '',
    idNumber: '',
    gender: '',
    email: '',
    phone: '',
    relation: '',
    attachments: [],
  };
}

export function createEmptyVehicle(): LocalVehicle {
  return {
    id: createTempId('vehicle'),
    make: '',
    model: '',
    plate_text: '',
    plate_number: '',
    attachments: [],
  };
}

export function flattenLocationNames(locations?: UnitLocation[]) {
  if (!locations?.length) {
    return '—';
  }

  const names: string[] = [];
  const visited = new WeakSet<object>();
  // Hard cap to defend against pathological payloads (cycles or extreme depth)
  // that would otherwise blow the call stack ("Maximum call stack size exceeded").
  const MAX_DEPTH = 32;

  function walk(items: UnitLocation[], depth: number) {
    if (depth > MAX_DEPTH) {
      return;
    }
    for (const item of items) {
      if (!item || typeof item !== 'object') {
        continue;
      }
      if (visited.has(item)) {
        continue;
      }
      visited.add(item);
      names.push(item.name);
      if (item.children?.length) {
        walk(item.children, depth + 1);
      }
    }
  }

  walk(locations, 0);
  return names.join(' > ') || '—';
}

export function extractRentalCompany(unit: Unit): RentalCompanyValue {
  const unitRecord = unit as unknown as Record<string, unknown>;
  const specificationRecord =
    (unit.unit_specifications as Record<string, unknown> | null) ?? {};

  const rawId =
    unitRecord.rental_company_id ??
    unitRecord.rentalCompanyId ??
    specificationRecord.rental_company_id ??
    specificationRecord.rentalCompanyId;
  const rawName =
    unitRecord.rental_company_name ??
    unitRecord.rentalCompanyName ??
    specificationRecord.rental_company_name ??
    specificationRecord.rentalCompanyName;

  const normalizedId = Number(rawId);

  return {
    id: Number.isFinite(normalizedId) ? normalizedId : null,
    name: typeof rawName === 'string' ? rawName : '',
  };
}

export function readCustomerEmail(customer: unknown) {
  if (!customer || typeof customer !== 'object') {
    return '';
  }

  const rawEmail = (customer as Record<string, unknown>).email;
  return typeof rawEmail === 'string' ? rawEmail : '';
}

export function getFilledRelatives(relatives: LocalRelative[]) {
  return relatives.filter(
    (relative) =>
      relative.customer_name.trim() ||
      relative.idType.trim() ||
      relative.idNumber.trim() ||
      relative.gender.trim() ||
      relative.email.trim() ||
      relative.phone.trim() ||
      relative.relation.trim() ||
      relative.attachments.length > 0,
  );
}

export function getFilledVehicles(vehicles: LocalVehicle[]) {
  return vehicles.filter(
    (vehicle) =>
      vehicle.make.trim() ||
      vehicle.model.trim() ||
      vehicle.plate_text.trim() ||
      vehicle.plate_number.trim() ||
      vehicle.attachments.length > 0,
  );
}
