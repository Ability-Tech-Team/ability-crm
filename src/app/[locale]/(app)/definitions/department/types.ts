import type { DropdownOption } from '@/src/types/dropdowns';

export type DepartmentOption = DropdownOption & {
  is_active?: number | null;
  show_in_mobile?: number | null;
};

export type DepartmentPayload = {
  en_name: string;
  ar_name: string;
  show_in_mobile: number;
  is_active?: number;
};
