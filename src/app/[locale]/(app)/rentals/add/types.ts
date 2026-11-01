import type { Unit } from '@/src/services/units';

export type RentalUnitSearchParams = {
  unit_number?: string;
  is_exact?: boolean;
};

export interface UnitRow {
  unitId: number;
  unitNumber: string;
  customerName: string;
  customerCode: string;
  projectName: string;
  mobile: string;
  rentalCompanyName: string;
  isLocked: number;
  isEligibleForRent: number;
  hasActiveBooking: boolean;
  customerId: number;
  _unit: Unit;
  _customerIndex: number;
}
