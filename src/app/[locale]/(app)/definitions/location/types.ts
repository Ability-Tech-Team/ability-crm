import type { LocationDropdownOption } from '@/src/types/dropdowns';

export type LocationTypeSelectOption = {
  value: string;
  label: string;
};

export type FlatLocationRow = LocationDropdownOption & {
  _isChild: boolean;
  _parentId: number | null;
};

export type LocationPayload = {
  en_name: string;
  ar_name: string;
  location_type_id?: number;
  location_code?: string;
  is_active?: number;
  parent_location_id?: number;
};
