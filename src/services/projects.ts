import { z } from 'zod';
import api from '@/src/lib/http';

/**
 * Projects and sub-projects (`/projects`, `/sub-projects`;
 * ability-crm-api/apps/crm-api/src/projects and src/sub-projects). Managing
 * them is for the Super Admin only (the API answers 403 to anyone else).
 * `GET /projects/accessible`, the list the header's project picker and the
 * project filters use, is open to every employee. Adapted from Community
 * Admin's `src/services/projects.ts`, without the community app's project
 * profile (images, media, amenities, map boundary), which stays there.
 */

/** The "*" project that marks a row shared by every project; never a real project. */
export const ALL_PROJECTS_ID = 1;

/** The definitions screens list everything at once, as the other definitions do. */
const LIST_LIMIT = 1000;

const activeFlag = z.union([z.literal(0), z.literal(1)]);

// ─── GET /projects/accessible ────────────────────────────────

export type AccessibleProject = { id: number; name: string; active: boolean };

const accessibleSchema = z.array(
  z.object({
    id: z.number().int(),
    name: z.string().nullish(),
    en_name: z.string(),
    is_active: activeFlag,
  }),
);

export function toAccessibleProjects(result: unknown): AccessibleProject[] {
  const parsed = accessibleSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error("The projects/accessible answer doesn't have the expected shape");
  }
  return parsed.data
    .filter((project) => project.id !== ALL_PROJECTS_ID)
    .map((project) => ({
      id: project.id,
      name: project.name || project.en_name,
      active: project.is_active === 1,
    }));
}

/**
 * The projects the signed-in employee can work in: every project for the
 * Super Admin (inactive ones flagged), the sign-in project for anyone else.
 */
export async function getAccessibleProjects(
  signal?: AbortSignal,
): Promise<AccessibleProject[]> {
  const response = await api.get<{ result?: unknown }>('/projects/accessible', {
    signal,
  });
  return toAccessibleProjects(response.data?.result);
}

// ─── Projects ────────────────────────────────────────────────
/**
 * The projects the Super Admin can work in, for the header's picker:
 * `GET /projects/accessible`, or, on an API that doesn't have that route yet
 * (it was added to crm-api on 2026-11-25), the Super Admin's own
 * `GET /projects`, active ones. Either way only real projects.
 */
export async function getWorkingProjects(
  signal?: AbortSignal,
): Promise<AccessibleProject[]> {
  try {
    return await getAccessibleProjects(signal);
  } catch (err) {
    if (signal?.aborted) throw err;
    const rows = await getProjects({ is_active: 1 }, signal);
    return rows.map((project) => ({
      id: project.id,
      name: project.name,
      active: project.is_active === 1,
    }));
  }
}


export type ProjectRow = {
  id: number;
  name: string;
  en_name: string;
  ar_name: string;
  company_code: string;
  project_code: string;
  is_active: number;
  total_units: number;
  occupancy: number;
};

const projectRowSchema = z.object({
  id: z.number().int(),
  name: z.string().nullish(),
  en_name: z.string(),
  ar_name: z.string(),
  company_code: z.string(),
  project_code: z.string(),
  is_active: activeFlag,
  total_units: z.number().nullish(),
  occupancy: z.number().nullish(),
});

const projectsPageSchema = z.object({
  projects: z.array(projectRowSchema),
});

export function toProjectRows(result: unknown): ProjectRow[] {
  const parsed = projectsPageSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error("The projects answer doesn't have the expected shape");
  }
  return parsed.data.projects.map((project) => ({
    id: project.id,
    name: project.name || project.en_name,
    en_name: project.en_name,
    ar_name: project.ar_name,
    company_code: project.company_code,
    project_code: project.project_code,
    is_active: project.is_active,
    total_units: project.total_units ?? 0,
    occupancy: project.occupancy ?? 0,
  }));
}

/** `GetCompanyProjectsDto`: `search` matches the English or Arabic name. */
export async function getProjects(
  params: { search?: string; is_active?: number } = {},
  signal?: AbortSignal,
): Promise<ProjectRow[]> {
  const search = params.search?.trim();
  const response = await api.get<{ result?: unknown }>('/projects', {
    params: {
      ...(search ? { search } : {}),
      ...(params.is_active !== undefined ? { is_active: params.is_active } : {}),
      page: 1,
      limit: LIST_LIMIT,
    },
    signal,
  });
  return toProjectRows(response.data?.result);
}

/** `CreateCompanyProjectDto`'s core fields; the codes are at most 10 characters. */
export interface CreateProjectDto {
  en_name: string;
  ar_name: string;
  company_code: string;
  project_code: string;
  is_active?: number;
}

/** `UpdateCompanyProjectDto`: the project code can't change. */
export type UpdateProjectDto = Partial<Omit<CreateProjectDto, 'project_code'>>;

/** 409 `PROJECT_ALREADY_EXISTS` when the codes and a name match another project. */
export async function createProject(payload: CreateProjectDto): Promise<void> {
  await api.post('/projects', payload);
}

/**
 * The main project can't be turned off (`MAIN_PROJECT_CANNOT_BE_DEACTIVATED`),
 * nor one with active residents, open tickets, or open invoices (409).
 */
export async function updateProject(
  projectId: number,
  payload: UpdateProjectDto,
): Promise<void> {
  await api.put(`/projects/${projectId}`, payload);
}

// ─── Sub-projects ────────────────────────────────────────────

export type SubProjectRow = {
  id: number;
  project_id: number;
  project_name: string | null;
  project_code: string;
  name: string;
  en_name: string | null;
  ar_name: string | null;
  is_default: boolean;
  is_active: number;
};

const subProjectRowSchema = z.object({
  id: z.number().int(),
  project_id: z.number().int(),
  project_name: z.string().nullish(),
  project_code: z.string(),
  name: z.string().nullish(),
  en_name: z.string().nullish(),
  ar_name: z.string().nullish(),
  is_default: z.union([z.boolean(), z.number()]).nullish(),
  is_active: activeFlag,
});

const subProjectsPageSchema = z.object({
  sub_projects: z.array(subProjectRowSchema),
});

export function toSubProjectRows(result: unknown): SubProjectRow[] {
  const parsed = subProjectsPageSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error("The sub-projects answer doesn't have the expected shape");
  }
  return parsed.data.sub_projects.map((row) => ({
    id: row.id,
    project_id: row.project_id,
    project_name: row.project_name ?? null,
    project_code: row.project_code,
    name: row.name || row.en_name || row.project_code,
    en_name: row.en_name ?? null,
    ar_name: row.ar_name ?? null,
    is_default: Boolean(row.is_default),
    is_active: row.is_active,
  }));
}

/** One project's sub-projects, inactive ones included unless `is_active` is sent. */
export async function getSubProjects(
  params: { project_id: number; is_active?: number },
  signal?: AbortSignal,
): Promise<SubProjectRow[]> {
  const response = await api.get<{ result?: unknown }>('/sub-projects', {
    params: {
      project_id: params.project_id,
      ...(params.is_active !== undefined ? { is_active: params.is_active } : {}),
      page: 1,
      limit: LIST_LIMIT,
    },
    signal,
  });
  return toSubProjectRows(response.data?.result);
}

/** `CreateSubProjectDto`: the code is unique in its project (at most 50 characters). */
export interface CreateSubProjectDto {
  project_id: number;
  project_code: string;
  en_name: string;
  ar_name: string;
  is_active?: number;
}

/** `UpdateSubProjectDto`: a sub-project can't move to another project. */
export type UpdateSubProjectDto = Partial<Omit<CreateSubProjectDto, 'project_id'>>;

export async function createSubProject(
  payload: CreateSubProjectDto,
): Promise<void> {
  await api.post('/sub-projects', payload);
}

/** The default sub-project can't be turned off (`DEFAULT_SUB_PROJECT_REQUIRED`). */
export async function updateSubProject(
  subProjectId: number,
  payload: UpdateSubProjectDto,
): Promise<void> {
  await api.put(`/sub-projects/${subProjectId}`, payload);
}

/** Refused for the default sub-project, or one that holds units or customers (409). */
export async function deleteSubProject(subProjectId: number): Promise<void> {
  await api.delete(`/sub-projects/${subProjectId}`);
}
