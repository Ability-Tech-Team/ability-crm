import { z } from 'zod';

/**
 * Contact support: what the form sends to `POST /support/requests`. The rules mirror the
 * backend's `CreateSupportRequestDto` (ability-crm-api/libs/domain/src/support), which
 * checks them again and rejects anything else with 400 INVALID_DATA_PROVIDED.
 */
export const SUPPORT_CATEGORIES = [
  'technical_issue',
  'account_access',
  'billing',
  'feature_request',
  'other',
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];

export const SUPPORT_LIMITS = {
  subjectMin: 3,
  subjectMax: 150,
  messageMin: 10,
  messageMax: 5000,
  pageMax: 500,
} as const;

export interface SupportRequestValues {
  category: string;
  subject: string;
  message: string;
}

export interface SupportRequestPayload {
  category: SupportCategory;
  subject: string;
  message: string;
  /** The page the user was on, without the locale, e.g. `/customers/12`. */
  page?: string;
}

export interface SupportValidationMessages {
  categoryRequired: string;
  subjectLength: string;
  subjectSingleLine: string;
  messageLength: string;
}

/** The form's checks, worded by the caller (the `support` catalog). Values are trimmed first, as the API does. */
export function createSupportRequestSchema(messages: SupportValidationMessages) {
  return z.object({
    category: z.enum(SUPPORT_CATEGORIES, { error: messages.categoryRequired }),
    subject: z
      .string()
      .trim()
      .min(SUPPORT_LIMITS.subjectMin, messages.subjectLength)
      .max(SUPPORT_LIMITS.subjectMax, messages.subjectLength)
      .regex(/^[^\p{Cc}]*$/u, messages.subjectSingleLine),
    message: z
      .string()
      .trim()
      .min(SUPPORT_LIMITS.messageMin, messages.messageLength)
      .max(SUPPORT_LIMITS.messageMax, messages.messageLength),
  });
}

export type ValidSupportRequest = z.infer<ReturnType<typeof createSupportRequestSchema>>;

const PAGE_PATTERN = /^\/\S*$/;

/**
 * The request body. `pathname` is the locale-free path from next-intl's `usePathname`; it is
 * sent only when the API would accept it, so an unusual address never blocks the request.
 */
export function buildSupportRequestPayload(
  values: ValidSupportRequest,
  pathname: string | null | undefined,
): SupportRequestPayload {
  const page =
    pathname && pathname.length <= SUPPORT_LIMITS.pageMax && PAGE_PATTERN.test(pathname)
      ? pathname
      : undefined;

  return {
    category: values.category,
    subject: values.subject,
    message: values.message,
    ...(page && { page }),
  };
}

/** Field errors keyed by field name, the shape `ui/Input` and `ui/Select` take. */
export function toFieldErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const errors: Partial<Record<keyof SupportRequestValues, string[]>> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (key !== 'category' && key !== 'subject' && key !== 'message') continue;
    (errors[key] ??= []).push(issue.message);
  }
  return errors;
}
