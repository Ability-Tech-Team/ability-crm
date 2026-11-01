import type { z } from 'zod';
import type { historySchema } from './schema';

export type TabId = 'finance' | 'legal';

export type HistoryTab = {
  id: TabId;
  isLegal: number;
  labelKey: string;
  titleKey: string;
  privilege: number;
  persistKey: string;
};

export type HistoryFormData = z.infer<typeof historySchema>;

/** What reaches `getUnitBlocks`, once the form's strings are converted. */
export type HistorySearchParams = {
  unit_id?: number;
  unit_number?: string;
  is_active?: number;
  from_date?: string;
  to_date?: string;
  is_exact?: number;
  is_legal?: number;
};
