import { z } from 'zod';

/**
 * The `ability_portal_session` cookie: the `session`, `client`, and
 * `platforms` of the Portal's sign-in answer (`POST /api/auth/login` on the
 * portal backend), which the Portal stores for the products because only the
 * Portal receives that answer (`Ability-Portal/src/lib/signInAnswer.ts`).
 * Value: base64url of
 * `{ "session": {...}, "client": {...}, "platforms": [...] }`.
 *
 * It is display data (who is signed in, their project and safe, the client's
 * brand) plus the address of this client's API. The API decides every request
 * with the `access_token` cookie, so nothing here grants access, and
 * `must_change_password` is ignored in favour of the API's 403
 * `AUTH_PASSWORD_CHANGE_REQUIRED`. The API address is used only when it is
 * one this app is configured to trust (`src/lib/session.ts`).
 */
export const SESSION_DETAILS_COOKIE = 'ability_portal_session';

/** This app's key in the session's `platforms`. */
export const CRM_PLATFORM = 'crm';

/** Cookies are capped at 4 KB; anything longer is not this cookie. */
const MAX_COOKIE_LENGTH = 4096;

const id = z.union([z.string().min(1), z.number()]);
const optionalText = z.string().nullish();

const sessionSchema = z.object({
  employee_id: id,
  user_name: z.string(),
  employee_name: optionalText,
  role_id: id.nullish(),
  role_name: optionalText,
  department_id: id.nullish(),
  company_project_id: id.nullish(),
  company_code: optionalText,
  project_code: optionalText,
  project_name: optionalText,
  employee_type_id: id.nullish(),
  employee_type_name: optionalText,
  safe_id: z.number().nullish(),
  safe_name: optionalText,
  platforms: z.array(z.string()).nullish(),
});

const clientSchema = z.object({
  code: z.string(),
  nameEn: z.string(),
  nameAr: z.string(),
  branding: z
    .object({
      nameEn: optionalText,
      nameAr: optionalText,
      logoUrl: optionalText,
    })
    .nullish(),
});

const platformSchema = z.object({
  key: z.string(),
  apiUrl: optionalText,
});

const cookieSchema = z.object({
  session: sessionSchema,
  client: clientSchema.nullish(),
  platforms: z.array(platformSchema).nullish(),
});

export type SessionClient = {
  code: string;
  nameEn: string;
  nameAr: string;
  /** The client's own name for the product, when it set one (`branding`). */
  brandNameEn: string | null;
  brandNameAr: string | null;
  /**
   * Whether the client has a logo. Its address in the cookie is signed for
   * only a minute, so the logo is loaded through `/api/branding/logo`.
   */
  hasLogo: boolean;
};

export type SessionDetails = {
  employeeId: string;
  userName: string;
  fullName: string | null;
  roleId: string | null;
  roleName: string | null;
  departmentId: string | null;
  companyProjectId: string | null;
  projectCode: string | null;
  projectName: string | null;
  employeeTypeId: string | null;
  employeeTypeName: string | null;
  safeId: number | null;
  safeName: string | null;
  /** Null when the session doesn't list platforms. */
  platforms: string[] | null;
  client: SessionClient | null;
};

export type ParsedSession = {
  details: SessionDetails;
  /** This app's API address from `platforms`, not yet checked against the trusted list. */
  crmApiUrl: string | null;
};

function toId(value: string | number | null | undefined): string | null {
  return value === null || value === undefined ? null : String(value);
}

function decodeBase64Url(value: string): string | null {
  if (!/^[A-Za-z0-9_-]+={0,2}$/.test(value)) {
    return null;
  }

  try {
    const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function nonBlank(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

/** The cookie's contents, or null when it is missing or not in this format. */
export function parseSessionCookie(
  raw: string | undefined | null,
): ParsedSession | null {
  if (!raw || raw.length > MAX_COOKIE_LENGTH) {
    return null;
  }

  const json = decodeBase64Url(raw);

  if (json === null) {
    return null;
  }

  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }

  const parsed = cookieSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  const { session, client, platforms } = parsed.data;

  const details: SessionDetails = {
    employeeId: String(session.employee_id),
    userName: session.user_name,
    fullName: session.employee_name ?? null,
    roleId: toId(session.role_id),
    roleName: session.role_name ?? null,
    departmentId: toId(session.department_id),
    companyProjectId: toId(session.company_project_id),
    projectCode: session.project_code ?? null,
    projectName: session.project_name ?? null,
    employeeTypeId: toId(session.employee_type_id),
    employeeTypeName: session.employee_type_name ?? null,
    safeId: session.safe_id ?? null,
    safeName: session.safe_name ?? null,
    platforms: session.platforms ?? null,
    client: client
      ? {
          code: client.code,
          nameEn: client.nameEn,
          nameAr: client.nameAr,
          brandNameEn: nonBlank(client.branding?.nameEn),
          brandNameAr: nonBlank(client.branding?.nameAr),
          hasLogo: nonBlank(client.branding?.logoUrl) !== null,
        }
      : null,
  };

  return {
    details,
    crmApiUrl: nonBlank(
      platforms?.find((platform) => platform.key === CRM_PLATFORM)?.apiUrl,
    ),
  };
}

/**
 * Whether the session lists this app. A session without the list, or
 * without `crm` in it, never opens the app.
 */
export function includesCrmPlatform(details: SessionDetails): boolean {
  return details.platforms?.includes(CRM_PLATFORM) ?? false;
}
