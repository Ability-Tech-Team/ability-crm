import type { RentalCompany } from '@/src/services/rentalCompanies';

export function getNextRentalCompanyStatus(company: RentalCompany): 0 | 1 {
  return Number(company.is_active ?? 1) === 1 ? 0 : 1;
}
