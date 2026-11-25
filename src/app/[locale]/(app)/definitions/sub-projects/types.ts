import type { SubProjectRow } from '@/src/services/projects';

/** A row of the Sub-projects definition (`GET /sub-projects`). */
export type SubProjectDefinition = SubProjectRow;

/** What the form saves; the project is sent on create only. */
export type SubProjectPayload = {
  project_id?: number;
  project_code: string;
  en_name: string;
  ar_name: string;
  is_active?: number;
};
