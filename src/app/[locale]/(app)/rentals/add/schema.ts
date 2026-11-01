import { z } from 'zod';

export const searchUnitSchema = z.object({
  unit_number: z.string().optional(),
  is_exact: z.string().optional(),
});

export type SearchFormData = z.infer<typeof searchUnitSchema>;
