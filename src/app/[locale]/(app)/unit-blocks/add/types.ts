import type { z } from 'zod';
import type { unitSearchSchema } from './schema';

export type UnitSearchFormData = z.infer<typeof unitSearchSchema>;
