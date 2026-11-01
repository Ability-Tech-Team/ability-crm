import type { LocalRelative, LocalVehicle } from './types';

const exactPhonePattern = /^\d{11}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const numericPattern = /^\d+$/;

export function validateDynamicEntries(
  filledRelatives: LocalRelative[],
  filledVehicles: LocalVehicle[],
): string | null {
  for (const [index, relative] of filledRelatives.entries()) {
    if (
      !relative.customer_name.trim() ||
      !relative.idType.trim() ||
      !relative.idNumber.trim()
    ) {
      return `Relative #${index + 1}: name, ID type, and ID number are required.`;
    }

    if (
      relative.phone.trim() &&
      !exactPhonePattern.test(relative.phone.trim())
    ) {
      return `Relative #${index + 1}: phone must be exactly 11 digits.`;
    }

    if (relative.email.trim() && !emailPattern.test(relative.email.trim())) {
      return `Relative #${index + 1}: email address is invalid.`;
    }
  }

  for (const [index, vehicle] of filledVehicles.entries()) {
    if (
      !vehicle.make.trim() ||
      !vehicle.model.trim() ||
      !vehicle.plate_text.trim() ||
      !vehicle.plate_number.trim()
    ) {
      return `Vehicle #${index + 1}: make, model, plate text, and plate number are required.`;
    }

    if (!numericPattern.test(vehicle.plate_number.trim())) {
      return `Vehicle #${index + 1}: plate number must be numeric.`;
    }
  }

  return null;
}
