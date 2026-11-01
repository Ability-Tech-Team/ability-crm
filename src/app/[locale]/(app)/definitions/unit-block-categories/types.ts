import type { UnitBlockCategory } from '@/src/services/unitBlockCategories';

export type UnitBlockCategoryOption = UnitBlockCategory;

export type UnitBlockCategoryPayload = {
  en_name: string;
  ar_name: string;
  is_active?: number;
};
