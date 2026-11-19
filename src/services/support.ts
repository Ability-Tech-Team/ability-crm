import { z } from 'zod';
import api from '@/src/lib/http';
import type { SupportRequestPayload } from '@/src/lib/supportRequest';

/**
 * Contact support (`POST /support/requests`, ability-crm-api/apps/crm-api/src/support): the
 * API saves the request and mails it to Ability-Tech's support team. Failures arrive as
 * `ApiError` from the HTTP client (`SUPPORT_NOT_CONFIGURED`, `SUPPORT_REQUEST_NOT_SENT`,
 * `AUTH_TOO_MANY_ATTEMPTS`, `INVALID_DATA_PROVIDED`); a 401 ends the session as usual.
 */
export interface SentSupportRequest {
  requestId: number;
  /** What the user quotes to support, e.g. SR-ACME-1042. */
  reference: string;
  /** Where the answer goes: the user's own email, or null when the account has none. */
  replyTo: string | null;
}

const sentSchema = z.object({
  request_id: z.number().int().positive(),
  reference: z.string().min(1),
  reply_to: z.string().min(1).nullable().optional(),
});

export function toSentSupportRequest(result: unknown): SentSupportRequest {
  const parsed = sentSchema.safeParse(result);
  if (!parsed.success) {
    throw new Error('The support request answer is missing its reference');
  }
  return {
    requestId: parsed.data.request_id,
    reference: parsed.data.reference,
    replyTo: parsed.data.reply_to ?? null,
  };
}

export async function sendSupportRequest(
  payload: SupportRequestPayload,
): Promise<SentSupportRequest> {
  const response = await api.post<{ result?: unknown }>('/support/requests', payload);
  return toSentSupportRequest(response.data?.result);
}
