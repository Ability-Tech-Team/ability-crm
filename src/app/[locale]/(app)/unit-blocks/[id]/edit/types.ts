import type { z } from 'zod';
import type { editBlockSchema } from './schema';

export type TabId = 'finance' | 'legal';

export type EditBlockTab = {
  id: TabId;
  isLegal: number;
  labelKey: string;
};

export type EditBlockFormData = z.infer<typeof editBlockSchema>;
