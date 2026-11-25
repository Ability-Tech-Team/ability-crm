/**
 * Puts the Super Admin's working project on a request (src/lib/projectScope.ts).
 *
 * Since 2026-11-25 every Ability CRM API route that reads or writes a
 * project's records follows the units rule (`readProjectIds` /
 * `writeProjectId` in ability-crm-api): the Super Admin names the project of
 * every call, in the query of a read and in the body of a write, or the API
 * answers `PROJECT_ID_REQUIRED`. Everyone else works in the sign-in project,
 * and a `project_id` they send is ignored, so this runs only while a scope is
 * set (the Super Admin's).
 *
 * A `project_id` the caller already put on the request wins: a unit's details
 * page works in the unit's own project, a screen's Project filter in the one
 * it picked.
 */

/**
 * Routes without a project, which refuse an unknown `project_id` (the API
 * rejects unknown fields): sign-in and the session, the brand, Contact
 * support, the projects and sub-projects definitions themselves, the
 * signed-in role's menu tree, the import templates, the logs, and the
 * definitions that are one catalogue for every project (statuses, customer
 * lookups, menus and privileges, the ERP account codes themselves).
 */
const GLOBAL_DEFINITIONS = [
  'system-configs',
  'countries',
  'id-types',
  'media-types',
  'religions',
  'marital-statuses',
  'customer-types',
  'menus',
  'menuitems',
  'request-sources',
  'ownership-types',
  'ticket-statuses',
  'invoice-statuses',
  'rental-statuses',
  'walk-in-statuses',
  'walk-in-tenant-sources',
  'payment-types',
  'privileges',
  'assign-privilege-to-menuitems',
  'ownership-management-categories',
  'ownership-management-statuses',
  'contact-channels',
  'erp-account-codes',
];

const UNSCOPED_ROUTES: readonly RegExp[] = [
  new RegExp(`^/definitions/(${GLOBAL_DEFINITIONS.join('|')})(/|$)`),
  /^\/auth(\/|$)/,
  /^\/branding(\/|$)/,
  /^\/support(\/|$)/,
  /^\/aws(\/|$)/,
  /^\/logs(\/|$)/,
  /^\/module-logs(\/|$)/,
  /^\/projects$/,
  /^\/projects\/accessible$/,
  /^\/projects\/\d+$/,
  /^\/sub-projects(\/|$)/,
  /^\/roles\/get-role-privileges$/,
  /^\/imports\/[^/]+\/template$/,
];

const QUERY_METHODS = new Set(['get', 'head']);

/** The route of a request URL: no origin, query, or trailing slash. */
export function routePath(url: string | undefined): string {
  let path = (url ?? '').split(/[?#]/)[0];
  const origin = path.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+/i);
  if (origin) path = path.slice(origin[0].length);
  return `/${path.replace(/^\/+/, '').replace(/\/+$/, '')}`;
}

export function isProjectScopedRoute(url: string | undefined): boolean {
  const path = routePath(url);
  return path !== '/' && !UNSCOPED_ROUTES.some((route) => route.test(path));
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function urlNamesProject(url: string | undefined): boolean {
  const query = (url ?? '').split('#')[0].split('?')[1];
  return query !== undefined && new URLSearchParams(query).has('project_id');
}

/** A read's query with the project added, unless it already names one. */
export function withScopedParams<T>(params: T, projectId: number): T | Record<string, unknown> {
  if (params instanceof URLSearchParams) {
    if (!isBlank(params.get('project_id'))) return params;
    const next = new URLSearchParams(params);
    next.set('project_id', String(projectId));
    return next as T;
  }
  if (isBlank(params)) return { project_id: projectId };
  if (!isPlainObject(params) || !isBlank(params.project_id)) return params;
  return { ...params, project_id: projectId };
}

/** A write's body with the project added, unless it already names one. */
export function withScopedBody<T>(data: T, projectId: number): T | Record<string, unknown> {
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    if (isBlank(data.get('project_id'))) {
      data.delete('project_id');
      data.append('project_id', String(projectId));
    }
    return data;
  }
  if (data instanceof URLSearchParams) {
    if (isBlank(data.get('project_id'))) data.set('project_id', String(projectId));
    return data;
  }
  if (isBlank(data)) return { project_id: projectId };
  if (!isPlainObject(data) || !isBlank(data.project_id)) return data;
  return { ...data, project_id: projectId };
}

type ScopableRequest = {
  method?: string;
  url?: string;
  params?: unknown;
  data?: unknown;
};

/**
 * The request with `project_id` added where the route takes one: in the query
 * of a GET, in the body of anything else. Unchanged without a project, on a
 * route without one, or when the request already names its project.
 */
export function applyProjectScope<T extends ScopableRequest>(
  config: T,
  projectId: number | undefined,
): T {
  if (projectId === undefined || !isProjectScopedRoute(config.url)) return config;
  if (urlNamesProject(config.url)) return config;

  if (QUERY_METHODS.has((config.method ?? 'get').toLowerCase())) {
    config.params = withScopedParams(config.params, projectId);
  } else {
    config.data = withScopedBody(config.data, projectId);
  }
  return config;
}
