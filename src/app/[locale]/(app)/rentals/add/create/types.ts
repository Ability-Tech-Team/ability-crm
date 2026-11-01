import type { Unit } from '@/src/services/units';

export type StoredRentalContext = {
  unit: Unit;
  customerIndex: number;
};

export type RentalCompanyValue = {
  id: number | null;
  name: string;
};

export type LocalRelative = {
  id: string;
  customer_name: string;
  idType: string;
  idNumber: string;
  gender: string;
  email: string;
  phone: string;
  relation: string;
  attachments: File[];
};

export type LocalVehicle = {
  id: string;
  make: string;
  model: string;
  plate_text: string;
  plate_number: string;
  attachments: File[];
};
