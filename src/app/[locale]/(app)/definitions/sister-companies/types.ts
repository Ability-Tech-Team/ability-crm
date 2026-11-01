import type { DropdownOption } from '@/src/types/dropdowns';

export type SisterCompanyOption = DropdownOption & {
  is_active?: number | null;
};

export type SisterCompanyPayload = {
  en_name: string;
  ar_name: string;
  is_active?: number;
};
