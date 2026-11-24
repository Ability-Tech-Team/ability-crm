import 'server-only';
import { z } from 'zod';
import { readEnvelopeFailure } from './apiErrors';
import { ASSISTANT_MESSAGE_MAX, ASSISTANT_SCOPES } from './assistantChat';

/**
 * The server side of the CRM assistant chat (`src/app/api/assistant/chat`).
 *
 * The assistant service (`CRM_ASSISTANT_URL`, `POST /chat`) has no sign-in of
 * its own: it believes the `user_id` and `menu` it receives, and the menu
 * decides which CRM screens the employee may ask about. So this route decides
 * both on the server and ignores whatever the browser says about them:
 *
 * 1. the employee's `access_token` (the API's HttpOnly cookie) is sent to the
 *    API's `GET /roles/get-role-privileges`, read again for every message so a
 *    permission change applies at once;
 * 2. only once the API has accepted that token are the employee's id and name
 *    taken from it;
 * 3. the message goes to the assistant with that id, name, and the menu exactly
 *    as the API answered it.
 *
 * The menu is read in English: the assistant matches screen names against an
 * English catalog, whatever language the employee uses.
 */

export const ASSISTANT_MENU_TIMEOUT_MS = 15_000;
export const ASSISTANT_TIMEOUT_MS = 60_000;
/** A message is at most 2000 characters; anything far bigger isn't a chat message. */
export const ASSISTANT_BODY_MAX_BYTES = 32 * 1024;
const MENU_LANGUAGE = 'en';

export type AssistantRouteError =
  | 'unauthorized'
  | 'password_change_required'
  | 'invalid_request'
  | 'assistant_unavailable';

export type AssistantRouteResult =
  | {
      status: 200;
      body: { session_id: string; answer: string; scope: (typeof ASSISTANT_SCOPES)[number] };
    }
  | { status: 400 | 401 | 403 | 502; body: { error: AssistantRouteError } };

/** Why a call failed, for the server log only; never sent to the browser. */
export type AssistantRouteProblem =
  | 'no_assistant_url'
  | 'no_api_token'
  | 'menu_rejected'
  | 'menu_failed'
  | 'token_unreadable'
  | 'assistant_refused'
  | 'assistant_failed'
  | 'assistant_timeout'
  | 'assistant_unreachable'
  | 'assistant_reply_invalid';

export type AssistantRouteInput = {
  /** The request body, parsed as JSON (null when it isn't JSON). */
  body: unknown;
  /** The Portal session's API address, already checked against API_ALLOWED_URLS. */
  apiBaseUrl: string | null;
  /** The API's `access_token` cookie, when it reaches this app. */
  apiToken: string | null;
  assistantUrl: string | null;
};

export type AssistantRouteOptions = {
  fetchImpl?: typeof fetch;
  menuTimeoutMs?: number;
  assistantTimeoutMs?: number;
  report?: (problem: AssistantRouteProblem, detail?: string) => void;
};

const bodySchema = z.object({
  session_id: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  message: z.string().trim().min(1).max(ASSISTANT_MESSAGE_MAX),
  ui_lang: z.enum(['en', 'ar']),
});

const replySchema = z.object({
  session_id: z.string().min(1),
  answer: z.string(),
  scope: z.enum(ASSISTANT_SCOPES),
});

const claimsSchema = z.object({
  employee_id: z.union([z.string().min(1), z.number()]).transform(String),
  employee_name: z.string().nullish(),
  user_name: z.string().nullish(),
});

const failed = (
  status: 400 | 401 | 403 | 502,
  error: AssistantRouteError,
): AssistantRouteResult => ({ status, body: { error } });

/**
 * The employee in a token the API has just accepted. The signature is the
 * API's to check, and it did: this is only ever called after that.
 */
export function readAcceptedTokenClaims(
  token: string,
): { userId: string; userName: string | undefined } | null {
  const payload = token.split('.')[1];
  if (!payload) return null;
  try {
    const json: unknown = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    const claims = claimsSchema.safeParse(json);
    if (!claims.success) return null;
    const userName = claims.data.employee_name?.trim() || claims.data.user_name?.trim();
    return { userId: claims.data.employee_id, userName: userName || undefined };
  } catch {
    return null;
  }
}

function joinUrl(base: string, path: string): string {
  return `${base.trim().replace(/\/+$/, '')}${path}`;
}

function isTimeout(error: unknown): boolean {
  const name = (error as { name?: string } | null)?.name;
  return name === 'TimeoutError' || name === 'AbortError';
}

export async function handleAssistantChat(
  input: AssistantRouteInput,
  options: AssistantRouteOptions = {},
): Promise<AssistantRouteResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const report = options.report ?? (() => undefined);

  // 1. Signed in: the Portal's session names this client's API.
  if (!input.apiBaseUrl) return failed(401, 'unauthorized');

  // 2. The body: only these three fields are read. A user id, name or menu in
  // it is ignored.
  const parsed = bodySchema.safeParse(input.body);
  if (!parsed.success) return failed(400, 'invalid_request');
  const { session_id, message, ui_lang } = parsed.data;

  if (!input.assistantUrl?.trim()) {
    report('no_assistant_url');
    return failed(502, 'assistant_unavailable');
  }
  // Without the API's cookie this server can't prove who is asking. That is a
  // deployment problem (the API and this app need a shared cookie domain),
  // not the end of the session, so it doesn't sign the employee out.
  if (!input.apiToken) {
    report('no_api_token');
    return failed(502, 'assistant_unavailable');
  }

  // 3. The menu, with the employee's own token: this is also the check that
  // the API accepts the token.
  let menu: unknown;
  try {
    const response = await fetchImpl(
      joinUrl(input.apiBaseUrl, '/roles/get-role-privileges'),
      {
        headers: {
          Authorization: `Bearer ${input.apiToken}`,
          Accept: 'application/json',
          'Accept-Language': MENU_LANGUAGE,
          lang: MENU_LANGUAGE,
        },
        cache: 'no-store',
        redirect: 'manual',
        signal: AbortSignal.timeout(options.menuTimeoutMs ?? ASSISTANT_MENU_TIMEOUT_MS),
      },
    );
    menu = await response.json().catch(() => null);
    const failure = menu === null
      ? { status: response.status, code: null, message: '' }
      : readEnvelopeFailure(menu, response.status);
    if (failure || menu === null) {
      const status = failure?.status ?? response.status;
      if (failure?.code === 'AUTH_PASSWORD_CHANGE_REQUIRED') {
        return failed(403, 'password_change_required');
      }
      if (status === 401) return failed(401, 'unauthorized');
      report('menu_rejected', `HTTP ${response.status}, status ${status}, ${failure?.code ?? 'no code'}`);
      return failed(502, 'assistant_unavailable');
    }
    if (!Array.isArray((menu as { result?: unknown }).result)) {
      report('menu_rejected', 'the answer has no result list');
      return failed(502, 'assistant_unavailable');
    }
  } catch (error) {
    report('menu_failed', isTimeout(error) ? 'timeout' : (error as Error)?.message);
    return failed(502, 'assistant_unavailable');
  }

  const claims = readAcceptedTokenClaims(input.apiToken);
  if (!claims) {
    report('token_unreadable');
    return failed(502, 'assistant_unavailable');
  }

  // 4. The assistant.
  const timeoutMs = options.assistantTimeoutMs ?? ASSISTANT_TIMEOUT_MS;
  const signal = AbortSignal.timeout(timeoutMs);
  let response: Response;
  try {
    response = await fetchImpl(joinUrl(input.assistantUrl, '/chat'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        user_id: claims.userId,
        session_id,
        ...(claims.userName && { user_name: claims.userName }),
        message,
        ui_lang,
        menu,
      }),
      cache: 'no-store',
      redirect: 'manual',
      signal,
    });
  } catch (error) {
    report(isTimeout(error) ? 'assistant_timeout' : 'assistant_unreachable');
    return failed(502, 'assistant_unavailable');
  }

  if (response.status !== 200) {
    await response.body?.cancel().catch(() => undefined);
    if (response.status === 422) {
      report('assistant_refused');
      return failed(400, 'invalid_request');
    }
    report('assistant_failed', `HTTP ${response.status}`);
    return failed(502, 'assistant_unavailable');
  }

  let reply: unknown;
  try {
    reply = await response.json();
  } catch (error) {
    report(signal.aborted || isTimeout(error) ? 'assistant_timeout' : 'assistant_reply_invalid');
    return failed(502, 'assistant_unavailable');
  }
  const answer = replySchema.safeParse(reply);
  if (!answer.success) {
    report('assistant_reply_invalid');
    return failed(502, 'assistant_unavailable');
  }

  return {
    status: 200,
    body: {
      session_id: answer.data.session_id,
      answer: answer.data.answer,
      scope: answer.data.scope,
    },
  };
}
