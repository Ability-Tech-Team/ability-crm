import type { DropdownOption } from '@/src/types/dropdowns';

export type LocationTypeOption = DropdownOption & {
  is_active?: number | null;
};

export type LocationTypePayload = {
  en_name: string;
  ar_name: string;
  is_active?: number;
};
