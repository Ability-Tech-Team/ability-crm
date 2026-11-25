import type { ProjectRow } from '@/src/services/projects';

/** A row of the Projects definition (`GET /projects`). */
export type ProjectDefinition = ProjectRow;

/** What the form saves; the project code is sent on create only. */
export type ProjectPayload = {
  en_name: string;
  ar_name: string;
  company_code: string;
  project_code?: string;
  is_active?: number;
};
