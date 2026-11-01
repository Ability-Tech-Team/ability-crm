import type { DropdownOption } from '@/src/types/dropdowns';

export type PositionOption = DropdownOption & {
  is_active?: number | null;
};

export type PositionPayload = {
  en_name: string;
  ar_name: string;
  is_active?: number;
};
