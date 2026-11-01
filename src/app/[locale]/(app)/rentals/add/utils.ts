import type { Unit } from '@/src/services/units';
import type { UnitRow } from './types';

export const RENTAL_SEARCH_PAGE_SIZE = 10;
const RENTAL_CREATE_CONTEXT_KEY = 'rental-create-unit';

export function extractRentalCompany(unit: Unit) {
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

export function flattenUnits(
  units: Unit[],
  activeUnitIds: Set<number>,
): UnitRow[] {
  const rows: UnitRow[] = [];

  for (const unit of units) {
    const rentalCompany = extractRentalCompany(unit);
    const rawUnit = unit as unknown as Record<string, unknown>;
    const hasBackendActiveBooking =
      Number(
        rawUnit.has_active_booking ??
          rawUnit.hasActiveBooking ??
          rawUnit.is_booked ??
          rawUnit.isBooked,
      ) === 1;
    const hasActiveBooking =
      hasBackendActiveBooking || activeUnitIds.has(unit.id);

    if (unit.customer_units.length > 0) {
      for (let index = 0; index < unit.customer_units.length; index += 1) {
        const customerUnit = unit.customer_units[index];
        rows.push({
          unitId: unit.id,
          unitNumber: unit.unit_number,
          customerName: customerUnit.customer_name ?? '—',
          customerCode: customerUnit.customer_code ?? '—',
          projectName: unit.project_name ?? '—',
          mobile: customerUnit.mobile_number ?? '—',
          rentalCompanyName: rentalCompany.name || '—',
          isLocked: unit.is_locked,
          isEligibleForRent: unit.is_eligible_for_rent,
          hasActiveBooking,
          customerId: customerUnit.customer_id,
          _unit: unit,
          _customerIndex: index,
        });
      }
      continue;
    }

    rows.push({
      unitId: unit.id,
      unitNumber: unit.unit_number,
      customerName: '—',
      customerCode: '—',
      projectName: unit.project_name ?? '—',
      mobile: '—',
      rentalCompanyName: rentalCompany.name || '—',
      isLocked: unit.is_locked,
      isEligibleForRent: unit.is_eligible_for_rent,
      hasActiveBooking,
      customerId: 0,
      _unit: unit,
      _customerIndex: -1,
    });
  }

  return rows;
}

export function canAddReservation(
  row: Pick<UnitRow, 'isLocked' | 'isEligibleForRent' | 'hasActiveBooking'>,
) {
  return (
    row.isLocked !== 1 && row.isEligibleForRent === 1 && !row.hasActiveBooking
  );
}

export function storeRentalCreateContext(
  row: Pick<UnitRow, '_unit' | '_customerIndex'>,
) {
  sessionStorage.setItem(
    RENTAL_CREATE_CONTEXT_KEY,
    JSON.stringify({
      unit: row._unit,
      customerIndex: row._customerIndex,
    }),
  );
}
