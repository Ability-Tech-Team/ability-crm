import type {
  CreateRentalTenantFiles,
  CreateRentalTenantPayload,
} from '@/src/services/rentals';
import type { Unit } from '@/src/services/units';
import type { CreateRentalFormData } from './schema';
import type { LocalRelative, LocalVehicle } from './types';

type BuildCreateRentalRequestArgs = {
  data: CreateRentalFormData;
  unit: Unit;
  filledRelatives: LocalRelative[];
  filledVehicles: LocalVehicle[];
  tenantAttachments: File[];
};

export function buildCreateRentalRequest({
  data,
  unit,
  filledRelatives,
  filledVehicles,
  tenantAttachments,
}: BuildCreateRentalRequestArgs): {
  payload: CreateRentalTenantPayload;
  files: CreateRentalTenantFiles;
} {
  return {
    payload: {
      customer_name: data.tenantName.trim(),
      id_type: Number(data.idType),
      id_number: data.idNumber.trim(),
      mobile_number: data.phone?.trim() || undefined,
      email: data.email?.trim() ?? '',
      is_male: data.gender ? Number(data.gender) : undefined,
      unit_number: unit.unit_number,
      unit_id: unit.unit_id ?? unit.id,
      start_date: data.startDate,
      end_date: data.endDate || undefined,
      access_card_number: data.accessCardNumber?.trim() || undefined,
      permission_rules: data.notes?.trim() || undefined,
      total_tenant_count: Number(data.totalTenants),
      rental_company_id: Number(data.rentalCompanyId),
      cars: filledVehicles.length
        ? filledVehicles.map((vehicle) => ({
            make: vehicle.make.trim(),
            model: vehicle.model.trim(),
            plate_text: vehicle.plate_text.trim(),
            plate_number: Number(vehicle.plate_number.trim()),
          }))
        : undefined,
      relatives: filledRelatives.length
        ? filledRelatives.map((relative) => ({
            customer_name: relative.customer_name.trim(),
            id_type: Number(relative.idType),
            id_number: relative.idNumber.trim(),
            mobile_number: relative.phone.trim() || undefined,
            email: relative.email.trim() || undefined,
            is_male: relative.gender ? Number(relative.gender) : undefined,
            relative_relation: relative.relation.trim() || undefined,
          }))
        : undefined,
    },
    files: {
      tenant_files: tenantAttachments.length ? tenantAttachments : undefined,
      tenant_car_files: filledVehicles.some(
        (vehicle) => vehicle.attachments.length,
      )
        ? filledVehicles.map((vehicle) => vehicle.attachments)
        : undefined,
      relative_files: filledRelatives.some(
        (relative) => relative.attachments.length,
      )
        ? filledRelatives.map((relative) => relative.attachments)
        : undefined,
    },
  };
}
